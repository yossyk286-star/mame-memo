export type Roast = "浅煎り" | "中煎り" | "深煎り" | "不明";
export type Process = "Washed" | "Natural" | "Honey" | "Anaerobic" | "その他" | "不明";
export type Method = "ドリップ" | "エアロプレス" | "エスプレッソ" | "サイフォン" | "フレンチプレス" | "その他";
export type Temp = "ホット" | "アイス";
export type Style = "ブラック" | "ミルク";
export type Grind = "細挽き" | "中細挽き" | "中挽き" | "粗挽き";

/** 家で淹れたときのレシピ。どれも入れなくてよい */
export interface Recipe {
  /** 豆の量（g） */
  dose: number | null;
  /** お湯の量（ml） */
  water: number | null;
  /** お湯の温度（℃） */
  tempC: number | null;
  grind: Grind | null;
  /** 抽出時間（例：2:30） */
  time: string;
}

/** 記録の画面で AI に聞いたことと答え */
export interface QA {
  q: string;
  a: string;
  at: number;
}

/** 1〜5 の評価。未入力は null */
export type Score = 1 | 2 | 3 | 4 | 5;
/** 総合評価。0.5 きざみ（0.5〜5）。0.5 きざみにする前の記録は 1〜5 の整数 */
export type Overall = 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5;

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
  overall: Overall;
  /** 1杯の値段（円）。値段の欄ができる前の記録にはない */
  price?: number | null;
  /** 家の豆（買った豆）から記録したときの、その豆の id */
  bagId?: string;
  /** 家で淹れたときのレシピ。後から増やした項目なので古い記録にはない */
  recipe?: Recipe;
  /** この記録について AI に聞いたこと */
  qa?: QA[];
  memo: string;
  /** ♥ また飲みたい。後から増やした項目なので古い記録にはない */
  again?: boolean;
  /** 飲んだ場所（位置を使ってよいときだけ）。近くの前に行ったお店を出すのに使う */
  geo?: { lat: number; lng: number };
  /** 自分で撮った写真（飲んだコーヒー、お店など）。何枚でも */
  photos: Blob[];
  /** 1枚だけだった頃の写真。読むときは photosOf() を使う */
  photo?: Blob | null;
  createdAt: number;
  updatedAt: number;
}

export type RecordDraft = Omit<TastingRecord, "id" | "createdAt" | "updatedAt" | "overall"> & {
  overall: Overall | null;
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
  /** 焙煎した日 YYYY-MM-DD（焙煎からの日数と飲み頃の目安に使う）。入れていなければ買った日で数える。後から増やした項目 */
  openedAt?: string | null;
  /** 袋の量（g）。残りメーターに使う。後から増やした項目 */
  size?: number | null;
  /** 飲みきったら true */
  finished: boolean;
  /** 残りわずかのしるし。後から増やした項目なので古い豆にはない */
  low?: boolean;
  createdAt: number;
}
