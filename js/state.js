import { local, getSynced, setSynced, onExternalChange } from './storage.js';
import { t } from './i18n.js';

export const MAX_LINKS = 8;

export const DEFAULT_SETTINGS = {
  name: '',
  theme: 'rainy-city',
  themeMode: 'manual', // manual | random | time
  dayTheme: 'forest-morning',
  nightTheme: 'rainy-city',
  batterySaver: false,
  customBackground: null, // media id in IndexedDB, or null to use the theme background
  language: 'auto', // auto (browser language) | vi | en | ja
  overlayEffect: 'theme', // theme | none | rain | snow | petals | leaves | fireflies | dust | rays | bokeh
  artDim: 0.1, // darken illustrations a bit so panels stay readable (0..0.6)
  sections: { clock: true, google: true, links: true, todo: true, history: true },
  todoSide: 'right',
  historyCollapsed: false,
  apps: ['drive', 'calendar', 'docs', 'sheets', 'meet', 'translate', 'maps', 'youtube', 'gemini'],
  notifications: { enabled: false, leadMinutes: 60 },
  badge: true,
};

export const DEFAULT_LINKS = [
  { id: 'l1', title: 'Facebook', url: 'https://www.facebook.com' },
  { id: 'l2', title: 'YouTube', url: 'https://www.youtube.com' },
  { id: 'l3', title: 'Instagram', url: 'https://www.instagram.com' },
  { id: 'l4', title: 'TikTok', url: 'https://www.tiktok.com' },
];

// Defaults shipped by earlier versions: replaced by the new defaults if the user never changed them.
const OLD_DEFAULT_LINK_URLS = ['https://www.youtube.com', 'https://github.com', 'https://drive.google.com', 'https://stackoverflow.com'];
const isOldDefault = (links) => links.length === OLD_DEFAULT_LINK_URLS.length && links.every((l, i) => l.url === OLD_DEFAULT_LINK_URLS[i]);

export const state = { settings: structuredClone(DEFAULT_SETTINGS), links: [], todos: [] };

const listeners = new Set();
export const subscribe = (fn) => listeners.add(fn);
const emit = (kind) => listeners.forEach((fn) => fn(kind));

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}
export function mergeDefaults(def, val) {
  if (!isObj(val)) return structuredClone(def);
  const out = {};
  for (const k of Object.keys(def)) {
    out[k] = isObj(def[k]) ? mergeDefaults(def[k], val[k]) : val[k] !== undefined ? val[k] : structuredClone(def[k]);
  }
  return out;
}

export async function loadState() {
  const [settings, links, { todos }] = await Promise.all([
    getSynced('settings'),
    getSynced('links'),
    local.get('todos'),
  ]);
  state.settings = mergeDefaults(DEFAULT_SETTINGS, settings);
  state.links = Array.isArray(links) && !isOldDefault(links) ? links : structuredClone(DEFAULT_LINKS);
  state.todos = Array.isArray(todos) ? todos : [];
}

let settingsTimer;
/** Apply immediately, persist debounced (chrome.storage.sync limits writes per minute). */
export function updateSettings(mutate) {
  mutate(state.settings);
  emit('settings');
  clearTimeout(settingsTimer);
  settingsTimer = setTimeout(() => setSynced('settings', state.settings), 400);
}

export async function setLinks(links) {
  state.links = links;
  emit('links');
  await setSynced('links', links);
}

export async function setTodos(todos) {
  state.todos = todos;
  emit('todos');
  await local.set({ todos });
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Keep several open tabs in sync with each other. */
export function watchExternalChanges() {
  onExternalChange((key, value) => {
    if (value === undefined || !['settings', 'links', 'todos'].includes(key)) return;
    const next = key === 'settings' ? mergeDefaults(DEFAULT_SETTINGS, value) : value;
    if (JSON.stringify(next) === JSON.stringify(state[key])) return;
    state[key] = next;
    emit(key);
  });
}

// ---------- Backup ----------

export function exportData() {
  return {
    app: 'drizzle-tab',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    links: state.links,
    todos: state.todos,
  };
}

export async function importData(data) {
  if (!data || data.app !== 'drizzle-tab') throw new Error(t('backup.invalid'));
  if (data.settings) {
    state.settings = mergeDefaults(DEFAULT_SETTINGS, data.settings);
    await setSynced('settings', state.settings);
  }
  if (Array.isArray(data.links)) await setLinks(data.links.slice(0, MAX_LINKS));
  if (Array.isArray(data.todos)) await setTodos(data.todos);
  emit('settings');
}
