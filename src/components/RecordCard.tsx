"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { photosOf, usePhotoURLs } from "@/lib/photo";
import type { Roast, TastingRecord } from "@/lib/types";
import { getLang, tr } from "@/lib/i18n";

/** 文の中で使う総合評価。「★4」「★3.5」のように数字で出す */
export function stars(n: number) {
  return `★${n}`;
}

/** 総合評価の★5つ。0.5 なら半分だけ塗る。空きも同じ★を薄く出す */
export function Stars({ n, color, className = "", label }: { n: number; color?: string; className?: string; label?: string }) {
  return (
    <span
      className={`stars ${className}`.trim()}
      role="img"
      aria-label={label ?? tr("5段階中{0}", n)}
      style={color ? ({ "--star": color } as CSSProperties) : undefined}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="star" style={{ "--f": `${Math.max(0, Math.min(1, n - i + 1)) * 100}%` } as CSSProperties}>
          ★
        </span>
      ))}
    </span>
  );
}

/** 一覧や詳細の見出し。「エチオピア イルガチェフェ グティティ」のように産地と農園・品種をつなげる */
export function beanTitle(r: Pick<TastingRecord, "origin" | "farm">) {
  return [r.origin && tr(r.origin), r.farm].filter(Boolean).join(" ") || tr("（豆の名前なし）");
}

export function yen(n: number) {
  if (getLang() === "en") return `¥${Math.round(n).toLocaleString("en-US")}`;
  return `${Math.round(n).toLocaleString("ja-JP")}円`;
}

/** 焙煎度ごとの色（globals.css の --k-… ）と、写真がないときに出す1文字 */
const ROAST_LOOK: Record<Roast, { color: string; mark: string; en: string }> = {
  浅煎り: { color: "var(--k-light)", mark: "浅", en: "L" },
  中煎り: { color: "var(--k-medium)", mark: "中", en: "M" },
  深煎り: { color: "var(--k-dark)", mark: "深", en: "D" },
  不明: { color: "var(--k-unknown)", mark: "豆", en: "?" },
};

export function roastColor(roast: Roast | null) {
  return ROAST_LOOK[roast ?? "不明"].color;
}

/** 「2026-10-25」→「10/25」。今年以外は年も出す */
export function shortDate(date: string) {
  const [y, m, d] = date.split("-");
  const md = `${Number(m)}/${Number(d)}`;
  return Number(y) === new Date().getFullYear() ? md : `${y}/${md}`;
}

/** 写真があれば小さく、なければ焙煎度の色の四角に1文字 */
function Thumb({ record: r }: { record: TastingRecord }) {
  const [url] = usePhotoURLs(photosOf(r).slice(0, 1));
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="thumb" style={{ borderColor: roastColor(r.roast) }} />;
  }
  return (
    <span className="thumb thumb-mark" style={{ "--kc": roastColor(r.roast) } as React.CSSProperties} aria-hidden="true">
      {ROAST_LOOK[r.roast ?? "不明"][getLang() === "en" ? "en" : "mark"]}
    </span>
  );
}

/** 記録の一覧の1行。2行に詰めて、画面にたくさん並ぶようにする。showDate=false は日付で区切った一覧用 */
export default function RecordCard({ record: r, showDate = true }: { record: TastingRecord; showDate?: boolean }) {
  const sub = [
    ...[r.roast, r.process, r.method].filter((t) => t && t !== "不明").map((t) => tr(t!)),
    r.shop && tr(r.shop),
    r.price && yen(r.price),
    showDate && shortDate(r.date),
  ].filter(Boolean);
  return (
    <Link href={`/record?id=${r.id}`} className="card record-row">
      <Thumb record={r} />
      <div className="record-row-body">
        <div className="record-row-top">
          <h2>{beanTitle(r)}</h2>
          <Stars n={r.overall} />
        </div>
        <p className="muted">{sub.join(tr("・"))}</p>
      </div>
    </Link>
  );
}
