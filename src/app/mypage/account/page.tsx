"use client";

import React, { useState, useEffect, ChangeEvent, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { supabase } from "@/app/lib/supabase";
import { UserProfile } from "@/app/types/mypage.types";


export default function AccountSettings() {
  const { data: session } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile>({
    username: "",
    avatar_url: "",
    email: "",
  });
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  let userId: string | null = null;
  if (session?.accessToken) {
    try {
      const decoded: any = jwtDecode(session.accessToken);
      userId = decoded.oid;
    } catch (error) {}
  }

  // プロフィール取得（API経由）
  useEffect(() => {
    if (!userId) return;
    async function fetchProfile() {
      const res = await fetch(`/api/account?userId=${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      setProfile({
        username: data.username || "",
        avatar_url: data.avatar_url || "",
        email: data.email || "",
        description: data.description || "",
      });
    }
    fetchProfile();
  }, [userId]);

  // ファイル選択時
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setIconFile(file);
    if (file) {
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);
    }
  }

  function handleFileSelect() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  async function uploadToAzureBlob(file: File): Promise<string> {
    try {
      setUploading(true);
      const base64File = await fileToBase64(file);
      const payload = {
        fileName: file.name,
        fileType: file.type,
        fileData: base64File,
        userId,
      };
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const uploadUrl = new URL(`/api/uploadBlob`, baseUrl);
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        return json.url;
      } else {
        throw new Error(json.message || "アップロード失敗");
      }
    } catch (err: any) {
      return "";
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      alert("ユーザー認証情報がありません。ログインしてください。");
      return;
    }
    let avatarUrl = profile.avatar_url || "";
    if (iconFile) {
      const uploadedUrl = await uploadToAzureBlob(iconFile);
      if (uploadedUrl) {
        avatarUrl = uploadedUrl;
      }
    }
    const res = await fetch("/api/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        username: profile.username,
        avatar_url: avatarUrl,
        email: profile.email,
        description: profile.description || "",
      }),
    });
    if (!res.ok) {
      alert("プロフィール更新に失敗しました。");
    } else {
      alert("プロフィールを更新しました。");
      router.push("/mypage");
    }
  }

  return (
    <div className="flex overflow-hidden flex-col pb-96 bg-neutral-100 max-md:pb-24 min-h-screen">
  
    {/* Main Content Section */}
      <main
        className="flex flex-col items-start self-center px-9 py-10 mt-20 max-w-full text-sm font-bold leading-none bg-white rounded-lg text-zinc-800 w-[608px] max-md:px-5 max-md:mt-10"
      >
        <h1 className="ml-2.5 text-xl leading-none text-center">アカウント設定</h1>
        <hr
          className="object-contain self-stretch mt-2 w-full border-t border-gray-200"
          aria-hidden="true"
        />

        <form className="w-full" onSubmit={handleSubmit}>
          <div className="flex gap-6 mt-5 ml-2.5 text-center whitespace-nowrap items-center">
            <div>
              <label className="block">アイコン</label>
              <img
                src={
                  previewUrl
                    ? previewUrl
                    : profile.avatar_url
                    ? profile.avatar_url
                    : "https://cdn.builder.io/api/v1/image/assets/TEMP/acf80d3f3289fa62886369d8247be68a18b1e26d?placeholderIfAbsent=true&apiKey=ccf579e70fdb44338731cfbc68ca429f"
                }
                className="w-[50px] h-[50px] rounded-full object-cover mx-auto my-2"
                alt="現在のプロフィール画像"
              />
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="flex items-center gap-2 py-2 mt-4 bg-white text-gray-700 rounded cursor-pointer w-full justify-center transition"
              >
                <span className="hover:underline">画像アップロード</span>
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/9e75fe7e763f3d3059460f2d7d00bf3e229b46a4?placeholderIfAbsent=true&apiKey=ccf579e70fdb44338731cfbc68ca429f"
                  className="object-contain w-7 h-7"
                  alt="画像をアップロード"
                />
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: "none" }}
                tabIndex={-1}
              />
              {uploading && (
                <p className="text-blue-500 text-xs mt-2">アップロード中...</p>
              )}
            </div>
          </div>

          <div className="mt-4 ml-2.5 text-left">
            <label htmlFor="username" className="block">
              ユーザー名
            </label>
            <input
              type="text"
              id="username"
              value={profile.username}
              onChange={(e) =>
                setProfile({ ...profile, username: e.target.value })
              }
              className="self-center px-6 py-2.5 mt-4 w-full leading-6 bg-white rounded-lg border border-solid border-neutral-200 max-md:px-5"
              aria-label="ユーザー名"
            />
          </div>

          <div className="mt-8 ml-2.5 text-left">
            <label htmlFor="description" className="block">
              自己紹介
            </label>
            <textarea
              id="description"
              value={profile.description || ""}
              onChange={(e) =>
                setProfile({ ...profile, description: e.target.value })
              }
              className="self-center px-6 py-2.5 mt-5 w-full leading-6 whitespace-nowrap bg-white rounded-lg border border-solid border-neutral-200 max-md:px-5"
              aria-label="自己紹介"
              rows={4}
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="flex justify-center items-center gap-2.5 w-full px-4 py-2 mt-8 ml-2.5 text-center text-white whitespace-nowrap bg-sky-600 rounded"
            aria-label="更新する"
          >
            更新する
          </button>
        </form>
      </main>
    </div>
  );
}
