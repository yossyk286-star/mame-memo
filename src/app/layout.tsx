import type { Metadata, Viewport } from "next";
import TabBar from "@/components/TabBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "まめメモ",
  description: "飲んだコーヒーを記録して、だんだん詳しくなるアプリ",
  appleWebApp: { capable: true, title: "まめメモ", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f6f3ef",
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
      </body>
    </html>
  );
}
