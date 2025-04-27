import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// POST: 閲覧履歴を記録
export async function POST(req: NextRequest) {
  const { postId, userId } = await req.json();
  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }
  const { error } = await supabase.from("post_views").insert({
    post_id: postId,
    user_id: userId || null,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// GET: 閲覧数を取得
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");
  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("post_views")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ viewCount: data?.length || 0 });
}

// PUT: 投稿の閲覧数を更新
export async function PUT(req: NextRequest) {
  const { postId, viewCount } = await req.json();
  if (!postId || typeof viewCount !== "number") {
    return NextResponse.json({ error: "postId, viewCount are required" }, { status: 400 });
  }
  const { error } = await supabase
    .from("posts")
    .update({ view_count: viewCount })
    .eq("id", postId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
