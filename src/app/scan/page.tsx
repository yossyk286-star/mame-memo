"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
      <header className="sub-header">
        <Link href="/" className="back">
          ‹ 戻る
        </Link>
        <h1>メニューを見る</h1>
      </header>

      <p className="lead">
        撮った結果は今日のあいだ残るので、あとから「記録する」でも同じ豆から選べます。
      </p>

      {beans && (
        <MenuScan
          initialBeans={beans}
          onPick={(b) => router.push(`/new?bean=${encodeURIComponent(b.name)}`)}
        />
      )}
    </>
  );
}
