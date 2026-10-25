import type { Method, Process, Roast } from "./types";

export type GlossaryCategory = "精製" | "抽出" | "焙煎" | "フレーバー";

export interface Term {
  category: GlossaryCategory;
  term: string;
  reading?: string;
  description: string;
}

export const TERMS: Term[] = [
  { category: "精製", term: "Washed", reading: "ウォッシュト", description: "果肉を取り除き、水で洗ってから乾燥させる。クリアですっきりした酸味になりやすい。" },
  { category: "精製", term: "Natural", reading: "ナチュラル", description: "実をつけたまま乾燥させる。果実のような甘さと香りが強めに出る。" },
  { category: "精製", term: "Honey", reading: "ハニー", description: "果肉の一部を残したまま乾燥させる。Washed と Natural の中間の味わい。" },
  { category: "精製", term: "Anaerobic", reading: "アナエロビック", description: "酸素を断った密閉タンクで発酵させる。独特で華やかな香りが出る。Anaerobic Natural は発酵後に実のまま乾燥させたもの。" },
  { category: "抽出", term: "ドリップ", description: "紙フィルターにお湯を注いで落とす。クリアでスッキリ、豆の個性が素直に出る。" },
  { category: "抽出", term: "エアロプレス", description: "粉をお湯に浸し、空気圧で押し出す。濃いめだが軽くまろやかで、苦味が出にくい。" },
  { category: "抽出", term: "エスプレッソ", description: "高圧で一気に抽出する。少量でとても濃厚。ラテのベースにもなる。" },
  { category: "抽出", term: "サイフォン", description: "沸騰で押し上げたお湯と粉を混ぜて抽出する。高温で香りが華やか、すっきり軽め。" },
  { category: "抽出", term: "フレンチプレス", description: "粉をお湯に浸してから金属フィルターで押し下げる。コーヒーの油分まで出て、コクと口当たりが強い。" },
  { category: "焙煎", term: "浅煎り", description: "酸味とフルーティーな香りが出やすい。豆の産地の個性がわかりやすい。" },
  { category: "焙煎", term: "中煎り", description: "酸味と苦味のバランス型。甘さも感じやすい。" },
  { category: "焙煎", term: "深煎り", description: "苦味とコクが強く、チョコやナッツのような香り。ミルクと合わせやすい。" },
  { category: "フレーバー", term: "チェリー", description: "さくらんぼのような甘酸っぱさ。Natural の浅〜中煎りでよく使われる。" },
  { category: "フレーバー", term: "ベリー", description: "いちごやブルーベリーのような甘酸っぱい果実感。" },
  { category: "フレーバー", term: "柑橘", description: "レモンやオレンジのような明るい酸味。Washed の浅煎りでよく使われる。" },
  { category: "フレーバー", term: "黄桃", description: "桃やアプリコットのようなやわらかい甘さ。" },
  { category: "フレーバー", term: "フローラル", description: "ジャスミンなど花のような香り。浅煎りのエチオピアなどでよく使われる。" },
  { category: "フレーバー", term: "チョコレート", description: "カカオのようなほろ苦い甘さ。中〜深煎りでよく使われる。" },
  { category: "フレーバー", term: "ナッツ", description: "アーモンドやヘーゼルナッツのような香ばしさ。" },
  { category: "フレーバー", term: "キャラメル", description: "砂糖を焦がしたような甘い香ばしさ。" },
];

export const CHOOSING_TIPS = [
  "フルーティーな浅煎り → ドリップ／サイフォンで香りと酸味がわかりやすい",
  "深煎り・チョコ系の余韻 → エスプレッソ／ラテで甘さとコクが引き立つ",
  "深煎りをブラックで → エアロプレスだと苦味が尖りにくい",
  "深煎り × サイフォン → 苦味が強めに出やすく相性を選ぶ",
  "香りを楽しむならホット。アイスなら深煎りのアイスラテが味がぼやけにくい",
];

export const ROASTS: Roast[] = ["浅煎り", "中煎り", "深煎り", "不明"];
export const PROCESSES: Process[] = ["Washed", "Natural", "Honey", "Anaerobic", "その他", "不明"];
export const METHODS: Method[] = ["ドリップ", "エアロプレス", "エスプレッソ", "サイフォン", "フレンチプレス", "その他"];
export const FLAVORS = TERMS.filter((t) => t.category === "フレーバー").map((t) => t.term);

export function termsOf(category: GlossaryCategory) {
  return TERMS.filter((t) => t.category === category);
}
