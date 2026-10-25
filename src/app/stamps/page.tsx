"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { stars } from "@/components/RecordCard";
import { collectStamps, REGIONS, type Stamp } from "@/lib/countries";
import { listRecords } from "@/lib/db";
import type { TastingRecord } from "@/lib/types";

function StampCell({
  name,
  stamp,
  open,
  onToggle,
}: {
  name: string;
  stamp?: Stamp;
  open: boolean;
  onToggle: () => void;
}) {
  if (!stamp) {
    return (
      <div className="stamp" aria-label={`${name} まだ`}>
        <span className="stamp-name">{name}</span>
      </div>
    );
  }
  // 飲んだ国はタップで、その国のどの地域・農園の豆を飲んだかを開く
  return (
    <button type="button" className="stamp stamp-on" aria-expanded={open} onClick={onToggle}>
      <span className="stamp-name">{name}</span>
      <span className="stamp-meta">
        {stamp.count}杯・最高★{stamp.best}
      </span>
    </button>
  );
}

/** その国で飲んだ豆（地域・農園ごと）。評価の高い順 */
function StampDetail({ name, stamp }: { name: string; stamp: Stamp }) {
  const rows = [...stamp.records].sort((a, b) => b.overall - a.overall || b.date.localeCompare(a.date));
  return (
    <div className="stamp-detail">
      <h3>{name}で飲んだ豆</h3>
      {rows.map((r) => (
        <Link key={r.id} href={`/record?id=${r.id}`} className="stamp-row">
          <span className="stamp-row-name">{r.farm || r.origin}</span>
          <span className="stars">{stars(r.overall)}</span>
          <span className="muted stamp-row-sub">
            {r.shop}・{r.date.slice(5).replace("-", "/")}
            {r.roast && r.roast !== "不明" ? `・${r.roast}` : ""}
            {r.process && r.process !== "不明" ? `・${r.process}` : ""}
          </span>
        </Link>
      ))}
    </div>
  );
}

/** 飲んだ産地がスタンプのように埋まっていく。まだの国は次に試すヒントになる */
export default function StampsPage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const toggle = (name: string) => setOpened((o) => (o === name ? null : name));

  useEffect(() => {
    listRecords().then(setRecords);
  }, []);

  const { stamps, others, total } = useMemo(() => collectStamps(records ?? []), [records]);

  return (
    <>
      <header className="sub-header">
        <Link href="/taste" className="back">
          ‹ 戻る
        </Link>
        <h1>産地スタンプ帳</h1>
      </header>

      <p className="lead">
        {total}カ国中 <strong>{stamps.size}カ国</strong> 制覇。色の付いた国を押すと、飲んだ地域や農園が見られます。
      </p>

      <main className="content">
        {REGIONS.map((r) => {
          const done = r.countries.filter((c) => stamps.has(c.name)).length;
          return (
            <section key={r.region} className="card" style={{ gap: 12 }}>
              <div className="card-top">
                <h2 style={{ fontSize: 15 }}>{r.region}</h2>
                <span className="muted">
                  {done} / {r.countries.length}
                </span>
              </div>
              <div className="stamp-grid">
                {r.countries.map((c) => (
                  <StampCell
                    key={c.name}
                    name={c.name}
                    stamp={stamps.get(c.name)}
                    open={opened === c.name}
                    onToggle={() => toggle(c.name)}
                  />
                ))}
              </div>
              {opened && r.countries.some((c) => c.name === opened) && stamps.get(opened) && (
                <StampDetail name={opened} stamp={stamps.get(opened)!} />
              )}
            </section>
          );
        })}
        {others.size > 0 && (
          <section className="card" style={{ gap: 12 }}>
            <h2 style={{ fontSize: 15 }}>そのほかの産地</h2>
            <div className="stamp-grid">
              {[...others].map(([name, s]) => (
                <StampCell key={name} name={name} stamp={s} open={opened === name} onToggle={() => toggle(name)} />
              ))}
            </div>
            {opened && others.get(opened) && <StampDetail name={opened} stamp={others.get(opened)!} />}
          </section>
        )}
      </main>
    </>
  );
}
