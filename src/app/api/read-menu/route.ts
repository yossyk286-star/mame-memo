import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { timingSafeEqual } from "node:crypto";
import { BEAN_REFERENCE } from "@/lib/knownBeans";
import { CHOOSING_TIPS, TERMS } from "@/lib/glossary";
import { FoodMenuSchema, FoodPairingSchema } from "@/lib/foodPairing";
import { MenuScanResultSchema, PairingResultSchema, DishIdeasSchema, TermLookupSchema } from "@/lib/menuScan";

// 料金を抑えるため一番安いモデルを使う。変えたいときは環境変数 MENU_MODEL で上書き
const MODEL = process.env.MENU_MODEL || "claude-haiku-5-5";
// 端末側で縮小済みの JPEG を想定。大きすぎる画像は課金がかさむので断る
const MAX_IMAGE_BASE64 = 1_500_000;
// 文字で入力したときの上限（メニューの文を貼るくらいの長さ）
const MAX_TEXT = 2000;
// スイーツとの相性・辞典の言葉の文字数と、相性を見る豆の数の上限
const MAX_WORD = 60;
const MAX_PAIRING_BEANS = 40;
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
  if (!passcodeOK(body?.passcode)) return error(401, "合言葉が違います");

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
        model: MODEL,
        max_tokens: 6000,
        system: sys("あなたはコーヒーと食べ物の組み合わせにくわしい、やさしい案内役です。初心者にもわかる日本語で答えてください。"),
        output_config: { effort: "low", format: zodOutputFormat(FoodMenuSchema) },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
              {
                type: "text",
                text: `料理のメニューか、料理そのものの写真です。載っている（写っている）料理それぞれに、いちばん合うコーヒーを1つずつ、焙煎度・産地・飲み方（ブラック、ミルク、アイスなど）を考えて選んでください。同じコーヒーで合う料理はなるべく同じ焙煎度にそろえ、全体で2〜4種類にしぼってください。title には料理名を入れず、コーヒーの特徴だけを短く書いてください（例：香ばしい深煎り）。${likes ? `\n\n利用者の好み（合うものの中から、なるべく好みに寄せる）：${likes}` : ""}`,
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
    const beans = Array.isArray(body.beans) ? body.beans.slice(0, MAX_PAIRING_BEANS) : [];
    if (!sweet || sweet.length > MAX_WORD) return error(400, isMood ? "気分を入れてください" : "スイーツの名前を入れてください");
    if (beans.length === 0) return error(400, "豆がありません");
    const list = beans
      .map((b: Record<string, unknown>, i: number) =>
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

  const image = body?.image;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  let content: Anthropic.ContentBlockParam[];
  if (text) {
    if (text.length > MAX_TEXT)
      return error(413, `文字は${MAX_TEXT}文字までにしてください`);
    content = [
      {
        type: "text",
        text: `次のコーヒー豆について解説してください。\n\n${text}`,
      },
    ];
  } else {
    if (typeof image !== "string" || image.length === 0)
      return error(400, "写真か文字を入れてください");
    if (image.length > MAX_IMAGE_BASE64)
      return error(413, "写真が大きすぎます");
    content = [
      {
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: image },
      },
      {
        type: "text",
        text: "このメニューのコーヒー豆を読み取って解説してください。",
      },
    ];
  }

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      system: sys(SYSTEM),
      output_config: {
        effort: "low",
        format: zodOutputFormat(MenuScanResultSchema),
      },
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return error(
        422,
        text
          ? "うまく読み取れませんでした。書き方を変えてみてください"
          : "うまく読み取れませんでした。もう一度撮ってみてください",
      );
    }
    return Response.json(response.parsed_output);
  } catch (e) {
    return apiError(e);
  }
}

function apiError(e: unknown) {
  if (e instanceof Anthropic.RateLimitError)
    return error(429, "混み合っています。少し待ってからもう一度お試しください");
  if (e instanceof Anthropic.AuthenticationError) return error(503, "API キーが正しくないようです");
  if (e instanceof Anthropic.APIError) {
    console.error("read-menu API error", e.status, e.message);
    return error(502, "読み取りに失敗しました（利用上限に達した可能性があります）");
  }
  throw e;
}
