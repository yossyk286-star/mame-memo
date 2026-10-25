"use client";

import Link from "next/link";
import { useState } from "react";
import MenuScan from "@/components/MenuScan";
import RecordForm from "@/components/RecordForm";
import type { ScannedBean } from "@/lib/menuScan";
import type { RecordDraft } from "@/lib/types";

function toDraft(b: ScannedBean): Partial<RecordDraft> {
  return {
    origin: b.origin || b.name,
    farm: b.farm,
    roast: b.roast,
    process: b.process,
    method: b.recommendedMethod,
    menuNote: b.menuNote,
  };
}

export default function NewRecordPage() {
  const [picked, setPicked] = useState<ScannedBean | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  return (
    <>
      <header className="sub-header">
        <Link href="/" className="back">
          ‹ 戻る
        </Link>
        <h1>新しい記録</h1>
      </header>

      {!picked && !scanOpen && (
        <div style={{ padding: "16px 16px 0" }}>
          <button type="button" className="btn-secondary" style={{ width: "100%" }} onClick={() => setScanOpen(true)}>
            メニューを撮って入力する
          </button>
        </div>
      )}
      {!picked && scanOpen && <MenuScan onPick={setPicked} />}
      {picked && (
        <section className="tips" style={{ margin: "16px 16px 0" }}>
          <h2>{picked.name}</h2>
          <p className="term-desc">{picked.explanation}</p>
          <p className="term-desc">
            <strong>おすすめ：</strong>
            {picked.recommendation}
          </p>
        </section>
      )}

      {/* 豆を選んだらフォームを作り直して読み取り結果を入れる */}
      <RecordForm key={picked?.name ?? "blank"} prefill={picked ? toDraft(picked) : undefined} />
    </>
  );
}
