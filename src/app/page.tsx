"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { roastColor } from "@/components/RecordCard";
import SwipeRecord from "@/components/SwipeRecord";
import { listRecords, putRecord } from "@/lib/db";
import { ROASTS } from "@/lib/glossary";
import { loadLastScan } from "@/lib/lastScan";
import { farmOf } from "@/lib/menuScan";
import type { Roast, TastingRecord } from "@/lib/types";

const WEEKDAYS = "日月火水木金土";

/** 「2026-10-25」→「10月25日（日）」。今年以外は年も出す */
function dateHead(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const w = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  const md = `${m}月${d}日（${w}）`;
  return y === new Date().getFullYear() ? md : `${y}年${md}`;
}

export default function RecordsPage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(null);
  const [query, setQuery] = useState("");
  const [roast, setRoast] = useState<Roast | null>(null);
  const [goodOnly, setGoodOnly] = useState(false);

  useEffect(() => {
    const scan = loadLastScan();
    listRecords().then(async (rs) => {
      const filled = await Promise.all(
        rs.map(async (r) => {
          if (!scan || r.date !== scan.date) return r;
          let updated = r;
          // 農園名が空のまま保存された今日の記録に、今日読み取ったメニューの同じ国の豆から農園名を補う
          // （同じ国の豆が1つだけのときだけ。どれか決められないときは触らない）
          if (!r.farm) {
            const same = scan.beans.filter((b) => b.origin === r.origin || b.name === r.origin);
            const farm = same.length === 1 ? farmOf(same[0]) : "";
            if (farm) updated = { ...updated, origin: same[0].origin || r.origin, farm };
          }
          // 合うスイーツが入る前に記録した今日の豆にも、同じ豆の一言を入れる
          if (!updated.sweets) {
            const bean = scan.beans.find(
              (b) => b.sweets && (b.origin || b.name) === updated.origin && farmOf(b) === updated.farm,
            );
            if (bean) updated = { ...updated, sweets: bean.sweets };
          }
          if (updated === r) return r;
          updated = { ...updated, updatedAt: Date.now() };
          await putRecord(updated);
          return updated;
        }),
      );
      setRecords(filled);
    });
  }, []);

  // 焙煎度・★4以上・名前などで絞り込み、日付ごとにまとめる（記録は新しい順に並んでいる）
  const days = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hit = (records ?? []).filter(
      (r) =>
        (!roast || r.roast === roast) &&
        (!goodOnly || r.overall >= 4) &&
        (!q ||
          [r.origin, r.farm, r.shop, r.process ?? "", r.method ?? "", r.memo, ...r.flavors].some((s) =>
            s.toLowerCase().includes(q),
          )),
    );
    const out: { date: string; records: TastingRecord[] }[] = [];
    for (const r of hit) {
      const last = out[out.length - 1];
      if (last?.date === r.date) last.records.push(r);
      else out.push({ date: r.date, records: [r] });
    }
    return out;
  }, [records, query, roast, goodOnly]);

  const filtering = !!query.trim() || !!roast || goodOnly;
  const roastsUsed = ROASTS.filter((k) => k !== "不明" && records?.some((r) => r.roast === k));

  return (
    <>
      <header className="page-header">
        <h1>まめメモ</h1>
        <Link href="/settings" className="icon-btn" aria-label="設定">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </Link>
      </header>

      {records && records.length > 0 && (
        <p className="lead">これまでの記録 {records.length}件（左にスライドで削除、右で編集）</p>
      )}

      <main className="content" style={{ paddingBottom: 96 }}>
        {records && records.length > 0 && (
          <div className="filter-bar">
            <label htmlFor="r-search" className="visually-hidden">
              記録を検索
            </label>
            <input
              id="r-search"
              type="search"
              className="input"
              placeholder="産地・店・味で探す"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="scroll-row" role="group" aria-label="絞り込み">
              <button type="button" className="chip" aria-pressed={goodOnly} onClick={() => setGoodOnly(!goodOnly)}>
                ★4以上
              </button>
              {roastsUsed.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="chip kind-chip"
                  style={{ "--kc": roastColor(k) } as React.CSSProperties}
                  aria-pressed={roast === k}
                  onClick={() => setRoast(roast === k ? null : k)}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        )}
        {records?.length === 0 && (
          <p className="empty">
            まだ記録がありません。
            <br />
            下の「調べる」でメニューを撮るか、カフェで飲んだら「記録する」から残してみましょう。
          </p>
        )}
        {records && records.length > 0 && filtering && days.length === 0 && (
          <p className="empty">当てはまる記録がありません。</p>
        )}
        {days.map((day) => (
          <section key={day.date} className="day">
            <h2 className="date-head">{dateHead(day.date)}</h2>
            <div className="list-group">
              {day.records.map((r) => (
                <SwipeRecord
                  key={r.id}
                  record={r}
                  showDate={false}
                  onDeleted={(id) => setRecords((rs) => rs?.filter((x) => x.id !== id) ?? null)}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      <Link href="/new" className="fab">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        記録する
      </Link>
    </>
  );
}
