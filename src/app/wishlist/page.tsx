"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BeanSortBar from "@/components/BeanSortBar";
import { areaOf, sortBy, type SortKey } from "@/lib/beanSort";
import { deleteWish, listWishes, type WishBean } from "@/lib/db";
import type { Roast } from "@/lib/types";
import EmptyState from "@/components/EmptyState";
import { tr, trv } from "@/lib/i18n";

/** メニューで「気になる」と印を付けた、次に試したい豆の一覧 */
export default function WishlistPage() {
  const [wishes, setWishes] = useState<WishBean[] | null>(null);
  const [roast, setRoast] = useState<Roast | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("default");

  useEffect(() => {
    listWishes().then(setWishes);
  }, []);

  async function remove(id: string) {
    const name = wishes?.find((w) => w.id === id)?.name;
    if (!confirm(tr("{0}気になるリストから外しますか？", name ? tr("「{0}」を", name) : ""))) return;
    await deleteWish(id);
    setWishes((ws) => ws?.filter((w) => w.id !== id) ?? null);
  }

  // 味の予想（taste）は後から増やした項目なので、古い気になる豆にはない
  const shown = useMemo(
    () =>
      sortBy(
        (wishes ?? []).filter((w) => (!roast || w.roast === roast) && (!area || areaOf(w) === area)),
        sort,
        (w) => ({
          acidity: w.taste?.acidity ?? null,
          bitterness: w.taste?.bitterness ?? null,
          sweetness: w.taste?.sweetness ?? null,
          body: w.taste?.body ?? null,
          roast: w.roast,
        }),
      ),
    [wishes, roast, area, sort],
  );

  return (
    <>
      <header className="page-header">
        <h1>{tr("気になる豆")}</h1>
      </header>

      <main className="content" style={{ paddingTop: 16 }}>
        {wishes && wishes.length > 1 && (
          <div className="filter-bar">
            <BeanSortBar
              roasts={wishes.map((w) => w.roast)}
              roast={roast}
              onRoast={setRoast}
              areas={wishes.map(areaOf)}
              area={area}
              onArea={setArea}
              sort={sort}
              onSort={setSort}
              sorts={["acid", "bitter", "sweet", "body", "light", "dark"]}
              defaultLabel={tr("新しい順")}
            />
          </div>
        )}
        {wishes?.length === 0 && (
          <EmptyState
            title={tr("気になる豆、まだないよ")}
            actions={[{ href: "/scan", label: tr("メニューを撮って探す") }]}
          >
            {tr("お店でメニューを撮って「☆ 気になる」を押すと、ここに残るよ。")}
          </EmptyState>
        )}
        {wishes && wishes.length > 0 && shown.length === 0 && <p className="empty">{tr("当てはまる豆がありません。")}</p>}
        {shown.map((w) => (
          <article key={w.id} className="card">
            <div className="card-top">
              <h2>{trv(w.name)}</h2>
              <span className="muted">{new Date(w.savedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</span>
            </div>
            <div className="tags">
              {[w.origin, w.roast, w.process].filter(Boolean).map((t) => (
                <span key={t} className="tag">
                  {trv(t)}
                </span>
              ))}
            </div>
            {w.menuNote && <p className="muted">{tr("メニューの説明：{0}", w.menuNote)}</p>}
            <p className="term-desc">{trv(w.explanation)}</p>
            {w.sweets && (
              <p className="term-desc">
                <strong>{tr("合うスイーツ：")}</strong>
                {trv(w.sweets)}
              </p>
            )}
            <div className="row">
              <Link href={`/new?wish=${w.id}`} className="btn-primary" style={{ flex: 1 }}>
                {tr("＋ 記録に追加")}
              </Link>
              <button type="button" className="btn-secondary btn-danger" onClick={() => remove(w.id)}>
                {tr("外す")}
              </button>
            </div>
          </article>
        ))}
      </main>
    </>
  );
}
