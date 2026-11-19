# IBRO Fashion House — Complete E-Commerce & Admin System

এই প্রজেক্টে আপনার আগের ওয়েবসাইটের হুবহু ডিজাইন ও থিম বজায় রেখে নিচের সকল ফিচার সম্পূর্ণভাবে যুক্ত করা হয়েছে:

## অন্তর্ভুক্ত সকল ফিচারসমূহ
1. **আগের Website Design ও Theme অক্ষুণ্ণ:** মূল মিনিমাল ফ্যাশন লেআউট, কালার প্যালেট, প্রোডাক্ট গ্রিড ও রেসপন্সিভ ডিজাইন হুবহু রাখা হয়েছে।
2. **Admin Login & Security (`/admin`):**
   - শুধুমাত্র অনুমোদিত Admin ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করতে পারবেন। সাধারণ কাস্টমাররা Admin Panel খুলতে পারবেন না।
3. **Product Management:**
   - নতুন প্রোডাক্ট যোগ করা।
   - মোবাইল বা কম্পিউটার থেকে সরাসরি একাধিক ছবি আপলোড।
   - Product ID / SKU, নাম, দাম, আগের দাম (Compare Price), বিবরণ এডিট করা।
   - Size, Color এবং Stock নিয়ন্ত্রণ।
   - প্রোডাক্ট Delete বা স্টোর থেকে সাময়িকভাবে Hide/Show করা।
4. **Order Management:**
   - নতুন অর্ডার দেখা, কাস্টমারের নাম, ফোন ও পূর্ণ ঠিকানা দেখা।
   - অর্ডারের অগ্রগতি নিয়ন্ত্রণ (`Pending`, `Confirmed`, `Processing`, `Shipped`, `Delivered`, `Cancelled`)।
5. **Advance Payment System (No Cash on Delivery):**
   - Cash on Delivery বন্ধ রাখা হয়েছে।
   - Admin Panel থেকে **bKash, Nagad ও Rocket** নম্বর এবং নির্ধারিত অগ্রিম টাকার পরিমাণ সেট করা যাবে।
   - কাস্টমার চেকআউটের সময় পেমেন্ট পাঠিয়ে Sender Number ও **Transaction ID** জমা দেবেন এবং Admin তা যাচাই (`Verified` / `Rejected`) করবেন।
6. **Website Editor:**
   - Logo, Homepage Banner, Website Font, নাম ও Tagline, Theme Color, WhatsApp Support নম্বর এবং Homepage-এর বিভিন্ন Section নিয়ন্ত্রণ।
7. **Google Drive OAuth Connection & Daily Full Backup:**
   - Google Drive OAuth কানেক্ট করে প্রতিদিন স্বয়ংক্রিয়ভাবে (Vercel Cron Job) স্টোরের ফুল ব্যাকআপ রাখার ব্যবস্থা।

---

## লোকাল কম্পিউটারে চালানোর নিয়ম
```bash
npm install
npm run dev
```
ব্রাউজারে `http://localhost:3000` (স্টোর) এবং `http://localhost:3000/admin` (অ্যাডমিন প্যানেল) ওপেন করুন।

## Supabase ও Vercel Setup
1. `.env.example` ফাইলটি কপি করে `.env.local` তৈরি করুন এবং আপনার Supabase, Admin Login ও Google OAuth তথ্য বসান।
2. Supabase Dashboard → **SQL Editor**-এ গিয়ে `supabase/schema.sql` ফাইলটির পুরো কোড রান করুন।
3. GitHub-এ পুশ করে Vercel-এ Deploy করুন এবং Vercel Environment Variables-এ `.env` ভ্যালুগুলো যুক্ত করুন।
