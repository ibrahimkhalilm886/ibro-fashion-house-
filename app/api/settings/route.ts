import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ settings: null });

  const { data } = await supabase.from("store_settings").select("*").eq("id", 1).single();
  if (!data) return NextResponse.json({ settings: null });

  return NextResponse.json({
    settings: {
      siteName: data.site_name,
      siteSubName: data.site_sub_name,
      tagline: data.tagline,
      heroBadge: data.hero_badge,
      heroTitleLine1: data.hero_title_line1,
      heroTitleItalic: data.hero_title_italic,
      heroDescription: data.hero_description,
      heroBannerUrl: data.hero_banner_url,
      logoUrl: data.logo_url,
      fontFamily: data.font_family,
      primaryColor: data.primary_color,
      accentBgColor: data.accent_bg_color,
      pageBgColor: data.page_bg_color,
      whatsappNumber: data.whatsapp_number,
      bkashNumber: data.bkash_number,
      nagadNumber: data.nagad_number,
      rocketNumber: data.rocket_number,
      advancePaymentAmount: Number(data.advance_payment_amount),
      advancePaymentNote: data.advance_payment_note,
      deliveryFeeInsideDhaka: Number(data.delivery_fee_inside_dhaka),
      deliveryFeeOutsideDhaka: Number(data.delivery_fee_outside_dhaka),
      showTrustBar: data.show_trust_bar,
      showStorySection: data.show_story_section,
      storyBadge: data.story_badge,
      storyTitleLine1: data.story_title_line1,
      storyTitleItalic: data.story_title_italic,
      storyDescription: data.story_description,
      footerTagline: data.footer_tagline,
      googleDriveConnected: data.google_drive_connected,
      googleDriveEmail: data.google_drive_email,
      googleDriveFolderId: data.google_drive_folder_id,
      dailyBackupEnabled: data.daily_backup_enabled,
      lastBackupAt: data.last_backup_at,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "verify_admin") {
      if (body.email === env.adminEmail && body.password === env.adminPassword) {
        return NextResponse.json({ authenticated: true });
      }
      return NextResponse.json(
        { authenticated: false, error: "ভুল ইমেইল বা পাসওয়ার্ড। অনুমোদিত Admin ছাড়া প্রবেশ নিষিদ্ধ।" },
        { status: 401 }
      );
    }

    if (body.action === "save_settings" && body.settings) {
      const s = body.settings;
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase.from("store_settings").upsert({
          id: 1,
          site_name: s.siteName,
          site_sub_name: s.siteSubName,
          tagline: s.tagline,
          hero_badge: s.heroBadge,
          hero_title_line1: s.heroTitleLine1,
          hero_title_italic: s.heroTitleItalic,
          hero_description: s.heroDescription,
          hero_banner_url: s.heroBannerUrl,
          logo_url: s.logoUrl,
          font_family: s.fontFamily,
          primary_color: s.primaryColor,
          accent_bg_color: s.accentBgColor,
          page_bg_color: s.pageBgColor,
          whatsapp_number: s.whatsappNumber,
          bkash_number: s.bkashNumber,
          nagad_number: s.nagadNumber,
          rocket_number: s.rocketNumber,
          advance_payment_amount: s.advancePaymentAmount,
          advance_payment_note: s.advancePaymentNote,
          delivery_fee_inside_dhaka: s.deliveryFeeInsideDhaka,
          delivery_fee_outside_dhaka: s.deliveryFeeOutsideDhaka,
          show_trust_bar: s.showTrustBar,
          show_story_section: s.showStorySection,
          story_badge: s.storyBadge,
          story_title_line1: s.storyTitleLine1,
          story_title_italic: s.storyTitleItalic,
          story_description: s.storyDescription,
          footer_tagline: s.footerTagline,
          daily_backup_enabled: s.dailyBackupEnabled,
          updated_at: new Date().toISOString(),
        });
      }
      return NextResponse.json({ saved: true });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
