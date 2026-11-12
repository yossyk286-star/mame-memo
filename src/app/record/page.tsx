"use client";

import BackChevron from "@/components/BackChevron";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { reducedMotion, useFeatures } from "@/lib/features";
import { knownColor, photoColor } from "@/lib/photoColor";
import EmptyState from "@/components/EmptyState";
import RadarChart from "@/components/RadarChart";
import { beanTitle, roastColor, Stars, stars, yen } from "@/components/RecordCard";
import { TASTE_AXES } from "@/lib/axes";
import { shareImage } from "@/lib/shareImage";
import { recordBlob } from "@/lib/recordShare";
import { PhotoAddButton, PhotoRow } from "@/components/PhotoAdd";
import { putRecord } from "@/lib/db";
import { photosOf, shrinkPhotos } from "@/lib/photo";
import { hasRecipe, recipeText } from "@/lib/recipe";
import { mapsUrl } from "@/lib/shops";
import { volumeName } from "@/lib/quickPick";
import { useRecordFromQuery } from "@/lib/useRecord";
import AskAI from "@/components/AskAI";
import type { QA } from "@/lib/types";
import { tr, trJoin, trv } from "@/lib/i18n";
import NumText from "@/components/NumText";
import { useRouter } from "next/navigation";
import { backTarget, popTo } from "@/lib/nav";
import { isPlainClick, nameForTransition, transitionTo } from "@/lib/viewTransition";

/** AI に聞くときにタップで入る質問 */
const SUGGESTIONS = ["この豆に合う淹れ方は？", "もっとおいしく淹れるには？", "似た味の豆は？", "合うスイーツは？"];

type Row = [string, string];

