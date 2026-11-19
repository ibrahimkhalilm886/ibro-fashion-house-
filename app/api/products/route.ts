import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const showAll = req.nextUrl.searchParams.get("all") === "1";
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ products: [], source: "local" });
  }

  let query = supabase.from("products").select("*").order("created_at", { ascending: false });
  if (!showAll) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ product: body, mode: "local" });

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
    if (!supabase || !body.id) return NextResponse.json({ product: body, mode: "local" });

    const { data, error } = await supabase
      .from("products")
      .update({
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
      })
      .eq("id", body.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ product: data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const supabase = getSupabaseAdmin();
  if (supabase && id) {
    await supabase.from("products").delete().eq("id", id);
  }
  return NextResponse.json({ deleted: true });
}
