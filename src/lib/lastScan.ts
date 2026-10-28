import type { ScannedBean } from "./menuScan";

/** 最後に読み取ったメニュー。お店で確認だけして、あとから記録するときに撮り直さずに使う */
export type LastScan = {
  date: string;
  beans: ScannedBean[];
  /** この読み取り結果からすでに記録した豆の名前 */
  recorded: string[];
};

const KEY = "mame-memo:last-scan";
/** 一覧が変わったときに流す合図（下のタブの件数を合わせる） */
export const LAST_SCAN_EVENT = "mame-memo:last-scan-changed";

export function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 今日の読み取り結果を返す。前の日のものは使わない */
export function loadLastScan(): LastScan | null {
  try {
    const scan = JSON.parse(localStorage.getItem(KEY) ?? "null") as LastScan | null;
    return scan?.date === today() ? scan : null;
  } catch {
    return null;
  }
}

function store(scan: LastScan) {
  try {
    localStorage.setItem(KEY, JSON.stringify(scan));
  } catch {}
  window.dispatchEvent(new Event(LAST_SCAN_EVENT));
}

/** recorded は一覧から豆を外したときに、すでに記録した分を引き継ぐのに使う */
export function saveLastScan(beans: ScannedBean[], recorded: string[] = []) {
  store({ date: today(), beans, recorded });
}

export function markRecorded(name: string) {
  const scan = loadLastScan();
  if (scan && !scan.recorded.includes(name)) store({ ...scan, recorded: [...scan.recorded, name] });
}
