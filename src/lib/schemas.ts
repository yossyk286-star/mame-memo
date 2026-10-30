// AI に返させる答えの形。zod はサーバーでだけ使うので、画面側からは型だけを読む（import type）
import { z } from "zod";
import { AREAS } from "./beanSort";
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

const PICK_ROASTS = ["浅煎り", "中煎り", "深煎り"] as const;

/** 料理に合うコーヒー1つ分 */
export const FoodPickSchema = z.object({
  roast: z.enum(PICK_ROASTS).describe("焙煎度"),
  area: z.string().describe(`産地の地域。次から選ぶ：${AREAS.join("/")}。どこでもよければ空文字`),
  title: z.string().describe("おすすめを短く（例：深煎りをミルクで、浅煎りのエチオピア）。20字くらいまで"),
  reason: z.string().describe("なぜこの料理に合うか、初心者にもわかるように1〜2文で"),
  examples: z.string().describe("お店で探しやすい産地・豆・飲み方の例を2つくらい（例：エチオピア、カフェラテ）。思いつかなければ空文字"),
});

/** 料理・食べ物から選んだ、合うコーヒー */
export const FoodPairingSchema = z.object({
  found: z.boolean().describe("料理・食べ物・スイーツとして判断できれば true。食べ物でなければ false"),
  dish: z.string().describe("料理名（表記をととのえたもの）"),
  tip: z.string().describe("この料理にコーヒーを合わせるときのコツを1文で（例：濃い甘さには深煎り、果物の酸味には浅煎り）"),
  picks: z.array(FoodPickSchema).describe("合うコーヒーを合う順に3つ。焙煎度か飲み方が重ならないようにする"),
});

/** 料理のメニューや料理の写真から、載っている料理ごとにいちばん合うコーヒー */
export const FoodMenuSchema = z.object({
  dishes: z
    .array(
      z.object({
        dish: z.string().describe("料理名（メニューに書いてあるとおり、長ければ短くととのえる）"),
        pick: FoodPickSchema.describe("この料理にいちばん合うコーヒー"),
      }),
    )
    .describe("写っている料理。多くても12品。飲み物は含めない。料理が写っていなければ空配列"),
});

export type FoodMenu = z.infer<typeof FoodMenuSchema>;

export type FoodPick = z.infer<typeof FoodPickSchema>;
export type FoodPairing = Omit<z.infer<typeof FoodPairingSchema>, "found">;
