"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { stars } from "@/components/RecordCard";
import { collectStamps, REGIONS, type Stamp } from "@/lib/countries";
import { listRecords } from "@/lib/db";
import type { TastingRecord } from "@/lib/types";

function StampCell({
  name,
  stamp,
  open,
  onToggle,
  pop,
}: {
  name: string;
  stamp?: Stamp;
  open: boolean;
  onToggle: () => void;
  /** 新しく増えたスタンプは、ポンと押す */
  pop?: boolean;
}) {
  const delay = usePressDelay(pop);
  if (!stamp) {
    return (
      <div className="stamp" aria-label={`${name} まだ`}>
        <span className="stamp-name">{name}</span>
      </div>
    );
  }
  // 飲んだ国はタップで、その国のどの地域・農園の豆を飲んだかを開く
  return (
    <button
      type="button"
      ref={delay.ref}
      className={!pop ? "stamp stamp-on" : delay.value === null ? "stamp stamp-on stamp-wait" : "stamp stamp-on stamp-pop"}
      style={delay.value === null ? undefined : { animationDelay: `${delay.value}s` }}
      aria-expanded={open}
      onClick={onToggle}
    >
      <span className="stamp-name">{name}</span>
      <span className="stamp-meta">
        {stamp.count}杯・最高★{stamp.best}
      </span>
    </button>
  );
}

// 同じころに見えたスタンプは、少しずつずらして順番に押す
let lastPress = 0;
let pressedInRow = 0;

/** 画面に見えたときに押す。下のほうの新しいスタンプも、スクロールして見えたところで押される */
function usePressDelay(pop?: boolean) {
  const ref = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!pop || !el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const now = Date.now();
        pressedInRow = now - lastPress < 500 ? pressedInRow + 1 : 0;
        lastPress = now;
        setValue(0.25 + Math.min(pressedInRow, 10) * 0.12);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pop]);
  return { ref, value };
}

/** その国で飲んだ豆（地域・農園ごと）。評価の高い順 */
function StampDetail({ name, stamp }: { name: string; stamp: Stamp }) {
  const rows = [...stamp.records].sort((a, b) => b.overall - a.overall || b.date.localeCompare(a.date));
  return (
    <div className="stamp-detail">
      <h3>{name}で飲んだ豆</h3>
      {rows.map((r) => (
        <Link key={r.id} href={`/record?id=${r.id}`} className="stamp-row">
          <span className="stamp-row-name">{r.farm || r.origin}</span>
          <span className="stars">{stars(r.overall)}</span>
          <span className="muted stamp-row-sub">
            {r.shop}・{r.date.slice(5).replace("-", "/")}
            {r.roast && r.roast !== "不明" ? `・${r.roast}` : ""}
            {r.process && r.process !== "不明" ? `・${r.process}` : ""}
          </span>
        </Link>
      ))}
    </div>
  );
}

const SEEN_KEY = "mame-memo:stamps-seen";

/** 前に開いたときから増えた産地。見たものとして覚えておく */
function takeNewStamps(names: string[]): string[] {
  try {
    const seen = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
    localStorage.setItem(SEEN_KEY, JSON.stringify(names));
    return names.filter((n) => !seen.has(n));
  } catch {
    return [];
  }
}

/** 飲んだ産地がスタンプのように埋まっていく。まだの国は次に試すヒントになる */
export default function StampsPage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const toggle = (name: string) => setOpened((o) => (o === name ? null : name));

  useEffect(() => {
    listRecords().then(setRecords);
  }, []);

  const { stamps, others, total } = useMemo(() => collectStamps(records ?? []), [records]);

  // 新しいスタンプは、ページを開いたときにポンと押す演出をする
  const [fresh, setFresh] = useState<string[]>([]);
  const counted = useRef(false);
  useEffect(() => {
    if (!records || counted.current) return;
    counted.current = true;
    // 画面の並び順（上から）で押していく
    const shown = REGIONS.flatMap((r) => r.countries.map((c) => c.name)).filter((n) => stamps.has(n));
    setFresh(takeNewStamps([...shown, ...others.keys()]));
  }, [records, stamps, others]);
  const popOf = (name: string) => fresh.includes(name);


  return (
    <>
      <header className="sub-header">
        <Link href="/taste" className="back">
          ‹ 戻る
        </Link>
        <h1>産地スタンプ帳</h1>
      </header>

      <p className="lead">
        {total}カ国中 <strong>{stamps.size}カ国</strong> 制覇。色の付いた国を押すと、飲んだ地域や農園が見られます。
      </p>

      {fresh.length > 0 && (
        <p className="stamp-news" role="status">
          新しいスタンプ：{fresh.slice(0, 5).join("・")}
          {fresh.length > 5 ? ` ほか${fresh.length - 5}か所` : ""}
        </p>
      )}

      <main className="content">
        {REGIONS.map((r) => {
          const done = r.countries.filter((c) => stamps.has(c.name)).length;
          return (
            <section key={r.region} className="card" style={{ gap: 12 }}>
              <div className="card-top">
                <h2 style={{ fontSize: 15 }}>{r.region}</h2>
                <span className="muted">
                  {done} / {r.countries.length}
                </span>
              </div>
              <div className="stamp-grid">
                {r.countries.map((c) => (
                  <StampCell
                    key={c.name}
                    name={c.name}
                    stamp={stamps.get(c.name)}
                    open={opened === c.name}
                    onToggle={() => toggle(c.name)}
                    pop={popOf(c.name)}
                  />
                ))}
              </div>
              {opened && r.countries.some((c) => c.name === opened) && stamps.get(opened) && (
                <StampDetail name={opened} stamp={stamps.get(opened)!} />
              )}
            </section>
          );
        })}
        {others.size > 0 && (
          <section className="card" style={{ gap: 12 }}>
            <h2 style={{ fontSize: 15 }}>そのほかの産地</h2>
            <div className="stamp-grid">
              {[...others].map(([name, s]) => (
                <StampCell
                  key={name}
                  name={name}
                  stamp={s}
                  open={opened === name}
                  onToggle={() => toggle(name)}
                  pop={popOf(name)}
                />
              ))}
            </div>
            {opened && others.get(opened) && <StampDetail name={opened} stamp={others.get(opened)!} />}
          </section>
        )}
      </main>
    </>
  );
}
