"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import Image from "next/image";
import Link from "next/link";
import MyPagePostList from "@/app/components/list/MyPagePostList";
import { TabType, MyPagePost } from "@/app/types/mypage.types";
import { Post as RealPost } from "@/app/types/post";


export default function MyPage() {
  const { data: session } = useSession();
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [userName, setUserName] = useState<string>("Shirota Ayaka-7のペッカ/城田綾香");
  const [userAffiliation, setUserAffiliation] = useState<string>("所属情報");
  const [tab, setTab] = useState<TabType>("posts");
  const [posts, setPosts] = useState<MyPagePost[]>([]);
  // ユーザー情報管理
  type UserInfo = { username: string; avatar_url: string };
  const [userInfoMap, setUserInfoMap] = useState<Record<string, UserInfo>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // JWTからユーザーID取得
  useEffect(() => {
    if (session?.accessToken) {
      try {
        const decoded: any = jwtDecode(session.accessToken);
        setUserId(decoded.oid);
      } catch (e) {}
    }
  }, [session]);

  // ユーザープロフィール取得（API経由）
  useEffect(() => {
    if (!userId) return;
    async function fetchUserProfile() {
      try {
        const res = await fetch(`/api/getUserProfile?userId=${userId}`);
        if (!res.ok) {
          setAvatarUrl("/default-avatar.png");
          setUserName("");
          setUserAffiliation("");
          return;
        }
        const data = await res.json();
        // list/page.tsxのfetchUsersと同じく、username, avatar_url, description, bioなどを確認
        // まず全体を出力
        console.log("getUserProfile response:", data);
        setAvatarUrl(data.avatar_url ?? data.avatarUrl ?? "/default-avatar.png");
        setUserName(data.username ?? data.name ?? "774");
        setUserAffiliation(data.description ?? data.bio ?? data.affiliation ?? "");
      } catch (e) {
        setAvatarUrl("/default-avatar.png");
        setUserName("");
        setUserAffiliation("");
      }
    }
    fetchUserProfile();
  }, [userId]);

  // 投稿データ取得（API経由）
  useEffect(() => {
    if (!userId) return;
    async function fetchUserPosts() {
      setLoading(true);
      setError(null);

      try {
        if (tab === "posts") {
          // 自分の投稿
          const res = await fetch(`/api/getUserPosts?userId=${userId}`);
          if (!res.ok) {
            setPosts([]);
            setError("投稿取得エラー");
            console.log("投稿取得APIエラー", res.status, await res.text());
          } else {
            const json = await res.json();
            console.log("mypage posts API response:", json);
            setPosts(json.posts || []);
            console.log("mypage posts (posts tab):", json.posts);
          }
        } else if (tab === "favorites") {
          // お気に入り（ブックマーク）
          const res = await fetch(`/api/bookmark?userId=${userId}`);
          if (!res.ok) {
            setPosts([]);
            setError("ブックマーク取得エラー");
            setLoading(false);
            console.log("ブックマーク取得APIエラー", res.status, await res.text());
            return;
          }
          const json = await res.json();
          const posts = (json.results || []).map((p: any) => ({
            ...p,
            is_bookmarked: true,
          }));
          setPosts(posts);
          console.log("mypage posts (favorites tab):", posts);
        } else {
          // 下書きなど他タブ（未実装）
          setPosts([]);
        }
      } catch (e: any) {
        setPosts([]);
        setError(e?.message || "投稿取得例外");
        console.log("投稿取得例外", e);
      } finally {
        setLoading(false);
      }
    }
    fetchUserPosts();
  }, [userId, tab]);

  // 投稿者ユーザー情報の取得（list/page.tsxのfetchUsers相当）
  useEffect(() => {
    async function fetchUsers() {
      // 投稿のuser_idを集約
      const allUserIds = posts
        .map((p) => (p as any).user_id)
        .filter((id): id is string => !!id);
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
    }
    fetchUsers();
  }, [posts]);

  // MyPagePost → Post 変換関数（list/page.tsxのmapRawPostToPost相当）
  function mapMyPagePostToPost(p: MyPagePost): RealPost {
    return {
      id: p.id,
      title: p.title ?? "",
      intro: "",
      content: "",
      cover_image_url: "",
      view_count: p.view_count ?? 0,
      like_count: p.like_count ?? 0,
      comment_count: p.comment_count ?? 0,
      bookmark_count: (p as any).bookmark_count ?? 0,
      is_bookmarked: p.is_bookmarked ?? false,
      user_id: (p as any).user_id && (p as any).user_id !== "" ? (p as any).user_id : userId ?? "",
      categories: (p as any).categories ?? [],
      tags: Array.isArray(p.tags)
        ? p.tags.filter(
            (tag) =>
              tag &&
              typeof tag === "object" &&
              "tag_id" in tag &&
              tag.tag_id &&
              typeof tag.tag_id === "object" &&
              "id" in tag.tag_id &&
              "name" in tag.tag_id
          )
        : [],
      user: (p as any).user ?? undefined,
      comments: (p as any).comments ?? [],
      created_at: p.created_at ?? "",
      updated_at: (p as any).updated_at ?? "",
    };
  }

  // デバッグ: 投稿データと変換後データを出力
  console.log("mypage posts raw:", posts);
  console.log("mypage posts mapped:", posts.map(mapMyPagePostToPost));
  return (
    <div className="bg-[#f7f7f7] min-h-screen py-8">
      <div className="max-w-[1440px] mx-auto flex gap-8">
        {/* サイドバー */}
        <aside className="w-80 bg-white rounded-xl shadow px-8 py-10 flex flex-col items-center">
          <div className="w-28 h-28 rounded-full bg-gray-200 overflow-hidden mb-4 border border-gray-300">
            <Image
              src={avatarUrl || "/default-avatar.png"}
              alt="avatar"
              width={112}
              height={112}
              className="object-cover w-28 h-28"
            />
          </div>
          <div className="text-lg font-semibold text-gray-900 mb-1 text-center">{userName}</div>
          <div className="text-sm text-gray-500 mb-6 text-center">{userAffiliation}</div>
          <div className="text-xs text-gray-400 break-all mb-4 text-center">
            ユーザーID: {userId}
          </div>
          <Link href="/mypage/account" className="w-full">
            <button className="w-full bg-white border border-gray-400 rounded-lg py-2 text-gray-700 font-medium hover:bg-gray-100 transition">
              プロフィールを編集する
            </button>
          </Link>
        </aside>

        {/* メイン */}
        <main className="flex-1">
          {/* タブ */}
          <div className="flex space-x-8 border-b border-gray-200 mb-2 pl-2">
            <button
              className={`py-3 px-2 text-base font-semibold border-b-2 transition ${
                tab === "posts"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-blue-600"
              }`}
              onClick={() => setTab("posts")}
            >
              投稿履歴
            </button>
            <button
              className={`py-3 px-2 text-base font-semibold border-b-2 transition ${
                tab === "drafts"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-blue-600"
              }`}
              onClick={() => setTab("drafts")}
            >
              下書き
            </button>
            <button
              className={`py-3 px-2 text-base font-semibold border-b-2 transition ${
                tab === "favorites"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-blue-600"
              }`}
              onClick={() => setTab("favorites")}
            >
              お気に入り
            </button>
          </div>

          {/* 投稿リスト */}
          <div className="mt-4">
            {/* デバッグ用: 投稿取得状況表示 */}
            {loading && (
              <div className="text-blue-500 mb-2">投稿取得中...</div>
            )}
            {error && (
              <div className="text-red-500 mb-2">投稿取得エラー: {error}</div>
            )}
            <div className="text-xs text-gray-400 mb-2">
              投稿件数: {posts.length}
            </div>
            <MyPagePostList
              posts={posts.map(mapMyPagePostToPost)}
              userInfoMap={userInfoMap}
              showUser={true}
              showBookmark={true}
              cardWidthClass="w-full"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
