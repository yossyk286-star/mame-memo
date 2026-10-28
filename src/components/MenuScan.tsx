"use client";

import { useEffect, useMemo, useState } from "react";
import {
  beanToDraft,
  farmOf,
  type MenuScanResult,
  type PairingResult,
  type ScannedBean,
} from "@/lib/menuScan";
import { countryOf } from "@/lib/countries";
import {
  deleteWish,
  listRecords,
  listWishes,
  putBag,
  putWish,
  type WishBean,
} from "@/lib/db";
import { findKnownBean } from "@/lib/knownBeans";
import { loadLastScan, saveLastScan, today } from "@/lib/lastScan";
import { findSaved, forgetSaved, recentSaved, saveLookups } from "@/lib/savedLookups";
import { MOODS, moodFromText, type Mood } from "@/lib/moods";
import { loadPasscode, PASSCODE_KEY } from "@/lib/passcode";
import { shrinkPhoto } from "@/lib/photo";
import { EMPTY_PREFS, loadPrefs } from "@/lib/prefs";
import { bestPick, MIN_RECORDS, scoreBeans } from "@/lib/recommend";
import type { TastingRecord } from "@/lib/types";
import styles from "./MenuScan.module.css";
import AskAI from "./AskAI";
import Hint from "./Hint";
import MoodPicker from "./MoodPicker";
import TasteBars from "./TasteBars";




/** 調べた豆について AI に聞くときの質問の例 */
const ASK_SUGGESTIONS = ["どんな味？", "初心者でも飲みやすい？", "ミルクに合う？", "似た豆は？"];

/** 閉じたカードに出す、味のひとこと（2つまで） */
function tasteWords({ taste: t }: ScannedBean) {
  if (!t) return "";
  const w = [
    t.sweetness >= 4 && "甘め",
    t.acidity >= 4 && "酸味しっかり",
    t.acidity <= 1 && "酸味ひかえめ",
    t.bitterness >= 4 && "苦め",
    t.body >= 4 && "コク",
    t.body <= 1 && "軽め",
  ].filter((x): x is string => !!x);
  return w.length ? w.slice(0, 2).join("・") : "バランス型";
}

