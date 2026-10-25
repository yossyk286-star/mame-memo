import type { Metadata, Viewport } from "next";
import ServiceWorker from "@/components/ServiceWorker";
import TabBar from "@/components/TabBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "まめメモ",
  description: "飲んだコーヒーを記録して、だんだん詳しくなるアプリ",
  appleWebApp: { capable: true, title: "まめメモ", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1613" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <div className="app">{children}</div>
        <TabBar />
        <ServiceWorker />
      </body>
    </html>
  );
}
