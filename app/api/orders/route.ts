import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ orders: [], source: "local" });
  }
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ orders: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customer_name,
      phone,
      delivery_address,
      items,
      subtotal,
      delivery_fee,
      advance_amount,
      total,
      payment_method,
      sender_number,
      transaction_id,
    } = body;

    if (!customer_name || !phone || !delivery_address || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "সব তথ্য সঠিকভাবে পূরণ করুন।" }, { status: 400 });
    }

    if (!["bKash", "Nagad", "Rocket"].includes(payment_method)) {
      return NextResponse.json({ error: "শুধুমাত্র bKash, Nagad অথবা Rocket পেমেন্ট গ্রহণযোগ্য।" }, { status: 400 });
    }

    if (!sender_number || !transaction_id) {
      return NextResponse.json({ error: "অগ্রিম পেমেন্টের নম্বর এবং Transaction ID আবশ্যক।" }, { status: 400 });
    }

    const orderNumber = `IBRO-${Date.now().toString().slice(-6)}`;
    const newOrder = {
      id: `ord-${Date.now()}`,
      order_number: orderNumber,
      customer_name,
      phone,
      delivery_address,
      items,
      subtotal: Number(subtotal),
      delivery_fee: Number(delivery_fee),
      advance_amount: Number(advance_amount),
      total: Number(total),
      payment_method,
      sender_number,
      transaction_id,
      payment_status: "pending_verification",
      order_status: "Pending",
      created_at: new Date().toISOString(),
    };

    // Extract product name, size & color from items array for Business Hub
    const firstItem = items[0] || {};
    const itemSummary = items
      .map((it: any) => {
        const name = it?.name || it?.product_name || it?.title || "Item";
        const sz = it?.size || it?.selectedSize || "";
        const col = it?.color || it?.selectedColor || "";
        const qty = it?.quantity || it?.qty || 1;
        const variant = [sz && `Size: ${sz}`, col && `Color: ${col}`].filter(Boolean).join(", ");
        return `${name}${variant ? ` (${variant})` : ""} x${qty}`;
      })
      .join(" | ");

    const sendToBusinessHub = async () => {
      try {
        await fetch("https://ibro-business-hub.vercel.app/api/webhooks/website-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_number: orderNumber,
            customer_name,
            phone,
            address: delivery_address,
            product_name: itemSummary,
            size: firstItem?.size || firstItem?.selectedSize || "",
            color: firstItem?.color || firstItem?.selectedColor || "",
            total: Number(total),
            currency: "BDT",
            notes: `${itemSummary} · ${payment_method} (${transaction_id})`,
          }),
        });
      } catch (hubErr) {
        console.error("Failed to notify IBRO Business Hub:", hubErr);
      }
    };

    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase
        .from("orders")
        .insert({
          order_number: newOrder.order_number,
          customer_name: newOrder.customer_name,
          phone: newOrder.phone,
          delivery_address: newOrder.delivery_address,
          items: newOrder.items,
          subtotal: newOrder.subtotal,
          delivery_fee: newOrder.delivery_fee,
          advance_amount: newOrder.advance_amount,
          total: newOrder.total,
          payment_method: newOrder.payment_method,
          sender_number: newOrder.sender_number,
          transaction_id: newOrder.transaction_id,
          payment_status: newOrder.payment_status,
          order_status: newOrder.order_status,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await sendToBusinessHub();
      return NextResponse.json({ order: data }, { status: 201 });
    }

    await sendToBusinessHub();
    return NextResponse.json({ order: newOrder, mode: "local_fallback" }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, order_status, payment_status } = await req.json();
    const supabase = getSupabaseAdmin();
    if (supabase && id) {
      const updateFields: Record<string, string> = {};
      if (order_status) updateFields.order_status = order_status;
      if (payment_status) updateFields.payment_status = payment_status;

      const { error } = await supabase.from("orders").update(updateFields).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
