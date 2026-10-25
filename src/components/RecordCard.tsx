import Link from "next/link";
import type { TastingRecord } from "@/lib/types";

export function stars(n: number) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

/** 一覧や詳細の見出し。「エチオピア イルガチェフェ グティティ」のように産地と農園・品種をつなげる */
export function beanTitle(r: Pick<TastingRecord, "origin" | "farm">) {
  return [r.origin, r.farm].filter(Boolean).join(" ") || "（豆の名前なし）";
}

/** 「2026-10-25」→「10/25」。今年以外は年も出す */
function shortDate(date: string) {
  const [y, m, d] = date.split("-");
  const md = `${Number(m)}/${Number(d)}`;
  return Number(y) === new Date().getFullYear() ? md : `${y}/${md}`;
}

export default function RecordCard({ record: r }: { record: TastingRecord }) {
  const tags = [r.roast, r.process, r.method, r.temp, r.style].filter((t) => t && t !== "不明");
  return (
    <Link href={`/record?id=${r.id}`} className="card">
      <div className="card-top">
        <h2>{beanTitle(r)}</h2>
        <span className="muted">{shortDate(r.date)}</span>
      </div>
      <p className="muted">{r.shop}</p>
      {tags.length > 0 && (
        <div className="tags">
          {tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="row" style={{ alignItems: "center", fontSize: 13 }}>
        <span className="muted">総合</span>
        <span className="stars" aria-label={`5段階中${r.overall}`}>
          {stars(r.overall)}
        </span>
        {r.flavors.length > 0 && <span className="muted">{r.flavors.join("・")}</span>}
      </div>
    </Link>
  );
}
