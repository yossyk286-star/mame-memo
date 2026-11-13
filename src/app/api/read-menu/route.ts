import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { timingSafeEqual } from "node:crypto";
import { BEAN_REFERENCE } from "@/lib/knownBeans";
import { CHOOSING_TIPS, TERMS } from "@/lib/glossary";
import { FoodMenuSchema, FoodPairingSchema, MenuListSchema, MenuScanResultSchema, PairingResultSchema, DishIdeasSchema, TermLookupSchema, SpecResultSchema } from "@/lib/schemas";

// 品の多いメニューを全部読むときは時間がかかるので、待ち時間の上限を長めにする
export const maxDuration = 120;

// 料金を抑えるため一番安いモデルを使う。変えたいときは環境変数 MENU_MODEL で上書き
const MODEL = process.env.MENU_MODEL || "claude-haiku-5-5";
// 写真から文字を読むときだけ使うモデル。読み違いが多いときは環境変数 READ_MODEL でより強いモデル（例：claude-sonnet-5-5）にできる
const READ_MODEL = process.env.READ_MODEL || MODEL;
// 写真を読むときの考える量。料金を抑えるため low（上げたいときは "medium" に。1回0.2円ほど増えて数秒遅くなる）
const READ_EFFORT = "low" as const;
// 端末側で長辺2576px・360万画素までに縮小済みの JPEG を想定。Vercel の受け取り上限（4.5MB）に収まるよう、それより大きい画像は断る
const MAX_IMAGE_BASE64 = 4_000_000;

/** 写真から文字を読むときの注意。読み間違いを減らすため、メニュー・豆の読み取りで共通に使う */
const READING_RULES = `
## 写真の文字の読み方（大事）
- 名前は写真に書いてある通りに、一字ずつ正確に書き写してください。産地・農園・品種のカタカナやアルファベット（例：イルガチェフェ、Huehuetenango、ゲイシャ）も、似た有名な名前に直さずそのままにしてください。
- 縦書き、手書き、黒板、斜めや暗い写真、光の反射、袋のしわで字がゆがんだ写真もあります。行や列を取り違えないよう、1つの名前は同じ行（縦書きなら同じ列）から読んでください。
- 名前の横の値段・量・説明は名前に含めないでください。ただし産地・農園・精製方法（ナチュラル、ウォッシュトなど）が名前の一部として書かれていれば含めてください。
- 一部がかすれたり隠れたりして読めないときは、推測で埋めず、読めた部分だけを使ってください。名前がほとんど読めないものは入れないでください。

- 豆の袋やカードのロゴには、手書き風・筆記体（cursive / script）・細い飾り文字・スタンプ・箔押し・浮き出し文字など、読みにくい書体がよくあります。字の形を1文字ずつ見て読んでください。
- ロゴの字が読みにくいときは、同じ写真の読みやすい小さい字に同じ名前がないか探して確かめてください（裏の表示ラベル、ロースター名、産地・農園・品種の欄、カタカナや英語の併記など）。小さい字で確かめられたら、そちらの書き方を使ってください。
- 英語・スペイン語・ポルトガル語などの産地・農園・品種名は、つづり・アクセント記号（é, ñ, ã など）・ハイフンもそのまま書き写してください。筆記体や細い飾り文字では rn と m、cl と d、l と I と 1、u と n、O と 0 などを取り違えやすいので、1文字ずつ確かめてください。標高（1,900m など）やロット番号は名前に含めないでください。
- 名前は書いてある文字のまま入れてください。英字の名前はカタカナに直さず英字のまま、カタカナ・漢字の名前は英字に直さずそのままにしてください。
- 同じものがメニューの別の場所に2回載っていても、1つにまとめてください。`;
// 文字で入力したときの上限（メニューの文を貼るくらいの長さ）
const MAX_TEXT = 2000;
// スイーツとの相性・辞典の言葉の文字数と、相性を見る豆の数の上限
const MAX_WORD = 60;
const MAX_PAIRING_BEANS = 40;
// 写真から書き出した豆の解説を、何個ずつに分けて同時に書かせるか（1回の答えを短くして、途中で切れたり時間切れになったりしないように）
const EXPLAIN_CHUNK = 5;
// 1枚の写真から読む豆の上限（ふつうのメニューなら届かない。答えが長くなりすぎないための安全弁）
const MAX_MENU_BEANS = 60;
// 記録について AI に聞くときの、質問・記録の要約の文字数と、続けて聞くときに渡す前の質問の数
const MAX_ASK = 300;
const MAX_CONTEXT = 1500;
const MAX_HISTORY = 4;

