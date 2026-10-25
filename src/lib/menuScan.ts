import { z } from "zod";
import type { RecordDraft } from "./types";
import { METHODS, PROCESSES, ROASTS } from "./glossary";

/** メニュー写真から読み取った豆1つ分 */
export const ScannedBeanSchema = z.object({
  name: z.string().describe("メニューに書かれている豆の名前（例：ケニア ニエリ）"),
  origin: z.string().describe("産地の国名。わからなければ空文字"),
  farm: z
    .string()
    .describe(
      "国名の下などに書かれた地域・農園・ステーション・品種名（例：カリンドゥンドゥ、イルガチェフェ グティティ、パチャママ）。メニューに書かれていれば必ず入れる。なければ空文字",
    ),
  roast: z.enum(ROASTS).nullable().describe("焙煎度。書かれていなければ null"),
  process: z.enum(PROCESSES).nullable().describe("精製方法。書かれていなければ null"),
  menuNote: z.string().describe("メニューに書かれているフレーバーの説明をそのまま。なければ空文字"),
  explanation: z.string().describe("この豆がどんな味か、初心者向けに2〜3文で"),
  recommendedMethod: z.enum(METHODS).nullable().describe("いちばんおすすめの抽出方法"),
  recommendation: z.string().describe("おすすめの抽出方法と飲み方（ホット/アイス、ブラック/ミルク）を理由つきで1〜2文"),
});

export const MenuScanResultSchema = z.object({
  beans: z.array(ScannedBeanSchema).describe("写真に載っている豆。メニューでなければ空配列"),
});

export type ScannedBean = z.infer<typeof ScannedBeanSchema>;
export type MenuScanResult = z.infer<typeof MenuScanResultSchema>;

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
): Pick<RecordDraft, "origin" | "farm" | "roast" | "process" | "method" | "menuNote"> {
  return {
    origin: b.origin || b.name,
    farm: farmOf(b),
    roast: b.roast,
    process: b.process,
    method: b.recommendedMethod,
    menuNote: b.menuNote,
  };
}
