import { z } from "zod";
import { areaOf, AREAS } from "./beanSort";
import { nameKey } from "./savedLookups";
import type { Bag, Roast, TastingRecord } from "./types";

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

const p = (roast: FoodPick["roast"], area: string, title: string, reason: string, examples = ""): FoodPick => ({
  roast,
  area,
  title,
  reason,
  examples,
});

/** よく食べるものは、AI を呼ばずに出せるよう内蔵しておく（0円・電波がなくても使える） */
const BUILT_IN: { words: RegExp; pairing: FoodPairing }[] = [
  {
    words: /チョコ|ショコラ|ブラウニー|ガトーショコラ|ココア/,
    pairing: {
      dish: "チョコレート",
      tip: "チョコのほろ苦さには、同じく苦味とコクのある深煎りがいちばん合います。",
      picks: [
        p("深煎り", "アジア・太平洋", "深煎りをブラックで", "苦味とコクが重なって、チョコの甘さがいっそう引き立ちます。", "マンデリン、フレンチロースト"),
        p("中煎り", "中南米", "ナッツ系の中煎り", "ナッツやキャラメルのような香りが、ミルクチョコとよく合います。", "ブラジル、グアテマラ"),
        p("浅煎り", "アフリカ・中東", "ベリー系の浅煎り", "ベリーのような酸味が、ビターチョコに果物を添えたような味にします。", "エチオピア ナチュラル"),
      ],
    },
  },
  {
    words: /チーズケーキ|レアチーズ|バスク/,
    pairing: {
      dish: "チーズケーキ",
      tip: "チーズのコクと酸味には、酸味がきれいな豆や、コクのある中深煎りが合います。",
      picks: [
        p("浅煎り", "アフリカ・中東", "酸味の明るい浅煎り", "レモンのような酸味が、チーズの濃さをさっぱりさせます。", "ケニア、エチオピア"),
        p("中煎り", "中南米", "バランスのよい中煎り", "ほどよい苦味とコクで、ベイクドチーズケーキの香ばしさに合います。", "コスタリカ、コロンビア"),
        p("深煎り", "", "深煎りをブラックで", "バスクチーズケーキの焦がした香りと、深煎りの香ばしさが重なります。"),
      ],
    },
  },
  {
    words: /いちご|苺|ショートケーキ|タルト|フルーツ|ベリー|ケーキ/,
    pairing: {
      dish: "フルーツのケーキ",
      tip: "果物の甘酸っぱさには、同じく果実のような酸味のある浅煎りが合います。",
      picks: [
        p("浅煎り", "アフリカ・中東", "フルーティーな浅煎り", "果物のような香りがケーキの果物と重なり、口の中が華やかになります。", "エチオピア ウォッシュト"),
        p("中煎り", "中南米", "やさしい中煎り", "生クリームの甘さを、ほどよい苦味がすっきりさせます。", "グアテマラ"),
        p("浅煎り", "中南米", "アイスの浅煎り", "冷たくするとさらにすっきりして、甘いケーキと交互においしく飲めます。", "パナマ、コスタリカ"),
      ],
    },
  },
  {
    words: /あんこ|和菓子|どら焼き|大福|団子|だんご|羊羹|ようかん|まんじゅう|たい焼き|最中/,
    pairing: {
      dish: "和菓子・あんこ",
      tip: "あんこのしっかりした甘さには、苦味とコクのある深煎りが合います。",
      picks: [
        p("深煎り", "アジア・太平洋", "深煎りをブラックで", "苦味があんこの甘さを受け止めて、甘すぎず食べられます。", "マンデリン"),
        p("中煎り", "中南米", "まろやかな中煎り", "やさしい甘さとコクが、お団子や大福のお米の味に寄りそいます。", "ブラジル"),
        p("深煎り", "", "深煎りのカフェオレ", "ミルクのまろやかさが、どら焼きやたい焼きの生地とよく合います。"),
      ],
    },
  },
  {
    words: /クッキー|焼き菓子|フィナンシェ|マドレーヌ|スコーン|パウンド|ビスケット|カステラ/,
    pairing: {
      dish: "焼き菓子",
      tip: "バターの香ばしさには、ナッツやキャラメルの香りがある中煎りが合います。",
      picks: [
        p("中煎り", "中南米", "ナッツ系の中煎り", "香ばしい香りどうしが重なって、焼き菓子のバターの風味が引き立ちます。", "ブラジル、グアテマラ"),
        p("深煎り", "", "深煎りをミルクで", "カフェラテのまろやかさで、スコーンやカステラがやさしい味に。"),
        p("浅煎り", "アフリカ・中東", "華やかな浅煎り", "シンプルなクッキーには、香りの華やかな豆で変化をつけるのもおすすめ。", "エチオピア"),
      ],
    },
  },
  {
    words: /ドーナツ|ドーナッツ|揚げパン|チュロス/,
    pairing: {
      dish: "ドーナツ",
      tip: "油と甘さには、苦味でさっぱりさせる深めの焙煎が合います。",
      picks: [
        p("深煎り", "", "深煎りをブラックで", "苦味が油と砂糖の甘さを流して、次のひと口がまたおいしくなります。"),
        p("中煎り", "中南米", "定番の中煎り", "ドーナツ屋さんの定番。軽い苦味とコクでどんどん食べられます。", "コロンビア"),
        p("深煎り", "", "アイスラテ", "冷たいミルクで、揚げ物の重さがやわらぎます。"),
      ],
    },
  },
  {
    words: /プリン|カスタード|シュークリーム|エクレア|クレーム/,
    pairing: {
      dish: "プリン・カスタード",
      tip: "卵とカラメルの甘さには、キャラメルのような香りの中深煎りが合います。",
      picks: [
        p("中煎り", "中南米", "キャラメル系の中煎り", "カラメルの香ばしさとコーヒーの香りがよく合います。", "グアテマラ、エルサルバドル"),
        p("深煎り", "", "深煎りをブラックで", "苦味がカスタードの甘さとまろやかさを引き締めます。"),
        p("浅煎り", "アフリカ・中東", "やわらかな浅煎り", "軽い酸味で、濃厚なカスタードもさっぱりいただけます。", "ルワンダ"),
      ],
    },
  },
  {
    words: /アイス|ジェラート|パフェ|ソフトクリーム|かき氷/,
    pairing: {
      dish: "アイス・パフェ",
      tip: "冷たい甘さには、濃くて苦味のあるコーヒーがよく合います。アフォガートもおすすめ。",
      picks: [
        p("深煎り", "", "濃い深煎り（アフォガート）", "バニラアイスに濃いコーヒーをかけると、甘さと苦さがちょうどよくなります。", "エスプレッソ"),
        p("中煎り", "中南米", "ホットの中煎り", "冷えた口を温めて、アイスの甘さをリセットします。", "コロンビア"),
        p("浅煎り", "アフリカ・中東", "フルーティーな浅煎り", "フルーツのパフェには、果物のような香りの豆が合います。", "エチオピア"),
      ],
    },
  },
  {
    words: /ティラミス|モンブラン|栗|マロン|キャラメル|ナッツ|アーモンド/,
    pairing: {
      dish: "ティラミス・栗・ナッツ",
      tip: "コクのある甘さには、香ばしい中深煎りが香りを重ねてくれます。",
      picks: [
        p("深煎り", "", "深煎りをブラックで", "ティラミスのコーヒーの味と重なり、マスカルポーネの甘さが引き立ちます。"),
        p("中煎り", "中南米", "ナッツ系の中煎り", "栗やナッツの香ばしさに、同じ方向の香りが合います。", "ブラジル"),
        p("中煎り", "", "カフェラテ", "ミルクでまろやかにすると、モンブランのクリームとよくなじみます。"),
      ],
    },
  },
  {
    words: /パン|トースト|クロワッサン|サンド|ホットサンド|朝ごはん|朝食|モーニング|卵|エッグ|ベーコン/,
    pairing: {
      dish: "パン・朝ごはん",
      tip: "朝ごはんには、軽めで飲み飽きない中煎りやカフェオレが合います。",
      picks: [
        p("中煎り", "中南米", "すっきりした中煎り", "パンの小麦の香りやバターと、軽い苦味がちょうどよく合います。", "コロンビア、ブラジル"),
        p("深煎り", "", "カフェオレ", "たっぷりのミルクで、クロワッサンやトーストとやさしく合わせられます。"),
        p("浅煎り", "アフリカ・中東", "軽い浅煎り", "ジャムやフルーツのサンドには、さわやかな酸味の豆も合います。", "ケニア"),
      ],
    },
  },
  {
    words: /カレー|スパイス|ナポリタン|ハンバーグ|オムライス|ピザ|パスタ|ランチ/,
    pairing: {
      dish: "カレー・洋食",
      tip: "スパイスや濃い味には、苦味とコクで口の中を整える深めの焙煎が合います。",
      picks: [
        p("深煎り", "アジア・太平洋", "深煎りをブラックで", "スパイスの後に苦味とコクで口がさっぱりします。喫茶店のカレーの定番です。", "マンデリン"),
        p("中煎り", "中南米", "アイスの中煎り", "辛さのあとに冷たいコーヒーがすっきり。", "コロンビア"),
        p("浅煎り", "アフリカ・中東", "スパイシーな浅煎り", "スパイスのような香りの豆なら、カレーの香りと引き立て合います。", "ケニア"),
      ],
    },
  },
];

