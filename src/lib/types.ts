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
  /** 合うスイーツ（メニュー読み取りの一言）。後から増やした項目なので古い記録にはない */
  sweets?: string;
  flavors: string[]; // 感じた味
  acidity: Score | null;
  bitterness: Score | null;
  sweetness: Score | null;
  /** コク（口当たりの重さ）・香りの華やかさ。後から増やした項目なので古い記録にはない */
  body?: Score | null;
  aroma?: Score | null;
  overall: Score;
  /** 1杯の値段（円）。値段の欄ができる前の記録にはない */
  price?: number | null;
  /** 家の豆（買った豆）から記録したときの、その豆の id */
  bagId?: string;
  memo: string;
  /** 自分で撮った写真（飲んだコーヒー、お店など）。何枚でも */
  photos: Blob[];
  /** 1枚だけだった頃の写真。読むときは photosOf() を使う */
  photo?: Blob | null;
  createdAt: number;
  updatedAt: number;
}

export type RecordDraft = Omit<TastingRecord, "id" | "createdAt" | "updatedAt" | "overall"> & {
  overall: Score | null;
};

/** 家で淹れるために買った豆。何回かに分けて記録できる */
export interface Bag {
  id: string;
  /** 産地（国） */
  origin: string;
  farm: string;
  roast: Roast | null;
  process: Process | null;
  /** 買ったお店 */
  shop: string;
  /** お店の説明や AI の説明など */
  note: string;
  /** 買った値段（円） */
  price: number | null;
  /** 買った日 YYYY-MM-DD */
  boughtAt: string;
  /** 飲みきったら true */
  finished: boolean;
  createdAt: number;
}
