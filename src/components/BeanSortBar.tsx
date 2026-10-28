"use client";

import { roastColor } from "@/components/RecordCard";
import { AREAS, ROAST_FILTERS, SORT_LABELS, type SortKey } from "@/lib/beanSort";
import type { Roast } from "@/lib/types";

/** 焙煎度・産地の地域の絞り込みと、酸味・苦味などの並び替え。焙煎度と地域は出てくるものだけ並べる */
export default function BeanSortBar({
  roasts,
  roast,
  onRoast,
  areas,
  area,
  onArea,
  sort,
  onSort,
  sorts,
  defaultLabel,
  extra,
}: {
  roasts: (Roast | null)[];
  roast: Roast | null;
  onRoast: (r: Roast | null) => void;
  areas: (string | null)[];
  area: string | null;
  onArea: (a: string | null) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  sorts: SortKey[];
  defaultLabel: string;
  /** 焙煎度の前に並べるボタン（★4以上など） */
  extra?: React.ReactNode;
}) {
  const roastsUsed = ROAST_FILTERS.filter((r) => roasts.includes(r));
  const areasUsed = AREAS.filter((a) => areas.includes(a));
  return (
    <>
      {(roastsUsed.length > 1 || areasUsed.length > 1 || extra) && (
        <div className="scroll-row" role="group" aria-label="焙煎度と産地で絞り込み">
          {extra}
          {(roastsUsed.length > 1 ? roastsUsed : []).map((r) => (
            <button
              key={r}
              type="button"
              className="chip kind-chip"
              style={{ "--kc": roastColor(r) } as React.CSSProperties}
              aria-pressed={roast === r}
              onClick={() => onRoast(roast === r ? null : r)}
            >
              {r}
            </button>
          ))}
          {(areasUsed.length > 1 ? areasUsed : []).map((a) => (
            <button
              key={a}
              type="button"
              className="chip"
              aria-pressed={area === a}
              onClick={() => onArea(area === a ? null : a)}
            >
              {a}
            </button>
          ))}
        </div>
      )}
      <div className="scroll-row" role="group" aria-label="並び替え">
        {(["default", ...sorts] as SortKey[]).map((s) => (
          <button key={s} type="button" className="chip" aria-pressed={sort === s} onClick={() => onSort(s)}>
            {s === "default" ? defaultLabel : SORT_LABELS[s]}
          </button>
        ))}
      </div>
    </>
  );
}
