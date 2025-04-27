"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import Link from "next/link";
import { nodes } from "@/app/components/editor/nodes";
import ReadOnlyEditor from "@/app/components/editor/ReadOnlyEditor";
import type { Post, Tag, Category, Comment } from "@/app/types/post";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { jwtDecode } from "jwt-decode";
import { FaRegHeart, FaRegBookmark } from "react-icons/fa";


export default function PostDetailClient() {
  // データ取得用 state
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>("");

  // ブックマークといいねのステータス
  const [bookmarked, setBookmarked] = useState<boolean | null>(null);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [bookmarkCount, setBookmarkCount] = useState<number>(0);

  // NextAuth の session からユーザー情報を取得
  const { data: session, status } = useSession();

  const params = useParams();
  const postid = params?.id;

  // ユーザーIDは session が存在する場合に取得（例: session.user.id）
  // session.user のフィールド名は認証実装に依存するため、適宜変更してください。
  // accessToken が存在する場合、jwt-decode でデコードして sub をユーザーIDとして取得
  // userIdはuseMemoでグローバルに取得
  const userId = useMemo(() => {
    if (session?.accessToken) {
      try {
        const decoded: any = jwtDecode(session.accessToken);
        return decoded.oid;
      } catch (error) {
        console.error("Error decoding JWT:", error);
        return null;
      }
    }
    return null;
  }, [session]);

  useEffect(() => {
    async function fetchPost() {
      // 投稿詳細API経由で取得
      const res = await fetch(`/api/getPost?id=${postid}`);
      if (!res.ok) {
        setError("投稿が見つかりませんでした。");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPost(data);
      setBookmarkCount(data.bookmark_count || 0);

      // 自分がブックマーク済みか判定
      if (userId && data.id) {
        const resBookmark = await fetch(`/api/bookmark?userId=${userId}`);
        if (resBookmark.ok) {
          const json = await resBookmark.json();
          setBookmarked(
            (json.results || []).some((p: any) => String(p.id) === String(data.id))
          );
        }
      }
      // 自分がいいね済みか判定
      if (userId && data.id) {
        const resLike = await fetch("/api/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: data.id, userId, checkOnly: true }),
        });
        if (resLike.ok) {
          const json = await resLike.json();
          setLiked(!!json.liked);
        }
      }
      setLoading(false);
    }
    fetchPost();
  }, [postid, session]);

  // 閲覧履歴を記録
  const pageViewSentRef = useRef(false);
  useEffect(() => {
    if (!postid || !userId) return;
    if (pageViewSentRef.current) return;
    pageViewSentRef.current = true;
    fetch("/api/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: postid, userId }),
    }).catch((err) => {
      // エラーは特に何もしない
      console.error("Failed to record page view:", err);
    });
  }, [postid, userId]);

  // コメント一覧の取得
  useEffect(() => {
    async function fetchComments() {
      const res = await fetch(`/api/comments?postId=${postid}`);
      if (!res.ok) {
        console.error("Failed to fetch comments");
        return;
      }
      const json = await res.json();
      setComments(json.comments || []);
    }
    fetchComments();
  }, [postid]);

  // コメント投稿ハンドラー
  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      alert("コメントするにはログインが必要です");
      return;
    }
    if (!newComment.trim()) {
      alert("コメント内容を入力してください");
      return;
    }
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: post?.id,
        userId,
        content: newComment.trim(),
      }),
    });
    if (!res.ok) {
      alert("コメント投稿に失敗しました");
      return;
    }
    const json = await res.json();
    setComments([...comments, json.comment]);
    setNewComment("");
  }

  // ブックマーク実施用ハンドラー
  async function handleBookmark() {
    if (!post) return;

    // 未ログインの場合は処理しないなどの対応も検討してください
    if (!userId) {
      alert("ブックマークするにはログインが必要です");
      return;
    }

    try {
      const res = await fetch("/api/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, userId }),
      });
      const json = await res.json();
      console.log("Bookmark API Response:", json);
      if (json.success) {
        setBookmarked(json.bookmarked);
        // ブックマーク数を即時反映
        setBookmarkCount((prev) =>
          json.bookmarked ? prev + 1 : prev > 0 ? prev - 1 : 0
        );
        // alert(json.message); // 成功時のalert削除
      } else {
        // alert("ブックマーク処理に失敗しました"); // 失敗時のalert削除
      }
    } catch (err) {
      console.error("Error in bookmarking:", err);
      // alert("ブックマーク処理中にエラーが発生しました"); // エラー時のalert削除
    }
  }

  // いいね実施用ハンドラー
  async function handleLike() {
    if (!post) return;

    if (!userId) {
      alert("いいねするにはログインが必要です");
      return;
    }

    try {
      const res = await fetch("/api/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, userId }),
      });
      const json = await res.json();
      console.log("Like API Response:", json);
      if (json.success) {
        setLiked(json.liked);
        // like数を即時反映
        setPost((prev) =>
          prev
            ? {
                ...prev,
                like_count:
                  typeof prev.like_count === "number"
                    ? prev.like_count + (json.liked ? 1 : -1)
                    : json.liked
                    ? 1
                    : 0,
              }
            : prev
        );
        // alert(json.message); // 成功時のalert削除
      } else {
        // alert("いいね処理に失敗しました"); // 失敗時のalert削除
      }
    } catch (err) {
      console.error("Error in liking:", err);
      // alert("いいね処理中にエラーが発生しました"); // エラー時のalert削除
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <p className="text-gray-600">{error}</p>
        <Link href="/list" className="text-blue-500 hover:underline">
          一覧に戻る
        </Link>
      </div>
    );
  }

  // 本文表示はLexicalのReadOnlyEditorで表示

  // categories, tags の整形
