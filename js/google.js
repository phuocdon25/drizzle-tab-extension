// Google area: search box (with "type a URL" support) and the 9-dot apps grid.
import { state } from './state.js';
import { h, favicon, setupPopover } from './ui.js';
import { t, has } from './i18n.js';

export const GOOGLE_APPS = {
  gmail: { name: 'Gmail', url: 'https://mail.google.com' },
  drive: { name: 'Drive', url: 'https://drive.google.com' },
  calendar: { name: 'Calendar', url: 'https://calendar.google.com' },
  docs: { name: 'Docs', url: 'https://docs.google.com/document/' },
  sheets: { name: 'Sheets', url: 'https://docs.google.com/spreadsheets/' },
  slides: { name: 'Slides', url: 'https://docs.google.com/presentation/' },
  forms: { name: 'Forms', url: 'https://docs.google.com/forms/' },
  meet: { name: 'Meet', url: 'https://meet.google.com' },
  chat: { name: 'Chat', url: 'https://chat.google.com' },
  translate: { name: 'Translate', url: 'https://translate.google.com' },
  maps: { name: 'Maps', url: 'https://maps.google.com' },
  youtube: { name: 'YouTube', url: 'https://www.youtube.com' },
  photos: { name: 'Photos', url: 'https://photos.google.com' },
  keep: { name: 'Keep', url: 'https://keep.google.com' },
  contacts: { name: 'Contacts', url: 'https://contacts.google.com' },
  news: { name: 'News', url: 'https://news.google.com' },
  gemini: { name: 'Gemini', url: 'https://gemini.google.com' },
  play: { name: 'Play', url: 'https://play.google.com' },
};

/** Localized app name (brand names such as Gmail or YouTube stay as they are). */
export const appName = (id) => (has(`app.${id}`) ? t(`app.${id}`) : GOOGLE_APPS[id].name);

function renderApps() {
  const grid = document.getElementById('apps-grid');
  const ids = state.settings.apps.filter((id) => GOOGLE_APPS[id]);
  grid.replaceChildren(
    ...ids.map((id) => {
      const app = GOOGLE_APPS[id];
      return h('a.app-tile', { href: app.url }, favicon(app.url, appName(id), 32), h('span', {}, appName(id)));
    }),
  );
  if (!ids.length) grid.append(h('p.muted.small', {}, t('google.noApps')));
}

const looksLikeUrl = (q) => /^(https?:\/\/)?(localhost|[\w-]+(\.[\w-]+)+)(:\d+)?(\/\S*)?$/i.test(q) && !/\s/.test(q);

export function initGoogle({ openSettings }) {
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  form.addEventListener('submit', (e) => {
    const q = input.value.trim();
    if (!q) { e.preventDefault(); return; }
    if (looksLikeUrl(q)) {
      e.preventDefault();
      location.href = /^https?:\/\//i.test(q) ? q : `https://${q}`;
    }
  });

  const btn = document.getElementById('apps-btn');
  const pop = document.getElementById('apps-popover');
  const close = setupPopover(btn, pop, renderApps);
  document.getElementById('apps-customize').addEventListener('click', () => {
    close();
    openSettings('apps');
  });
}
