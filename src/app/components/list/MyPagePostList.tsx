"use client";

import Link from "next/link";
import Image from "next/image";
import { PostListProps } from "@/app/types/list.types";

// 日付を "YYYY年MM月DD日" 形式で表示
function formatDateJapanese(dateStr?: string): string {
  if (!dateStr) return "日付不明";
  const ts = Date.parse(dateStr.trim());
  if (isNaN(ts)) return "日付不明";
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}年${mm}月${dd}日`;
}

export default function MyPagePostList({
  posts,
  userInfoMap = {},
  showUser = true,
  showBookmark = false,
  cardWidthClass = "w-full",
  userInfoWidthClass = "max-w-[180px]",
}: PostListProps & { cardWidthClass?: string; userInfoWidthClass?: string }) {
  return (
    <div className="space-y-4 w-full mx-auto max-w-[1440px] px-4 flex flex-col">
      {posts.map((p, i) => {
        const formattedDate = formatDateJapanese(p.updated_at ?? p.created_at);
        const bookmarkCount = typeof p.bookmark_count === "number" ? p.bookmark_count : 0;
        const commentCount = typeof p.comment_count === "number" ? p.comment_count : 0;

        return (
          <div
            key={p.id}
            className="relative p-3.5 bg-white rounded-lg shadow-[0px_1px_1px_rgba(30,33,33,0.15)] flex gap-3 items-center"
          >
            <div className="flex flex-col grow shrink text-zinc-800 w-full min-w-0">
              <div className="flex flex-col w-full">
                <div className="flex flex-row w-full items-start">
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center w-full">
<Link
  href={`/edit/${p.id}`}
  className="text-lg font-bold tracking-wider leading-6 hover:text-blue-600 hover:underline truncate flex-1 min-w-0"
  id={`article-title-list-${i + 1}`}
>
  {p.title}
</Link>
                      {showBookmark && (
                        <span
                          className="ml-2"
                          aria-label="bookmark"
                          style={{ width: 28, height: 28, position: "relative", display: "inline-block" }}
                        >
                          <span
                            className={`absolute inset-0 rounded-full transition ${
                              p.is_bookmarked ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {p.is_bookmarked ? (
                            <span className="relative block w-7 h-7">
                              {/* 黒塗りブックマーク */}
                              <svg
                                className="absolute w-7 h-7 text-black"
                                fill="black"
                                stroke="black"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
                              </svg>
                              {/* チェックマーク（白） */}
                              <svg
                                className="absolute w-4 h-4 left-1.5 top-1.5"
                                fill="none"
                                stroke="white"
                                strokeWidth={3}
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12l4 4 8-8" />
                              </svg>
                            </span>
                          ) : (
                            <svg
                              className="relative w-6 h-6 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 items-center self-start mt-2.5 text-xs whitespace-nowrap">
                      {(p.tags || []).map((tag: any, idx: number) => (
                        tag && tag.tag_id && tag.tag_id.name ? (
                          <span
                            key={String(tag.tag_id.id) + idx}
                            className="self-stretch px-1 my-auto h-4 bg-gray-200 rounded"
                          >
                            {tag.tag_id.name}
                          </span>
                        ) : null
                      ))}
                    </div>
                    <div className="flex gap-3 items-center mt-1.5 text-xs font-medium whitespace-nowrap">
                      <div className="flex gap-1 items-center">
                        <img
                          src="https://cdn.builder.io/api/v1/image/assets/TEMP/b6f889c61d9d4af4035f773f0f82a756e61ffe2f?apiKey=ccf579e70fdb44338731cfbc68ca429f"
                          alt="views"
                          className="w-3"
                        />
                        <span>{p.view_count || 0}</span>
                      </div>
                      <div className="flex gap-1 items-center">
                        <img
                          src="https://cdn.builder.io/api/v1/image/assets/TEMP/4414724bbd8be4bf7f536e97abf3a6cfb4d05a9b?apiKey=ccf579e70fdb44338731cfbc68ca429f"
                          alt="likes"
                          className="w-3"
                        />
                        <span>{p.like_count || 0}</span>
                      </div>
                      <div className="flex gap-1 items-center">
                        <svg
                          className="w-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z"
                          />
                        </svg>
                        <span>{bookmarkCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {showUser && (
                cardWidthClass === "w-[180px]" ? (
                  <div className="flex flex-col mt-2 items-start text-xs text-zinc-800">
                    <div className="flex items-center gap-2">
                      <Image
                        src={userInfoMap[p.user_id || ""]?.avatar_url || "/default-avatar.png"}
                        alt="avatar"
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex flex-col max-w-[180px]">
                        <span className="truncate">
                          {userInfoMap[p.user_id || ""]?.username || "774"}
                        </span>
                        <span className="text-gray-500 text-sm">
                          {formattedDate}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute bottom-3 right-12 text-xs text-zinc-800 max-w-[228px]">
                    <div className="flex items-center gap-2">
                      <Image
                        src={userInfoMap[p.user_id || ""]?.avatar_url || "/default-avatar.png"}
                        alt="avatar"
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex flex-col max-w-[180px]">
                        <span className="truncate">
                          {userInfoMap[p.user_id || ""]?.username || "774"}
                        </span>
                        <span className="text-gray-500 text-sm">
                          {formattedDate}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        );
      })}
      {posts.length === 0 && <p>投稿がありません。</p>}
    </div>
  );
}
