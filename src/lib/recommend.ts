import type { ScannedBean } from "./menuScan";
import { hasPrefs, type MyPrefs } from "./prefs";
import type { TastingRecord } from "./types";

/** フレーバータグごとに、メニューの説明で使われがちな言葉 */
const FLAVOR_WORDS: Record<string, string[]> = {
  チェリー: ["チェリー", "さくらんぼ", "cherry"],
  ベリー: ["ベリー", "カシス", "ブドウ", "ぶどう", "葡萄", "グレープ", "berry", "grape", "cassis"],
  柑橘: ["柑橘", "オレンジ", "レモン", "ライム", "グレープフルーツ", "シトラス", "orange", "lemon", "citrus"],
  黄桃: ["桃", "ピーチ", "アプリコット", "杏", "peach", "apricot"],
  フローラル: ["フローラル", "花", "ジャスミン", "floral", "jasmine"],
  チョコレート: ["チョコ", "カカオ", "chocolate", "cacao"],
  ナッツ: ["ナッツ", "アーモンド", "ヘーゼル", "nut", "almond"],
  キャラメル: ["キャラメル", "黒糖", "蜂蜜", "はちみつ", "ハチミツ", "caramel", "honey"],
};

/** おすすめを出すのに必要な記録の数 */
export const MIN_RECORDS = 2;

export type BeanPick = { score: number; reasons: string[] };

function average(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** メニューの説明に出てくるフレーバー。自分で追加した味もそのまま探す */
function flavorsIn(text: string, custom: string[]) {
  const t = text.toLowerCase();
  const found = Object.entries(FLAVOR_WORDS)
    .filter(([, words]) => words.some((w) => t.includes(w.toLowerCase())))
    .map(([tag]) => tag);
  return [...new Set([...found, ...custom.filter((f) => t.includes(f.toLowerCase()))])];
}

/**
 * これまでの記録の総合評価と、自分で登録した好みから、メニューの豆それぞれの「好みに合いそう度」を出す。
 * 平均より高く評価した焙煎度・精製方法・味や、登録した好みに近いほど高い。
 * 記録が少なく好みの登録もないときは null
 */
export function scoreBeans(beans: ScannedBean[], records: TastingRecord[], prefs: MyPrefs): BeanPick[] | null {
  const useRecords = records.length >= MIN_RECORDS;
  if (!useRecords && !hasPrefs(prefs)) return null;
  const base = useRecords ? average(records.map((r) => r.overall)) : 0;
  const custom = [...new Set([...records.flatMap((r) => r.flavors), ...prefs.likes, ...prefs.dislikes])].filter(
    (f) => !(f in FLAVOR_WORDS),
  );

  // 焙煎度や精製方法が同じ記録の平均と、全体の平均の差。件数が少ないうちは控えめに効かせる
  function lean(label: string | null, key: (r: TastingRecord) => string | null) {
    if (!label || label === "不明" || label === "その他") return null;
    const scores = records.filter((r) => key(r) === label).map((r) => r.overall);
    if (scores.length === 0) return null;
    const avg = average(scores);
    return { avg, weight: ((avg - base) * Math.min(scores.length, 3)) / 3 };
  }

  return beans.map((b) => {
    let score = 0;
    const reasons: string[] = [];
    const flavors = flavorsIn(`${b.menuNote} ${b.name}`, custom);

    // 自分で登録した好み
    if (b.roast && prefs.roasts.includes(b.roast)) {
      score += 0.6;
      reasons.push(`好きな${b.roast}`);
    }
    if (b.process && prefs.processes.includes(b.process)) {
      score += 0.4;
      reasons.push(`好きな${b.process}`);
    }
    const prefLiked = flavors.filter((f) => prefs.likes.includes(f));
    const prefDisliked = flavors.filter((f) => prefs.dislikes.includes(f));
    score += 0.5 * prefLiked.length - 0.6 * prefDisliked.length;
    if (prefLiked.length > 0) reasons.push(`好きな味（${prefLiked.join("・")}）`);

    if (!useRecords) return { score, reasons };

    // 同じ豆を前に飲んでいれば、その評価がいちばん確か
    const same = records.filter((r) => r.origin && r.farm && b.origin === r.origin && b.farm === r.farm);
    if (same.length > 0) {
      const avg = average(same.map((r) => r.overall));
      score += (avg - base) * 1.5;
      reasons.push(`前に飲んで★${avg.toFixed(1)}`);
    }

    const roast = lean(b.roast, (r) => r.roast);
    if (roast) {
      score += roast.weight;
      if (roast.avg >= 4 && roast.weight > 0) reasons.push(`${b.roast}の評価が高め（平均★${roast.avg.toFixed(1)}）`);
    }
    const process = lean(b.process, (r) => r.process);
    if (process) {
      score += process.weight;
      if (process.avg >= 4 && process.weight > 0) reasons.push(`${b.process}の評価が高め（平均★${process.avg.toFixed(1)}）`);
    }

    // 高く評価した記録で感じた味が、メニューの説明にどれだけあるか（登録した好みと重なる分は数えない）
    const liked = flavors.filter(
      (f) => !prefLiked.includes(f) && records.some((r) => r.overall >= 4 && r.flavors.includes(f)),
    );
    const disliked = flavors.filter((f) => records.some((r) => r.overall <= 2 && r.flavors.includes(f)));
    score += 0.4 * liked.length - 0.4 * disliked.length;
    if (liked.length > 0) reasons.push(`高評価のときの味（${liked.join("・")}）が入っている`);

    return { score, reasons };
  });
}

/** おすすめする豆の番号。好みに合う理由があり、いちばん点が高いもの。なければ -1 */
export function bestPick(picks: BeanPick[]) {
  let best = -1;
  picks.forEach((p, i) => {
    if (p.score > 0 && p.reasons.length > 0 && (best < 0 || p.score > picks[best].score)) best = i;
  });
  return best;
}
