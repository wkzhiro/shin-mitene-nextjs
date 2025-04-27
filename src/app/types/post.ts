// types/post.ts
export interface Category {
  id: number;
  name: string;
  count?: number; // オプショナルで count プロパティを追加
}

export interface Tag {
  id: number;
  name: string;
  count?: number; // オプショナルで count プロパティを追加
}

// content型はDBスキーマ（string）に合わせてstring型に統一
export interface User {
  id: number;
  username: string;
  avatar_url?: string;
}

export interface Comment {
  id: number;
  content: string;
  user: User;
  created_at?: string;
}

export interface Post {
  id: number;
  title: string;
  intro: string;
  content: string;
  cover_image_url?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  bookmark_count?: number;
  is_bookmarked?: boolean;
  user_id?: string;
  categories: { category_id: Category }[];
  tags: { tag_id: Tag }[];
  user?: User;
  comments?: Comment[];
  created_at?: string;
  updated_at?: string;
}
