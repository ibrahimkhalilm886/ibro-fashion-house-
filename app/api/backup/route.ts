import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase";

async function uploadToGoogleDrive(refreshToken: string, fileName: string, content: string) {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) return null;

  const boundary = "ibro_backup_boundary";
  const metadata = JSON.stringify({ name: fileName, mimeType: "application/json" });
  const multipartBody =
    `--${boundary}
Content-Type: application/json; charset=UTF-8

${metadata}
` +
    `--${boundary}
Content-Type: application/json

${content}
--${boundary}--`;

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );
  if (!uploadRes.ok) return null;
  return uploadRes.json();
}

export async function GET(req: NextRequest) {
  // Called automatically by Vercel Daily Cron Job
  const authHeader = req.headers.get("authorization");
  if (env.cronSecret && authHeader !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
  }
  return runBackup({});
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return runBackup(body);
}

async function runBackup(fallbackData: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `IBRO_Fashion_House_Full_Backup_${timestamp}.json`;

  let backupPayload: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    store: "IBRO Fashion House",
    ...fallbackData,
  };

  let uploadedToDrive = false;
  let driveFileId: string | null = null;

  if (supabase) {
    const [productsRes, ordersRes, settingsRes] = await Promise.all([
      supabase.from("products").select("*"),
      supabase.from("orders").select("*"),
      supabase.from("store_settings").select("*").eq("id", 1).single(),
    ]);

    backupPayload = {
      exported_at: new Date().toISOString(),
      store: "IBRO Fashion House",
      products: productsRes.data ?? fallbackData.products ?? [],
      orders: ordersRes.data ?? fallbackData.orders ?? [],
      settings: settingsRes.data ?? fallbackData.settings ?? {},
    };

    const refreshToken = settingsRes.data?.google_drive_refresh_token;
    if (refreshToken && env.googleClientId && env.googleClientSecret) {
      const driveFile = await uploadToGoogleDrive(
        refreshToken,
        fileName,
        JSON.stringify(backupPayload, null, 2)
      );
      if (driveFile?.id) {
        uploadedToDrive = true;
        driveFileId = driveFile.id;
      }
    }

    await supabase.from("backup_logs").insert({
      backup_type: "daily_full_backup",
      status: "success",
      drive_file_id: driveFileId,
      drive_file_name: fileName,
      records_count: {
        products: Array.isArray(backupPayload.products) ? backupPayload.products.length : 0,
        orders: Array.isArray(backupPayload.orders) ? backupPayload.orders.length : 0,
      },
    });

    await supabase
      .from("store_settings")
      .update({ last_backup_at: new Date().toISOString() })
      .eq("id", 1);
  }

  return NextResponse.json({
    success: true,
    fileName,
    uploadedToDrive,
    driveFileId,
    backupPayload,
  });
}
