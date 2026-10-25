"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RecordCard from "@/components/RecordCard";
import { listRecords } from "@/lib/db";
import type { TastingRecord } from "@/lib/types";

export default function RecordsPage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(null);

  useEffect(() => {
    listRecords().then(setRecords);
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

      {records && records.length > 0 && <p className="lead">これまでの記録 {records.length}件</p>}

      <main className="content" style={{ paddingBottom: 96 }}>
        {records?.length === 0 && (
          <p className="empty">
            まだ記録がありません。
            <br />
            カフェで飲んだら「記録する」から残してみましょう。
          </p>
        )}
        {records?.map((r) => <RecordCard key={r.id} record={r} />)}
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
