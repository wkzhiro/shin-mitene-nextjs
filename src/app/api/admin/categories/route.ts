import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// GET: カテゴリー一覧取得
export async function GET() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, description");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ categories: data || [] });
}

// POST: カテゴリー追加
export async function POST(req: NextRequest) {
  const { name, description } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, description })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ category: data });
}

// PUT: カテゴリー更新
export async function PUT(req: NextRequest) {
  const { id, name, description } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("categories")
    .update({ name, description })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ category: data });
}

// DELETE: カテゴリー削除
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
