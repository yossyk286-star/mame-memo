"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MultiChips, SingleChips } from "./ChipGroup";
import GlossarySheet from "./GlossarySheet";
import { putRecord, listRecords } from "@/lib/db";
import { FLAVORS, METHODS, PROCESSES, ROASTS, type GlossaryCategory } from "@/lib/glossary";
import { shrinkPhoto } from "@/lib/photo";
import type { RecordDraft, Score, TastingRecord } from "@/lib/types";

const SCORES: Score[] = [1, 2, 3, 4, 5];

function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
    overall: null,
    memo: "",
    photo: null,
  };
}

function HelpButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="help" aria-label={`${label}とは`} onClick={onClick}>
      ?
    </button>
  );
}

function RatingRow({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: Score | null;
  onChange: (v: Score | null) => void;
  required?: boolean;
}) {
  return (
    <div className="rating-row" role="group" aria-label={label}>
      <span className="label">
        {label}
        {required && <span className="req">必須</span>}
      </span>
      <div className="rating-btns">
        {SCORES.map((n) => (
          <button
            type="button"
            key={n}
            className="chip"
            aria-pressed={value === n}
            aria-label={`${label} ${n}`}
            onClick={() => onChange(value === n && !required ? null : n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RecordForm({
  initial,
  prefill,
  onSaved,
}: {
  initial?: TastingRecord;
  /** 新規作成時に先に入れておく値（メニュー読み取り結果など） */
  prefill?: Partial<RecordDraft>;
  /** 保存後の動き。なければ一覧（編集なら詳細）に戻る */
  onSaved?: (record: TastingRecord) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<RecordDraft>(() => initial ?? { ...emptyDraft(), ...prefill });
  const [sheet, setSheet] = useState<GlossaryCategory | null>(null);
  const [newFlavor, setNewFlavor] = useState("");
  const [shopNames, setShopNames] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof RecordDraft>(key: K, value: RecordDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // 過去に入れた店名を候補に出す
  useEffect(() => {
    listRecords().then((rs) => setShopNames([...new Set(rs.map((r) => r.shop).filter(Boolean))]));
  }, []);

  const photoURL = useMemo(() => (draft.photo ? URL.createObjectURL(draft.photo) : null), [draft.photo]);
  useEffect(() => () => void (photoURL && URL.revokeObjectURL(photoURL)), [photoURL]);

  const flavorOptions = [...FLAVORS, ...draft.flavors.filter((f) => !FLAVORS.includes(f))];

  function addFlavor() {
    const f = newFlavor.trim();
    if (f && !draft.flavors.includes(f)) set("flavors", [...draft.flavors, f]);
    setNewFlavor("");
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      set("photo", await shrinkPhoto(file));
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
          <input id="f-date" className="input" type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} required />
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
        <div className="field">
          <label className="label" htmlFor="f-origin">産地（国）</label>
          <input id="f-origin" className="input" placeholder="例：ケニア" value={draft.origin} onChange={(e) => set("origin", e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="f-farm">農園・品種名</label>
          <input id="f-farm" className="input" placeholder="例：〇〇農園 / SL28" value={draft.farm} onChange={(e) => set("farm", e.target.value)} />
        </div>

        <fieldset className="field">
          <legend className="label">
            焙煎度 <HelpButton label="焙煎度" onClick={() => setSheet("焙煎")} />
          </legend>
          <SingleChips options={ROASTS} value={draft.roast} onChange={(v) => set("roast", v)} />
        </fieldset>
        <fieldset className="field">
          <legend className="label">
            精製方法 <HelpButton label="精製方法" onClick={() => setSheet("精製")} />
          </legend>
          <SingleChips options={PROCESSES} value={draft.process} onChange={(v) => set("process", v)} />
        </fieldset>
        <fieldset className="field">
          <legend className="label">
            抽出方法 <HelpButton label="抽出方法" onClick={() => setSheet("抽出")} />
          </legend>
          <SingleChips options={METHODS} value={draft.method} onChange={(v) => set("method", v)} />
        </fieldset>
        <div className="row" style={{ gap: 24 }}>
          <fieldset className="field">
            <legend className="label">温度</legend>
            <SingleChips options={["ホット", "アイス"] as const} value={draft.temp} onChange={(v) => set("temp", v)} />
          </fieldset>
          <fieldset className="field">
            <legend className="label">飲み方</legend>
            <SingleChips options={["ブラック", "ミルク"] as const} value={draft.style} onChange={(v) => set("style", v)} />
          </fieldset>
        </div>

        <div className="field">
          <label className="label" htmlFor="f-menu">お店の説明</label>
          <input
            id="f-menu"
            className="input"
            placeholder="例：黄桃・アプリコット・ビターチョコ"
            value={draft.menuNote}
            onChange={(e) => set("menuNote", e.target.value)}
          />
        </div>
        <fieldset className="field">
          <legend className="label">
            感じた味 <HelpButton label="フレーバーの表現" onClick={() => setSheet("フレーバー")} />
          </legend>
          <MultiChips options={flavorOptions} value={draft.flavors} onChange={(v) => set("flavors", v)} />
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <label htmlFor="f-flavor" className="visually-hidden">ほかの味を追加</label>
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
          <RatingRow label="酸味" value={draft.acidity} onChange={(v) => set("acidity", v)} />
          <RatingRow label="苦味" value={draft.bitterness} onChange={(v) => set("bitterness", v)} />
          <RatingRow label="甘さ" value={draft.sweetness} onChange={(v) => set("sweetness", v)} />
          <RatingRow label="総合" value={draft.overall} onChange={(v) => set("overall", v)} required />
        </div>

        <div className="field">
          <label className="label" htmlFor="f-memo">メモ</label>
          <textarea
            id="f-memo"
            className="input"
            placeholder="気づいたこと、次に試したいこと"
            value={draft.memo}
            onChange={(e) => set("memo", e.target.value)}
          />
        </div>

        <div className="field">
          {photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoURL} alt="記録の写真" className="photo-preview" />
          )}
          <div className="row">
            <label className="btn-ghost" style={{ flex: 1 }}>
              {draft.photo ? "写真を変更" : "＋ 記録に写真を残す"}
              <input type="file" accept="image/*" onChange={onPhoto} className="visually-hidden" />
            </label>
            {draft.photo && (
              <button type="button" className="btn-secondary btn-danger" onClick={() => set("photo", null)}>
                写真を外す
              </button>
            )}
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

      {sheet && <GlossarySheet category={sheet} onClose={() => setSheet(null)} />}
    </>
  );
}