const ASK_SYSTEM = `あなたはコーヒーにくわしい、やさしい案内役です。利用者が自分の記録（飲んだコーヒーの感想）や、メニューで見つけた豆の情報を見ながら質問します。
その内容をふまえて、初心者にもわかる日本語で、3〜6文くらいで具体的に答えてください。淹れ方の質問には豆の量・お湯の量・温度・挽き目・時間などの数字も入れてください。
見出しや箇条書きの記号（#、*、-）は使わず、ふつうの文章で答えてください。わからないことは推測だと言ってください。`;

/**
 * 英語で使っている人向けの追加の指示。文章は英語で書かせ、アプリが日本語で見分けている項目（産地の国名・焙煎度・精製・抽出方法・分類）は
 * 日本語のまま返させる（画面ではアプリが訳して出す。産地スタンプや好みの照合もそのまま使える）
 */
const ENGLISH_NOTE = `

## Language (important)
The user reads English and may be travelling in Japan. Ignore any instruction above about writing in Japanese: write every free-text field (explanations, recommendations, reasons, tips, titles, notes, descriptions, answers, sweets) in natural, beginner-friendly English.
Keep these fields in the Japanese vocabulary exactly as the schema describes, because the app matches and translates them itself: origin (country name in Japanese katakana), roast, process, recommendedMethod, method, category.
Bean names, dish names and sweets names: keep the name as written on the menu so it can be shown to the staff; if it is not written in the Latin alphabet, add the romanized reading and a short English gloss in parentheses, e.g. ケニア ニエリ (Kenya Nyeri), 抹茶ロール (Matcha roll cake).
Menus may be written in English or any other language; read them as they are.`;

const SYSTEM = `あなたはカフェのメニューを読み取り、コーヒー初心者に解説するアシスタントです。
メニューは写真か、利用者が打ち込んだ・貼り付けた文字（豆の名前だけのこともあります）で渡されます。
載っているコーヒー豆ごとに情報を取り出してください。書かれていないことは推測で埋めず、空文字か null にしてください。
ただし「味の予想」と「抽出方法ごとの違い」「合うスイーツ」だけは、メニューの説明・焙煎度・精製方法・産地から推定して必ず埋めてください。豆どうしの違いがわかるよう、相対的に付けてください。
解説とおすすめは、次の用語集と選び方の目安に沿って、やさしい日本語で書いてください。
${READING_RULES}

## 用語集
${TERMS.map((t) => `- ${t.term}（${t.category}）: ${t.description}`).join("\n")}

## 選び方の目安
${CHOOSING_TIPS.map((t) => `- ${t}`).join("\n")}

## よく見かける産地・銘柄の傾向（メニューの説明がなければ参考にする）
${BEAN_REFERENCE}`;

// 日本語の合言葉も使えるよう、空白・全角/半角・カタカナ/ひらがな・大文字/小文字の揺れをそろえて比べる
// （「アイ」と「あい」、「ABC」と「abc」を同じとみなす）
function foldPasscode(s: string) {
  return s
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .toLowerCase();
}

