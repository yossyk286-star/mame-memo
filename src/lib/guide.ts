import { getLang } from "./i18n";

/** 案内の文。ja / en をそのまま持つ（文が長いので en.json には入れない） */
export type Text = { ja: string; en: string };

export const t = (x: Text) => (getLang() === "en" ? x.en : x.ja);

/** 初めて開いたときのあいさつ。このあと画面の上で案内（TOURS.home）に進む */
export const WELCOME = {
  title: { ja: "まめメモへようこそ", en: "Welcome to Mame Memo" },
  body: {
    ja: "飲んだコーヒーを記録して、だんだん詳しくなるアプリです。記録はこの端末の中だけに保存されます。どこを押すとどうなるか、画面で案内しますね。",
    en: "Record the coffee you drink and learn as you go. Your records stay on this device. Let me show you around the screen.",
  },
};

/** 画面の上で、実際のボタンを光らせて矢印と吹き出しで案内する。target は data-tour の値 */
export type TourStep = { target: string; text: Text };
export type TourId = "home" | "scan" | "glossary" | "wishlist" | "taste" | "settings";
/** label は使い方ページの「もう一度見る」ボタンの名前 */
export const TOURS: Record<TourId, { path: string; label: Text; steps: TourStep[] }> = {
  home: {
    path: "/",
    label: { ja: "記録", en: "Records" },
    steps: [
      {
        target: "fab",
        text: {
          ja: "飲んだらここを押して記録します。産地と★だけでも保存できます。",
          en: "Tap here after a cup to record it. The origin and stars are enough.",
        },
      },
      {
        target: "tab-scan",
        text: {
          ja: "カフェではここ。メニューを撮ると、豆ごとの解説とおすすめが出ます。",
          en: "At a café, tap here. Shoot a menu to get notes and picks for each bean.",
        },
      },
      { target: "tab-wishlist", text: { ja: "「☆」を付けた気になる豆は、ここにたまります。", en: "Beans you star (☆) collect here." } },
      {
        target: "tab-taste",
        text: { ja: "味マップ・産地の国スタンプ・店員さんに見せる画面はここから。", en: "Your taste map, origin stamps and the staff screen are here." },
      },
      { target: "settings", text: { ja: "使い方とバックアップは、いつでもここ（設定）から。", en: "The guide and backups are always here in Settings." } },
    ],
  },
  scan: {
    path: "/scan",
    label: { ja: "調べる", en: "Explore" },
    steps: [
      {
        target: "scan-shoot",
        text: {
          ja: "ここを押してメニューを撮ると、豆ごとに解説とおすすめの飲み方が出ます。",
          en: "Tap here to shoot a menu. You'll get notes and brewing tips for each bean.",
        },
      },
      { target: "scan-photo", text: { ja: "撮ってある写真からも読み取れます（5枚まで）。", en: "You can also read photos you already took (up to 5)." } },
      { target: "scan-text", text: { ja: "名前を打って調べることもできます。", en: "Or type a name to look it up." } },
      {
        target: "scan-food",
        text: {
          ja: "フードやスイーツのメニューを撮ると、それぞれに合うコーヒーが出ます。",
          en: "Shoot the food or dessert menu to see coffees that go with each item.",
        },
      },
      { target: "scan-show", text: { ja: "好みを大きな字で出して、店員さんに見せられます。", en: "Show your taste in large type to the staff." } },
    ],
  },
  glossary: {
    path: "/glossary",
    label: { ja: "辞典", en: "Glossary" },
    steps: [
      {
        target: "g-search",
        text: {
          ja: "言葉を打って探せます。辞典にない言葉は、調べて辞典に足せます。",
          en: "Type a word to find it. Words that aren't here can be looked up and added.",
        },
      },
      { target: "g-filter", text: { ja: "精製・抽出・焙煎・フレーバーでしぼり込めます。", en: "Narrow down by processing, brewing, roast or flavor." } },
      { target: "g-quiz", text: { ja: "毎日1問のクイズで、少しずつ覚えられます。", en: "A daily quiz helps you learn a little at a time." } },
    ],
  },
  wishlist: {
    path: "/wishlist",
    label: { ja: "気になる", en: "Want" },
    steps: [
      {
        target: "wish-item",
        text: {
          ja: "調べる画面で「☆」を付けた豆が、ここにたまります。押すと説明が開き、右の「＋」でそのまま記録できます。",
          en: "Beans you star (☆) while exploring collect here. Tap one for notes, or “+” to record it.",
        },
      },
      {
        target: "wish-sort",
        text: {
          ja: "焙煎度や地域で分けたり、酸味・苦味などの順に並べ替えたりできます。",
          en: "Filter by roast or region, or sort by acidity, bitterness and more.",
        },
      },
    ],
  },
  taste: {
    path: "/taste",
    label: { ja: "好み", en: "Taste" },
    steps: [
      {
        target: "taste-view",
        text: {
          ja: "「わたしの傾向」は味の好み、「マイコレクション」は称号やスタンプ帳・お店・気になる・家の豆です。",
          en: "“My trends” shows your taste; “My collection” has badges, stamps, cafés, your Want list and beans at home.",
        },
      },
      {
        target: "taste-show",
        text: {
          ja: "好みを大きな字で出して、お店で見せられます。友だちと好みくらべもできます。",
          en: "Show your taste in large type at the shop, or compare tastes with a friend.",
        },
      },
      { target: "taste-sort", text: { ja: "並ぶ順番は「並べ替え」で好きに変えられます。", en: "Use “Reorder” to change the order of sections." } },
    ],
  },
  settings: {
    path: "/settings",
    label: { ja: "設定", en: "Settings" },
    steps: [
      { target: "set-guide", text: { ja: "使い方と、この画面の案内の見直しはここから。", en: "Open the guide and replay these tips here." } },
      { target: "set-look", text: { ja: "明るさ・文字の大きさ・テーマ色を変えられます。", en: "Change brightness, text size and theme color." } },
      {
        target: "set-backup",
        text: {
          ja: "記録はこの端末の中だけ。ときどき「書き出す」で残しておくと安心です。",
          en: "Records stay on this device only. Export them now and then to be safe.",
        },
      },
    ],
  },
};

/** 案内を始めるイベント。detail に TourId */
export const TOUR_EVENT = "app:start-tour";
export function startTour(id: TourId) {
  window.dispatchEvent(new CustomEvent(TOUR_EVENT, { detail: id }));
}
