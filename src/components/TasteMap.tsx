"use client";

import { useState } from "react";
import RecordCard from "./RecordCard";
import type { TastingRecord } from "@/lib/types";

const LEVELS = [1, 2, 3, 4, 5] as const;

const ACID_WORDS = ["酸味穏やか", "やや酸味控えめ", "中くらいの酸味", "やや酸味強め", "酸味しっかり"];
const BITTER_WORDS = ["苦味弱め", "やや苦味控えめ", "中くらいの苦味", "やや苦め", "しっかり苦い"];

function average(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** 平均の評価が高いマスほど濃く塗る */
function cellColor(avg: number) {
  const pct = Math.round(15 + ((avg - 1) / 4) * 85);
  return `color-mix(in srgb, var(--accent) ${pct}%, transparent)`;
}

/**
 * 酸味（横）と苦味（縦）で記録を並べた味の地図。
 * マスの数字は杯数、色の濃さは総合の平均。マスを押すとそのお酒を出す
 */
export default function TasteMap({ records }: { records: TastingRecord[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const placed = records.filter((r) => r.acidity && r.bitterness);
  if (placed.length === 0) {
    return (
      <section className="card">
        <h2 style={{ fontSize: 14 }}>味マップ</h2>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          記録で「酸味」と「苦味」を付けると、どんな味の豆が好きかを地図で見られます。
        </p>
      </section>
    );
  }

  const cells = new Map<string, TastingRecord[]>();
  for (const r of placed) {
    const key = `${r.acidity}-${r.bitterness}`;
    cells.set(key, [...(cells.get(key) ?? []), r]);
  }

  // 高く評価した豆が集まっている場所をことばにする
  const liked = placed.filter((r) => r.overall >= 4);
  const center = liked.length >= 2 && {
    acid: Math.round(average(liked.map((r) => r.acidity!))) - 1,
    bitter: Math.round(average(liked.map((r) => r.bitterness!))) - 1,
  };
  const picked = selected ? (cells.get(selected) ?? []) : [];

  return (
    <section className="card" style={{ gap: 10 }}>
      <h2 style={{ fontSize: 14 }}>味マップ</h2>
      {center && (
        <p style={{ margin: 0, fontSize: 14 }}>
          高く評価した豆は<strong>{ACID_WORDS[center.acid]}・{BITTER_WORDS[center.bitter]}</strong>のあたりに集まっています。
        </p>
      )}
      <div className="taste-map">
        <div className="taste-map-y" aria-hidden="true">
          <span>苦い</span>
          <span>苦味</span>
          <span>弱い</span>
        </div>
        <div className="taste-map-grid" role="group" aria-label="酸味と苦味の地図">
          {[...LEVELS].reverse().flatMap((bitter) =>
            LEVELS.map((acid) => {
              const key = `${acid}-${bitter}`;
              const rs = cells.get(key) ?? [];
              const avg = rs.length ? average(rs.map((r) => r.overall)) : 0;
              return (
                <button
                  key={key}
                  type="button"
                  className="taste-map-cell"
                  disabled={rs.length === 0}
                  aria-pressed={selected === key}
                  aria-label={`酸味${acid}・苦味${bitter}：${rs.length}杯${rs.length ? `、平均★${avg.toFixed(1)}` : ""}`}
                  style={rs.length ? { background: cellColor(avg), color: avg >= 3 ? "var(--on-accent)" : undefined } : undefined}
                  onClick={() => setSelected(selected === key ? null : key)}
                >
                  {rs.length || ""}
                </button>
              );
            }),
          )}
        </div>
        <div className="taste-map-x" aria-hidden="true">
          <span>穏やか</span>
          <span>酸味</span>
          <span>強い</span>
        </div>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        数字は杯数、色が濃いほど総合の評価が高めです。マスを押すとその豆が出ます。
      </p>
      {picked.map((r) => (
        <RecordCard key={r.id} record={r} />
      ))}
    </section>
  );
}
