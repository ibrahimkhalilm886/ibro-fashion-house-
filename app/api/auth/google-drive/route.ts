import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  if (!env.googleClientId || !env.googleRedirectUri) {
    return NextResponse.json(
      {
        error: "Google Drive OAuth credentials missing.",
        instruction: "Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in your .env file.",
      },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email",
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
