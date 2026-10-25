"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteWish, listWishes, type WishBean } from "@/lib/db";

/** メニューで「気になる」と印を付けた、次に試したい豆の一覧 */
export default function WishlistPage() {
  const [wishes, setWishes] = useState<WishBean[] | null>(null);

  useEffect(() => {
    listWishes().then(setWishes);
  }, []);

  async function remove(id: string) {
    await deleteWish(id);
    setWishes((ws) => ws?.filter((w) => w.id !== id) ?? null);
  }

  return (
    <>
      <header className="page-header">
        <h1>気になる豆</h1>
      </header>

      <main className="content" style={{ paddingTop: 16 }}>
        {wishes?.length === 0 && (
          <p className="empty">
            まだありません。
            <br />
            メニューを撮ったときに「☆ 気になる」を押すと、ここに残ります。
          </p>
        )}
        {wishes?.map((w) => (
          <article key={w.id} className="card">
            <div className="card-top">
              <h2>{w.name}</h2>
              <span className="muted">{new Date(w.savedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</span>
            </div>
            <div className="tags">
              {[w.origin, w.roast, w.process].filter(Boolean).map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
            {w.menuNote && <p className="muted">メニューの説明：{w.menuNote}</p>}
            <p className="term-desc">{w.explanation}</p>
            {w.sweets && (
              <p className="term-desc">
                <strong>合うスイーツ：</strong>
                {w.sweets}
              </p>
            )}
            <div className="row">
              <Link href={`/new?wish=${w.id}`} className="btn-primary" style={{ flex: 1 }}>
                ＋ 記録に追加
              </Link>
              <button type="button" className="btn-secondary btn-danger" onClick={() => remove(w.id)}>
                外す
              </button>
            </div>
          </article>
        ))}
      </main>
    </>
  );
}
