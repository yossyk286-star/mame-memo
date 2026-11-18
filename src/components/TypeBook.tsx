"use client";

import { useMemo, useState } from "react";
import { roastColor } from "@/components/RecordCard";
import { METHODS, ROASTS } from "@/lib/glossary";
import { tr, trv } from "@/lib/i18n";
import type { Roast, TastingRecord } from "@/lib/types";

const SHOWN = ROASTS.filter((r) => r !== "不明");

/** 好み画面（マイコレクション）の「淹れ方図鑑」。焙煎度ごとに淹れ方をマス目にして、飲んだものが色づく（19） */
export default function TypeBook({ records }: { records: TastingRecord[] }) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of records) if (r.roast && r.method) m.set(`${r.roast}/${r.method}`, (m.get(`${r.roast}/${r.method}`) ?? 0) + 1);
    return m;
  }, [records]);
  // いちばん多く飲んでいる焙煎度から開く
  const first = useMemo(() => {
    const n = new Map<Roast, number>();
    for (const r of records) if (r.roast && r.roast !== "不明") n.set(r.roast, (n.get(r.roast) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "浅煎り";
  }, [records]);
  const [picked, setPicked] = useState<Roast | null>(null);
  const roast = picked ?? first;
  const got = METHODS.filter((m) => counts.has(`${roast}/${m}`)).length;

  return (
    <section className="card type-book" aria-label={tr("淹れ方図鑑")} style={{ "--kind": roastColor(roast) } as React.CSSProperties}>
      <div className="type-book-head">
        <h2>{tr("淹れ方図鑑")}</h2>
        <span className="muted">{tr("{0} / {1}", got, METHODS.length)}</span>
      </div>
      <div className="type-book-kinds" role="group" aria-label={tr("焙煎度")}>
        {SHOWN.map((r) => (
          <button key={r} type="button" className="chip" aria-pressed={r === roast} onClick={() => setPicked(r)}>
            {trv(r)}
          </button>
        ))}
      </div>
      <ul className="type-grid">
        {METHODS.map((m) => {
          const n = counts.get(`${roast}/${m}`) ?? 0;
          return (
            <li key={m} data-got={n > 0 ? "" : undefined}>
              <span aria-label={n > 0 ? tr("{0}：{1}杯", m, n) : undefined}>
                {trv(m)}
                {n > 0 && <small>{n}</small>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
