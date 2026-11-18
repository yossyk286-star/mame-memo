/** いまが旬の豆（月ごと）。調べる画面の上のカードに使う（7）。文言は tr() で訳せるよう日本語のまま持つ */
export type Season = { title: string; body: string; queries: [string, string] };

const SEASONS: Record<number, Season> = {
  1: { title: "新年のはじめの一杯", body: "中米やコロンビアの新豆（ニュークロップ）が出まわり始める頃です。", queries: ["コロンビア", "グアテマラ"] },
  2: { title: "チョコに合う一杯", body: "バレンタインには、甘みとコクのある深煎りを。", queries: ["マンデリン", "ブラジル"] },
  3: { title: "春の華やかな浅煎り", body: "花のような香りの浅煎りが気になる季節です。", queries: ["エチオピア", "ケニア"] },
  4: { title: "お花見に水筒で", body: "冷めても飲みやすい、軽やかな中煎りを外へ。", queries: ["ルワンダ", "コスタリカ"] },
  5: { title: "新緑のすっきり", body: "酸味がさわやかで、後味の軽い豆がおいしい頃です。", queries: ["コスタリカ", "エチオピア"] },
  6: { title: "アイスコーヒーのはじまり", body: "水出しや氷で締めるアイスに向く、深めの豆を。", queries: ["ブラジル", "マンデリン"] },
  7: { title: "夏の水出しコーヒー", body: "ひと晩かけて作る水出しは、まろやかで飲みやすい味です。", queries: ["水出しコーヒー", "コロンビア"] },
  8: { title: "暑い日のアイスラテ", body: "コクのある深煎りは、ミルクに負けずアイスラテ向きです。", queries: ["ブラジル", "インド"] },
  9: { title: "秋のはじまり", body: "少し深めの中煎りが恋しくなってきます。", queries: ["グアテマラ", "ブラジル"] },
  10: { title: "深まる秋の一杯", body: "10月1日はコーヒーの日。ゆっくり味わえる豆を。", queries: ["マンデリン", "ホンジュラス"] },
  11: { title: "あたたかい深煎り", body: "寒くなる頃は、コクと甘みのあるあたたかい一杯を。", queries: ["マンデリン", "ブラジル"] },
  12: { title: "一年のごほうび", body: "年末は、少し特別なスペシャルティで一年のしめくくりを。", queries: ["パナマ ゲイシャ", "ケニア"] },
};

export function seasonNow(now = new Date()): { month: number; season: Season; args: number[] } {
  const month = now.getMonth() + 1;
  return { month, season: SEASONS[month], args: [] };
}
