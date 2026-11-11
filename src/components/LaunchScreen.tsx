/**
 * ホーム画面から開いたときの起動画面（約2.4秒）。
 * コーヒーのしずくが落ちて波紋が広がる → 波紋が豆の形に描かれる → 中にコーヒーが波打ちながら満ちて湯気が立つ
 * → 名前が出て、真ん中から穴が開くようにアプリへ。
 * iPhone が出す起動画像（public/splash）は同じ地の色だけなので、そこから続けて始まる。
 * ブラウザで開いたときと「動きを減らす」の設定では出さない（globals.css「起動画面」）。
 * 色は .launch の --ln-* で決め、ライト・ダークで切り替える。
 */

const E = "cubic-bezier(.2,.7,.2,1)";
const IO = "cubic-bezier(.65,0,.35,1)";
/** animation の1つ分。名前・始まり(ms)・長さ(ms)・動き方 */
const a = (name: string, delay: number, dur: number, ease = E) => `ln-${name} ${dur}ms ${ease} ${delay}ms both`;
const anim = (...xs: string[]) => `animation:${xs.join(",")};`;
const INK = "stroke:var(--ln-ink)";

// 豆（たて長のだ円を上から一周）とまん中の筋、しずく
const BEAN = "M0,-182 A132,182 0 1 1 0,182 A132,182 0 1 1 0,-182Z";
const CREASE = "M18,-178 C-78,-70 78,60 -18,178";
const DROP = "M0,-100 C40,-40 75,5 75,45 A75,75 0 0 1 -75,45 C-75,5 -40,-40 0,-100Z";
const WAVE = `M-200,0 ${"t75,0 ".repeat(12).replace("t75,0", "q37.5,-22 75,0")}V600 H-200Z`;

function art() {
  const coffee = `<defs><clipPath id="ln-bean"><path d="${BEAN}" transform="translate(256,256) rotate(28)"/></clipPath></defs>
    <g clip-path="url(#ln-bean)"><g style="${anim(a("rise", 1000, 600, "cubic-bezier(.3,.6,.4,1)"))}"><g style="${anim(a("wave", 1000, 1200, "linear"))}">
      <path d="${WAVE}" transform="translate(0,96)" style="fill:var(--ln-liq)"/></g></g></g>`;
  const bean = `<g style="transform-origin:256px 256px;${anim(a("bob", 1600, 460, IO))}"><g transform="translate(256,256) rotate(28)" stroke-width="24" stroke-linecap="round" style="${INK}">
      <path class="ln-d" pathLength="1" d="${BEAN}" style="fill:var(--ln-tint);${anim(a("draw", 420, 650, IO), a("fill", 900, 300))}"/>
      <path class="ln-d" pathLength="1" d="${CREASE}" fill="none" style="${anim(a("draw", 900, 380, IO))}"/></g></g>`;
  const steam = `<path class="ln-d" pathLength="1" d="M330,110 c-18,-22 18,-38 0,-62 M392,138 c-18,-22 18,-38 0,-62" fill="none" stroke-width="16.8" stroke-linecap="round" stroke-opacity=".5" style="${INK};${anim(a("draw", 1450, 420, "ease-out"), a("fade-out", 1850, 160))}"/>`;
  const drop = `<g transform="translate(256,250)"><g style="${anim(a("fall", 0, 440, "cubic-bezier(.55,0,.9,.5)"))}"><path d="${DROP}" transform="scale(.42)" style="fill:var(--ln-ink)"/></g></g>`;
  const rings = [0, 1]
    .map(
      (i) =>
        `<circle cx="256" cy="262" r="150" fill="none" stroke-width="6" style="${INK};transform-box:fill-box;transform-origin:center;${anim(a("ring", 420 + i * 150, 620, "ease-out"))}"/>`,
    )
    .join("");
  return coffee + bean + steam + drop + rings;
}

const NAME = [..."まめメモ"].map((c, i) => `<span style="${anim(a("up", 1450 + i * 70, 320))}">${c}</span>`).join("");
const MARKUP = `<div class="ln-ct" style="${anim(a("fade-out", 1960, 200))}">
  <div class="ln-icon" style="${anim(a("zoom-out", 1900, 320, "ease-in"))}"><svg viewBox="0 0 512 512">${art()}</svg></div>
  <div class="ln-name">${NAME}</div></div>`;

export default function LaunchScreen() {
  return <div className="launch" aria-hidden="true" dangerouslySetInnerHTML={{ __html: MARKUP }} />;
}

/**
 * 起動画面を「開いたときの1回だけ」にするための小さなスクリプト。<head> で描画より先に読む。
 * - 同じ起動のあいだに読み直し（画面ごとの読み込み）が起きても、sessionStorage の印を見て出さない
 * - 動きが終わったら html に data-launched を付け、起動画面の要素が作り直されても二度と動かさない
 * （iPhone のホーム画面から開いたとき、ボタンを押すたびに起動画面が出ることがあったため）
 */
export const LAUNCH_BOOT = `(function(){var r=document.documentElement;var done=function(){r.dataset.launched="1"};try{if(sessionStorage.getItem("mame-memo:launched"))done();else sessionStorage.setItem("mame-memo:launched","1")}catch(e){}document.addEventListener("animationend",function(e){if(e.animationName==="launch-out")done()});setTimeout(done,3200)})();`;
