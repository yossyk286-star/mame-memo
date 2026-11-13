"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { markIfLoaded, markLoaded, photosOf, useThumbURL } from "@/lib/photo";
import type { Roast, TastingRecord } from "@/lib/types";
import { getLang, tr } from "@/lib/i18n";
import { isPlainClick, nameForTransition, transitionTo } from "@/lib/viewTransition";
import { loadFeatures, useFeatures, type Features } from "@/lib/features";

/** 点数の見せ方（設定の「★5・10点・100点」）に直した数字。中は ★0.5〜5 のまま */
function scaled(n: number, scale: Features["scale"]) {
  return scale === "ten" ? Math.round(n * 2) : Math.round(n * 20);
}

/** 文の中で使う総合評価。「★4」「★3.5」、10点・100点の設定なら「8点」「80点」 */
export function stars(n: number) {
  const { scale } = loadFeatures();
  return scale === "star5" ? `★${n}` : tr("{0}点", scaled(n, scale));
}

/** 総合評価の★5つ。0.5 なら半分だけ塗る。空きも同じ★を薄く出す。10点・100点の設定なら数字で出す */
export function Stars({ n, color, className = "", label }: { n: number; color?: string; className?: string; label?: string }) {
  const { scale } = useFeatures();
  if (scale !== "star5")
    return (
      <span
        className={`score ${className}`.trim()}
        role="img"
        aria-label={label ?? tr("{0}点", scaled(n, scale))}
        style={color ? ({ "--star": color } as CSSProperties) : undefined}
      >
        {scaled(n, scale)}
        <small>{scale === "ten" ? "/10" : "/100"}</small>
      </span>
    );
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
  const first = photosOf(r)[0];
  // 小さく作り直した写真を使う（元の大きな写真を毎回読み直すと、タブを移るたびに重くなる）
  const url = useThumbURL(`${r.id}:${r.updatedAt}`, first);
  if (first) {
    // 縮小版ができるまでは同じ大きさの空き枠を出して、行の高さや並びが動かないようにする
    if (!url) return <span className="thumb thumb-wait" style={{ borderColor: roastColor(r.roast) }} aria-hidden="true" />;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="thumb photo-fade"
        loading="lazy"
        decoding="async"
        ref={markIfLoaded}
        onLoad={markLoaded}
        style={{ borderColor: roastColor(r.roast) }}
      />
    );
  }
  return (
    <span className="thumb thumb-mark" style={{ "--kc": roastColor(r.roast) } as React.CSSProperties} aria-hidden="true">
      {ROAST_LOOK[r.roast ?? "不明"][getLang() === "en" ? "en" : "mark"]}
    </span>
  );
}

/** 消す確認シートに出す「何を消すか」（マーク＋名前） */
export function RecordPreview({ record }: { record: TastingRecord }) {
  return (
    <>
      <Thumb record={record} />
      <strong>{beanTitle(record)}</strong>
    </>
  );
}

/** 記録の一覧の1行。2行に詰めて、画面にたくさん並ぶようにする。showDate=false は日付で区切った一覧用 */
export default function RecordCard({ record: r, showDate = true, nth }: { record: TastingRecord; showDate?: boolean; nth?: number }) {
  const { favorites, repeatTag } = useFeatures();
  // 焙煎度は左のマークでわかるので、精製・淹れ方から書く（店や値段まで見えるように）
  const sub = [
    ...[r.process, r.method].filter((t) => t && t !== "不明").map((t) => tr(t!)),
    r.shop && tr(r.shop),
    r.price && yen(r.price),
    showDate && shortDate(r.date),
  ].filter(Boolean);
  const router = useRouter();
  const href = `/record?id=${r.id}`;
  /** 押した行が上へ広がって詳細になる（使えない端末ではふつうに移る） */
  function open(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    const row = e.currentTarget;
    nameForTransition(row, "rec-card");
    nameForTransition(row.querySelector("h2"), "rec-name");
    transitionTo(
      () => router.push(href),
      () => !!document.querySelector(".detail-hero"),
      "open",
    );
  }
  return (
    <Link href={href} className="card record-row" data-rid={r.id} onClick={open}>
      <Thumb record={r} />
      <div className="record-row-body">
        <div className="record-row-top">
          <h2>
            {favorites && r.again && (
              <span className="row-heart" aria-label={tr("また飲みたい")}>
                ♥
              </span>
            )}
            {beanTitle(r)}
            {/* 同じ豆の2回目以降（43） */}
            {repeatTag && nth && nth >= 2 ? <span className="repeat-tag">{tr("{0}回目", nth)}</span> : null}
          </h2>
          <Stars n={r.overall} />
        </div>
        <p className="muted">{sub.join(tr("・"))}</p>
      </div>
    </Link>
  );
}
