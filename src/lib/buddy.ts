import { countryOf } from "./countries";
import type { TastingRecord } from "./types";
import { tr } from "./i18n";
import { caffeineMg } from "./dayTotal";
import { loadFeatures } from "./features";

/**
 * 相棒（ちっちゃいコーヒー豆）が言うひとこと。記録を保存したとき・アプリを開いたときなど。
 * AI は使わず、記録の中身と今までの記録から決まった言葉を選ぶ
 */
export type BuddyMood = "happy" | "normal" | "wow" | "worried" | "sad";
/** action があれば吹き出しにリンクを出す（例：1年前の記録を見る） */
export type BuddyLine = { text: string; mood: BuddyMood; action?: { label: string; href: string } };

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

export const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

export function localDate(d: Date) {
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
  if (r.temp === "アイス")
    return [
      "アイスコーヒー、氷がカランっていう音が好き",
      "冷やすと甘さが感じやすくなるんだって",
      "氷が溶けると味も変わるね。最後までおいしかった？",
    ];
  if (r.method === "エスプレッソ")
    return ["エスプレッソ！ぎゅっと濃いね", "クレマ、きれいだった？", "砂糖を入れて飲むのもイタリア流なんだって"];
  if (r.style === "ミルク")
    return ["ミルクと合わせるとまろやかになるね", "ラテアート、あったかな？", "深めの豆はミルクとよく合うんだって"];
  if (r.method === "フレンチプレス") return ["フレンチプレスはコーヒーの油分まで楽しめるね", "とろっとした口当たり、いいよね"];
  if (r.method === "サイフォン") return ["サイフォン、ぽこぽこ上がるの見てて楽しいよね", "サイフォンはすっきりクリアな味になるんだって"];
  if (r.method === "エアロプレス") return ["エアロプレス、ぎゅーっと押すの楽しいよね", "エアロプレスは短い時間でしっかり出るんだって"];
  switch (r.roast) {
    case "浅煎り":
      return [
        "浅煎りは果物みたいな酸味が楽しいよね",
        "ぼくより明るい色の豆だね",
        "浅煎りは冷めてくると甘さが出てくるよ",
      ];
    case "中煎り":
      return ["中煎りはバランスがいいよね", "酸味と苦味、どっちが強かった？", "中煎りはナッツやチョコっぽさが出やすいんだって"];
    case "深煎り":
      return ["深煎りのほろ苦さ、落ち着くね", "ぼくもこんがり焼かれたい…", "深煎りはチョコやお菓子と合わせてもおいしいよ"];
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
  "今日の1杯、ちゃんと覚えたよ",
  "メモが増えるたび、ぼくもうれしいよ",
  "次はどんな豆に会えるかな",
  "コーヒーの香りっていいよね",
  "豆の話、また聞かせてね",
];

/** 季節・時間・曜日で混ぜるひとこと */
function seasonLines(now: Date): string[] {
  const m = now.getMonth() + 1;
  const h = now.getHours();
  const out: string[] = [];
  if (m >= 6 && m <= 8) out.push("暑い日はアイスコーヒーもいいね");
  else if (m === 12 || m <= 2) out.push("寒い日のあったかいコーヒー、しみるね");
  else if (m === 3 || m === 4) out.push("春だね。外でコーヒーもいいよね");
  else out.push("秋はコーヒーがいっそうおいしく感じるね");
  if (h >= 5 && h < 11) out.push("朝の1杯、目が覚めるね");
  else if (h >= 14 && h < 17) out.push("午後のコーヒータイム、いいね");
  if (now.getDay() === 0 || now.getDay() === 6) out.push("週末はゆっくり淹れられるね");
  return out;
}

/** 同じ豆かどうかを見る名前。農園があれば農園、なければ産地 */
function beanName(r: TastingRecord) {
  return r.farm.trim() || r.origin.trim();
}

/**
 * 保存した記録へのひとこと。all はこの記録も含めたすべての記録
 * カフェインのとりすぎが心配な日は、ほかより先に心配する
 */
export function buddyLine(
  r: TastingRecord,
  all: TastingRecord[],
  opts: { fromWish?: boolean } = {},
  now = new Date(),
): BuddyLine {
  const others = all.filter((x) => x.id !== r.id);
  const isToday = r.date === localDate(now);
  const sameDay = all.filter((x) => x.date === r.date).length;
  const hour = now.getHours();
  // とりすぎの目安は設定の「1日のカフェイン量」（38）。超えたら心配、1.5倍でもっと心配
  const grams = all.filter((x) => x.date === r.date).reduce((g, x) => g + caffeineMg(x), 0);
  const limit = loadFeatures().limit;

  if (isToday && sameDay >= 2 && grams >= limit * 1.5)
    return {
      mood: "worried",
      text: pick([
        tr("今日はもう{0}杯目だよ…！カフェインとりすぎかも。お水にしよう？", sameDay),
        tr("{0}杯目…ぼく心配だよ。胃がびっくりしないように、何か食べてね", sameDay),
        tr("{0}杯目！今日のコーヒーはここまでにしよう？", sameDay),
        tr("ちょっと待って、{0}杯目だよ。ドキドキしてない？", sameDay),
      ]),
    };
  if (isToday && sameDay >= 2 && grams >= limit)
    return {
      mood: "worried",
      text: pick([
        tr("{0}杯目だね。ちょっと多めかも。お水もはさもう", sameDay),
        tr("おいしいね。でも{0}杯目だから、次はデカフェもいいかも", sameDay),
        tr("{0}杯目。夜に眠れるように、このへんにしておこうか", sameDay),
      ]),
    };

  if (others.length === 0)
    return {
      mood: "wow",
      text: pick([
        "はじめての記録だね！これからいっしょに飲んだコーヒーを覚えていくよ",
        "記録ありがとう！今日からぼくが相棒だよ。よろしくね",
        "1杯目の記録だね！好きな味、いっしょに見つけていこう",
      ]),
    };

  if (MILESTONES.includes(all.length))
    return {
      mood: "wow",
      text: pick([
        tr("{0}杯目の記録、おめでとう！ここまで続けてえらいなあ", all.length),
        tr("{0}杯！すごい、ちょっとした記録係だね", all.length),
        tr("記念の{0}杯目！好みの地図がだいぶ描けてきたよ", all.length),
      ]),
    };

  const country = countryOf(r);
  const newCountry = !!country && !others.some((x) => countryOf(x) === country);
  if (opts.fromWish)
    return {
      mood: "wow",
      text: newCountry
        ? pick([
            tr("ついに飲めたね！{0}のスタンプも押しといたよ", country),
            tr("気になってた豆、ついに！{0}のスタンプも増えたよ", country),
          ])
        : pick(["ついに飲めたね！気になるリストから外しておいたよ", "念願の1杯だね！気になるリストから外しといたよ"]),
    };

  if (newCountry)
    return {
      mood: "wow",
      text: pick([
        tr("{0}、はじめまして！スタンプ押しといたよ", country),
        tr("{0}の豆ははじめてだね！スタンプ帳がにぎやかになってきた", country),
        tr("{0}に行った気分だね。スタンプ、ぽん！", country),
      ]),
    };

  if (r.method && r.method !== "その他" && !others.some((x) => x.method === r.method))
    return {
      mood: "wow",
      text: pick([
        tr("はじめての{0}！新しい扉だね", r.method),
        tr("{0}デビューだね！どうだった？", r.method),
        tr("{0}ははじめて！好みの幅が広がるね", r.method),
      ]),
    };

  const name = beanName(r);
  const before = name ? others.filter((x) => beanName(x) === name) : [];
  if (before.length > 0) {
    const prev = before.reduce((a, b) => (a.date >= b.date ? a : b));
    const n = before.length + 1;
    if (r.overall > prev.overall)
      return {
        mood: "happy",
        text: pick([
          tr("{0}は{1}回目。前より好きになったみたいだね", name, n),
          tr("{0}、{1}回目でもっと好きに。相性がいいのかも", name, n),
        ]),
      };
    if (r.overall < prev.overall)
      return {
        mood: "normal",
        text: pick([
          tr("{0}は{1}回目。前のほうが好みだったかな？淹れ方のちがいかも", name, n),
          tr("{0}は{1}回目。今日はいまいち？豆の鮮度や挽き方でも変わるよね", name, n),
        ]),
      };
    return {
      mood: "happy",
      text: pick([tr("{0}は{1}回目だね。すっかりお気に入り？", name, n), tr("{0}、{1}回目！もう常連さんだね", name, n)]),
    };
  }

  if (r.overall === 5)
    return {
      mood: "happy",
      text: pick([
        "★5！ぼくまでうれしくなっちゃう",
        "最高の1杯だったんだね！豆の名前を覚えておこう",
        "★5いただきました！また会えるといいね",
        "★5、出ました！どのお店の豆かも覚えておこうね",
        "この1杯に会えてよかったね",
      ]),
    };
  if (r.overall <= 2)
    return {
      mood: "sad",
      text: pick([
        "合わなかったかあ。苦手がわかるのも大事な記録だよ",
        "残念だったね。次はきっと好きな1杯に会えるよ",
        "うーん、今日はハズレだったかな。それも思い出だよ",
        "淹れ方を変えると、ぐっと好みになることもあるよ",
      ]),
    };

  if (isToday && sameDay === 3)
    return { mood: "normal", text: pick(["今日3杯目だね。お水もいっしょに飲もうね", "今日3杯目だね。コーヒーずきだなあ"]) };

  if (isToday && hour >= 20)
    return {
      mood: "normal",
      text: pick(["夜のコーヒー、眠れなくならないかな？", "夜はデカフェもいいかも。ぐっすり眠ってね"]),
    };

  const streak = streakDays(new Set(all.map((x) => x.date)), r.date);
  if (isToday && streak >= 3)
    return {
      mood: "happy",
      text: pick([
        tr("{0}日続けて記録してるね！毎日の1杯、いいね", streak),
        tr("{0}日連続！コーヒーのある毎日っていいね", streak),
      ]),
    };

  const lines = kindLines(r);
  return {
    mood: "happy",
    text: pick(lines.length > 0 && Math.random() < 0.6 ? lines : [...PLAIN, ...(isToday ? seasonLines(now) : [])]),
  };
}

/** 開いたときのひとことを、どれをいつ出したか覚えておく */
const SEEN_KEY = "mame-memo:buddy-seen";
type Seen = { lastOpen?: string; yearAgo?: string; weekend?: string; monday?: string };

function loadSeen(): Seen {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}");
  } catch {
    return {};
  }
}

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);

