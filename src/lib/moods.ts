import type { ScannedBean } from "./menuScan";

/** 1〜5 にそろえる。味の予想がない豆はまん中の 3 とみなす */
const lv = (n: number | undefined) =>
  n == null ? 3 : Math.min(5, Math.max(1, Math.round(n)));

const roastOf = (b: ScannedBean) =>
  b.roast === "深煎り" ? 1 : b.roast === "浅煎り" ? -1 : 0;
const text = (b: ScannedBean) =>
  [b.name, b.origin, b.process, b.explanation, b.menuNote].join(" ");

export type Mood = {
  label: string;
  /** 文字で入れたときに、この気分とみなす言葉 */
  words: RegExp;
  score: (b: ScannedBean) => number;
};

/** 今日の気分。味の予想・焙煎度・説明から、その気分に合う順に並べる */
export const MOODS: Mood[] = [
  {
    label: "すっきり",
    words: /すっきり|スッキリ|爽|さわやか|クリーン/,
    score: ({ taste: t }) =>
      lv(t?.acidity) - 0.7 * lv(t?.bitterness) - 0.3 * lv(t?.body),
  },
  {
    label: "甘め",
    words: /甘/,
    score: ({ taste: t }) =>
      lv(t?.sweetness) + 0.2 * lv(t?.body) - 0.2 * lv(t?.acidity),
  },
  {
    label: "しっかり苦め",
    words: /苦|ビター/,
    score: ({ taste: t }) => lv(t?.bitterness) + 0.6 * lv(t?.body),
  },
  {
    label: "ミルクに合う",
    words: /ミルク|ラテ|牛乳|カフェオレ/,
    // ミルクに負けないコクと苦味があり、酸味が強すぎないもの
    score: (b) =>
      lv(b.taste?.body) +
      0.7 * lv(b.taste?.bitterness) -
      0.5 * lv(b.taste?.acidity) +
      roastOf(b),
  },
  {
    label: "フルーティー",
    words: /フルーツ|フルーティ|果実|果物|ベリー|柑橘|ジューシー/,
    score: (b) =>
      lv(b.taste?.acidity) +
      0.5 * lv(b.taste?.sweetness) -
      0.5 * lv(b.taste?.bitterness) -
      roastOf(b),
  },
  {
    label: "華やかな香り",
    words: /香|華やか|はなやか|フローラル|花|紅茶/,
    score: (b) =>
      lv(b.taste?.acidity) -
      0.5 * lv(b.taste?.bitterness) -
      roastOf(b) +
      (/ジャスミン|花|フローラル|紅茶|ゲイシャ/.test(text(b)) ? 2 : 0),
  },
  {
    label: "酸味しっかり",
    words: /酸っぱ|酸味(が|を)?(好き|強|しっかり|楽しみ)|明るい/,
    score: ({ taste: t }) => lv(t?.acidity) + 0.2 * lv(t?.sweetness),
  },
  {
    label: "酸味ひかえめ",
    words: /酸味(は|が)?(苦手|控え|ひかえ|少な|弱|なし)|酸っぱくない/,
    score: (b) =>
      -lv(b.taste?.acidity) + 0.3 * lv(b.taste?.body) + 0.5 * roastOf(b),
  },
  {
    label: "まろやか",
    words: /まろやか|やさし|優し|やわらか|柔らか|おだやか|穏やか|なめらか/,
    score: ({ taste: t }) =>
      lv(t?.body) +
      lv(t?.sweetness) -
      0.5 * lv(t?.acidity) -
      0.3 * lv(t?.bitterness),
  },
  {
    label: "軽め・あっさり",
    words: /軽|あっさり|薄|ライト/,
    score: (b) =>
      -lv(b.taste?.body) - 0.3 * lv(b.taste?.bitterness) - 0.5 * roastOf(b),
  },
  {
    label: "濃いめで目を覚ます",
    words: /濃|目覚|目を覚|眠|シャキッ|しゃきっ|カフェイン|集中|朝/,
    score: (b) =>
      lv(b.taste?.bitterness) + lv(b.taste?.body) + 0.5 * roastOf(b),
  },
  {
    label: "ほっと一息",
    words: /ほっと|ホッと|ゆっくり|リラックス|休憩|癒|疲|温|あったか|ホット|寒/,
    score: ({ taste: t }) =>
      lv(t?.sweetness) + 0.6 * lv(t?.body) - 0.3 * lv(t?.acidity),
  },
  {
    label: "アイスで飲みたい",
    words: /冷|アイス|暑|ひんやり|キンキン/,
    // 冷やすと酸味が目立ちやすいので、コクと苦味がしっかりしたものが向く
    score: (b) =>
      lv(b.taste?.body) +
      0.5 * lv(b.taste?.bitterness) -
      0.3 * lv(b.taste?.acidity) +
      0.5 * roastOf(b),
  },
  {
    label: "スイーツと一緒に",
    words: /スイーツ|甘いもの|ケーキ|お菓子|デザート|チョコ/,
    score: ({ taste: t }) =>
      lv(t?.bitterness) + 0.5 * lv(t?.body) - 0.3 * lv(t?.sweetness),
  },
  {
    label: "飲みやすい",
    words: /飲みやす|初心者|苦手|はじめて|初めて|クセがない|癖がない/,
    score: ({ taste: t }) =>
      lv(t?.sweetness) +
      0.3 * lv(t?.body) -
      0.5 * lv(t?.acidity) -
      0.5 * lv(t?.bitterness),
  },
];

/** 文字で入れた気分を、知っている気分に当てはめる。どれにも当てはまらなければ null（AI に聞く） */
export function moodFromText(input: string): Mood | null {
  const q = input.trim();
  const exact = MOODS.find((m) => m.label === q);
  if (exact) return exact;
  // 「酸味は苦手」は「苦め」「飲みやすい」より「酸味ひかえめ」を優先する
  const hit = MOODS.filter((m) => m.words.test(q));
  const pick = hit.some((m) => m.label === "酸味ひかえめ")
    ? hit.filter((m) => m.label === "酸味ひかえめ")
    : hit;
  if (pick.length === 0) return null;
  if (pick.length === 1) return { ...pick[0], label: q };
  return {
    label: q,
    words: /$^/,
    score: (b) => pick.reduce((s, m) => s + m.score(b), 0),
  };
}

/** ひらがな・カタカナ、全角・半角、大文字・小文字をそろえる */
const norm = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .replace(/\s+/g, "");

/**
 * 気分ではない言葉（「ベリー」「エチオピア」など）が、名前・産地・説明に入っているか。
 * 入っていない豆はおすすめの下に回す
 */
export function wordMatch(word: string): (b: ScannedBean) => boolean {
  const k = norm(word);
  return (b) => norm([text(b), b.roast, b.sweets].filter(Boolean).join(" ")).includes(k);
}
