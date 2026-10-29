"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Hint from "@/components/Hint";
import MenuScan from "@/components/MenuScan";
import { loadLastScan } from "@/lib/lastScan";
import type { ScannedBean } from "@/lib/menuScan";

/** お店でメニューを撮って、注文を決めるために確認するだけの画面。記録はあとからでもできる */
export default function ScanPage() {
  const router = useRouter();
  const [beans, setBeans] = useState<ScannedBean[] | null>(null);

  useEffect(() => {
    setBeans(loadLastScan()?.beans ?? []);
  }, []);

  return (
    <>
      <header className="page-header">
        <h1>メニューを見る</h1>
        <Link href="/show" className="header-pill">
          店員さんに見せる
        </Link>
      </header>

      <Hint id="scan-page" className="lead">
        撮った結果は今日のあいだ残るので、あとから「記録する」でも同じ豆から選べます。
        次に試したい豆は「☆」で<Link href="/wishlist">気になる豆</Link>に残せます。
      </Hint>

      {beans && (
        <MenuScan
          initialBeans={beans}
          onPick={(b) => router.push(`/new?bean=${encodeURIComponent(b.name)}`)}
          extra={
            <Link href="/pair" className="pair-entry">
              <span className="pair-link-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-1.7 1-3 3.2-3 6v4h3v8" />
                </svg>
              </span>
              <span className="pair-link-body">
                <strong>料理から選ぶ</strong>
                <span>食べるものに合うコーヒー</span>
              </span>
              <span className="pair-chevron" aria-hidden="true">
                ›
              </span>
            </Link>
          }
        />
      )}
    </>
  );
}
