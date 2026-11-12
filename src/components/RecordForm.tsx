"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { loadShopToday } from "@/lib/shopToday";
import { useRouter } from "next/navigation";
import { MultiChips, SingleChips } from "./ChipGroup";
import GlossarySheet from "./GlossarySheet";
import { RecordPreview, shortDate, stars, yen } from "./RecordCard";
import { toast } from "@/lib/toast";
import { announceBuddy, buddyLine } from "@/lib/buddy";
import { deleteWithUndo, putRecord, listRecords } from "@/lib/db";
import { clearStash, saveStash } from "@/lib/recordDraft";
import {
  METHODS,
  PROCESSES,
  ROASTS,
  type GlossaryCategory,
} from "@/lib/glossary";
import { today } from "@/lib/lastScan";
import { photosOf, shrinkPhotos } from "@/lib/photo";
import { emptyRecipe, GRINDS, hasRecipe } from "@/lib/recipe";
import { PhotoAddButton, PhotoRow } from "./PhotoAdd";
import type { Overall, Recipe, RecordDraft, Score, TastingRecord } from "@/lib/types";
import { tr, trv } from "@/lib/i18n";
import { askConfirm } from "@/components/ConfirmSheet";
import { reducedMotion, useFeatures } from "@/lib/features";
import { photoDate } from "@/lib/exif";
import { geoAllowed, here, nearbyShops, type LatLng } from "@/lib/geo";
import { cleanTag, DATE_CHIPS, flavorChoices, priceChoices, tagsUsed, VOLUMES } from "@/lib/quickPick";
import SpecScan from "./SpecScan";

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
    price: null,
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
      aria-label={tr("{0}とは", label)}
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
    <div className="rating-row" role="group" aria-label={tr("{0}（1={1}、5={2}）", label, low, high)}>
      <span className="label">{trv(label)}</span>
      <div className="rating-scale">
        <div className="rating-btns">
          {SCORES.map((n) => (
            <button
              type="button"
              key={n}
              className="chip"
              aria-pressed={value === n}
              aria-label={`${tr(label)} ${n}`}
              onClick={() => onChange(value === n ? null : n)}
            >
              {trv(n)}
            </button>
          ))}
        </div>
        <div className="rating-ends" aria-hidden="true">
          <span>{trv(low)}</span>
          <span>{trv(high)}</span>
        </div>
      </div>
    </div>
  );
}

/** 数字だけの入力。全角やカンマが混ざっても数字だけ取り出す */
function NumberField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="field" style={{ flex: 1, minWidth: 0 }}>
      <label className="label" htmlFor={id}>
        {trv(label)}
      </label>
      <input
        id={id}
        className="input"
        inputMode="numeric"
        placeholder={trv(placeholder)}
        value={value ?? ""}
        onChange={(e) => {
          const digits = e.target.value.normalize("NFKC").replace(/\D/g, "");
          onChange(digits ? Number(digits) : null);
        }}
      />
    </div>
  );
}

/** 家で淹れたときの豆の量・お湯・温度・挽き目・時間 */
function RecipeFields({ value, onChange }: { value: Recipe; onChange: (r: Recipe) => void }) {
  const set = <K extends keyof Recipe>(key: K, v: Recipe[K]) => onChange({ ...value, [key]: v });
  return (
    <div className="recipe-fields">
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <NumberField id="f-dose" label={tr("豆（g）")} placeholder="15" value={value.dose} onChange={(v) => set("dose", v)} />
        <NumberField id="f-water" label={tr("お湯（ml）")} placeholder="240" value={value.water} onChange={(v) => set("water", v)} />
        <NumberField id="f-tempc" label={tr("湯温（℃）")} placeholder="92" value={value.tempC} onChange={(v) => set("tempC", v)} />
      </div>
      <fieldset className="field">
        <legend className="label">{tr("挽き目")}</legend>
        <SingleChips options={GRINDS} value={value.grind} onChange={(v) => set("grind", v)} />
      </fieldset>
      <div className="field">
        <label className="label" htmlFor="f-time">
          {tr("抽出時間")}
        </label>
        <input id="f-time" className="input" placeholder={tr("例：2:30")} value={value.time} onChange={(e) => set("time", e.target.value)} />
      </div>
    </div>
  );
}

