/**
 * Azure Cognitive SearchをAPI Route経由で利用するクライアントユーティリティ
 * 
 * @param q 検索クエリ
 * @returns 検索結果オブジェクト
 */
export async function searchAzure(q: string) {
  if (!q) throw new Error("検索クエリが必要です");

  // 環境変数からエンドポイント・APIキー・インデックス名を取得
  const endpoint = process.env.SEARCH_ENDPOINT;
  const apiKey = process.env.SEARCH_API_KEY;
  const indexName = process.env.SEARCH_INDEX_NAME;

  if (!endpoint || !apiKey || !indexName) {
    throw new Error("Azure Searchの環境変数が未設定です");
  }

  const apiRouteBase = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = await fetch(`${apiRouteBase}/api/search-azure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint,
      indexName,
      apiKey,
      q,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Azure Search APIエラー");
  }

  return await res.json();
}

/**
 * Lexical JSON構造からテキストを再帰的に抽出
 * @param content LexicalのJSON（stringまたはobject）
 * @returns テキスト
 */
export function extractTextFromLexical(content: any): string {
  if (!content) return "";
  if (typeof content === "string") {
    try {
      content = JSON.parse(content);
    } catch {
      return content;
    }
  }
  // Lexicalのrootノードから再帰的にテキスト抽出
  function walk(node: any): string {
    if (!node) return "";
    if (node.type === "text" && typeof node.text === "string") {
      return node.text;
    }
    if (Array.isArray(node.children)) {
      return node.children.map(walk).join("");
    }
    return "";
  }
  if (content.root) {
    return walk(content.root);
  }
  return walk(content);
}

/**
 * Azure OpenAIでembeddingを取得
 * @param text 埋め込み対象テキスト
 * @returns embeddingベクトル（number[]）
 */
export async function getAzureEmbedding(text: string): Promise<number[]> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2023-05-15";

  if (!endpoint || !apiKey || !deployment) {
    throw new Error("Azure OpenAIの環境変数が未設定です");
  }

  const url = `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`;
  // console.log("Azure OpenAI embedding url:", url);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      input: text,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Azure OpenAI embedding APIエラー");
  }

  const data = await res.json();
  // OpenAI APIのembeddingレスポンス形式に合わせて取得
  return data.data?.[0]?.embedding || [];
}

// 投稿データをAzure Cognitive Searchにインデックス登録
import type { Post } from "@/app/types/post";
// @ts-ignore
import { RecursiveCharacterTextSplitter } from 'langchain-text-splitters';

/**
 * 投稿データをAzure Cognitive Searchのblog-index/rag-index両方にインデックス登録
 * @param post 投稿データ
 */
export async function indexToAIsearch(post: Post) {
  const endpoint = process.env.SEARCH_ENDPOINT;
  const apiKey = process.env.SEARCH_API_KEY;
  const blogIndexName = process.env.SEARCH_INDEX_NAME;
  const ragIndexName = process.env.RAG_INDEX_NAME || "rag-index";

  if (!endpoint || !apiKey || !blogIndexName || !ragIndexName) {
    throw new Error("Azure Searchの環境変数が未設定です");
  }

  // Lexical構造ならテキスト抽出
  const contentText = extractTextFromLexical(post.content);

  // 1. blog-index（全文embedding）
  const embedding = await getAzureEmbedding(contentText);
  // console.log("post.tags:", post.tags);
  const postWithVector = {
    ...post,
    id: String(post.id),
    content: contentText,
    content_vector: embedding,
    categories: (post.categories || []).map(c => c.category_id?.name || ""),
    tags: Array.isArray(post.tags)
      ? post.tags
          .map(t => (t && t.tag_id && typeof t.tag_id.name === "string" ? t.tag_id.name : null))
          .filter((name): name is string => !!name)
      : [],
    created_at: post.created_at ? new Date(post.created_at).toISOString() : undefined,
    updated_at: post.updated_at ? new Date(post.updated_at).toISOString() : undefined,
  };
  // API Route Baseは関数内で定義する必要がある（スコープエラー修正）
  const apiRouteBase2 = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const blogRes = await fetch(
    `${apiRouteBase2}/api/search-azure`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint,
        indexName: blogIndexName,
        apiKey,
        action: "upload",
        post: postWithVector,
      }),
    }
  );
  if (!blogRes.ok) {
    const err = await blogRes.json();
    throw new Error(err.error || "Azure Search APIエラー(blog-index)");
  }

  // 2. rag-index（1200文字・200文字重複で分割＋embedding）
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200,
    chunkOverlap: 200,
  });
  const chunks = await splitter.splitText(contentText);
  const docs = await Promise.all(
    chunks.map(async (chunk: string, i: number) => {
      const embedding = await getAzureEmbedding(chunk);
      const createdAt =
        post.created_at
          ? new Date(post.created_at).toISOString()
          : new Date().toISOString();
      const doc = {
        doc_id: `${post.id}_${i}`,
        chunk: chunk,
        full_text: contentText,
        source: "blog",
        section: "",
        created_at: createdAt,
        content_vector: Array.isArray(embedding) ? embedding : [],
        "@search.action": "upload",
      };
      console.log("rag-index 登録ドキュメント:", doc);
      return doc;
    })
  );
  const apiRouteBase3 = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const ragRes = await fetch(
    `${apiRouteBase3}/api/search-azure`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint,
        indexName: ragIndexName,
        apiKey,
        action: "upload",
        post: docs, // 複数ドキュメント
      }),
    }
  );
  if (!ragRes.ok) {
    const err = await ragRes.json();
    throw new Error(err.error || "Azure Search APIエラー(rag-index)");
  }

  return { blogIndex: await blogRes.json(), ragIndex: await ragRes.json() };
}
