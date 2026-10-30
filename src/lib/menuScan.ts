import { z } from "zod";
import type { RecordDraft } from "./types";
import { CATEGORIES, METHODS, PROCESSES, ROASTS } from "./glossary";

/** 味の強さ。1（弱い）〜5（強い） */
const TasteLevel = z.number().int().describe("1（弱い）〜5（強い）の整数");

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
  sweets: z.string().describe("この豆に合うスイーツを一言で（例：チーズケーキ。ベリーの酸味と合う）"),
  taste: z
    .object({
      acidity: TasteLevel.describe("酸味"),
      bitterness: TasteLevel.describe("苦味"),
      sweetness: TasteLevel.describe("甘さ"),
      body: TasteLevel.describe("コク（口当たりの重さ）"),
    })
    .describe("味の予想。メニューの説明・焙煎度・精製方法・産地から推定して必ず埋める"),
  methodNotes: z
    .array(
      z.object({
        // 表示するだけなので、自由な表記（ハンドドリップなど）でも読み取りを失敗させない
        method: z.string().describe("抽出方法（ドリップ、エアロプレス、エスプレッソなど）"),
        note: z.string().describe("その抽出方法で飲むとどんな味になるか、1文"),
      }),
    )
    .describe("メニューにある抽出方法ごと（書かれていなければドリップ・エアロプレス・エスプレッソ）の味の違い"),
});

export const MenuScanResultSchema = z.object({
  beans: z.array(ScannedBeanSchema).describe("写真に載っている豆。メニューでなければ空配列"),
});

/**
 * 読み取った豆。taste・methodNotes・sweets は後から増やした項目なので、
 * 以前に保存した読み取り結果や気になる豆には入っていないことがある
 */
export type ScannedBean = Omit<z.infer<typeof ScannedBeanSchema>, "taste" | "methodNotes" | "sweets"> &
  Partial<Pick<z.infer<typeof ScannedBeanSchema>, "taste" | "methodNotes" | "sweets">>;
export type BeanTaste = z.infer<typeof ScannedBeanSchema>["taste"];
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

/** 食べているスイーツとの相性。豆は送った順の番号で返す */
export const PairingResultSchema = z.object({
  ranks: z.array(
    z.object({
      index: z.number().int().describe("豆の番号（0から）"),
      score: z.number().int().describe("スイーツとの相性。1（合わない）〜5（とても合う）"),
      reason: z.string().describe("なぜ合う・合わないか、20〜40字くらいで"),
    }),
  ),
});

export type PairingResult = z.infer<typeof PairingResultSchema>;

/** 料理メニューをまだ読み取っていないとき、このコーヒーに合う料理を AI に挙げてもらう */
export const DishIdeasSchema = z.object({
  ideas: z.array(
    z.object({
      dish: z.string().describe("料理の名前。お店でよく見かける名前で"),
      score: z.number().int().describe("相性。3（合う）〜5（とても合う）"),
      reason: z.string().describe("なぜ合うか、20〜40字くらいで"),
    }),
  ),
});

export type DishIdeas = z.infer<typeof DishIdeasSchema>;

/** 辞典に足す用語を調べた結果 */
export const TermLookupSchema = z.object({
  found: z.boolean().describe("コーヒーに関係する言葉として説明できれば true。関係ない・わからなければ false"),
  term: z.string().describe("用語（表記をととのえたもの）"),
  reading: z.string().describe("読み（英語ならカタカナ、漢字ならひらがな）。不要なら空文字"),
  category: z.enum(CATEGORIES).describe("いちばん近い分類"),
  description: z.string().describe("初心者向けのやさしい説明。辞典のほかの用語と同じく2文くらい、50〜90字"),
});

export type TermLookup = z.infer<typeof TermLookupSchema>;
