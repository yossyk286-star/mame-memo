"use client";

import { useEffect, useMemo, useState } from "react";
import type { MenuScanResult, ScannedBean } from "@/lib/menuScan";
import { deleteWish, listRecords, listWishes, putWish, type WishBean } from "@/lib/db";
import { saveLastScan } from "@/lib/lastScan";
import { shrinkPhoto } from "@/lib/photo";
import { bestPick, MIN_RECORDS, scoreBeans } from "@/lib/recommend";
import type { TastingRecord } from "@/lib/types";
import styles from "./MenuScan.module.css";

const PASSCODE_KEY = "mame-memo:passcode";

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
export function PickedBean({ bean, onChange }: { bean: ScannedBean; onChange?: () => void }) {
  return (
    <section className="tips" style={{ margin: "16px 16px 0" }}>
      <div className="card-top">
        <h2>{bean.name}</h2>
        {onChange && (
          <button type="button" className="btn-ghost" style={{ flexShrink: 0 }} onClick={onChange}>
            別の豆にする
          </button>
        )}
      </div>
      <p className="term-desc">{bean.explanation}</p>
      <p className="term-desc">
        <strong>おすすめの飲み方：</strong>
        {bean.recommendation}
      </p>
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
  const [status, setStatus] = useState<"idle" | "reading" | "done">(initialBeans.length ? "done" : "idle");
  const [beans, setBeans] = useState<ScannedBean[]>(initialBeans);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<TastingRecord[]>([]);
  const [wishes, setWishes] = useState<WishBean[]>([]);

  // localStorage はブラウザでしか読めないので、表示後に読み込む
  useEffect(() => {
    const saved = loadPasscode();
    setPasscode(saved);
    setSavedPasscode(!!saved);
    // これまでの記録から、好みに合いそうな豆におすすめを付ける
    listRecords().then(setRecords);
    listWishes().then(setWishes);
  }, []);

  const wishOf = (b: ScannedBean) => wishes.find((w) => w.name === b.name && w.origin === b.origin);

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

  const picks = useMemo(() => scoreBeans(beans, records), [beans, records]);
  const best = picks ? bestPick(picks) : -1;

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await scan(file);
  }

  async function scan(photo: Blob) {
    if (!passcode) return setError("先に合言葉を入れてください");

    setError("");
    setStatus("reading");
    try {
      // 料金は画像の大きさで決まるので、長辺1000pxまで縮めてから送る
      const image = await blobToBase64(await shrinkPhoto(photo, 1000));
      const res = await fetch("/api/read-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, passcode: passcode.trim().normalize("NFKC") }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) setSavedPasscode(false);
      if (!res.ok) throw new Error(data.error ?? "読み取りに失敗しました");
      try {
        localStorage.setItem(PASSCODE_KEY, passcode.trim().normalize("NFKC"));
      } catch {}
      setSavedPasscode(true);
      const result = data as MenuScanResult;
      if (result.beans.length === 0) throw new Error("コーヒー豆のメニューが見つかりませんでした");
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
          ? "飲んだ豆を選ぶと、豆の情報が入った状態で感想を書けます。"
          : "メニューを撮ると、豆ごとに解説とおすすめの飲み方を出して、記録の項目に入れます。"}
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

      <label className={`btn-primary ${styles.shoot}`} aria-disabled={status === "reading"}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        {status === "reading" ? "読み取り中…" : status === "done" ? "撮り直す" : "メニューを撮って読み取る"}
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
          <input type="file" accept="image/*" onChange={onPhoto} className="visually-hidden" />
        </label>
      )}

      {savedPhoto && status !== "reading" && (
        <button type="button" className="btn-secondary" onClick={() => scan(savedPhoto)}>
          保存した写真から読み取る
        </button>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {beans.length > 0 && !picks && (
        <p className={styles.lead}>記録が{MIN_RECORDS}件以上たまると、好みに合いそうな豆に「おすすめ」を付けます。</p>
      )}
      {beans.length > 0 && picks && best < 0 && (
        <p className={styles.lead}>今回は、これまでの好みとはっきり合う豆が見つかりませんでした。新しい味を試すチャンスです。</p>
      )}

      {beans.map((b, i) => (
        <article key={i} className={`${styles.bean} ${i === best ? styles.best : ""}`}>
          {i === best && picks && (
            <div className={styles.pick}>
              <strong>あなたへのおすすめ</strong>
              <span>{picks[i].reasons.join("、")}</span>
            </div>
          )}
          <h3>{b.name}</h3>
          <div className="tags">
            {[b.origin, b.roast, b.process].filter(Boolean).map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
          {b.menuNote && <p className="muted">メニューの説明：{b.menuNote}</p>}
          <p className={styles.text}>{b.explanation}</p>
          <p className={styles.text}>
            <strong>おすすめの飲み方：</strong>
            {b.recommendation}
          </p>
          <button type="button" className="btn-primary" onClick={() => onPick(b)}>
            これを飲んだ
          </button>
          <button type="button" className="btn-secondary" aria-pressed={!!wishOf(b)} onClick={() => toggleWish(b)}>
            {wishOf(b) ? "★ 気になる豆に入れました" : "☆ 気になる（次に試す）"}
          </button>
        </article>
      ))}
    </section>
  );
}
