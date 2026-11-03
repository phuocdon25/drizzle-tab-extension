// Tiny i18n layer. Dictionaries live in js/locales/<lang>.js.
// This module is DOM-free at import time so the background service worker can use it too.
// To add a language: create js/locales/<code>.js (copy en.js), import it below and add it to LANGUAGES.
import vi from './locales/vi.js';
import en from './locales/en.js';
import ja from './locales/ja.js';

const DICTS = { vi, en, ja };
export const LANGUAGES = { vi: 'Tiếng Việt', en: 'English', ja: '日本語' };

let lang = 'en';

/** 'auto' follows the browser language; falls back to English. */
export function resolveLanguage(setting, browser = globalThis.navigator?.language || 'en') {
  if (DICTS[setting]) return setting;
  const code = browser.toLowerCase().split('-')[0];
  return DICTS[code] ? code : 'en';
}

export function setLanguage(code) { lang = DICTS[code] ? code : 'en'; }
export const getLanguage = () => lang;
export const locale = () => DICTS[lang].locale;

/**
 * t('key') → string; t('key', {n: 2}) fills {n}; values may also be functions (plurals, dates)
 * which receive the params. Missing keys fall back to English, then to the key itself.
 */
export function t(key, params) {
  const v = DICTS[lang][key] ?? DICTS.en[key];
  if (v === undefined) return key;
  if (typeof v === 'function') return v(params ?? {});
  if (typeof v !== 'string' || !params) return v;
  return v.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? ''));
}

export const has = (key) => DICTS[lang][key] !== undefined || DICTS.en[key] !== undefined;

/** Translate static markup: data-i18n="key" (text) and data-i18n-attr="attr:key;attr2:key2". */
export function applyI18n(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr.trim(), t(key.trim()));
    }
  }
  document.documentElement.lang = lang;
  document.title = t('page.title');
}
