import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// GET: コメント一覧取得
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");
  if (!postId) {
    return NextResponse.json({ error: "Missing postId" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("comments")
    .select(`
      id,
      content,
      created_at,
      user_id,
      user:users(username, avatar_url)
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ comments: data || [] });
}

// POST: コメント投稿
export async function POST(req: NextRequest) {
  const { postId, userId, content } = await req.json();
  if (!postId || !userId || !content) {
    return NextResponse.json({ error: "postId, userId, content are required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      user_id: userId,
      content: content.trim(),
    })
    .select(`
      id,
      content,
      created_at,
      user_id,
      user:users(username, avatar_url)
    `)
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ comment: data });
}
