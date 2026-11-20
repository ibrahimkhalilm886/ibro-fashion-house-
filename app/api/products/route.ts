import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_PRODUCTS } from "@/lib/defaultData";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const showAll = req.nextUrl.searchParams.get("all") === "1";
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { products: null, configured: false },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  // Check if products table has ever been initialized
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  // Only auto-seed if table is completely empty AND store_settings hasn't marked seeded
  if (count === 0) {
    const { data: settingsRow } = await supabase
      .from("store_settings")
      .select("tagline")
      .eq("id", 1)
      .single();

    // Auto-seed starter items once if never seeded before
    const { data: seededFlag } = await supabase
      .from("backup_logs")
      .select("id")
      .eq("backup_type", "initial_seed_done")
      .limit(1);

    if (!seededFlag || seededFlag.length === 0) {
      await supabase.from("products").upsert(
        DEFAULT_PRODUCTS.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          slug: p.slug,
          description: p.description,
          category: p.category,
          gender: p.gender,
          price: p.price,
          compare_at_price: p.compare_at_price ?? null,
          image_urls: p.image_urls,
          sizes: p.sizes,
          colors: p.colors,
          stock: p.stock,
          active: p.active,
        })),
        { onConflict: "sku" }
      );
      await supabase.from("backup_logs").insert({
        backup_type: "initial_seed_done",
        status: "completed",
      });
    }
    void settingsRow;
  }

  let query = supabase.from("products").select("*").order("created_at", { ascending: false });
  if (!showAll) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { products: data ?? [], configured: true },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase database is not connected. Add SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables." },
        { status: 503 }
      );
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        sku: body.sku,
        name: body.name,
        slug: body.slug,
        description: body.description,
        category: body.category,
        gender: body.gender,
        price: body.price,
        compare_at_price: body.compare_at_price ?? null,
        image_urls: body.image_urls,
        sizes: body.sizes,
        colors: body.colors,
        stock: body.stock,
        active: body.active,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ product: data }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase database is not connected." },
        { status: 503 }
      );
    }

    const updatePayload = {
      sku: body.sku,
      name: body.name,
      description: body.description,
      category: body.category,
      gender: body.gender,
      price: body.price,
      compare_at_price: body.compare_at_price ?? null,
      image_urls: body.image_urls,
      sizes: body.sizes,
      colors: body.colors,
      stock: body.stock,
      active: body.active,
      updated_at: new Date().toISOString(),
    };

    let res = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", body.id)
      .select()
      .maybeSingle();

    if (!res.data && body.sku) {
      res = await supabase
        .from("products")
        .update(updatePayload)
        .eq("sku", body.sku)
        .select()
        .maybeSingle();
    }

    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
    return NextResponse.json({ product: res.data ?? body });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const sku = req.nextUrl.searchParams.get("sku");
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase database is not connected." },
      { status: 503 }
    );
  }

  if (id) {
    await supabase.from("products").delete().eq("id", id);
  }
  if (sku) {
    await supabase.from("products").delete().eq("sku", sku);
  }

  return NextResponse.json(
    { deleted: true },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
