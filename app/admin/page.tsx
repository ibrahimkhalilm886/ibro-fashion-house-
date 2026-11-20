"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DEFAULT_PRODUCTS,
  DEFAULT_SETTINGS,
  OrderRecord,
  ProductItem,
  StoreSettings,
} from "@/lib/defaultData";
import { getSupabaseClient } from "@/lib/supabase";

type AdminTab = "products" | "orders" | "payments" | "editor" | "backup";

export default function AdminPage() {
  // 1. Admin Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard Tabs
  const [activeTab, setActiveTab] = useState<AdminTab>("products");
  const [statusMsg, setStatusMsg] = useState("");
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  // Data States
  const [products, setProducts] = useState<ProductItem[]>(DEFAULT_PRODUCTS);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  // Product Form State (Add / Edit)
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [pName, setPName] = useState("");
  const [pSku, setPSku] = useState("");
  const [pCategory, setPCategory] = useState("Shirts");
  const [pGender, setPGender] = useState("Men");
  const [pPrice, setPPrice] = useState("");
  const [pComparePrice, setPComparePrice] = useState("");
  const [pStock, setPStock] = useState("10");
  const [pSizes, setPSizes] = useState("M, L, XL");
  const [pColors, setPColors] = useState("Black, White");
  const [pDescription, setPDescription] = useState("");
  const [pImages, setPImages] = useState<string[]>([]);
  const [pActive, setPActive] = useState(true);
  const [uploadingImg, setUploadingImg] = useState(false);

  // Backup State
  const [runningBackup, setRunningBackup] = useState(false);

  useEffect(() => {
    const savedSession = sessionStorage.getItem("ibro_admin_auth");
    if (savedSession === "true") {
      setIsAuthenticated(true);
    }

    // Load query params for Google Drive OAuth callback notification
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("drive_connected") === "1") {
        setActiveTab("backup");
        setStatusMsg("✅ Google Drive সফলভাবে কানেক্ট হয়েছে!");
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadAdminData();
  }, [isAuthenticated]);

  const loadAdminData = async () => {
    const localP = localStorage.getItem("ibro_store_products");
    if (localP) setProducts(JSON.parse(localP));

    const localO = localStorage.getItem("ibro_store_orders");
    if (localO) setOrders(JSON.parse(localO));

    const localS = localStorage.getItem("ibro_store_settings");
    if (localS) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(localS) });

    try {
      const [pRes, oRes, sRes] = await Promise.all([
        fetch(`/api/products?all=1&t=${Date.now()}`, { cache: "no-store" }).catch(() => null),
        fetch(`/api/orders?t=${Date.now()}`, { cache: "no-store" }).catch(() => null),
        fetch(`/api/settings?t=${Date.now()}`, { cache: "no-store" }).catch(() => null),
      ]);
      if (pRes && pRes.ok) {
        const d = await pRes.json();
        setDbConnected(Boolean(d.configured));
        if (d.configured && Array.isArray(d.products)) {
          setProducts(d.products);
          localStorage.setItem("ibro_store_products", JSON.stringify(d.products));
        }
      }
      if (oRes && oRes.ok) {
        const d = await oRes.json();
        if (Array.isArray(d.orders)) setOrders(d.orders);
      }
      if (sRes && sRes.ok) {
        const d = await sRes.json();
        if (d.settings) setSettings((prev) => ({ ...prev, ...d.settings }));
      }
    } catch {
      // Local state preserved
    }
  };

  // 1. Admin Login Handler (Supports Supabase Auth Admin Role + Env/Local Admin Fallback)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: adminEmailInput.trim(),
          password: adminPasswordInput,
        });
        if (!error && data.user) {
          const role = data.user.user_metadata?.role;
          if (role !== "admin") {
            await supabase.auth.signOut();
            throw new Error("অ্যাক্সেস অস্বীকৃত: আপনার অ্যাকাউন্টে Admin অনুমতি নেই।");
          }
          sessionStorage.setItem("ibro_admin_auth", "true");
          setIsAuthenticated(true);
          return;
        }
      }

      // Server-verified fallback admin login
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_admin",
          email: adminEmailInput.trim(),
          password: adminPasswordInput,
        }),
      });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        sessionStorage.setItem("ibro_admin_auth", "true");
        setIsAuthenticated(true);
      } else {
        setAuthError(data.error || "ইমেইল বা পাসওয়ার্ড সঠিক নয়। শুধু অনুমোদিত Admin প্রবেশ করতে পারবেন।");
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    sessionStorage.removeItem("ibro_admin_auth");
    setIsAuthenticated(false);
  };

  // 2. Product Image Upload (Mobile/PC File Input -> Supabase Storage or Base64 Fallback)
  const handleImageFileUpload = async (files: FileList | null, target: "product" | "logo" | "banner") => {
    if (!files || files.length === 0) return;
    setUploadingImg(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          uploadedUrls.push(data.url);
        } else {
          // Local DataURL fallback if Supabase Storage bucket is not yet configured
          const reader = await new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.readAsDataURL(file);
          });
          uploadedUrls.push(reader);
        }
      }

      if (target === "product") {
        setPImages((prev) => [...prev, ...uploadedUrls]);
      } else if (target === "logo" && uploadedUrls[0]) {
        setSettings((prev) => ({ ...prev, logoUrl: uploadedUrls[0] }));
      } else if (target === "banner" && uploadedUrls[0]) {
        setSettings((prev) => ({ ...prev, heroBannerUrl: uploadedUrls[0] }));
      }
      setStatusMsg("✅ ছবি সফলভাবে আপলোড হয়েছে!");
    } catch {
      setStatusMsg("⚠️ ছবি আপলোডে সমস্যা হয়েছে।");
    } finally {
      setUploadingImg(false);
    }
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setPName("");
    setPSku("");
    setPCategory("Shirts");
    setPGender("Men");
    setPPrice("");
    setPComparePrice("");
    setPStock("10");
    setPSizes("M, L, XL");
    setPColors("Black, White");
    setPDescription("");
    setPImages([]);
    setPActive(true);
  };

  const handleEditProductClick = (p: ProductItem) => {
    setEditingProductId(p.id);
    setPName(p.name);
    setPSku(p.sku);
    setPCategory(p.category);
    setPGender(p.gender);
    setPPrice(String(p.price));
    setPComparePrice(p.compare_at_price ? String(p.compare_at_price) : "");
    setPStock(String(p.stock));
    setPSizes((p.sizes || []).join(", "));
    setPColors((p.colors || []).join(", "));
    setPDescription(p.description || "");
    setPImages(p.image_urls || []);
    setPActive(p.active);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const productObj: ProductItem = {
      id: editingProductId || `prod-${Date.now()}`,
      sku: pSku.trim() || `IBRO-${Math.floor(1000 + Math.random() * 9000)}`,
      name: pName.trim(),
      slug: pName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString().slice(-4),
      description: pDescription.trim(),
      category: pCategory.trim(),
      gender: pGender,
      price: Number(pPrice),
      compare_at_price: pComparePrice ? Number(pComparePrice) : undefined,
      image_urls: pImages.length > 0 ? pImages : ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=700"],
      sizes: pSizes.split(",").map((s) => s.trim()).filter(Boolean),
      colors: pColors.split(",").map((c) => c.trim()).filter(Boolean),
      stock: Number(pStock),
      active: pActive,
    };

    const updatedList = editingProductId
      ? products.map((item) => (item.id === editingProductId ? productObj : item))
      : [productObj, ...products];

    setProducts(updatedList);
    localStorage.setItem("ibro_store_products", JSON.stringify(updatedList));

    const res = await fetch("/api/products", {
      method: editingProductId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productObj),
    }).catch(() => null);

    if (res && !res.ok) {
      const errData = await res.json().catch(() => ({}));
      setStatusMsg(`⚠️ লোকাল ব্রাউজারে সেভ হয়েছে, কিন্তু ডাটাবেজে সেভ হয়নি: ${errData.error || "Supabase Env চেক করুন"}`);
    } else {
      await loadAdminData();
      setStatusMsg(editingProductId ? "✅ প্রোডাক্ট সব ডিভাইসের জন্য আপডেট করা হয়েছে!" : "✅ নতুন প্রোডাক্ট সব ডিভাইসের জন্য যোগ করা হয়েছে!");
    }
    resetProductForm();
  };

  const handleToggleProductVisibility = async (p: ProductItem) => {
    const updated = { ...p, active: !p.active };
    const updatedList = products.map((item) => (item.id === p.id ? updated : item));
    setProducts(updatedList);
    localStorage.setItem("ibro_store_products", JSON.stringify(updatedList));

    await fetch("/api/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    }).catch(() => null);

    setStatusMsg(updated.active ? "👁️ প্রোডাক্টটি স্টোরে দৃশ্যমান করা হয়েছে।" : "🙈 প্রোডাক্টটি স্টোর থেকে Hide করা হয়েছে।");
  };

  const handleDeleteProduct = async (p: ProductItem) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই প্রোডাক্টটি ডিলিট করতে চান?")) return;
    const updatedList = products.filter((item) => item.id !== p.id);
    setProducts(updatedList);
    localStorage.setItem("ibro_store_products", JSON.stringify(updatedList));

    const res = await fetch(
      `/api/products?id=${encodeURIComponent(p.id)}&sku=${encodeURIComponent(p.sku)}`,
      { method: "DELETE" }
    ).catch(() => null);

    if (res && !res.ok) {
      setStatusMsg("⚠️ শুধুমাত্র এই ব্রাউজার থেকে ডিলিট হয়েছে। সব ব্রাউজারে সিঙ্ক করতে Vercel-এ Supabase Keys যোগ করুন।");
    } else {
      await loadAdminData();
      setStatusMsg("🗑️ প্রোডাক্টটি ডাটাবেজ থেকে স্থায়ীভাবে ডিলিট করা হয়েছে (সব ডিভাইসে আপডেট হয়েছে)।");
    }
  };

  // 3 & 4. Order Status & Advance Payment Verification
  const handleUpdateOrder = async (
    orderId: string,
    patch: Partial<Pick<OrderRecord, "order_status" | "payment_status">>
  ) => {
    const updatedOrders = orders.map((o) => (o.id === orderId ? { ...o, ...patch } : o));
    setOrders(updatedOrders);
    localStorage.setItem("ibro_store_orders", JSON.stringify(updatedOrders));

    await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId, ...patch }),
    }).catch(() => null);

    setStatusMsg("✅ অর্ডার ও পেমেন্ট স্ট্যাটাস আপডেট হয়েছে!");
  };

  // 5. Save Website Editor & Payment/WhatsApp Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("ibro_store_settings", JSON.stringify(settings));

    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_settings", settings }),
    }).catch(() => null);

    setStatusMsg("✅ ওয়েবসাইট ডিজাইন, লোগো, ব্যানার, ফন্ট ও পেমেন্ট সেটিংস সেভ হয়েছে!");
  };

  // 6. Trigger Manual Full Backup to Google Drive / Download JSON
  const handleTriggerBackup = async () => {
    setRunningBackup(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products, orders, settings }),
      });
      const data = await res.json();
      if (data.uploadedToDrive) {
        const now = new Date().toISOString();
        const nextSettings = { ...settings, lastBackupAt: now };
        setSettings(nextSettings);
        localStorage.setItem("ibro_store_settings", JSON.stringify(nextSettings));
        setStatusMsg(`✅ Google Drive-এ ফুল ব্যাকআপ সম্পন্ন হয়েছে! File: ${data.fileName}`);
      } else {
        // Download local backup file if Google Drive OAuth credentials are not yet added
        const blob = new Blob([JSON.stringify(data.backupPayload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.fileName || `IBRO_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setStatusMsg("📦 লোকাল ব্যাকআপ ফাইল ডাউনলোড হয়েছে (Google Drive OAuth কানেক্ট করলে সরাসরি ড্রাইভে যাবে)।");
      }
    } catch {
      setStatusMsg("⚠️ ব্যাকআপ নিতে সমস্যা হয়েছে।");
    } finally {
      setRunningBackup(false);
    }
  };

  // LOGIN SCREEN (Blocks regular customers from opening Admin Panel)
  if (!isAuthenticated) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f2f5f2", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 410, background: "#fff", padding: 32, borderRadius: 20, boxShadow: "0 12px 35px rgba(32,55,70,0.08)" }}>
          <Link href="/" style={{ fontSize: 12, color: "#71848b" }}>
            ← Back to Store
          </Link>
          <p style={{ letterSpacing: 3, fontSize: 11, color: "#71848b", marginTop: 24, marginBottom: 6 }}>
            RESTRICTED AREA
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 500, margin: "0 0 8px" }}>
            Admin Login
          </h1>
          <p style={{ fontSize: 13, color: "#617780", marginBottom: 22 }}>
            শুধুমাত্র অনুমোদিত Admin ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করতে পারবেন।
          </p>

          <form onSubmit={handleAdminLogin}>
            <div className="form-field">
              <label>Admin Email</label>
              <input
                type="email"
                required
                placeholder="admin@ibrofashion.com"
                value={adminEmailInput}
                onChange={(e) => setAdminEmailInput(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
              />
            </div>

            {authError && (
              <p style={{ color: "#c0392b", fontSize: 12, background: "#fdecea", padding: 10, borderRadius: 8 }}>
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="button"
              style={{ width: "100%", textAlign: "center", marginTop: 10 }}
            >
              {authLoading ? "যাচাই করা হচ্ছে..." : "Login to Admin Dashboard"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // AUTHENTICATED ADMIN DASHBOARD
  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 20px 80px" }}>
      {/* Top Admin Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, borderBottom: "1px solid #e8eeee", paddingBottom: 18 }}>
        <div>
          <Link href="/" style={{ fontSize: 12, color: "#71848b" }}>
            ← View Live Website
          </Link>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 500, margin: "6px 0 0" }}>
            {settings.siteName} Admin Dashboard
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, background: "#eef8f2", color: "#155724", padding: "6px 12px", borderRadius: 20 }}>
            ● Authorized Admin
          </span>
          <button
            onClick={handleLogout}
            style={{ background: "#eef2f0", border: 0, padding: "8px 16px", borderRadius: 20, fontSize: 12, cursor: "pointer" }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "22px 0" }}>
        {[
          { id: "products", label: `📦 Product Management (${products.length})` },
          { id: "orders", label: `🛍️ Order Management (${orders.length})` },
          { id: "payments", label: "💳 Advance Payment & Mobile Banking" },
          { id: "editor", label: "🎨 Website Editor (Logo/Banner/Font)" },
          { id: "backup", label: "☁️ Google Drive & Daily Backup" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as AdminTab);
              setStatusMsg("");
            }}
            style={{
              padding: "10px 18px",
              borderRadius: 24,
              border: 0,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: activeTab === tab.id ? "#203746" : "#eef2f0",
              color: activeTab === tab.id ? "#fff" : "#203746",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {dbConnected === false && (
        <div style={{ background: "#fff3cd", border: "1px solid #ffeeba", color: "#856404", padding: "12px 16px", borderRadius: 12, marginBottom: 16, fontSize: 13 }}>
          ⚠️ <strong>Database Sync Warning:</strong> Supabase Environment Variables (<code>NEXT_PUBLIC_SUPABASE_URL</code> এবং <code>SUPABASE_SERVICE_ROLE_KEY</code>) এখনো কানেক্ট করা হয়নি। তাই পরিবর্তনগুলো শুধু এই ব্রাউজারে সেভ হচ্ছে। সব মোবাইল ও ব্রাউজারে একসাথে আপডেট পেতে Vercel-এ Supabase Keys যুক্ত করুন।
        </div>
      )}

      {statusMsg && (
        <div style={{ background: "#eef8f2", border: "1px solid #b6e2c8", color: "#155724", padding: "12px 16px", borderRadius: 12, marginBottom: 20, fontSize: 13 }}>
          {statusMsg}
        </div>
      )}

      {/* TAB 1: PRODUCT MANAGEMENT */}
      {activeTab === "products" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 28, alignItems: "start" }}>
          {/* Add / Edit Product Form */}
          <form onSubmit={handleSaveProduct} style={{ background: "#fff", padding: 24, borderRadius: 18, border: "1px solid #e8eeee" }}>
            <h2 style={{ marginTop: 0, fontSize: 20 }}>
              {editingProductId ? "✏️ প্রোডাক্ট এডিট করুন" : "➕ নতুন প্রোডাক্ট যোগ করুন"}
            </h2>

            <div className="form-field">
              <label>প্রোডাক্টের নাম *</label>
              <input required value={pName} onChange={(e) => setPName(e.target.value)} placeholder="যেমন: Premium Cotton Panjabi" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="form-field">
                <label>Product ID / SKU *</label>
                <input required value={pSku} onChange={(e) => setPSku(e.target.value)} placeholder="IBRO-PJ-101" />
              </div>
              <div className="form-field">
                <label>Stock পরিমাণ *</label>
                <input type="number" min={0} required value={pStock} onChange={(e) => setPStock(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="form-field">
                <label>Category</label>
                <input value={pCategory} onChange={(e) => setPCategory(e.target.value)} placeholder="Shirts / T-Shirts / Panjabi" />
              </div>
              <div className="form-field">
                <label>Section (Men / Women)</label>
                <select value={pGender} onChange={(e) => setPGender(e.target.value)}>
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="form-field">
                <label>বিক্রয় মূল্য (৳) *</label>
                <input type="number" min={0} required value={pPrice} onChange={(e) => setPPrice(e.target.value)} placeholder="1490" />
              </div>
              <div className="form-field">
                <label>আগের দাম / Compare Price (৳)</label>
                <input type="number" min={0} value={pComparePrice} onChange={(e) => setPComparePrice(e.target.value)} placeholder="1850" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="form-field">
                <label>Sizes (কমা দিয়ে লিখুন)</label>
                <input value={pSizes} onChange={(e) => setPSizes(e.target.value)} placeholder="M, L, XL, XXL" />
              </div>
              <div className="form-field">
                <label>Colors (কমা দিয়ে লিখুন)</label>
                <input value={pColors} onChange={(e) => setPColors(e.target.value)} placeholder="Black, White, Navy" />
              </div>
            </div>

            <div className="form-field">
              <label>বিবরণ (Description)</label>
              <textarea rows={2} value={pDescription} onChange={(e) => setPDescription(e.target.value)} placeholder="কাপড়ের মান ও বিস্তারিত বিবরণ..." />
            </div>

            <div className="form-field">
              <label>মোবাইল বা কম্পিউটার থেকে একাধিক ছবি আপলোড করুন</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageFileUpload(e.target.files, "product")}
              />
              {uploadingImg && <small style={{ color: "#71848b" }}>ছবি আপলোড হচ্ছে...</small>}
              {pImages.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  {pImages.map((img, idx) => (
                    <div key={idx} style={{ position: "relative" }}>
                      <img src={img} alt="Preview" style={{ width: 62, height: 62, objectFit: "cover", borderRadius: 8 }} />
                      <button
                        type="button"
                        onClick={() => setPImages((prev) => prev.filter((_, i) => i !== idx))}
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          background: "#c0392b",
                          color: "#fff",
                          border: 0,
                          borderRadius: "50%",
                          width: 18,
                          height: 18,
                          fontSize: 10,
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 14 }}>
              <input type="checkbox" checked={pActive} onChange={(e) => setPActive(e.target.checked)} />
              স্টোরে প্রোডাক্টটি দৃশ্যমান (Visible) রাখুন
            </label>

            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" className="button" style={{ marginTop: 0 }}>
                {editingProductId ? "Save Changes" : "Add Product"}
              </button>
              {editingProductId && (
                <button
                  type="button"
                  onClick={resetProductForm}
                  style={{ background: "#eef2f0", border: 0, padding: "12px 18px", borderRadius: 30, cursor: "pointer", fontSize: 12 }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* Existing Products List */}
          <div style={{ background: "#fff", padding: 24, borderRadius: 18, border: "1px solid #e8eeee" }}>
            <h2 style={{ marginTop: 0, fontSize: 20 }}>সকল প্রোডাক্ট ({products.length})</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {products.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 14,
                    padding: 14,
                    borderRadius: 14,
                    background: p.active ? "#f9fbfa" : "#f5f5f5",
                    border: "1px solid #e8eeee",
                    opacity: p.active ? 1 : 0.65,
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <img
                      src={p.image_urls?.[0] || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200"}
                      alt={p.name}
                      style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10 }}
                    />
                    <div>
                      <div style={{ fontSize: 11, color: "#71848b" }}>
                        SKU: <strong>{p.sku}</strong> · {p.gender} / {p.category}
                      </div>
                      <h3 style={{ margin: "3px 0", fontSize: 15 }}>{p.name}</h3>
                      <div style={{ fontSize: 13 }}>
                        <strong>৳{p.price}</strong> · Stock: <strong>{p.stock}</strong> ·{" "}
                        <span style={{ color: p.active ? "#155724" : "#8a5300" }}>
                          {p.active ? "Visible" : "Hidden"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <button
                      onClick={() => handleEditProductClick(p)}
                      style={{ background: "#203746", color: "#fff", border: 0, padding: "7px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleProductVisibility(p)}
                      style={{ background: "#eef2f0", color: "#203746", border: 0, padding: "7px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}
                    >
                      {p.active ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p)}
                      style={{ background: "#fdecea", color: "#c0392b", border: 0, padding: "7px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDER MANAGEMENT */}
      {activeTab === "orders" && (
        <div style={{ background: "#fff", padding: 24, borderRadius: 18, border: "1px solid #e8eeee" }}>
          <h2 style={{ marginTop: 0, fontSize: 22 }}>Order Management & Advance Payment Verification</h2>
          {orders.length === 0 ? (
            <p style={{ color: "#71848b", padding: "30px 0" }}>
              এখনো কোনো অর্ডার আসেনি। স্টোর থেকে একটি টেস্ট অর্ডার করলে এখানে কাস্টমারের নাম, ঠিকানা, Transaction ID ও অর্ডার কন্ট্রোল দেখা যাবে।
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {orders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    border: "1px solid #e2e9e6",
                    borderRadius: 16,
                    padding: 18,
                    background: "#fbfcfa",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #e8eeee", paddingBottom: 12 }}>
                    <div>
                      <strong style={{ fontSize: 16 }}>{order.order_number}</strong>
                      <span style={{ marginLeft: 10, fontSize: 12, color: "#71848b" }}>
                        {new Date(order.created_at).toLocaleString()}
                      </span>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        👤 <strong>{order.customer_name}</strong> · 📞 <strong>{order.phone}</strong>
                      </div>
                      <div style={{ fontSize: 13, color: "#4f636b", marginTop: 2 }}>
                        📍 {order.delivery_address}
                      </div>
                    </div>

                    {/* Payment & Transaction ID Verification Box */}
                    <div style={{ background: "#fff", border: "1px solid #e2e9e6", padding: "10px 14px", borderRadius: 12, minWidth: 260 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#203746" }}>
                        💳 {order.payment_method} Advance: ৳{order.advance_amount} / Total: ৳{order.total}
                      </div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        Sender: <strong>{order.sender_number}</strong>
                      </div>
                      <div style={{ fontSize: 13, marginTop: 2, color: "#d82a6b" }}>
                        TrxID: <strong>{order.transaction_id}</strong>
                      </div>
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11 }}>Payment Verify:</span>
                        <select
                          value={order.payment_status}
                          onChange={(e) =>
                            handleUpdateOrder(order.id, {
                              payment_status: e.target.value as OrderRecord["payment_status"],
                            })
                          }
                          style={{ padding: "4px 8px", borderRadius: 6, fontSize: 12 }}
                        >
                          <option value="pending_verification">Pending Verification</option>
                          <option value="verified">✅ Verified</option>
                          <option value="rejected">❌ Rejected</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Ordered Products */}
                  <div style={{ margin: "12px 0", fontSize: 13 }}>
                    <strong>Ordered Items:</strong>
                    <ul style={{ margin: "6px 0", paddingLeft: 18 }}>
                      {(order.items || []).map((it, i) => (
                        <li key={i}>
                          {it.name} ({it.sku}) — Size: {it.size}, Color: {it.color} × {it.quantity} = ৳{it.price * it.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Order Progress Control */}
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Order Progress:</span>
                    {(["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"] as const).map(
                      (st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdateOrder(order.id, { order_status: st })}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 20,
                            border: 0,
                            fontSize: 12,
                            cursor: "pointer",
                            fontWeight: 600,
                            background:
                              order.order_status === st
                                ? st === "Cancelled"
                                  ? "#c0392b"
                                  : "#203746"
                                : "#eef2f0",
                            color: order.order_status === st ? "#fff" : "#203746",
                          }}
                        >
                          {st}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ADVANCE PAYMENT & WHATSAPP SETTINGS */}
      {activeTab === "payments" && (
        <form onSubmit={handleSaveSettings} style={{ background: "#fff", padding: 24, borderRadius: 18, border: "1px solid #e8eeee", maxWidth: 720 }}>
          <h2 style={{ marginTop: 0, fontSize: 22 }}>Advance Payment, Mobile Banking & WhatsApp Settings</h2>
          <p style={{ fontSize: 13, color: "#617780", marginBottom: 20 }}>
            এখানে সেট করা নম্বরগুলো চেকআউট পেজে কাস্টমারদের দেখাবে এবং Cash on Delivery বন্ধ থাকবে।
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div className="form-field">
              <label>bKash Number</label>
              <input
                value={settings.bkashNumber}
                onChange={(e) => setSettings({ ...settings, bkashNumber: e.target.value })}
                placeholder="017XXXXXXXX"
              />
            </div>
            <div className="form-field">
              <label>Nagad Number</label>
              <input
                value={settings.nagadNumber}
                onChange={(e) => setSettings({ ...settings, nagadNumber: e.target.value })}
                placeholder="018XXXXXXXX"
              />
            </div>
            <div className="form-field">
              <label>Rocket Number</label>
              <input
                value={settings.rocketNumber}
                onChange={(e) => setSettings({ ...settings, rocketNumber: e.target.value })}
                placeholder="019XXXXXXXX"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div className="form-field">
              <label>নির্ধারিত Advance Payment (৳)</label>
              <input
                type="number"
                min={0}
                value={settings.advancePaymentAmount}
                onChange={(e) => setSettings({ ...settings, advancePaymentAmount: Number(e.target.value) })}
              />
            </div>
            <div className="form-field">
              <label>ডেলিভারি চার্জ (ঢাকার ভিতরে ৳)</label>
              <input
                type="number"
                min={0}
                value={settings.deliveryFeeInsideDhaka}
                onChange={(e) => setSettings({ ...settings, deliveryFeeInsideDhaka: Number(e.target.value) })}
              />
            </div>
            <div className="form-field">
              <label>ডেলিভারি চার্জ (ঢাকার বাইরে ৳)</label>
              <input
                type="number"
                min={0}
                value={settings.deliveryFeeOutsideDhaka}
                onChange={(e) => setSettings({ ...settings, deliveryFeeOutsideDhaka: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Advance Payment নির্দেশনা (Checkout-এ দেখাবে)</label>
            <textarea
              rows={2}
              value={settings.advancePaymentNote}
              onChange={(e) => setSettings({ ...settings, advancePaymentNote: e.target.value })}
            />
          </div>

          <div className="form-field">
            <label>WhatsApp Support নম্বর (Country Code সহ, যেমন: 8801700000000)</label>
            <input
              value={settings.whatsappNumber}
              onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
              placeholder="8801700000000"
            />
          </div>

          <button type="submit" className="button">
            Save Payment & WhatsApp Settings
          </button>
        </form>
      )}

      {/* TAB 4: WEBSITE EDITOR (Logo / Banner / Font / Name & Tagline / Theme Color / Sections) */}
      {activeTab === "editor" && (
        <form onSubmit={handleSaveSettings} style={{ background: "#fff", padding: 24, borderRadius: 18, border: "1px solid #e8eeee", maxWidth: 840 }}>
          <h2 style={{ marginTop: 0, fontSize: 22 }}>Website Editor & Live Theme Customization</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="form-field">
              <label>Website নাম (Main Title)</label>
              <input
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Sub-Name (Logo Subtitle)</label>
              <input
                value={settings.siteSubName}
                onChange={(e) => setSettings({ ...settings, siteSubName: e.target.value })}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Website Tagline</label>
            <input
              value={settings.tagline}
              onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
            />
          </div>

          {/* Logo & Homepage Banner Upload */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="form-field">
              <label>Logo পরিবর্তন (URL দিন অথবা ছবি আপলোড করুন)</label>
              <input
                placeholder="https://... (খালি রাখলে টেক্সট লোগো দেখাবে)"
                value={settings.logoUrl}
                onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
              />
              <input
                type="file"
                accept="image/*"
                style={{ marginTop: 6 }}
                onChange={(e) => handleImageFileUpload(e.target.files, "logo")}
              />
            </div>

            <div className="form-field">
              <label>Homepage Banner পরিবর্তন (URL বা ফাইল আপলোড)</label>
              <input
                value={settings.heroBannerUrl}
                onChange={(e) => setSettings({ ...settings, heroBannerUrl: e.target.value })}
              />
              <input
                type="file"
                accept="image/*"
                style={{ marginTop: 6 }}
                onChange={(e) => handleImageFileUpload(e.target.files, "banner")}
              />
            </div>
          </div>

          {/* Font & Theme Colors */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 14 }}>
            <div className="form-field">
              <label>Website-এর Font পরিবর্তন</label>
              <select
                value={settings.fontFamily}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    fontFamily: e.target.value as StoreSettings["fontFamily"],
                  })
                }
              >
                <option value="DM Sans + Playfair Display">DM Sans + Playfair Display (Default)</option>
                <option value="Hind Siliguri + Playfair Display">Hind Siliguri + Playfair Display (Bangla Friendly)</option>
                <option value="Inter + Cormorant Garamond">Inter + Cormorant Garamond (Luxury Editorial)</option>
              </select>
            </div>

            <div className="form-field">
              <label>Primary Theme Color</label>
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                style={{ height: 42, padding: 4 }}
              />
            </div>

            <div className="form-field">
              <label>Hero Banner Accent Color</label>
              <input
                type="color"
                value={settings.accentBgColor}
                onChange={(e) => setSettings({ ...settings, accentBgColor: e.target.value })}
                style={{ height: 42, padding: 4 }}
              />
            </div>
          </div>

          {/* Hero Section Texts */}
          <h3 style={{ fontSize: 16, marginTop: 18 }}>Homepage Hero & Sections Control</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="form-field">
              <label>Hero Headline Line 1</label>
              <input
                value={settings.heroTitleLine1}
                onChange={(e) => setSettings({ ...settings, heroTitleLine1: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Hero Headline Italic</label>
              <input
                value={settings.heroTitleItalic}
                onChange={(e) => setSettings({ ...settings, heroTitleItalic: e.target.value })}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Hero Description</label>
            <input
              value={settings.heroDescription}
              onChange={(e) => setSettings({ ...settings, heroDescription: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", gap: 24, margin: "14px 0" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={settings.showTrustBar}
                onChange={(e) => setSettings({ ...settings, showTrustBar: e.target.checked })}
              />
              Trust Features Bar দেখান
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={settings.showStorySection}
                onChange={(e) => setSettings({ ...settings, showStorySection: e.target.checked })}
              />
              Brand Story Section দেখান
            </label>
          </div>

          <button type="submit" className="button">
            Save Website Design & Content
          </button>
        </form>
      )}

      {/* TAB 5: GOOGLE DRIVE OAUTH CONNECTION & DAILY FULL BACKUP */}
      {activeTab === "backup" && (
        <div style={{ background: "#fff", padding: 24, borderRadius: 18, border: "1px solid #e8eeee", maxWidth: 740 }}>
          <h2 style={{ marginTop: 0, fontSize: 22 }}>Google Drive OAuth Connection & Daily Full Backup</h2>
          <p style={{ fontSize: 13, color: "#617780", lineHeight: 1.7 }}>
            আপনার স্টোরের সকল Products, Orders, Customers এবং Website Settings প্রতিদিন স্বয়ংক্রিয়ভাবে (Vercel Cron Job-এর মাধ্যমে) Google Drive-এ JSON ফুল ব্যাকআপ হিসেবে সংরক্ষিত হবে।
          </p>

          <div style={{ background: "#f4f8f7", padding: 18, borderRadius: 14, margin: "18px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <strong>Google Drive Status: </strong>
                {settings.googleDriveConnected ? (
                  <span style={{ color: "#155724", fontWeight: 700 }}>
                    ✅ Connected ({settings.googleDriveEmail || "Authorized Drive Account"})
                  </span>
                ) : (
                  <span style={{ color: "#8a5300", fontWeight: 600 }}>⚠️ Not Connected</span>
                )}
                <div style={{ fontSize: 12, color: "#71848b", marginTop: 4 }}>
                  Last Full Backup:{" "}
                  {settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleString() : "এখনো ব্যাকআপ নেওয়া হয়নি"}
                </div>
              </div>

              <a
                href="/api/auth/google-drive"
                className="button"
                style={{ marginTop: 0 }}
              >
                {settings.googleDriveConnected ? "Reconnect Google Drive" : "Connect Google Drive (OAuth)"}
              </a>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginTop: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={settings.dailyBackupEnabled}
                onChange={(e) => {
                  const next = { ...settings, dailyBackupEnabled: e.target.checked };
                  setSettings(next);
                  localStorage.setItem("ibro_store_settings", JSON.stringify(next));
                }}
              />
              Enable Automated Daily Full Backup (Every 24 Hours)
            </label>

            <button
              type="button"
              disabled={runningBackup}
              onClick={handleTriggerBackup}
              className="button"
              style={{ marginTop: 0, background: "#1b5e20" }}
            >
              {runningBackup ? "ব্যাকআপ তৈরি হচ্ছে..." : "Run Full Backup Now"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
