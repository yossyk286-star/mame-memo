import type { ScannedBean } from "./menuScan";
import { nameKey } from "./savedLookups";
import type { Method, Process, Roast } from "./types";
import { tr } from "./i18n";

/**
 * よく見かける産地・銘柄と、カフェのよくあるドリンク。
 * 名前で調べたときは AI を呼ばずにここから出す。味は一般的な傾向（豆やお店で変わる）
 */
type KnownBean = {
  name: string;
  aliases: string[];
  origin: string;
  roast?: Roast;
  process?: Process;
  explanation: string;
  method: Method;
  recommendation: string;
  sweets: string;
  /** 酸味・苦味・甘さ・コク（1〜5） */
  taste: [number, number, number, number];
};

const BEANS: KnownBean[] = [
  { name: "エチオピア イルガチェフェ", aliases: ["イルガチェフェ", "yirgacheffe", "イルガ"], origin: "エチオピア", process: "Washed", explanation: "ジャスミンのような花の香りとレモンのような酸味。紅茶のように軽くすっきり。", method: "ドリップ", recommendation: "浅〜中煎りをドリップで、ホットのブラックがおすすめ。香りがいちばんわかりやすい。", sweets: "レモンケーキ", taste: [4, 2, 3, 2] },
  { name: "エチオピア", aliases: ["ethiopia", "エチオピアナチュラル", "シダモ", "グジ"], origin: "エチオピア", explanation: "コーヒー発祥の地。ベリーのような甘い果実感や花の香りが出やすい。", method: "ドリップ", recommendation: "ドリップのホットで、冷めていくときの香りの変化も楽しめる。", sweets: "ベリーのタルト", taste: [4, 2, 4, 2] },
  { name: "ケニア", aliases: ["kenya", "ニエリ", "キリニャガ"], origin: "ケニア", process: "Washed", explanation: "カシスやグレープフルーツのような、明るくはっきりした酸味。しっかりした飲みごたえもある。", method: "ドリップ", recommendation: "ドリップでホット。酸味が苦手ならアイスにすると飲みやすい。", sweets: "チーズケーキ", taste: [5, 2, 3, 3] },
  { name: "タンザニア キリマンジャロ", aliases: ["キリマンジャロ", "キリマン", "タンザニア", "kilimanjaro"], origin: "タンザニア", process: "Washed", explanation: "さわやかな酸味と香り。すっきりした後味。", method: "ドリップ", recommendation: "中煎りをドリップで。酸味とコクのバランスが出る。", sweets: "フルーツタルト", taste: [4, 2, 3, 2] },
  { name: "ブラジル", aliases: ["brazil", "サントス", "ブラジルサントス"], origin: "ブラジル", process: "Natural", explanation: "ナッツやチョコのような香ばしさ。酸味が少なく、苦味と甘さのバランスがよい。", method: "ドリップ", recommendation: "中〜深煎りでミルクにも合う。ブレンドやエスプレッソのベースにもよく使われる。", sweets: "チョコレートケーキ", taste: [2, 3, 3, 3] },
  { name: "コロンビア", aliases: ["colombia", "スプレモ", "コロンビアスプレモ"], origin: "コロンビア", process: "Washed", explanation: "キャラメルのような甘さと、ほどよい酸味。くせが少なく飲みやすい。", method: "ドリップ", recommendation: "中煎りをドリップで。毎日飲みやすいバランス型。", sweets: "バウムクーヘン", taste: [3, 3, 4, 3] },
  { name: "グアテマラ", aliases: ["guatemala", "アンティグア"], origin: "グアテマラ", process: "Washed", explanation: "チョコレートのような甘さと、ほどよいコク。香ばしさもある。", method: "ドリップ", recommendation: "中〜深煎りでホット。ミルクを入れてもおいしい。", sweets: "ガトーショコラ", taste: [3, 3, 3, 4] },
  { name: "コスタリカ", aliases: ["costa rica"], origin: "コスタリカ", process: "Honey", explanation: "はちみつのような甘さと、クリーンな後味。Honey 精製の豆が多い。", method: "ドリップ", recommendation: "浅〜中煎りをドリップで。甘さがわかりやすい。", sweets: "カステラ", taste: [3, 2, 4, 3] },
  { name: "エルサルバドル", aliases: ["el salvador"], origin: "エルサルバドル", explanation: "やさしい甘さとまろやかさ。酸味はおだやか。", method: "ドリップ", recommendation: "中煎りをドリップで。初めての人にも飲みやすい。", sweets: "マドレーヌ", taste: [3, 2, 4, 3] },
  { name: "ホンジュラス", aliases: ["honduras"], origin: "ホンジュラス", explanation: "フルーティーさとチョコのような甘さ。バランスがよい。", method: "ドリップ", recommendation: "中煎りでホット。", sweets: "ブラウニー", taste: [3, 2, 3, 3] },
  { name: "ペルー", aliases: ["peru"], origin: "ペルー", explanation: "マイルドでやさしい味。くせが少ない。", method: "ドリップ", recommendation: "中煎りでホット。ミルクにも合う。", sweets: "クッキー", taste: [2, 2, 3, 3] },
  { name: "ルワンダ", aliases: ["rwanda"], origin: "ルワンダ", process: "Washed", explanation: "紅茶や赤い果実のような明るい酸味と甘さ。", method: "ドリップ", recommendation: "浅〜中煎りのドリップで。", sweets: "いちごのショートケーキ", taste: [4, 2, 3, 2] },
  { name: "インドネシア マンデリン", aliases: ["マンデリン", "mandheling", "スマトラ", "インドネシア"], origin: "インドネシア", roast: "深煎り", process: "その他", explanation: "どっしりした苦味とコク。ハーブや土のような独特の香り。酸味はほとんどない。", method: "フレンチプレス", recommendation: "深煎りをフレンチプレスで。ミルクやアイスコーヒーにもよく合う。", sweets: "羊羹", taste: [1, 4, 3, 5] },
  { name: "ジャマイカ ブルーマウンテン", aliases: ["ブルーマウンテン", "ブルマン", "blue mountain"], origin: "ジャマイカ", process: "Washed", explanation: "酸味・苦味・甘さのバランスがよく、上品でなめらか。高級な豆として有名。", method: "ドリップ", recommendation: "中煎りをドリップで、ブラックで。", sweets: "上生菓子", taste: [3, 2, 3, 3] },
  { name: "パナマ ゲイシャ", aliases: ["ゲイシャ", "geisha", "gesha", "パナマ"], origin: "パナマ", roast: "浅煎り", explanation: "ジャスミンや紅茶のような華やかな香り。軽やかで甘い。高価な品種。", method: "ドリップ", recommendation: "浅煎りをドリップで。香りを楽しむためブラックで。", sweets: "フルーツ", taste: [4, 1, 4, 2] },
  { name: "イエメン モカ", aliases: ["モカ", "モカマタリ", "mocha", "イエメン"], origin: "イエメン", process: "Natural", explanation: "ワインやチョコのような複雑な香り。果実のような甘さ。", method: "ドリップ", recommendation: "中煎りをドリップで。", sweets: "チョコレート", taste: [3, 2, 4, 3] },
  { name: "ハワイ コナ", aliases: ["コナ", "kona", "ハワイ"], origin: "アメリカ", explanation: "やさしい酸味と甘い香り。すっきり軽め。", method: "ドリップ", recommendation: "中煎りをドリップで。", sweets: "パンケーキ", taste: [3, 2, 3, 2] },
  { name: "ベトナム", aliases: ["vietnam", "ロブスタ"], origin: "ベトナム", roast: "深煎り", explanation: "ロブスタ種が多く、強い苦味とコク。カフェインも多め。", method: "その他", recommendation: "練乳を入れるベトナムコーヒーがおすすめ。", sweets: "バインミーなど甘くない軽食", taste: [1, 5, 2, 5] },
  { name: "メキシコ", aliases: ["mexico"], origin: "メキシコ", explanation: "やわらかい酸味と軽い口当たり。", method: "ドリップ", recommendation: "中煎りでホット。", sweets: "チュロス", taste: [3, 2, 3, 2] },
];

