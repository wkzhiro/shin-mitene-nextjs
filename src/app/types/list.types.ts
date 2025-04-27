import type { Post, Tag, Category } from "./post";
export type { Post, Tag, Category } from "./post";

// APIやDBから取得する生データ用の型
export interface RawPost {
  id: number;
  title: string;
  intro: string;
  view_count?: number;
  like_count?: number;
  tags?: { tag_id: { id: number; name: string } }[]; // タグ配列
  user_id?: string; // 投稿者ID
  created_at?: string;
  updated_at?: string;
  [key: string]: any; // その他フィールド許容
}

// 検索パラメータ型
export interface SearchParams {
  q?: string;
  sort?: string;
  page?: number;
  tag?: string;
  category?: string;
  filter?: string; // "all" | "trend" | "bookmark" など
}

// 検索結果型
export interface SearchResult {
  count: number | null;
  results: Post[];
  page: number;
}

// ファセット型
export interface FacetsResult {
  tags: Tag[];
  categories: Category[];
}

// PostList用型
export interface UserInfo {
  username: string;
  avatar_url: string;
}

export interface PostListProps {
  posts: Post[];
  userInfoMap?: Record<string, UserInfo>;
  showUser?: boolean;
  showBookmark?: boolean;
  cardWidthClass?: string;
  userInfoWidthClass?: string;
}

export interface FilterModalProps {
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
}
