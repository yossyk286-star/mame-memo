"use client";

import Link from "next/link";
import { useState } from "react";
import MenuScan, { PickedBean } from "@/components/MenuScan";
import RecordForm from "@/components/RecordForm";
import { beanToDraft, type ScannedBean } from "@/lib/menuScan";
import type { RecordDraft } from "@/lib/types";

export default function NewRecordPage() {
  const [beans, setBeans] = useState<ScannedBean[]>([]);
  const [picked, setPicked] = useState<ScannedBean | null>(null);
  // 同じメニューから続けて記録するとき、店名と日付は引き継ぐ
  const [carry, setCarry] = useState<Pick<RecordDraft, "shop" | "date"> | null>(
    null,
  );
  const [savedNames, setSavedNames] = useState<string[]>([]);
  const [saveCount, setSaveCount] = useState(0);
  // メニューの豆を選んでいる間はフォームを隠す（メニューにない豆を記録するときだけ出す）
  const [manual, setManual] = useState(false);

  const remaining = beans.filter((b) => !savedNames.includes(b.name));

  return (
    <>
      <header className="sub-header">
        <Link href="/" className="back">
          ‹ 戻る
        </Link>
        <h1>新しい記録</h1>
      </header>

      {saveCount > 0 && !picked && (
        <section
          className="tips"
          style={{ margin: "16px 16px 0" }}
          role="status"
        >
          <h2>保存しました</h2>
          <p className="term-desc">
            {remaining.length > 0
              ? "ほかにも飲んだ豆があれば、下から選んで続けて記録できます。"
              : "続けて別の記録も作れます。"}
          </p>
          <Link
            href="/"
            className="btn-secondary"
            style={{ display: "block", textAlign: "center" }}
          >
            記録の一覧へ
          </Link>
        </section>
      )}

      {picked ? (
        <PickedBean bean={picked} onChange={() => setPicked(null)} />
      ) : (
        <MenuScan
          key={saveCount}
          onPick={(b) => {
            setPicked(b);
            window.scrollTo({ top: 0 });
          }}
          initialBeans={remaining}
          onScanned={(bs) => {
            setBeans(bs);
            setSavedNames([]);
          }}
        />
      )}

      {!picked && !manual && remaining.length > 0 ? (
        <div style={{ margin: "12px 16px 0" }}>
          <button
            type="button"
            className="btn-ghost"
            style={{ width: "100%" }}
            onClick={() => setManual(true)}
          >
            メニューにない豆を記録する
          </button>
        </div>
      ) : (
        /* 豆を選んだり保存したりしたらフォームを作り直して読み取り結果を入れる */
        <RecordForm
          key={`${saveCount}:${picked?.name ?? "blank"}`}
          prefill={{ ...carry, ...(picked ? beanToDraft(picked) : {}) }}
          beanFilled={!!picked}
          onSaved={(r) => {
            if (picked) setSavedNames((ns) => [...ns, picked.name]);
            setCarry({ shop: r.shop, date: r.date });
            setPicked(null);
            setManual(false);
            setSaveCount((n) => n + 1);
            window.scrollTo({ top: 0 });
          }}
        />
      )}
    </>
  );
}
