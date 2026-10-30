import { METHODS, PROCESSES, ROASTS, TERMS } from "./glossary";
import type { MyPrefs } from "./prefs";
import type { TastingRecord } from "./types";
import { tr } from "./i18n";

export type NextIdea = { title: string; reason: string; description?: string };

function average(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

const describe = (term: string) => TERMS.find((t) => t.term === term)?.description;
const known = (v: string | null) => !!v && v !== "不明" && v !== "その他";

/**
 * 次に試すと勉強になる豆。
 * 好きな焙煎度のまだ飲んでいない精製方法、評価の高い豆をまだ試していない淹れ方で、まだ飲んでいない焙煎度の順に出す
 */
export function nextIdeas(records: TastingRecord[], prefs: MyPrefs, limit = 4): NextIdea[] {
  const ideas: NextIdea[] = [];

  // 焙煎度ごとの評価。自分で登録した好きな焙煎度は少し上げる
  const roasts = new Map<string, number[]>();
  for (const r of records) if (known(r.roast)) roasts.set(r.roast!, [...(roasts.get(r.roast!) ?? []), r.overall]);
  const ranked = [...roasts]
    .map(([roast, scores]) => ({ roast, score: average(scores) + (prefs.roasts.includes(roast) ? 0.5 : 0) }))
    .sort((a, b) => b.score - a.score)
    .map((k) => k.roast);
  for (const k of prefs.roasts) if (!ranked.includes(k)) ranked.push(k);

  // 1. 好きな焙煎度で、まだ飲んでいない精製方法
  for (const roast of ranked.slice(0, 2)) {
    const tried = new Set(records.filter((r) => r.roast === roast).map((r) => r.process));
    for (const process of PROCESSES.filter((p) => known(p) && !tried.has(p)).slice(0, 2)) {
      ideas.push({
        title: tr("{0}の{1}", roast, process),
        reason: roasts.has(roast) ? tr("{0}の評価が高めで、{1}はまだ記録がありません", roast, process) : tr("好きな{0}で、まだ記録がありません", roast),
        description: describe(process),
      });
    }
  }

  // 2. いちばん評価の高い焙煎度×精製を、まだ試していない淹れ方で
  const combos = new Map<string, { label: string; scores: number[]; methods: Set<string | null> }>();
  for (const r of records) {
    if (!known(r.roast)) continue;
    const label = [r.roast, known(r.process) ? r.process : null].filter(Boolean).join("・");
    const c = combos.get(label) ?? { label, scores: [], methods: new Set() };
    c.scores.push(r.overall);
    c.methods.add(r.method);
    combos.set(label, c);
  }
  const top = [...combos.values()].sort((a, b) => average(b.scores) - average(a.scores))[0];
  if (top && average(top.scores) >= 3.5) {
    const method = METHODS.find((m) => m !== "その他" && !top.methods.has(m));
    if (method) {
      ideas.unshift({
        title: tr("{0}を{1}で", top.label, method),
        reason: tr("{0}が★{1}と好評。淹れ方を変えると味の違いがわかります", top.label, average(top.scores).toFixed(1)),
        description: describe(method),
      });
    }
  }

  // 3. まだ飲んでいない焙煎度（苦手と登録したものは出さない）
  const untried = ROASTS.filter((r) => known(r) && !roasts.has(r) && !prefs.avoidRoasts.includes(r));
  if (untried.length > 0 && records.length > 0) {
    ideas.push({ title: untried[0], reason: tr("{0}はまだ記録がありません", untried[0]), description: describe(untried[0]) });
  }

  return ideas.slice(0, limit);
}
