// /app/api/facets/route.ts
import { NextResponse } from 'next/server';
import { AzureKeyCredential, SearchClient } from '@azure/search-documents';

const SEARCH_SERVICE_ENDPOINT = process.env.SEARCH_SERVICE_ENDPOINT as string;
const SEARCH_QUERY_KEY = process.env.SEARCH_QUERY_KEY as string;
const INDEX_NAME = process.env.INDEX_NAME || 'posts-index';

export async function GET() {
  try {
    const credential = new AzureKeyCredential(SEARCH_QUERY_KEY);
    const searchClient = new SearchClient(SEARCH_SERVICE_ENDPOINT, INDEX_NAME, credential);

    // 複数のフィールドに対して facet を同時に要求。 
    // "tags" と "categories" の facet を最大 100 件ずつ取得し、実際の文書は取得しないように top を 0 にしています。
    const searchOptions = {
      facets: ["tags,count:100", "categories,count:100"],
      top: 0,
    };

    // クエリには "*" を指定してインデックス全体で集計を実施します。
    const searchResults = await searchClient.search("*", searchOptions);

    const facets = searchResults.facets;
    const tagFacets = facets?.tags || [];
    const categoryFacets = facets?.categories || [];

    // 各 facet の value と count を抜き出し、配列に整形します。
    const tags = tagFacets.map((facet) => ({
      name: facet.value,
      count: facet.count,
    }));

    const categories = categoryFacets.map((facet) => ({
      name: facet.value,
      count: facet.count,
    }));

    return NextResponse.json({ tags, categories });
  } catch (error) {
    console.error("Failed to fetch facets from Azure Search:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
