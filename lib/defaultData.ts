export interface ProductItem {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  gender: string;
  price: number;
  compare_at_price?: number;
  image_urls: string[];
  sizes: string[];
  colors: string[];
  stock: number;
  active: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
}

export interface OrderRecord {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  delivery_address: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  advance_amount: number;
  total: number;
  payment_method: "bKash" | "Nagad" | "Rocket";
  sender_number: string;
  transaction_id: string;
  payment_status: "pending_verification" | "verified" | "rejected";
  order_status: "Pending" | "Confirmed" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  created_at: string;
}

export interface StoreSettings {
  siteName: string;
  siteSubName: string;
  tagline: string;
  heroBadge: string;
  heroTitleLine1: string;
  heroTitleItalic: string;
  heroDescription: string;
  heroBannerUrl: string;
  logoUrl: string;
  fontFamily: "DM Sans + Playfair Display" | "Hind Siliguri + Playfair Display" | "Inter + Cormorant Garamond";
  primaryColor: string;
  accentBgColor: string;
  pageBgColor: string;
  whatsappNumber: string;
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  advancePaymentAmount: number;
  advancePaymentNote: string;
  deliveryFeeInsideDhaka: number;
  deliveryFeeOutsideDhaka: number;
  showTrustBar: boolean;
  showStorySection: boolean;
  storyBadge: string;
  storyTitleLine1: string;
  storyTitleItalic: string;
  storyDescription: string;
  footerTagline: string;
  googleDriveConnected: boolean;
  googleDriveEmail: string;
  googleDriveFolderId: string;
  dailyBackupEnabled: boolean;
  lastBackupAt: string | null;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  siteName: "IBRO",
  siteSubName: "FASHION HOUSE",
  tagline: "Modern fashion for everyday confidence.",
  heroBadge: "THE NEW SEASON EDIT",
  heroTitleLine1: "Style that feels",
  heroTitleItalic: "like you.",
  heroDescription: "Thoughtful essentials. Modern silhouettes. Confidence in every detail.",
  heroBannerUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1000",
  logoUrl: "",
  fontFamily: "DM Sans + Playfair Display",
  primaryColor: "#203746",
  accentBgColor: "#dcebf0",
  pageBgColor: "#fbfcfa",
  whatsappNumber: "8801700000000",
  bkashNumber: "01700000000",
  nagadNumber: "01800000000",
  rocketNumber: "01900000000",
  advancePaymentAmount: 150,
  advancePaymentNote: "Cash on Delivery চালু নেই। অর্ডার কনফার্ম করতে নির্ধারিত অগ্রিম পেমেন্ট (Advance Payment) পাঠিয়ে Transaction ID জমা দিন।",
  deliveryFeeInsideDhaka: 70,
  deliveryFeeOutsideDhaka: 130,
  showTrustBar: true,
  showStorySection: true,
  storyBadge: "THE IBRO WAY",
  storyTitleLine1: "Less noise.",
  storyTitleItalic: "More meaning.",
  storyDescription: "Considered design, comfortable fits and pieces you will reach for again and again.",
  footerTagline: "Wear your confidence. Everyday, your way.",
  googleDriveConnected: false,
  googleDriveEmail: "",
  googleDriveFolderId: "",
  dailyBackupEnabled: true,
  lastBackupAt: null,
};

export const DEFAULT_PRODUCTS: ProductItem[] = [
  {
    id: "prod-1",
    sku: "IBRO-SH-001",
    name: "Linen Everyday Shirt",
    slug: "linen-everyday-shirt",
    description: "Breathable pure cotton-linen blend shirt tailored for all-day comfort.",
    category: "Shirts",
    gender: "Men",
    price: 1890,
    compare_at_price: 2200,
    image_urls: ["https://images.unsplash.com/photo-1603252109303-2751441dd157?w=700"],
    sizes: ["M", "L", "XL"],
    colors: ["White", "Sky Blue"],
    stock: 25,
    active: true,
  },
  {
    id: "prod-2",
    sku: "IBRO-TS-002",
    name: "Cotton Essential Tee",
    slug: "cotton-essential-tee",
    description: "180 GSM combed organic cotton t-shirt with relaxed modern fit.",
    category: "T-Shirts",
    gender: "Men",
    price: 990,
    compare_at_price: 1250,
    image_urls: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=700"],
    sizes: ["M", "L", "XL", "XXL"],
    colors: ["White", "Black", "Navy"],
    stock: 40,
    active: true,
  },
  {
    id: "prod-3",
    sku: "IBRO-KN-003",
    name: "Soft Knit Cardigan",
    slug: "soft-knit-cardigan",
    description: "Lightweight textured knit cardigan with minimal button closure.",
    category: "Knitwear",
    gender: "Women",
    price: 2450,
    image_urls: ["https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=700"],
    sizes: ["S", "M", "L"],
    colors: ["Cream", "Sage"],
    stock: 15,
    active: true,
  },
  {
    id: "prod-4",
    sku: "IBRO-CO-004",
    name: "Modern Daily Look",
    slug: "modern-daily-look",
    description: "Effortless everyday ensemble crafted with soft woven fabric.",
    category: "Collection",
    gender: "Women",
    price: 1690,
    image_urls: ["https://images.unsplash.com/photo-1483985988355-763728e1935b?w=700"],
    sizes: ["S", "M", "L"],
    colors: ["Beige", "Olive"],
    stock: 18,
    active: true,
  },
  {
    id: "prod-5",
    sku: "IBRO-SH-005",
    name: "Classic Overshirt",
    slug: "classic-overshirt",
    description: "Structured twill overshirt suitable for layering in any season.",
    category: "Shirts",
    gender: "Men",
    price: 2190,
    image_urls: ["https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=700"],
    sizes: ["M", "L", "XL"],
    colors: ["Charcoal", "Sand"],
    stock: 20,
    active: true,
  },
  {
    id: "prod-6",
    sku: "IBRO-TR-006",
    name: "Relaxed Trousers",
    slug: "relaxed-trousers",
    description: "Tailored straight-fit trousers with comfortable elastic waist detail.",
    category: "Trousers",
    gender: "Men",
    price: 1990,
    image_urls: ["https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=700"],
    sizes: ["30", "32", "34", "36"],
    colors: ["Khaki", "Black"],
    stock: 22,
    active: true,
  },
];
