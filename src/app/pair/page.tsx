"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BuddyFace from "@/components/BuddyFace";
import { announceBuddy } from "@/lib/buddy";
import { beanTitle, roastColor } from "@/components/RecordCard";
import { listBags, listRecords } from "@/lib/db";
import {
  BUILT_IN_DISHES,
  builtInPairing,
  findSavedPairing,
  matchBags,
  matchRecords,
  recentPairings,
  savePairing,
  type FoodPairing,
  type MineMatch,
} from "@/lib/foodPairing";
import { loadPasscode, normalizePasscode, savePasscode } from "@/lib/passcode";
import { loadPrefs } from "@/lib/prefs";
import type { Bag, TastingRecord } from "@/lib/types";

/** AI に渡す、自分で登録した好み（好きな焙煎度・産地・飲み方、苦手な焙煎度） */
function likesText() {
  const p = loadPrefs();
  return [
    p.roasts.length > 0 && `好きな焙煎度：${p.roasts.join("、")}`,
    p.origins.length > 0 && `好きな産地：${p.origins.join("、")}`,
    p.ways.length > 0 && `好きな飲み方：${p.ways.join("、")}`,
    p.avoidRoasts.length > 0 && `苦手な焙煎度：${p.avoidRoasts.join("、")}`,
  ]
    .filter(Boolean)
    .join("。");
}

type Result = {
  query: string;
  pairing: FoodPairing;
  /** どこから出したか */
  from: "built-in" | "saved" | "ai";
  records: MineMatch<TastingRecord>[];
  bags: MineMatch<Bag>[];
};

