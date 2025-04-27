// src/app/api/like/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// POST メソッドの処理
export async function POST(req: NextRequest) {
  try {
    const { postId, userId, checkOnly } = await req.json();

    // ユーザーIDがない場合はエラー
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "ユーザーIDが必要です" },
        { status: 401 }
      );
    }

    // 既存のいいねを確認
    const { data: existingLike, error: fetchError } = await supabase
      .from("post_likes")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    // checkOnly: true の場合は状態だけ返す（insert/updateしない）
    if (checkOnly) {
      return NextResponse.json({
        success: true,
        liked: !!(existingLike && existingLike.is_active),
        message: "like状態のみ返却",
      });
    }

    // 更新 or 作成の分岐
    if (existingLike) {
      // 既存のいいねがある場合は is_active フラグを反転させる
      const { error: updateError } = await supabase
        .from("post_likes")
        .update({ is_active: !existingLike.is_active, liked_at: new Date() })
        .eq("id", existingLike.id);

      if (updateError) throw updateError;

      // 投稿のいいね数を更新する関数を呼び出す（例示）
      await updatePostLikeCount(postId);

      return NextResponse.json({
        success: true,
        liked: !existingLike.is_active,
        message: !existingLike.is_active ? "いいねしました" : "いいねを取り消しました",
      });
    } else {
      // 新規いいねの作成
      const { error: insertError } = await supabase.from("post_likes").insert({
        post_id: postId,
        user_id: userId,
        liked_at: new Date(),
        is_active: true,
      });

      if (insertError) throw insertError;

      // いいね数を更新する
      await updatePostLikeCount(postId);

      return NextResponse.json({
        success: true,
        liked: true,
        message: "いいねしました",
      });
    }
  } catch (error) {
    console.error("Error handling like:", error);
    return NextResponse.json(
      { success: false, message: "いいね処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

// 投稿のいいね数を更新するヘルパー関数
async function updatePostLikeCount(postId: number) {
  try {
    const { data, error: countError } = await supabase
      .from("post_likes")
      .select("*", { count: "exact" })
      .eq("post_id", postId)
      .eq("is_active", true);

    if (countError) throw countError;

    const { error: updateError } = await supabase
      .from("posts")
      .update({ like_count: data?.length || 0 })
      .eq("id", postId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error("Error updating post like count:", error);
  }
}
