import type { TastingRecord } from "./types";

/** 六角形のグラフの軸。古い記録にはコク・香りがないので未入力として扱う */
export const TASTE_AXES: [string, (r: TastingRecord) => number | null | undefined][] = [
  ["酸味", (r) => r.acidity],
  ["苦味", (r) => r.bitterness],
  ["甘さ", (r) => r.sweetness],
  ["コク", (r) => r.body],
  ["香り", (r) => r.aroma],
  ["総合", (r) => r.overall],
];
