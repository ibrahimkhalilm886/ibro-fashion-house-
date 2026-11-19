"use client";
import { useEffect, useState } from "react";
import {
  DEFAULT_PRODUCTS,
  DEFAULT_SETTINGS,
  OrderItem,
  ProductItem,
  StoreSettings,
} from "@/lib/defaultData";

export default function Home() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [products, setProducts] = useState<ProductItem[]>(DEFAULT_PRODUCTS);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, { size: string; color: string }>>({});
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Checkout Form State (No COD — Advance Payment Required)
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryZone, setDeliveryZone] = useState<"inside" | "outside">("inside");
  const [paymentMethod, setPaymentMethod] = useState<"bKash" | "Nagad" | "Rocket">("bKash");
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ orderNumber: string; total: number; advance: number } | null>(null);
  const [orderError, setOrderError] = useState("");

  useEffect(() => {
    // Load live settings & products from API (with localStorage fallback so edits work out-of-the-box)
    async function loadStoreData() {
      try {
        const localSettings = localStorage.getItem("ibro_store_settings");
        if (localSettings) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(localSettings) });
        }
        const localProducts = localStorage.getItem("ibro_store_products");
        if (localProducts) {
          setProducts(JSON.parse(localProducts));
        }

        const [sRes, pRes] = await Promise.all([
          fetch("/api/settings").catch(() => null),
          fetch("/api/products").catch(() => null),
        ]);
        if (sRes && sRes.ok) {
          const sData = await sRes.json();
          if (sData.settings) setSettings((prev) => ({ ...prev, ...sData.settings }));
        }
        if (pRes && pRes.ok) {
          const pData = await pRes.json();
          if (Array.isArray(pData.products) && pData.products.length > 0) {
            setProducts(pData.products);
          }
        }
      } catch {
        // Fallback already applied
      }
    }
    loadStoreData();
  }, []);

  // Apply dynamic Website Editor colors & fonts
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", settings.primaryColor || "#203746");
    root.style.setProperty("--accent-bg", settings.accentBgColor || "#dcebf0");
    root.style.setProperty("--page-bg", settings.pageBgColor || "#fbfcfa");

    if (settings.fontFamily === "Hind Siliguri + Playfair Display") {
      root.style.setProperty("--font-body", "'Hind Siliguri', sans-serif");
      root.style.setProperty("--font-heading", "'Playfair Display', serif");
    } else if (settings.fontFamily === "Inter + Cormorant Garamond") {
      root.style.setProperty("--font-body", "'Inter', sans-serif");
      root.style.setProperty("--font-heading", "'Cormorant Garamond', serif");
    } else {
      root.style.setProperty("--font-body", "'DM Sans', sans-serif");
      root.style.setProperty("--font-heading", "'Playfair Display', serif");
    }
  }, [settings]);

  const activeProducts = products.filter((p) => p.active);
  const shown = activeProducts.filter(
    (p) =>
      (filter === "All" || p.gender === filter) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const getProductSelection = (p: ProductItem) => {
    return (
      selectedVariants[p.id] || {
        size: p.sizes?.[0] || "M",
        color: p.colors?.[0] || "Default",
      }
    );
  };

  const addToBag = (p: ProductItem) => {
    if (p.stock <= 0) return;
    const sel = getProductSelection(p);
    setCart((prev) => {
      const idx = prev.findIndex(
        (item) => item.productId === p.id && item.size === sel.size && item.color === sel.color
      );
      if (idx > -1) {
        const updated = [...prev];
        updated[idx].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          size: sel.size,
          color: sel.color,
          quantity: 1,
          price: p.price,
        },
      ];
    });
    setCheckoutOpen(true);
    setOrderSuccess(null);
  };

  const updateQty = (index: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev];
      next[index].quantity += delta;
      if (next[index].quantity <= 0) next.splice(index, 1);
      return next;
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee =
    cart.length === 0
      ? 0
      : deliveryZone === "inside"
      ? Number(settings.deliveryFeeInsideDhaka)
      : Number(settings.deliveryFeeOutsideDhaka);
  const grandTotal = subtotal + deliveryFee;
  const requiredAdvance = Math.min(Number(settings.advancePaymentAmount || 150), grandTotal);

  const getMerchantNumber = () => {
    if (paymentMethod === "bKash") return settings.bkashNumber;
    if (paymentMethod === "Nagad") return settings.nagadNumber;
    return settings.rocketNumber;
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError("");
    if (cart.length === 0) {
      setOrderError("আপনার ব্যাগে কোনো প্রোডাক্ট নেই।");
      return;
    }
    if (!customerName.trim() || !phone.trim() || !address.trim()) {
      setOrderError("অনুগ্রহ করে নাম, মোবাইল নম্বর এবং পূর্ণ ঠিকানা দিন।");
      return;
    }
    if (!senderNumber.trim() || !transactionId.trim()) {
      setOrderError("অর্ডার সম্পন্ন করতে যে নম্বর থেকে টাকা পাঠিয়েছেন এবং Transaction ID অবশ্যই দিতে হবে।");
      return;
    }

    setSubmitting(true);
    const payload = {
      customer_name: customerName.trim(),
      phone: phone.trim(),
      delivery_address: address.trim(),
      items: cart,
      subtotal,
      delivery_fee: deliveryFee,
      advance_amount: requiredAdvance,
      total: grandTotal,
      payment_method: paymentMethod,
      sender_number: senderNumber.trim(),
      transaction_id: transactionId.trim().toUpperCase(),
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "অর্ডার সাবমিট করতে সমস্যা হয়েছে।");
      }

      // Also save locally so Admin Dashboard works seamlessly even before Supabase env vars are set
      const existingOrders = JSON.parse(localStorage.getItem("ibro_store_orders") || "[]");
      localStorage.setItem("ibro_store_orders", JSON.stringify([data.order, ...existingOrders]));

      setOrderSuccess({
        orderNumber: data.order.order_number,
        total: grandTotal,
        advance: requiredAdvance,
      });
      setCart([]);
      setSenderNumber("");
      setTransactionId("");
    } catch (err: unknown) {
      setOrderError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setSubmitting(false);
    }
  };

  const totalBagCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cleanWhatsapp = (settings.whatsappNumber || "8801700000000").replace(/[^0-9]/g, "");

  return (
    <main>
      <header>
        <a className="logo" href="#">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.siteName} />
          ) : null}
          <span>
            {settings.siteName} <small>{settings.siteSubName}</small>
          </span>
        </a>
        <nav>
          <a href="#shop" onClick={() => setFilter("All")}>Shop</a>
          <a href="#shop" onClick={() => setFilter("Men")}>Men</a>
          <a href="#shop" onClick={() => setFilter("Women")}>Women</a>
          <a href="/admin">Admin</a>
        </nav>
        <button className="bag-btn" onClick={() => setCheckoutOpen(true)}>
          Bag ({totalBagCount})
        </button>
      </header>

      <section className="hero">
        <div>
          <small>{settings.heroBadge}</small>
          <h1>
            {settings.heroTitleLine1}
            <br />
            <i>{settings.heroTitleItalic}</i>
          </h1>
          <p>{settings.heroDescription}</p>
          <a className="button" href="#shop">
            Explore collection →
          </a>
        </div>
        <img src={settings.heroBannerUrl} alt="Fashion editorial" />
      </section>

      {settings.showTrustBar && (
        <section className="trust">
          <span>✦ Reliable delivery across Bangladesh</span>
          <span>✦ Verified Advance Payment Protection</span>
          <span>✦ Customer care</span>
        </section>
      )}

      <section id="shop" className="shop">
        <small>CURATED FOR YOU</small>
        <h2>
          Find your <i>favorite.</i>
        </h2>
        <div className="tools">
          <div>
            {["All", "Women", "Men"].map((x) => (
              <button
                className={filter === x ? "active" : ""}
                onClick={() => setFilter(x)}
                key={x}
              >
                {x}
              </button>
            ))}
          </div>
          <input
            placeholder="Search products or SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid">
          {shown.map((p) => {
            const sel = getProductSelection(p);
            const isOut = p.stock <= 0;
            return (
              <article key={p.id}>
                <img
                  src={p.image_urls?.[0] || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=700"}
                  alt={p.name}
                />
                <small>
                  {p.gender} · {p.category} · <span style={{ opacity: 0.75 }}>{p.sku}</span>
                </small>
                <h3>{p.name}</h3>
                <div>
                  <b>৳{Number(p.price).toLocaleString("en-BD")}</b>
                  {p.compare_at_price && p.compare_at_price > p.price ? (
                    <span className="compare-price">
                      ৳{Number(p.compare_at_price).toLocaleString("en-BD")}
                    </span>
                  ) : null}
                </div>

                {/* Size & Color Selector */}
                <div className="variant-pills">
                  {(p.sizes || []).map((sz) => (
                    <button
                      type="button"
                      key={sz}
                      className={`variant-pill ${sel.size === sz ? "selected" : ""}`}
                      onClick={() =>
                        setSelectedVariants((prev) => ({
                          ...prev,
                          [p.id]: { ...sel, size: sz },
                        }))
                      }
                    >
                      {sz}
                    </button>
                  ))}
                  {(p.colors || []).map((clr) => (
                    <button
                      type="button"
                      key={clr}
                      className={`variant-pill ${sel.color === clr ? "selected" : ""}`}
                      onClick={() =>
                        setSelectedVariants((prev) => ({
                          ...prev,
                          [p.id]: { ...sel, color: clr },
                        }))
                      }
                    >
                      {clr}
                    </button>
                  ))}
                </div>

                <button
                  disabled={isOut}
                  style={{ opacity: isOut ? 0.5 : 1 }}
                  onClick={() => addToBag(p)}
                >
                  {isOut ? "Out of Stock" : "Add to bag +"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {settings.showStorySection && (
        <section className="story">
          <small>{settings.storyBadge}</small>
          <h2>
            {settings.storyTitleLine1} <i>{settings.storyTitleItalic}</i>
          </h2>
          <p>{settings.storyDescription}</p>
        </section>
      )}

      <footer>
        <b>
          {settings.siteName} {settings.siteSubName}
        </b>
        <p>{settings.footerTagline}</p>
        <p>About · Contact · Privacy · Shipping · Returns</p>
        <small>© 2026 {settings.siteName} {settings.siteSubName}</small>
      </footer>

      {/* WhatsApp Direct Contact Floating Button */}
      <a
        className="whatsapp-float"
        href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
          `আসসালামু আলাইকুম ${settings.siteName} ${settings.siteSubName}, আমি একটি অর্ডার সম্পর্কে জানতে চাই।`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        💬 WhatsApp Support
      </a>

      {/* Advance Payment Checkout Drawer */}
      {checkoutOpen && (
        <div className="modal-backdrop" onClick={() => setCheckoutOpen(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e8eeee", paddingBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>Shopping Bag & Checkout</h2>
                <button
                  onClick={() => setCheckoutOpen(false)}
                  style={{ border: 0, background: "#eef2f0", borderRadius: "50%", width: 32, height: 32, cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>

              {orderSuccess ? (
                <div style={{ background: "#eef8f2", border: "1px solid #b6e2c8", padding: 20, borderRadius: 16, marginTop: 20 }}>
                  <h3 style={{ margin: "0 0 8px", color: "#155724" }}>✅ অর্ডার সফলভাবে জমা হয়েছে!</h3>
                  <p style={{ fontSize: 13, margin: "6px 0" }}>
                    <strong>Order Number:</strong> {orderSuccess.orderNumber}
                  </p>
                  <p style={{ fontSize: 13, margin: "6px 0" }}>
                    <strong>মোট বিল:</strong> ৳{orderSuccess.total} | <strong>অগ্রিম জমা:</strong> ৳{orderSuccess.advance}
                  </p>
                  <p style={{ fontSize: 12, color: "#4d6358", lineHeight: 1.6 }}>
                    আমাদের Admin আপনার Transaction ID যাচাই করে শীঘ্রই অর্ডার Confirm করবেন।
                  </p>
                  <button
                    className="button"
                    onClick={() => {
                      setOrderSuccess(null);
                      setCheckoutOpen(false);
                    }}
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : cart.length === 0 ? (
                <p style={{ color: "#718087", marginTop: 30, textAlign: "center" }}>
                  আপনার ব্যাগ বর্তমানে খালি। শপ থেকে পছন্দের প্রোডাক্ট যোগ করুন।
                </p>
              ) : (
                <form onSubmit={handleOrderSubmit} style={{ marginTop: 16 }}>
                  {/* Cart Items List */}
                  <div style={{ maxHeight: 180, overflowY: "auto", marginBottom: 14 }}>
                    {cart.map((item, idx) => (
                      <div
                        key={`${item.productId}-${item.size}-${item.color}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 0",
                          borderBottom: "1px solid #f0f4f3",
                          fontSize: 13,
                        }}
                      >
                        <div>
                          <strong>{item.name}</strong>
                          <div style={{ fontSize: 11, color: "#718087" }}>
                            Size: {item.size} · Color: {item.color} · ৳{item.price}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button type="button" onClick={() => updateQty(idx, -1)} style={{ border: "1px solid #ddd", background: "#fff", borderRadius: 6, width: 24, height: 24, cursor: "pointer" }}>-</button>
                          <span>{item.quantity}</span>
                          <button type="button" onClick={() => updateQty(idx, 1)} style={{ border: "1px solid #ddd", background: "#fff", borderRadius: 6, width: 24, height: 24, cursor: "pointer" }}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Customer Info */}
                  <div className="form-field">
                    <label>কাস্টমারের নাম *</label>
                    <input
                      required
                      placeholder="আপনার পূর্ণ নাম লিখুন"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>মোবাইল নম্বর *</label>
                    <input
                      required
                      placeholder="01XXXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>ডেলিভারি এলাকা *</label>
                    <select
                      value={deliveryZone}
                      onChange={(e) => setDeliveryZone(e.target.value as "inside" | "outside")}
                    >
                      <option value="inside">ঢাকার ভিতরে (৳{settings.deliveryFeeInsideDhaka})</option>
                      <option value="outside">ঢাকার বাইরে (৳{settings.deliveryFeeOutsideDhaka})</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>পূর্ণ ডেলিভারি ঠিকানা *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="বাসা নং, রোড, এলাকা, জেলা"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  {/* Advance Payment Box (No Cash on Delivery) */}
                  <div className="advance-box">
                    <strong style={{ color: "#8a5300", display: "block", marginBottom: 4 }}>
                      ⚠️ Advance Payment বাধ্যতামূলক (No Cash on Delivery)
                    </strong>
                    <span>{settings.advancePaymentNote}</span>
                    <div style={{ marginTop: 8, fontWeight: 700, color: "#203746" }}>
                      নির্ধারিত অগ্রিম পেমেন্ট: ৳{requiredAdvance} (বাকি ৳{grandTotal - requiredAdvance} ডেলিভারির সময়)
                    </div>

                    <div className="payment-tabs">
                      {(["bKash", "Nagad", "Rocket"] as const).map((m) => (
                        <button
                          type="button"
                          key={m}
                          className={`payment-tab ${paymentMethod === m ? "active" : ""}`}
                          onClick={() => setPaymentMethod(m)}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    <div style={{ background: "#fff", padding: "8px 12px", borderRadius: 8, border: "1px dashed #d5b482", marginBottom: 10 }}>
                      <strong>{paymentMethod} Personal/Merchant Number:</strong>{" "}
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#d82a6b" }}>
                        {getMerchantNumber()}
                      </span>
                    </div>

                    <div className="form-field">
                      <label>যে নম্বর থেকে {paymentMethod} করেছেন *</label>
                      <input
                        required
                        placeholder="01XXXXXXXXX"
                        value={senderNumber}
                        onChange={(e) => setSenderNumber(e.target.value)}
                      />
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                      <label>{paymentMethod} Transaction ID (TrxID) *</label>
                      <input
                        required
                        placeholder="যেমন: 9H7K2L5M8P"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Totals */}
                  <div style={{ fontSize: 13, borderTop: "1px solid #e8eeee", paddingTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span>Subtotal:</span>
                      <span>৳{subtotal}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span>Delivery Fee:</span>
                      <span>৳{deliveryFee}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15 }}>
                      <span>Grand Total:</span>
                      <span>৳{grandTotal}</span>
                    </div>
                  </div>

                  {orderError && (
                    <p style={{ color: "#c0392b", fontSize: 12, marginTop: 8 }}>{orderError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="button"
                    style={{ width: "100%", textAlign: "center", marginTop: 12 }}
                  >
                    {submitting
                      ? "অর্ডার প্রসেস হচ্ছে..."
                      : `অগ্রিম ৳${requiredAdvance} পরিশোধ সাপেক্ষে অর্ডার সম্পন্ন করুন`}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
