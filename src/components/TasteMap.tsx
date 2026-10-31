"use client";

import { useState } from "react";
import RecordCard, { roastColor } from "./RecordCard";
import { ROAST_FILTERS } from "@/lib/beanSort";
import type { Roast, TastingRecord } from "@/lib/types";
import { tr, trv } from "@/lib/i18n";

const LEVELS = [1, 2, 3, 4, 5] as const;

const ACID_WORDS = ["酸味穏やか", "やや酸味控えめ", "中くらいの酸味", "やや酸味強め", "酸味しっかり"];
const BITTER_WORDS = ["苦味弱め", "やや苦味控えめ", "中くらいの苦味", "やや苦め", "しっかり苦い"];

function average(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** 平均の評価を ★1〜5 の5段階にして、高いマスほど濃く塗る（色は globals.css の .taste-map-cell[data-step]） */
function step(avg: number) {
  return Math.min(5, Math.max(1, Math.round(avg)));
}

/**
 * 酸味（横）と苦味（縦）で記録を並べた味の地図。
 * マスの数字は杯数、色の濃さは総合の平均。マスを押すとそのお酒を出す。
 * 2種類以上あれば、焙煎度で絞り込める
 */
export default function TasteMap({ records }: { records: TastingRecord[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [roast, setRoast] = useState<Roast | null>(null);
  const all = records.filter((r) => r.acidity && r.bitterness);
  const roasts = ROAST_FILTERS.filter((x) => all.some((r) => r.roast === x));
  const placed = roast ? all.filter((r) => r.roast === roast) : all;
  if (all.length === 0) {
    return (
      <section className="card">
        <h2 style={{ fontSize: 14 }}>{tr("味マップ")}</h2>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          {tr("記録で「酸味」と「苦味」を付けると、どんな味の豆が好きかを地図で見られます。")}
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
      <h2 style={{ fontSize: 14 }}>{tr("味マップ")}</h2>
      {roasts.length > 1 && (
        <div className="scroll-row" role="group" aria-label={tr("味マップを焙煎度で絞り込み")}>
          <button
            type="button"
            className="chip"
            aria-pressed={roast === null}
            onClick={() => {
              setRoast(null);
              setSelected(null);
            }}
          >
            {tr("すべて")}
          </button>
          {roasts.map((x) => (
            <button
              key={x}
              type="button"
              className="chip kind-chip"
              style={{ "--kc": roastColor(x) } as React.CSSProperties}
              aria-pressed={roast === x}
              onClick={() => {
                setRoast(roast === x ? null : x);
                setSelected(null);
              }}
            >
              {trv(x)}
            </button>
          ))}
        </div>
      )}
      {center && (
        <p style={{ margin: 0, fontSize: 14 }}>
          {roast ? tr("{0}で", roast) : ""}{tr("高く評価した豆は")}<strong>{tr("{0}・{1}", ACID_WORDS[center.acid], BITTER_WORDS[center.bitter])}</strong>{tr("のあたりに集まっています。")}
        </p>
      )}
      <div className="taste-map">
        <div className="taste-map-y" aria-hidden="true">
          <span>{tr("苦い")}</span>
          <span>{tr("苦味")}</span>
          <span>{tr("弱い")}</span>
        </div>
        <div className="taste-map-grid" role="group" aria-label={tr("酸味と苦味の地図")}>
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
                  aria-label={tr("酸味{0}・苦味{1}：{2}杯{3}", acid, bitter, rs.length, rs.length ? tr("、平均★{0}", avg.toFixed(1)) : "")}
                  data-step={rs.length ? step(avg) : undefined}
                  onClick={() => setSelected(selected === key ? null : key)}
                >
                  {rs.length || ""}
                </button>
              );
            }),
          )}
        </div>
        <div className="taste-map-x" aria-hidden="true">
          <span>{tr("穏やか")}</span>
          <span>{tr("酸味")}</span>
          <span>{tr("強い")}</span>
        </div>
      </div>
      <div className="taste-map-scale" aria-hidden="true">
        <span>{tr("総合の平均")}</span>
        <span>★1</span>
        {LEVELS.map((n) => (
          <i key={n} className="taste-map-cell" data-step={n} />
        ))}
        <span>★5</span>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        {tr("数字は杯数です。マスを押すとその豆が出ます。")}
      </p>
      {picked.map((r) => (
        <RecordCard key={r.id} record={r} />
      ))}
    </section>
  );
}
