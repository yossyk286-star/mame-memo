"use client";

import Link from "next/link";
import { Suspense } from "react";
import RecordForm from "@/components/RecordForm";
import { useRecordFromQuery } from "@/lib/useRecord";

function EditBody() {
  const record = useRecordFromQuery();
  return (
    <>
      <header className="sub-header">
        <Link href={record ? `/record?id=${record.id}` : "/"} className="back">
          ‹ 戻る
        </Link>
        <h1>記録を編集</h1>
      </header>
      {record === null && <p className="empty">記録が見つかりませんでした。</p>}
      {record && <RecordForm initial={record} />}
    </>
  );
}

export default function EditRecordPage() {
  return (
    <Suspense>
      <EditBody />
    </Suspense>
  );
}