/** 数字を丸い書体で出す欄（名前などに入った数字はそのまま） */
const NUMERIC = new Set(["レシピ", "値段"]);

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
            <dd>{NUMERIC.has(k) ? <NumText text={trv(v)} /> : trv(v)}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function DetailBody() {
  const loaded = useRecordFromQuery();
  const router = useRouter();
  // いちばん上にいるときだけ、上のバーにも豆の色を差す（スクロールしたらふつうの色に戻す）
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY < 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // 写真を足したらその場で表示を変える
  const [r, setR] = useState(loaded);
  useEffect(() => setR(loaded), [loaded]);
  const [photoError, setPhotoError] = useState("");
  const photos = useMemo(() => (r ? photosOf(r) : []), [r]);
  const features = useFeatures();
  // 豆袋の写真の色を、にじみ・五角形・点数の色にする（20）
  const tintKey = r ? `${r.id}:${r.updatedAt}` : "";
  const [tint, setTint] = useState<string | null>(() => (features.photoTint && tintKey ? (knownColor(tintKey) ?? null) : null));
  useEffect(() => {
    if (!features.photoTint || !photos[0]) return setTint(null);
    let alive = true;
    photoColor(photos[0], tintKey).then((c) => alive && setTint(c));
    return () => {
      alive = false;
    };
  }, [photos, features.photoTint, tintKey]);
  // 写真は少しゆっくりスクロールして奥行きを出す（21）。上に引っぱると少し大きくなる。
  // 上のバーの下に写真の端だけ帯のように残らないよう、隠れていくにつれて薄くする
  const photoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // 枠（photo-wrap）は動かさず、中の写真の列だけずらす。はみ出た分は枠で切る
    const wrap = photoRef.current;
    const el = wrap?.querySelector<HTMLElement>(".photo-row");
    if (!wrap || !el) return;
    const move = features.parallax && !reducedMotion();
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const h = wrap.offsetHeight || 1;
        wrap.style.opacity = y > 0 ? String(Math.max(0, 1 - y / (h * 0.7))) : "";
        if (!move || y > h) return;
        el.style.transform = y < 0 ? `scale(${1 + -y / 300})` : `translateY(${y * 0.4}px)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      el.style.transform = "";
      wrap.style.opacity = "";
    };
  }, [features.parallax, photos.length]);

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
    await shareImage(await recordBlob(r), beanTitle(r)).catch(() => toast("共有できませんでした", { tone: "warn" }));
  }

  async function toggleAgain() {
    if (!r) return;
    const next = { ...r, again: !r.again };
    await putRecord(next);
    setR(next);
    if (next.again) toast("また飲みたいに入れました", { tone: "star" });
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
        ["量", r.ml ? volumeName(r.ml) : ""],
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
  /** 一覧へ戻るとき、詳細が縮んで元の行へ帰る。行が見つからなければふつうに重ねて切り替える */
  function back(e: React.MouseEvent) {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    const id = r?.id;
    // 来た画面（スタンプ帳・お店など）へ戻る。一覧へ戻るときだけ行へ縮んで帰る
    const to = backTarget("/");
    popTo(to);
    const path = to.split("?")[0];
    transitionTo(
      () => router.push(to),
      () => {
        if (location.pathname !== path) return false;
        if (path !== "/") return true;
        const row = id ? document.querySelector(`[data-rid="${CSS.escape(id)}"]`) : null;
        if (!row) return !!document.querySelector(".record-row, .empty-state, .empty");
        nameForTransition(row, "rec-card");
        nameForTransition(row.querySelector("h2"), "rec-name");
        return true;
      },
      "back",
    );
  }
  const heroTags = r ? [r.process, r.method].filter((t): t is NonNullable<typeof t> => !!t && t !== "不明") : [];

  return (
    <>
      <header className="sub-header" data-top={atTop ? "" : undefined} style={r ? ({ "--kind": tint ?? roastColor(r.roast) } as React.CSSProperties) : undefined}>
        <Link href="/" className="back" onClick={back}>
          <BackChevron />
        </Link>
        <h1>{tr("記録")}</h1>
        {r && (
          <Link href={`/edit?id=${r.id}`} className="back" style={{ gridColumn: 3, justifySelf: "end" }}>
            {tr("編集")}
          </Link>
        )}
      </header>
      {r === null && (
        <main className="content" style={{ paddingTop: 16 }}>
          <EmptyState title={tr("記録が見つかりませんでした")} mood="sad" actions={[{ href: "/", label: tr("記録の一覧へ") }]}>
            {tr("消した記録か、別の端末で作った記録かもしれません。")}
          </EmptyState>
        </main>
      )}
      {r && (
        <main className="content detail-page" data-tint={tint ? "" : undefined} style={{ paddingTop: 16, "--kind": tint ?? roastColor(r.roast) } as React.CSSProperties}>
          {/* 上からその豆の焙煎の色がうっすら差して、下で地に溶ける */}
          <div className="detail-tint" aria-hidden="true" />
          {/* 写真があるときは上に出して右下に小さく足すボタンを重ねる。ないときは下のボタンの列から足す */}
          {photos.length > 0 && (
            <div className="photo-wrap" ref={photoRef}>
              <PhotoRow photos={photos} cacheKey={tintKey} />
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
                    {/* 焙煎度・精製などを押すと辞典のその言葉へ（20） */}
                    {r.roast && r.roast !== "不明" && (
                      <Link href={`/glossary?q=${encodeURIComponent(r.roast)}`} className="tag kind-tag tag-link">
                        {trv(r.roast)}
                      </Link>
                    )}
                    {heroTags.map((t) => (
                      <Link key={t} href={`/glossary?q=${encodeURIComponent(t)}`} className="tag tag-link">
                        {trv(t)}
                      </Link>
                    ))}
                  </div>
                ) : null}
                {/* 外国語の産地・農園名の読み（42） */}
                {r.reading && <p className="name-reading">{r.reading}</p>}
                <h2 className={beanTitle(r).length > 18 ? "is-long" : undefined}>{beanTitle(r)}</h2>
                {r.farm && (
                  // 農園を押すと、その農園で飲んだ記録のページへ（34）
                  <Link href={`/farm?name=${encodeURIComponent(r.farm)}`} className="maker-link">
                    {tr("この農園の記録")}
                    <span aria-hidden="true">›</span>
                  </Link>
                )}
              </div>
              <div className="detail-score" aria-label={features.scale === "star5" ? tr("総合 5段階中{0}", r.overall) : tr("総合 {0}", stars(r.overall))}>
                <span className="detail-score-label">{tr("総合")}</span>
                {/* 開いたときに数字がくるっと回って出る（22） */}
                <span className="detail-score-num roll" data-roll={features.numRoll ? "" : undefined}>
                  {features.scale === "star5" ? trv(r.overall) : features.scale === "ten" ? Math.round(r.overall * 2) : Math.round(r.overall * 20)}
                </span>
                {features.scale === "star5" ? <Stars n={r.overall} label="" /> : <span className="muted detail-score-of">{features.scale === "ten" ? "/10" : "/100"}</span>}
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
            {/* ♥ また飲みたい（42） */}
            {features.favorites && (
              <button type="button" className="again-btn" aria-pressed={!!r.again} onClick={toggleAgain}>
                <span aria-hidden="true">{r.again ? "♥" : "♡"}</span>
                {tr("また飲みたい")}
              </button>
            )}
          </div>

          {(filledScores.length > 0 || r.flavors.length > 0) && (
            <>
              <h2 className="section-title">{tr("味")}</h2>
              <div className="card detail-taste">
                {filledScores.length >= 3 && (
                  <div className="detail-radar">
                    <RadarChart axes={scores.map(([a]) => a)} series={[{ label: tr("この記録"), values: scores.map(([, v]) => v) }]} showValues color="var(--kind)" />
                  </div>
                )}
                {/* 五角形が出るときは角に数字があるので、目盛りは五角形が出ないとき（2つ以下）だけ */}
                {filledScores.length > 0 && filledScores.length < 3 && (
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

          {r.specs && r.specs.length > 0 && (
            <>
              <h2 className="section-title">{tr("スペック")}</h2>
              <ul className="card spec-grid">
                {r.specs.map((s) => (
                  <li key={s.label}>
                    <span>{trv(s.label)}</span>
                    <b>{s.value}</b>
                  </li>
                ))}
              </ul>
            </>
          )}
          {r.tags && r.tags.length > 0 && (
            <div className="tags" aria-label={tr("タグ")}>
              {r.tags.map((t) => (
                <Link key={t} href={`/?tag=${encodeURIComponent(t)}`} className="tag tag-plain">
                  #{t}
                </Link>
              ))}
            </div>
          )}

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
          <button type="button" className="btn-secondary btn-main" onClick={share}>
            {tr("画像にして送る")}
          </button>
          <Link href={`/compare?a=${r.id}`} className="btn-secondary btn-plain">
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