/** 料理や食べ物を入れると、合うコーヒーと、自分の記録・家の豆から合いそうなものを出す */
export default function PairPage() {
  const [dish, setDish] = useState("");
  const [passcode, setPasscode] = useState("");
  const [savedPasscode, setSavedPasscode] = useState(true);
  const [records, setRecords] = useState<TastingRecord[]>([]);
  const [bags, setBags] = useState<Bag[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const p = loadPasscode();
    setPasscode(p);
    setSavedPasscode(!!p);
    setRecent(recentPairings(6));
    listRecords().then(setRecords);
    listBags().then(setBags);
  }, []);

  function show(query: string, pairing: FoodPairing, from: Result["from"]) {
    const mine = matchRecords(records, pairing, query);
    const home = matchBags(bags, pairing);
    setResult({ query, pairing, from, records: mine, bags: home });
    if (home[0]) {
      announceBuddy({ text: `家にある「${beanTitle(home[0].item)}」、${pairing.dish}に合いそう！`, mood: "happy" });
    }
  }

  async function choose(input = dish) {
    const q = input.trim();
    if (!q || busy) return;
    setDish(q);
    setError("");
    const local = builtInPairing(q);
    if (local) return show(q, local, "built-in");
    const saved = findSavedPairing(q);
    if (saved) return show(q, saved, "saved");
    if (!navigator.onLine) {
      setError("オフラインのため調べられません。電波のあるところでもう一度お試しください");
      return;
    }
    setBusy(true);
    try {
      const code = normalizePasscode(passcode);
      const res = await fetch("/api/read-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ food: q, likes: likesText(), passcode: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) setSavedPasscode(false);
      if (!res.ok) throw new Error(data.error ?? "調べられませんでした");
      savePasscode(code);
      setSavedPasscode(true);
      const pairing: FoodPairing = { dish: data.dish || q, tip: data.tip, picks: data.picks };
      savePairing(q, pairing);
      setRecent(recentPairings(6));
      show(q, pairing, "ai");
    } catch (e) {
      setError(e instanceof Error ? e.message : "調べられませんでした");
    } finally {
      setBusy(false);
    }
  }

  const suggestions = [...new Set([...recent, ...BUILT_IN_DISHES])].slice(0, 14);

  return (
    <>
      <header className="sub-header">
        <Link href="/scan" className="back">
          ‹ 調べる
        </Link>
        <h1>料理から選ぶ</h1>
      </header>
      <p className="lead" style={{ paddingTop: 12 }}>
        食べるものを入れると、合うコーヒーと、これまでの記録や家の豆から合いそうなものを出します。
      </p>

      <main className="content" style={{ paddingBottom: 110 }}>
        {!savedPasscode && (
          <div className="field">
            <label className="label" htmlFor="pair-pass">
              合言葉（よくある食べ物なら、なくても使えます）
            </label>
            <input
              id="pair-pass"
              className="input"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
          </div>
        )}
        <form
          className="row"
          style={{ flexWrap: "nowrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            choose();
          }}
        >
          <label htmlFor="pair-dish" className="visually-hidden">
            料理・食べ物
          </label>
          <input
            id="pair-dish"
            className="input"
            style={{ flex: 1, minWidth: 0 }}
            type="search"
            enterKeyHint="search"
            maxLength={40}
            placeholder="料理・食べ物（例：チーズケーキ）"
            value={dish}
            onChange={(e) => setDish(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ flexShrink: 0, width: "auto", height: 46, padding: "0 20px", fontSize: 16 }} disabled={!dish.trim() || busy}>
            {busy ? "選び中…" : "選ぶ"}
          </button>
        </form>
        <div className="scroll-row" aria-label="よく食べるもの">
          {suggestions.map((d) => (
            <button
              key={d}
              type="button"
              className="chip"
              aria-pressed={result?.pairing.dish === d}
              onClick={() => choose(d)}
            >
              {d}
            </button>
          ))}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {result && (
          <>
            <section className="pair-result" aria-live="polite">
              <h2 className="pair-head">「{result.pairing.dish}」に合うコーヒー</h2>
              {result.pairing.tip && (
                <div className="pair-tip">
                  <BuddyFace mood="happy" size={36} />
                  <p>{result.pairing.tip}</p>
                </div>
              )}
              <ol className="pair-list">
                {result.pairing.picks.map((p, i) => {
                  return (
                    <li key={p.title} className="card pair-pick" style={{ "--kind": roastColor(p.roast) } as React.CSSProperties}>
                      <span className="pair-rank" aria-label={`${i + 1}番目`}>
                        {i + 1}
                      </span>
                      <div className="pair-body">
                        <div className="tags">
                          <span className="tag kind-tag">{p.roast}</span>
                          {p.area && <span className="tag tag-plain">{p.area}</span>}
                        </div>
                        <h3>{p.title}</h3>
                        <p>{p.reason}</p>
                        {p.examples && <p className="muted">例：{p.examples}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            {result.bags.length > 0 && (
              <section className="pair-mine">
                <h2 className="pair-head">家にある豆なら</h2>
                <div className="list-group">
                  {result.bags.map(({ item: b, why }) => (
                    <Link key={b.id} href="/bags" className="pair-row">
                      <span className="kind-dot" style={{ background: roastColor(b.roast) }} aria-hidden="true" />
                      <span className="pair-row-body">
                        <strong>{beanTitle(b)}</strong>
                        <span className="muted">
                          {why}
                          {b.low ? "・残りわずか" : ""}
                        </span>
                      </span>
                      <span className="pair-chevron" aria-hidden="true">
                        ›
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="pair-mine">
              <h2 className="pair-head">これまでの記録から</h2>
              {result.records.length > 0 ? (
                <div className="list-group">
                  {result.records.map(({ item: r, why }) => (
                    <Link key={r.id} href={`/record?id=${r.id}`} className="pair-row">
                      <span className="kind-dot" style={{ background: roastColor(r.roast) }} aria-hidden="true" />
                      <span className="pair-row-body">
                        <strong>{beanTitle(r)}</strong>
                        <span className="muted">{why}</span>
                      </span>
                      <span className="pair-chevron" aria-hidden="true">
                        ›
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="muted pair-none">
                  {records.length === 0
                    ? "記録がたまると、飲んだコーヒーの中からも合いそうなものを選びます。"
                    : "合いそうな記録はまだありません。記録のメモに一緒に食べたものを書いておくと、次から出てきます。"}
                </p>
              )}
            </section>

            <p className="muted pair-from">
              {result.from === "ai"
                ? "AI が選びました。"
                : result.from === "saved"
                  ? "前に AI が選んだ結果から出しました（AI は使っていません）。"
                  : "よくある食べ物なので、内蔵の表から出しました（AI は使っていません）。"}
            </p>
          </>
        )}
      </main>
    </>
  );
}
