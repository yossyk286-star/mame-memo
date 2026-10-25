"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MultiChips, SingleChips } from "./ChipGroup";
import GlossarySheet from "./GlossarySheet";
import { putRecord, listRecords } from "@/lib/db";
import {
  FLAVORS,
  METHODS,
  PROCESSES,
  ROASTS,
  type GlossaryCategory,
} from "@/lib/glossary";
import { today } from "@/lib/lastScan";
import { photosOf, shrinkPhotos } from "@/lib/photo";
import { PhotoAddButton, PhotoRow } from "./PhotoAdd";
import type { RecordDraft, Score, TastingRecord } from "@/lib/types";

const SCORES: Score[] = [1, 2, 3, 4, 5];

/** 味の評価の項目と、1・5 がそれぞれどちら寄りか */
const RATINGS: [
  "acidity" | "bitterness" | "sweetness" | "body" | "aroma",
  string,
  string,
  string,
][] = [
  ["acidity", "酸味", "穏やか", "強い"],
  ["bitterness", "苦味", "弱い", "強い"],
  ["sweetness", "甘さ", "控えめ", "甘い"],
  ["body", "コク", "軽い", "重い"],
  ["aroma", "香り", "控えめ", "華やか"],
];

/** 入力の量。かんたん＝豆の名前と★だけ、くわしく＝全部 */
type FormMode = "かんたん" | "くわしく";
const MODE_KEY = "mame-memo:form-mode";

function loadMode(): FormMode | null {
  try {
    const m = localStorage.getItem(MODE_KEY);
    return m === "かんたん" || m === "くわしく" ? m : null;
  } catch {
    return null;
  }
}

function emptyDraft(): RecordDraft {
  return {
    date: today(),
    shop: "",
    origin: "",
    farm: "",
    roast: null,
    process: null,
    method: null,
    temp: null,
    style: null,
    menuNote: "",
    flavors: [],
    acidity: null,
    bitterness: null,
    sweetness: null,
    body: null,
    aroma: null,
    overall: null,
    memo: "",
    photos: [],
  };
}

function HelpButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="help"
      aria-label={`${label}とは`}
      onClick={onClick}
    >
      ?
    </button>
  );
}

