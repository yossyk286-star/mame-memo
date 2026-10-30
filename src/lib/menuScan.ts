export type { ScannedBean, BeanTaste, MenuScanResult, PairingResult, DishIdeas, TermLookup } from "./schemas";
import type { ScannedBean } from "./schemas";
import type { RecordDraft } from "./types";

/**
 * 農園・地域名。読み取りで farm が空のときは、豆の名前から国名を除いた部分を使う
 * （「ETHIOPIA イルガチェフェ」→「イルガチェフェ」）
 */
export function farmOf(b: Pick<ScannedBean, "name" | "origin" | "farm">) {
  if (b.farm) return b.farm;
  const rest = b.name
    .replace(b.origin, "")
    // 国名の英語表記（大文字だけの単語）も外す
    .replace(/\b[A-Z]{3,}\b/g, "")
    .trim();
  return rest && rest !== b.origin ? rest : "";
}

/** 読み取った豆を記録フォームの値に変換する */
export function beanToDraft(
  b: ScannedBean,
): Pick<RecordDraft, "origin" | "farm" | "roast" | "process" | "method" | "menuNote" | "sweets"> {
  return {
    origin: b.origin || b.name,
    farm: farmOf(b),
    roast: b.roast,
    process: b.process,
    method: b.recommendedMethod,
    menuNote: b.menuNote,
    sweets: b.sweets ?? "",
  };
}
