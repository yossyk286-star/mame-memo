import type { TastingRecord } from "./types";
import { tr } from "./i18n";

type Country = { name: string; aliases: string[] };

/** スタンプ帳に並べるコーヒーの主な産地。aliases は産地欄に書かれがちな別名や英語 */
export const REGIONS: { region: string; countries: Country[] }[] = [
  {
    region: "アフリカ・中東",
    countries: [
      { name: "エチオピア", aliases: ["ethiopia", "イルガチェフェ", "シダモ", "グジ", "ゲイシャ村"] },
      { name: "ケニア", aliases: ["kenya"] },
      { name: "ルワンダ", aliases: ["rwanda"] },
      { name: "ブルンジ", aliases: ["burundi"] },
      { name: "タンザニア", aliases: ["tanzania", "キリマンジャロ"] },
      { name: "ウガンダ", aliases: ["uganda"] },
      { name: "コンゴ", aliases: ["congo"] },
      { name: "イエメン", aliases: ["yemen", "モカ"] },
    ],
  },
  {
    region: "中南米",
    countries: [
      { name: "ブラジル", aliases: ["brazil", "brasil"] },
      { name: "コロンビア", aliases: ["colombia"] },
      { name: "ペルー", aliases: ["peru"] },
      { name: "ボリビア", aliases: ["bolivia"] },
      { name: "エクアドル", aliases: ["ecuador"] },
      { name: "グアテマラ", aliases: ["guatemala"] },
      { name: "ホンジュラス", aliases: ["honduras"] },
      { name: "エルサルバドル", aliases: ["el salvador", "salvador"] },
      { name: "ニカラグア", aliases: ["nicaragua"] },
      { name: "コスタリカ", aliases: ["costa rica"] },
      { name: "パナマ", aliases: ["panama"] },
      { name: "メキシコ", aliases: ["mexico"] },
      { name: "ジャマイカ", aliases: ["jamaica", "ブルーマウンテン"] },
    ],
  },
  {
    region: "アジア・太平洋",
    countries: [
      { name: "インドネシア", aliases: ["indonesia", "スマトラ", "マンデリン", "ジャワ", "スラウェシ", "トラジャ"] },
      { name: "ベトナム", aliases: ["vietnam"] },
      { name: "インド", aliases: ["india"] },
      { name: "中国", aliases: ["china", "雲南"] },
      { name: "タイ", aliases: ["thailand"] },
      { name: "ミャンマー", aliases: ["myanmar"] },
      { name: "東ティモール", aliases: ["timor"] },
      { name: "パプアニューギニア", aliases: ["papua", "png"] },
      { name: "ハワイ", aliases: ["hawaii", "コナ", "kona"] },
    ],
  },
];

const ALL = REGIONS.flatMap((r) => r.countries);

/** 産地欄（と農園・品種名）から国を探す。見つからなければ null */
export function countryOf(r: Pick<TastingRecord, "origin" | "farm">): string | null {
  const text = `${r.origin} ${r.farm}`.toLowerCase();
  // 「インドネシア」が「インド」に当たらないよう、長い名前から先に調べる
  const sorted = [...ALL].sort((a, b) => b.name.length - a.name.length);
  for (const c of sorted) {
    if ([c.name, ...c.aliases].some((w) => text.includes(w.toLowerCase()))) return c.name;
  }
  return null;
}

export type Stamp = { count: number; best: number; records: TastingRecord[] };

/** 国ごとの杯数・最高評価・その国の記録。リストにない産地は others に産地欄のまま入れる */
export function collectStamps(records: TastingRecord[]) {
  const stamps = new Map<string, Stamp>();
  const others = new Map<string, Stamp>();
  for (const r of records) {
    const country = countryOf(r);
    const key = country ?? r.origin.trim();
    if (!key) continue;
    const map = country ? stamps : others;
    const s = map.get(key) ?? { count: 0, best: 0, records: [] };
    map.set(key, { count: s.count + 1, best: Math.max(s.best, r.overall), records: [...s.records, r] });
  }
  return { stamps, others, total: ALL.length };
}

export type DiaryEntry = {
  place: string;
  /** 国の地域（アフリカ・中東など）。リスト外の産地は null */
  region: string | null;
  /** その国で初めて飲んだ記録 */
  first: TastingRecord;
  count: number;
};

const REGION_OF = new Map(REGIONS.flatMap((r) => r.countries.map((c) => [c.name, r.region] as const)));

/** 国を初めて飲んだ日の順に並べる。コーヒーで世界一周する旅の記録のように読める */
export function travelDiary(stamps: Map<string, Stamp>, others: Map<string, Stamp>): DiaryEntry[] {
  const earliest = (rs: TastingRecord[]) =>
    rs.reduce((a, b) => (b.date < a.date || (b.date === a.date && b.createdAt < a.createdAt) ? b : a));
  return [...stamps, ...others]
    .map(([place, s]) => ({ place, region: REGION_OF.get(place) ?? null, first: earliest(s.records), count: s.count }))
    .sort((a, b) => a.first.date.localeCompare(b.first.date) || a.first.createdAt - b.first.createdAt);
}

/** 旅日記に添えるひとこと。メモの1行目、なければ感じた味や合うスイーツ */
export function diaryNote(r: TastingRecord): { text: string; quote: boolean } | null {
  const line = r.memo.split("\n").map((s) => s.trim()).find(Boolean);
  if (line) return { text: line.length > 40 ? `${line.slice(0, 40)}…` : line, quote: true };
  if (r.flavors.length > 0) return { text: r.flavors.slice(0, 3).join("・"), quote: false };
  if (r.sweets?.trim()) return { text: tr("{0}と一緒に", r.sweets.trim()), quote: false };
  return null;
}
