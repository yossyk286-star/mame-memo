"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import MenuScan, { PickedBean } from "@/components/MenuScan";
import RecordForm from "@/components/RecordForm";
import { beanTitle, stars } from "@/components/RecordCard";
import { deleteWish, getBag, getWish, listBags, listRecords } from "@/lib/db";
import { loadLastScan, markRecorded } from "@/lib/lastScan";
import { beanToDraft, type ScannedBean } from "@/lib/menuScan";
import { bestRecipe, recipeText } from "@/lib/recipe";
import type { Bag, RecordDraft, TastingRecord } from "@/lib/types";
import { tr } from "@/lib/i18n";

/** 家の豆から記録する画面。豆の情報は登録したものを入れて、淹れ方と感想だけ書けばよいようにする */
function BagRecord({ bag, count, best }: { bag: Bag; count: number; best?: TastingRecord }) {
  const router = useRouter();
  return (
    <>
      <section className="tips" style={{ margin: "16px 16px 0" }}>
        <h2>{tr("家の豆：{0}", beanTitle(bag))}</h2>
        <p className="term-desc" style={{ margin: 0 }}>
          {tr("{0}回目の記録です。淹れ方や豆の量を変えたら、レシピに残しておくと比べやすくなります。", count + 1)}
        </p>
        {best?.recipe && (
          <p className="term-desc" style={{ margin: 0 }}>
            {best.bagId === bag.id ? tr("この豆で") : tr("これまでで")}{tr("いちばん良かった回（{0}）のレシピを入れています：{1}", stars(best.overall), recipeText(best.recipe))}
          </p>
        )}
      </section>
      <RecordForm
        prefill={{
          origin: bag.origin,
          farm: bag.farm,
          roast: bag.roast,
          process: bag.process,
          menuNote: bag.note,
          shop: "家",
          bagId: bag.id,
          method: best?.method ?? null,
          recipe: best?.recipe,
        }}
        beanFilled
        onSaved={() => router.replace("/bags")}
      />
    </>
  );
}

