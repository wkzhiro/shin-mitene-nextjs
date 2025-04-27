import { supabase } from "@/app/lib/supabase";
import { RawPost, Post } from "@/app/types/list.types";
import { mapRawPostToPost } from "@/app/components/list/mapRawPostToPost";

/**
 * 週間・月間ランキング用の投稿データを取得し、Post型配列で返す
 * @param type "weekly" | "monthly"
 * @param userId ユーザーID（ブックマーク判定用、不要ならnull可）
 * @returns Promise<{ weekly: Post[], monthly: Post[] }>
 */
export async function fetchRankedPosts(userId: string | null) {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 週間TOP5
  const { data: weeklyData } = await supabase.rpc(
    "get_weekly_top_posts",
    { one_week_ago: oneWeekAgo.toISOString(), lim: 5 }
  );
  // 月間TOP5
  const { data: monthlyData } = await supabase.rpc(
    "get_monthly_top_posts",
    { one_month_ago: oneMonthAgo.toISOString(), lim: 5 }
  );

  // 共通: enrich処理
  async function enrich(posts: any[]): Promise<Post[]> {
    if (!posts || posts.length === 0) return [];
    const ids = posts.map((p: any) => p.id);
    let postsWithTags: any[] = [];
    if (ids.length > 0) {
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, created_at, updated_at, user_id, post_tags(tag:tags(id, name))")
        .in("id", ids);
      if (postsData) {
        postsWithTags = postsData;
      }
    }
    const postsWithTagsMap = postsWithTags.length > 0
      ? Object.fromEntries(postsWithTags.map((p: any) => [p.id, p]))
      : {};
    return posts.map((p: any) => {
      const postWithTags = postsWithTagsMap[p.id] || {};
      return mapRawPostToPost({
        ...p,
        created_at:
          (p.created_at && p.created_at !== "") ? p.created_at : (postWithTags.created_at || ""),
        updated_at:
          (p.updated_at && p.updated_at !== "") ? p.updated_at : (postWithTags.updated_at || ""),
        tags: (postWithTags.post_tags || [])
          .map((t: any) =>
            t.tag && typeof t.tag === "object" && "id" in t.tag && "name" in t.tag
              ? { tag_id: { id: t.tag.id, name: t.tag.name } }
              : null
          )
          .filter(Boolean),
        user_id:
          (p.user_id && p.user_id !== "") ? p.user_id : (postWithTags.user_id || ""),
      } as RawPost);
    });
  }

  const weeklyPosts = await enrich(weeklyData || []);
  const monthlyPosts = await enrich(monthlyData || []);
  return { weekly: weeklyPosts, monthly: monthlyPosts };
}