/**
 * アプリを開いたときのひとこと。出すぎないよう、どれも間をあけて1回だけ
 * - 1年前の今日に記録があれば（1日1回）
 * - 2週間以上あいて開いたら「おかえり」
 * - 土日の朝（週に1回）
 * - 月曜の朝（週に1回）
 */
export function openLine(records: TastingRecord[], now = new Date()): BuddyLine | null {
  const today = localDate(now);
  const seen = loadSeen();
  const next: Seen = { ...seen, lastOpen: today };
  let line: BuddyLine | null = null;

  const ago = new Date(now);
  ago.setFullYear(ago.getFullYear() - 1);
  const yearAgo = records.filter((r) => r.date === localDate(ago));
  const gap = seen.lastOpen ? daysBetween(seen.lastOpen, today) : 0;
  const morning = now.getHours() >= 7 && now.getHours() < 12;

  if (yearAgo.length > 0 && seen.yearAgo !== today) {
    const best = yearAgo.reduce((a, b) => (b.overall > a.overall ? b : a));
    line = {
      mood: "wow",
      text: tr("1年前の今日は「{0}」を飲んでたよ{1}", beanName(best) || "コーヒー", yearAgo.length > 1 ? tr("（ほか{0}杯）", yearAgo.length - 1) : ""),
      action: { label: "見る", href: `/record?id=${best.id}` },
    };
    next.yearAgo = today;
  } else if (gap >= 14) {
    line = {
      mood: "happy",
      text: pick([
        tr("おかえり！{0}日ぶりだね。また一緒に記録しよう", gap),
        tr("ひさしぶり！{0}日ぶりだね。会いたかったよ", gap),
        tr("{0}日ぶり！その間に飲んだコーヒー、思い出したら書いてね", gap),
      ]),
    };
  } else if (
    (now.getDay() === 0 || now.getDay() === 6) &&
    morning &&
    (!seen.weekend || daysBetween(seen.weekend, today) >= 6)
  ) {
    line = {
      mood: "happy",
      text: pick(["週末の朝だね。今日はどの豆にする？", "おはよう！週末はゆっくりハンドドリップでも？", "週末の朝、カフェめぐりもいいね"]),
      action: { label: "調べる", href: "/scan" },
    };
    next.weekend = today;
  } else if (now.getDay() === 1 && morning && (!seen.monday || daysBetween(seen.monday, today) >= 6)) {
    line = { mood: "happy", text: pick(["月曜の朝だね。おいしい1杯で今週もがんばろう", "おはよう！今週の1杯目は何にする？"]) };
    next.monday = today;
  }
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(next));
  } catch {}
  return line;
}
