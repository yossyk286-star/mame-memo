"use client";

import { useEffect, useMemo, useState } from "react";
import { farmOf, type MenuScanResult, type ScannedBean } from "@/lib/menuScan";
import { countryOf } from "@/lib/countries";
import {
  deleteWish,
  listRecords,
  listWishes,
  putWish,
  type WishBean,
} from "@/lib/db";
import { saveLastScan } from "@/lib/lastScan";
import { shrinkPhoto } from "@/lib/photo";
import { EMPTY_PREFS, loadPrefs } from "@/lib/prefs";
import { bestPick, MIN_RECORDS, scoreBeans } from "@/lib/recommend";
import type { TastingRecord } from "@/lib/types";
import styles from "./MenuScan.module.css";
import TasteBars, { level } from "./TasteBars";

const PASSCODE_KEY = "mame-memo:passcode";

/** 今日の気分。押すと、味の予想からその気分に合う順に並べ替える */
const MOODS: { label: string; score: (b: ScannedBean) => number }[] = [
  {
    label: "すっきり",
    score: ({ taste: t }) =>
      t
        ? level(t.acidity) - 0.7 * level(t.bitterness) - 0.3 * level(t.body)
        : 0,
  },
  {
    label: "甘め",
    score: ({ taste: t }) =>
      t ? level(t.sweetness) + 0.2 * level(t.body) - 0.2 * level(t.acidity) : 0,
  },
  {
    label: "しっかり苦め",
    score: ({ taste: t }) =>
      t ? level(t.bitterness) + 0.6 * level(t.body) : 0,
  },
  {
    label: "ミルクに合う",
    // ミルクに負けないコクと苦味があり、酸味が強すぎないもの
    score: ({ taste: t, roast }) =>
      t
        ? level(t.body) +
          0.7 * level(t.bitterness) -
          0.5 * level(t.acidity) +
          (roast === "深煎り" ? 1 : 0)
        : 0,
  },
];

function loadPasscode() {
  try {
    return localStorage.getItem(PASSCODE_KEY) ?? "";
  } catch {
    return "";
  }
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
  const [beans, setBeans] = useState<ScannedBean[]>(initialBeans);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<TastingRecord[]>([]);
  const [wishes, setWishes] = useState<WishBean[]>([]);
  const [prefs, setPrefs] = useState(EMPTY_PREFS);

  // localStorage はブラウザでしか読めないので、表示後に読み込む
  useEffect(() => {
    const saved = loadPasscode();
    setPasscode(saved);
    setSavedPasscode(!!saved);
    // これまでの記録から、好みに合いそうな豆におすすめを付ける
    listRecords().then(setRecords);
    listWishes().then(setWishes);
    setPrefs(loadPrefs());
  }, []);

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
  const [mood, setMood] = useState<string | null>(null);
  const order = useMemo(() => {
    const idx = beans.map((_, i) => i);
    const m = MOODS.find((x) => x.label === mood);
    return m ? idx.sort((a, b) => m.score(beans[b]) - m.score(beans[a])) : idx;
  }, [beans, mood]);
  const hasTaste = beans.some((b) => b.taste);

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

  async function request(
    payload: () => Promise<{ image?: string; text?: string }>,
  ) {
    if (!passcode) return setError("先に合言葉を入れてください");

    setError("");
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
      setBeans(result.beans);
      saveLastScan(result.beans);
      onScanned?.(result.beans);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み取りに失敗しました");
      setStatus("idle");
    }
  }

  return (
    <section className={styles.box} aria-label="メニューを撮って入力">
      <p className={styles.lead}>
        {status === "done"
          ? "「＋ 記録に追加」を押すと、豆の情報が入った状態で感想を書けます。"
          : "メニューを撮るか文字で入れると、豆ごとに解説とおすすめの飲み方を出して、記録の項目に入れます。"}
      </p>
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
        {status === "reading"
          ? "読み取り中…"
          : status === "done"
            ? "撮り直す"
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
          写真フォルダから選んで読み取る
          {/* capture を付けないとカメラではなく写真の一覧が開く */}
          <input
            type="file"
            accept="image/*"
            onChange={onPhoto}
            className="visually-hidden"
          />
        </label>
      )}

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
              onClick={() => request(async () => ({ text: text.trim() }))}
            >
              この内容で調べる
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setTextOpen(true)}
          >
            文字で入力して調べる
          </button>
        ))}

      {savedPhoto && status !== "reading" && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => scan(savedPhoto)}
        >
          保存した写真から読み取る
        </button>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {beans.length > 0 && !picks && (
        <p className={styles.lead}>
          記録が{MIN_RECORDS}
          件以上たまるか、「好み」タブの「わたしの好み」を登録すると、好みに合いそうな豆に「おすすめ」を付けます。
        </p>
      )}
      {beans.length > 0 && picks && best < 0 && (
        <p className={styles.lead}>
          今回は、これまでの好みとはっきり合う豆が見つかりませんでした。新しい味を試すチャンスです。
        </p>
      )}

      {hasTaste && beans.length > 1 && (
        <div
          className={styles.moods}
          role="group"
          aria-label="今日の気分で並べ替え"
        >
          <span>今日の気分：</span>
          {MOODS.map((m) => (
            <button
              type="button"
              key={m.label}
              className="chip"
              aria-pressed={mood === m.label}
              onClick={() => setMood(mood === m.label ? null : m.label)}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {order.map((i) => {
        const b = beans[i];
        const badges = badgesOf(b);
        return (
          <article
            key={i}
            className={`${styles.bean} ${i === best ? styles.best : ""}`}
          >
            {i === best && picks && (
              <div className={styles.pick}>
                <strong>あなたへのおすすめ</strong>
                <span>{picks[i].reasons.join("、")}</span>
              </div>
            )}
            <h3>{b.name}</h3>
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
            {b.menuNote && (
              <p className="muted">メニューの説明：{b.menuNote}</p>
            )}
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
            <button
              type="button"
              className="btn-primary"
              onClick={() => onPick(b)}
            >
              ＋ 記録に追加
            </button>
            <button
              type="button"
              className="btn-secondary"
              aria-pressed={!!wishOf(b)}
              onClick={() => toggleWish(b)}
            >
              {wishOf(b)
                ? "★ 気になる豆に入れました"
                : "☆ 気になる（次に試す）"}
            </button>
          </article>
        );
      })}
    </section>
  );
}
