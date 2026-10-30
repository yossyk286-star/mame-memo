"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import RadarChart from "@/components/RadarChart";
import { beanTitle, roastColor, stars, yen } from "@/components/RecordCard";
import { TASTE_AXES } from "@/lib/axes";
import { recordImage, shareImage } from "@/lib/shareImage";
import { PhotoAddButton, PhotoRow } from "@/components/PhotoAdd";
import { putRecord } from "@/lib/db";
import { photosOf, shrinkPhotos } from "@/lib/photo";
import { hasRecipe, recipeText } from "@/lib/recipe";
import { mapsUrl } from "@/lib/shops";
import { useRecordFromQuery } from "@/lib/useRecord";
import AskAI from "@/components/AskAI";
import type { QA } from "@/lib/types";
import { tr, trJoin, trv } from "@/lib/i18n";

/** AI に聞くときにタップで入る質問 */
const SUGGESTIONS = ["この豆に合う淹れ方は？", "もっとおいしく淹れるには？", "似た味の豆は？", "合うスイーツは？"];

type Row = [string, string];

/** 見出しと、入っている欄だけの表。1つも入っていなければ何も出さない */
function DetailSection({ title, rows }: { title: string; rows: Row[] }) {
  const filled = rows.filter(([, v]) => v.trim());
  if (filled.length === 0) return null;
  return (
    <>
      <h2 className="section-title">{trv(title)}</h2>
      <dl className="card detail-list">
        {filled.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt>{trv(k)}</dt>
            <dd>{trv(v)}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function DetailBody() {
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
      footer: trJoin([r.shop, r.date.replaceAll("-", "/")]),
      photo: photosOf(r)[0] ?? null,
    });
    await shareImage(blob, beanTitle(r)).catch(() => alert(tr("共有できませんでした")));
  }

  async function addQA(qa: QA) {
    if (!r) return;
    const next = { ...r, qa: [...(r.qa ?? []), qa] };
    await putRecord(next);
    setR(next);
  }

  // 空の欄は出さない。まとまりごとに分けて表で見せる
  const beanRows: Row[] = r
    ? [
        ["産地", tr(r.origin)],
        ["農園・品種", r.farm],
        ["焙煎度", tr(r.roast ?? "")],
        ["精製方法", tr(r.process ?? "")],
        ["お店の説明", r.menuNote],
      ]
    : [];
  const brewRows: Row[] = r
    ? [
        ["抽出方法", tr(r.method ?? "")],
        ["レシピ", hasRecipe(r.recipe) ? recipeText(r.recipe) : ""],
        ["温度・飲み方", trJoin([r.temp, r.style])],
        ["合うスイーツ", r.sweets ?? ""],
        ["値段", r.price ? yen(r.price) : ""],
      ]
    : [];
  const shopMap = r ? mapsUrl(r.shop) : null;
  const scores = r ? TASTE_AXES.map(([label, get]) => [label, get(r) ?? null] as const) : [];
  const filledScores = scores.filter(([, v]) => v);
  /** AI に聞くときに渡す中身（入っている欄だけ） */
  const rows: Row[] = r
    ? ([
        ["日付", r.date],
        ["飲んだ場所", r.shop],
        ...beanRows,
        ...brewRows,
        ["感じた味", trJoin(r.flavors)],
        ...filledScores.map(([k, v]) => [k, `${v} / 5`] as Row),
        ["メモ", r.memo],
      ] as Row[]).filter(([, v]) => v.trim())
    : [];
  const heroTags = r ? [r.process, r.method].filter((t): t is NonNullable<typeof t> => !!t && t !== "不明") : [];

  return (
    <>
      <header className="sub-header">
        <Link href="/" className="back">
          {tr("‹ 戻る")}
        </Link>
        <h1>{tr("記録")}</h1>
        {r && (
          <Link href={`/edit?id=${r.id}`} className="back" style={{ gridColumn: 3, justifySelf: "end" }}>
            {tr("編集")}
          </Link>
        )}
      </header>
      {r === null && <p className="empty">{tr("記録が見つかりませんでした。")}</p>}
      {r && (
        <main className="content" style={{ paddingTop: 16 }}>
          {/* 写真があるときは上に出して右下に小さく足すボタンを重ねる。ないときは下のボタンの列から足す */}
          {photosOf(r).length > 0 && (
            <div className="photo-wrap">
              <PhotoRow photos={photosOf(r)} />
              <PhotoAddButton chip label={tr("＋ 写真")} onFiles={addPhotos} />
            </div>
          )}
          {photoError && (
            <p className="error" role="alert">
              {trv(photoError)}
            </p>
          )}
          <div className="card detail-hero">
            <div className="detail-hero-top">
              <div className="detail-hero-name">
                {(r.roast && r.roast !== "不明") || heroTags.length > 0 ? (
                  <div className="tags">
                    {r.roast && r.roast !== "不明" && (
                      <span className="tag kind-tag" style={{ "--kind": roastColor(r.roast) } as React.CSSProperties}>
                        {trv(r.roast)}
                      </span>
                    )}
                    {heroTags.map((t) => (
                      <span key={t} className="tag">
                        {trv(t)}
                      </span>
                    ))}
                  </div>
                ) : null}
                <h2 className={beanTitle(r).length > 18 ? "is-long" : undefined}>{beanTitle(r)}</h2>
              </div>
              <div className="detail-score" aria-label={tr("総合 5段階中{0}", r.overall)}>
                <span className="detail-score-label">{tr("総合")}</span>
                <span className="detail-score-num">{trv(r.overall)}</span>
                <span className="stars" aria-hidden="true">
                  {stars(r.overall)}
                </span>
              </div>
            </div>
            <div className="detail-when">
              <span>{trJoin([r.date.replaceAll("-", "/"), r.shop])}</span>
              {shopMap && (
                <a href={shopMap} target="_blank" rel="noopener noreferrer" className="map-link">
                  {tr("地図")}
                </a>
              )}
            </div>
          </div>

          {(filledScores.length > 0 || r.flavors.length > 0) && (
            <>
              <h2 className="section-title">{tr("味")}</h2>
              <div className="card detail-taste">
                {filledScores.length >= 3 && (
                  <div className="detail-radar">
                    <RadarChart axes={scores.map(([a]) => a)} series={[{ label: tr("この記録"), values: scores.map(([, v]) => v) }]} />
                  </div>
                )}
                {filledScores.length > 0 && (
                  <div className="meters">
                    {filledScores.map(([label, v]) => (
                      <div key={label} className="meter" aria-label={tr("{0} 5段階中{1}", label, v)}>
                        <span className="meter-label">{trv(label)}</span>
                        <span className="meter-dots" aria-hidden="true">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <i key={n} className={n <= (v ?? 0) ? "on" : ""} />
                          ))}
                        </span>
                        <span className="meter-num" aria-hidden="true">
                          {trv(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {r.flavors.length > 0 && (
                  <div className="tags" aria-label={tr("感じた味")}>
                    {r.flavors.map((f) => (
                      <span key={f} className="tag tag-plain">
                        {trv(f)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <DetailSection title={tr("淹れ方・飲み方")} rows={brewRows} />
          <DetailSection title={tr("豆のこと")} rows={beanRows} />

          {r.memo.trim() && (
            <>
              <h2 className="section-title">{tr("メモ")}</h2>
              <div className="card detail-memo">{trv(r.memo)}</div>
            </>
          )}

          <AskAI
            context={[tr("豆：{0}", beanTitle(r)), tr("総合：{0} / 5", r.overall), ...rows.map(([k, v]) => `${k}：${v}`)].join("\n")}
            suggestions={SUGGESTIONS.map((s) => tr(s))}
            history={r.qa ?? []}
            onAnswered={addQA}
          />
          <button type="button" className="btn-secondary" onClick={share}>
            {tr("画像にして送る")}
          </button>
          <Link href={`/compare?a=${r.id}`} className="btn-secondary">
            {tr("ほかの記録とくらべる")}
          </Link>
          {photosOf(r).length === 0 && (
            <div className="row">
              <PhotoAddButton label={tr("＋ 写真を追加")} onFiles={addPhotos} />
            </div>
          )}
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
