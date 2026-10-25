import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { TastingRecord } from "./types";

// 保存処理はこのファイルに集約する。将来 DB 同期に移すときはここだけ差し替える。

interface MameDB extends DBSchema {
  records: {
    key: string;
    value: TastingRecord;
    indexes: { byDate: string };
  };
}

let dbPromise: Promise<IDBPDatabase<MameDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MameDB>("mame-memo", 1, {
      upgrade(db) {
        const store = db.createObjectStore("records", { keyPath: "id" });
        store.createIndex("byDate", "date");
      },
    });
    // ブラウザに「消さないで」と依頼する（対応ブラウザのみ）
    navigator.storage?.persist?.().catch(() => {});
  }
  return dbPromise;
}

/** 新しい順（日付 → 作成時刻） */
export async function listRecords(): Promise<TastingRecord[]> {
  const all = await (await getDB()).getAll("records");
  return all.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

export async function getRecord(id: string) {
  return (await getDB()).get("records", id);
}

export async function putRecord(record: TastingRecord) {
  await (await getDB()).put("records", record);
}

export async function deleteRecord(id: string) {
  await (await getDB()).delete("records", id);
}

// --- 書き出し / 読み込み（バックアップ用） ---

type ExportedRecord = Omit<TastingRecord, "photo"> & { photo: string | null };

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function exportJSON(): Promise<string> {
  const records = await listRecords();
  const out: ExportedRecord[] = await Promise.all(
    records.map(async (r) => ({ ...r, photo: r.photo ? await blobToDataURL(r.photo) : null })),
  );
  return JSON.stringify({ app: "mame-memo", version: 1, records: out });
}

/** 同じ id の記録は上書きする。読み込んだ件数を返す */
export async function importJSON(text: string): Promise<number> {
  const data = JSON.parse(text);
  if (data?.app !== "mame-memo" || !Array.isArray(data.records)) {
    throw new Error("まめメモの書き出しファイルではありません");
  }
  const db = await getDB();
  const tx = db.transaction("records", "readwrite");
  for (const r of data.records as ExportedRecord[]) {
    const photo = r.photo ? await (await fetch(r.photo)).blob() : null;
    await tx.store.put({ ...r, photo });
  }
  await tx.done;
  return data.records.length;
}
