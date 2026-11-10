import type { TastingRecord } from "./types";
import { tr } from "./i18n";

/** 1杯のカフェイン量（mg）の目安。エスプレッソ系はショット1〜2杯分、ほかはドリップ1杯（150ml）くらい */
export function caffeineMg(r: Pick<TastingRecord, "method">) {
  return r.method === "エスプレッソ" ? 80 : 120;
}

/** その日の「3杯・1,800円・カフェイン約360mg」。値段は入れた記録があるときだけ */
export function dayTotal(records: TastingRecord[]) {
  const priced = records.filter((r) => r.price != null);
  const yen = priced.reduce((s, r) => s + (r.price ?? 0), 0);
  const mg = Math.round(records.reduce((s, r) => s + caffeineMg(r), 0) / 10) * 10;
  const parts = [tr("{0}杯", records.length)];
  if (priced.length > 0) parts.push(tr("{0}円", yen.toLocaleString("ja-JP")));
  parts.push(tr("カフェイン約{0}mg", mg));
  return parts.join(tr("・"));
}
