import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// GET /api/getUserPosts?userId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // 投稿一覧をuser_idで取得
  const { data: posts, error } = await supabase
    .from("posts")
    .select(
      "id, title, intro, content, cover_image_url, view_count, like_count, created_at, updated_at, user_id, post_tags(tag:tags(id, name)), post_categories(category:categories(id, name))"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.log("getUserPosts supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // bookmark_countを集計
  const postIds = (posts || []).map((p: any) => p.id);
  let bookmarkCounts: Record<number, number> = {};
  if (postIds.length > 0) {
    const { data: bookmarkData, error: bookmarkError } = await supabase
      .from("bookmark")
      .select("post_id", { count: "exact", head: false })
      .in("post_id", postIds)
      .eq("is_active", true);
    if (bookmarkError) {
      console.log("getUserPosts supabase bookmark error:", bookmarkError);
    }
    if (bookmarkData) {
      bookmarkCounts = {};
      bookmarkData.forEach((b: any) => {
        bookmarkCounts[b.post_id] = (bookmarkCounts[b.post_id] || 0) + 1;
      });
    }
  }

  // tags, categoriesを整形
  const postsWithTags = (posts || []).map((p: any) => {
    // tags: post_tags(tag:tags(id, name)) から [{tag_id: {id, name}}] 形式に変換
    let tags: any[] = [];
    const postTags = p.post_tags || [];
    if (Array.isArray(postTags)) {
      tags = postTags
        .map((t: any) =>
          t.tag && typeof t.tag === "object" && "id" in t.tag && "name" in t.tag
            ? { tag_id: { id: t.tag.id, name: t.tag.name } }
            : null
        )
        .filter(Boolean);
    }
    // categories: post_categories(category:categories(id, name)) から [{id, name}] 形式に変換
    let categories: any[] = [];
    const postCategories = p.post_categories || [];
    if (Array.isArray(postCategories)) {
      categories = postCategories
        .map((c: any) =>
          c.category && typeof c.category === "object" && "id" in c.category && "name" in c.category
            ? { id: c.category.id, name: c.category.name }
            : null
        )
        .filter(Boolean);
    }
    return {
      ...p,
      tags,
      categories,
      like_count: p.like_count ?? 0,
      view_count: p.view_count ?? 0,
      bookmark_count: bookmarkCounts[p.id] || 0,
    };
  });

  console.log("getUserPosts API response:", postsWithTags);
  return NextResponse.json({ posts: postsWithTags });
}
