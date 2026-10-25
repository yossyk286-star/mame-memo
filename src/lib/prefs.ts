/** 自分で登録する好み。記録が少ないうちも、メニューのおすすめに使う */
export type MyPrefs = {
  roasts: string[];
  /** 苦手な焙煎度 */
  avoidRoasts: string[];
  processes: string[];
  /** 好きな抽出方法 */
  methods: string[];
  /** 好きな飲み方（ホット・アイス・ブラック・ミルク） */
  ways: string[];
  /** 好きな産地（国） */
  origins: string[];
  /** 好きな味（フレーバータグや自由入力） */
  likes: string[];
  /** 苦手な味 */
  dislikes: string[];
  /** 好きな味の寄り方。1〜5、決めていなければ null */
  acidity: number | null;
  bitterness: number | null;
  body: number | null;
  /** 1杯の予算の上限（円）。決めていなければ null */
  budget: number | null;
};

const KEY = "mame-memo:prefs";

export const EMPTY_PREFS: MyPrefs = {
  roasts: [],
  avoidRoasts: [],
  processes: [],
  methods: [],
  ways: [],
  origins: [],
  likes: [],
  dislikes: [],
  acidity: null,
  bitterness: null,
  body: null,
  budget: null,
};

export function loadPrefs(): MyPrefs {
  try {
    return { ...EMPTY_PREFS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return EMPTY_PREFS;
  }
}

export function savePrefs(prefs: MyPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {}
}

export function hasPrefs(p: MyPrefs) {
  const lists = [p.roasts, p.avoidRoasts, p.processes, p.methods, p.ways, p.origins, p.likes, p.dislikes];
  return lists.some((l) => l.length > 0) || p.acidity !== null || p.bitterness !== null || p.body !== null;
}
