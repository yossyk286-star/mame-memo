"use client";

import Link from "next/link";
import { useState } from "react";
import MenuScan, { PickedBean } from "@/components/MenuScan";
import RecordForm from "@/components/RecordForm";
import { beanToDraft, type ScannedBean } from "@/lib/menuScan";

export default function NewRecordPage() {
  const [picked, setPicked] = useState<ScannedBean | null>(null);

  return (
    <>
      <header className="sub-header">
        <Link href="/" className="back">
          ‹ 戻る
        </Link>
        <h1>新しい記録</h1>
      </header>

      {picked ? <PickedBean bean={picked} /> : <MenuScan onPick={setPicked} />}

      {/* 豆を選んだらフォームを作り直して読み取り結果を入れる */}
      <RecordForm key={picked?.name ?? "blank"} prefill={picked ? beanToDraft(picked) : undefined} />
    </>
  );
}
