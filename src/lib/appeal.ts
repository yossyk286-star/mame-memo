import { collectStamps, REGIONS } from "./countries";
import { groupByShop, isHome } from "./shops";
import type { WishBean } from "./db";
import type { Process, Roast, TastingRecord } from "./types";
import { beanTitle } from "@/components/RecordCard";

/** アプリごとに違うところ（名前・称号・しるし・友だちに送る豆）をここにまとめる。ほかの部品は両アプリで同じ */
export const APP = { id: "mame-memo", name: "まめメモ", url: "https://mame-memo.vercel.app", emblem: "bean" };

/** 好み画面や相性の文で使う呼び名 */
export const WORDS = {
  /** 「★の高かった◯◯」 */
  drink: "コーヒー",
  /** 数えるときの単位 */
  cup: "杯",
  place: "産地",
  /** 産地を数える単位 */
  placeUnit: "か国",
};

/** 記録の数で上がる称号。at 杯目でその称号になる */
export const TITLES = [
  { at: 1, name: "ひとくち目", quip: "ようこそ、豆の世界へ" },
  { at: 3, name: "一服", quip: "まずはひと息、どうぞ" },
  { at: 5, name: "豆好き", quip: "豆の袋の裏を読みはじめた" },
  { at: 10, name: "珈琲好き", quip: "朝の1杯がないと始まらない" },
  { at: 25, name: "珈琲通", quip: "産地を聞かれたら即答できる" },
  { at: 50, name: "目利き", quip: "もう選ばれる側じゃなく、選ぶ側" },
  { at: 100, name: "珈琲仙人", quip: "香りだけで産地がわかる…気がする" },
  { at: 200, name: "珈琲聖", quip: "バリスタに一目置かれる存在" },
  { at: 365, name: "珈琲の神", quip: "もはや拝まれる側" },
  { at: 500, name: "珈琲そのもの", quip: "もう、どっちが淹れているのかわからない" },
];

/** いちばん上まで来たときのひとこと（称号・しるし） */
export const TOP_LINES = { title: "もう教えることはありません。夜はデカフェもどうぞ", badge: "極めた！おかわり？" };

/** しるしの段の名前（銅→ダイヤ）。Medal の METALS と同じ並び */
export const METAL_NAMES = ["銅", "銀", "金", "プラチナ", "ダイヤ"];

/** icon は Medal に彫る絵の名前。「#10」のように # で始まるときは数字を彫る */
export type Badge = {
  id: string;
  icon: string;
  label: string;
  /** いまの段（0 銅〜4 ダイヤ）。まだ取っていなければ -1 */
  tier: number;
  done: boolean;
  /** 次の段に上がるには（いちばん上なら null） */
  /** how は「{0}杯記録する」のような文（{0} に need、{1} に arg が入る。tr で訳してから埋める） */
  next: { how: string; need: number; arg?: string; left: number; unit: string; metal: string } | null;
};

/**
 * 同じ中身のしるしは1つにまとめ、続けるほど 銅→銀→金→プラチナ→ダイヤ と色が変わる。
 * steps は各段に届く数。how は段の数から「{0}杯記録する」のような文を選ぶ
 */
function tiered(id: string, icon: string, label: string, have: number, steps: number[], how: (n: number) => string, unit: string, arg?: string): Badge {
  const tier = steps.filter((s) => have >= s).length - 1;
  const need = steps[tier + 1];
  return {
    id,
    // 数字を彫るしるしは、いまの段（まだなら最初の段）の数を彫る
    icon: icon === "#" ? `#${steps[Math.max(0, tier)]}` : icon,
    label,
    tier,
    done: tier >= 0,
    next: need === undefined ? null : { how: how(need), need, arg, left: need - have, unit, metal: METAL_NAMES[tier + 1] },
  };
}

const ROASTS: [Roast, string][] = [
  ["浅煎り", "bean"],
  ["中煎り", "bean-half"],
  ["深煎り", "bean-full"],
];

