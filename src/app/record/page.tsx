"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { beanTitle, stars, yen } from "@/components/RecordCard";
import { TASTE_AXES } from "@/lib/axes";
import { recordImage, shareImage } from "@/lib/shareImage";
import { PhotoAddButton, PhotoRow } from "@/components/PhotoAdd";
import { deleteRecord, putRecord } from "@/lib/db";
import { photosOf, shrinkPhotos } from "@/lib/photo";
import { hasRecipe, recipeText } from "@/lib/recipe";
import { useRecordFromQuery } from "@/lib/useRecord";
import AskAI from "@/components/AskAI";
import type { QA, Score } from "@/lib/types";

/** AI に聞くときにタップで入る質問 */
const SUGGESTIONS = ["この豆に合う淹れ方は？", "もっとおいしく淹れるには？", "似た味の豆は？", "合うスイーツは？"];

function scoreText(s: Score | null) {
  return s ? `${s} / 5` : "—";
}

function DetailBody() {
  const router = useRouter();
  const loaded = useRecordFromQuery();
  // 写真を足したらその場で表示を変える
  const [r, setR] = useState(loaded);
  useEffect(() => setR(loaded), [loaded]);
  const [photoError, setPhotoError] = useState("");

  /** 編集画面を開かずに、写真だけその場で足す */
  async function addPhotos(files: FileList | null) {
    if (!r) return;
    try {
      const added = await shrinkPhotos(files);
      if (added.length === 0) return;
      const next = { ...r, photos: [...photosOf(r), ...added], photo: null, updatedAt: Date.now() };
      await putRecord(next);
      setR(next);
      setPhotoError("");
    } catch {
      setPhotoError("写真を読み込めませんでした");
    }
  }

  async function remove() {
    if (!r || !confirm("この記録を削除しますか？")) return;
    await deleteRecord(r.id);
    router.replace("/");
  }

  async function share() {
    if (!r) return;
    const blob = await recordImage({
      title: beanTitle(r),
      overall: r.overall,
      tags: [r.roast, r.process, r.method, r.temp, r.style].filter((t): t is NonNullable<typeof t> => !!t && t !== "不明"),
      axes: TASTE_AXES.map(([label]) => label),
      values: TASTE_AXES.map(([, get]) => get(r)),
      flavors: r.flavors,
      memo: r.memo,
      footer: [r.shop, r.date.replaceAll("-", "/")].filter(Boolean).join("・"),
      photo: photosOf(r)[0] ?? null,
    });
    await shareImage(blob, beanTitle(r)).catch(() => alert("共有できませんでした"));
  }

  async function addQA(qa: QA) {
    if (!r) return;
    const next = { ...r, qa: [...(r.qa ?? []), qa] };
    await putRecord(next);
    setR(next);
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
        ...(hasRecipe(r.recipe) ? [["レシピ", recipeText(r.recipe)] as [string, string]] : []),
        ["温度・飲み方", [r.temp, r.style].filter(Boolean).join("・") || "—"],
        ["お店の説明", r.menuNote || "—"],
        ["合うスイーツ", r.sweets || "—"],
        ["感じた味", r.flavors.join("・") || "—"],
        ["酸味", scoreText(r.acidity)],
        ["苦味", scoreText(r.bitterness)],
        ["甘さ", scoreText(r.sweetness)],
        ["コク", scoreText(r.body ?? null)],
        ["香り", scoreText(r.aroma ?? null)],
        ["値段", r.price ? yen(r.price) : "—"],
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
          <PhotoRow photos={photosOf(r)} />
          <div className="row">
            <PhotoAddButton label={photosOf(r).length > 0 ? "＋ 写真をもっと追加" : "＋ 写真を追加"} onFiles={addPhotos} />
          </div>
          {photoError && (
            <p className="error" role="alert">
              {photoError}
            </p>
          )}
          <div className="card">
            <h2 style={{ fontSize: 20 }}>{beanTitle(r)}</h2>
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
          <AskAI
            context={[`豆：${beanTitle(r)}`, `総合：${r.overall} / 5`, ...rows.filter(([, v]) => v !== "—").map(([k, v]) => `${k}：${v}`)].join("\n")}
            suggestions={SUGGESTIONS}
            history={r.qa ?? []}
            onAnswered={addQA}
          />
          <button type="button" className="btn-secondary" onClick={share}>
            画像にして送る
          </button>
          <Link href={`/compare?a=${r.id}`} className="btn-secondary">
            ほかの記録とくらべる
          </Link>
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
