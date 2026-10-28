import { countryOf } from "./countries";
import { ROASTS } from "./glossary";
import type { MyPrefs } from "./prefs";
import type { Roast, TastingRecord } from "./types";

/** 店員さんに見せる「こういうのが好きです」の中身 */
export interface ShowCard {
  /** 大きく出す味の言葉（酸味は控えめ、苦味しっかり など） */
  taste: string[];
  roasts: string[];
  processes: string[];
  origins: string[];
  methods: string[];
  ways: string[];
  likes: string[];
  dislikes: string[];
  budget: number | null;
  /** おいしかった豆（★4以上、評価の高い順） */
  favorites: TastingRecord[];
}

/** 気に入ったとみなす総合評価 */
const LIKED = 4;

function average(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** 多い順に並べて上から n 個 */
function topCounts(values: string[], n: number) {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([v]) => v);
}

/** 1〜5 の寄り方を言葉にする。真ん中あたりは言わない */
type Words = [low: string, high: string];
function wordFor(value: number | null, [low, high]: Words) {
  if (value === null) return null;
  if (value <= 2.4) return low;
  if (value >= 3.6) return high;
  return null;
}

/** 「ホット・ブラック」のように温度と飲み方をつなげる */
function wayOf(r: TastingRecord) {
  return [r.temp, r.style].filter(Boolean).join("・");
}

/** 焙煎度をしぼると、その焙煎度の記録だけを使う。null なら全部 */
export function buildShowCard(records: TastingRecord[], prefs: MyPrefs, roast: Roast | null): ShowCard {
  const mine = roast ? records.filter((r) => r.roast === roast) : records;
  const liked = mine.filter((r) => r.overall >= LIKED);

  // 気に入った記録の平均。自分で登録した寄り方があればそちらを優先する
  function lean(pick: (r: TastingRecord) => number | null | undefined, pref: number | null = null) {
    if (pref !== null) return pref;
    const xs = liked.map(pick).filter((x): x is number => typeof x === "number");
    return xs.length > 0 ? average(xs) : null;
  }
  const taste = [
    wordFor(lean((r) => r.acidity, prefs.acidity), ["酸味は控えめ", "酸味がしっかり"]),
    wordFor(lean((r) => r.bitterness, prefs.bitterness), ["苦味はおだやか", "苦味がしっかり"]),
    wordFor(lean((r) => r.body, prefs.body), ["軽くてすっきり", "コクがある"]),
    wordFor(lean((r) => r.sweetness), ["甘さは控えめ", "甘みがある"]),
    wordFor(lean((r) => r.aroma), ["香りは控えめ", "香りが華やか"]),
  ].filter((w): w is string => w !== null);

  const known = (v: string | null | undefined) => (v && v !== "不明" ? v : "");
  // 焙煎度をしぼったときは、焙煎度の行は出さない（見出しに出ているため）
  const roasts = roast
    ? []
    : [...new Set([...prefs.roasts.filter((r) => r !== "不明"), ...topCounts(liked.map((r) => known(r.roast)), 2)])]
        .filter((r) => !prefs.avoidRoasts.includes(r))
        .slice(0, 2);
  const processes = [
    ...new Set([...prefs.processes.filter((p) => p !== "不明"), ...topCounts(liked.map((r) => known(r.process)), 2)]),
  ].slice(0, 3);
  const origins = [...new Set([...prefs.origins, ...topCounts(liked.map((r) => countryOf(r) ?? r.origin), 3)])].slice(
    0,
    4,
  );
  const methods = [...new Set([...prefs.methods, ...topCounts(liked.map((r) => r.method ?? ""), 2)])]
    .filter((m) => m !== "その他")
    .slice(0, 3);
  const ways = [...new Set([...prefs.ways, ...topCounts(liked.map(wayOf), 2)])].slice(0, 3);
  const likes = [...new Set([...prefs.likes, ...topCounts(liked.flatMap((r) => r.flavors), 3)])]
    .filter((f) => !prefs.dislikes.includes(f))
    .slice(0, 5);
  const dislikes = [...new Set([...prefs.dislikes, ...prefs.avoidRoasts.filter((r) => r !== "不明")])];

  const favorites = [...liked]
    .filter((r) => r.origin.trim() || r.farm.trim())
    .sort((a, b) => b.overall - a.overall || b.date.localeCompare(a.date))
    .slice(0, 3);

  return { taste, roasts, processes, origins, methods, ways, likes, dislikes, budget: prefs.budget, favorites };
}

/** 選べる焙煎度。好きな焙煎度に登録したものと、気に入った記録が多い順 */
export function showRoasts(records: TastingRecord[], prefs: MyPrefs): Roast[] {
  const choices: Roast[] = ROASTS.filter((r) => r !== "不明");
  const fromRecords = topCounts(
    records.filter((r) => r.overall >= LIKED && r.roast && r.roast !== "不明").map((r) => r.roast!),
    choices.length,
  ) as Roast[];
  return [...new Set([...prefs.roasts.filter((r): r is Roast => choices.includes(r as Roast)), ...fromRecords])].filter(
    (r) => !prefs.avoidRoasts.includes(r),
  );
}

export function isEmptyCard(c: ShowCard) {
  const lists = [c.taste, c.roasts, c.processes, c.origins, c.methods, c.ways, c.likes, c.dislikes, c.favorites];
  return lists.every((l) => l.length === 0) && !c.budget;
}

/** 今日の気分（src/lib/moods.ts の MOODS）を、店員さんに伝わる言い方にする。ないものはそのまま出す */
const MOOD_PHRASES: Record<string, string> = {
  すっきり: "すっきりしたもの",
  甘め: "甘みのあるもの",
  しっかり苦め: "苦味がしっかり",
  ミルクに合う: "ミルクに合うもの",
  フルーティー: "フルーティーなもの",
  華やかな香り: "香りが華やか",
  酸味しっかり: "酸味がしっかり",
  酸味ひかえめ: "酸味は控えめ",
  まろやか: "まろやかなもの",
  "軽め・あっさり": "軽めであっさり",
  濃いめで目を覚ます: "濃いめのもの",
  ほっと一息: "ほっとできるもの",
  アイスで飲みたい: "アイスで",
  スイーツと一緒に: "スイーツに合うもの",
  飲みやすい: "飲みやすいもの",
};

export function moodPhrase(label: string) {
  return MOOD_PHRASES[label] ?? label;
}

const MOOD_KEY = "mame-memo:show-mood";

/** 選んだ今日の気分。同じ日のうちは開き直しても残す */
export function loadTodayMoods(today: string): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(MOOD_KEY) ?? "null");
    return saved?.date === today && Array.isArray(saved.moods) ? saved.moods : [];
  } catch {
    return [];
  }
}

export function saveTodayMoods(today: string, moods: string[]) {
  try {
    localStorage.setItem(MOOD_KEY, JSON.stringify({ date: today, moods }));
  } catch {}
}
