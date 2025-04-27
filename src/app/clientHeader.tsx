"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { jwtDecode } from "jwt-decode"; // デフォルトエクスポート
import { usePathname } from "next/navigation";

const navItems = [
  { label: "ホーム", href: "/list" },
  { label: "図書一覧", href: "/" },
  {
    label: "AIナレッジポータル",
    href: "https://chatbot-ui-enterprise.azurewebsites.net",
    external: true,
  },
];

export default function ClientHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();

  // ユーザーIDとアバターURLの state
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  // session から JWT を decode しユーザーIDを取得
  useEffect(() => {
    if (session?.accessToken) {
      try {
        const decoded: any = jwtDecode(session.accessToken);
        // decoded.oid を userId として利用
        setUserId(decoded.oid);
      } catch (error) {
        console.error("Error decoding JWT:", error);
      }
    }
  }, [session]);

  // userId が取得できたら、API 経由で avatar_url を取得
  useEffect(() => {
    async function fetchAvatar() {
      if (!userId) return;
      try {
        const res = await fetch(
          `/api/getUserProfile?userId=${encodeURIComponent(userId)}`
        );
        const json = await res.json();
        if (json.success) {
          setAvatarUrl(json.avatar_url || "");
        } else {
          console.error("Failed to fetch avatar:", json.message);
        }
      } catch (error) {
        console.error("Error fetching avatar:", error);
      }
    }
    fetchAvatar();
  }, [userId]);

  return (
    <nav className="border-b text-black" style={{ background: "#C9E8F9" }}>
      <div
        className="flex items-center justify-between mx-auto h-[56px] px-4"
        style={{ maxWidth: "1440px" }}
      >
        {/* 左側: ロゴリンク */}
        <div className="flex items-center h-full">
          <Link href="/" className="text-2xl font-bold flex items-center h-full">
            Shin-Mitene
          </Link>
        </div>

        {/* モバイル用のハンバーガーボタン */}
        <button
          className="md:hidden p-2 border rounded hover:bg-gray-100 flex items-center h-full"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle Menu"
        >
          <span className="block w-5 border-b-2 border-gray-600 mb-1" />
          <span className="block w-5 border-b-2 border-gray-600 mb-1" />
          <span className="block w-5 border-b-2 border-gray-600" />
        </button>

        {/* PC サイズのメニューリンク */}
        <div className="hidden md:flex flex-row gap-4 items-center h-full max-md:max-w-full">
          {/* ナビゲーション */}
          <nav className="flex flex-auto text-sm font-bold leading-6 text-zinc-800 gap-2 h-full items-center">
            {navItems.map((item) =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-1 px-6 py-0 h-full items-center bg-[#C9E8F9]"
                >
                  <span className="grow flex items-center h-full">{item.label}</span>
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/87d7ad5959425e5f750035af6ed2aebbb991af79?placeholderIfAbsent=true&apiKey=ccf579e70fdb44338731cfbc68ca429f"
                    alt="Portal Icon"
                    className="object-contain shrink-0 my-auto w-3.5 aspect-square h-6"
                  />
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-6 py-0 h-full flex items-center bg-[#C9E8F9] ${
                    usePathname() === item.href ? "border-b-2 border-sky-600" : ""
                  } text-zinc-800`}
                  aria-current={usePathname() === item.href ? "page" : undefined}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          {/* 検索ボックス */}
          <form
            action="/list"
            method="get"
            className="flex gap-2 items-center px-2.5 py-0 h-[32px] text-sm font-medium tracking-wider leading-relaxed text-center whitespace-nowrap bg-white rounded-lg text-stone-500"
            role="search"
            style={{ minWidth: 180 }}
          >
            <input
              className="flex-auto bg-white outline-none px-1 py-0 text-black placeholder:text-gray-400 h-full focus:bg-white focus:ring-0 focus:border-gray-300"
              type="search"
              name="q"
              placeholder="検索"
              aria-label="Search"
              style={{ height: "32px" }}
            />
            <button
              type="submit"
              className="p-0 m-0 bg-transparent border-none flex items-center"
              style={{ height: "26px" }}
              aria-label="検索"
            >
              <img
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/085a37c2b9024c6678bf85d38368fa49f16fd041?placeholderIfAbsent=true&apiKey=ccf579e70fdb44338731cfbc68ca429f"
                alt="Search Icon"
                className="object-contain shrink-0 self-center aspect-square w-[18px]"
              />
            </button>
          </form>

          {/* ユーザー情報エリア */}
          {session ? (
            <Link href="/mypage" className="flex gap-2.5 justify-center items-center rounded-2xl min-h-8">
                <img
                  src={avatarUrl || "/default-avatar.png"}
                  alt="Avatar"
                  className="w-[30px] h-[30px] rounded-full object-cover"
                />
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex gap-2.5 justify-center items-center px-1 w-8 h-8 rounded-2xl border border-gray-400 min-h-8"
            >
              <img
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/50f236f75e918b1b6e84fc700e933dbf556869ba?placeholderIfAbsent=true&apiKey=ccf579e70fdb44338731cfbc68ca429f"
                alt="User Icon"
                className="object-contain self-stretch my-auto w-6 aspect-square"
              />
            </Link>
          )}

          {/* 投稿するボタン */}
          <Link
            href="/edit/new"
            className="flex gap-1.5 px-4 py-0 h-8 text-sm font-bold leading-none text-center text-white whitespace-nowrap bg-[#2296D6] hover:bg-[#197bb3] rounded-lg items-center"
            aria-label="Create Post"
          >
            <span className="grow">投稿する</span>
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/78c4b29476f3525a6223ed507891beb135699ea0?placeholderIfAbsent=true&apiKey=ccf579e70fdb44338731cfbc68ca429f"
              alt="Post Icon"
              className="object-contain shrink-0 w-4 aspect-square h-full"
            />
          </Link>
        </div>
      </div>

      {/* モバイルサイズのメニュー展開部分 */}
      {menuOpen && (
        <div className="md:hidden border-t bg-sky-200 shadow-[0px_4px_4px_rgba(0,0,0,0.25)]">
          <div className="p-4 flex flex-col gap-4">
            {/* ナビゲーション */}
            <nav className="flex flex-col gap-2 text-sm font-bold leading-6 text-zinc-800">
              <Link
                href="/"
                className="px-3 py-4 bg-sky-200 border-b-2 border-sky-600 text-zinc-800"
                aria-current="page"
                onClick={() => setMenuOpen(false)}
              >
                ホーム
              </Link>
              <Link
                href="/list"
                className="px-3 py-4 bg-sky-200"
                onClick={() => setMenuOpen(false)}
              >
                投稿一覧
              </Link>
              <div className="flex gap-1 px-3 py-4 bg-sky-200 items-center">
                <span className="grow">AIナレッジポータル</span>
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/87d7ad5959425e5f750035af6ed2aebbb991af79?placeholderIfAbsent=true&apiKey=ccf579e70fdb44338731cfbc68ca429f"
                  alt="Portal Icon"
                  className="object-contain shrink-0 my-auto w-3.5 aspect-square"
                />
              </div>
            </nav>

            {/* 検索ボックス */}
      <div
        className="flex items-center justify-between p-0 mx-auto h-[56px]"
        style={{ maxWidth: "1440px" }}
      >
              <img
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/085a37c2b9024c6678bf85d38368fa49f16fd041?placeholderIfAbsent=true&apiKey=ccf579e70fdb44338731cfbc68ca429f"
                alt="Search Icon"
                className="object-contain shrink-0 self-start aspect-square w-[18px]"
              />
              <span className="flex-auto my-auto">Search</span>
            </div>

            {/* ユーザー情報エリア (モバイル版) */}
            {session ? (
              <Link
                href="/mypage"
                className="flex gap-2.5 justify-center items-center px-1 w-8 h-8 rounded-2xl border border-gray-400 min-h-8"
                onClick={() => setMenuOpen(false)}
              >
                <img
                  src={avatarUrl || "/default-avatar.png"}
                  alt="Avatar"
                  className="w-[50px] h-[50px] rounded-full object-cover"
                />
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex gap-2.5 justify-center items-center px-1 w-8 h-8 rounded-2xl border border-gray-400 min-h-8"
                onClick={() => setMenuOpen(false)}
              >
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/50f236f75e918b1b6e84fc700e933dbf556869ba?placeholderIfAbsent=true&apiKey=ccf579e70fdb44338731cfbc68ca429f"
                  alt="User Icon"
                  className="object-contain self-stretch my-auto w-6 aspect-square"
                />
              </Link>
            )}

            {/* 投稿するボタン (モバイル版) */}
            <Link
              href="/edit/new"
              className="flex gap-1.5 px-4 py-2 text-sm font-bold leading-none text-center text-white whitespace-nowrap bg-sky-700 rounded-lg"
              aria-label="Create Post"
              onClick={() => setMenuOpen(false)}
            >
              <span className="grow">投稿する</span>
              <img
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/78c4b29476f3525a6223ed507891beb135699ea0?placeholderIfAbsent=true&apiKey=ccf579e70fdb44338731cfbc68ca429f"
                alt="Post Icon"
                className="object-contain shrink-0 self-start w-4 aspect-square"
              />
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
