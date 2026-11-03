// Storage wrappers. Inside the extension they use chrome.storage; when the page is opened
// directly (e.g. for development in a normal browser tab) they fall back to localStorage.

export const isExtension = typeof chrome !== 'undefined' && !!chrome.storage?.local;

function area(name) {
  if (isExtension) {
    const a = chrome.storage[name];
    return { get: (keys) => a.get(keys), set: (obj) => a.set(obj) };
  }
  const prefix = `drizzle:${name}:`;
  return {
    async get(keys) {
      const out = {};
      for (const k of [].concat(keys)) {
        const v = localStorage.getItem(prefix + k);
        if (v !== null) out[k] = JSON.parse(v);
      }
      return out;
    },
    async set(obj) {
      for (const [k, v] of Object.entries(obj)) localStorage.setItem(prefix + k, JSON.stringify(v));
    },
  };
}

export const local = area('local');
export const sync = area('sync');

/** Read a key that is normally synced; falls back to local if sync is unavailable/empty. */
export async function getSynced(key) {
  try {
    const r = await sync.get(key);
    if (r[key] !== undefined) return r[key];
  } catch { /* ignore */ }
  return (await local.get(key))[key];
}

/** Write to sync (small quota). If it is over quota, keep the data locally instead. */
export async function setSynced(key, value) {
  try {
    await sync.set({ [key]: value });
  } catch (err) {
    console.warn(`[Drizzle] sync "${key}" failed, storing locally instead:`, err);
    await local.set({ [key]: value });
  }
}

export function onExternalChange(handler) {
  if (isExtension) {
    chrome.storage.onChanged.addListener((changes) => {
      for (const [key, { newValue }] of Object.entries(changes)) handler(key, newValue);
    });
  } else {
    window.addEventListener('storage', (e) => {
      const m = e.key?.match(/^drizzle:\w+:(.+)$/);
      if (m && e.newValue) handler(m[1], JSON.parse(e.newValue));
    });
  }
}

// ---------- IndexedDB for user uploaded backgrounds (large blobs) ----------

let dbPromise;
function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('drizzle-tab', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('media', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction('media', mode);
    const req = fn(t.objectStore('media'));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}

export function addMedia(file) {
  const item = {
    id: `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: file.name,
    type: file.type,
    blob: file,
    createdAt: Date.now(),
  };
  return tx('readwrite', (s) => s.put(item)).then(() => item);
}
export const listMedia = () => tx('readonly', (s) => s.getAll());
export const getMedia = (id) => tx('readonly', (s) => s.get(id));
export const deleteMedia = (id) => tx('readwrite', (s) => s.delete(id));
