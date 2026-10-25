"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";
import { stars } from "@/components/RecordCard";
import { deleteRecord } from "@/lib/db";
import { useRecordFromQuery } from "@/lib/useRecord";
import type { Score } from "@/lib/types";

function scoreText(s: Score | null) {
  return s ? `${s} / 5` : "—";
}

function DetailBody() {
  const router = useRouter();
  const r = useRecordFromQuery();
  const photoURL = useMemo(() => (r?.photo ? URL.createObjectURL(r.photo) : null), [r]);
  useEffect(() => () => void (photoURL && URL.revokeObjectURL(photoURL)), [photoURL]);

  async function remove() {
    if (!r || !confirm("この記録を削除しますか？")) return;
    await deleteRecord(r.id);
    router.replace("/");
  }

  const rows: [string, string][] = r
    ? [
        ["日付", r.date],
        ["店名", r.shop],
        ["産地", r.origin || "—"],
        ["農園・品種", r.farm || "—"],
        ["焙煎度", r.roast ?? "—"],
        ["精製方法", r.process ?? "—"],
        ["抽出方法", r.method ?? "—"],
        ["温度・飲み方", [r.temp, r.style].filter(Boolean).join("・") || "—"],
        ["お店の説明", r.menuNote || "—"],
        ["感じた味", r.flavors.join("・") || "—"],
        ["酸味", scoreText(r.acidity)],
        ["苦味", scoreText(r.bitterness)],
        ["甘さ", scoreText(r.sweetness)],
        ["メモ", r.memo || "—"],
      ]
    : [];

  return (
    <>
      <header className="sub-header">
        <Link href="/" className="back">
          ‹ 一覧
        </Link>
        <h1>記録</h1>
      </header>
      {r === null && <p className="empty">記録が見つかりませんでした。</p>}
      {r && (
        <main className="content" style={{ paddingTop: 16 }}>
          {photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoURL} alt="記録の写真" className="photo-preview" />
          )}
          <div className="card">
            <h2 style={{ fontSize: 20 }}>{r.origin || r.farm || "（豆の名前なし）"}</h2>
            <p>
              <span className="muted">総合 </span>
              <span className="stars">{stars(r.overall)}</span>
            </p>
            <dl className="detail-list">
              {rows.map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="row">
            <Link href={`/edit?id=${r.id}`} className="btn-secondary" style={{ flex: 1 }}>
              編集する
            </Link>
            <button type="button" className="btn-secondary btn-danger" onClick={remove}>
              削除
            </button>
          </div>
        </main>
      )}
    </>
  );
}

export default function RecordDetailPage() {
  return (
    <Suspense>
      <DetailBody />
    </Suspense>
  );
}
