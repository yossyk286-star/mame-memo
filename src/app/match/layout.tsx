import type { Metadata } from "next";

// 好みのリンクを LINE などで受け取ったときに出る一言
export const metadata: Metadata = {
  title: "まめメモ｜好みくらべ",
  description: "送ってくれた人の好みと、あなたの好みの相性を見てみよう",
  openGraph: { title: "まめメモ｜好みくらべ", description: "送ってくれた人の好みと、あなたの好みの相性を見てみよう" },
};

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
