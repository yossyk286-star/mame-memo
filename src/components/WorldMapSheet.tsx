"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { beanTitle, stars } from "@/components/RecordCard";
import WorldMap from "@/components/WorldMap";
import { REGIONS, type Stamp } from "@/lib/countries";
import { tr, trv } from "@/lib/i18n";

const COUNTRIES = REGIONS.flatMap((r) => r.countries.map((c) => c.name));

/** 産地スタンプ帳の右下の地図ボタンから開く。飲んだ国だけ色が付いた世界地図 */
export default function WorldMapSheet({ stamps, onClose }: { stamps: Map<string, Stamp>; onClose: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const done = COUNTRIES.filter((n) => stamps.has(n)).length;
  const stamp = picked ? stamps.get(picked) : undefined;
  const best = stamp && [...stamp.records].sort((a, b) => b.overall - a.overall || b.date.localeCompare(a.date))[0];

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        className="sheet jmap-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jmap-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <h2 id="jmap-title">
            {tr("世界地図")}{" "}
            <span className="jmap-count">
              {trv(done)} / {trv(COUNTRIES.length)}
            </span>
          </h2>
          <button className="icon-btn" aria-label={tr("閉じる")} onClick={onClose} autoFocus>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <WorldMap
          places={COUNTRIES}
          visited={(n) => stamps.has(n)}
          areas={["中米", "南米", "アフリカ", "アジア"]}
          picked={picked}
          onPick={(n) => setPicked((x) => (x === n ? null : n))}
        />

        <div className="jmap-info" aria-live="polite">
          {!picked ? (
            <span className="muted">{tr("国や点を押すと、そこの豆が見られます")}</span>
          ) : !stamp || !best ? (
            <span>
              <strong>{trv(picked)}</strong>
              <span className="muted">{"　"}{tr("まだ。次に試してみる？")}</span>
            </span>
          ) : (
            <Link href={`/record?id=${best.id}`} className="jmap-best">
              <span>
                <strong>{trv(picked)}</strong>
                <span className="muted">
                  　{"　"}{tr("{0}杯・最高{1}", stamp.count, stars(stamp.best))}
                </span>
              </span>
              <span className="jmap-best-name">{tr("いちばん：{0} ›", beanTitle(best))}</span>
            </Link>
          )}
        </div>

        <p className="jmap-credit">{tr("地図：Natural Earth")}</p>
      </section>
    </div>
  );
}
