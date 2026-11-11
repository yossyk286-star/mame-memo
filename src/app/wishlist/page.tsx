"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BeanSortBar from "@/components/BeanSortBar";
import { areaOf, sortBy, type SortKey } from "@/lib/beanSort";
import { deleteWish, listWishes, type WishBean } from "@/lib/db";
import type { Roast } from "@/lib/types";
import EmptyState from "@/components/EmptyState";
import { getLang, tr, trv } from "@/lib/i18n";
import { askConfirm } from "@/components/ConfirmSheet";

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
    if (!(await askConfirm({ message: tr("{0}気になるリストから外しますか？", name ? tr("「{0}」を", name) : ""), action: tr("外す") }))) return;
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
  // ☆を付けたときのお店ごとにまとめる（お店が1つも入っていなければ1つのまま）
  const groups = useMemo(() => {
    if (sort !== "default" || !shown.some((w) => w.shop)) return [{ shop: "", items: shown }];
    const out: { shop: string; items: WishBean[] }[] = [];
    for (const w of shown) {
      const shop = w.shop ?? "";
      const g = out.find((x) => x.shop === shop);
      if (g) g.items.push(w);
      else out.push({ shop, items: [w] });
    }
    // お店の分かるものを先に、分からないものは最後に
    return [...out.filter((g) => g.shop), ...out.filter((g) => !g.shop)];
  }, [shown, sort]);
  const grouped = groups.length > 1 || !!groups[0]?.shop;
  const seenOn = (w: WishBean) => new Date(w.savedAt).toLocaleDateString(getLang() === "en" ? "en-US" : "ja-JP", { month: "numeric", day: "numeric" });

  return (
    <>
      <header className="page-header">
        <h1>{tr("気になる豆")}</h1>
      </header>

      <main className="content" style={{ paddingTop: 16 }}>
        {wishes && wishes.length > 1 && (
          <div className="filter-bar" data-tour="wish-sort">
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
          <div data-tour="wish-item">
            <EmptyState
              title={tr("気になる豆、まだないよ")}
              actions={[{ href: "/scan", label: tr("メニューを撮って探す") }]}
            >
              {tr("お店でメニューを撮って「☆ 気になる」を押すと、ここに残るよ。")}
            </EmptyState>
          </div>
        )}
        {wishes && wishes.length > 0 && shown.length === 0 && <p className="empty">{tr("当てはまる豆がありません。")}</p>}
        {groups.map((g, gi) => g.items.length > 0 && (
          <section key={g.shop || "none"} className="wish-group">
            {grouped && <h2 className="date-head">{g.shop ? trv(g.shop) : tr("お店なし")}</h2>}
          <div className="list-group">
            {g.items.map((w, i) => (
              <div key={w.id} className="wish-row" data-tour={gi === 0 && i === 0 ? "wish-item" : undefined}>
                <details>
                  <summary>
                    <strong>{trv(w.name)}</strong>
                    <span className="muted">
                      {[w.origin, w.roast, w.process].filter(Boolean).map((t) => trv(t as string)).join("・")}
                    </span>
                  </summary>
                  <div className="fold-body">
                  {w.menuNote && <p className="muted">{tr("メニューの説明：{0}", w.menuNote)}</p>}
                  <p className="term-desc">{trv(w.explanation)}</p>
                  {w.sweets && (
                    <p className="term-desc">
                      <strong>{tr("合うスイーツ：")}</strong>
                      {trv(w.sweets)}
                    </p>
                  )}
                  <div className="wish-foot">
                    <span className="muted">
                      {w.shop ? tr("{0}で見た・{1}", w.shop, seenOn(w)) : tr("{0}に保存", seenOn(w))}
                    </span>
                    <button type="button" className="btn-ghost wish-remove" onClick={() => remove(w.id)}>
                      {tr("外す")}
                    </button>
                  </div>
                  </div>
                </details>
                <Link href={`/new?wish=${w.id}`} className="wish-add" aria-label={tr("「{0}」を記録に追加", w.name)}>
                  {tr("＋記録")}
                </Link>
              </div>
            ))}
          </div>
          </section>
        ))}
      </main>
    </>
  );
}
