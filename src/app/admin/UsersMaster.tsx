"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

import { User } from "@/app/types/admin.types";

export default function UsersMaster() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ユーザー一覧取得
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("users")
      .select("id, username, email, role")
      .order("created_at", { ascending: false });
    if (error) {
      setError("ユーザーの取得に失敗しました");
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // role（管理者権限）トグル
  const handleToggleRole = async (id: string, currentRole: boolean | null) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("users")
      .update({ role: !currentRole })
      .eq("id", id);
    if (error) {
      setError("権限変更に失敗しました");
    } else {
      fetchUsers();
    }
    setLoading(false);
  };

  return (
    <div className="mb-10">
      <h2 className="text-2xl font-bold mb-4">ユーザー管理</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">ID</th>
            <th className="border px-2 py-1">ユーザー名</th>
            <th className="border px-2 py-1">メールアドレス</th>
            <th className="border px-2 py-1">管理者権限</th>
            <th className="border px-2 py-1">操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="border px-2 py-1 text-xs">{user.id}</td>
              <td className="border px-2 py-1">{user.username}</td>
              <td className="border px-2 py-1">{user.email || ""}</td>
              <td className="border px-2 py-1 text-center">
                {user.role ? (
                  <span className="text-green-600 font-bold">管理者</span>
                ) : (
                  <span className="text-gray-500">一般</span>
                )}
              </td>
              <td className="border px-2 py-1 text-center">
                <button
                  className={`px-3 py-1 rounded ${
                    user.role
                      ? "bg-gray-400 text-white hover:bg-gray-500"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                  onClick={() => handleToggleRole(user.id, user.role)}
                  disabled={loading}
                >
                  {user.role ? "一般にする" : "管理者にする"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
