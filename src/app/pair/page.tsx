"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BuddyFace from "@/components/BuddyFace";
import { announceBuddy } from "@/lib/buddy";
import { beanTitle, roastColor } from "@/components/RecordCard";
import { listBags, listRecords } from "@/lib/db";
import { loadLastScan, today } from "@/lib/lastScan";
import type { PairingResult, ScannedBean } from "@/lib/menuScan";
import {
  BUILT_IN_DISHES,
  loadMenuRanks,
  saveMenuRanks,
  builtInPairing,
  findSavedPairing,
  groupMenu,
  loadLastPair,
  matchBags,
  matchRecords,
  recentPairings,
  resetShop,
  saveLastPair,
  savePairing,
  type FoodMenu,
  type MenuRank,
  type FoodPairing,
  type MineMatch,
} from "@/lib/foodPairing";
import { loadPasscode, normalizePasscode, savePasscode } from "@/lib/passcode";
import { shrinkPhoto } from "@/lib/photo";
import { loadPrefs } from "@/lib/prefs";
import type { Bag, TastingRecord } from "@/lib/types";
import MenuPicks from "@/components/MenuPicks";
import ScanTabs from "@/components/ScanTabs";
import ShopBar from "@/components/ShopBar";
import Skeleton from "@/components/Skeleton";
import { getLang, tr, trv } from "@/lib/i18n";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** AI に渡す、自分で登録した好み（好きな焙煎度・産地・飲み方、苦手な焙煎度） */
function likesText() {
  const p = loadPrefs();
  return [
    p.roasts.length > 0 && tr("好きな焙煎度：{0}", p.roasts.join("、")),
    p.origins.length > 0 && tr("好きな産地：{0}", p.origins.join("、")),
    p.ways.length > 0 && tr("好きな飲み方：{0}", p.ways.join("、")),
    p.avoidRoasts.length > 0 && tr("苦手な焙煎度：{0}", p.avoidRoasts.join("、")),
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
/** 写真フォルダから一度に選べる枚数（1枚ずつ AI に送るので、多すぎると時間とお金がかかる） */
const MAX_PHOTOS = 5;

export default function PairPage() {
  const router = useRouter();
  const [dish, setDish] = useState("");
  const [passcode, setPasscode] = useState("");
  const [savedPasscode, setSavedPasscode] = useState(true);
  const [records, setRecords] = useState<TastingRecord[]>([]);
  const [bags, setBags] = useState<Bag[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // メニューの写真から読み取った料理と、それぞれにいちばん合うもの
  const [menu, setMenu] = useState<FoodMenu["dishes"] | null>(null);
  const [reading, setReading] = useState(false);
  // 何枚か選んだときの「何枚目を読み取り中か」
  const [progress, setProgress] = useState<{ at: number; of: number } | null>(null);
  // 2枚目以降を足したときに増えた品数（1枚目なら null）
  const [addedCount, setAddedCount] = useState<number | null>(null);
  const [menuDate, setMenuDate] = useState<string | undefined>();
  const [restored, setRestored] = useState(false);
  // 同じお店で今日読み取ったコーヒーのメニュー。料理に合うものをそこから選ぶ
  const [beanMenu, setBeanMenu] = useState<ScannedBean[]>([]);
  // コーヒーのメニューの中から料理に合う順を聞いた結果（料理名ごと）と、聞いている料理
  const [menuRanks, setMenuRanks] = useState<Record<string, MenuRank[]>>({});
  const [ranking, setRanking] = useState<string | null>(null);
  const [rankError, setRankError] = useState<{ dish: string; text: string } | null>(null);
  // 読み取りが終わったら結果まで動かして、終わったことがわかるようにする
  const [justRead, setJustRead] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  // 料理を選んだら、一覧の下に出る候補（調べている間は骨組み）まで動かす
  const [jump, setJump] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = loadPasscode();
    setPasscode(p);
    setSavedPasscode(!!p);
    setRecent(recentPairings(6));
    const last = loadLastPair();
    if (last?.menu) {
      setMenu(last.menu);
      setMenuDate(last.date);
    }
    const beans = loadLastScan()?.beans ?? [];
    setBeanMenu(beans);
    setMenuRanks(loadMenuRanks(beans));
    Promise.all([listRecords(), listBags()]).then(([r, b]) => {
      setRecords(r);
      setBags(b);
      // 前に見ていた料理の候補も戻す（内蔵表か保存済みの結果なので通信しない）
      const q = last?.query ?? "";
      const builtIn = q ? builtInPairing(q) : null;
      const pairing = builtIn ?? (q ? findSavedPairing(q) : null);
      if (pairing) {
        setDish(q);
        setResult({ query: q, pairing, from: builtIn ? "built-in" : "saved", records: matchRecords(r, pairing, q), bags: matchBags(b, pairing) });
      }
      setRestored(true);
    });
  }, []);

  useEffect(() => {
    if (!jump || (!busy && !result)) return;
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!busy) setJump(false);
  }, [jump, busy, result]);

  useEffect(() => {
    if (justRead) menuRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [justRead, menu]);

  useEffect(() => {
    if (restored) saveLastPair({ menu, query: result?.query ?? "", date: menuDate });
  }, [restored, menu, result?.query, menuDate]);

  function show(query: string, pairing: FoodPairing, from: Result["from"]) {
    const mine = matchRecords(records, pairing, query);
    const home = matchBags(bags, pairing);
    setResult({ query, pairing, from, records: mine, bags: home });
    if (home[0]) {
      announceBuddy({ text: tr("家にある「{0}」、{1}に合いそう！", beanTitle(home[0].item), pairing.dish), mood: "happy" });
    }
  }

  async function post(payload: object) {
    const code = normalizePasscode(passcode);
    const res = await fetch("/api/read-menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, likes: likesText(), passcode: code, lang: getLang() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) setSavedPasscode(false);
    if (!res.ok) throw new Error(data.error ?? "調べられませんでした");
    savePasscode(code);
    setSavedPasscode(true);
    return data;
  }

  /** メニューや料理の写真を送って、載っている料理ごとに合うものを出す */
  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    // 写真フォルダからは何枚か選べる（表と裏など）。1枚ずつ順に読み取って一覧に足す
    const picked = [...(e.target.files ?? [])];
    e.target.value = "";
    const files = picked.slice(0, MAX_PHOTOS);
    if (files.length === 0 || reading) return;
    if (!passcode.trim()) return setError("先に合言葉を入れてください");
    if (!navigator.onLine) return setError("オフラインのため読み取れません。電波のあるところでもう一度お試しください");
    setError("");
    setReading(true);
    // 同じ日に続けて撮ったメニュー（表と裏、ケーキとフードなど）は入れ替えずに、新しい分を上に足す
    const before = menu && menuDate === today() ? menu : [];
    let all = before;
    let lastError = "";
    let failed = 0;
    for (const [i, file] of files.entries()) {
      if (files.length > 1) setProgress({ at: i + 1, of: files.length });
      try {
        // 料金は画像の大きさで決まるので、長辺1000pxまで縮めてから送る
        const image = await blobToBase64(await shrinkPhoto(file, 1000));
        const data = (await post({ foodImage: image })) as FoodMenu;
        const added = data.dishes.filter((d) => !all.some((m) => m.dish === d.dish));
        all = [...added, ...all];
        setMenu(all);
        setMenuDate(today());
        setResult(null);
        setJustRead(true);
      } catch (err) {
        failed++;
        lastError = err instanceof Error ? err.message : "読み取れませんでした";
      }
    }
    setAddedCount(before.length > 0 && all.length > before.length ? all.length - before.length : null);
    setProgress(null);
    setReading(false);
    if (failed > 0)
      setError(files.length > 1 ? tr("{0}枚のうち{1}枚は読み取れませんでした。その写真だけ撮り直してみてください", files.length, failed) : lastError);
    else if (picked.length > MAX_PHOTOS) setError(tr("一度に読み取れるのは{0}枚までです。残りはもう一度選んでください", MAX_PHOTOS));
  }

  /** 今日読み取ったコーヒーのメニューを、この料理に合う順に AI に並べてもらう */
  async function rankBeanMenu(d: string) {
    if (ranking) return;
    if (!passcode.trim()) return setRankError({ dish: d, text: "先に合言葉を入れてください" });
    if (!navigator.onLine) return setRankError({ dish: d, text: "オフラインのため調べられません" });
    setRankError(null);
    setRanking(d);
    try {
      const data = (await post({
        sweet: d,
        beans: beanMenu.map(({ name, roast, process }) => ({ name, roast, process })),
      })) as PairingResult;
      const ranks = data.ranks
        .filter((r) => beanMenu[r.index])
        .map((r) => ({ name: beanMenu[r.index].name, score: Math.min(5, Math.max(1, r.score)), reason: r.reason }))
        .sort((a, b) => b.score - a.score);
      const next = { ...menuRanks, [d]: ranks };
      setMenuRanks(next);
      saveMenuRanks(beanMenu, next);
    } catch (e) {
      setRankError({ dish: d, text: e instanceof Error ? e.message : "調べられませんでした" });
    } finally {
      setRanking(null);
    }
  }

  /** コーヒーのメニューから選んだ豆を、そのまま記録に進める（料理も一緒に入れる） */
  function record(dishName: string) {
    return (name: string) => router.push(`/new?bean=${encodeURIComponent(name)}&food=${encodeURIComponent(dishName)}`);
  }

  async function choose(input = dish) {
    const q = input.trim();
    if (!q || busy) return;
    setDish(q);
    setJump(true);
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
      const data = await post({ food: q });
      const pairing: FoodPairing = { dish: data.dish || q, tip: data.tip, picks: data.picks };
      savePairing(q, pairing);
      setRecent(recentPairings(6));
      show(q, pairing, "ai");
    } catch (e) {
      setError(e instanceof Error ? e.message : "調べられませんでした");
      setJump(false);
    } finally {
      setBusy(false);
    }
  }

  // 迷ったとき用に、いちばん多くの料理に合うコーヒーをひとつだけ添える
  const top = menu ? groupMenu(menu)[0] : undefined;
  const suggestions = [...new Set([...recent, ...BUILT_IN_DISHES])].slice(0, 14);

  return (
    <>
      <header className="page-header">
        <h1>{tr("メニューを見る")}</h1>
        <Link href="/show" className="header-pill">
          {tr("店員さんに見せる")}
        </Link>
      </header>
      <ScanTabs current="food" />
      <ShopBar
        drinks={beanMenu.length}
        dishes={menu && menuDate === today() ? menu.length : 0}
        onReset={() => {
          resetShop();
          setMenu(null);
          setMenuDate(undefined);
          setAddedCount(null);
          setJustRead(false);
          setBeanMenu([]);
          setMenuRanks({});
        }}
      />
      <p className="lead lead-phrases" style={{ paddingTop: 12 }}>
        {tr("食べるものを入れるか")}<wbr />{tr("メニューを撮ると、")}<wbr />{tr("合うコーヒーと、")}<wbr />{tr("記録や")}<wbr />{tr("家の豆から")}<wbr />{tr("合いそうなものを出します。")}
      </p>

      <main className="content" style={{ paddingBottom: 110 }}>
        {!savedPasscode && (
          <div className="field">
            <label className="label" htmlFor="pair-pass">
              {tr("合言葉（よくある食べ物なら、なくても使えます）")}
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
            {tr("料理・食べ物")}
          </label>
          <input
            id="pair-dish"
            className="input"
            style={{ flex: 1, minWidth: 0 }}
            type="search"
            enterKeyHint="search"
            maxLength={40}
            placeholder={tr("料理・食べ物（例：ケーキ）")}
            value={dish}
            onChange={(e) => setDish(e.target.value)}
          />
          <button type="submit" className="btn-secondary" style={{ flexShrink: 0, padding: "0 20px", fontSize: 16 }} disabled={!dish.trim() || busy}>
            {busy ? tr("選び中…") : tr("選ぶ")}
          </button>
        </form>
        <div className="scroll-row" aria-label={tr("よく食べるもの")}>
          {suggestions.map((d) => (
            <button
              key={d}
              type="button"
              className="chip"
              aria-pressed={result?.pairing.dish === d}
              onClick={() => choose(d)}
            >
              {trv(d)}
            </button>
          ))}
        </div>
        <div className="pair-shoot">
          <label className="btn-primary" aria-disabled={reading}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                <circle cx="12" cy="13" r="3.5" />
            </svg>
            {reading ? (progress ? tr("読み取り中…（{0}/{1}枚）", progress.at, progress.of) : tr("読み取り中…")) : tr("メニューを撮る")}
            <input type="file" accept="image/*" capture="environment" onChange={onPhoto} disabled={reading} className="visually-hidden" />
          </label>
          <label className="btn-secondary" aria-disabled={reading}>
            {tr("写真から")}
            {/* capture を付けないとカメラではなく写真の一覧が開く */}
            <input type="file" accept="image/*" multiple onChange={onPhoto} disabled={reading} className="visually-hidden" />
          </label>
        </div>
        {reading && <Skeleton label={tr("メニューを読み取っています…")} chips />}
        {menu && !reading && (
          <section ref={menuRef} className="pair-mine pair-menu" aria-live="polite">
            <div className="pair-menu-head">
              <h2 className="pair-head">{tr("読み取った料理")}</h2>
              <button type="button" className="text-btn" onClick={() => {
                  setMenu(null);
                  setJustRead(false);
                }}>
                {tr("閉じる")}
              </button>
            </div>
            <p className={justRead ? "pair-done pair-done-new" : "pair-done"}>
              <span className="pair-done-check" aria-hidden="true">✓</span>
              <span>
                <strong>
                  {tr("{0}品読み取りました", menu.length)}{addedCount != null && tr("（今回 +{0}品）", addedCount)}
                </strong>
                <span className="muted">{tr("料理を押すと、合うコーヒーが出ます")}</span>
              </span>
            </p>
            <div className="list-group pair-dish-list">
              {menu.map(({ dish: d, pick }) => {
                return (
                  <details key={d} className="pair-dish" style={{ "--kind": roastColor(pick.roast) } as React.CSSProperties}>
                    <summary>
                      <span className="pair-dish-name">{trv(d)}</span>
                      {menuRanks[d] && <span className="pair-dish-done">{tr("✓ 選んだ")}</span>}
                      <span className="pair-chevron" aria-hidden="true">
                        ›
                      </span>
                    </summary>
                    <div className="pair-dish-body">
                      <p className="pair-dish-for">{tr("この料理に合うのは")}</p>
                      <div className="pair-group-head">
                        <span className="kind-dot" style={{ background: "var(--kind)" }} aria-hidden="true" />
                        <h3>{trv(pick.title)}</h3>
                        <span className="muted">{[pick.roast, pick.area].filter((x) => x && !pick.title.includes(x)).join("・")}</span>
                      </div>
                      <p className="pair-group-reason">{trv(pick.reason)}</p>
                      {pick.examples && <p className="muted">{tr("例：{0}", pick.examples)}</p>}
                      {beanMenu.length > 0 && (
                        <MenuPicks
                          label={tr("さっきのコーヒーのメニューなら")}
                          button={tr("さっきのメニューから選ぶ")}
                          ranks={menuRanks[d]}
                          busy={ranking === d}
                          error={rankError?.dish === d ? rankError.text : ""}
                          onAsk={() => rankBeanMenu(d)}
                          onPick={record(d)}
                        />
                      )}
                      <button type="button" className="text-btn pair-dish-more" onClick={() => choose(d)}>
                        {tr("ほかの候補と、記録・家の豆から探す ›")}
                      </button>
                    </div>
                  </details>
                );
              })}
            </div>
            {top && top.items.length > 1 && (
              <p className="muted pair-none">
                {tr("迷ったら")}<strong className="pair-top">{trv(top.label)}</strong>{tr("。{0}品に合います。", top.items.length)}
              </p>
            )}
          </section>
        )}
        {error && (
          <p className="error" role="alert">
            {trv(error)}
          </p>
        )}

        <div ref={resultRef} className="pair-jump">
          {busy && <Skeleton label={tr("「{0}」に合うコーヒーを選んでいます…", dish.trim())} cards={2} chips />}
          {result && !busy && (
            <>
              <section className="pair-result" aria-live="polite">
                <h2 className="pair-head">{tr("「{0}」に合うコーヒー", result.pairing.dish)}</h2>
                {result.pairing.tip && (
                  <div className="pair-tip">
                    <BuddyFace mood="happy" size={52} />
                    <p>{trv(result.pairing.tip)}</p>
                  </div>
                )}
                {beanMenu.length > 0 && !menu?.some((m) => m.dish === result.query) && (
                  <section className="card pair-menu-card">
                    <MenuPicks
                      label={tr("さっきのコーヒーのメニューなら")}
                      button={tr("さっきのメニューから選ぶ")}
                      ranks={menuRanks[result.query]}
                      busy={ranking === result.query}
                      error={rankError?.dish === result.query ? rankError.text : ""}
                      onAsk={() => rankBeanMenu(result.query)}
                      onPick={record(result.pairing.dish)}
                    />
                  </section>
                )}
                <ol className="pair-list">
                  {result.pairing.picks.map((p, i) => {
                    return (
                      <li key={p.title} className="card pair-pick" style={{ "--kind": roastColor(p.roast) } as React.CSSProperties}>
                        <span className="pair-rank" aria-label={tr("{0}番目", i + 1)}>
                          {i + 1}
                        </span>
                        <div className="pair-body">
                          <div className="tags">
                            <span className="tag kind-tag">{trv(p.roast)}</span>
                            {p.area && <span className="tag tag-plain">{trv(p.area)}</span>}
                          </div>
                          <h3>{trv(p.title)}</h3>
                          <p>{trv(p.reason)}</p>
                          {p.examples && <p className="muted">{tr("例：{0}", p.examples)}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>

              {result.bags.length > 0 && (
                <section className="pair-mine">
                  <h2 className="pair-head">{tr("家にある豆なら")}</h2>
                  <div className="list-group">
                    {result.bags.map(({ item: b, why }) => (
                      <Link key={b.id} href="/bags" className="pair-row">
                        <span className="kind-dot" style={{ background: roastColor(b.roast) }} aria-hidden="true" />
                        <span className="pair-row-body">
                          <strong>{beanTitle(b)}</strong>
                          <span className="muted">
                            {trv(why)}
                            {b.low ? tr("・残りわずか") : ""}
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
                <h2 className="pair-head">{tr("これまでの記録から")}</h2>
                {result.records.length > 0 ? (
                  <div className="list-group">
                    {result.records.map(({ item: r, why }) => (
                      <Link key={r.id} href={`/record?id=${r.id}`} className="pair-row">
                        <span className="kind-dot" style={{ background: roastColor(r.roast) }} aria-hidden="true" />
                        <span className="pair-row-body">
                          <strong>{beanTitle(r)}</strong>
                          <span className="muted">{trv(why)}</span>
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
                      ? tr("記録がたまると、飲んだコーヒーの中からも合いそうなものを選びます。")
                      : tr("合いそうな記録はまだありません。記録のメモに一緒に食べたものを書いておくと、次から出てきます。")}
                  </p>
                )}
              </section>

              <p className="muted pair-from">
                {result.from === "ai"
                  ? tr("AI が選びました。")
                  : result.from === "saved"
                    ? tr("前に AI が選んだ結果から出しました（AI は使っていません）。")
                    : tr("よくある食べ物なので、内蔵の表から出しました（AI は使っていません）。")}
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
