// types/mypage.types.ts

export type TabType = "posts" | "drafts" | "favorites";

export interface MyPagePost {
  id: number;
  title: string;
  tags: { tag_id: { id: number; name: string } }[];
  view_count: number;
  like_count: number;
  comment_count?: number;
  created_at: string;
  is_bookmarked?: boolean;
}

export interface UserProfile {
  username: string;
  avatar_url: string;
  email: string;
  description?: string;
}