/** あつめるしるし。段は記録から決める */
export function badgesOf(records: TastingRecord[]): Badge[] {
  const n = records.length;
  const places = collectStamps(records).stamps;
  const regions = new Set(
    [...places.keys()].map((p) => REGIONS.find((r) => r.countries.some((c) => c.name === p))?.region).filter(Boolean),
  );
  const processes = new Set(records.map((r) => r.process).filter((p) => p && p !== "不明" && p !== "その他"));
  const methods = new Set(records.map((r) => r.method).filter(Boolean));
  const shops = groupByShop(records).length;
  const perDay = new Map<string, number>();
  for (const r of records) perDay.set(r.date, (perDay.get(r.date) ?? 0) + 1);
  const weekends = new Set(
    records
      .filter((r) => {
        const [y, m, d] = r.date.split("-").map(Number);
        const w = new Date(y, m - 1, d).getDay();
        return w === 0 || w === 6;
      })
      .map((r) => r.date),
  ).size;
  const roastCount = (k: string) => records.filter((r) => r.roast === k).length;
  const homeCount = records.filter((r) => isHome(r.shop)).length;
  const photoCount = records.filter((r) => r.photos?.length || r.photo).length;
  return [
    tiered("cups", "#", "記録した杯数", n, [1, 10, 25, 50, 100], (x) => (x === 1 ? "はじめて記録する" : "{0}杯記録する"), "杯"),
    tiered("places", "pin", "産地", places.size, [3, 5, 10, 15, 20], () => "{0}か国の豆を飲む", "か国"),
    tiered("regions", "globe", "世界の地域", regions.size, [1, 2, 3], () => "{0}つの地域（アフリカ・中南米・アジア）の豆を飲む", "地域"),
    ...ROASTS.map(([k, icon]) => tiered(`r-${k}`, icon, k, roastCount(k), [1, 3, 5, 10, 20], (x) => (x === 1 ? "{1}を記録する" : "{1}を{0}杯"), "杯", k)),
    tiered("r-all", "beans", "焙煎度ぜんぶ", Math.min(...ROASTS.map(([k]) => roastCount(k))), [1, 2, 3, 5, 10], (x) => (x === 1 ? "浅煎り・中煎り・深煎りを記録する" : "焙煎度それぞれ{0}杯"), "杯"),
    tiered("methods", "dripper", "淹れ方", methods.size, [1, 2, 3, 4, 5], (x) => (x === 1 ? "淹れ方を記録する" : "{0}種類の淹れ方で記録する"), "種類"),
    tiered("process", "beans", "精製", processes.size, [1, 2, 3, 4], (x) => (x === 1 ? "精製方法を記録する" : "{0}種類の精製方法の豆を記録する"), "種類"),
    tiered("natural", "cherry", "ナチュラル", records.filter((r) => r.process === "Natural").length, [1, 3, 5, 10, 20], (x) => (x === 1 ? "ナチュラル精製の豆を記録する" : "ナチュラルを{0}杯"), "杯"),
    tiered("star5", "star", "★5の1杯", records.filter((r) => r.overall >= 5).length, [1, 3, 5, 10, 20], (x) => (x === 1 ? "★5をつける" : "★5を{0}回"), "回"),
    tiered("shops", "store", "お店", shops, [3, 5, 10, 20, 30], () => "{0}軒のお店で記録する", "軒"),
    tiered("home", "home", "家で一杯", homeCount, [1, 3, 5, 10, 20], (x) => (x === 1 ? "家で淹れて記録する" : "家で{0}杯"), "杯"),
    tiered("photo", "camera", "写真", photoCount, [5, 10, 20, 30, 50], () => "写真つきの記録を{0}つ", "つ"),
    tiered("weekend", "sun", "週末の一杯", weekends, [1, 3, 5, 10, 20], (x) => (x === 1 ? "土日に記録する" : "週末{0}日"), "日"),
    tiered("three", "cups", "1日に3杯", [...perDay.values()].filter((c) => c >= 3).length, [1, 3, 5, 10, 20], (x) => (x === 1 ? "同じ日に3杯記録する" : "3杯の日を{0}日"), "日"),
  ];
}

/** 飲んだ産地（スタンプ帳と同じ数えかた） */
export function placesOf(records: TastingRecord[]) {
  return collectStamps(records).stamps;
}

/** 友だちに送る「★の高かった豆」。名前・焙煎度・精製・産地と、その記録の味（酸味・苦味・甘さ・コク）だけ。メモやお店は送らない */
export type Fav = [name: string, roast: string, process: string, origin: string, taste: number[]];

