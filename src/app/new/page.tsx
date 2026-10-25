"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import MenuScan, { PickedBean } from "@/components/MenuScan";
import RecordForm from "@/components/RecordForm";
import { loadLastScan, markRecorded } from "@/lib/lastScan";
import { beanToDraft, type ScannedBean } from "@/lib/menuScan";
import type { RecordDraft } from "@/lib/types";

function NewRecord() {
  // メニュー確認の画面で「これを飲んだ」を押すと ?bean=豆の名前 で来る
  const beanParam = useSearchParams().get("bean");
  const [beans, setBeans] = useState<ScannedBean[]>([]);
  const [picked, setPicked] = useState<ScannedBean | null>(null);
  // 同じメニューから続けて記録するとき、店名と日付は引き継ぐ
  const [carry, setCarry] = useState<Pick<RecordDraft, "shop" | "date"> | null>(
    null,
  );
  const [savedNames, setSavedNames] = useState<string[]>([]);
  const [saveCount, setSaveCount] = useState(0);
  // 今日の読み取り結果を読み込んだら MenuScan を作り直して一覧を出す
  const [loaded, setLoaded] = useState(false);
  // メニューの豆を選んでいる間はフォームを隠す（メニューにない豆を記録するときだけ出す）
  const [manual, setManual] = useState(false);

  // お店で撮っておいた今日のメニューがあれば、撮り直さずにそこから選べる
  useEffect(() => {
    const scan = loadLastScan();
    if (scan) {
      setBeans(scan.beans);
      setSavedNames(scan.recorded);
      const bean = scan.beans.find((b) => b.name === beanParam);
      if (bean) setPicked(bean);
    }
    setLoaded(true);
  }, [beanParam]);

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
          key={`${saveCount}:${loaded}`}
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
            if (picked) {
              setSavedNames((ns) => [...ns, picked.name]);
              markRecorded(picked.name);
            }
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

export default function NewRecordPage() {
  return (
    <Suspense>
      <NewRecord />
    </Suspense>
  );
}
