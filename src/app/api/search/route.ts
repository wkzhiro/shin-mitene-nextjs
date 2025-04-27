// /app/api/search/route.ts
import { NextResponse } from 'next/server';
import { AzureKeyCredential, SearchClient } from '@azure/search-documents';

const SEARCH_SERVICE_ENDPOINT = process.env.SEARCH_SERVICE_ENDPOINT as string;
const SEARCH_QUERY_KEY = process.env.SEARCH_QUERY_KEY as string;
const INDEX_NAME = process.env.INDEX_NAME || 'posts-index';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'updated';
  const pageStr = searchParams.get('page') || '1';
  const page = parseInt(pageStr, 10);

  // 新たにタグとカテゴリのフィルタ用パラメーターを取得
  const tag = searchParams.get('tag') || '';
  const category = searchParams.get('category') || '';

  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  // 並び替え設定（"views"なら view_count、"likes"なら like_count、"relevance"なら関連度順、その他は created_at）
  let orderBy: string[] | undefined;
  if (sort === 'views') {
    orderBy = ['view_count desc'];
  } else if (sort === 'likes') {
    orderBy = ['like_count desc'];
  } else if (sort === 'relevance') {
    orderBy = undefined; // 関連度順（orderBy指定なし）
  } else {
    orderBy = ['created_at desc'];
  }

  // フィルター条件の組み立て
  let filter = '';

  // タグでの絞り込み（文字列のコレクションの場合、any 演算子を使います）
  if (tag) {
    filter = `tags/any(t: t eq '${tag}')`;
  }
  
  // カテゴリでの絞り込み
  if (category) {
    // 既にタグによるフィルターがある場合はANDで結合
    if (filter) {
      filter += " and ";
    }
    filter += `categories/any(c: c eq '${category}')`;
  }

  try {
    const credential = new AzureKeyCredential(SEARCH_QUERY_KEY);
    const searchClient = new SearchClient(SEARCH_SERVICE_ENDPOINT, INDEX_NAME, credential);

    const searchOptions: any = {
      includeTotalCount: true,
      skip,
      top: pageSize,
    };
    if (orderBy) {
      searchOptions.orderBy = orderBy;
    }

    // フィルター条件がある場合に設定
    if (filter) {
      searchOptions.filter = filter;
    }

    const searchResults = await searchClient.search(q, searchOptions);

    const results = [];
    for await (const result of searchResults.results) {
      const doc = result.document as any;
      // supabase形式に変換
      const tags = Array.isArray(doc.tags)
        ? doc.tags.map((name: string, idx: number) => ({
            tag_id: { id: idx + 1, name }
          }))
        : [];
      const categories = Array.isArray(doc.categories)
        ? doc.categories.map((name: string, idx: number) => ({
            category_id: { id: idx + 1, name }
          }))
        : [];
      // post_tags, post_categoriesもsupabase風に
      const post_tags = tags.map((t: any) => ({ tag: t.tag_id }));
      const post_categories = categories.map((c: any) => ({ category: c.category_id }));

      results.push({
        ...doc,
        id: Number(doc.id) || doc.id,
        like_count: doc.like_count ?? 0,
        view_count: doc.view_count ?? 0,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        user_id: doc.user_id,
        post_tags,
        post_categories,
        // supabase互換
        tags,
        categories,
      });
    }

    const responsePayload = {
      count: searchResults.count,
      results,
      page,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.error();
  }
}