/** 総合の評価。★の左半分をタップで 0.5、右半分で 1。0.5 きざみで選ぶ */
function StarRating({
  value,
  onChange,
  missing = false,
}: {
  value: Overall | null;
  onChange: (v: Overall) => void;
  /** 入れ忘れて保存しようとしたとき */
  missing?: boolean;
}) {
  // ★を押すたびに左から順に灯す（25）。数字は回して入れ替える（22）
  const [wave, setWave] = useState(0);
  return (
    <div className="field" data-missing={missing ? "" : undefined} id="f-overall-field">
      <span className="label" id="f-overall">
        {tr("総合")}{" "}<span className="req">{tr("必須")}</span>
      </span>
      <div className="star-rating" role="radiogroup" aria-labelledby="f-overall" data-wave={wave ? (wave % 2 ? "a" : "b") : undefined}>
        {SCORES.map((n) => {
          const fill = value ? Math.max(0, Math.min(1, value - n + 1)) : 0;
          return (
            <span key={n} className={`star-cell${fill > 0 ? " on" : ""}`} style={{ "--i": n - 1 } as CSSProperties}>
              <span className="star" aria-hidden="true" style={{ "--f": `${fill * 100}%` } as CSSProperties}>
                ★
              </span>
              {([n - 0.5, n] as Overall[]).map((v) => (
                <button
                  type="button"
                  key={v}
                  role="radio"
                  aria-checked={value === v}
                  aria-label={`★${v}`}
                  onClick={() => {
                    setWave((w) => w + 1);
                    onChange(v);
                  }}
                />
              ))}
            </span>
          );
        })}
        <span className={`star-rating-num${value ? "" : " is-empty"}`} aria-hidden="true">
          {value ? <RollNum text={value.toFixed(1)} /> : tr("左半分で0.5")}
        </span>
      </div>
      {missing && <p className="error field-msg">{tr("総合の評価を選んでください")}</p>}
    </div>
  );
}

/** 数字が変わったとき、上から回ってきて入れ替わる（22）。設定で止められる */
function RollNum({ text }: { text: string }) {
  const { numRoll } = useFeatures();
  return (
    <span className="roll" key={numRoll ? text : undefined} data-roll={numRoll ? "" : undefined}>
      {text}
    </span>
  );
}