/** カフェのよくあるドリンク（辞典に出す） */
export const DRINKS: { name: string; recipe: string; description: string }[] = [
  { name: "エスプレッソ", recipe: "エスプレッソ（約30ml）", description: "高圧で抽出した濃いコーヒー。少量で香りとコクが強い。ほかのドリンクのベース。" },
  { name: "アメリカーノ", recipe: "エスプレッソ＋お湯", description: "エスプレッソをお湯で割ったもの。ドリップより軽く、香ばしい。" },
  { name: "カフェラテ", recipe: "エスプレッソ＋スチームミルク（多め）", description: "ミルクが多く、まろやかで飲みやすい。泡は薄め。" },
  { name: "カプチーノ", recipe: "エスプレッソ＋スチームミルク＋ミルクの泡（同じくらい）", description: "泡がたっぷりで、ラテよりコーヒーの味が濃い。" },
  { name: "フラットホワイト", recipe: "エスプレッソ（多め）＋薄く泡立てたミルク", description: "ラテより量が少なく、コーヒーの味がしっかり。なめらかな口当たり。" },
  { name: "コルタード", recipe: "エスプレッソ＋同じくらいのミルク", description: "小さいカップで、コーヒーとミルクが半々。" },
  { name: "マキアート", recipe: "エスプレッソ＋ミルクの泡を少し", description: "エスプレッソにミルクの泡をのせたもの。ほぼエスプレッソの濃さ。" },
  { name: "カフェモカ", recipe: "エスプレッソ＋チョコレートソース＋スチームミルク", description: "チョコの甘さが入ったラテ。デザートのような味。" },
  { name: "カフェオレ", recipe: "ドリップコーヒー＋温めた牛乳（1:1）", description: "ドリップで作るミルクコーヒー。ラテよりあっさり。" },
  { name: "コールドブリュー", recipe: "水でゆっくり（8〜24時間）抽出", description: "水出しコーヒー。苦味と酸味がおだやかで、すっきり甘い。" },
  { name: "エスプレッソトニック", recipe: "トニックウォーター＋エスプレッソ", description: "炭酸のほろ苦さと柑橘の香り。夏向きのさっぱりした1杯。" },
  { name: "アフォガート", recipe: "バニラアイス＋エスプレッソ", description: "アイスに熱いエスプレッソをかけたデザート。" },
  { name: "デカフェ", recipe: "カフェインを抜いた豆", description: "カフェインをほとんど抜いたコーヒー。夜や妊娠中でも飲みやすい。" },
];

