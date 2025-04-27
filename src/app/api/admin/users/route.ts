import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// GET: ユーザー一覧取得
export async function GET() {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, email, role, avatar_url");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ users: data || [] });
}

// POST: ユーザー追加
export async function POST(req: NextRequest) {
  const { username, email, role, avatar_url } = await req.json();
  if (!username || !email) {
    return NextResponse.json({ error: "username, email are required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("users")
    .insert({ username, email, role, avatar_url })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ user: data });
}

// PUT: ユーザー更新
export async function PUT(req: NextRequest) {
  const { id, username, email, role, avatar_url } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("users")
    .update({ username, email, role, avatar_url })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ user: data });
}

// DELETE: ユーザー削除
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