const categories = post.categories;
console.log("post", post);
console.log("post.tags", post.tags);
const tags = Array.isArray(post.tags)
  ? post.tags.map((tagObj: any) => tagObj && typeof tagObj === "object" && "tag_id" in tagObj ? tagObj.tag_id : tagObj)
  : [];
console.log("tags", tags);

  return (
    <div className="relative flex flex-row bg-gray-50 min-h-screen">
      {/* 左端: Like/Bookmark縦並び（カード外） */}
      <div className="flex flex-col gap-6 items-center pt-8 pl-4 pr-2">
        {/* いいねボタン */}
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-1 group"
          aria-label="いいね"
        >
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${liked ? "border-blue-600" : "border-gray-300"} bg-white transition-colors group-hover:bg-blue-100 group-hover:border-blue-600`}
          >
            <FaRegHeart
              size={20}
              className={liked ? "text-blue-600" : "text-gray-400 group-hover:text-blue-600"}
            />
          </div>
          <span className={`text-xs font-bold ${liked ? "text-blue-600" : "text-gray-500"}`}>
            {post?.like_count ?? 0}
          </span>
        </button>
        {/* 保存（ブックマーク）ボタン */}
        <button
          onClick={handleBookmark}
          className="flex flex-col items-center gap-1 group"
          aria-label="ブックマーク"
        >
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${bookmarked ? "border-blue-600" : "border-gray-300"} bg-white transition-colors group-hover:bg-blue-100 group-hover:border-blue-600`}
          >
            <FaRegBookmark
              size={20}
              className={bookmarked ? "text-blue-600" : "text-gray-400 group-hover:text-blue-600"}
            />
          </div>
          <span className={`text-xs font-bold ${bookmarked ? "text-blue-600" : "text-gray-500"}`}>
            {bookmarkCount}
          </span>
        </button>
      </div>
      {/* 中央: 記事・コメント */}
      <div className="flex-1 flex flex-col items-center">
        <div className="max-w-5xl w-full mx-auto px-4 py-6">
          {/* 記事本体 */}
          <div className="bg-white rounded-lg shadow px-8 py-8 mb-8">
            {/* ユーザーアバター＋名前 */}
            <div className="flex items-center gap-3 mb-4">
              <img
                src={post.user?.avatar_url || "/default-avatar.png"}
                alt={post.user?.username || "No Name"}
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="font-semibold text-lg">{post.user?.username || "No Name"}</span>
            </div>
            <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
            <div className="flex gap-2 mb-2">
              {tags.map((tag: any, idx: number) => {
                if (typeof tag === "object" && tag !== null) {
                  // tagがobjectの場合
                  if ("name" in tag) {
                    return <span key={String(tag.id ?? idx)} className="bg-gray-200 text-sm px-2 py-1 rounded">{tag.name}</span>;
                  }
                  if ("id" in tag) {
                    return <span key={String(tag.id)} className="bg-gray-200 text-sm px-2 py-1 rounded">{tag.id}</span>;
                  }
                  return <span key={JSON.stringify(tag) + idx} className="bg-gray-200 text-sm px-2 py-1 rounded">{JSON.stringify(tag)}</span>;
                }
                // stringやnumberの場合
                return <span key={String(tag) + idx} className="bg-gray-200 text-sm px-2 py-1 rounded">{String(tag)}</span>;
              })}
            </div>
            <div className="flex gap-2 text-xs text-gray-500 mb-4">
            </div>
            <div className="mb-4">
              {/* <img
                src={post.cover_image_url || "/images/default_cover.png"}
                alt={post.title}
                className="rounded-lg w-full h-auto"
              /> */}
            </div>
            {/* <div className="text-gray-500 text-sm flex space-x-4 mb-4">
              <strong>Categories:</strong>
              {categories.map((category: any, idx: number) =>
                typeof category === "string" ? (
                  <span key={category + idx} className="bg-gray-100 px-2 py-1 rounded-lg">{category}</span>
                ) : (
                  <span key={category.id || idx} className="bg-gray-100 px-2 py-1 rounded-lg">{category.name}</span>
                )
              )}
            </div> */}
            {/* 日付表示 */}
            <div className="flex gap-6 text-xs text-gray-500 mt-4">
              <div>
                <span className="font-semibold">投稿日: </span>
                {post.created_at
                  ? new Date(post.created_at).toLocaleDateString()
                  : "-"}
              </div>
              <div>
                <span className="font-semibold">更新日: </span>
                {post.updated_at
                  ? new Date(post.updated_at).toLocaleDateString()
                  : "-"}
              </div>
            </div>
            <div className="prose max-w-none text-gray-800 my-12 mb-6">
              <ReadOnlyEditor editorState={post.content} />
            </div>
          </div>
          

          {/* コメント一覧 */}
          <section className="bg-white rounded-lg shadow px-8 py-8 mb-8">
            <h2 className="text-xl font-semibold mb-4">コメント</h2>
            {comments.length > 0 ? (
              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-4">
                    {/* Likeボタン（仮：数値は0固定、必要ならlike数を追加） */}
                    <button
                      className="flex flex-col items-center gap-1 mt-2 text-gray-500 hover:text-blue-600"
                      aria-label="コメントをいいね"
                      type="button"
                    >
                      {/* <FaRegHeart size={20} />
                      <span className="text-xs">0</span> */}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <img
                          src={comment.user?.avatar_url || "/default-avatar.png"}
                          alt={comment.user?.username || "No Name"}
                          className="w-8 h-8 rounded-full object-cover mr-2"
                        />
                        <span className="font-semibold">
                          {comment.user?.username || "No Name"}
                        </span>
                        <span className="text-gray-400 text-xs ml-auto flex-1 text-right">
                          {new Date(comment.created_at ?? "").toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">コメントはありません。</p>
            )}
          </section>

          {/* コメント投稿フォーム */}
          <section className="bg-white rounded-lg shadow px-8 py-8">
            <h3 className="text-lg font-semibold mb-2">コメントする</h3>
            <form onSubmit={handleAddComment}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="コメントを入力してください"
                rows={3}
                className="w-full border rounded p-2 mb-2"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  投稿する
                </button>
              </div>
            </form>
          </section>

          <Link
            href="/list"
            className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 mt-8 inline-block"
          >
            一覧に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
