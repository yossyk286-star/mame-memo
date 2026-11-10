import { getLang } from "./i18n";

/** 使い方の1項目。ja / en をそのまま持つ（文が長いので en.json には入れない） */
type Text = { ja: string; en: string };
export type GuideSection = { id: string; title: Text; where: Text; steps: Text[]; href?: string };

export const t = (x: Text) => (getLang() === "en" ? x.en : x.ja);

export const GUIDE: GuideSection[] = [
  {
    id: "record",
    title: { ja: "飲んだコーヒーを記録する", en: "Record a coffee" },
    where: { ja: "記録タブの「＋ 記録する」", en: "Log tab → “Log it”" },
    href: "/new",
    steps: [
      { ja: "「かんたん」なら産地と★だけで保存できます。味や淹れ方はあとから編集で足せます。", en: "In “Quick”, the origin and stars are enough. You can add taste and brewing later." },
      { ja: "上の「メニューを撮って読み取る」で撮ると、豆の情報が入った状態で書けます。", en: "Shoot the menu at the top and the bean info is filled in for you." },
      { ja: "前に飲んだ豆は「農園・品種名」の候補に出て、選ぶと産地・焙煎度と前回の★が出ます。", en: "Beans you've had show up as farm/variety suggestions, with the origin, roast and your last rating." },
      { ja: "書きかけは自動で残ります。次に開くと「続きを書く」が出ます。", en: "Unfinished records are kept automatically. Next time, tap “Continue”." },
      { ja: "一覧の記録は左にスライドで削除、右にスライドで編集です。", en: "In the list, swipe left to delete and right to edit." },
    ],
  },
  {
    id: "scan",
    title: { ja: "お店でメニューを調べる", en: "Look up a menu" },
    where: { ja: "右下の虫めがね（調べる）→「コーヒーから」", en: "Magnifier at bottom right (Explore) → “Coffee”" },
    href: "/scan",
    steps: [
      { ja: "撮る・写真から（5枚まで）・文字で、のどれかで調べると、豆ごとに解説とおすすめの飲み方が出ます。", en: "Shoot, pick up to 5 photos, or type a name to get notes and brewing tips for each bean." },
      { ja: "好みに合いそうな豆には「おすすめ」が付きます。食べているスイーツを入れると相性順にも並べられます。", en: "Beans that suit your taste get a “Pick” tag. Enter a sweet to sort by pairing." },
      { ja: "「＋記録」で記録へ、「☆」で気になる豆に残せます。調べた一覧はその日のあいだ残ります。", en: "“+Log” starts a record and “☆” saves it to Want. The list stays for the day." },
      { ja: "電波がなくて読めなかった写真は取っておき、電波が戻ったら自動で読み取ります。", en: "Photos taken without signal are kept and read once you're back online." },
    ],
  },
  {
    id: "pair",
    title: { ja: "料理やスイーツから合うコーヒーを選ぶ", en: "Choose by food or sweets" },
    where: { ja: "調べる →「料理から」", en: "Explore → “Food”" },
    href: "/pair",
    steps: [
      { ja: "フードやスイーツのメニューを撮ると一覧が出て、押すとそれに合うコーヒーが出ます。", en: "Shoot the food or dessert menu, then tap an item to see coffees that go with it." },
      { ja: "同じ日にコーヒーのメニューも撮っていれば、そのメニューの中から合う順に選べます。", en: "If you also shot the coffee menu today, it ranks coffees from that menu." },
    ],
  },
  {
    id: "show",
    title: { ja: "店員さんに好みを伝える", en: "Show your taste to staff" },
    where: { ja: "好みタブ・調べる画面の「店員さんに見せる」", en: "“Show the staff” on the Taste tab or Explore screen" },
    href: "/show",
    steps: [
      { ja: "★の高い記録から好み（焙煎度・味など）を大きな字で出します。「今日の気分」に切り替えもできます。", en: "Shows your taste (roast, flavor and more) in large type, based on your top-rated coffees. Switch to “Today's mood” too." },
      { ja: "「上下を逆にして相手に向ける」で、カウンター越しに見せられます。", en: "Tap “Flip it to face them” to turn it toward them." },
    ],
  },
  {
    id: "home",
    title: { ja: "家の豆・気になる豆", en: "My beans & Want list" },
    where: { ja: "好みタブの「家の豆」・気になるタブ", en: "Taste tab → “My beans”, and the Want tab" },
    href: "/bags",
    steps: [
      { ja: "買った豆を登録しておくと、淹れるたびに感想だけ書けば記録できます。", en: "Register beans you bought and just add your impressions each time you brew." },
      { ja: "☆を付けた豆は気になるタブにたまります。飲んだら「＋ 記録に追加」で記録へ。", en: "Starred beans collect in Want. When you try one, tap “+ Add to log”." },
    ],
  },
  {
    id: "taste",
    title: { ja: "好みやスタンプを見る", en: "See your taste & stamps" },
    where: { ja: "好みタブ", en: "Taste tab" },
    href: "/taste",
    steps: [
      { ja: "味マップ・産地スタンプ帳・お店・くらべる（五角形の重ね合わせ）で、記録をふり返れます。", en: "Look back with the taste map, origin stamps, shops and compare (overlaid charts)." },
      { ja: "「わたしの好み」に好きな味を登録すると、おすすめや店員さんに見せる画面に使われます。", en: "Set “My taste” and it's used for picks and the staff screen." },
      { ja: "記録の画面の「AI に聞く」で、その豆のことを質問できます。", en: "Use “Ask AI” on a record to ask about that coffee." },
    ],
  },
  {
    id: "match",
    title: { ja: "称号・しるし・友だちと好みくらべ", en: "Titles, badges & taste match" },
    where: { ja: "好みタブのいちばん上", en: "Top of the Taste tab" },
    href: "/match",
    steps: [
      { ja: "記録が増えると称号が上がり、10杯目・産地5か国などで「しるし」が取れます。取れたときはお祝いが出て、画像で送れます。", en: "Your title goes up as you log more, and you earn badges like 10 cups or 5 countries. Each comes with a little celebration you can share." },
      { ja: "「友だちと好みくらべ」で自分の好みをリンクや QR で送ると、相手の画面で好みが重なり相性が出ます。送るのは味の平均と★の高かった豆の名前だけです。", en: "“Taste match with a friend” sends your taste as a link or QR. Your friend sees both tastes overlaid with a match score. Only average taste and favorite bean names are sent." },
      { ja: "毎月はじめに、記録の画面の上に「先月のふりかえり」が出ます。", en: "At the start of each month, a recap of last month appears on the Log screen." },
    ],
  },
  {
    id: "glossary",
    title: { ja: "言葉を調べる", en: "Glossary" },
    where: { ja: "辞典タブ", en: "Glossary tab" },
    href: "/glossary",
    steps: [
      { ja: "コーヒーの言葉や淹れ方を調べられます。ない言葉は AI で追加できます。毎日のクイズもあります。", en: "Look up coffee terms and brewing methods. Add missing words with AI, and try the daily quiz." },
    ],
  },
  {
    id: "passcode",
    title: { ja: "合言葉と AI", en: "Passcode & AI" },
    where: { ja: "はじめて撮るときに入力", en: "Entered the first time you shoot" },
    steps: [
      { ja: "読み取り・名前で調べる・AI に聞くは合言葉が必要です（AI を使うたびにお金がかかるため）。一度入れると覚えています。合言葉がなくても、記録・辞典・定番の産地19種・よくある食べ物は使えます。", en: "Reading, name search and Ask AI need the passcode (AI costs money each time). It's remembered after the first time. Without it you can still log, use the glossary, 19 classic origins and common foods." },
      { ja: "一度調べた豆は端末に残るので、次からは AI を使わずにすぐ出ます。", en: "Beans you've looked up are saved, so next time they show instantly without AI." },
    ],
  },
  {
    id: "data",
    title: { ja: "データとバックアップ", en: "Data & backup" },
    where: { ja: "設定の「バックアップ」", en: "Settings → “Backup”" },
    steps: [
      { ja: "記録はこの端末の中だけにあります。機種変更やもしものために、ときどき「書き出す」でファイルに残してください。", en: "Records live only on this device. Export now and then in case you change or lose your phone." },
      { ja: "新しい端末では「読み込む」で戻せます。", en: "On a new device, use “Import” to restore them." },
    ],
  },
];

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
export type TourId = "home" | "scan";
export const TOURS: Record<TourId, { path: string; steps: TourStep[] }> = {
  home: {
    path: "/",
    steps: [
      { target: "fab", text: { ja: "飲んだらここを押して記録します。産地と★だけでも保存できます。", en: "Tap here after a cup to record it. The origin and stars are enough." } },
      { target: "tab-scan", text: { ja: "カフェではここ。メニューを撮ると、豆ごとの解説とおすすめが出ます。", en: "At a café, tap here. Shoot a menu to get notes and picks for each bean." } },
      { target: "tab-wishlist", text: { ja: "「☆」を付けた気になる豆は、ここにたまります。", en: "Beans you star (☆) collect here." } },
      { target: "tab-taste", text: { ja: "味マップ・産地の国スタンプ・店員さんに見せる画面はここから。", en: "Your taste map, origin stamps and the staff screen are here." } },
      { target: "settings", text: { ja: "使い方とバックアップは、いつでもここ（設定）から。", en: "The guide and backups are always here in Settings." } },
    ],
  },
  scan: {
    path: "/scan",
    steps: [
      { target: "scan-shoot", text: { ja: "ここを押してメニューを撮ると、豆ごとに解説とおすすめの飲み方が出ます。", en: "Tap here to shoot a menu. You'll get notes and brewing tips for each bean." } },
      { target: "scan-photo", text: { ja: "撮ってある写真からも読み取れます（5枚まで）。", en: "You can also read photos you already took (up to 5)." } },
      { target: "scan-text", text: { ja: "名前を打って調べることもできます。", en: "Or type a name to look it up." } },
      { target: "scan-food", text: { ja: "フードやスイーツのメニューを撮ると、それぞれに合うコーヒーが出ます。", en: "Shoot the food or dessert menu to see coffees that go with each item." } },
      { target: "scan-show", text: { ja: "好みを大きな字で出して、店員さんに見せられます。", en: "Show your taste in large type to the staff." } },
    ],
  },
};

/** 案内を始めるイベント。detail に TourId */
export const TOUR_EVENT = "app:start-tour";
export function startTour(id: TourId) {
  window.dispatchEvent(new CustomEvent(TOUR_EVENT, { detail: id }));
}
