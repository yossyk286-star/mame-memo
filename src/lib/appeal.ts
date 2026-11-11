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
  { at: 1, name: "コーヒーはじめ" },
  { at: 10, name: "コーヒーずき" },
  { at: 25, name: "コーヒー通" },
  { at: 50, name: "カッピングの達人" },
  { at: 100, name: "珈琲仙人" },
];

/** icon は Medal に彫る絵の名前。「#10」のように # で始まるときは数字を彫る */
export type Badge = {
  id: string;
  icon: string;
  label: string;
  how: string;
  done: boolean;
  /** 取ったあと、もっと続けるとプラチナになる。left はあと何、unit はその単位 */
  plat?: { done: boolean; how: string; left: number; unit: string };
};

/** プラチナの目安。have が need に届いたらプラチナ */
const platOf = (have: number, need: number, how: string, unit: string) => ({ done: have >= need, how, left: Math.max(0, need - have), unit });

const ROASTS: [Roast, string][] = [
  ["浅煎り", "bean"],
  ["中煎り", "bean-half"],
  ["深煎り", "bean-full"],
];

/** あつめるしるし（24個）。done は記録から決める */
export function badgesOf(records: TastingRecord[]): Badge[] {
  const n = records.length;
  const places = collectStamps(records).stamps;
  const regions = new Set(
    [...places.keys()].map((p) => REGIONS.find((r) => r.countries.some((c) => c.name === p))?.region).filter(Boolean),
  );
  const roasts = new Set(records.map((r) => r.roast));
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
  const b = (id: string, icon: string, label: string, how: string, done: boolean, plat?: Badge["plat"]): Badge => ({ id, icon, label, how, done, plat });
  const roastCount = (k: string) => records.filter((r) => r.roast === k).length;
  const homeCount = records.filter((r) => isHome(r.shop)).length;
  const photoCount = records.filter((r) => r.photos?.length || r.photo).length;
  return [
    b("n1", "sprout", "1杯目", "はじめて記録する", n >= 1),
    b("n10", "#10", "10杯目", "10杯記録する", n >= 10),
    b("n25", "#25", "25杯目", "25杯記録する", n >= 25),
    b("n50", "#50", "50杯目", "50杯記録する", n >= 50),
    b("n100", "#100", "100杯目", "100杯記録する", n >= 100),
    b("p3", "pin", "産地3か国", "3か国の豆を飲む", places.size >= 3),
    b("p5", "map", "産地5か国", "5か国の豆を飲む", places.size >= 5),
    b("p10", "compass", "産地10か国", "10か国の豆を飲む", places.size >= 10),
    b("p15", "plane", "産地15か国", "15か国の豆を飲む", places.size >= 15),
    b("regions", "globe", "3地域ぜんぶ", "アフリカ・中南米・アジアの豆を飲む", regions.size >= 3, platOf(places.size, 20, "20か国の豆を飲む", "か国")),
    ...ROASTS.map(([k, icon]) => b(`r-${k}`, icon, k, `${k}を記録する`, roasts.has(k), platOf(roastCount(k), 10, `${k}を10杯`, "杯"))),
    b("r-all", "beans", "焙煎度ぜんぶ", "浅煎り・中煎り・深煎りを記録する", ROASTS.every(([k]) => roasts.has(k)), platOf(Math.min(...ROASTS.map(([k]) => roastCount(k))), 5, "焙煎度それぞれ5杯", "杯")),
    b("methods", "dripper", "淹れ方3種", "3種類の淹れ方で記録する", methods.size >= 3, platOf(methods.size, 5, "5種類の淹れ方", "種類")),
    b("process3", "beans", "精製3種", "3種類の精製方法の豆を記録する", processes.size >= 3),
    b("natural", "cherry", "ナチュラル", "ナチュラル精製の豆を記録する", records.some((r) => r.process === "Natural"), platOf(records.filter((r) => r.process === "Natural").length, 10, "ナチュラルを10杯", "杯")),
    b("star5", "star", "★5の1杯", "★5をつける", records.some((r) => r.overall >= 5), platOf(records.filter((r) => r.overall >= 5).length, 5, "★5を5回", "回")),
    b("shop3", "store", "お店3軒", "3軒のお店で記録する", shops >= 3),
    b("shop10", "cup", "お店10軒", "10軒のお店で記録する", shops >= 10),
    b("home", "home", "家で一杯", "家で淹れて記録する", homeCount > 0, platOf(homeCount, 10, "家で10杯", "杯")),
    b("photo", "camera", "写真5枚", "写真つきの記録を5つ", photoCount >= 5, platOf(photoCount, 20, "写真つきの記録を20", "つ")),
    b("weekend", "sun", "週末の一杯", "土日に記録する", weekends > 0, platOf(weekends, 5, "週末5日", "日")),
    b("three", "cups", "1日に3杯", "同じ日に3杯記録する", [...perDay.values()].some((c) => c >= 3), platOf([...perDay.values()].filter((c) => c >= 3).length, 5, "3杯の日を5日", "日")),
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
