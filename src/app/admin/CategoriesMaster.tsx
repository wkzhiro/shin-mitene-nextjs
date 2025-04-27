"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

import { Category } from "@/app/types/admin.types";

export default function CategoriesMaster() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // カテゴリ一覧取得
  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("id", { ascending: true });
    if (error) {
      setError("カテゴリの取得に失敗しました");
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 新規追加
  const handleAdd = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("categories")
      .insert([{ name: newName.trim() }]);
    if (error) {
      setError("追加に失敗しました");
    } else {
      setNewName("");
      fetchCategories();
    }
    setLoading(false);
  };

  // 編集開始
  const startEdit = (id: number, name: string) => {
    setEditId(id);
    setEditName(name);
  };

  // 編集保存
  const handleEdit = async () => {
    if (editId === null || !editName.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("categories")
      .update({ name: editName.trim() })
      .eq("id", editId);
    if (error) {
      setError("更新に失敗しました");
    } else {
      setEditId(null);
      setEditName("");
      fetchCategories();
    }
    setLoading(false);
  };

  // 削除
  const handleDelete = async (id: number) => {
    if (!window.confirm("本当に削除しますか？")) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);
    if (error) {
      setError("削除に失敗しました");
    } else {
      fetchCategories();
    }
    setLoading(false);
  };

  return (
    <div className="mb-10">
      <h2 className="text-2xl font-bold mb-4">カテゴリ管理</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          className="border px-2 py-1 rounded"
          placeholder="新しいカテゴリ名"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={loading}
        />
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          onClick={handleAdd}
          disabled={loading}
        >
          追加
        </button>
      </div>
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">ID</th>
            <th className="border px-2 py-1">カテゴリ名</th>
            <th className="border px-2 py-1">操作</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.id}>
              <td className="border px-2 py-1">{cat.id}</td>
              <td className="border px-2 py-1">
                {editId === cat.id ? (
                  <input
                    type="text"
                    className="border px-2 py-1 rounded"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={loading}
                  />
                ) : (
                  cat.name
                )}
              </td>
              <td className="border px-2 py-1">
                {editId === cat.id ? (
                  <>
                    <button
                      className="bg-green-600 text-white px-2 py-1 rounded mr-2"
                      onClick={handleEdit}
                      disabled={loading}
                    >
                      保存
                    </button>
                    <button
                      className="bg-gray-400 text-white px-2 py-1 rounded"
                      onClick={() => setEditId(null)}
                      disabled={loading}
                    >
                      キャンセル
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                      onClick={() => startEdit(cat.id, cat.name)}
                      disabled={loading}
                    >
                      編集
                    </button>
                    <button
                      className="bg-red-600 text-white px-2 py-1 rounded"
                      onClick={() => handleDelete(cat.id)}
                      disabled={loading}
                    >
                      削除
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
