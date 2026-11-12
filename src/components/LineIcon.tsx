/** タブと同じ線のアイコン（24 の枠・線の太さ 1.8・角は丸く）。絵文字のかわりに使う */
const PATHS = {
  camera: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.6-2h5.4l1.6 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  // 並んだ2つのカップ（飲み比べ・カッピング）
  flight: (
    <>
      <path d="M3 9h6v4.5a3 3 0 0 1-6 0zM9 10.5h.8a1.6 1.6 0 0 1 0 3.2H9" />
      <path d="M13 9h6v4.5a3 3 0 0 1-6 0zM19 10.5h.8a1.6 1.6 0 0 1 0 3.2H19" />
      <path d="M2.5 20h19" />
    </>
  ),
  compare: <path d="M12 3.5l8 5.8-3 9.2H7l-3-9.2z" />,
  share: (
    <>
      <path d="M12 15V4M8 7.5 12 3.5l4 4" />
      <path d="M6 11H5v9.5h14V11h-1" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3-8.7 8.7z" />
      <circle cx="8" cy="8" r="1.4" />
    </>
  ),
  // 取っ手つきのカップ（淹れ方・飲み方）
  cup: (
    <>
      <path d="M5 8.5h11v5.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
      <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8.5 3.5v2M12.5 3.5v2" />
    </>
  ),
  // きらきら（AI）
  sparkle: (
    <>
      <path d="M10.5 4l1.7 4.8 4.8 1.7-4.8 1.7-1.7 4.8-1.7-4.8L4 10.5l4.8-1.7z" />
      <path d="M18 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
};

export type IconName = keyof typeof PATHS;

export default function LineIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="line-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
