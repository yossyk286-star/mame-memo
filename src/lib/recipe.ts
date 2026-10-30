import type { Grind, Recipe, TastingRecord } from "./types";
import { tr } from "./i18n";

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
    r.dose != null && tr("豆{0}g", r.dose),
    r.water != null && tr("お湯{0}ml{1}", r.water, r.dose ? tr("（1:{0}）", Math.round(r.water / r.dose)) : ""),
    r.tempC != null && `${r.tempC}℃`,
    r.grind && tr(r.grind),
    r.time.trim(),
  ]
    .filter(Boolean)
    .join(tr("・"));
}

/** レシピ付きの記録のうち、いちばん評価が高いもの（同じなら新しいほう） */
export function bestRecipe(records: TastingRecord[]) {
  return records
    .filter((r) => hasRecipe(r.recipe))
    .sort((a, b) => b.overall - a.overall || b.createdAt - a.createdAt)[0];
}
