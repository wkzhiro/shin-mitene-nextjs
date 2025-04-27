// types/database.types.ts
export interface Database {
    public: {
      Tables: {
        posts: {
          Row: {
            id: number;
            title: string;
            intro: string;
            content: string;
            cover_image_url?: string | null;
            view_count?: number | null;
            like_count?: number | null;
            // categoriesやtagsなどのネストは実際のデータに合わせて追加してください
            created_at?: string | null;
            updated_at?: string | null;
          };
          Insert: {
            title: string;
            intro: string;
            content: string;
            cover_image_url?: string | null;
            view_count?: number | null;
            like_count?: number | null;
            // 他のカラムも必要に応じて追加
          };
          Update: {
            title?: string;
            intro?: string;
            content?: string;
            cover_image_url?: string | null;
            view_count?: number | null;
            like_count?: number | null;
            // 他のカラムも必要に応じて追加
          };
        };
        // 他のテーブル…
      };
    };
  }
  