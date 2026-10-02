import type { Metadata } from "next";
import { Suspense } from "react";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: { default: "ClientFlow", template: "%s · ClientFlow" },
  description: "One workspace for agency projects, client approvals, and invoices.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full antialiased">
        <Suspense fallback={<p className="px-6 py-10 text-sm text-muted">Loading ClientFlow…</p>}>{children}</Suspense>
      </body>
    </html>
  );
}
