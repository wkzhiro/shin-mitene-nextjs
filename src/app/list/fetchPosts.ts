import { Dispatch, SetStateAction } from "react";
import { Post, SearchResult } from "@/app/types/list.types";
import { mapRawPostToPost } from "@/app/components/list/mapRawPostToPost";
import { supabase } from "@/app/lib/supabase";

type FetchPostsParams = {
  filter: string;
  userId: string | null;
  q: string;
  sort: string;
  page: number;
  tag: string;
  category: string;
  setPosts: Dispatch<SetStateAction<Post[]>>;
  setTotalPages: Dispatch<SetStateAction<number>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  session: any;
};

export async function fetchPostsExternal({
  filter,
  userId,
  q,
  sort,
  page,
  tag,
  category,
  setPosts,
  setTotalPages,
  setError,
  setLoading,
  session,
}: FetchPostsParams) {
  try {
    if (filter === "bookmark") {
      if (!userId) {
        setPosts([]);
        return;
      }
      // API経由で自分のブックマーク投稿一覧を取得
      const res = await fetch(`/api/bookmark?userId=${userId}`, { cache: "no-store" });
      if (!res.ok) {
        setError("ブックマーク取得に失敗しました");
        setPosts([]);
        return;
      }
      const data = await res.json();
      // is_bookmarked付与
      let bookmarkedIdSet = new Set<number>();
      if (data.results && userId) {
        bookmarkedIdSet = new Set(data.results.map((p: any) => Number(p.id)));
      }
      const postsWithBookmark = (data.results || []).map((p: any) => ({
        ...p,
        tags: p.tags ?? [],
        is_bookmarked: bookmarkedIdSet.has(Number(p.id)),
      }));
      setPosts(postsWithBookmark.map(mapRawPostToPost));
    } else if (filter === "trend") {
      // トレンド: view_count が高い投稿トップ5
      const { data: trendPosts, error: trendError } = await supabase
        .from("posts")
        .select("id, title, intro, view_count, like_count, user_id, created_at, updated_at")
        .order("view_count", { ascending: false })
        .limit(5);
      if (trendError) {
        console.error("Trend fetch error:", trendError.message);
        setError(trendError.message);
      }
      if (trendPosts && trendPosts.length > 0) {
        const ids = trendPosts.map((p) => p.id);
        const { data: bookmarkCounts } = await supabase
          .from("bookmark")
          .select("post_id, count:post_id", { count: "exact", head: false })
          .in("post_id", ids)
          .eq("is_active", true);
        const countMap: Record<string, number> = {};
        if (bookmarkCounts) {
          bookmarkCounts.forEach((b: any) => {
            countMap[b.post_id] = (countMap[b.post_id] || 0) + 1;
          });
        }
        // タグ情報をpost_tags/tagsから取得
        let tagsMap: Record<number, string[]> = {};
        if (ids.length > 0) {
          const { data: postTags } = await supabase
            .from("post_tags")
            .select("post_id, tag_id")
            .in("post_id", ids);
          const tagIds = postTags ? Array.from(new Set(postTags.map((pt: any) => pt.tag_id))) : [];
          let tagNameMap: Record<number, string> = {};
          if (tagIds.length > 0) {
            const { data: tagsData } = await supabase
              .from("tags")
              .select("id, name")
              .in("id", tagIds);
            if (tagsData) {
              tagNameMap = Object.fromEntries(tagsData.map((t: any) => [t.id, t.name]));
            }
          }
          if (postTags) {
            for (const pt of postTags) {
              if (!tagsMap[pt.post_id]) tagsMap[pt.post_id] = [];
              if (tagNameMap[pt.tag_id]) tagsMap[pt.post_id].push(tagNameMap[pt.tag_id]);
            }
          }
        }
        // is_bookmarked付与
        let bookmarkedIdSet = new Set<number>();
        if (userId) {
          const { data: myBookmarks } = await supabase
            .from("bookmark")
            .select("post_id")
            .eq("user_id", userId)
            .eq("is_active", true);
          if (myBookmarks) {
            bookmarkedIdSet = new Set(myBookmarks.map((b: any) => Number(b.post_id)));
          }
        }
        const postsWithBookmark = trendPosts.map((p) => ({
          ...p,
          bookmark_count: countMap[p.id] || 0,
          tags: (tagsMap[p.id] || []).map((name) => ({ tag_id: { id: 0, name } })),
          is_bookmarked: bookmarkedIdSet.has(Number(p.id)),
        }));
        setPosts(postsWithBookmark.map(mapRawPostToPost));
      } else {
        setPosts((trendPosts || []).map(mapRawPostToPost));
      }
    } else {
      // すべて: Azure Search API から取得
      const searchApiUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/search?q=${encodeURIComponent(
        q
      )}&sort=${sort}&page=${page}&tag=${encodeURIComponent(
        tag
      )}&category=${encodeURIComponent(category)}`;
      const res = await fetch(searchApiUrl, { cache: "no-store" });
      let searchResult: SearchResult = { count: 0, results: [], page: page };
      if (res.ok) {
        searchResult = await res.json();
        // supabaseからcreated_at, tags, bookmark数を取得してマージ
        const ids = searchResult.results.map((p) => p.id);
        if (ids.length > 0) {
          const { data: postsWithExtra } = await supabase
            .from("posts")
            .select("id, title, intro, content, cover_image_url, view_count, like_count, created_at, updated_at, user_id, post_tags(tag:tags(id, name)), post_categories(category:categories(id, name))")
            .in("id", ids);
          // supabaseの生データを比較用に出力
          console.log("=== supabase posts ===", postsWithExtra);
          // AI searchの生データを比較用に出力
          console.log("=== ai search posts ===", searchResult.results);
        }
        // 以降は従来通り
        if (ids.length > 0) {
          const { data: postsWithExtra } = await supabase
            .from("posts")
            .select("id, created_at, post_tags(tag:tags(id, name))")
            .in("id", ids);

          if (!postsWithExtra || postsWithExtra.length === 0) {
            // supabaseから何も取得できなければtagsはAI検索APIのまま
            // bookmark_countだけは付与
            const { data: bookmarkCounts } = await supabase
              .from("bookmark")
              .select("post_id, count:post_id", { count: "exact", head: false })
              .in("post_id", ids)
              .eq("is_active", true);
            const countMap: Record<string, number> = {};
            if (bookmarkCounts) {
              bookmarkCounts.forEach((b: any) => {
                countMap[b.post_id] = (countMap[b.post_id] || 0) + 1;
              });
            }
            searchResult.results = searchResult.results.map((p) => ({
              ...p,
              bookmark_count: countMap[p.id] || 0,
            }));
            // setPostsを必ず呼ぶ
            setPosts(searchResult.results.map(mapRawPostToPost));
            return;
          }
          const { data: bookmarkCounts } = await supabase
            .from("bookmark")
            .select("post_id, count:post_id", { count: "exact", head: false })
            .in("post_id", ids)
            .eq("is_active", true);
          const extraMap = postsWithExtra
            ? Object.fromEntries(postsWithExtra.map((p) => [String(p.id), p]))
            : {};
          const countMap: Record<string, number> = {};
          if (bookmarkCounts) {
            bookmarkCounts.forEach((b: any) => {
              countMap[b.post_id] = (countMap[b.post_id] || 0) + 1;
            });
          }
          searchResult.results = searchResult.results.map((p) => {
            const extra = extraMap[String(p.id)];
            let createdAt = extra?.created_at;
            if (createdAt instanceof Date) {
              createdAt = createdAt.toISOString();
            } else if (typeof createdAt === "string") {
              createdAt = createdAt.trim();
            } else if (createdAt == null) {
              createdAt = "";
            }
            // supabaseのpost_tags(tag:tags(id, name)) からtags配列を生成
            let tags: { tag_id: { id: number; name: string } }[] = [];
            const postTags = extra?.post_tags || [];
            if (Array.isArray(postTags)) {
              tags = postTags
                .map((t: any) =>
                  t.tag && typeof t.tag === "object" && "id" in t.tag && "name" in t.tag
                    ? { tag_id: { id: t.tag.id, name: t.tag.name } }
                    : null
                )
                .filter((tag): tag is { tag_id: { id: number; name: string } } => !!tag);
            }
            return {
              ...p,
              created_at: createdAt,
              tags,
              bookmark_count: countMap[p.id] || 0,
            };
          });
        }
      } else {
        console.error("Failed to search posts.");
      }
      // is_bookmarked付与
      let bookmarkedIdSet = new Set<number>();
      if (userId) {
        const { data: myBookmarks } = await supabase
          .from("bookmark")
          .select("post_id")
          .eq("user_id", userId)
          .eq("is_active", true);
        if (myBookmarks) {
          bookmarkedIdSet = new Set(myBookmarks.map((b: any) => Number(b.post_id)));
        }
      }
      const postsWithBookmark = searchResult.results.map((p) => ({
        ...p,
        tags: p.tags ?? [],
        is_bookmarked: bookmarkedIdSet.has(Number(p.id)),
      }));
      setPosts(postsWithBookmark);
      // デバッグ: 通常時のposts
      console.log("posts (all):", searchResult.results);
      console.log("count:", searchResult.count);
      // 1ページあたりの件数（APIと合わせる）
      const PAGE_SIZE = 20;
      const tp = searchResult.count ? Math.ceil(searchResult.count / PAGE_SIZE) : 1;
      setTotalPages(tp);
    }
  } catch (err) {
    console.error("Fetch posts error:", err);
    setError("投稿の取得に失敗しました");
  } finally {
    setLoading(false);
  }
}
