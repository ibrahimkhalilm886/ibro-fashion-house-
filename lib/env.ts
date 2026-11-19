export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  // Keep all secret keys server-only. Never prefix them with NEXT_PUBLIC_.
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@ibrofashion.com",
  adminPassword: process.env.ADMIN_PASSWORD ?? "admin1234",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "",
  gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "",
};

export function assertServerEnv(name: string, value: string) {
  if (typeof window !== "undefined") throw new Error(`${name} must only be used on the server.`);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
}
