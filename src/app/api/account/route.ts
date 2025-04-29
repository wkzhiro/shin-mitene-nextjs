import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// GET: プロフィール取得
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("users")
    .select("username, avatar_url, email, description")
    .eq("id", userId)
    .maybeSingle();
  console.log("GET /api/account data:", data);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data || {});
}

// PUT: プロフィール更新
export async function PUT(req: NextRequest) {
  const { userId, username, avatar_url, email, description } = await req.json();
  // console.log("PUT /api/account description:", description);
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  const { error } = await supabase
    .from("users")
    .update({
      username,
      avatar_url,
      email,
      description,
    })
    .eq("id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
