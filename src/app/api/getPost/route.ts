export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// 空のエディター初期状態
const EMPTY_EDITOR_STATE = `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`;

/**
 * 記事IDを受け取り、Supabaseから投稿情報を取得する非同期関数。
 * 投稿が存在すれば、タイトル、要約、本文（エディター状態のJSON）を返し、
 * 存在しなければ空の値を返す。
 *
 * @param articleId - 投稿のID
 * @returns タイトル、要約、エディター状態を含むオブジェクト
 */
async function getPostDetail(articleId: string): Promise<any> {
  // 投稿詳細（ユーザー、カテゴリ、タグ、like数、created_at等）を取得
  const { data, error } = await supabase
    .from("posts")
    .select(`
      id,
      title,
      intro,
      content,
      cover_image_url,
      like_count,
      created_at,
      updated_at,
      user:user_id(avatar_url,username),
      categories:post_categories(category_id(id, name)),
      tags:post_tags(tag_id(id, name))
    `)
    .eq("id", articleId)
    .single();

  if (error || !data) {
    console.error("記事の取得に失敗しました:", error?.message);
    return null;
  }

  // ブックマーク数
  let bookmarkCount = 0;
  if (data.id) {
    const { count } = await supabase
      .from("bookmark")
      .select("id", { count: "exact", head: true })
      .eq("post_id", data.id)
      .eq("is_active", true);
    bookmarkCount = count || 0;
  }

  return {
    ...data,
    bookmark_count: bookmarkCount,
  };
}

/**
 * GETリクエストで記事IDをクエリパラメーターから受け取り、記事情報を返します。
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("id");

  if (!articleId) {
    return NextResponse.json({ error: "Missing article id" }, { status: 400 });
  }

  const detail = await getPostDetail(articleId);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
