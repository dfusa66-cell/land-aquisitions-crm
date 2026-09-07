import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "Sell Your Land to Diego",
  description: "Vacant-land flipping CRM for Diego Ferro — pipeline, underwriting, and profit tracking."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={sans.className}>{children}</body>
    </html>
  );
}
