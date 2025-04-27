// pages/api/page-view.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/app/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { postId, userId } = req.body;

    if (!postId || !userId) {
      return res.status(400).json({ success: false, message: "postIdとuserIdが必要です" });
    }

    try {
      // 閲覧履歴を記録
      const { error: insertError } = await supabase.from("post_views").insert({
        post_id: postId,
        user_id: userId,
        viewed_at: new Date(),
      });

      if (insertError) throw insertError;

      // 閲覧数を集計して更新
      await updatePostViewCount(postId);

      console.log(`Page view: user ${userId} viewed post ${postId}`);
      res.status(200).json({ success: true, message: "閲覧履歴を記録しました" });
    } catch (error) {
      console.error("Error handling page view:", error);
      res.status(500).json({ success: false, message: "閲覧履歴の記録中にエラーが発生しました" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// 投稿の閲覧数を集計して更新する関数
async function updatePostViewCount(postId: number) {
  try {
    // 閲覧数を集計
    const { data, error: countError } = await supabase
      .from("post_views")
      .select("*", { count: "exact" })
      .eq("post_id", postId);

    if (countError) throw countError;

    // 投稿の閲覧数を更新
    const { error: updateError } = await supabase
      .from("posts")
      .update({ view_count: data?.length || 0 })
      .eq("id", postId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error("Error updating post view count:", error);
  }
}