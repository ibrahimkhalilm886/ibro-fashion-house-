import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase Storage not configured" }, { status: 503 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from("store-media")
      .upload(fileName, arrayBuffer, { contentType: file.type, upsert: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data } = supabase.storage.from("store-media").getPublicUrl(fileName);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
  }
}