/** 内蔵しているもの（入力のヒントに出す） */
export const BUILT_IN_DISHES = BUILT_IN.map((b) => b.pairing.dish);

export function builtInPairing(dish: string): FoodPairing | null {
  const q = dish.trim();
  return BUILT_IN.find((b) => b.pairing.dish === q || b.words.test(q))?.pairing ?? null;
}

// AI に聞いた結果は端末に残し、同じ料理なら AI を呼ばずに出す
const KEY = "mame-memo:pairings";
const MAX = 100;

type Saved = Record<string, { pairing: FoodPairing; at: number }>;

function load(): Saved {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function findSavedPairing(dish: string) {
  return load()[nameKey(dish)]?.pairing ?? null;
}

export function savePairing(query: string, pairing: FoodPairing) {
  const all = load();
  const at = Date.now();
  all[nameKey(query)] = { pairing, at };
  all[nameKey(pairing.dish)] = { pairing, at };
  const kept = Object.entries(all)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {}
}

/** 前に調べた料理（新しい順） */
export function recentPairings(limit: number) {
  const seen = new Set<string>();
  return Object.values(load())
    .sort((a, b) => b.at - a.at)
    .map((s) => s.pairing.dish)
    .filter((d) => !seen.has(d) && seen.add(d))
    .slice(0, limit);
}

export type MineMatch<T> = { item: T; why: string; score: number };

/** その豆（記録や家の豆）が、おすすめのどれかと同じ焙煎度・地域か */
function matchPick(b: { roast: Roast | null; origin: string; farm: string }, picks: FoodPick[]) {
  const area = areaOf(b);
  const both = picks.find((p) => b.roast === p.roast && !!p.area && area === p.area);
  if (both) return { score: 3, why: `同じ${both.roast}・${area}` };
  const roast = picks.find((p) => b.roast === p.roast);
  if (roast) return { score: 2, why: `同じ${roast.roast}` };
  return null;
}

/** 合うスイーツやメモに、この料理が書いてあるか（表記ゆれをそろえて、どちらかがどちらかを含めば） */
function ateWith(r: TastingRecord, dish: string, query: string) {
  const keys = [dish, query].map(nameKey).filter(Boolean);
  const sweets = nameKey(r.sweets ?? "");
  if (sweets && keys.some((k) => sweets.includes(k) || k.includes(sweets))) return `合うスイーツに「${r.sweets!.split(/[。、.]/)[0]}」`;
  const memo = nameKey(r.memo);
  if (memo && keys.some((k) => k.length >= 2 && memo.includes(k))) return `メモに「${query.trim()}」`;
  return null;
}

/** 自分の記録から、この料理に合いそうな豆。メモに書いて好評だったもの、同じ焙煎度・地域で評価の高いものの順 */
export function matchRecords(records: TastingRecord[], pairing: FoodPairing, query: string, limit = 3) {
  const best = new Map<string, MineMatch<TastingRecord>>();
  for (const r of records) {
    if (r.overall < 3) continue;
    const ate = ateWith(r, pairing.dish, query);
    const m = matchPick(r, pairing.picks);
    if (!ate && !m) continue;
    // 焙煎度が同じだけのものは、評価が高いときだけ出す
    if (!ate && m!.score < 3 && r.overall < 4) continue;
    const score = (ate ? 4 : 0) + (m?.score ?? 0) + (r.overall - 3) * 0.6;
    const why = `${ate ?? m!.why}で★${r.overall}`;
    const key = nameKey(`${r.origin}${r.farm}`) || r.id;
    if ((best.get(key)?.score ?? -1) < score) best.set(key, { item: r, why, score });
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

/** 家にある（飲みきっていない）豆から、この料理に合いそうなもの */
export function matchBags(bags: Bag[], pairing: FoodPairing, limit = 2) {
  return bags
    .filter((b) => !b.finished)
    .map((b) => {
      const m = matchPick(b, pairing.picks);
      return m && { item: b, why: m.why, score: m.score + (b.low ? -0.5 : 0) };
    })
    .filter((m): m is MineMatch<Bag> => !!m)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
