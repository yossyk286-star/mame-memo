import type { TastingRecord } from "./types";

export interface GroupAverage {
  label: string;
  average: number;
  count: number;
}

export interface TasteSummary {
  /** 総合の平均が一番高い「焙煎度 × 抽出方法」。2件以上ある組み合わせのみ */
  bestCombo: GroupAverage | null;
  byRoast: GroupAverage[];
  byProcess: GroupAverage[];
  byMethod: GroupAverage[];
  byStyle: GroupAverage[];
  topFlavors: { label: string; count: number }[];
}

const UNKNOWN = new Set(["不明", "その他", ""]);

/** key ごとに総合の平均を出す。不明・未入力は除外し、平均の高い順 */
function averageBy(records: TastingRecord[], key: (r: TastingRecord) => string | null, minCount = 1) {
  const groups = new Map<string, number[]>();
  for (const r of records) {
    const k = key(r);
    if (!k || UNKNOWN.has(k)) continue;
    groups.set(k, [...(groups.get(k) ?? []), r.overall]);
  }
  return [...groups]
    .filter(([, scores]) => scores.length >= minCount)
    .map(([label, scores]) => ({
      label,
      average: scores.reduce((a, b) => a + b, 0) / scores.length,
      count: scores.length,
    }))
    .sort((a, b) => b.average - a.average || b.count - a.count);
}

export function summarize(records: TastingRecord[]): TasteSummary {
  const combos = averageBy(
    records,
    (r) => (r.roast && r.method && !UNKNOWN.has(r.roast) && !UNKNOWN.has(r.method) ? `${r.roast} × ${r.method}` : null),
    2,
  );

  const flavorCounts = new Map<string, number>();
  for (const r of records) for (const f of r.flavors) flavorCounts.set(f, (flavorCounts.get(f) ?? 0) + 1);

  return {
    bestCombo: combos[0] ?? null,
    byRoast: averageBy(records, (r) => r.roast),
    byProcess: averageBy(records, (r) => r.process),
    byMethod: averageBy(records, (r) => r.method),
    byStyle: averageBy(records, (r) => [r.temp, r.style].filter(Boolean).join("・") || null),
    topFlavors: [...flavorCounts]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}
