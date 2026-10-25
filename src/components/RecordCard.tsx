"use client";

import Link from "next/link";
import { photosOf, usePhotoURLs } from "@/lib/photo";
import type { Roast, TastingRecord } from "@/lib/types";

export function stars(n: number) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

/** 一覧や詳細の見出し。「エチオピア イルガチェフェ グティティ」のように産地と農園・品種をつなげる */
export function beanTitle(r: Pick<TastingRecord, "origin" | "farm">) {
  return [r.origin, r.farm].filter(Boolean).join(" ") || "（豆の名前なし）";
}

export function yen(n: number) {
  return `${Math.round(n).toLocaleString("ja-JP")}円`;
}

/** 焙煎度ごとの色（globals.css の --k-… ）と、写真がないときに出す1文字 */
const ROAST_LOOK: Record<Roast, { color: string; mark: string }> = {
  浅煎り: { color: "var(--k-light)", mark: "浅" },
  中煎り: { color: "var(--k-medium)", mark: "中" },
  深煎り: { color: "var(--k-dark)", mark: "深" },
  不明: { color: "var(--k-unknown)", mark: "豆" },
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
    <span className="thumb thumb-mark" style={{ background: roastColor(r.roast) }} aria-hidden="true">
      {ROAST_LOOK[r.roast ?? "不明"].mark}
    </span>
  );
}

/** 記録の一覧の1行。2行に詰めて、画面にたくさん並ぶようにする。showDate=false は日付で区切った一覧用 */
export default function RecordCard({ record: r, showDate = true }: { record: TastingRecord; showDate?: boolean }) {
  const sub = [
    ...[r.roast, r.process, r.method].filter((t) => t && t !== "不明"),
    r.shop,
    r.price && yen(r.price),
    showDate && shortDate(r.date),
  ].filter(Boolean);
  return (
    <Link href={`/record?id=${r.id}`} className="card record-row">
      <Thumb record={r} />
      <div className="record-row-body">
        <div className="record-row-top">
          <h2>{beanTitle(r)}</h2>
          <span className="stars" aria-label={`5段階中${r.overall}`}>
            {stars(r.overall)}
          </span>
        </div>
        <p className="muted">{sub.join("・")}</p>
      </div>
    </Link>
  );
}
