import type { Grind, Recipe, TastingRecord } from "./types";

export const GRINDS: Grind[] = ["細挽き", "中細挽き", "中挽き", "粗挽き"];

export function emptyRecipe(): Recipe {
  return { dose: null, water: null, tempC: null, grind: null, time: "" };
}

export function hasRecipe(r: Recipe | undefined): r is Recipe {
  return !!r && (r.dose != null || r.water != null || r.tempC != null || r.grind != null || !!r.time.trim());
}

/** 「豆15g・お湯240ml（1:16）・92℃・中細挽き・2:30」 */
export function recipeText(r: Recipe) {
  return [
    r.dose != null && `豆${r.dose}g`,
    r.water != null && `お湯${r.water}ml${r.dose ? `（1:${Math.round(r.water / r.dose)}）` : ""}`,
    r.tempC != null && `${r.tempC}℃`,
    r.grind,
    r.time.trim(),
  ]
    .filter(Boolean)
    .join("・");
}

/** レシピ付きの記録のうち、いちばん評価が高いもの（同じなら新しいほう） */
export function bestRecipe(records: TastingRecord[]) {
  return records
    .filter((r) => hasRecipe(r.recipe))
    .sort((a, b) => b.overall - a.overall || b.createdAt - a.createdAt)[0];
}
