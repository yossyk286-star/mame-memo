import { countryOf } from "./countries";
import type { TastingRecord } from "./types";

/**
 * 相棒（ちっちゃいコーヒー豆）が記録を保存したときに言うひとこと。
 * AI は使わず、記録の中身と今までの記録から決まった言葉を選ぶ
 */
export type BuddyMood = "happy" | "normal" | "wow" | "worried" | "sad";
export type BuddyLine = { text: string; mood: BuddyMood };

const KEY = "mame-memo:buddy";
export const BUDDY_EVENT = "mame-memo:buddy";

/** 相棒を出すかどうか（設定画面で切り替える）。決めていなければ出す */
export function buddyOn() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setBuddyOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
}

/** 画面が移っても出せるように、レイアウトにいる <Buddy /> へイベントで渡す */
export function announceBuddy(line: BuddyLine) {
  if (!buddyOn()) return;
  window.dispatchEvent(new CustomEvent<BuddyLine>(BUDDY_EVENT, { detail: line }));
}

const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

function localDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** その日までに何日続けて記録しているか */
function streakDays(dates: Set<string>, last: string) {
  const d = new Date(`${last}T12:00:00`);
  let n = 0;
  while (dates.has(localDate(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

const MILESTONES = [10, 30, 50, 100, 200, 300, 500, 1000];

/** 焙煎度・淹れ方ごとのひとこと。当てはまるものがなければ ふつうの言葉から選ぶ */
function kindLines(r: TastingRecord): string[] {
  if (r.temp === "アイス") return ["アイスコーヒー、氷がカランっていう音が好き", "冷やすと甘さが感じやすくなるんだって"];
  if (r.method === "エスプレッソ") return ["エスプレッソ！ぎゅっと濃いね", "クレマ、きれいだった？"];
  if (r.style === "ミルク") return ["ミルクと合わせるとまろやかになるね", "ラテアート、あったかな？"];
  switch (r.roast) {
    case "浅煎り":
      return ["浅煎りは果物みたいな酸味が楽しいよね", "ぼくより明るい色の豆だね"];
    case "中煎り":
      return ["中煎りはバランスがいいよね", "酸味と苦味、どっちが強かった？"];
    case "深煎り":
      return ["深煎りのほろ苦さ、落ち着くね", "ぼくもこんがり焼かれたい…"];
    default:
      return [];
  }
}

const PLAIN = [
  "記録しといたよ！",
  "ほっとひと息、おつかれさま",
  "いい1杯だったかな？",
  "味のこと、言葉にできるとたのしいね",
  "少しずつ好みが見えてきたね",
];

/** 同じ豆かどうかを見る名前。農園があれば農園、なければ産地 */
function beanName(r: TastingRecord) {
  return r.farm.trim() || r.origin.trim();
}

/**
 * 保存した記録へのひとこと。all はこの記録も含めたすべての記録
 * カフェインのとりすぎが心配な日は、ほかより先に心配する
 */
export function buddyLine(r: TastingRecord, all: TastingRecord[], now = new Date()): BuddyLine {
  const others = all.filter((x) => x.id !== r.id);
  const isToday = r.date === localDate(now);
  const sameDay = all.filter((x) => x.date === r.date).length;
  const hour = now.getHours();

  if (isToday && sameDay >= 6)
    return {
      mood: "worried",
      text: pick([
        `今日はもう${sameDay}杯目だよ…！カフェインとりすぎかも。お水にしよう？`,
        `${sameDay}杯目…ぼく心配だよ。胃がびっくりしないように、何か食べてね`,
      ]),
    };
  if (isToday && sameDay >= 4)
    return {
      mood: "worried",
      text: pick([
        `${sameDay}杯目だね。ちょっと多めかも。お水もはさもう`,
        `おいしいね。でも${sameDay}杯目だから、次はデカフェもいいかも`,
      ]),
    };

  if (others.length === 0)
    return { mood: "wow", text: "はじめての記録だね！これからいっしょに飲んだコーヒーを覚えていくよ" };

  if (MILESTONES.includes(all.length))
    return { mood: "wow", text: `${all.length}杯目の記録！ここまで続けてえらいなあ` };

  const country = countryOf(r);
  if (country && !others.some((x) => countryOf(x) === country))
    return { mood: "wow", text: `はじめての${country}！スタンプ押しといたよ` };

  const name = beanName(r);
  const before = name ? others.filter((x) => beanName(x) === name) : [];
  if (before.length > 0) {
    const prev = before.reduce((a, b) => (a.date >= b.date ? a : b));
    const n = before.length + 1;
    if (r.overall > prev.overall)
      return { mood: "happy", text: `${name}は${n}回目。前より好きになったみたいだね` };
    if (r.overall < prev.overall)
      return { mood: "normal", text: `${name}は${n}回目。前のほうが好みだったかな？淹れ方のちがいかも` };
    return { mood: "happy", text: `${name}は${n}回目だね。すっかりお気に入り？` };
  }

  if (r.overall === 5)
    return {
      mood: "happy",
      text: pick([
        "★5！ぼくまでうれしくなっちゃう",
        "最高の1杯だったんだね！豆の名前を覚えておこう",
        "★5いただきました！また会えるといいね",
      ]),
    };
  if (r.overall <= 2)
    return {
      mood: "sad",
      text: pick([
        "合わなかったかあ。苦手がわかるのも大事な記録だよ",
        "残念だったね。次はきっと好きな1杯に会えるよ",
      ]),
    };

  if (isToday && sameDay === 3)
    return { mood: "normal", text: "今日3杯目だね。お水もいっしょに飲もうね" };

  if (isToday && hour >= 20)
    return { mood: "normal", text: "夜のコーヒー、眠れなくならないかな？" };

  const streak = streakDays(new Set(all.map((x) => x.date)), r.date);
  if (isToday && streak >= 3)
    return { mood: "happy", text: `${streak}日続けて記録してるね！毎日の1杯、いいね` };

  const lines = kindLines(r);
  return { mood: "happy", text: pick(lines.length > 0 && Math.random() < 0.7 ? lines : PLAIN) };
}
