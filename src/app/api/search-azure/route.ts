import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { q, action, post } = body;

  // サーバー側の環境変数から取得
  const endpoint = process.env.SEARCH_ENDPOINT;
  const apiKey = process.env.SEARCH_API_KEY;
  const blogIndexName = process.env.SEARCH_INDEX_NAME;
  const ragIndexName = process.env.RAG_INDEX_NAME || "rag-index";

  if (!endpoint || !apiKey || !blogIndexName) {
    return NextResponse.json({ error: "SEARCH_ENDPOINT, SEARCH_API_KEY, SEARCH_INDEX_NAME are required" }, { status: 500 });
  }

  // インデックス登録（アップロード）
  if (action === "upload") {
    if (!post) {
      return NextResponse.json({ error: "post is required for upload" }, { status: 400 });
    }
    console.log("=== received post ===", post);

    // --- 依存関数をローカル実装に置き換え ---
    // Lexical JSON構造からテキストを再帰的に抽出
    function extractTextFromLexical(content: any): string {
      if (!content) return "";
      if (typeof content === "string") {
        try {
          content = JSON.parse(content);
        } catch {
          return content;
        }
      }
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

    // Azure OpenAIでembeddingを取得
    async function getAzureEmbedding(text: string): Promise<number[]> {
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
      const apiKey = process.env.AZURE_OPENAI_API_KEY;
      const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT;
      const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2023-05-15";

      if (!endpoint || !apiKey || !deployment) {
        throw new Error("Azure OpenAIの環境変数が未設定です");
      }

      const url = `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`;
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
      return data.data?.[0]?.embedding || [];
    }

    // @ts-ignore
    const { RecursiveCharacterTextSplitter } = await import("langchain/text_splitter");

    // 単一オブジェクトのみ受け付け、blog-indexとrag-index両方に登録
    // 1. blog-index（全文embedding）
    const contentText = extractTextFromLexical(post.content);
    const embedding = await getAzureEmbedding(contentText);
    // blog-indexスキーマに存在しないフィールドを除外
    const postWithVector = {
      id: String(post.id),
      title: post.title || "",
      intro: post.intro || "",
      content: contentText,
      cover_image_url: post.cover_image_url || "",
      user_id: post.user_id || "",
      view_count: typeof post.view_count === "number" ? post.view_count : 0,
      like_count: typeof post.like_count === "number" ? post.like_count : 0,
      bookmark: !!post.bookmark,
      created_at: post.created_at ? new Date(post.created_at).toISOString() : undefined,
      updated_at: post.updated_at ? new Date(post.updated_at).toISOString() : undefined,
      categories: (post.categories || []).map((c: any) => c.category_id?.name || ""),
      tags: Array.isArray(post.tags)
        ? (() => {
            console.log("=== post.tags raw ===", post.tags);
            const result = post.tags
              .map((t: any) =>
                t && t.tag_id && typeof t.tag_id.name === "string"
                  ? t.tag_id.name
                  : typeof t === "string"
                  ? t
                  : null
              )
              .filter((name: any): name is string => !!name);
            console.log("=== post.tags mapped ===", result);
            return result;
          })()
        : [],
      content_vector: embedding,
    };
    // blog-indexへアップロード
    const blogUrl = `${endpoint}/indexes/${blogIndexName}/docs/index?api-version=2020-06-30`;
    const blogRes = await fetch(blogUrl, {
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      method: "POST",
      body: JSON.stringify({
        value: [
          {
            ...postWithVector,
            "@search.action": "upload",
          },
        ],
      }),
    });
    if (!blogRes.ok) {
      const err = await blogRes.json();
      return NextResponse.json({ error: JSON.stringify(err) || "Azure Search upload failed (blog-index)" }, { status: 500 });
    }
    const blogData = await blogRes.json();

    // 2. rag-index（分割＋embedding）
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
        return doc;
      })
    );
    const ragUrl = `${endpoint}/indexes/${ragIndexName}/docs/index?api-version=2020-06-30`;
    const ragRes = await fetch(ragUrl, {
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      method: "POST",
      body: JSON.stringify({
        value: docs,
      }),
    });
    if (!ragRes.ok) {
      const err = await ragRes.json();
      return NextResponse.json({ error: JSON.stringify(err) || "Azure Search upload failed (rag-index)" }, { status: 500 });
    }
    const ragData = await ragRes.json();

    // 両方の結果を返す
    return NextResponse.json({ blogIndex: blogData, ragIndex: ragData });
  }
}
