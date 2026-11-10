"use client";

import Link from "next/link";
import { useEffect } from "react";
import { FLAVORS, METHODS, PROCESSES, ROASTS, termsOf, type GlossaryCategory } from "@/lib/glossary";
import { getLang, tr, trv } from "@/lib/i18n";

const TITLES: Record<GlossaryCategory, string> = {
  精製: "精製方法とは",
  抽出: "抽出方法とは",
  焙煎: "焙煎度とは",
  フレーバー: "フレーバーの表現",
  "豆・産地": "豆と産地",
  味わい: "味わいの表現",
};

/** 入力フォームの「?」から開く、その場で読める用語説明 */
export default function GlossarySheet({
  category,
  onClose,
}: {
  category: GlossaryCategory;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 記録画面で選べる言葉を先に。そのほかの言葉は畳んでおく（長くなりすぎないように）
  const choices: string[] = ({ 精製: PROCESSES, 抽出: METHODS, 焙煎: ROASTS, フレーバー: FLAVORS } as Record<string, string[]>)[category] ?? [];
  const all = termsOf(category);
  const main = all.filter((t) => choices.includes(t.term));
  const rest = all.filter((t) => !choices.includes(t.term));
  const row = (t: (typeof all)[number]) => (
    <div className="term" key={t.term}>
      <span className="term-name">
        {trv(t.term)}
        {getLang() === "ja" && t.reading && tr("（{0}）", t.reading)}
      </span>
      <p className="term-desc">{trv(t.description)}</p>
    </div>
  );

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <h2 id="sheet-title">{trv(TITLES[category])}</h2>
          <button className="icon-btn" aria-label={tr("閉じる")} onClick={onClose} autoFocus>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {(main.length ? main : all).map(row)}
        {main.length > 0 && rest.length > 0 && (
          <details className="sheet-more">
            <summary className="muted" style={{ fontSize: 13, cursor: "pointer" }}>
              {tr("ほかの言葉（{0}語）", rest.length)}
            </summary>
            {rest.map(row)}
          </details>
        )}
        <Link href="/glossary" style={{ fontSize: 13 }}>
          {tr("辞典でほかの用語も見る ›")}
        </Link>
      </section>
    </div>
  );
}
