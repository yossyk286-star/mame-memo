import { collectStamps, REGIONS } from "./countries";
import { groupByShop, isHome } from "./shops";
import type { WishBean } from "./db";
import type { Process, Roast, TastingRecord } from "./types";
import { beanTitle } from "@/components/RecordCard";

/** アプリごとに違うところ（名前・称号・しるし・友だちに送る豆）をここにまとめる。ほかの部品は両アプリで同じ */
export const APP = { id: "mame-memo", name: "まめメモ", url: "https://mame-memo.vercel.app" };

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

export type Badge = { id: string; icon: string; label: string; how: string; done: boolean };

const ROASTS: [Roast, string][] = [
  ["浅煎り", "🌤️"],
  ["中煎り", "☕"],
  ["深煎り", "🌑"],
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
  const weekend = records.some((r) => {
    const [y, m, d] = r.date.split("-").map(Number);
    const w = new Date(y, m - 1, d).getDay();
    return w === 0 || w === 6;
  });
  const b = (id: string, icon: string, label: string, how: string, done: boolean): Badge => ({ id, icon, label, how, done });
  return [
    b("n1", "🌱", "1杯目", "はじめて記録する", n >= 1),
    b("n10", "🔟", "10杯目", "10杯記録する", n >= 10),
    b("n25", "🎖️", "25杯目", "25杯記録する", n >= 25),
    b("n50", "🏅", "50杯目", "50杯記録する", n >= 50),
    b("n100", "💯", "100杯目", "100杯記録する", n >= 100),
    b("p3", "📍", "産地3か国", "3か国の豆を飲む", places.size >= 3),
    b("p5", "🗺️", "産地5か国", "5か国の豆を飲む", places.size >= 5),
    b("p10", "🧭", "産地10か国", "10か国の豆を飲む", places.size >= 10),
    b("p15", "✈️", "産地15か国", "15か国の豆を飲む", places.size >= 15),
    b("regions", "🌏", "3地域ぜんぶ", "アフリカ・中南米・アジアの豆を飲む", regions.size >= 3),
    ...ROASTS.map(([k, icon]) => b(`r-${k}`, icon, k, `${k}を記録する`, roasts.has(k))),
    b("r-all", "🎨", "焙煎度ぜんぶ", "浅煎り・中煎り・深煎りを記録する", ROASTS.every(([k]) => roasts.has(k))),
    b("methods", "⚗️", "淹れ方3種", "3種類の淹れ方で記録する", methods.size >= 3),
    b("process3", "🫘", "精製3種", "3種類の精製方法の豆を記録する", processes.size >= 3),
    b("natural", "🍒", "ナチュラル", "ナチュラル精製の豆を記録する", records.some((r) => r.process === "Natural")),
    b("star5", "⭐", "★5の1杯", "★5をつける", records.some((r) => r.overall >= 5)),
    b("shop3", "🏪", "お店3軒", "3軒のお店で記録する", shops >= 3),
    b("shop10", "🧁", "お店10軒", "10軒のお店で記録する", shops >= 10),
    b("home", "🏠", "家で一杯", "家で淹れて記録する", records.some((r) => isHome(r.shop))),
    b("photo", "📷", "写真5枚", "写真つきの記録を5つ", records.filter((r) => r.photos?.length || r.photo).length >= 5),
    b("weekend", "🌅", "週末の一杯", "土日に記録する", weekend),
    b("three", "☕", "1日に3杯", "同じ日に3杯記録する", [...perDay.values()].some((c) => c >= 3)),
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
