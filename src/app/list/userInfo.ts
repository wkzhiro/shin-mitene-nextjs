/**
 * 投稿配列からuser_idを集約し、ユーザー情報マップを返す
 * @param posts 投稿配列
 * @param weeklyPosts 週間ランキング投稿配列
 * @param monthlyPosts 月間ランキング投稿配列
 * @returns Promise<Record<string, { username: string; avatar_url: string }>>
 */
export async function fetchUserInfoMap(
  posts: { user_id: string }[],
  weeklyPosts: { user_id: string }[],
  monthlyPosts: { user_id: string }[]
): Promise<Record<string, { username: string; avatar_url: string }>> {
  const allUserIds = [
    ...posts.map((p) => p.user_id),
    ...weeklyPosts.map((p) => p.user_id),
    ...monthlyPosts.map((p) => p.user_id),
  ].filter((id): id is string => !!id);
  const ids = Array.from(new Set(allUserIds));
  if (ids.length === 0) {
    return {};
  }
  const map: Record<string, { username: string; avatar_url: string }> = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(`/api/getUserProfile?userId=${id}`);
        const json = await res.json();
        map[id] = {
          username: json?.username ?? "774",
          avatar_url: json?.avatar_url ?? "/default-avatar.png",
        };
      } catch {
        map[id] = { username: "774", avatar_url: "/default-avatar.png" };
      }
    })
  );
  return map;
}
