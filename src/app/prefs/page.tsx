"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MultiChips } from "@/components/ChipGroup";
import { FLAVORS, METHODS, PROCESSES, ROASTS } from "@/lib/glossary";
import { EMPTY_PREFS, loadPrefs, savePrefs, type MyPrefs } from "@/lib/prefs";

const ROAST_OPTIONS = ROASTS.filter((r) => r !== "不明");
const PROCESS_OPTIONS = PROCESSES.filter((p) => p !== "不明" && p !== "その他");
const METHOD_OPTIONS = METHODS.filter((m) => m !== "その他");
const WAY_OPTIONS = ["ホット", "アイス", "ブラック", "ミルク"];

/** 味の寄り方。1〜5 を選び、もう一度押すと「こだわらない」に戻る */
function LeanRow({
  label,
  low,
  high,
  value,
  onChange,
}: {
  label: string;
  low: string;
  high: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="rating-row" role="group" aria-label={`${label}（1=${low}、5=${high}）`}>
      <span className="label">{label}</span>
      <div className="rating-scale">
        <div className="rating-btns">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              className="chip"
              aria-pressed={value === n}
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

/** 好きな味・苦手な味・産地。リストにないものは自分で足せる */
function FlavorPicker({
  value,
  onChange,
  id,
  base = FLAVORS,
  placeholder = "例：メロン、はちみつ",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  id: string;
  base?: string[];
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const options = [...base, ...value.filter((f) => !base.includes(f))];

  function add() {
    const f = text.trim();
    if (f && !value.includes(f)) onChange([...value, f]);
    setText("");
  }

  return (
    <>
      <MultiChips options={options} value={value} onChange={onChange} />
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <label htmlFor={id} className="visually-hidden">
          ほかを追加
        </label>
        <input
          id={id}
          className="input"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn-secondary" onClick={add}>
          追加
        </button>
      </div>
    </>
  );
}

/** 自分で登録する好み。押したらすぐ保存する */
export default function PrefsPage() {
  const [prefs, setPrefs] = useState<MyPrefs>(EMPTY_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    setLoaded(true);
  }, []);

  function update<K extends keyof MyPrefs>(key: K, value: MyPrefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
  }

  return (
    <>
      <header className="sub-header">
        <Link href="/taste" className="back">
          ‹ 戻る
        </Link>
        <h1>わたしの好み</h1>
      </header>

      <p className="lead">
        当てはまるものを押してください。メニューを撮ったときの「あなたへのおすすめ」や「次の一杯」に使います。押すとすぐ保存されます。
      </p>

      {loaded && (
        <main className="form">
          <fieldset className="field">
            <legend className="label">好きな焙煎度</legend>
            <MultiChips options={ROAST_OPTIONS} value={prefs.roasts} onChange={(v) => update("roasts", v)} />
          </fieldset>
          <fieldset className="field">
            <legend className="label">苦手な焙煎度</legend>
            <MultiChips
              options={ROAST_OPTIONS.filter((r) => !prefs.roasts.includes(r))}
              value={prefs.avoidRoasts}
              onChange={(v) => update("avoidRoasts", v)}
            />
          </fieldset>
          <fieldset className="field">
            <legend className="label">好きな精製方法</legend>
            <MultiChips options={PROCESS_OPTIONS} value={prefs.processes} onChange={(v) => update("processes", v)} />
          </fieldset>
          <fieldset className="field">
            <legend className="label">好きな淹れ方</legend>
            <MultiChips options={METHOD_OPTIONS} value={prefs.methods} onChange={(v) => update("methods", v)} />
          </fieldset>
          <fieldset className="field">
            <legend className="label">好きな飲み方</legend>
            <MultiChips options={WAY_OPTIONS} value={prefs.ways} onChange={(v) => update("ways", v)} />
          </fieldset>
          <fieldset className="field">
            <legend className="label">好きな産地（国）</legend>
            <FlavorPicker
              id="p-origin"
              base={[]}
              placeholder="例：エチオピア、ケニア"
              value={prefs.origins}
              onChange={(v) => update("origins", v)}
            />
          </fieldset>
          <fieldset className="field">
            <legend className="label">好きな味の寄り方（こだわらなければ選ばない）</legend>
            <div className="ratings">
              <LeanRow label="酸味" low="穏やか" high="強い" value={prefs.acidity} onChange={(v) => update("acidity", v)} />
              <LeanRow label="苦味" low="弱い" high="強い" value={prefs.bitterness} onChange={(v) => update("bitterness", v)} />
              <LeanRow label="コク" low="軽い" high="重い" value={prefs.body} onChange={(v) => update("body", v)} />
            </div>
          </fieldset>
          <fieldset className="field">
            <legend className="label">好きな味</legend>
            <FlavorPicker id="p-like" value={prefs.likes} onChange={(v) => update("likes", v)} />
          </fieldset>
          <fieldset className="field">
            <legend className="label">苦手な味</legend>
            <FlavorPicker id="p-dislike" value={prefs.dislikes} onChange={(v) => update("dislikes", v)} />
          </fieldset>
          <div className="field">
            <label className="label" htmlFor="p-budget">
              1杯の予算（円）
            </label>
            <input
              id="p-budget"
              className="input"
              inputMode="numeric"
              placeholder="例：700"
              value={prefs.budget ?? ""}
              onChange={(e) => {
                const digits = e.target.value.normalize("NFKC").replace(/\D/g, "");
                update("budget", digits ? Number(digits) : null);
              }}
            />
          </div>
        </main>
      )}
    </>
  );
}
