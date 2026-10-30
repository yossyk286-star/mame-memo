"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Hint from "@/components/Hint";
import MenuScan from "@/components/MenuScan";
import ScanTabs from "@/components/ScanTabs";
import ShopBar from "@/components/ShopBar";
import { loadTodayMenu, resetShop } from "@/lib/foodPairing";
import { LAST_SCAN_EVENT, loadLastScan } from "@/lib/lastScan";
import type { ScannedBean } from "@/lib/menuScan";
import { tr } from "@/lib/i18n";

/** お店でメニューを撮って、注文を決めるために確認するだけの画面。記録はあとからでもできる */
export default function ScanPage() {
  const router = useRouter();
  const [beans, setBeans] = useState<ScannedBean[] | null>(null);
  // 今日のお店のメニューの数（調べるたびに増えるので、一覧が変わった合図で数え直す）
  const [counts, setCounts] = useState({ beans: 0, dishes: 0 });
  // 「新しいお店」で一覧を作り直すための番号
  const [shop, setShop] = useState(0);

  useEffect(() => {
    setBeans(loadLastScan()?.beans ?? []);
    const count = () => setCounts({ beans: loadLastScan()?.beans.length ?? 0, dishes: loadTodayMenu().length });
    count();
    window.addEventListener(LAST_SCAN_EVENT, count);
    return () => window.removeEventListener(LAST_SCAN_EVENT, count);
  }, []);

  return (
    <>
      <header className="page-header">
        <h1>{tr("メニューを見る")}</h1>
        <Link href="/show" className="header-pill">
          {tr("店員さんに見せる")}
        </Link>
      </header>

      <ScanTabs current="drink" />
      <ShopBar
        drinks={counts.beans}
        dishes={counts.dishes}
        onReset={() => {
          resetShop();
          setBeans([]);
          setShop((n) => n + 1);
        }}
      />

      <Hint id="scan-page" className="lead scan-hint">
        {tr("撮った結果は今日のあいだ残るので、あとから「記録する」でも同じ豆から選べます。 次に試したい豆は「☆」で")}<Link href="/wishlist">{tr("気になる豆")}</Link>{tr("に残せます。")}
      </Hint>

      {beans && (
        <MenuScan
          key={shop}
          initialBeans={beans}
          onPick={(b) => router.push(`/new?bean=${encodeURIComponent(b.name)}`)}
        />
      )}
    </>
  );
}
