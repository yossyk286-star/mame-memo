"use client";

import BackLink from "@/components/BackLink";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import RecordCard, { beanTitle, Stars, stars } from "@/components/RecordCard";
import { listRecords } from "@/lib/db";
import type { TastingRecord } from "@/lib/types";
import { tr, trJoin, trv } from "@/lib/i18n";

const same = (a: string, b: string) => a.trim().normalize("NFKC").toLowerCase() === b.trim().normalize("NFKC").toLowerCase();

/** 農園のページ（34）。その農園の豆の記録と平均、同じ農園の豆を調べる入口 */
function FarmBody() {
  const name = useSearchParams().get("name") ?? "";
  const [records, setRecords] = useState<TastingRecord[] | null>(null);
  useEffect(() => {
    listRecords().then(setRecords);
  }, []);
  const mine = useMemo(() => (records ?? []).filter((r) => r.farm && same(r.farm, name)), [records, name]);
  const best = mine.reduce<TastingRecord | null>((b, r) => (!b || r.overall > b.overall ? r : b), null);
  const avg = mine.length ? Math.round((mine.reduce((s, r) => s + r.overall, 0) / mine.length) * 10) / 10 : 0;
  // 同じ農園の豆を飲んだお店の数
  const kinds = new Set(mine.map((r) => r.shop.trim()).filter(Boolean)).size;
  const where = [...new Set(mine.map((r) => r.origin).filter(Boolean))];

  return (
    <>
      <header className="sub-header">
        <BackLink fallback="/" />
        <h1>{trv(name)}</h1>
      </header>
      <main className="content" style={{ paddingTop: 16 }}>
        {records && mine.length === 0 && <p className="empty">{tr("この農園の記録はありません。")}</p>}
        {best && (
          <>
            <section className="highlight">
              <p className="highlight-label">{tr("この農園でいちばんおいしかった豆")}</p>
              <p className="highlight-main">{beanTitle(best)}</p>
              <Stars n={best.overall} />
            </section>
            <p className="muted" style={{ margin: 0, padding: "0 4px" }}>
              {trJoin([tr("{0}店・{1}杯", kinds, mine.length), tr("平均{0}", stars(avg)), ...where])}
            </p>
            <Link href={`/scan?q=${encodeURIComponent(name)}`} className="btn-secondary">
              {tr("この農園のほかの豆を調べる")}
            </Link>
            <div className="list-group">
              {mine.map((r) => (
                <RecordCard key={r.id} record={r} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}

export default function FarmPage() {
  return (
    <Suspense>
      <FarmBody />
    </Suspense>
  );
}
