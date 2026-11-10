import type { Method, Process, Roast } from "./types";

export const CATEGORIES = ["精製", "抽出", "焙煎", "フレーバー", "豆・産地", "味わい"] as const;
export type GlossaryCategory = (typeof CATEGORIES)[number];

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
  { category: "精製", term: "Pulped Natural", reading: "パルプドナチュラル", description: "果皮と果肉を取り除き、ぬめり（ミューシレージ）を残したまま乾燥させる。ブラジルに多く、Honey とよく似た甘くまろやかな味。" },
  { category: "精製", term: "Wet Hulled", reading: "ウェットハル", description: "スマトラ式とも。生乾きのうちに殻（パーチメント）を外して乾燥させる。インドネシアに多く、どっしりしたコクと土やハーブのような香り。" },
  { category: "精製", term: "Carbonic Maceration", reading: "カーボニックマセレーション", description: "炭酸ガスを満たしたタンクで実ごと発酵させる、ワイン造りから来た方法。ワインやシナモンのような強い香りが出やすい。" },
  { category: "抽出", term: "ドリップ", description: "紙フィルターにお湯を注いで落とす。クリアでスッキリ、豆の個性が素直に出る。" },
  { category: "抽出", term: "エアロプレス", description: "粉をお湯に浸し、空気圧で押し出す。濃いめだが軽くまろやかで、苦味が出にくい。" },
  { category: "抽出", term: "エスプレッソ", description: "高圧で一気に抽出する。少量でとても濃厚。ラテのベースにもなる。" },
  { category: "抽出", term: "サイフォン", description: "沸騰で押し上げたお湯と粉を混ぜて抽出する。高温で香りが華やか、すっきり軽め。" },
  { category: "抽出", term: "フレンチプレス", description: "粉をお湯に浸してから金属フィルターで押し下げる。コーヒーの油分まで出て、コクと口当たりが強い。" },
  { category: "抽出", term: "ネルドリップ", description: "布（ネル）のフィルターで落とす。油分がほどよく通り、まろやかでとろりとした口当たり。深煎りと好相性。" },
  { category: "抽出", term: "マキネッタ", description: "直火にかけ、蒸気の圧で抽出するイタリアの器具。モカポットとも。エスプレッソに近い濃いコーヒーが家で作れる。" },
  { category: "抽出", term: "蒸らし", reading: "むらし", description: "ドリップで最初に少しだけお湯を注ぎ、20〜30秒ほど待つこと。粉からガスが抜けてお湯がなじみ、味がしっかり出る。" },
  { category: "抽出", term: "挽き目", reading: "ひきめ", description: "豆を挽く粗さ。細かいほど濃く苦く、粗いほど軽くすっきり。エスプレッソは極細挽き、ドリップは中細挽き、フレンチプレスは粗挽きが目安。" },
  { category: "抽出", term: "湯温", reading: "ゆおん", description: "抽出するお湯の温度。高い（90〜96℃）と苦味とコクが、低い（80〜85℃）と酸味と甘さが出やすい。浅煎りは高め、深煎りは低めが目安。" },
  { category: "抽出", term: "抽出比率", reading: "ちゅうしゅつひりつ", description: "粉とお湯の量の割合。ドリップは粉1：お湯15〜16くらい（粉15gにお湯240gなど）が目安。粉が多いほど濃くなる。" },
  { category: "焙煎", term: "浅煎り", description: "酸味とフルーティーな香りが出やすい。豆の産地の個性がわかりやすい。" },
  { category: "焙煎", term: "中煎り", description: "酸味と苦味のバランス型。甘さも感じやすい。" },
  { category: "焙煎", term: "深煎り", description: "苦味とコクが強く、チョコやナッツのような香り。ミルクと合わせやすい。" },
  { category: "焙煎", term: "ライトロースト", description: "8段階でいちばん浅い焙煎。黄色っぽく、穀物のような香り。飲むためにはあまり使われない。" },
  { category: "焙煎", term: "シナモンロースト", description: "シナモンのような色の浅煎り。酸味が強く、香ばしさは控えめ。" },
  { category: "焙煎", term: "ミディアムロースト", description: "浅煎りのなかでは少し深め。酸味が主役で、軽やかな味わい。アメリカンコーヒー向き。" },
  { category: "焙煎", term: "ハイロースト", description: "中煎り。酸味と苦味がほどよく、甘さも出てくる。日本の喫茶店でおなじみの焙煎度。" },
  { category: "焙煎", term: "シティロースト", description: "中深煎り。苦味が前に出て酸味は控えめ。コクとのバランスがよい。" },
  { category: "焙煎", term: "フルシティロースト", description: "深煎り。苦味とコクがしっかりして、チョコのような香り。アイスコーヒーやエスプレッソに。" },
  { category: "焙煎", term: "フレンチロースト", description: "かなり深い深煎り。黒に近い色で、強い苦味とスモーキーな香り。カフェオレ向き。" },
  { category: "焙煎", term: "イタリアンロースト", description: "8段階でいちばん深い焙煎。表面に油が浮き、苦味がもっとも強い。エスプレッソ向き。" },
  { category: "焙煎", term: "ハゼ", description: "焙煎中に豆がはじける音。1ハゼ（パチパチ）が終わるころが浅〜中煎り、2ハゼ（ピチピチ）が始まるころが中深煎りの目安。" },
  { category: "フレーバー", term: "チェリー", description: "さくらんぼのような甘酸っぱさ。Natural の浅〜中煎りでよく使われる。" },
  { category: "フレーバー", term: "ベリー", description: "いちごやブルーベリーのような甘酸っぱい果実感。" },
  { category: "フレーバー", term: "柑橘", description: "レモンやオレンジのような明るい酸味。Washed の浅煎りでよく使われる。" },
  { category: "フレーバー", term: "黄桃", description: "桃やアプリコットのようなやわらかい甘さ。" },
  { category: "フレーバー", term: "フローラル", description: "ジャスミンなど花のような香り。浅煎りのエチオピアなどでよく使われる。" },
  { category: "フレーバー", term: "チョコレート", description: "カカオのようなほろ苦い甘さ。中〜深煎りでよく使われる。" },
  { category: "フレーバー", term: "ナッツ", description: "アーモンドやヘーゼルナッツのような香ばしさ。" },
  { category: "フレーバー", term: "キャラメル", description: "砂糖を焦がしたような甘い香ばしさ。" },
  { category: "フレーバー", term: "紅茶", description: "紅茶のような上品な渋みと香り。浅煎りのケニアやゲイシャでよく使われる。" },
  { category: "フレーバー", term: "スパイス", description: "シナモンやクローブのような刺激のある香り。インドネシアや深めの焙煎でよく使われる。" },
  { category: "豆・産地", term: "アラビカ", description: "世界のコーヒーの6割ほどを占める種。標高の高い場所で育ち、香りと酸味が豊か。スペシャルティコーヒーはほぼこれ。" },
  { category: "豆・産地", term: "ロブスタ", description: "カネフォラ種の代表。暑さや病気に強く、苦味が強くて香ばしい。カフェインはアラビカの約2倍。インスタントやブレンドに。" },
  { category: "豆・産地", term: "ティピカ", description: "アラビカの原種に近い、古くからの品種。すっきり上品な味で、ブルーマウンテンやハワイ・コナもこの系統。" },
  { category: "豆・産地", term: "ブルボン", description: "アラビカの代表的な品種。インド洋のブルボン島（今のレユニオン島）で育てられたのが名前の由来。甘さとコクのバランスがよい。" },
  { category: "豆・産地", term: "ゲイシャ", description: "エチオピア生まれで、パナマで有名になった品種。ジャスミンのような花の香りと紅茶のような上品さで、高値で取引される。" },
  { category: "豆・産地", term: "スペシャルティコーヒー", description: "産地や農園までたどれる、品質の高いコーヒー。100点満点の評価で80点以上が目安。" },
  { category: "豆・産地", term: "シングルオリジン", description: "ひとつの国・地域・農園だけの豆。産地の個性がそのまま味わえる。" },
  { category: "豆・産地", term: "ブレンド", description: "いくつかの産地の豆を混ぜたもの。味のバランスを整えたり、いつも同じ味にしたりできる。" },
  { category: "豆・産地", term: "標高", reading: "ひょうこう", description: "豆が育った高さ。高いほど昼と夜の寒暖差でゆっくり育ち、酸味がはっきりして香りが豊かになりやすい。" },
  { category: "豆・産地", term: "コーヒーベルト", description: "赤道をはさんだ北緯25度から南緯25度くらいの、コーヒーが育つ地域。" },
  { category: "豆・産地", term: "生豆", reading: "なままめ", description: "焙煎する前の緑色の豆。「せいまめ」とも読む。そのままでは香りがなく、焼いて初めてコーヒーの香りが出る。" },
  { category: "味わい", term: "酸味", reading: "さんみ", description: "コーヒーの明るさ。よい酸味は果物のように爽やか。浅煎りほど強く、深煎りほど弱くなる。" },
  { category: "味わい", term: "ボディ", description: "口の中で感じる重さやとろみ。フレンチプレスや深煎りで強く、ペーパードリップや浅煎りで軽くなる。" },
  { category: "味わい", term: "アフターテイスト", description: "飲み込んだあとに残る香りと味。長く心地よいほど、よいコーヒーとされる。" },
  { category: "味わい", term: "クリーンカップ", description: "雑味や欠点のない、澄んだ味わい。スペシャルティコーヒーの評価で大事な項目。" },
  { category: "味わい", term: "バランス", description: "酸味・苦味・甘さ・コクのどれかが飛び出さず、まとまっていること。" },
  { category: "味わい", term: "カッピング", description: "粉に直接お湯を注ぎ、スプーンですすって味を比べる方法。豆の評価や仕入れのときに使う。" },
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
/** 記録画面で選べる味の言葉（辞典に言葉を足しても増えないよう固定） */
export const FLAVORS = ["チェリー", "ベリー", "柑橘", "黄桃", "フローラル", "チョコレート", "ナッツ", "キャラメル"];

export function termsOf(category: GlossaryCategory) {
  return TERMS.filter((t) => t.category === category);
}
