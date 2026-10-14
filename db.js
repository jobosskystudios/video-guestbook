// =============================================================
//  Local storage of recordings (IndexedDB) — works offline.
//  Every clip stays on the iPad until you export / delete it.
// =============================================================

const DB_NAME = 'video-guestbook';
const DB_VERSION = 1;
let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('clips')) {
        const s = d.createObjectStore('clips', { keyPath: 'id' });
        s.createIndex('eventId', 'eventId');
      }
      if (!d.objectStoreNames.contains('assets')) d.createObjectStore('assets');
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => { dbPromise = null; reject(r.error); };
  });
  return dbPromise;
}

const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

// Writes resolve only after the transaction has committed to disk.
async function write(store, fn) {
  const d = await open();
  return new Promise((res, rej) => {
    const t = d.transaction(store, 'readwrite');
    fn(t.objectStore(store));
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('Transaction aborted (storage full?)'));
  });
}

export const putClip = (clip) => write('clips', (s) => s.put(clip));
export const deleteClip = (id) => write('clips', (s) => s.delete(id));

export async function getClips(eventId) {
  const d = await open();
  const s = d.transaction('clips').objectStore('clips');
  const all = eventId ? await req(s.index('eventId').getAll(eventId)) : await req(s.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function clearEvent(eventId) {
  const d = await open();
  const keys = await req(d.transaction('clips').objectStore('clips').index('eventId').getAllKeys(eventId));
  return write('clips', (s) => keys.forEach((k) => s.delete(k)));
}

export async function listEvents() {
  const all = await getClips();
  const map = new Map();
  for (const c of all) {
    const e = map.get(c.eventId) || { eventId: c.eventId, eventName: c.eventName, count: 0, last: 0 };
    e.count++; e.last = Math.max(e.last, c.createdAt);
    map.set(c.eventId, e);
  }
  return [...map.values()].sort((a, b) => b.last - a.last);
}

export const setAsset = (key, blob) => write('assets', (s) => s.put(blob, key));
export const deleteAsset = (key) => write('assets', (s) => s.delete(key));
export async function getAsset(key) {
  const d = await open();
  return req(d.transaction('assets').objectStore('assets').get(key));
}
