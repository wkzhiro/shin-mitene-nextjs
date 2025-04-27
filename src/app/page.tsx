"use client";
import { useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      // 直接 /api/auth/signin にGETリクエストせずに、signIn 関数を利用する
      signIn("azure-ad", { callbackUrl: process.env.NEXT_PUBLIC_SITE_URL });
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="container mx-auto flex justify-center items-center h-screen">
        <p className="text-xl font-bold">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-20 text-center">
      <h1 className="text-3xl font-bold">未作成</h1>
    </div>
  );
}
