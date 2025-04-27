"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { jwtDecode } from "jwt-decode";
import { Suspense } from "react";
import { Post, Tag, Category, RawPost, FacetsResult, SearchResult } from "@/app/types/list.types";

import { supabase } from "@/app/lib/supabase";
import PostList from "@/app/components/list/PostList";
import TabLink from "@/app/components/list/TabLink";
import SortDropdown from "@/app/components/list/SortDropdown";
import Pagination from "@/app/components/list/Pagination";
import { mapRawPostToPost } from "@/app/components/list/mapRawPostToPost";
import { fetchPostsExternal } from "./fetchPosts";

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

  // 並び替えドロップダウンの状態
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [sortState, setSortState] = useState(sort);

  // タブ部分のコンポーネント
  // --- 外部コンポーネントとして分離するため削除 ---

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
    fetchPostsExternal({
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
    });
  }, [filter, q, sort, page, tag, category, userId, session]);

  // ウィークリー・マンスリー TOP5 の取得
  useEffect(() => {
    async function fetchAndSetRankedPosts() {
      // 外部ファイルのfetchRankedPostsを利用
      const { fetchRankedPosts } = await import("./rankings");
      const { weekly, monthly } = await fetchRankedPosts(userId);
      setWeeklyPosts(weekly);
      setMonthlyPosts(monthly);
    }
    fetchAndSetRankedPosts();
  }, [userId]);

  // 投稿者ユーザー情報の取得（getUserProfile API利用）
  useEffect(() => {
    async function fetchAndSetUserInfo() {
      const { fetchUserInfoMap } = await import("./userInfo");
      // user_idがstringのものだけ渡す
      const safePosts = posts
        .filter((p) => typeof p.user_id === "string")
        .map((p) => ({ user_id: p.user_id as string }));
      const safeWeekly = weeklyPosts
        .filter((p) => typeof p.user_id === "string")
        .map((p) => ({ user_id: p.user_id as string }));
      const safeMonthly = monthlyPosts
        .filter((p) => typeof p.user_id === "string")
        .map((p) => ({ user_id: p.user_id as string }));
      const map = await fetchUserInfoMap(safePosts, safeWeekly, safeMonthly);
      setUserInfoMap(map);
    }
    fetchAndSetUserInfo();
  }, [posts, weeklyPosts, monthlyPosts]);

  // Suspenseで全体をラップ

  if (loading) {
    return (
      <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-6"><p className="text-gray-600">Loading...</p></div>}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <p className="text-gray-600">Loading...</p>
        </div>
      </Suspense>
    );
  }
  if (error) {
    return (
      <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-6"><p className="text-gray-600">Loading...</p></div>}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <p className="text-gray-600">{error}</p>
          <Link href="/list" className="text-blue-500 hover:underline">
            一覧に戻る
          </Link>
        </div>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-6"><p className="text-gray-600">Loading...</p></div>}>
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
                <TabLink label="すべて" value="all" filter={filter} />
                <TabLink label="トレンド" value="trend" filter={filter} />
                <TabLink label="お気に入り" value="bookmark" filter={filter} />
              </div>
              <div className="flex items-center gap-2">
                <SortDropdown
                  q={q}
                  sortState={sortState}
                  setSortState={setSortState}
                  sortDropdownOpen={sortDropdownOpen}
                  setSortDropdownOpen={setSortDropdownOpen}
                  page={page}
                  selectedTags={selectedTags}
                  category={category}
                  selectedUsers={selectedUsers}
                  setPosts={setPosts}
                  setTotalPages={setTotalPages}
                />
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
            {filter === "all" && <Pagination currentPage={page} totalPages={totalPages} filter={filter} />}
          </section>
        </div>
      </div>
    </Suspense>
  );
}