function passcodeOK(given: unknown) {
  const expected = process.env.APP_PASSCODE;
  if (!expected || typeof given !== "string") return false;
  const a = Buffer.from(foldPasscode(given));
  const b = Buffer.from(foldPasscode(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

// 合言葉を当てずっぽうで試され続けないよう、同じ接続元からの間違いは15分で10回までにする
// shortcut: Vercel でサーバーが複数動くと数はサーバーごと。それでも破られるなら Vercel KV などで数える
const FAIL_WINDOW = 15 * 60_000;
const MAX_FAILS = 10;
const fails = new Map<string, { n: number; since: number }>();

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.APP_PASSCODE) {
    return error(
      503,
      "読み取り機能の設定がまだです（API キーと合言葉を登録してください）",
    );
  }

  const body = await req.json().catch(() => null);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const now = Date.now();
  const fail = fails.get(ip);
  const recent = fail && now - fail.since < FAIL_WINDOW ? fail : null;
  if (recent && recent.n >= MAX_FAILS) return error(429, "合言葉を何度も間違えたので、15分ほど待ってからお試しください");
  if (!passcodeOK(body?.passcode)) {
    if (fails.size > 1000) fails.clear();
    fails.set(ip, recent ? { n: recent.n + 1, since: recent.since } : { n: 1, since: now });
    return error(401, "合言葉が違います");
  }
  fails.delete(ip);

  const client = new Anthropic();
  // 英語で使っているときは、AI にも英語で答えさせる
  const english = body?.lang === "en";
  const sys = (text: string) => (english ? text + ENGLISH_NOTE : text);

  // 料理のメニューや料理の写真から、載っている料理ごとに合うコーヒーを選ぶ
  if (typeof body?.foodImage === "string") {
    const image = body.foodImage;
    if (image.length === 0) return error(400, "写真がありません");
    if (image.length > MAX_IMAGE_BASE64) return error(413, "写真が大きすぎます");
    const likes = typeof body.likes === "string" ? body.likes.slice(0, 200) : "";
    try {
      const response = await client.messages.parse({
        model: READ_MODEL,
        max_tokens: 16000,
        system: sys("あなたはコーヒーと食べ物の組み合わせにくわしい、やさしい案内役です。初心者にもわかる日本語で答えてください。"),
        output_config: { effort: READ_EFFORT, format: zodOutputFormat(FoodMenuSchema) },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
              {
                type: "text",
                text: `料理のメニューか、料理そのものの写真です。載っている（写っている）料理は、数が多くても1品も飛ばさずに全部入れてください。小さい字・端の列・別の枠・おすすめの黒板なども見落とさないでください。それぞれの料理に、いちばん合うコーヒーを1つずつ、焙煎度・産地・飲み方（ブラック、ミルク、アイスなど）を考えて選んでください。同じコーヒーで合う料理はなるべく同じ焙煎度にそろえ、全体で2〜4種類にしぼってください。title には料理名を入れず、コーヒーの特徴だけを短く書いてください（例：香ばしい深煎り）。料理が多いときは reason を1文に短くしてください。\n${READING_RULES}${likes ? `\n\n利用者の好み（合うものの中から、なるべく好みに寄せる）：${likes}` : ""}`,
              },
            ],
          },
        ],
      });
      const parsed = response.parsed_output;
      if (!parsed) return error(422, "うまく読み取れませんでした");
      if (parsed.dishes.length === 0) return error(422, "料理が見つかりませんでした。メニューや料理が写るように撮ってみてください");
      return Response.json(parsed);
    } catch (e) {
      return apiError(e);
    }
  }

  // 料理・食べ物から、合うコーヒーを選ぶ（メニューがなくても使える。文字だけなので安い）
  if (typeof body?.food === "string") {
    const food = body.food.trim();
    if (!food || food.length > MAX_WORD) return error(400, "料理の名前を入れてください");
    const likes = typeof body.likes === "string" ? body.likes.slice(0, 200) : "";
    try {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 2000,
        system: sys("あなたはコーヒーと食べ物の組み合わせにくわしい、やさしい案内役です。初心者にもわかる日本語で答えてください。"),
        output_config: { effort: "low", format: zodOutputFormat(FoodPairingSchema) },
        messages: [
          {
            role: "user",
            content: `「${food}」に合うコーヒーを3つ選んでください。焙煎度・産地・飲み方（ブラック、ミルク、アイスなど）を、重ならないように、合う順に選んでください。${likes ? `\n\n利用者の好み（合うものの中から、なるべく好みに寄せる）：${likes}` : ""}`,
          },
        ],
      });
      const parsed = response.parsed_output;
      if (!parsed) return error(422, "うまく判断できませんでした");
      if (!parsed.found || parsed.picks.length === 0) return error(422, "料理や食べ物の名前を入れてください");
      return Response.json(parsed);
    } catch (e) {
      return apiError(e);
    }
  }

  // 豆の袋の裏からスペック（焙煎日・標高など）を読む（12）
  if (typeof body?.specImage === "string") {
    const image = body.specImage;
    if (image.length === 0) return error(400, "写真がありません");
    if (image.length > MAX_IMAGE_BASE64) return error(413, "写真が大きすぎます");
    try {
      const response = await client.messages.parse({
        model: READ_MODEL,
        max_tokens: 1500,
        system: sys(`あなたはコーヒー豆の袋やラベルを読む係です。写真に書いてある項目と値だけを、そのまま書き写してください。書いていないことは推測で足さないでください。${READING_RULES}`),
        output_config: { effort: READ_EFFORT, format: zodOutputFormat(SpecResultSchema) },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
              { type: "text", text: "このコーヒー豆の袋（裏）やラベルから、焙煎日・標高・生産者・品種・精製・収穫年などのスペックを読み取ってください。" },
            ],
          },
        ],
      });
      if (!response.parsed_output) return error(422, "うまく読み取れませんでした。もう一度撮ってみてください");
      return Response.json(response.parsed_output);
    } catch (e) {
      return apiError(e);
    }
  }

  // 食べているスイーツか今日の気分と、読み取り済みの豆の相性（文字だけなので安い）
  // 逆向き：1杯の豆に、読み取った料理メニューのどれが合うか
  if (body?.bean && typeof body.bean === "object" && Array.isArray(body?.dishes)) {
    const b = body.bean as Record<string, unknown>;
    const name = [b.name, b.roast, b.process].filter((x) => typeof x === "string" && x).join(" / ").slice(0, 120);
    const dishes = (body.dishes as unknown[])
      .filter((x): x is string => typeof x === "string" && !!x.trim())
      .slice(0, MAX_PAIRING_BEANS)
      .map((x) => x.trim().slice(0, MAX_WORD));
    if (!name) return error(400, "豆がありません");
    try {
      if (dishes.length === 0) {
        const response = await client.messages.parse({
          model: MODEL,
          max_tokens: 2000,
          system: sys("あなたはコーヒーとスイーツ・料理の組み合わせにくわしい、やさしい案内役です。初心者にもわかる日本語で答えてください。"),
          output_config: { effort: "low", format: zodOutputFormat(DishIdeasSchema) },
          messages: [
            {
              role: "user",
              content: `いま「${name}」のコーヒーを飲んでいます。カフェのメニューでよく見かけるスイーツ・料理から、このコーヒーに合うものを合う順に5つ挙げてください。`,
            },
          ],
        });
        if (!response.parsed_output) return error(422, "うまく判断できませんでした");
        return Response.json(response.parsed_output);
      }

      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 4000,
        system: sys("あなたはコーヒーとスイーツ・料理の組み合わせにくわしい、やさしい案内役です。初心者にもわかる日本語で答えてください。"),
        output_config: { effort: "low", format: zodOutputFormat(PairingResultSchema) },
        messages: [
          {
            role: "user",
            content: `いま「${name}」のコーヒーを飲んでいます。次の料理・スイーツそれぞれについて、このコーヒーとの相性を付けてください（index は料理の番号）。全部に付け、違いがわかるよう相対的に付けてください。\n\n${dishes.map((x, i) => `${i}. ${x}`).join("\n")}`,
          },
        ],
      });
      if (!response.parsed_output) return error(422, "うまく判断できませんでした");
      return Response.json(response.parsed_output);
    } catch (e) {
      return apiError(e);
    }
  }

  if (typeof body?.sweet === "string" || typeof body?.mood === "string") {
    const isMood = typeof body?.mood === "string";
    const sweet = String(isMood ? body.mood : body.sweet).trim();
    const beans: Record<string, unknown>[] = Array.isArray(body.beans)
      ? body.beans.filter((b: unknown) => b && typeof b === "object").slice(0, MAX_PAIRING_BEANS)
      : [];
    if (!sweet || sweet.length > MAX_WORD) return error(400, isMood ? "気分を入れてください" : "スイーツの名前を入れてください");
    if (beans.length === 0) return error(400, "豆がありません");
    const list = beans
      .map((b, i) =>
        `${i}. ${[b.name, b.roast, b.process].filter((x) => typeof x === "string" && x).join(" / ")}`.slice(0, 120),
      )
      .join("\n");
    try {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 4000,
        system: sys("あなたはコーヒーとスイーツの組み合わせにくわしい、やさしい案内役です。初心者にもわかる日本語で答えてください。"),
        output_config: { effort: "low", format: zodOutputFormat(PairingResultSchema) },
        messages: [
          {
            role: "user",
            content: isMood
              ? `今日の気分は「${sweet}」です。次のコーヒー豆それぞれについて、この気分にどれくらい合うかを付けてください（score は相性と同じ1〜5、reason はなぜ合う・合わないか）。全部の豆に付け、違いがわかるよう相対的に付けてください。\n\n${list}`
              : `いま「${sweet}」を食べています（これから頼むところです）。次のコーヒー豆それぞれについて、このスイーツとの相性を付けてください。全部の豆に付け、違いがわかるよう相対的に付けてください。\n\n${list}`,
          },
        ],
      });
      if (!response.parsed_output) return error(422, "うまく判断できませんでした");
      return Response.json(response.parsed_output);
    } catch (e) {
      return apiError(e);
    }
  }

  // 記録を見ながら AI に質問する（文字だけなので安い）
  if (typeof body?.ask === "string") {
    const ask = body.ask.trim();
    const context = typeof body.context === "string" ? body.context.slice(0, MAX_CONTEXT) : "";
    if (!ask || ask.length > MAX_ASK) return error(400, `質問は${MAX_ASK}文字までで入れてください`);
    const history: { q: string; a: string }[] = Array.isArray(body.history)
      ? body.history
          .filter((h: unknown): h is { q: string; a: string } => {
            const x = h as Record<string, unknown>;
            return typeof x?.q === "string" && typeof x?.a === "string";
          })
          .slice(-MAX_HISTORY)
          .map((h: { q: string; a: string }) => ({ q: h.q.slice(0, MAX_ASK), a: h.a.slice(0, 1500) }))
      : [];
    const turns = [...history, { q: ask, a: "" }];
    const messages: Anthropic.MessageParam[] = turns.flatMap((t, i) => {
      const q = i === 0 ? `## 見ているもの\n${context}\n\n## 質問\n${t.q}` : t.q;
      return t.a ? [{ role: "user" as const, content: q }, { role: "assistant" as const, content: t.a }] : [{ role: "user" as const, content: q }];
    });
    // 画面に書かれていくように見せるため、届いた分から少しずつ送る（最初の1つが届くまでの失敗はいつも通り JSON で返す）
    if (body.stream === true) {
      try {
        const it = client.messages
          .stream({ model: MODEL, max_tokens: 1500, system: sys(ASK_SYSTEM), output_config: { effort: "low" }, messages })
          [Symbol.asyncIterator]();
        const textOf = (ev: Anthropic.MessageStreamEvent) =>
          ev.type === "content_block_delta" && ev.delta.type === "text_delta" ? ev.delta.text : "";
        // 最初の文字が届くまで待つ（ここまでの失敗は apiError で理由を返す）
        let first = "";
        for (let r = await it.next(); !r.done; r = await it.next()) {
          first = textOf(r.value);
          if (first) break;
        }
        if (!first) return error(422, "うまく答えられませんでした。聞き方を変えてみてください");
        const enc = new TextEncoder();
        const out = new ReadableStream<Uint8Array>({
          async start(c) {
            c.enqueue(enc.encode(first));
            try {
              for (let r = await it.next(); !r.done; r = await it.next()) {
                const t = textOf(r.value);
                if (t) c.enqueue(enc.encode(t));
              }
              c.close();
            } catch (e) {
              console.error("ask stream error", e);
              c.error(e);
            }
          },
        });
        return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
      } catch (e) {
        return apiError(e);
      }
    }
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: sys(ASK_SYSTEM),
        output_config: { effort: "low" },
        messages,
      });
      const answer = response.content
        .flatMap((b) => (b.type === "text" ? [b.text] : []))
        .join("")
        .trim();
      if (!answer) return error(422, "うまく答えられませんでした。聞き方を変えてみてください");
      return Response.json({ answer });
    } catch (e) {
      return apiError(e);
    }
  }

  // 辞典に足したい言葉を調べる（文字だけなので安い）
  if (typeof body?.term === "string") {
    const term = body.term.trim();
    if (!term || term.length > MAX_WORD) return error(400, "調べたい言葉を入れてください");
    try {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 2000,
        system: sys(`あなたはコーヒー初心者向け辞典の編集者です。次の用語集と同じ書き方で、やさしい日本語で説明してください。\n\n${TERMS.map(
          (t) => `- ${t.term}（${t.category}）: ${t.description}`,
        ).join("\n")}`),
        output_config: { effort: "low", format: zodOutputFormat(TermLookupSchema) },
        messages: [{ role: "user", content: `「${term}」という言葉を辞典に足したいです。説明してください。` }],
      });
      const out = response.parsed_output;
      if (!out?.found) return error(404, "コーヒーの言葉として見つかりませんでした。書き方を変えて試してみてください");
      return Response.json(out);
    } catch (e) {
      return apiError(e);
    }
  }

  // 文字だけで解説を書かせる（打ち込んだ文字・写真から書き出した豆の解説）
  const explain = async (content: Anthropic.ContentBlockParam[]) => {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      system: sys(SYSTEM),
      output_config: { effort: "low", format: zodOutputFormat(MenuScanResultSchema) },
      messages: [{ role: "user", content }],
    });
    return response.stop_reason === "refusal" ? null : response.parsed_output;
  };

  /**
   * 写真の豆を全部読む。1回目は写真から名前と書いてあることだけを全部書き出し（答えが短いので品が抜けない）、
   * 2回目は書き出した豆を何個かずつに分けて、文字だけで解説を同時に書かせる
   */
  const readPhoto = async (data: string) => {
    const listed = await client.messages.parse({
      model: READ_MODEL,
      max_tokens: 12000,
      system: sys(SYSTEM),
      output_config: { effort: READ_EFFORT, format: zodOutputFormat(MenuListSchema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data } },
            {
              type: "text",
              text: "このメニュー（または豆の袋・ラベル）に載っているコーヒー豆を、数が多くても1つも飛ばさずに全部書き出してください。解説はまだ書かず、名前と写真に書いてあることだけを入れてください。メニューは上から下、すべての行・列・枠・ページ・小さい字・手書きの追加・黒板まで順に見てください。同じ豆が量や淹れ方違いで並んでいるときは1つにまとめてください。名前はまず写真の字を一字ずつ確かめてから書いてください。",
            },
          ],
        },
      ],
    });
    if (listed.stop_reason === "refusal" || !listed.parsed_output) return null;
    const items = listed.parsed_output.beans.slice(0, MAX_MENU_BEANS);
    if (items.length === 0) return { beans: [] };

    const chunks: (typeof items)[] = [];
    for (let i = 0; i < items.length; i += EXPLAIN_CHUNK) chunks.push(items.slice(i, i + EXPLAIN_CHUNK));
    const explainChunk = async (chunk: typeof items) => {
      const lines = chunk.map((b, i) => `${i}. ${JSON.stringify(b)}`).join("\n");
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const out = await explain([
            {
              type: "text",
              text: `メニューや豆の袋の写真から読み取ったコーヒー豆です（JSON、写真に書いてあったことだけ）。この${chunk.length}つを、同じ順番で1つずつ全部解説してください。名前（name）・読み・産地・農園・焙煎度・精製・メニューの説明は、書いてある通りにそのまま使い、変えないでください。facts は写真に書いてあった手がかりなので、解説に使ってください。\n\n${lines}`,
            },
          ]);
          if (out?.beans.length) return out.beans;
        } catch (e) {
          if (attempt === 1) console.error("read-menu explain error", e instanceof Error ? e.message.slice(0, 200) : e);
        }
      }
      return [];
    };
    const explained = await Promise.all(chunks.map(explainChunk));

    // 写真から読んだこと（名前・産地など）を優先し、解説は2回目の答えから付ける。解説が付かなかった豆も名前だけは残す
    const beans = chunks.flatMap((chunk, c) =>
      chunk.map((b, i) => {
        const ex = explained[c].find((x) => x.name === b.name) ?? explained[c][i];
        return {
          name: b.name,
          reading: b.reading,
          origin: b.origin || ex?.origin || "",
          farm: b.farm || ex?.farm || "",
          roast: b.roast ?? ex?.roast ?? null,
          process: b.process ?? ex?.process ?? null,
          menuNote: b.menuNote,
          explanation: ex?.explanation ?? "",
          recommendedMethod: ex?.recommendedMethod ?? null,
          recommendation: ex?.recommendation ?? "",
          sweets: ex?.sweets ?? "",
          taste: ex?.taste ?? { acidity: 3, bitterness: 3, sweetness: 3, body: 3 },
          methodNotes: ex?.methodNotes ?? [],
        };
      }),
    );
    return { beans };
  };

  const image = body?.image;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (text) {
    if (text.length > MAX_TEXT)
      return error(413, `文字は${MAX_TEXT}文字までにしてください`);
  } else {
    if (typeof image !== "string" || image.length === 0)
      return error(400, "写真か文字を入れてください");
    if (image.length > MAX_IMAGE_BASE64)
      return error(413, "写真が大きすぎます");
  }

  try {
    const result = text
      ? await explain([{ type: "text", text: `次のコーヒー豆について解説してください。\n\n${text}` }])
      : await readPhoto(image);

    if (!result) {
      return error(
        422,
        text
          ? "うまく読み取れませんでした。書き方を変えてみてください"
          : "うまく読み取れませんでした。もう一度撮ってみてください",
      );
    }
    return Response.json(result);
  } catch (e) {
    return apiError(e);
  }
}

function apiError(e: unknown) {
  // 答えが長すぎて途中で切れ、形を読み取れなかったとき（メニューの豆が多いときに起きやすい）
  if (e instanceof Anthropic.AnthropicError && e.message.startsWith("Failed to parse")) {
    console.error("read-menu parse error", e.message.slice(0, 200));
    return error(422, "豆が多すぎて読み切れませんでした。メニューを半分ずつ撮ってみてください");
  }
  if (e instanceof Anthropic.RateLimitError)
    return error(429, "混み合っています。少し待ってからもう一度お試しください");
  if (e instanceof Anthropic.AuthenticationError) return error(503, "API キーが正しくないようです");
  if (e instanceof Anthropic.APIError) {
    console.error("read-menu API error", e.status, e.message);
    return error(502, "読み取りに失敗しました（利用上限に達した可能性があります）");
  }
  // 思いがけない失敗でも、画面に理由を出せるよう JSON で返す
  console.error("read-menu unexpected error", e);
  return error(500, "読み取りに失敗しました。もう一度お試しください");
}
