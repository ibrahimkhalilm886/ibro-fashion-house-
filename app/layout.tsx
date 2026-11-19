import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IBRO Fashion House",
  description: "Modern fashion for everyday confidence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
