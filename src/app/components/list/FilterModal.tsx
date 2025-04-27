import React, { useState } from "react";
import type { Tag } from "@/app/types/list.types";

type FilterModalProps = {
  open: boolean;
  onClose: () => void;
  tags: Tag[];
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  users: { id: string; username: string }[];
  selectedUsers: string[];
  setSelectedUsers: (users: string[]) => void;
  onClear: () => void;
  onApply: () => void;
};

const FilterModal: React.FC<FilterModalProps> = ({
  open,
  onClose,
  tags,
  selectedTags,
  setSelectedTags,
  users,
  selectedUsers,
  setSelectedUsers,
  onClear,
  onApply,
}) => {
  const [tagSearch, setTagSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // タグフィルタ
  const filteredTags = tagSearch
    ? tags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
    : tags;

  // 投稿者フィルタ
  const filteredUsers = userSearch
    ? users.filter((u) => u.username.toLowerCase().includes(userSearch.toLowerCase()))
    : users;

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-2xl"
          onClick={onClose}
          aria-label="閉じる"
        >
          ×
        </button>
        <h2 className="text-lg font-bold mb-4 text-center">フィルター</h2>
        {/* タグ */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">タグ</span>
          </div>
          <input
            type="text"
            placeholder="タグを検索"
            className="w-full border border-gray-300 rounded px-2 py-1 mb-2"
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {filteredTags.map((tag) => (
              <button
                key={tag.name}
                type="button"
                className={`px-3 py-1 rounded-full border ${
                  selectedTags.includes(tag.name)
                    ? "bg-blue-100 border-blue-400 text-blue-700 font-bold"
                    : "bg-gray-100 border-gray-300 text-gray-700"
                }`}
                onClick={() => {
                  if (selectedTags.includes(tag.name)) {
                    setSelectedTags(selectedTags.filter((t) => t !== tag.name));
                  } else {
                    setSelectedTags([...selectedTags, tag.name]);
                  }
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
        {/* 投稿者 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">投稿者</span>
          </div>
          <input
            type="text"
            placeholder="投稿者を検索"
            className="w-full border border-gray-300 rounded px-2 py-1 mb-2"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
          <div className="max-h-32 overflow-y-auto border rounded p-2">
            {filteredUsers.map((user) => (
              <label key={user.id} className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => {
                    if (selectedUsers.includes(user.id)) {
                      setSelectedUsers(selectedUsers.filter((u) => u !== user.id));
                    } else {
                      setSelectedUsers([...selectedUsers, user.id]);
                    }
                  }}
                />
                <span>{user.username}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-between mt-6">
          <button
            type="button"
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold"
            onClick={onClear}
          >
            すべて解除
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded bg-blue-600 text-white font-semibold"
            onClick={onApply}
          >
            絞り込み
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
