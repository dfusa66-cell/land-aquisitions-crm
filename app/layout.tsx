import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Land Acquisition CRM",
  description: "Private CRM for landowner SMS lead analysis and prioritization."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
