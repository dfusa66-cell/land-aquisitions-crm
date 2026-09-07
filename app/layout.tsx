import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sell Your Land to Diego",
  description: "Vacant-land flipping CRM for Diego Ferro — pipeline, underwriting, and profit tracking."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