export function favOf(r: TastingRecord): Fav | null {
  const name = beanTitle(r);
  const taste = [r.acidity, r.bitterness, r.sweetness, r.body].map((v) => v ?? 3);
  return r.origin || r.farm ? [name, r.roast ?? "", r.process ?? "", r.origin, taste] : null;
}

export function favView([name, roast, , origin]: Fav) {
  return { title: name, sub: [roast, origin].filter((s) => s && s !== "不明" && !name.includes(s)) };
}

const ROAST_NAMES: Roast[] = ["浅煎り", "中煎り", "深煎り", "不明"];
const PROCESS_NAMES: Process[] = ["Washed", "Natural", "Honey", "Anaerobic", "その他", "不明"];

/** 送られてきた豆を「気になる」に入れる形にする */
export function favToWish([name, roast, process, origin, taste]: Fav, from: string): WishBean {
  const [acidity, bitterness, sweetness, body] = taste;
  return {
    id: crypto.randomUUID(),
    savedAt: Date.now(),
    name,
    origin,
    farm: "",
    roast: ROAST_NAMES.find((r) => r === roast) ?? null,
    process: PROCESS_NAMES.find((p) => p === process) ?? null,
    menuNote: "",
    explanation: from,
    recommendedMethod: null,
    recommendation: "",
    taste: { acidity, bitterness, sweetness, body },
    methodNotes: [],
  };
}

/** ホームの上に出す「いまの時間」のカード（さけは夜、まめは朝）。from〜to 時（to が24を超えると翌日） */
export const MOMENT = {
  from: 6,
  to: 11,
  title: "おはよう。今朝の1杯、残しておこう",
  shoot: "メニューを撮る",
};

/**
 * 記録が少ないうちの好み診断（44）。答えは「わたしの好み」に入って、おすすめに使われる。
 * multi は複数選べる。value は MyPrefs に入れる値
 */
export type QuizQ =
  | { key: "roasts" | "avoidRoasts" | "methods" | "ways" | "likes"; q: string; multi: true; options: { label: string; value: string }[] }
  | { key: "acidity" | "bitterness" | "body" | "budget"; q: string; multi?: false; options: { label: string; value: number | null }[] };

const pick = (xs: string[]) => xs.map((v) => ({ label: v, value: v }));

export const TASTE_QUIZ: QuizQ[] = [
  { key: "roasts", q: "好きな焙煎度は？", multi: true, options: pick(["浅煎り", "中煎り", "深煎り"]) },
  {
    key: "acidity",
    q: "酸味は？",
    options: [
      { label: "控えめが好き", value: 1 },
      { label: "少しなら", value: 2 },
      { label: "どちらでも", value: null },
      { label: "明るい酸が好き", value: 4 },
      { label: "しっかり酸っぱいのが好き", value: 5 },
    ],
  },
  {
    key: "bitterness",
    q: "苦みは？",
    options: [
      { label: "控えめが好き", value: 1 },
      { label: "やや控えめ", value: 2 },
      { label: "どちらでも", value: null },
      { label: "ほどよく苦いのが好き", value: 4 },
      { label: "がつんと苦いのが好き", value: 5 },
    ],
  },
  {
    key: "body",
    q: "軽いのと濃いの、どっちが好き？",
    options: [
      { label: "軽くすっきり", value: 1 },
      { label: "やや軽め", value: 2 },
      { label: "どちらでも", value: null },
      { label: "ややしっかり", value: 4 },
      { label: "濃くどっしり", value: 5 },
    ],
  },
  { key: "likes", q: "好きな味は？", multi: true, options: pick(["チェリー", "ベリー", "柑橘", "黄桃", "フローラル", "チョコレート", "ナッツ", "キャラメル"]) },
  { key: "methods", q: "好きな淹れ方は？", multi: true, options: pick(["ドリップ", "エアロプレス", "エスプレッソ", "サイフォン", "フレンチプレス"]) },
  { key: "ways", q: "好きな飲み方は？", multi: true, options: pick(["ホット", "アイス", "ブラック", "ミルク"]) },
  {
    key: "budget",
    q: "お店で1杯いくらくらいまで？",
    options: [
      { label: "〜500円", value: 500 },
      { label: "〜800円", value: 800 },
      { label: "〜1,200円", value: 1200 },
      { label: "気にしない", value: null },
    ],
  },
];
