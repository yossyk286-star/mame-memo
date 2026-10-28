import { REGIONS, countryOf } from "./countries";
import { ROASTS } from "./glossary";
import type { Roast, TastingRecord } from "./types";

/** 絞り込みで使う焙煎度（不明は除く） */
export const ROAST_FILTERS: Roast[] = ROASTS.filter((r) => r !== "不明");

/** 絞り込みで使う産地の地域。スタンプ帳と同じ分け方 */
export const AREAS = REGIONS.map((r) => r.region);

/** 産地欄（と農園・品種名）から地域を出す。わからなければ null */
export function areaOf(b: Pick<TastingRecord, "origin" | "farm">): string | null {
  const c = countryOf(b);
  return c ? (REGIONS.find((r) => r.countries.some((x) => x.name === c))?.region ?? null) : null;
}

/** 並び替え。味は 1（弱い）〜5（強い） */
export type SortKey = "default" | "acid" | "bitter" | "sweet" | "body" | "light" | "dark" | "rating";
export const SORT_LABELS: Record<SortKey, string> = {
  default: "",
  acid: "酸味が強い順",
  bitter: "苦味が強い順",
  sweet: "甘い順",
  body: "コクがある順",
  light: "浅煎りから",
  dark: "深煎りから",
  rating: "評価が高い順",
};

type Sortable = {
  acidity: number | null;
  bitterness: number | null;
  sweetness: number | null;
  body: number | null;
  roast: Roast | null;
  rating?: number | null;
};

const ROAST_LEVEL: Record<Roast, number | null> = { 浅煎り: 1, 中煎り: 2, 深煎り: 3, 不明: null };

/** 並び替えた新しい配列を返す。値がないものは後ろ（元の順のまま） */
export function sortBy<T>(items: T[], key: SortKey, get: (t: T) => Sortable): T[] {
  if (key === "default") return items;
  const value = (t: T): number | null => {
    const s = get(t);
    const level = s.roast ? ROAST_LEVEL[s.roast] : null;
    switch (key) {
      case "acid":
        return s.acidity;
      case "bitter":
        return s.bitterness;
      case "sweet":
        return s.sweetness;
      case "body":
        return s.body;
      case "light":
        return level == null ? null : -level;
      case "dark":
        return level;
      case "rating":
        return s.rating ?? null;
    }
  };
  return items
    .map((t, i) => ({ t, i, v: value(t) }))
    .sort((a, b) => (a.v == null ? 1 : 0) - (b.v == null ? 1 : 0) || (b.v ?? 0) - (a.v ?? 0) || a.i - b.i)
    .map((x) => x.t);
}
