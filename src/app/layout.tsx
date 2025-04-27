// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/app/api/context/AuthProvider";
// クライアント側のヘッダーをインポート（clientHeader.tsx で "use client" を指定）
import ClientHeader from "./clientHeader";

export const metadata: Metadata = {
  title: "Shin-Mitene Blog",
  description: "Discover insights and tutorials.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-100 text-[#171717]">
        <AuthProvider>
          {/* ClientHeader が表示されることで、セッション情報を利用したヘッダーが表示される */}
          <ClientHeader />
          {children}
          <footer className="bg-gray-50 text-center py-3">
            <p>
              &copy; {new Date().getFullYear()} Shin-Mitene Blog. All rights reserved.
            </p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
