import { RawPost, Post } from "@/app/types/list.types";

/**
 * RawPost型から共通Post型（types/post.ts）へ変換
 * 必要に応じてtags, categories, user, content等をマッピング
 */
export function mapRawPostToPost(raw: RawPost): Post {
  return {
    id: raw.id,
    title: raw.title,
    intro: raw.intro ?? "",
    content: raw.content ?? "",
    categories: raw.categories ?? [],
    tags: raw.tags ?? [],
    view_count: raw.view_count,
    like_count: raw.like_count,
    comment_count: raw.comment_count,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    user_id: raw.user_id,
    bookmark_count: raw.bookmark_count,
    is_bookmarked: raw.is_bookmarked,
  };
}
