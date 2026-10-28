import type { DiaryRecord, Plant } from './types';

const DB_NAME = 'yangzhi-diary';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('当前浏览器不支持本地存储'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('plants')) {
        db.createObjectStore('plants', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('records')) {
        const store = db.createObjectStore('records', { keyPath: 'id' });
        store.createIndex('plantId', 'plantId', { unique: false });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('本地存储打开失败'));
  });
  return dbPromise;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('本地存储读写失败'));
  });
}

export async function getAllPlants(): Promise<Plant[]> {
  const db = await openDB();
  return request(db.transaction('plants', 'readonly').objectStore('plants').getAll());
}

export async function getAllRecords(): Promise<DiaryRecord[]> {
  const db = await openDB();
  return request(db.transaction('records', 'readonly').objectStore('records').getAll());
}

export async function putPlant(plant: Plant): Promise<void> {
  const db = await openDB();
  await request(db.transaction('plants', 'readwrite').objectStore('plants').put(plant));
}

export async function putRecord(record: DiaryRecord): Promise<void> {
  const db = await openDB();
  await request(db.transaction('records', 'readwrite').objectStore('records').put(record));
}

export async function deleteRecordById(id: string): Promise<void> {
  const db = await openDB();
  await request(db.transaction('records', 'readwrite').objectStore('records').delete(id));
}

/** 删除植株，并级联删除其全部记录（含照片 Blob） */
export async function deletePlantWithRecords(plantId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(['plants', 'records'], 'readwrite');
  const records = tx.objectStore('records');
  const keys = await request(records.index('plantId').getAllKeys(IDBKeyRange.only(plantId)));
  keys.forEach((key) => records.delete(key));
  tx.objectStore('plants').delete(plantId);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('删除失败'));
    tx.onabort = () => reject(tx.error ?? new Error('删除失败'));
  });
}

export async function clearAll(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(['plants', 'records'], 'readwrite');
  tx.objectStore('plants').clear();
  tx.objectStore('records').clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('清空失败'));
  });
}

export async function getMeta(key: string): Promise<string | undefined> {
  const db = await openDB();
  const row = await request<{ key: string; value: string } | undefined>(
    db.transaction('meta', 'readonly').objectStore('meta').get(key),
  );
  return row?.value;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await openDB();
  await request(db.transaction('meta', 'readwrite').objectStore('meta').put({ key, value }));
}

export async function estimateUsageMB(): Promise<number | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage } = await navigator.storage.estimate();
    return usage ? usage / 1024 / 1024 : null;
  } catch {
    return null;
  }
}