function toBean(b: KnownBean): ScannedBean {
  const [acidity, bitterness, sweetness, body] = b.taste;
  return {
    name: b.name,
    origin: b.origin,
    farm: "",
    roast: b.roast ?? null,
    process: b.process ?? null,
    menuNote: "",
    explanation: tr("{0}（一般的な傾向です。お店の説明があればそちらを優先してください）", b.explanation),
    recommendedMethod: b.method,
    recommendation: b.recommendation,
    sweets: b.sweets,
    taste: { acidity, bitterness, sweetness, body },
    methodNotes: [],
  };
}

const BY_KEY = new Map<string, KnownBean>();
for (const b of BEANS) for (const n of [b.name, ...b.aliases]) BY_KEY.set(nameKey(n), b);

/** 名前（呼び方の違いも含む）が一致する産地・銘柄があれば返す */
export function findKnownBean(query: string) {
  const b = BY_KEY.get(nameKey(query));
  return b ? toBean(b) : null;
}

/** AI にメニューを読ませるときの参考 */
export const BEAN_REFERENCE = BEANS.map(
  (b) => `- ${b.name}：${b.explanation}（酸味${b.taste[0]}・苦味${b.taste[1]}・甘さ${b.taste[2]}・コク${b.taste[3]}）`,
).join("\n");
