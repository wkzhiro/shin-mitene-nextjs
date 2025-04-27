// app/api/bookmark/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// GET: 自分のブックマーク投稿一覧取得
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || "";
  if (!userId) {
    return NextResponse.json({ results: [], count: 0 });
  }
  // ブックマークのみ
  const { data: bookmarksData, error: bookmarkError } = await supabase
    .from("bookmark")
    .select("post_id")
    .eq("user_id", userId)
    .eq("is_active", true);
  if (bookmarkError) {
    return NextResponse.json({ error: bookmarkError.message }, { status: 500 });
  }
  const bookmarkedIds = (bookmarksData || []).map((b: any) => b.post_id);
  if (bookmarkedIds.length === 0) {
    return NextResponse.json({ results: [], count: 0 });
  }
  // 投稿データ取得
  const { data: bookmarkedPosts, error: postError } = await supabase
    .from("posts")
    .select("id, title, intro, view_count, like_count, user_id, created_at, updated_at")
    .in("id", bookmarkedIds);
  if (postError) {
    return NextResponse.json({ error: postError.message }, { status: 500 });
  }
  // ブックマーク数を各投稿ごとに取得
  const { data: bookmarkCounts } = await supabase
    .from("bookmark")
    .select("post_id, count:post_id", { count: "exact", head: false })
    .in("post_id", bookmarkedIds)
    .eq("is_active", true);
  const countMap: Record<string, number> = {};
  if (bookmarkCounts) {
    bookmarkCounts.forEach((b: any) => {
      countMap[b.post_id] = (countMap[b.post_id] || 0) + 1;
    });
  }
  // タグ情報
  let tagsMap: Record<number, string[]> = {};
  if (bookmarkedIds.length > 0) {
    const { data: postTags } = await supabase
      .from("post_tags")
      .select("post_id, tag_id")
      .in("post_id", bookmarkedIds);
    const tagIds = postTags ? Array.from(new Set(postTags.map((pt: any) => pt.tag_id))) : [];
    let tagNameMap: Record<number, string> = {};
    if (tagIds.length > 0) {
      const { data: tagsData } = await supabase
        .from("tags")
        .select("id, name")
        .in("id", tagIds);
      if (tagsData) {
        tagNameMap = Object.fromEntries(tagsData.map((t: any) => [t.id, t.name]));
      }
    }
    if (postTags) {
      for (const pt of postTags) {
        if (!tagsMap[pt.post_id]) tagsMap[pt.post_id] = [];
        if (tagNameMap[pt.tag_id]) tagsMap[pt.post_id].push(tagNameMap[pt.tag_id]);
      }
    }
  }
  const postsWithBookmark = (bookmarkedPosts || []).map((p) => ({
    ...p,
    bookmark_count: countMap[p.id] || 0,
    tags: tagsMap[p.id] || [],
  }));
  return NextResponse.json({ results: postsWithBookmark, count: postsWithBookmark.length });
}

export async function POST(req: NextRequest) {
  try {
    const { postId, userId } = await req.json();

    if (!postId || !userId) {
      return NextResponse.json(
        { success: false, message: "postIdとuserIdが必要です" },
        { status: 400 }
      );
    }

    // 既存のブックマークを確認
    const { data: existingBookmark, error: fetchError } = await supabase
      .from("bookmark")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .single();

    // 存在しない場合のエラーコードが "PGRST116" であることを確認（必要に応じて調整）
    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    if (existingBookmark) {
      // 既存のブックマークがある場合は削除
      const { error: deleteError } = await supabase
        .from("bookmark")
        .delete()
        .eq("id", existingBookmark.id);

      if (deleteError) throw deleteError;

      return NextResponse.json({
        success: true,
        bookmarked: false,
        message: "ブックマークを解除しました",
      });
    } else {
      // 新規ブックマークを作成
      const { error: insertError } = await supabase.from("bookmark").insert({
        post_id: postId,
        user_id: userId,
        bookmarked_at: new Date(),
      });

      if (insertError) throw insertError;

      return NextResponse.json({
        success: true,
        bookmarked: true,
        message: "ブックマークしました",
      });
    }
  } catch (error) {
    console.error("Error handling bookmark:", error);
    return NextResponse.json(
      { success: false, message: "ブックマーク処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
