export type Roast = "浅煎り" | "中煎り" | "深煎り" | "不明";
export type Process = "Washed" | "Natural" | "Honey" | "Anaerobic" | "その他" | "不明";
export type Method = "ドリップ" | "エアロプレス" | "エスプレッソ" | "サイフォン" | "フレンチプレス" | "その他";
export type Temp = "ホット" | "アイス";
export type Style = "ブラック" | "ミルク";

/** 1〜5 の評価。未入力は null */
export type Score = 1 | 2 | 3 | 4 | 5;

export interface TastingRecord {
  id: string;
  date: string; // YYYY-MM-DD
  shop: string;
  origin: string;
  farm: string;
  roast: Roast | null;
  process: Process | null;
  method: Method | null;
  temp: Temp | null;
  style: Style | null;
  menuNote: string; // お店の説明
  flavors: string[]; // 感じた味
  acidity: Score | null;
  bitterness: Score | null;
  sweetness: Score | null;
  overall: Score;
  memo: string;
  photo: Blob | null;
  createdAt: number;
  updatedAt: number;
}

export type RecordDraft = Omit<TastingRecord, "id" | "createdAt" | "updatedAt" | "overall"> & {
  overall: Score | null;
};
