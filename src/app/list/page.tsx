"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {jwtDecode} from "jwt-decode"; // デフォルトエクスポートとしてimport
import { Post, Tag, Category, RawPost, FacetsResult, SearchResult } from "@/app/types/list.types";

import { supabase } from "@/app/lib/supabase";
import PostList from "@/app/components/list/PostList";
import dynamic from "next/dynamic";

/**
 * RawPost型から共通Post型（types/post.ts）へ変換
 * 必要に応じてtags, categories, user, content等をマッピング
 */
function mapRawPostToPost(raw: RawPost): Post {
  return {
    id: raw.id,
    title: raw.title,
    intro: raw.intro ?? "",
    content: raw.content ?? "",
    categories: raw.categories ?? [],
    tags: raw.tags ?? [],
    view_count: raw.view_count,
    like_count: raw.like_count,
    comment_count: raw.comment_count,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    user_id: raw.user_id,
    bookmark_count: raw.bookmark_count,
    is_bookmarked: raw.is_bookmarked,
  };
}

// --- FilterModalProps型定義を削除 ---

import FilterModal from "@/app/components/list/FilterModal";

export default function ListPage() {
  const [activeRankTab, setActiveRankTab] = useState<"weekly" | "monthly">("weekly");
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const sort = searchParams.get("sort") || "updated";
  const page = Number(searchParams.get("page") || 1);
  const tag = searchParams.get("tag") || "";
  const category = searchParams.get("category") || "";
  const filter = searchParams.get("filter") || "all"; // 現在のタブ: all / trend / bookmark

  // フィルターモーダル・選択状態管理
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const { data: session } = useSession();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    if (session?.accessToken) {
      try {
        const decoded: any = jwtDecode(session.accessToken);
        setUserId(decoded.oid);
      } catch (error) {
        setUserId(null);
        console.error("Error decoding JWT:", error);
      }
    } else {
      setUserId(null);
    }
  }, [session]);

  // 各データを state で管理する
  const [facetsData, setFacetsData] = useState<FacetsResult>({ tags: [], categories: [] });
  const [posts, setPosts] = useState<Post[]>([]);
  const [weeklyPosts, setWeeklyPosts] = useState<Post[]>([]);
  const [monthlyPosts, setMonthlyPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // 「すべて」フィルタの場合の総ページ数（例：1ページあたり10件とする）
  const [totalPages, setTotalPages] = useState<number>(1);

  // ユーザー情報管理
  type UserInfo = { username: string; avatar_url: string };
  const [userInfoMap, setUserInfoMap] = useState<Record<string, UserInfo>>({});

  // タブ部分のコンポーネント
  function TabLink({ label, value }: { label: string; value: string }) {
    const isActive = filter === value;
    return (
      <Link
        href={`/list?filter=${value}`}
        className={`py-2 px-4 ${
          isActive
            ? "border-b-2 border-blue-500 text-blue-500 font-bold"
            : "text-gray-500 hover:text-blue-500"
        }`}
      >
        {label}
      </Link>
    );
  }

  // 並び替えドロップダウン
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [sortState, setSortState] = useState(sort);

  function SortDropdown() {
    const sortOptions = [
      { value: "relevance", label: "関連度順", disabled: q === "" },
      { value: "updated", label: "新着順" },
      { value: "views", label: "閲覧数が多い順" },
      { value: "likes", label: "いいねが多い順" },
      { value: "bookmarks", label: "保存数が多い順" },
    ];
    const current = sortOptions.find((o) => o.value === sortState) || sortOptions[0];

    const handleSelect = async (val: string) => {
      setSortDropdownOpen(false);
      setSortState(val);
      // sort stateを更新しAPI検索
      const params = new URLSearchParams({
        q,
        sort: val,
        page: String(page),
        tag: selectedTags.length > 0 ? selectedTags[0] : "",
        category,
      });
      const res = await fetch(`/api/search?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        let filtered = data.results;
        if (selectedUsers.length > 0) {
          filtered = filtered.filter((p: any) => selectedUsers.includes(p.user_id));
        }
        setPosts(filtered.map(mapRawPostToPost));
        setTotalPages(data.count ? Math.ceil(data.count / 20) : 1);
      }
    };

    return (
      <div className="relative">
        <button
          type="button"
          className="flex items-center gap-1 px-4 py-1 bg-white rounded-lg border border-neutral-200 text-zinc-800 font-semibold hover:bg-gray-100"
          onClick={() => setSortDropdownOpen((v) => !v)}
        >
          <span className="text-base">▼</span>
          <span>
            {current.label}
          </span>
        </button>
        {sortDropdownOpen && (
          <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded shadow z-10">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                className={`block w-full text-left px-4 py-2 hover:bg-blue-50 ${
                  sortState === opt.value ? "bg-blue-500 text-white" : ""
                } ${opt.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => !opt.disabled && handleSelect(opt.value)}
                disabled={!!opt.disabled}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // フィルターモーダル

  // Pagination コンポーネント（最大3ページ分の番号表示）
  function Pagination({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
    const pages: number[] = [];
    if (totalPages <= 3) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage === 1) {
        pages.push(1, 2, 3);
      } else if (currentPage === totalPages) {
        pages.push(totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(currentPage - 1, currentPage, currentPage + 1);
      }
    }
    
    return (
      <nav className="mt-10">
        <ul className="flex justify-center space-x-4">
          {currentPage > 1 && (
            <li>
              <Link
                href={`/list?page=${currentPage - 1}&filter=${filter}`}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Previous
              </Link>
            </li>
          )}
          {pages.map((p) => (
            <li key={p}>
              {p === currentPage ? (
                <span className="px-4 py-2 bg-blue-500 text-white rounded-lg">{p}</span>
              ) : (
                <Link
                  href={`/list?page=${p}&filter=${filter}`}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  {p}
                </Link>
              )}
            </li>
          ))}
          {currentPage < totalPages && (
            <li>
              <Link
                href={`/list?page=${currentPage + 1}&filter=${filter}`}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Next
              </Link>
            </li>
          )}
        </ul>
      </nav>
    );
  }

  // フェイセット（タグ・カテゴリ）の取得
  useEffect(() => {
    async function fetchFacets() {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/facets`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setFacetsData(data);
      } else {
        console.error("Failed to fetch facets");
      }
    }
    fetchFacets();
  }, []);

  // 投稿の取得
  useEffect(() => {
    if (userId === null && session) return; // userIdがセットされるまで待つ
    async function fetchPosts() {
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
            const { data: bookmarkCounts, error: countError } = await supabase
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
            // デバッグ: トレンド時のposts
            // console.log("posts (trend):", trendPosts.map((p) => ({
            //   ...p,
            //   bookmark_count: countMap[p.id] || 0,
            //   tags: tagsMap[p.id] || [],
            // })));
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
              const { data: postsWithExtra, error: extraError } = await supabase
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
              const { data: postsWithExtra, error: extraError } = await supabase
                .from("posts")
                .select("id, created_at, post_tags(tag:tags(id, name))")
                .in("id", ids);
              const { data: bookmarkCounts, error: countError } = await supabase
                .from("bookmark")
                .select("post_id, count:post_id", { count: "exact", head: false })
                .in("post_id", ids)
                .eq("is_active", true);
              if (postsWithExtra) {
                // console.log("postsWithExtra:", postsWithExtra);
              }
              const extraMap = postsWithExtra
                ? Object.fromEntries(postsWithExtra.map((p) => [p.id, p]))
                : {};
              const countMap: Record<string, number> = {};
              if (bookmarkCounts) {
                bookmarkCounts.forEach((b: any) => {
                  countMap[b.post_id] = (countMap[b.post_id] || 0) + 1;
                });
              }
              searchResult.results = searchResult.results.map((p) => {
                let createdAt = extraMap[p.id]?.created_at;
                if (createdAt instanceof Date) {
                  createdAt = createdAt.toISOString();
                } else if (typeof createdAt === "string") {
                  createdAt = createdAt.trim();
                } else if (createdAt == null) {
                  createdAt = "";
                }
                // tags: post_tags(tag:tags(id, name)) から string[] 形式に変換
                let tags: string[] = [];
                const postTags = extraMap[p.id]?.post_tags || [];
                if (Array.isArray(postTags)) {
                  tags = postTags
                    .map((t: any) =>
                      t.tag && typeof t.tag === "object" && "name" in t.tag
                        ? t.tag.name
                        : null
                    )
                    .filter((name): name is string => !!name);
                }
                return {
                  ...p,
                  created_at: createdAt,
                  tags: tags.map((name) => ({ tag_id: { id: 0, name } })),
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
    fetchPosts();
  }, [filter, q, sort, page, tag, category, userId, session]);

  // ウィークリー・マンスリー TOP5 の取得
  useEffect(() => {
    async function fetchTopPosts() {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // 週間TOP5
      const { data: weeklyData, error: weeklyError } = await supabase.rpc(
        "get_weekly_top_posts",
        { one_week_ago: oneWeekAgo.toISOString(), lim: 5 }
      );
      let weeklyPostsEnriched = weeklyData || [];
      if (weeklyPostsEnriched.length > 0) {
        // idをnumber型に統一
        const ids = weeklyPostsEnriched.map((p: any) => p.id);

        // postsテーブルからpost_tags(tag:tags(id, name))をjoinして一括取得
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
        weeklyPostsEnriched = weeklyPostsEnriched.map((p: any) => {
          const postWithTags = postsWithTagsMap[p.id] || {};
          return {
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
          };
        });
      }
      console.log("weeklyPostsEnriched", weeklyPostsEnriched);
      setWeeklyPosts(weeklyPostsEnriched.map(mapRawPostToPost));

      // 月間TOP5
      const { data: monthlyData, error: monthlyError } = await supabase.rpc(
        "get_monthly_top_posts",
        { one_month_ago: oneMonthAgo.toISOString(), lim: 5 }
      );
      let monthlyPostsEnriched = monthlyData || [];
      console.log("pre_monthlyPostsEnriched",monthlyPostsEnriched)
      if (monthlyPostsEnriched.length > 0) {
        const ids = monthlyPostsEnriched.map((p: any) => p.id);

        // postsテーブルからpost_tags(tag:tags(id, name))をjoinして一括取得
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
        monthlyPostsEnriched = monthlyPostsEnriched.map((p: any) => {
          const postWithTags = postsWithTagsMap[p.id] || {};
          return {
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
          };
        });
      }
      console.log("monthlyPostsEnriched", monthlyPostsEnriched);
      setMonthlyPosts(monthlyPostsEnriched.map(mapRawPostToPost));
    }
    fetchTopPosts();
  }, []);

  // 投稿者ユーザー情報の取得（getUserProfile API利用）
  useEffect(() => {
    async function fetchUsers() {
      // posts, weeklyPosts, monthlyPosts すべてのuser_idを集約
      const allUserIds = [
        ...posts.map((p) => p.user_id),
        ...weeklyPosts.map((p) => p.user_id),
        ...monthlyPosts.map((p) => p.user_id),
      ].filter((id): id is string => !!id);
      const ids = Array.from(new Set(allUserIds));
      if (ids.length === 0) {
        setUserInfoMap({});
        return;
      }
      const map: Record<string, UserInfo> = {};
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
      setUserInfoMap(map);
      // デバッグ: userInfoMapの中身を確認
      // console.log("userInfoMap:", map);
    }
    fetchUsers();
  }, [posts, weeklyPosts, monthlyPosts]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <p className="text-gray-600">{error}</p>
        <Link href="/list" className="text-blue-500 hover:underline">
          一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* メインコンテンツ: サイドバー（週間TOP5・月間TOP5）と投稿一覧 */}
      <div className="flex gap-8">
        {/* サイドバー */}
        <aside className="w-full md:w-1/4 space-y-8">
          <div>
            <div className="flex items-center mb-2 h-8">
              <h2 className="text-s font-bold h-8 flex items-center mr-2">閲覧数ランキング</h2>
              <button
className={`pl-6 h-8 text-xs font-bold rounded-l transition ${
  activeRankTab === "weekly"
    ? "text-black"
    : "text-gray-400 hover:bg-blue-100 hover:text-blue-600"
}`}
                style={{ background: "none", border: "none" }}
                onClick={() => setActiveRankTab("weekly")}
              >
                週間
              </button>
              <button
className={`px-3 h-8 text-xs font-bold rounded-r transition ${
  activeRankTab === "monthly"
    ? "text-black"
    : "text-gray-400 hover:bg-blue-100 hover:text-blue-600"
}`}
                style={{ background: "none", border: "none" }}
                onClick={() => setActiveRankTab("monthly")}
              >
                月間
              </button>
            </div>
            <PostList
              posts={activeRankTab === "weekly" ? weeklyPosts : monthlyPosts}
              userInfoMap={userInfoMap}
              showUser={true}
              cardWidthClass="w-[180px]"
              userInfoWidthClass="w-[100px]"
            />
          </div>
        </aside>

        {/* 右側：投稿一覧 */}
        <section className="w-full md:w-3/4">
          {/* タブ部分（カード）＋並び替え＋フィルターボタンを横並び・同じ高さで */}
          <div className="flex justify-between items-center mb-4">
            <div className="bg-white rounded-xl shadow flex space-x-4 px-4 py-2 w-fit ml-0">
              <TabLink label="すべて" value="all" />
              <TabLink label="トレンド" value="trend" />
              <TabLink label="お気に入り" value="bookmark" />
            </div>
            <div className="flex items-center gap-2">
              <SortDropdown />
              <button
                type="button"
                className="flex items-center gap-1 px-4 py-1 bg-white rounded-lg border border-neutral-200 text-zinc-800 font-semibold hover:bg-gray-100"
                onClick={() => setFilterModalOpen(true)}
              >
                <span className="text-base">⚙</span>
                <span>フィルター</span>
              </button>
            </div>
          </div>

          {/* フィルターモーダル */}
          <FilterModal
            open={filterModalOpen}
            onClose={() => setFilterModalOpen(false)}
            tags={facetsData.tags}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            users={Object.entries(userInfoMap).map(([id, info]) => ({
              id,
              username: info.username,
            }))}
            selectedUsers={selectedUsers}
            setSelectedUsers={setSelectedUsers}
            onClear={() => {
              setSelectedTags([]);
              setSelectedUsers([]);
            }}
            onApply={() => {
              setFilterModalOpen(false);
              (async () => {
                // 検索条件をAPIに反映
                const tagParam = selectedTags.length > 0 ? selectedTags[0] : "";
                // 投稿者はAPI未対応なので後でfilter
                const params = new URLSearchParams({
                  q,
                  sort: sortState,
                  page: String(page),
                  tag: tagParam,
                  category,
                });
                const res = await fetch(`/api/search?${params.toString()}`, { cache: "no-store" });
                if (res.ok) {
                  const data = await res.json();
                  let filtered = data.results;
                  if (selectedUsers.length > 0) {
                    filtered = filtered.filter((p: any) => selectedUsers.includes(p.user_id));
                  }
                  setPosts(filtered.map(mapRawPostToPost));
                  // ページ数も更新
                  const tp = data.count ? Math.ceil(data.count / 20) : 1;
                  setTotalPages(tp);
                }
              })();
              return undefined;
            }}
          />
          <PostList
            posts={posts}
            userInfoMap={userInfoMap}
            showUser={true}
            cardWidthClass="w-full"
          />
          {/* ページネーション（通常の「すべて」タブでのみ表示） */}
          {filter === "all" && <Pagination currentPage={page} totalPages={totalPages} />}
        </section>
      </div>
    </div>
  );
}
