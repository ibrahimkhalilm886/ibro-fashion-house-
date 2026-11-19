import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/admin?drive_error=missing_code", req.url));
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: env.googleRedirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();

    let email = "";
    if (tokens.access_token) {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userData = await userRes.json();
      email = userData.email || "";
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase
        .from("store_settings")
        .update({
          google_drive_connected: true,
          google_drive_email: email,
          google_drive_refresh_token: tokens.refresh_token || "",
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
    }

    return NextResponse.redirect(new URL("/admin?drive_connected=1", req.url));
  } catch {
    return NextResponse.redirect(new URL("/admin?drive_error=token_exchange_failed", req.url));
  }
}