/** 1〜5 のボタン。下に「1 がどういう意味か・5 がどういう意味か」を出す */
function RatingRow({
  label,
  low,
  high,
  value,
  onChange,
}: {
  label: string;
  low: string;
  high: string;
  value: Score | null | undefined;
  onChange: (v: Score | null) => void;
}) {
  return (
    <div className="rating-row" role="group" aria-label={`${label}（1=${low}、5=${high}）`}>
      <span className="label">{label}</span>
      <div className="rating-scale">
        <div className="rating-btns">
          {SCORES.map((n) => (
            <button
              type="button"
              key={n}
              className="chip"
              aria-pressed={value === n}
              aria-label={`${label} ${n}`}
              onClick={() => onChange(value === n ? null : n)}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="rating-ends" aria-hidden="true">
          <span>{low}</span>
          <span>{high}</span>
        </div>
      </div>
    </div>
  );
}

/** 総合の評価。★をタップして選ぶ */
function StarRating({
  value,
  onChange,
}: {
  value: Score | null;
  onChange: (v: Score) => void;
}) {
  return (
    <div className="field">
      <span className="label" id="f-overall">
        総合 <span className="req">必須</span>
      </span>
      <div className="star-rating" role="radiogroup" aria-labelledby="f-overall">
        {SCORES.map((n) => (
          <button
            type="button"
            key={n}
            role="radio"
            aria-checked={value === n}
            aria-label={`★${n}`}
            className={value && n <= value ? "on" : ""}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RecordForm({
  initial,
  prefill,
  beanFilled = false,
  onSaved,
}: {
  initial?: TastingRecord;
  /** 新規作成時に先に入れておく値（メニュー読み取り結果など） */
  prefill?: Partial<RecordDraft>;
  /** 豆の情報が読み取りで入っているとき true。感想を先に出し、豆の情報はたたむ */
  beanFilled?: boolean;
  /** 保存後の動き。なければ一覧（編集なら詳細）に戻る */
  onSaved?: (record: TastingRecord) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<RecordDraft>(() =>
    initial
      ? { ...initial, photos: photosOf(initial), photo: null }
      : { ...emptyDraft(), ...prefill },
  );
  const [sheet, setSheet] = useState<GlossaryCategory | null>(null);
  const [newFlavor, setNewFlavor] = useState("");
  const [shopNames, setShopNames] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  // 編集はふだん全部の項目を見たいので「くわしく」から。新規は前に選んだほう
  const [mode, setModeState] = useState<FormMode>("くわしく");
  useEffect(() => {
    if (!initial) setModeState(loadMode() ?? "くわしく");
  }, [initial]);
  function setMode(m: FormMode) {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {}
  }

  const set = <K extends keyof RecordDraft>(key: K, value: RecordDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // 過去に入れた店名を候補に出す
  useEffect(() => {
    listRecords().then((rs) => {
      setShopNames([...new Set(rs.map((r) => r.shop).filter(Boolean))]);
      // 今日すでに記録した店があれば、新しい記録の店名に先に入れておく
      const latest = rs[0];
      if (!initial && latest?.date === today())
        setDraft((d) => (d.shop ? d : { ...d, shop: latest.shop }));
    });
  }, [initial]);

  const flavorOptions = [
    ...FLAVORS,
    ...draft.flavors.filter((f) => !FLAVORS.includes(f)),
  ];

  function addFlavor() {
    const f = newFlavor.trim();
    if (f && !draft.flavors.includes(f)) set("flavors", [...draft.flavors, f]);
    setNewFlavor("");
  }

  async function onPhotos(files: FileList | null) {
    try {
      const added = await shrinkPhotos(files);
      setDraft((d) => ({ ...d, photos: [...d.photos, ...added] }));
    } catch {
      setError("写真を読み込めませんでした");
    }
  }

  async function save() {
    if (!draft.shop.trim()) return setError("店名を入れてください");
    if (!draft.overall) return setError("総合の評価を選んでください");
    setError("");
    setSaving(true);
    const now = Date.now();
    const record: TastingRecord = {
      ...draft,
      shop: draft.shop.trim(),
      overall: draft.overall,
      id: initial?.id ?? crypto.randomUUID(),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    await putRecord(record);
    if (onSaved) return onSaved(record);
    router.replace(initial ? `/record?id=${record.id}` : "/");
  }

  const overallField = (
    <StarRating value={draft.overall} onChange={(v) => set("overall", v)} />
  );

  const nameFields = (
    <>
      <div className="field">
        <label className="label" htmlFor="f-origin">
          産地（国）
        </label>
        <input
          id="f-origin"
          className="input"
          placeholder="例：ケニア"
          value={draft.origin}
          onChange={(e) => set("origin", e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="f-farm">
          農園・品種名
        </label>
        <input
          id="f-farm"
          className="input"
          placeholder="例：〇〇農園 / SL28"
          value={draft.farm}
          onChange={(e) => set("farm", e.target.value)}
        />
      </div>
    </>
  );

  const beanFields = (
    <>
      {nameFields}

      <fieldset className="field">
        <legend className="label">
          焙煎度 <HelpButton label="焙煎度" onClick={() => setSheet("焙煎")} />
        </legend>
        <SingleChips
          options={ROASTS}
          value={draft.roast}
          onChange={(v) => set("roast", v)}
        />
      </fieldset>
      <fieldset className="field">
        <legend className="label">
          精製方法{" "}
          <HelpButton label="精製方法" onClick={() => setSheet("精製")} />
        </legend>
        <SingleChips
          options={PROCESSES}
          value={draft.process}
          onChange={(v) => set("process", v)}
        />
      </fieldset>
      <div className="field">
        <label className="label" htmlFor="f-menu">
          お店の説明
        </label>
        <input
          id="f-menu"
          className="input"
          placeholder="例：黄桃・アプリコット・ビターチョコ"
          value={draft.menuNote}
          onChange={(e) => set("menuNote", e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="f-sweets">
          合うスイーツ
        </label>
        <input
          id="f-sweets"
          className="input"
          placeholder="例：チーズケーキ"
          value={draft.sweets ?? ""}
          onChange={(e) => set("sweets", e.target.value)}
        />
      </div>
    </>
  );

  const tasteFields = (
    <>
      {overallField}
      <fieldset className="field">
        <legend className="label">
          抽出方法{" "}
          <HelpButton label="抽出方法" onClick={() => setSheet("抽出")} />
        </legend>
        <SingleChips
          options={METHODS}
          value={draft.method}
          onChange={(v) => set("method", v)}
        />
      </fieldset>
      <div className="row" style={{ gap: 24 }}>
        <fieldset className="field">
          <legend className="label">温度</legend>
          <SingleChips
            options={["ホット", "アイス"] as const}
            value={draft.temp}
            onChange={(v) => set("temp", v)}
          />
        </fieldset>
        <fieldset className="field">
          <legend className="label">飲み方</legend>
          <SingleChips
            options={["ブラック", "ミルク"] as const}
            value={draft.style}
            onChange={(v) => set("style", v)}
          />
        </fieldset>
      </div>

      <fieldset className="field">
        <legend className="label">
          感じた味{" "}
          <HelpButton
            label="フレーバーの表現"
            onClick={() => setSheet("フレーバー")}
          />
        </legend>
        <MultiChips
          options={flavorOptions}
          value={draft.flavors}
          onChange={(v) => set("flavors", v)}
        />
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <label htmlFor="f-flavor" className="visually-hidden">
            ほかの味を追加
          </label>
          <input
            id="f-flavor"
            className="input"
            placeholder="ほかの味を追加"
            value={newFlavor}
            onChange={(e) => setNewFlavor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                addFlavor();
              }
            }}
          />
          <button type="button" className="btn-secondary" onClick={addFlavor}>
            追加
          </button>
        </div>
      </fieldset>

      <div className="ratings">
        {RATINGS.map(([key, label, low, high]) => (
          <RatingRow
            key={key}
            label={label}
            low={low}
            high={high}
            value={draft[key]}
            onChange={(v) => set(key, v)}
          />
        ))}
      </div>
    </>
  );

  return (
    <>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="field">
          <label className="label" htmlFor="f-date">
            日付 <span className="req">必須</span>
          </label>
          <input
            id="f-date"
            className="input"
            type="date"
            value={draft.date}
            onChange={(e) => set("date", e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="f-shop">
            店名 <span className="req">必須</span>
          </label>
          <input
            id="f-shop"
            className="input"
            list="shop-names"
            placeholder="例：〇〇珈琲"
            value={draft.shop}
            onChange={(e) => set("shop", e.target.value)}
          />
          <datalist id="shop-names">
            {shopNames.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="mode-switch" role="group" aria-label="入力の量">
          {(["かんたん", "くわしく"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
        {mode === "かんたん" ? (
          <>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              豆の名前と★だけで保存できます。味や淹れ方はあとから編集で足せます。
            </p>
            {!beanFilled && nameFields}
            {overallField}
          </>
        ) : beanFilled ? (
          <>
            {tasteFields}
            {/* 読み取り済みの豆の情報は、直したいときだけ開く */}
            <details className="bean-details">
              <summary>豆の情報（読み取り済み・タップで直せます）</summary>
              {beanFields}
            </details>
          </>
        ) : (
          <>
            {beanFields}
            {tasteFields}
          </>
        )}
        <div className="field">
          <label className="label" htmlFor="f-memo">
            メモ
          </label>
          <textarea
            id="f-memo"
            className="input"
            placeholder="気づいたこと、次に試したいこと"
            value={draft.memo}
            onChange={(e) => set("memo", e.target.value)}
          />
        </div>

        <div className="field">
          <PhotoRow
            photos={draft.photos}
            onRemove={(i) =>
              set(
                "photos",
                draft.photos.filter((_, k) => k !== i),
              )
            }
          />
          <div className="row">
            <PhotoAddButton
              label={
                draft.photos.length > 0
                  ? "＋ 写真をもっと追加"
                  : "＋ 記録に写真を残す"
              }
              onFiles={onPhotos}
            />
          </div>
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="save-bar">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "保存中…" : "保存する"}
          </button>
        </div>
      </form>

      {sheet && (
        <GlossarySheet category={sheet} onClose={() => setSheet(null)} />
      )}
    </>
  );
}
