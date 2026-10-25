"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collectStamps, REGIONS, type Stamp } from "@/lib/countries";
import { listRecords } from "@/lib/db";
import type { TastingRecord } from "@/lib/types";

function StampCell({ name, stamp }: { name: string; stamp?: Stamp }) {
  return (
    <div className={`stamp ${stamp ? "stamp-on" : ""}`} aria-label={stamp ? `${name} ${stamp.count}杯` : `${name} まだ`}>
      <span className="stamp-name">{name}</span>
      {stamp && (
        <span className="stamp-meta">
          {stamp.count}杯・最高★{stamp.best}
        </span>
      )}
    </div>
  );
}

/** 飲んだ産地がスタンプのように埋まっていく。まだの国は次に試すヒントになる */
export default function StampsPage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(null);

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
        {total}カ国中 <strong>{stamps.size}カ国</strong> 制覇。色のない国は、まだ飲んだことのない産地です。
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
                  <StampCell key={c.name} name={c.name} stamp={stamps.get(c.name)} />
                ))}
              </div>
            </section>
          );
        })}
        {others.size > 0 && (
          <section className="card" style={{ gap: 12 }}>
            <h2 style={{ fontSize: 15 }}>そのほかの産地</h2>
            <div className="stamp-grid">
              {[...others].map(([name, s]) => (
                <StampCell key={name} name={name} stamp={s} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
