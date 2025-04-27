import { Dispatch, SetStateAction } from "react";
import { mapRawPostToPost } from "./mapRawPostToPost";

export type SortDropdownProps = {
  q: string;
  sortState: string;
  setSortState: (val: string) => void;
  sortDropdownOpen: boolean;
  setSortDropdownOpen: Dispatch<SetStateAction<boolean>>;
  page: number;
  selectedTags: string[];
  category: string;
  selectedUsers: string[];
  setPosts: (posts: any[]) => void;
  setTotalPages: (n: number) => void;
};

export default function SortDropdown({
  q,
  sortState,
  setSortState,
  sortDropdownOpen,
  setSortDropdownOpen,
  page,
  selectedTags,
  category,
  selectedUsers,
  setPosts,
  setTotalPages,
}: SortDropdownProps) {
  const sortOptions = [
    { value: "relevance", label: "関連度順", disabled: q === "" },
    { value: "updated", label: "新着順" },
    { value: "views", label: "閲覧数が多い順" },
    { value: "likes", label: "いいねが多い順" },
    { value: "bookmarks", label: "保存数が多い順" },
  ];
  const current = sortOptions.find((o) => o.value === sortState) || sortOptions[0];

  const handleSelect = async (val: string) => {
    setSortDropdownOpen(false);
    setSortState(val);
    const params = new URLSearchParams({
      q,
      sort: val,
      page: String(page),
      tag: selectedTags.length > 0 ? selectedTags[0] : "",
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
      setTotalPages(data.count ? Math.ceil(data.count / 20) : 1);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="flex items-center gap-1 px-4 py-1 bg-white rounded-lg border border-neutral-200 text-zinc-800 font-semibold hover:bg-gray-100"
        onClick={() => setSortDropdownOpen((v) => !v)}
      >
        <span className="text-base">▼</span>
        <span>
          {current.label}
        </span>
      </button>
      {sortDropdownOpen && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded shadow z-10">
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              className={`block w-full text-left px-4 py-2 hover:bg-blue-50 ${
                sortState === opt.value ? "bg-blue-500 text-white" : ""
              } ${opt.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => !opt.disabled && handleSelect(opt.value)}
              disabled={!!opt.disabled}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
