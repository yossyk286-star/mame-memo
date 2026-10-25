"use client";

import { useEffect, useState } from "react";
import { listRecords } from "@/lib/db";
import type { TastingRecord } from "@/lib/types";

const MIN_RECORDS = 5;

export default function TastePage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(null);

  useEffect(() => {
    listRecords().then(setRecords);
  }, []);

  const count = records?.length ?? 0;

  return (
    <>
      <header className="page-header">
        <h1>好み</h1>
      </header>
      <main className="content">
        {records && count < MIN_RECORDS && (
          <p className="empty">
            記録が{MIN_RECORDS}件たまると、あなたの好みの傾向を表示します。
            <br />
            いま {count}件 / あと {MIN_RECORDS - count}件
          </p>
        )}
        {/* 傾向の分析は次のステップで作る */}
      </main>
    </>
  );
}
