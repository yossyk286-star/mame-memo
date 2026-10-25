"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SingleChips } from "@/components/ChipGroup";
import { beanTitle, roastColor, stars, yen } from "@/components/RecordCard";
import { deleteBag, listBags, listRecords, putBag } from "@/lib/db";
import { PROCESSES, ROASTS } from "@/lib/glossary";
import { today } from "@/lib/lastScan";
import { bestRecipe, recipeText } from "@/lib/recipe";
import type { Bag, TastingRecord } from "@/lib/types";

function emptyBag(): Omit<Bag, "id" | "createdAt"> {
  return { origin: "", farm: "", roast: null, process: null, shop: "", note: "", price: null, boughtAt: today(), finished: false };
}

/** 買った豆を登録するフォーム */
function AddBag({ onAdded }: { onAdded: (b: Bag) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyBag);
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((d) => ({ ...d, [key]: value }));

  async function save() {
    if (!draft.origin.trim()) return;
    const bag: Bag = { ...draft, origin: draft.origin.trim(), id: crypto.randomUUID(), createdAt: Date.now() };
    await putBag(bag);
    onAdded(bag);
    setDraft(emptyBag());
    setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        ＋ 買った豆を登録
      </button>
    );
  }
  return (
    <form
      className="card"
      style={{ gap: 14 }}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <div className="field" style={{ flex: 1 }}>
          <label className="label" htmlFor="b-origin">
            産地（国） <span className="req">必須</span>
          </label>
          <input id="b-origin" className="input" placeholder="例：エチオピア" value={draft.origin} onChange={(e) => set("origin", e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label className="label" htmlFor="b-farm">
            農園・品種
          </label>
          <input id="b-farm" className="input" value={draft.farm} onChange={(e) => set("farm", e.target.value)} />
        </div>
      </div>
      <fieldset className="field">
        <legend className="label">焙煎度</legend>
        <SingleChips options={ROASTS} value={draft.roast} onChange={(v) => set("roast", v)} />
      </fieldset>
      <fieldset className="field">
        <legend className="label">精製方法</legend>
        <SingleChips options={PROCESSES} value={draft.process} onChange={(v) => set("process", v)} />
      </fieldset>
      <div className="field">
        <label className="label" htmlFor="b-shop">
          買ったお店
        </label>
        <input id="b-shop" className="input" placeholder="例：〇〇珈琲" value={draft.shop} onChange={(e) => set("shop", e.target.value)} />
      </div>
      <div className="field">
        <label className="label" htmlFor="b-price">
          買った値段（円）
        </label>
        <input
          id="b-price"
          className="input"
          inputMode="numeric"
          placeholder="例：1800"
          value={draft.price ?? ""}
          onChange={(e) => {
            const digits = e.target.value.normalize("NFKC").replace(/\D/g, "");
            set("price", digits ? Number(digits) : null);
          }}
        />
      </div>
      <div className="row">
        <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={!draft.origin.trim()}>
          登録する
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
          やめる
        </button>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        メニューを撮って調べた結果からも「家の豆に登録」で入れられます。
      </p>
    </form>
  );
}

function BagCard({
  bag: b,
  records,
  onChange,
  onDelete,
}: {
  bag: Bag;
  records: TastingRecord[];
  onChange: (b: Bag) => void;
  onDelete: (id: string) => void;
}) {
  const mine = records.filter((r) => r.bagId === b.id);
  const avg = mine.length ? mine.reduce((a, r) => a + r.overall, 0) / mine.length : 0;
  const best = bestRecipe(mine);
  return (
    <article className="card" style={{ gap: 6, opacity: b.finished ? 0.7 : 1 }}>
      <div className="card-top">
        <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="kind-dot" style={{ background: roastColor(b.roast) }} aria-hidden="true" />
          {beanTitle(b)}
        </h2>
        {b.finished && <span className="muted">飲みきった</span>}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        {[[b.roast, b.process].filter((t) => t && t !== "不明").join("・"), b.shop, b.price && yen(b.price), `${b.boughtAt.slice(5).replace("-", "/")}に購入`]
          .filter(Boolean)
          .join("・")}
      </p>
      <p style={{ margin: 0, fontSize: 14 }}>
        {mine.length > 0 ? (
          <>
            {mine.length}回記録・平均 <span className="stars">{stars(Math.round(avg))}</span>
          </>
        ) : (
          <span className="muted">まだ記録していません</span>
        )}
      </p>
      {best?.recipe && (
        <p className="best-recipe">
          <strong>いちばん良かったレシピ</strong>（{stars(best.overall)}・{best.method ?? "淹れ方未入力"}）
          <br />
          {recipeText(best.recipe)}
        </p>
      )}
      {mine.length > 0 && (
        <details className="bottle-history">
          <summary>記録を見る</summary>
          {mine.map((r) => (
            <Link key={r.id} href={`/record?id=${r.id}`}>
              {r.date.slice(5).replace("-", "/")} {stars(r.overall)} {r.method ?? ""} {r.recipe ? recipeText(r.recipe) : r.memo.slice(0, 20)}
            </Link>
          ))}
        </details>
      )}
      <div className="row">
        {!b.finished && (
          <Link href={`/new?bag=${b.id}`} className="btn-primary" style={{ flex: 1, whiteSpace: "nowrap" }}>
            飲んだ・記録する
          </Link>
        )}
        <button type="button" className="btn-secondary" onClick={() => onChange({ ...b, finished: !b.finished })}>
          {b.finished ? "まだある" : "飲みきった"}
        </button>
        <button type="button" className="btn-secondary btn-danger" onClick={() => onDelete(b.id)}>
          削除
        </button>
      </div>
    </article>
  );
}

/** 家で淹れるために買った豆。1袋を何回かに分けて記録し、淹れ方や日にちでの変化も追える */
export default function BagsPage() {
  const [bags, setBags] = useState<Bag[] | null>(null);
  const [records, setRecords] = useState<TastingRecord[]>([]);

  useEffect(() => {
    listBags().then(setBags);
    listRecords().then(setRecords);
  }, []);

  const [open, done] = useMemo(
    () => [(bags ?? []).filter((b) => !b.finished), (bags ?? []).filter((b) => b.finished)],
    [bags],
  );

  async function change(b: Bag) {
    await putBag(b);
    setBags((bs) => bs?.map((x) => (x.id === b.id ? b : x)) ?? null);
  }

  async function remove(id: string) {
    if (!confirm("この豆を削除しますか？（記録は残ります）")) return;
    await deleteBag(id);
    setBags((bs) => bs?.filter((x) => x.id !== id) ?? null);
  }

  return (
    <>
      <header className="sub-header">
        <Link href="/taste" className="back">
          ‹ 戻る
        </Link>
        <h1>家の豆</h1>
      </header>
      <p className="lead">買った豆を登録しておくと、淹れるたびにすぐ記録できて、淹れ方や日にちでの味の変化も追えます。</p>
      <main className="content">
        <AddBag onAdded={(b) => setBags((bs) => [b, ...(bs ?? [])])} />
        {bags?.length === 0 && <p className="empty">まだ登録していません。</p>}
        {open.map((b) => (
          <BagCard key={b.id} bag={b} records={records} onChange={change} onDelete={remove} />
        ))}
        {done.length > 0 && <h2 className="date-head">飲みきった豆</h2>}
        {done.map((b) => (
          <BagCard key={b.id} bag={b} records={records} onChange={change} onDelete={remove} />
        ))}
      </main>
    </>
  );
}
