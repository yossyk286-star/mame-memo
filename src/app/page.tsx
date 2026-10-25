"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SwipeRecord from "@/components/SwipeRecord";
import { listRecords, putRecord } from "@/lib/db";
import { loadLastScan } from "@/lib/lastScan";
import { farmOf } from "@/lib/menuScan";
import type { TastingRecord } from "@/lib/types";

export default function RecordsPage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(null);
  const [todayBeans, setTodayBeans] = useState(0);

  useEffect(() => {
    const scan = loadLastScan();
    setTodayBeans(scan?.beans.length ?? 0);
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

  return (
    <>
      <header className="page-header">
        <h1>まめメモ</h1>
        <Link href="/settings" className="icon-btn" aria-label="設定">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
          </svg>
        </Link>
      </header>

      {records && records.length > 0 && (
        <p className="lead">これまでの記録 {records.length}件（左にスライドで削除、右で編集）</p>
      )}

      <main className="content" style={{ paddingBottom: 96 }}>
        {/* お店でメニューを見たらすぐ撮って確認できるように、一覧のいちばん上に置く */}
        <Link href="/scan" className="btn-primary scan-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          {todayBeans > 0 ? `今日のメニューを見る（${todayBeans}種類）` : "メニューを撮って選ぶ"}
        </Link>
        {records?.length === 0 && (
          <p className="empty">
            まだ記録がありません。
            <br />
            カフェで飲んだら「記録する」から残してみましょう。
          </p>
        )}
        {records?.map((r) => (
          <SwipeRecord
            key={r.id}
            record={r}
            onDeleted={(id) => setRecords((rs) => rs?.filter((x) => x.id !== id) ?? null)}
          />
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
