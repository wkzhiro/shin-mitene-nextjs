"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      if (status === "loading") return;
      // JWTからoidを取得
      if (!session?.accessToken) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      let userId = null;
      try {
        const decoded: any = jwtDecode(session.accessToken);
        userId = decoded.oid;
      } catch (e) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      if (!userId) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      // usersテーブルからroleを取得
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (error || !data) {
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data.role);
      }
      setLoading(false);
    };
    checkAdmin();
  }, [session, status]);

  if (loading || status === "loading") {
    return (
      <div className="container mx-auto py-20 text-center">
        <p className="text-xl font-bold">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold text-red-600">権限がありません</h1>
        <p>このページは管理者のみアクセスできます。</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">マスタ管理（Admin）</h1>
      {/* カテゴリ管理UI */}
      <CategoriesMaster />
      {/* ユーザー管理UI */}
      <UsersMaster />
      {/* 今後、タグ管理UIもここに追加可能 */}
    </div>
  );
}

import CategoriesMaster from "./CategoriesMaster";
import UsersMaster from "./UsersMaster";
