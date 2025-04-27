// app/api/getUserProfile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ success: false, message: "userId is required" }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from("users")
      .select("username, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      username: data?.username ?? "774",
      avatar_url: data?.avatar_url ?? "/default-avatar.png",
    });
  } catch (err: any) {
    console.error("Error in getUserProfile API:", err);
    return NextResponse.json({ success: false, message: err.message || "Unknown error" }, { status: 500 });
  }
}
