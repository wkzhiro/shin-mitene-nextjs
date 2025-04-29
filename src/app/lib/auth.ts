import { NextAuthOptions } from "next-auth"
import AzureADProvider from "next-auth/providers/azure-ad"
import { supabase } from "@/app/lib/supabase";
import { jwtDecode } from "jwt-decode";

// NextAuth の設定オプション
export const authOptions: NextAuthOptions = {
    providers: [
        AzureADProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID ?? "",
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? "",
        tenantId: process.env.AZURE_AD_TENANT_ID, // tenantIdを指定すると自動でURL組み立ててくれます
        authorization: {
            params: {
            // 必要に応じて追加スコープを指定
            // "offline_access" を含むことでリフレッシュトークン取得も可能
            scope: "openid profile email offline_access offline_access",
            },
        },
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            // AzureADのoidをidとして利用
            let oid = undefined;
            if (account?.access_token) {
                try {
                    const decoded: any = jwtDecode(account.access_token);
                    oid = decoded.oid;
                } catch (e) {
                    console.log("jwtDecode error:", e);
                }
            }
            const azureId = account?.oid;
            const email = user.email;
            const username = user.name || user.email?.split("@")[0] || "user";
            const avatar_url = user.image || null;
            console.log("signin account:", account, "decoded oid:", oid);

            // 既存ユーザー確認（idまたはemailで）
            let { data: existing, error: selectError } = await supabase
                .from("users")
                .select("id")
                .or(`id.eq.${oid},email.eq.${email}`)
                .maybeSingle();
            console.log("supabase select existing:", { existing, selectError });

            if (!existing) {
                // 新規登録
                const { error: insertError, data: insertData } = await supabase
                    .from("users")
                    .insert([{
                        id: oid,
                        azure_id: azureId,
                        username: username,
                        email: email,
                        avatar_url: avatar_url,
                    }]);
                console.log("supabase insert result:", { insertError, insertData });
                if (insertError) {
                    // 登録失敗時はサインイン失敗
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, account }) {
        // 初回ログイン時にアクセストークンやリフレッシュトークンを取り込む
        if (account) {
            token.accessToken = account.access_token;
            token.refreshToken = account.refresh_token;
            token.expiresAt = account.expires_at;
        }
        return token;
        },
        async session({ session, token }) {
        // sessionオブジェクトにアクセストークンを格納し、フロントから参照できるように
        if (token?.accessToken) {
            session.accessToken = token.accessToken as string;
        }
        return session;
        },
    },
    session: {
        strategy: "jwt",
    },
    // NextAuthがセッション情報を暗号化する際に使用
    secret: process.env.NEXTAUTH_SECRET,
};
