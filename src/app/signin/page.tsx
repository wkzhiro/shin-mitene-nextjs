"use client";
import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // すでに認証済みならホームにリダイレクト
    useEffect(() => {
    if (status === "authenticated") {
        router.push("/list");
    }
    }, [status, router]);

    // 認証状態が読み込み中の場合はシンプルなローディング表示
    if (status === "loading") {
    return (
        <>
        <div className="container mx-auto flex justify-center items-center min-h-screen">
            <p className="text-xl font-bold">Loading...</p>
        </div>
        </>
    );
    }

    return (
    <>
        <div className="container mx-auto flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-3xl font-bold mb-4">サインインしてください</h1>
        <p className="mb-6">Azure Entra ID アカウントでサインインできます</p>
        <button
        onClick={() => signIn("azure-ad", { callbackUrl: "/list" })}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
        サインイン
        </button>
        </div>
    </>
    );
    }
