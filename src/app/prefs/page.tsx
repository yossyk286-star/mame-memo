"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MultiChips } from "@/components/ChipGroup";
import { FLAVORS, PROCESSES, ROASTS } from "@/lib/glossary";
import { EMPTY_PREFS, loadPrefs, savePrefs, type MyPrefs } from "@/lib/prefs";

const ROAST_OPTIONS = ROASTS.filter((r) => r !== "不明");
const PROCESS_OPTIONS = PROCESSES.filter((p) => p !== "不明" && p !== "その他");

/** 好きな味・苦手な味。リストにない味は自分で足せる */
function FlavorPicker({ value, onChange, id }: { value: string[]; onChange: (v: string[]) => void; id: string }) {
  const [text, setText] = useState("");
  const options = [...FLAVORS, ...value.filter((f) => !FLAVORS.includes(f))];

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
          ほかの味を追加
        </label>
        <input
          id={id}
          className="input"
          placeholder="例：紅茶、スパイス"
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
        当てはまるものを押してください。メニューを撮ったときの「あなたへのおすすめ」に使います。押すとすぐ保存されます。
      </p>

      {loaded && (
        <main className="form">
          <fieldset className="field">
            <legend className="label">好きな焙煎度</legend>
            <MultiChips options={ROAST_OPTIONS} value={prefs.roasts} onChange={(v) => update("roasts", v)} />
          </fieldset>
          <fieldset className="field">
            <legend className="label">好きな精製方法</legend>
            <MultiChips options={PROCESS_OPTIONS} value={prefs.processes} onChange={(v) => update("processes", v)} />
          </fieldset>
          <fieldset className="field">
            <legend className="label">好きな味</legend>
            <FlavorPicker id="p-like" value={prefs.likes} onChange={(v) => update("likes", v)} />
          </fieldset>
          <fieldset className="field">
            <legend className="label">苦手な味</legend>
            <FlavorPicker id="p-dislike" value={prefs.dislikes} onChange={(v) => update("dislikes", v)} />
          </fieldset>
        </main>
      )}
    </>
  );
}
