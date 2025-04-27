import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";


// POST: 閲覧履歴を記録
export async function POST(req: NextRequest) {
  const { postId, userId } = await req.json();
  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  // 直近1日以内に同じuserId/postIdの履歴があるかチェック
  let alreadyViewed = false;
  if (userId) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error: selectError } = await supabase
      .from("post_views")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .gte("viewed_at", since)
      .limit(1);
    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }
    if (data && data.length > 0) {
      alreadyViewed = true;
    }
  }

  if (!alreadyViewed) {
    const { error } = await supabase.from("post_views").insert({
      post_id: postId,
      user_id: userId || null,
      viewed_at: new Date().toISOString(),
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, inserted: true });
  } else {
    return NextResponse.json({ success: true, inserted: false, reason: "already viewed in 1 day" });
  }
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