function NewRecord() {
  // メニュー確認の画面で「＋ 記録に追加」を押すと ?bean=豆の名前 で来る
  const params = useSearchParams();
  const beanParam = params.get("bean");
  // 料理から選ぶで「＋記録」を押したときは、合わせた料理も ?food=料理名 で来る
  const foodParam = params.get("food");
  // 気になる豆の一覧から「＋ 記録に追加」で来たときは ?wish=id
  const wishParam = params.get("wish");
  // 家の豆から「飲んだ・記録する」で来たときは ?bag=id
  const bagParam = params.get("bag");
  const [bag, setBag] = useState<{ bag: Bag; count: number; best?: TastingRecord } | null>(null);
  const [openBags, setOpenBags] = useState(0);
  const [wishId, setWishId] = useState<string | null>(null);
  const [beans, setBeans] = useState<ScannedBean[]>([]);
  const [picked, setPicked] = useState<ScannedBean | null>(null);
  // 同じメニューから続けて記録するとき、店名と日付は引き継ぐ
  const [carry, setCarry] = useState<Pick<RecordDraft, "shop" | "date"> | null>(
    null,
  );
  const [savedNames, setSavedNames] = useState<string[]>([]);
  const [saveCount, setSaveCount] = useState(0);
  // 今日の読み取り結果を読み込んだら MenuScan を作り直して一覧を出す
  const [loaded, setLoaded] = useState(false);
  // メニューの豆を選んでいる間はフォームを隠す（メニューにない豆を記録するときだけ出す）
  const [manual, setManual] = useState(false);

  // お店で撮っておいた今日のメニューがあれば、撮り直さずにそこから選べる
  useEffect(() => {
    const scan = loadLastScan();
    if (scan) {
      setBeans(scan.beans);
      setSavedNames(scan.recorded);
      const bean = scan.beans.find((b) => b.name === beanParam);
      if (bean) setPicked(bean);
    }
    setLoaded(true);
  }, [beanParam]);

  useEffect(() => {
    if (!wishParam) return;
    getWish(wishParam).then((w) => {
      if (!w) return;
      setPicked(w);
      setWishId(w.id);
    });
  }, [wishParam]);

  useEffect(() => {
    listBags().then((bs) => setOpenBags(bs.filter((b) => !b.finished).length));
    if (!bagParam) return;
    Promise.all([getBag(bagParam), listRecords()]).then(([b, rs]) => {
      if (!b) return;
      const mine = rs.filter((r) => r.bagId === b.id);
      // この豆でまだ淹れていなければ、ほかの豆でいちばん良かったレシピから始める
      setBag({ bag: b, count: mine.length, best: bestRecipe(mine) ?? bestRecipe(rs) });
    });
  }, [bagParam]);

  const remaining = beans.filter((b) => !savedNames.includes(b.name));

  if (bagParam) {
    return (
      <>
        <header className="sub-header">
          <Link href="/bags" className="back">
            {tr("‹ 戻る")}
          </Link>
          <h1>{tr("家の豆を記録")}</h1>
        </header>
        {bag && <BagRecord bag={bag.bag} count={bag.count} best={bag.best} />}
      </>
    );
  }

  return (
    <>
      <header className="sub-header">
        <Link href="/" className="back">
          {tr("‹ 戻る")}
        </Link>
        <h1>{tr("新しい記録")}</h1>
      </header>

      {saveCount > 0 && !picked && (
        <section
          className="tips"
          style={{ margin: "16px 16px 0" }}
          role="status"
        >
          <h2>{tr("保存しました")}</h2>
          <p className="term-desc">
            {remaining.length > 0
              ? tr("ほかにも飲んだ豆があれば、下から選んで続けて記録できます。")
              : tr("続けて別の記録も作れます。")}
          </p>
          <Link
            href="/"
            className="btn-secondary"
            style={{ display: "block", textAlign: "center" }}
          >
            {tr("記録の一覧へ")}
          </Link>
        </section>
      )}

      {!picked && saveCount === 0 && openBags > 0 && (
        <Link href="/bags" className="btn-secondary" style={{ margin: "16px 16px 0" }}>
          {tr("家の豆から記録する（{0}袋）", openBags)}
        </Link>
      )}

      {picked ? (
        <PickedBean bean={picked} onChange={() => setPicked(null)} />
      ) : (
        <MenuScan
          key={`${saveCount}:${loaded}`}
          onPick={(b) => {
            setPicked(b);
            window.scrollTo({ top: 0 });
          }}
          initialBeans={remaining}
          onScanned={(bs) => {
            setBeans(bs);
            setSavedNames([]);
          }}
        />
      )}

      {!picked && !manual && remaining.length > 0 ? (
        <div style={{ margin: "12px 16px 0" }}>
          <button
            type="button"
            className="btn-ghost"
            style={{ width: "100%" }}
            onClick={() => setManual(true)}
          >
            {tr("メニューにない豆を記録する")}
          </button>
        </div>
      ) : (
        /* 豆を選んだり保存したりしたらフォームを作り直して読み取り結果を入れる */
        <RecordForm
          key={`${saveCount}:${picked?.name ?? "blank"}`}
          prefill={{
            ...carry,
            ...(picked ? beanToDraft(picked) : {}),
            ...(picked && foodParam && picked.name === beanParam ? { sweets: foodParam } : {}),
          }}
          beanFilled={!!picked}
          fromWish={!!wishId}
          onSaved={(r) => {
            if (picked) {
              setSavedNames((ns) => [...ns, picked.name]);
              markRecorded(picked.name);
            }
            // 飲んだので気になる豆からは外す
            if (wishId) {
              deleteWish(wishId);
              setWishId(null);
            }
            setCarry({ shop: r.shop, date: r.date });
            setPicked(null);
            setManual(false);
            setSaveCount((n) => n + 1);
            window.scrollTo({ top: 0 });
          }}
        />
      )}
    </>
  );
}

export default function NewRecordPage() {
  return (
    <Suspense>
      <NewRecord />
    </Suspense>
  );
}
