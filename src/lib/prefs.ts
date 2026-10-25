/** 自分で登録する好み。記録が少ないうちも、メニューのおすすめに使う */
export type MyPrefs = {
  roasts: string[];
  processes: string[];
  /** 好きな味（フレーバータグや自由入力） */
  likes: string[];
  /** 苦手な味 */
  dislikes: string[];
};

const KEY = "mame-memo:prefs";

export const EMPTY_PREFS: MyPrefs = { roasts: [], processes: [], likes: [], dislikes: [] };

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
  return p.roasts.length + p.processes.length + p.likes.length + p.dislikes.length > 0;
}
