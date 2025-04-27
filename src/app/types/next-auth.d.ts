// /types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
    /**
     * session の型拡張
     */
    interface Session {
        // 既存の型 (DefaultSession) を継承しつつ、
        // 任意のプロパティを追加したい場合はここで宣言
        accessToken?: string;
    }

    /**
     * JWT の型拡張
     */
    interface JWT {
        // コールバック内で token.accessToken といった形で使いたい場合
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: number;
    }
}
