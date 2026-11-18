"use client";

import { useId } from "react";

/** 豆の袋の絵に、残りの分だけ豆が入っている（49）。ratio は 0〜1。sloshing が true のあいだ袋がゆらっと揺れて豆の面が動く */
export default function BagGlass({ ratio, color, sloshing }: { ratio: number; color: string; sloshing?: boolean }) {
  const id = useId();
  // 豆が入る袋の部分（上の折り目 y=12 から底の y=42）に合わせる
  const y = 42 - Math.max(0, Math.min(1, ratio)) * 30;
  const body = "M5 6h14l1.5 4v28a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4V10z";
  return (
    <svg className={`bottle-glass${sloshing ? " is-sloshing" : ""}`} viewBox="0 0 24 46" width="22" height="42" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <path d={body} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect className="bottle-glass-liquid" x="0" y={y} width="24" height="46" fill={color} />
      </g>
      <path d={body} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" opacity="0.55" />
    </svg>
  );
}
