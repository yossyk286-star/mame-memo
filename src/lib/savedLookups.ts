import type { ScannedBean } from "./menuScan";

// 一度調べた豆を端末に残しておき、同じ名前なら AI を呼ばずに出す
const KEY = "mame-memo:lookups";
// 端末の保存領域を使いすぎないよう、古いものから捨てる
const MAX = 300;

type Saved = { bean: ScannedBean; at: number };

/** 比べるための表記ゆれをそろえる（全角半角・大文字小文字・空白・ひらがな/カタカナ） */
export function nameKey(s: string) {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s・･\-_'’]/g, "")
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

function load(): Record<string, Saved> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** 調べた言葉か、豆の名前で保存してあるものを返す */
export function findSaved(query: string) {
  return load()[nameKey(query)]?.bean ?? null;
}

/** 調べた結果を、豆の名前と（あれば）調べた言葉の両方で引けるように保存する */
export function saveLookups(beans: ScannedBean[], query?: string) {
  const all = load();
  const at = Date.now();
  for (const d of beans) all[nameKey(d.name)] = { bean: d, at };
  if (query && beans.length === 1) all[nameKey(query)] = { bean: beans[0], at };
  const kept = Object.entries(all)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {}
}

/** 最近調べた豆（名前が同じものは1つ） */
export function recentSaved(n: number) {
  const seen = new Set<string>();
  return Object.values(load())
    .sort((a, b) => b.at - a.at)
    .filter(({ bean }) => !seen.has(bean.name) && !!seen.add(bean.name))
    .slice(0, n)
    .map(({ bean }) => bean);
}

/** バックアップ用 */
export function exportSaved() {
  return load();
}

export function importSaved(data: unknown) {
  if (!data || typeof data !== "object") return;
  const merged = { ...(data as Record<string, Saved>), ...load() };
  try {
    localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {}
}
