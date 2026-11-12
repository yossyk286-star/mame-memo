import { FLAVORS } from "./glossary";
import { today } from "./lastScan";
import type { Roast, TastingRecord } from "./types";

/** 今日から n 日前の「YYYY-MM-DD」 */
export function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 日付の欄の横に出すボタン（61） */
export const DATE_CHIPS: [string, () => string][] = [
  ["今日", today],
  ["きのう", () => daysAgo(1)],
  ["おととい", () => daysAgo(2)],
];

/** 焙煎度ごとの「感じた味」の言葉（2）。浅煎りは果実・花、深煎りはチョコ・ナッツが先頭 */
export const FLAVORS_BY_ROAST: Record<Exclude<Roast, "不明">, string[]> = {
  浅煎り: ["柑橘", "ベリー", "フローラル", "チェリー", "黄桃", "紅茶", "レモン", "はちみつ", "ジャスミン", "ナッツ"],
  中煎り: ["キャラメル", "ナッツ", "チョコレート", "黄桃", "はちみつ", "チェリー", "柑橘", "ベリー", "紅茶"],
  深煎り: ["チョコレート", "ナッツ", "キャラメル", "黒糖", "スモーキー", "スパイス", "ベリー", "ドライフルーツ"],
};

/** その焙煎度の味の言葉を、自分がよく選んだ順に（同じ回数なら決まった順）。2回以上使った自分の言葉も足す */
export function flavorChoices(roast: Roast | null, past: TastingRecord[]) {
  const base = roast && roast !== "不明" ? FLAVORS_BY_ROAST[roast] : FLAVORS;
  const count = new Map<string, number>();
  for (const r of past) if (!roast || roast === "不明" || r.roast === roast) for (const f of r.flavors) count.set(f, (count.get(f) ?? 0) + 1);
  const mine = [...count].filter(([f, n]) => n >= 2 && !base.includes(f)).map(([f]) => f);
  const all = [...base, ...mine];
  return all.sort((a, b) => (count.get(b) ?? 0) - (count.get(a) ?? 0) || all.indexOf(a) - all.indexOf(b));
}

/** 飲んだ量の選び方（32）。カフェインの計算に使う */
export const VOLUMES: [string, number][] = [
  ["エスプレッソ", 30],
  ["ダブル", 60],
  ["S", 180],
  ["M", 240],
  ["L", 350],
];

/** 「M（240ml）」のような量の名前 */
export function volumeName(ml: number) {
  const hit = VOLUMES.find(([, v]) => v === ml);
  return hit ? `${hit[0]}（${ml}ml）` : `${ml}ml`;
}

/** よく入れる値段3つと、そのお店で前に入れた値段（54） */
export function priceChoices(past: TastingRecord[], shop: string) {
  const count = new Map<number, number>();
  for (const r of past) if (r.price) count.set(r.price, (count.get(r.price) ?? 0) + 1);
  const often = [...count].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 3).map(([p]) => p);
  const here = shop.trim() ? past.find((r) => r.price && r.shop.trim() === shop.trim())?.price ?? null : null;
  const out = here ? [here, ...often.filter((p) => p !== here)] : often;
  return out.slice(0, 4).sort((a, b) => a - b);
}

/** これまでに付けたタグを、よく使う順に */
export function tagsUsed(records: TastingRecord[]) {
  const count = new Map<string, number>();
  for (const r of records) for (const t of r.tags ?? []) count.set(t, (count.get(t) ?? 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

/** 入力されたタグをととのえる（先頭の # と前後の空白を取る） */
export function cleanTag(t: string) {
  return t.replace(/^[#＃\s]+/, "").trim().slice(0, 20);
}
