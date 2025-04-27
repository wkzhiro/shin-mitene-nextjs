import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

/**
 * Supabaseを使用してカテゴリ情報を取得。
 * @returns カテゴリのリストをJSON形式で返す
 */
export async function GET() {
  try {
    // Supabaseクエリでカテゴリを取得
    const { data, error } = await supabase
      .from("tags")
      .select("id, name");

    // エラーが発生した場合はエラーレスポンスを返す
    if (error) {
      console.error("Failed to fetch categories:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      );
    }

    // 正常にデータを取得した場合はそれを返す
    return NextResponse.json(data);
  } catch (err) {
    console.error("Unexpected error occurred:", err);
    return NextResponse.json(
      { error: "Unexpected error occurred" },
      { status: 500 }
    );
  }
}