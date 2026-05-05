import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fuar & Çalışan Yönetimi",
  description: "Fuar alanındaki çalışanların satış ve görev takiplerini sağlayan PWA.",
};

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${outfit.variable} ${outfit.className} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50 selection:bg-indigo-500/30">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
