import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

import { PostgrestError } from "@supabase/supabase-js";

// 投稿一覧取得（userId指定で自分の投稿のみ）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, view_count, like_count, created_at, post_tags(tag:tags(id, name))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: (error as PostgrestError).message }, { status: 500 });
  }
  const posts = (data || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    tags: (p.post_tags || [])
      .map((t: any) =>
        t.tag && typeof t.tag === "object" && "id" in t.tag && "name" in t.tag
          ? { tag_id: { id: t.tag.id, name: t.tag.name } }
          : null
      )
      .filter(Boolean),
    view_count: p.view_count || 0,
    like_count: p.like_count || 0,
    created_at: p.created_at || "",
    is_bookmarked: false,
  }));
  return NextResponse.json({ posts });
}

// 投稿の新規作成
export async function POST(req: NextRequest) {
  const { title, intro, content, cover_image_url, user_id, categoryIds, tagIds } = await req.json();
  if (!title || !user_id) {
    return NextResponse.json({ error: "title, user_id are required" }, { status: 400 });
  }
  // 投稿本体作成
  const { data: newPost, error: newPostError } = await supabase
    .from("posts")
    .insert({
      title,
      intro,
      content,
      cover_image_url: cover_image_url || null,
      user_id,
    })
    .select()
    .single();
  if (newPostError) {
    return NextResponse.json({ error: newPostError.message }, { status: 500 });
  }
  const postId = newPost.id;

  // index_queueへpendingで登録
  const { error: queueError } = await supabase
    .from("index_queue")
    .insert({ post_id: postId });
  if (queueError) {
    return NextResponse.json({ error: queueError.message }, { status: 500 });
  }

// カテゴリー付与
if (Array.isArray(categoryIds) && categoryIds.length > 0) {
  const uniqueCategoryIds = [...new Set(categoryIds)];
  const { error: addCategoryError } = await supabase
    .from("post_categories")
    .insert(uniqueCategoryIds.map((categoryId: number) => ({
      post_id: postId,
      category_id: categoryId,
    })));
  if (addCategoryError) {
    return NextResponse.json({ error: addCategoryError.message }, { status: 500 });
  }
}

// タグ付与
if (Array.isArray(tagIds) && tagIds.length > 0) {
  const uniqueTagIds = [...new Set(tagIds)];
  const { error: addTagError } = await supabase
    .from("post_tags")
    .insert(uniqueTagIds.map((tagId: number) => ({
      post_id: postId,
      tag_id: tagId,
    })));
  if (addTagError) {
    return NextResponse.json({ error: addTagError.message }, { status: 500 });
  }
}

// タグ情報を取得してnewPostに付与
let tags: { tag_id: { id: number; name: string } }[] = [];
if (Array.isArray(tagIds) && tagIds.length > 0) {
  const { data: postTags } = await supabase
    .from("post_tags")
    .select("tag_id, tags:tag_id(name)")
    .eq("post_id", postId);
  console.log("postTags from supabase:", postTags);
  if (postTags) {
    tags = postTags.map((pt: any) => ({
      tag_id: { id: pt.tag_id, name: pt.tags?.name || "" }
    }));
  }
}
console.log("tags for AI Search:", tags);
const newPostWithTags = { 
  ...newPost, 
  tags,
  is_liked: false,         // 新規投稿時は必ずfalse
  is_bookmarked: false     // 新規投稿時は必ずfalse
};

// AI Searchへインデックス登録
let aiSearchStatus = "success";
let aiSearchError = null;
let attempts = 1;
let next_retry_at = null;
try {
  // /api/search-azure へ直接POST
  const apiRouteBase = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = await fetch(`${apiRouteBase}/api/search-azure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "upload",
      post: newPostWithTags,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "AI Search indexing error");
  }
  const aiResult = await res.json();
  console.log("=== AI Search 登録結果 ===", JSON.stringify(aiResult));
  // 成功時: status=success, attempts=1, next_retry_at=null
  await supabase
    .from("index_queue")
    .update({ status: "success", attempts, next_retry_at: null, last_error: null })
    .eq("post_id", postId);

  return NextResponse.json({ post: newPostWithTags, aiSearchStatus, aiSearchError, aiResult });
} catch (err: any) {
  aiSearchStatus = "failed";
  aiSearchError = err?.message || "AI Search indexing error";
  console.error("=== AI Search 登録エラー ===", err);
  // バックオフ: 10分後
  next_retry_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await supabase
    .from("index_queue")
    .update({
      status: "failed",
      attempts,
      next_retry_at,
      last_error: aiSearchError,
    })
    .eq("post_id", postId);

  return NextResponse.json({ post: newPostWithTags, aiSearchStatus, aiSearchError });
}
}

// 投稿の更新
export async function PUT(req: NextRequest) {
  const { id, title, intro, content, cover_image_url, user_id, categoryIds, tagIds } = await req.json();
  if (!id || !title || !user_id) {
    return NextResponse.json({ error: "id, title, user_id are required" }, { status: 400 });
  }
  // 投稿本体更新
  const { data: updatedPost, error: updateError } = await supabase
    .from("posts")
    .update({
      title,
      intro,
      content,
      cover_image_url: cover_image_url || null,
      user_id,
    })
    .eq("id", id)
    .select()
    .single();
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // カテゴリー再付与
  await supabase.from("post_categories").delete().eq("post_id", id);
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    const { error: addCategoryError } = await supabase
      .from("post_categories")
      .insert(categoryIds.map((categoryId: number) => ({
        post_id: id,
        category_id: categoryId,
      })));
    if (addCategoryError) {
      return NextResponse.json({ error: addCategoryError.message }, { status: 500 });
    }
  }

  // タグ再付与
  await supabase.from("post_tags").delete().eq("post_id", id);
  if (Array.isArray(tagIds) && tagIds.length > 0) {
    const { error: addTagError } = await supabase
      .from("post_tags")
      .insert(tagIds.map((tagId: number) => ({
        post_id: id,
        tag_id: tagId,
      })));
    if (addTagError) {
      return NextResponse.json({ error: addTagError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ post: updatedPost });
}
