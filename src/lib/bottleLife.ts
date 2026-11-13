import type { Bag, TastingRecord } from "./types";

/** 豆の袋のよくある量（g）。登録のときに選ばなかったら 200g */
export const BAG_SIZES = [100, 150, 200, 250, 500];

export function sizeOf(b: Bag) {
  return b.size ?? 200;
}

/** 残りの割合（0〜1）と、あと何杯か（45）。pour は設定の「1回に使う豆の量」 */
export function remaining(b: Bag, mine: TastingRecord[], pour: number) {
  const size = sizeOf(b);
  // 自分で残りを決めていたら、そこから後の記録の分だけ減らす
  const start = b.leftSet ? size * b.leftSet.ratio : size;
  const used = b.leftSet ? Math.max(0, mine.length - b.leftSet.count) : mine.length;
  const left = Math.max(0, start - used * pour);
  return { ratio: left / size, cups: Math.floor(left / pour) };
}

/** 焙煎した日。入れていなければ買った日（46） */
export function roastedOf(b: Bag) {
  return b.openedAt ?? b.boughtAt;
}

/** 焙煎からおいしく飲める日数の目安 */
export const DRINK_WITHIN = 30;

export function daysSinceDate(date: string, now = new Date()) {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(y, m - 1, d).getTime();
  return Math.round(t / 86_400_000);
}
