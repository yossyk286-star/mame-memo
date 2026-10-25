"use client";

import { useEffect, useState } from "react";
import type { MenuScanResult, ScannedBean } from "@/lib/menuScan";
import { shrinkPhoto } from "@/lib/photo";
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

/** メニューを撮影して豆の情報を読み取り、選んだ豆を記録フォームに渡す */
export default function MenuScan({ onPick }: { onPick: (bean: ScannedBean) => void }) {
  const [passcode, setPasscode] = useState("");
  const [savedPasscode, setSavedPasscode] = useState(false);
  const [status, setStatus] = useState<"idle" | "reading" | "done">("idle");
  const [beans, setBeans] = useState<ScannedBean[]>([]);
  const [error, setError] = useState("");

  // localStorage はブラウザでしか読めないので、表示後に読み込む
  useEffect(() => {
    const saved = loadPasscode();
    setPasscode(saved);
    setSavedPasscode(!!saved);
  }, []);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!passcode) return setError("先に合言葉を入れてください");

    setError("");
    setStatus("reading");
    try {
      // 料金は画像の大きさで決まるので、長辺1000pxまで縮めてから送る
      const image = await blobToBase64(await shrinkPhoto(file, 1000));
      const res = await fetch("/api/read-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, passcode }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) setSavedPasscode(false);
      if (!res.ok) throw new Error(data.error ?? "読み取りに失敗しました");
      try {
        localStorage.setItem(PASSCODE_KEY, passcode);
      } catch {}
      setSavedPasscode(true);
      const result = data as MenuScanResult;
      if (result.beans.length === 0) throw new Error("コーヒー豆のメニューが見つかりませんでした");
      setBeans(result.beans);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み取りに失敗しました");
      setStatus("idle");
    }
  }

  return (
    <section className={styles.box} aria-label="メニューを撮って入力">
      {!savedPasscode && (
        <div className="field">
          <label className="label" htmlFor="scan-pass">
            合言葉
          </label>
          <input
            id="scan-pass"
            className="input"
            type="password"
            autoComplete="off"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
        </div>
      )}

      <label className={`btn-primary ${styles.shoot}`} aria-disabled={status === "reading"}>
        {status === "reading" ? "読み取り中…" : status === "done" ? "撮り直す" : "メニューを撮って入力"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPhoto}
          disabled={status === "reading"}
          className="visually-hidden"
        />
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {beans.map((b, i) => (
        <article key={i} className={styles.bean}>
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
            <strong>おすすめ：</strong>
            {b.recommendation}
          </p>
          <button type="button" className="btn-secondary" onClick={() => onPick(b)}>
            この豆で記録する
          </button>
        </article>
      ))}
    </section>
  );
}
