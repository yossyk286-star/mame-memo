import type { TastingRecord } from "./types";
import { tr } from "./i18n";

/** 1杯のカフェイン量（mg）の目安。エスプレッソ系はショット1〜2杯分、ほかはドリップ1杯（150ml）くらい */
export function caffeineMg(r: Pick<TastingRecord, "method" | "ml">) {
  // 飲んだ量を選んでいれば、その量から（32）。エスプレッソは濃いので ml あたり多め
  if (r.ml) return r.method === "エスプレッソ" || r.ml <= 60 ? r.ml * 2 : r.ml * 0.8;
  return r.method === "エスプレッソ" ? 80 : 120;
}

/** その日の「3杯・1,800円・カフェイン約360mg」。値段は入れた記録があるときだけ */
export function dayTotal(records: TastingRecord[]) {
  const priced = records.filter((r) => r.price != null);
  const yen = priced.reduce((s, r) => s + (r.price ?? 0), 0);
  const mg = Math.round(records.reduce((s, r) => s + caffeineMg(r), 0) / 10) * 10;
  const parts = [tr("{0}杯", records.length)];
  if (priced.length > 0) parts.push(tr("{0}円", yen.toLocaleString("ja-JP")));
  parts.push(tr("カフェイン約{0}mg", mg));
  return parts.join(tr("・"));
}

/** カウンター画面で使う、1杯ぶんの量の出し方と1日の目安（大人で1日400mgまで） */
export const DAY_AMOUNT = {
  of: (r: Partial<TastingRecord>) => caffeineMg({ method: r.method ?? null, ml: r.ml }),
  round: (n: number) => Math.round(n / 10) * 10,
  text: (n: number) => tr("カフェイン約{0}mg", n),
  guide: 400,
  guideText: "1日の目安はカフェイン400mgまで",
  like: (r: TastingRecord): Partial<TastingRecord> => ({ method: r.method, ml: r.ml }),
};

/** カウンターの「よく飲むもの」ボタン。豆の名前が書いていないお店でも、押すだけで1杯数える */
export const QUICK_DRINKS: { name: string; like: Partial<TastingRecord> }[] = [
  { name: "ブレンド", like: { method: "ドリップ", ml: 150 } },
  { name: "カフェラテ", like: { method: "エスプレッソ", ml: 60 } },
  { name: "アメリカーノ", like: { method: "エスプレッソ", ml: 60 } },
  { name: "エスプレッソ", like: { method: "エスプレッソ", ml: 30 } },
  { name: "カプチーノ", like: { method: "エスプレッソ", ml: 30 } },
  { name: "水出しコーヒー", like: { method: "その他", ml: 200 } },
];

/** 自分で足した飲み物は名前から淹れ方を当てて、カフェインの計算に使う */
export function guessLike(name: string): Partial<TastingRecord> {
  if (/ラテ|カプチーノ|エスプレッソ|アメリカーノ|マキアート|フラット/.test(name)) return { method: "エスプレッソ", ml: 60 };
  if (/デカフェ|カフェインレス/.test(name)) return { method: "その他", ml: 1 };
  return { method: "ドリップ", ml: 150 };
}
