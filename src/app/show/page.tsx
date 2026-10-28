"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { beanTitle, stars, yen } from "@/components/RecordCard";
import { listRecords } from "@/lib/db";
import { loadPrefs, type MyPrefs } from "@/lib/prefs";
import { buildShowCard, isEmptyCard, showRoasts } from "@/lib/showCard";
import type { Roast, TastingRecord } from "@/lib/types";

function Row({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="show-row">
      <span className="show-label">{label}</span>
      <span className="show-value">{items.join("、")}</span>
    </div>
  );
}

/** お店で店員さんに画面を見せて「こういう豆をください」と伝えるための画面。記録と登録した好みから作る */
export default function ShowPage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(null);
  const [prefs, setPrefs] = useState<MyPrefs | null>(null);
  const [roast, setRoast] = useState<Roast | null>(null);

  useEffect(() => {
    setPrefs(loadPrefs());
    listRecords().then(setRecords);
  }, []);

  // 見せているあいだに画面が暗くならないようにする（対応している端末だけ）
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<typeof lock> } };
    nav.wakeLock
      ?.request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, []);

  const roasts = useMemo(() => (records && prefs ? showRoasts(records, prefs) : []), [records, prefs]);
  const card = useMemo(
    () => (records && prefs ? buildShowCard(records, prefs, roast) : null),
    [records, prefs, roast],
  );

  return (
    <>
      <header className="sub-header">
        <Link href="/taste" className="back">
          ‹ 戻る
        </Link>
        <h1>店員さんに見せる</h1>
        <Link href="/prefs" className="back" style={{ gridColumn: 3, justifySelf: "end" }}>
          好みを直す
        </Link>
      </header>

      {card && (
        <main className="content show-page">
          {roasts.length > 1 && (
            <div className="row" role="group" aria-label="焙煎度">
              <button type="button" className="chip" aria-pressed={roast === null} onClick={() => setRoast(null)}>
                ぜんぶ
              </button>
              {roasts.map((r) => (
                <button key={r} type="button" className="chip" aria-pressed={roast === r} onClick={() => setRoast(r)}>
                  {r}
                </button>
              ))}
            </div>
          )}

          {isEmptyCard(card) ? (
            <p className="empty">
              まだ見せる好みがありません。
              <br />
              <Link href="/prefs">わたしの好み</Link>を登録するか、★4以上の記録がたまるとここに出ます。
            </p>
          ) : (
            <section className="show-card" aria-label="わたしの好み">
              <p className="show-ask">こういう{roast ? `${roast}の` : ""}コーヒーが好きです</p>
              {card.taste.length > 0 && (
                <div className="show-taste">
                  {card.taste.map((t) => (
                    <span key={t} className="show-pill">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="show-rows">
                <Row label="焙煎度" items={card.roasts} />
                <Row label="産地" items={card.origins} />
                <Row label="精製" items={card.processes} />
                <Row label="淹れ方" items={card.methods} />
                <Row label="飲み方" items={card.ways} />
                <Row label="好きな味" items={card.likes} />
                <Row label="苦手" items={card.dislikes} />
                {card.budget && <Row label="予算" items={[`1杯 ${yen(card.budget)}くらいまで`]} />}
              </div>
              {card.favorites.length > 0 && (
                <div className="show-favs">
                  <span className="show-label">おいしかった豆</span>
                  <ul>
                    {card.favorites.map((r) => (
                      <li key={r.id}>
                        <strong>{beanTitle(r)}</strong>
                        <span className="muted">
                          {[r.roast !== "不明" && r.roast, r.shop].filter(Boolean).join("・")} {stars(r.overall)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="show-thanks">おすすめがあれば教えてください</p>
            </section>
          )}
        </main>
      )}
    </>
  );
}
