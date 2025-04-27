// app/api/uploadBlob/route.ts
import { NextRequest, NextResponse } from "next/server";
import { BlobServiceClient } from "@azure/storage-blob";
import { createClient } from "@supabase/supabase-js";

// Supabase クライアントの初期化（サービスロールキーを利用）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!supabaseKey) {
  throw new Error("supabaseKey is required.");
}
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    // userId も含める
    const { fileName, fileType, fileData, userId } = await req.json();
    if (!fileName || !fileType || !fileData || !userId) {
      return NextResponse.json(
        { success: false, message: "必要なデータが不足しています" },
        { status: 400 }
      );
    }

    // Azure Blob Storage 接続文字列を環境変数から取得
    const connectionString = process.env.AZURE_BLOB_CONNECTION_STRING;
    if (!connectionString) {
      return NextResponse.json(
        { success: false, message: "Azure Blob 接続文字列が設定されていません" },
        { status: 500 }
      );
    }

    // BlobServiceClient の生成
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerName = "shin-mitene";
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // コンテナが存在しなければ作成（パブリックアクセス）
    await containerClient.createIfNotExists({ access: "container" });

    // 一意のブロブ名を生成（タイムスタンプ + ファイル名）
    const blobName = `${Date.now()}_${fileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // base64 エンコードされたファイルデータを Buffer に変換
    const buffer = Buffer.from(fileData, "base64");

    // アップロード実行
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: fileType },
    });

    // アップロードしたブロブの URL を取得
    const blobUrl = blockBlobClient.url;

    // Supabase の users テーブルに、avatar_url を更新（userId をキーに）
    const { error: updateError } = await supabase
      .from("users")
      .update({ avatar_url: blobUrl })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to update user avatar in Supabase:", updateError.message);
      return NextResponse.json(
        { success: false, message: updateError.message },
        { status: 500 }
      );
    }

    // アップロードした URL を返す
    return NextResponse.json({ success: true, url: blobUrl });
  } catch (err: any) {
    console.error("Error uploading to Azure Blob:", err);
    return NextResponse.json(
      { success: false, message: err.message || "アップロード中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