/** 調べた豆の情報を、AI に渡す文にする */
function beanContext(b: ScannedBean) {
  return [
    "メニューで見つけた豆（まだ飲んでいません）",
    `豆：${b.name}`,
    b.origin && `産地：${b.origin}`,
    b.roast && `焙煎度：${b.roast}`,
    b.process && `精製方法：${b.process}`,
    b.menuNote && `メニューの説明：${b.menuNote}`,
    `解説：${b.explanation}`,
    `おすすめの飲み方：${b.recommendation}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** 選んだ豆の解説とおすすめ（フォームの上に出しておく） */
export function PickedBean({
  bean,
  onChange,
}: {
  bean: ScannedBean;
  onChange?: () => void;
}) {
  return (
    <section className="tips" style={{ margin: "16px 16px 0" }}>
      <div className="card-top">
        <h2>{bean.name}</h2>
        {onChange && (
          <button
            type="button"
            className="btn-ghost"
            style={{ flexShrink: 0 }}
            onClick={onChange}
          >
            別の豆にする
          </button>
        )}
      </div>
      <p className="term-desc">{bean.explanation}</p>
      <p className="term-desc">
        <strong>おすすめの飲み方：</strong>
        {bean.recommendation}
      </p>
      {bean.sweets && (
        <p className="term-desc">
          <strong>合うスイーツ：</strong>
          {bean.sweets}
        </p>
      )}
    </section>
  );
}

/** メニューを撮影して豆の情報を読み取り、選んだ豆を記録フォームに渡す */
export default function MenuScan({
  onPick,
  savedPhoto,
  initialBeans = [],
  onScanned,
}: {
  onPick: (bean: ScannedBean) => void;
  /** 記録に保存済みの写真。あればそれを読み取るボタンも出す */
  savedPhoto?: Blob | null;
  /** 前に読み取った結果。あれば撮り直さずにその一覧から選べる */
  initialBeans?: ScannedBean[];
  /** 読み取れたら結果を親に渡す（続けて別の豆を記録するときに使う） */
  onScanned?: (beans: ScannedBean[]) => void;
}) {
  const [passcode, setPasscode] = useState("");
  const [savedPasscode, setSavedPasscode] = useState(false);
  const [status, setStatus] = useState<"idle" | "reading" | "done">(
    initialBeans.length ? "done" : "idle",
  );
  // 文字で調べている最中はその言葉。写真の読み取りと出し分ける
  const [searching, setSearching] = useState<string | null>(null);
  const [beans, setBeans] = useState<ScannedBean[]>(initialBeans);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<TastingRecord[]>([]);
  const [wishes, setWishes] = useState<WishBean[]>([]);
  const [prefs, setPrefs] = useState(EMPTY_PREFS);
  // 頼むスイーツとの相性（豆の名前ごと）
  const [sweet, setSweet] = useState("");
  const [pairing, setPairing] = useState<{
    sweet: string;
    /** スイーツではなく、文字で入れた気分を AI に聞いたとき */
    mood?: boolean;
    byName: Map<string, { score: number; reason: string }>;
  } | null>(null);
  const [pairingBusy, setPairingBusy] = useState(false);
  // 買った豆を、家で何回かに分けて淹れる豆として登録する
  const [bagged, setBagged] = useState<string[]>([]);
  // AI を使わずに出したとき、どこから出したか（調べ直すボタン用）
  const [localHit, setLocalHit] = useState<{ name: string; how: string; query: string } | null>(null);
  const [recent, setRecent] = useState<ScannedBean[]>([]);

  // localStorage はブラウザでしか読めないので、表示後に読み込む
  useEffect(() => {
    const saved = loadPasscode();
    setPasscode(saved);
    setSavedPasscode(!!saved);
    // これまでの記録から、好みに合いそうな豆におすすめを付ける
    listRecords().then(setRecords);
    listWishes().then(setWishes);
    setPrefs(loadPrefs());
    setRecent(recentSaved(8));
  }, []);

  // 調べた結果を一覧から外す（今日の一覧からだけ。前に調べた情報は残るので、また調べても AI は使わない）
  const [undo, setUndo] = useState<{ label: string; beans: ScannedBean[] } | null>(null);
  function replaceBeans(next: ScannedBean[]) {
    saveLastScan(next, loadLastScan()?.recorded ?? []);
    setBeans(next);
    onScanned?.(next);
    if (next.length === 0) {
      setStatus("idle");
      setPairing(null);
    }
  }
  function hide(names: string[], label: string) {
    setUndo({ label, beans });
    setLocalHit(null);
    replaceBeans(beans.filter((b) => !names.includes(b.name)));
  }

  // 「前に調べた豆」の候補を消すモード
  const [editRecent, setEditRecent] = useState(false);
  function forget(name: string) {
    forgetSaved(name);
    const next = recentSaved(8);
    setRecent(next);
    if (next.length === 0) setEditRecent(false);
  }

  const wishOf = (b: ScannedBean) =>
    wishes.find((w) => w.name === b.name && w.origin === b.origin);

  // 今日は飲まないけど次に試したい豆に印を付ける（もう一度押すと外す）
  async function toggleWish(b: ScannedBean) {
    const wish = wishOf(b);
    if (wish) {
      await deleteWish(wish.id);
      setWishes((ws) => ws.filter((w) => w.id !== wish.id));
    } else {
      const added = { ...b, id: crypto.randomUUID(), savedAt: Date.now() };
      await putWish(added);
      setWishes((ws) => [added, ...ws]);
    }
  }

  const picks = useMemo(
    () => scoreBeans(beans, records, prefs),
    [beans, records, prefs],
  );
  const best = picks ? bestPick(picks) : -1;

  // 気分を選んだら、その順に並べる（番号はおすすめの計算と同じ、元の並びのまま持つ）
  const [mood, setMood] = useState<Mood | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  // タップで開いているカード（1杯だけのときは最初から開く）
  const [openCard, setOpenCard] = useState<string | null>(null);
  // スイーツとの相性を出したときは、その順を優先する
  const order = useMemo(() => {
    const idx = beans.map((_, i) => i);
    if (pairing) {
      const s = (i: number) => pairing.byName.get(beans[i].name)?.score ?? 0;
      return idx.sort((a, b) => s(b) - s(a));
    }
    return mood ? idx.sort((a, b) => mood.score(beans[b]) - mood.score(beans[a])) : idx;
  }, [beans, mood, pairing]);
  const sortSummary = mood
    ? `気分：${mood.label}`
    : pairing
      ? pairing.mood
        ? `気分：${pairing.sweet}`
        : `スイーツ：${pairing.sweet}`
      : "";

  async function addBag(b: ScannedBean) {
    const d = beanToDraft(b);
    await putBag({
      id: crypto.randomUUID(),
      origin: d.origin,
      farm: d.farm,
      roast: d.roast,
      process: d.process,
      shop: "",
      note: b.explanation,
      price: null,
      boughtAt: today(),
      finished: false,
      createdAt: Date.now(),
    });
    setBagged((ns) => [...ns, b.name]);
  }

  /** いま頼む・食べているスイーツか、文字で入れた気分に合う順に並べる */
  async function pairWith(s = sweet.trim(), asMood = false) {
    if (!s) return;
    if (!passcode) return setError("先に合言葉を入れてください");
    if (!navigator.onLine) return setError("オフラインのため調べられません");
    setError("");
    setPairingBusy(true);
    try {
      const res = await fetch("/api/read-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [asMood ? "mood" : "sweet"]: s,
          beans: beans.map(({ name, roast, process }) => ({ name, roast, process })),
          passcode: passcode.trim().normalize("NFKC"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) setSavedPasscode(false);
      if (!res.ok) throw new Error(data.error ?? "相性を調べられませんでした");
      const byName = new Map<string, { score: number; reason: string }>();
      for (const r of (data as PairingResult).ranks) {
        const bean = beans[r.index];
        if (bean)
          byName.set(bean.name, {
            score: Math.min(5, Math.max(1, r.score)),
            reason: r.reason,
          });
      }
      setPairing({ sweet: s, mood: asMood, byName });
      setMood(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "相性を調べられませんでした");
    } finally {
      setPairingBusy(false);
    }
  }

  // 前に飲んだ豆と、まだ飲んだことのない国
  const drunkCountries = useMemo(
    () => new Set(records.map((r) => countryOf(r) ?? r.origin)),
    [records],
  );
  function badgesOf(b: ScannedBean) {
    const out: string[] = [];
    const farm = farmOf(b);
    const same = records.filter(
      (r) => r.farm && r.farm === farm && (!b.origin || r.origin === b.origin),
    );
    if (same.length > 0)
      out.push(`前に★${Math.max(...same.map((r) => r.overall))}`);
    const country = countryOf({ origin: b.origin, farm }) ?? b.origin;
    if (records.length > 0 && country && !drunkCountries.has(country))
      out.push("初めての国");
    return out;
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await scan(file);
  }

  // 写真が撮れないときや、店員さんに聞いた豆は文字で調べる
  const [textOpen, setTextOpen] = useState(false);
  const [text, setText] = useState("");

  async function scan(photo: Blob) {
    // 料金は画像の大きさで決まるので、長辺1000pxまで縮めてから送る
    await request(async () => ({
      image: await blobToBase64(await shrinkPhoto(photo, 1000)),
    }));
  }

  /** 調べ済みの豆を一覧の先頭に出す（AI は使わない） */
  function showLocal(b: ScannedBean, how: string, q: string) {
    const next = [b, ...beans.filter((x) => x.name !== b.name)];
    saveLastScan(next);
    setBeans(next);
    onScanned?.(next);
    setStatus("done");
    setTextOpen(false);
    setError("");
    setUndo(null);
    setLocalHit({ name: b.name, how, query: q });
  }

  /** 文字で調べる。アプリに入っている産地・銘柄と、前に調べた豆は AI を呼ばずに出す（無料・オフラインでも出る） */
  async function lookupText(fresh = false, q = text.trim()) {
    if (!q) return;
    setLocalHit(null);
    if (!fresh) {
      const known = findKnownBean(q);
      if (known) return (showLocal(known, "アプリに入っている情報", q), setText(""));
      const saved = findSaved(q);
      if (saved) return (showLocal(saved, "前に調べた情報", q), setText(""));
    }
    await request(async () => ({ text: q }), q);
  }

  async function request(
    payload: () => Promise<{ image?: string; text?: string }>,
    query?: string,
  ) {
    setLocalHit(null);
    if (!passcode) return setError("先に合言葉を入れてください");
    if (!navigator.onLine)
      return setError("オフラインのため読み取れません。電波のあるところでもう一度お試しください");

    setError("");
    setSearching(query ?? null);
    setStatus("reading");
    try {
      const res = await fetch("/api/read-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(await payload()),
          passcode: passcode.trim().normalize("NFKC"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) setSavedPasscode(false);
      if (!res.ok) throw new Error(data.error ?? "読み取りに失敗しました");
      try {
        localStorage.setItem(PASSCODE_KEY, passcode.trim().normalize("NFKC"));
      } catch {}
      setSavedPasscode(true);
      const result = data as MenuScanResult;
      if (result.beans.length === 0)
        throw new Error("コーヒー豆のメニューが見つかりませんでした");
      // 次からは AI を呼ばずに出せるよう保存しておく
      saveLookups(result.beans, query);
      setRecent(recentSaved(8));
      setBeans(result.beans);
      setPairing(null);
      saveLastScan(result.beans);
      onScanned?.(result.beans);
      setStatus("done");
      setUndo(null);
      setTextOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み取りに失敗しました");
      setStatus("idle");
    }
  }

  return (
    <section className={styles.box} aria-label="メニューを撮って入力">
      {status === "done" ? (
        <Hint id="scan-done" className={styles.lead}>
          豆の名前をタップすると、説明や飲み方が開きます。「＋記録」を押すと、豆の情報が入った状態で感想を書けます。
        </Hint>
      ) : (
        <p className={styles.lead}>
          メニューを撮るか文字で入れると、豆ごとに解説とおすすめの飲み方を出して、記録の項目に入れます。
        </p>
      )}
      {!savedPasscode && (
        <div className="field">
          <label className="label" htmlFor="scan-pass">
            合言葉
          </label>
          <input
            id="scan-pass"
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

      <div className={status === "done" ? styles.shootRow : styles.shootCol}>
      <label
        className={`btn-primary ${styles.shoot}`}
        aria-disabled={status === "reading"}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        {status === "reading" && !searching
          ? "読み取り中…"
          : status === "done"
            ? "撮る"
            : "メニューを撮って読み取る"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPhoto}
          disabled={status === "reading"}
          className="visually-hidden"
        />
      </label>

      {status !== "reading" && (
        <label className="btn-secondary" style={{ cursor: "pointer" }}>
          {status === "done" ? "写真から" : "写真フォルダから選んで読み取る"}
          {/* capture を付けないとカメラではなく写真の一覧が開く */}
          <input
            type="file"
            accept="image/*"
            onChange={onPhoto}
            className="visually-hidden"
          />
        </label>
      )}

        {status === "done" && !textOpen && (
          <button type="button" className="btn-secondary" onClick={() => setTextOpen(true)}>
            文字で
          </button>
        )}
      </div>

      {status !== "reading" &&
        (textOpen ? (
          <div className="field">
            <label className="label" htmlFor="scan-text">
              豆の名前やメニューの文
            </label>
            <textarea
              id="scan-text"
              className="input"
              placeholder="例：ケニア カリンドゥンドゥ 深煎り（メニューの文を貼り付けても大丈夫です）"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary"
              disabled={!text.trim()}
              onClick={() => lookupText()}
            >
              この内容で調べる
            </button>
          </div>
        ) : (
          status !== "done" && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setTextOpen(true)}
            >
              文字で入力して調べる
            </button>
          )
        ))}

      {status !== "reading" && recent.length > 0 && (
        <div className="scroll-row" aria-label="前に調べた豆">
          {recent.map((b) =>
            editRecent ? (
              <button
                key={b.name}
                type="button"
                className={`chip ${styles.forget}`}
                aria-label={`${b.name}を前に調べた豆から消す`}
                onClick={() => forget(b.name)}
              >
                {b.name} ✕
              </button>
            ) : (
              <button key={b.name} type="button" className="chip" onClick={() => lookupText(false, b.name)}>
                {b.name}
              </button>
            ),
          )}
          <button
            type="button"
            className={`chip ${styles.editChip}`}
            aria-pressed={editRecent}
            onClick={() => setEditRecent(!editRecent)}
          >
            {editRecent ? "完了" : "✎ 消す"}
          </button>
        </div>
      )}
      {localHit && (
        <p className={styles.lead} style={{ margin: 0 }}>
          「{localHit.name}」は{localHit.how}から出しました（AI は使っていません）。{" "}
          {passcode && (
            <button type="button" className="btn-ghost" style={{ height: 28, padding: "0 8px", fontSize: 12 }} onClick={() => lookupText(true, localHit.query)}>
              AI で調べ直す
            </button>
          )}
        </p>
      )}

      {status === "reading" && searching && (
        <p className={styles.lead} role="status">
          {/* メニューの文を貼ったときは長いので名前は出さない */}
          {searching.length > 20 ? "入れた文から調べています…" : `「${searching}」を調べています…`}
        </p>
      )}

      {savedPhoto && status !== "reading" && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => scan(savedPhoto)}
        >
          保存した写真から読み取る
        </button>
      )}

      {undo && (
        <div className="row" style={{ alignItems: "center", flexWrap: "nowrap" }}>
          <p className={styles.lead} style={{ flex: 1, margin: 0 }} role="status">
            {undo.label}を一覧から外しました。
          </p>
          <button
            type="button"
            className="btn-ghost"
            style={{ height: 36, padding: "0 12px", flexShrink: 0 }}
            onClick={() => {
              replaceBeans(undo.beans);
              setStatus("done");
              setUndo(null);
            }}
          >
            元に戻す
          </button>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {beans.length > 0 && !picks && (
        <Hint id="scan-picks" className={styles.lead}>
          記録が{MIN_RECORDS}
          件以上たまるか、「好み」タブの「わたしの好み」を登録すると、好みに合いそうな豆に「おすすめ」を付けます。
        </Hint>
      )}
      {beans.length > 0 && picks && best < 0 && (
        <p className={styles.lead}>
          今回は、これまでの好みとはっきり合う豆が見つかりませんでした。新しい味を試すチャンスです。
        </p>
      )}

      {beans.length > 1 && (
        <div className="row" style={{ alignItems: "center", flexWrap: "nowrap" }}>
          <button
            type="button"
            className="chip"
            aria-expanded={sortOpen}
            aria-pressed={sortOpen}
            onClick={() => setSortOpen(!sortOpen)}
          >
            ⇅ 並び替え
          </button>
          {sortSummary && <span className={styles.sortNow}>{sortSummary}</span>}
          <button
            type="button"
            className="btn-ghost"
            style={{ height: 36, padding: "0 12px", flexShrink: 0, marginLeft: "auto" }}
            onClick={() => hide(beans.map((b) => b.name), `${beans.length}種類すべて`)}
          >
            すべて消す
          </button>
        </div>
      )}
      {beans.length > 1 && sortOpen && (
        <div className={styles.sortPanel}>
      {beans.length > 1 && (
        <MoodPicker
          labels={MOODS.map((m) => m.label)}
          suggest={(q) => MOODS.filter((m) => m.label.includes(q) || m.words.test(q)).map((m) => m.label)}
          value={mood?.label ?? (pairing?.mood ? pairing.sweet : null)}
          busy={pairingBusy}
          onPick={(label) => {
            setMood(MOODS.find((m) => m.label === label) ?? null);
            setPairing((p) => (label || p?.mood ? null : p));
          }}
          onText={(t) => {
            const m = moodFromText(t);
            if (m) {
              setMood(m);
              setPairing(null);
            } else pairWith(t, true);
          }}
        />
      )}
      {beans.length > 1 && (
        <form
          className="row"
          style={{ flexWrap: "nowrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            pairWith();
          }}
        >
          <label htmlFor="scan-sweet" className="visually-hidden">
            一緒に食べるスイーツ
          </label>
          <input
            id="scan-sweet"
            className="input"
            type="search"
            enterKeyHint="go"
            maxLength={40}
            placeholder="スイーツに合う順（例：チーズケーキ）"
            value={sweet}
            onChange={(e) => setSweet(e.target.value)}
          />
          <button
            type="submit"
            className="btn-secondary"
            disabled={!sweet.trim() || pairingBusy}
          >
            {pairingBusy ? "調べ中…" : "並べる"}
          </button>
        </form>
      )}
        </div>
      )}
      {mood && !MOODS.some((m) => m.label === mood.label) && (
        <p className={styles.lead}>「{mood.label}」に合いそうな順に並べました（AI は使っていません）。</p>
      )}

      {pairing && (
        <div
          className="row"
          style={{ alignItems: "center", flexWrap: "nowrap" }}
        >
          <p className={styles.lead} style={{ flex: 1 }}>
            {pairing.mood
              ? `「${pairing.sweet}」の気分に合う順に並べました。`
              : `「${pairing.sweet}」に合う順に並べました。`}
          </p>
          <button
            type="button"
            className="btn-ghost"
            style={{ height: 36, padding: "0 12px", flexShrink: 0 }}
            onClick={() => setPairing(null)}
          >
            元の順に戻す
          </button>
        </div>
      )}

      {order.map((i) => {
        const b = beans[i];
        const badges = badgesOf(b);
        const match = pairing?.byName.get(b.name);
        const open = beans.length === 1 || openCard === b.name;
        const wished = !!wishOf(b);
        const words = tasteWords(b);
        return (
          <article
            key={i}
            className={`${styles.bean} ${i === best ? styles.best : ""}`}
          >
            {/* 右上の角に置き、度数や「＋記録」から離して押し間違いを防ぐ */}
            <button
              type="button"
              className={styles.remove}
              aria-label={`${b.name}を一覧から外す`}
              onClick={() => hide([b.name], `「${b.name}」`)}
            >
              ✕
            </button>
            {i === best && picks && (
              <div className={styles.pick}>
                <strong>あなたへのおすすめ</strong>
                <span>{picks[i].reasons.join("、")}</span>
              </div>
            )}
            <button
              type="button"
              className={styles.cardHead}
              aria-expanded={open}
              onClick={() => setOpenCard(open ? null : b.name)}
            >
              <span className={styles.cardTop}>
                <span className={styles.name}>{b.name}</span>
                {b.roast && <span className={styles.abv}>{b.roast}</span>}
              </span>
            </button>
            {open && (
              <>
                {match && (
                  <p className={styles.match}>
                    <strong>
                      {pairing?.mood ? "気分に合う度" : `${pairing?.sweet}との相性`}{" "}
                      {"●".repeat(match.score) + "○".repeat(5 - match.score)}
                    </strong>
                    {match.reason}
                  </p>
                )}
                {badges.length > 0 && (
                  <div className={styles.badges}>
                    {badges.map((t) => (
                      <span key={t} className={styles.badge}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="tags">
                  {[b.origin, b.roast, b.process].filter(Boolean).map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
                {b.taste && <TasteBars taste={b.taste} />}
                {b.menuNote && <p className="muted">メニューの説明：{b.menuNote}</p>}
                <p className={styles.text}>{b.explanation}</p>
                <p className={styles.text}>
                  <strong>おすすめの飲み方：</strong>
                  {b.recommendation}
                </p>
                {b.sweets && (
                  <p className={styles.text}>
                    <strong>合うスイーツ：</strong>
                    {b.sweets}
                  </p>
                )}
                {b.methodNotes && b.methodNotes.length > 0 && (
                  <details className={styles.methods}>
                    <summary>飲み方で比べる</summary>
                    <dl>
                      {b.methodNotes.map((m) => (
                        <div key={m.method} style={{ display: "contents" }}>
                          <dt>{m.method}</dt>
                          <dd>{m.note}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
                <details className={styles.methods}>
                  <summary>AI に聞く</summary>
                  <AskAI bare context={beanContext(b)} suggestions={ASK_SUGGESTIONS} />
                </details>
              </>
            )}
            <div className={styles.actions}>
              {!open && (
                <button type="button" className={styles.oneLine} onClick={() => setOpenCard(b.name)}>
                  {match && `${"●".repeat(match.score)}${"○".repeat(5 - match.score)} `}
                  {[words, b.origin].filter(Boolean).join("｜") || "タップで詳しく"}
                </button>
              )}
              <button
                type="button"
                className={`${styles.act} ${styles.actMain}`}
                style={open ? { flex: 1 } : undefined}
                onClick={() => onPick(b)}
              >
                ＋記録
              </button>
              <button
                type="button"
                className={styles.act}
                aria-pressed={wished}
                aria-label={wished ? "気になるから外す" : "気になる（次に試す）"}
                onClick={() => toggleWish(b)}
              >
                {wished ? "★" : "☆"}
              </button>
              {open ? (
                <button
                  type="button"
                  className={styles.act}
                  disabled={bagged.includes(b.name)}
                  aria-label="家の豆に登録（買って家にある豆）"
                  onClick={() => addBag(b)}
                >
                  {bagged.includes(b.name) ? "家の豆 ✓" : "＋家の豆"}
                </button>
              ) : (
                <button type="button" className={styles.act} aria-label="詳しく見る" onClick={() => setOpenCard(b.name)}>
                  ⋯
                </button>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