export default function RecordForm({
  initial,
  prefill,
  beanFilled = false,
  fromWish = false,
  autosave = false,
  resumed = false,
  onSaved,
}: {
  initial?: TastingRecord;
  /** 新規作成時に先に入れておく値（メニュー読み取り結果など） */
  prefill?: Partial<RecordDraft>;
  /** 豆の情報が読み取りで入っているとき true。感想を先に出し、豆の情報はたたむ */
  beanFilled?: boolean;
  /** 気になるリストの豆を記録するとき true（相棒が「ついに飲めたね」と言う） */
  fromWish?: boolean;
  /** 保存後の動き。なければ一覧（編集なら詳細）に戻る */
  onSaved?: (record: TastingRecord) => void;
  /** 入力のたびに書きかけとして残す（新しい記録の画面で、前の書きかけが残っていないとき） */
  autosave?: boolean;
  /** 書きかけの続きを開いたとき true（開いた時点から書きかけとして残す） */
  resumed?: boolean;
}) {
  const router = useRouter();

  async function remove() {
    if (!initial) return;
    const ok = await askConfirm({
      preview: <RecordPreview record={initial} />,
      message: tr("この記録を削除しますか？"),
      action: tr("削除"),
    });
    if (!ok) return;
    await deleteWithUndo(initial);
    router.replace("/");
  }
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
  // 保存できたら、ボタンが ✓ に縮んでから移る（9）
  const [done, setDone] = useState(false);
  // 入れ忘れた必須の欄（28）
  const [missing, setMissing] = useState<"shop" | "overall" | null>(null);
  const features = useFeatures();
  const show = (field: string) => !features.hidden.includes(field);
  // 写真の撮った日を日付に入れたとき、元の日付（「今日にする」で戻す）
  const [dateFromPhoto, setDateFromPhoto] = useState<string | null>(null);
  // いまいる場所（近くの前に行ったお店・保存するときに記録へ残す）
  const [geo, setGeo] = useState<LatLng | null>(null);
  const [nearby, setNearby] = useState<{ shop: string; m: number }[] | null>(null);
  // 前に位置を許可していれば、聞かずに場所を取っておく
  useEffect(() => {
    if (initial) return;
    geoAllowed().then((ok) => {
      if (ok) here().then(setGeo);
    });
  }, [initial]);

  async function findNearby() {
    const at = geo ?? (await here());
    if (!at) {
      toast("場所がわかりませんでした（位置情報の許可を確かめてください）", { tone: "warn" });
      return;
    }
    setGeo(at);
    setNearby(nearbyShops(past, at));
  }
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

  // 自分で何か入れたら true（開いただけの読み取り結果などは書きかけとして残さない）
  const touched = useRef(resumed);
  const update = (fn: (d: RecordDraft) => RecordDraft) => {
    touched.current = true;
    setDraft(fn);
  };
  const set = <K extends keyof RecordDraft>(key: K, value: RecordDraft[K]) =>
    update((d) => ({ ...d, [key]: value }));

  // 書きかけを残す（新しい記録の画面だけ）。前の書きかけが残っている間は上書きしない
  useEffect(() => {
    if (!autosave || initial || !touched.current) return;
    const t = setTimeout(() => saveStash(draft), 300);
    return () => clearTimeout(t);
  }, [draft, initial, autosave]);

  // 前に飲んだ豆の名前（農園・品種名）を候補に出す。同じ名前を選んだら産地なども入れて、前回の★を見せる
  const [past, setPast] = useState<TastingRecord[]>([]);
  const pastNames = [...new Set(past.map((r) => r.farm.trim()).filter(Boolean))];
  const sameName = (a: string, b: string) => a.trim().normalize("NFKC").toLowerCase() === b.trim().normalize("NFKC").toLowerCase();
  const before = draft.farm.trim() ? past.filter((r) => r.id !== initial?.id && sameName(r.farm, draft.farm)) : [];

  function setFarm(farm: string) {
    const hit = initial ? undefined : past.find((r) => sameName(r.farm, farm));
    update((d) => {
      // 自分で入れた産地・焙煎度・精製があれば、そちらを優先する
      if (!hit || d.origin || d.roast || d.process) return { ...d, farm };
      return { ...d, farm, origin: hit.origin, roast: hit.roast, process: hit.process };
    });
  }

  // 過去に入れた店名を候補に出す
  useEffect(() => {
    listRecords().then((rs) => {
      setPast(rs);
      setShopNames([...new Set(rs.map((r) => r.shop).filter(Boolean))]);
      // 調べる画面で今日のお店を入れてあればその名前、なければ今日すでに記録した店を、新しい記録の店名に先に入れておく
      const latest = rs[0];
      const shop = loadShopToday() || (latest?.date === today() ? latest.shop : "");
      if (!initial && shop) setDraft((d) => (d.shop ? d : { ...d, shop }));
    });
  }, [initial]);

  // 焙煎度ごとの言葉を、自分がよく選ぶ順に（2）
  const flavorBase = useMemo(() => flavorChoices(draft.roast, past), [draft.roast, past]);
  const flavorOptions = [
    ...flavorBase,
    ...draft.flavors.filter((f) => !flavorBase.includes(f)),
  ];
  const prices = useMemo(() => priceChoices(past, draft.shop), [past, draft.shop]);
  const allTags = useMemo(() => tagsUsed(past), [past]);
  const [newTag, setNewTag] = useState("");
  function addTag() {
    const t = cleanTag(newTag);
    if (t && !(draft.tags ?? []).includes(t)) set("tags", [...(draft.tags ?? []), t]);
    setNewTag("");
  }

  function addFlavor() {
    const f = newFlavor.trim();
    if (f && !draft.flavors.includes(f)) set("flavors", [...draft.flavors, f]);
    setNewFlavor("");
  }

  async function onPhotos(files: FileList | null) {
    try {
      // 新しい記録で、写真の撮った日が今日でなければ、日付をその日にする（47）
      const first = files?.[0];
      if (!initial && first && draft.photos.length === 0) {
        const d = await photoDate(first);
        if (d && d !== draft.date && d <= today()) {
          setDateFromPhoto(draft.date);
          update((x) => ({ ...x, date: d }));
        }
      }
      const added = await shrinkPhotos(files);
      update((d) => ({ ...d, photos: [...d.photos, ...added] }));
    } catch {
      setError("写真を読み込めませんでした");
    }
  }

  /** 入れ忘れた欄を赤くして、見えるところまで動かす */
  function flagMissing(field: "shop" | "overall") {
    setMissing(null);
    // 同じ欄でもう一度押したときも揺らすため、いったん外してから付ける
    requestAnimationFrame(() => setMissing(field));
    document.getElementById(field === "shop" ? "f-shop" : "f-overall-field")?.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
  }

  async function save() {
    if (!draft.shop.trim()) return flagMissing("shop");
    if (!draft.overall) return flagMissing("overall");
    setMissing(null);
    setError("");
    setSaving(true);
    const now = Date.now();
    const record: TastingRecord = {
      ...draft,
      recipe: hasRecipe(draft.recipe) ? draft.recipe : undefined,
      shop: draft.shop.trim(),
      overall: draft.overall,
      id: initial?.id ?? crypto.randomUUID(),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
      // 家で飲んだときは場所を残さない
      ...(!initial && geo && draft.shop.trim() !== "家" ? { geo } : {}),
    };
    await putRecord(record);
    if (autosave && !initial) clearStash();
    // 上のカプセルで知らせる（画面を移っても残るので、待たずにすぐ移る）
    toast("保存しました");
    // 新しい記録のときだけ、相棒がひとこと言う
    if (!initial) listRecords().then((all) => announceBuddy(buddyLine(record, all, { fromWish })));
    if (!reducedMotion()) {
      setDone(true);
      await new Promise((r) => setTimeout(r, 450));
    }
    if (onSaved) {
      setDone(false);
      setSaving(false);
      return onSaved(record);
    }
    router.replace(initial ? `/record?id=${record.id}` : "/");
  }

  const overallField = (
    <StarRating value={draft.overall} missing={missing === "overall"} onChange={(v) => {
      if (missing === "overall") setMissing(null);
      set("overall", v);
    }} />
  );

  const nameFields = (
    <>
      <div className="field">
        <label className="label" htmlFor="f-origin">
          {tr("産地（国）")}
        </label>
        <input
          id="f-origin"
          className="input"
          placeholder={tr("例：ケニア")}
          value={draft.origin}
          onChange={(e) => set("origin", e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="f-farm">
          {tr("農園・品種名")}
        </label>
        <input
          id="f-farm"
          className="input"
          placeholder={tr("例：〇〇農園 / SL28")}
          list="farm-names"
          value={draft.farm}
          onChange={(e) => setFarm(e.target.value)}
        />
        <datalist id="farm-names">
          {pastNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        {before.length > 0 && (
          <p className="muted past-note">
            {tr("前に飲んだ：{0}・{1}・{2}", stars(before[0].overall), shortDate(before[0].date), before[0].shop)}
            {before.length > 1 && tr("（ほか{0}回）", before.length - 1)}
          </p>
        )}
      </div>
    </>
  );

  const beanFields = (
    <>
      {nameFields}

      <fieldset className="field">
        <legend className="label">
          {tr("焙煎度")}{" "}<HelpButton label={tr("焙煎度")} onClick={() => setSheet("焙煎")} />
        </legend>
        <SingleChips
          options={ROASTS}
          value={draft.roast}
          onChange={(v) => set("roast", v)}
        />
      </fieldset>
      {show("process") && <fieldset className="field">
        <legend className="label">
          {tr("精製方法")}{" "}
          <HelpButton label={tr("精製方法")} onClick={() => setSheet("精製")} />
        </legend>
        <SingleChips
          options={PROCESSES}
          value={draft.process}
          onChange={(v) => set("process", v)}
        />
      </fieldset>}
      {show("menuNote") && <div className="field">
        <label className="label" htmlFor="f-menu">
          {tr("お店の説明")}
        </label>
        <input
          id="f-menu"
          className="input"
          placeholder={tr("例：黄桃・アプリコット・ビターチョコ")}
          value={draft.menuNote}
          onChange={(e) => set("menuNote", e.target.value)}
        />
      </div>}
      {show("sweets") && <div className="field">
        <label className="label" htmlFor="f-sweets">
          {tr("合うスイーツ")}
        </label>
        <input
          id="f-sweets"
          className="input"
          placeholder={tr("例：チーズケーキ")}
          value={draft.sweets ?? ""}
          onChange={(e) => set("sweets", e.target.value)}
        />
      </div>}
    </>
  );

  const tasteFields = (
    <>
      {overallField}
      {show("method") && <fieldset className="field">
        <legend className="label">
          {tr("抽出方法")}{" "}
          <HelpButton label={tr("抽出方法")} onClick={() => setSheet("抽出")} />
        </legend>
        <SingleChips
          options={METHODS}
          value={draft.method}
          onChange={(v) => set("method", v)}
        />
      </fieldset>}
      {/* 家で淹れたときだけ使うので、店で飲んだ記録ではたたんでおく */}
      {show("recipe") && <details className="bean-details" open={draft.shop.trim() === "家" || hasRecipe(draft.recipe)}>
        <summary>{tr("家で淹れたレシピ（豆の量・お湯・挽き目）")}</summary>
        <RecipeFields value={draft.recipe ?? emptyRecipe()} onChange={(r) => set("recipe", r)} />
      </details>}
      <div className="row" style={{ gap: 24 }}>
        {show("temp") && <fieldset className="field">
          <legend className="label">{tr("温度")}</legend>
          <SingleChips
            options={["ホット", "アイス"] as const}
            value={draft.temp}
            onChange={(v) => set("temp", v)}
          />
        </fieldset>}
        {show("style") && <fieldset className="field">
          <legend className="label">{tr("飲み方")}</legend>
          <SingleChips
            options={["ブラック", "ミルク"] as const}
            value={draft.style}
            onChange={(v) => set("style", v)}
          />
        </fieldset>}
      </div>

      {show("flavors") && <fieldset className="field">
        <legend className="label">
          {tr("感じた味")}{" "}
          <HelpButton
            label={tr("フレーバーの表現")}
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
            {tr("ほかの味を追加")}
          </label>
          <input
            id="f-flavor"
            className="input"
            placeholder={tr("ほかの味を追加")}
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
            {tr("追加")}
          </button>
        </div>
      </fieldset>}

      {show("ratings") && <div className="ratings">
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
      </div>}
      {show("price") && <div className="field">
        <label className="label" htmlFor="f-price">
          {tr("値段（1杯・円）")}
        </label>
        <input
          id="f-price"
          className="input"
          inputMode="numeric"
          placeholder={tr("例：650")}
          value={draft.price ?? ""}
          onChange={(e) => {
            // 全角数字やカンマ入りでも数字だけ取り出す
            const digits = e.target.value.normalize("NFKC").replace(/\D/g, "");
            set("price", digits ? Number(digits) : null);
          }}
        />
        {/* よく入れる値段と、このお店で前に入れた値段。± で100円ずつ（54） */}
        <div className="chip-wrap quick-chips" role="group" aria-label={tr("よく入れる値段")}>
          {prices.map((p) => (
            <button key={p} type="button" className="chip" aria-pressed={draft.price === p} onClick={() => set("price", draft.price === p ? null : p)}>
              {yen(p)}
            </button>
          ))}
          <button type="button" className="chip step-chip" aria-label={tr("100円下げる")} disabled={!draft.price} onClick={() => set("price", Math.max(0, (draft.price ?? 0) - 100) || null)}>
            −
          </button>
          <button type="button" className="chip step-chip" aria-label={tr("100円上げる")} onClick={() => set("price", (draft.price ?? 0) + 100)}>
            ＋
          </button>
        </div>
      </div>}
      {/* 飲んだ量。1日のカフェインの計算に使う（32） */}
      <fieldset className="field">
        <legend className="label">{tr("飲んだ量")}</legend>
        <div className="chip-wrap" role="group">
          {VOLUMES.map(([label, ml]) => (
            <button key={label} type="button" className="chip" aria-pressed={draft.ml === ml} onClick={() => set("ml", draft.ml === ml ? null : ml)}>
              {tr(label)}
              <small className="muted">{` ${ml}ml`}</small>
            </button>
          ))}
        </div>
      </fieldset>
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
            {tr("日付")}{" "}<span className="req">{tr("必須")}</span>
          </label>
          <input
            id="f-date"
            className="input"
            type="date"
            value={draft.date}
            onChange={(e) => {
              setDateFromPhoto(null);
              set("date", e.target.value);
            }}
            required
          />
          {/* 今日・きのう・おとといは1タップで（61） */}
          <div className="chip-wrap date-chips" role="group" aria-label={tr("日付をすばやく選ぶ")}>
            {DATE_CHIPS.map(([label, get]) => (
              <button
                key={label}
                type="button"
                className="chip"
                aria-pressed={draft.date === get()}
                onClick={() => {
                  setDateFromPhoto(null);
                  set("date", get());
                }}
              >
                {tr(label)}
              </button>
            ))}
          </div>
          {dateFromPhoto && (
            <p className="muted field-note">
              {tr("写真を撮った日にしました。")}
              <button type="button" className="text-btn" onClick={() => {
                set("date", dateFromPhoto);
                setDateFromPhoto(null);
              }}>
                {tr("今日にする")}
              </button>
            </p>
          )}
        </div>
        <div className="field" data-missing={missing === "shop" ? "" : undefined}>
          <label className="label" htmlFor="f-shop">
            {tr("どこで飲んだ")}{" "}<span className="req">{tr("必須")}</span>
          </label>
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <input
              id="f-shop"
              className="input"
              list="shop-names"
              placeholder={tr("店名（例：〇〇珈琲）")}
              value={draft.shop}
              aria-invalid={missing === "shop" ? true : undefined}
              onChange={(e) => {
                if (missing === "shop") setMissing(null);
                set("shop", e.target.value);
              }}
            />
            {/* 家で淹れたときは店名の代わりに「家」 */}
            <button
              type="button"
              className="chip"
              style={{ flexShrink: 0 }}
              aria-pressed={draft.shop.trim() === "家"}
              onClick={() => {
                if (missing === "shop") setMissing(null);
                set("shop", draft.shop.trim() === "家" ? "" : "家");
              }}
            >
              {tr("家で")}
            </button>
          </div>
          {missing === "shop" && <p className="error field-msg">{tr("店名を入れるか「家で」を選んでください")}</p>}
          {/* 近くで前に記録したお店（48）。押したときだけ場所を使う */}
          {!initial && !draft.shop.trim() && (
            nearby === null ? (
              <button type="button" className="text-btn near-btn" onClick={findNearby}>
                {tr("📍 近くの前に行ったお店")}
              </button>
            ) : nearby.length > 0 ? (
              <div className="chip-wrap" role="group" aria-label={tr("近くの前に行ったお店")}>
                {nearby.slice(0, 5).map((n) => (
                  <button key={n.shop} type="button" className="chip" onClick={() => set("shop", n.shop)}>
                    {trv(n.shop)}
                    <small className="muted">{` ${n.m}m`}</small>
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted field-note">{tr("近くで記録したお店はまだありません。これから記録すると場所も残ります。")}</p>
            )
          )}
          <datalist id="shop-names">
            {shopNames.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="mode-switch" role="group" aria-label={tr("入力の量")}>
          {(["かんたん", "くわしく"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              {trv(m)}
            </button>
          ))}
        </div>
        {mode === "かんたん" ? (
          <>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {tr("豆の名前と★だけで保存できます。味や淹れ方はあとから編集で足せます。")}
            </p>
            {!beanFilled && nameFields}
            {overallField}
          </>
        ) : beanFilled ? (
          <>
            {tasteFields}
            {/* 読み取り済みの豆の情報は、直したいときだけ開く */}
            <details className="bean-details">
              <summary>{tr("豆の情報（読み取り済み・タップで直せます）")}</summary>
              {beanFields}
            </details>
          </>
        ) : (
          <>
            {beanFields}
            {tasteFields}
          </>
        )}
        {mode === "くわしく" && (
          <fieldset className="field">
            <legend className="label">{tr("タグ")}</legend>
            {/* 自分のタグ（11）。これまでに付けたものは押すだけ */}
            {(allTags.length > 0 || (draft.tags ?? []).length > 0) && (
              <MultiChips
                options={[...allTags, ...(draft.tags ?? []).filter((t) => !allTags.includes(t))]}
                value={draft.tags ?? []}
                onChange={(v) => set("tags", v)}
                format={(t) => `#${t}`}
              />
            )}
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <label htmlFor="f-tag" className="visually-hidden">
                {tr("タグを足す")}
              </label>
              <input
                id="f-tag"
                className="input"
                placeholder={tr("＃ タグを足す（例：京都旅行）")}
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <button type="button" className="btn-secondary" onClick={addTag}>
                {tr("追加")}
              </button>
            </div>
          </fieldset>
        )}
        {mode === "くわしく" && (
          <SpecScan specs={draft.specs ?? []} onChange={(specs) => set("specs", specs)} />
        )}
        {show("memo") && <div className="field">
          <label className="label" htmlFor="f-memo">
            {tr("メモ")}
          </label>
          <textarea
            id="f-memo"
            className="input"
            placeholder={tr("気づいたこと、次に試したいこと")}
            value={draft.memo}
            onChange={(e) => set("memo", e.target.value)}
          />
        </div>}

        {show("photos") && <div className="field">
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
                  ? tr("＋ 写真をもっと追加")
                  : tr("＋ 記録に写真を残す")
              }
              onFiles={onPhotos}
            />
          </div>
        </div>}

        {error && (
          <p className="error" role="alert">
            {trv(error)}
          </p>
        )}

        {/* 削除はめったに使わないので、詳細画面ではなく編集のいちばん下に離して置く */}
        {initial && (
          <button type="button" className="btn-secondary btn-danger" onClick={remove}>
            {tr("この記録を削除")}
          </button>
        )}

        <div className="save-bar">
          <button type="submit" className={`btn-primary save-btn${done ? " is-done" : ""}`} disabled={saving} aria-live="polite">
            {done ? <span aria-label={tr("保存しました")}>✓</span> : saving ? tr("保存中…") : tr("保存する")}
          </button>
        </div>
      </form>

      {sheet && (
        <GlossarySheet category={sheet} onClose={() => setSheet(null)} />
      )}
    </>
  );
}
