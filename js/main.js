import { state, loadState, subscribe, watchExternalChanges } from './state.js';
import { applyTheme, resolveThemeId } from './themes.js';
import { t, locale, setLanguage, resolveLanguage, getLanguage, applyI18n } from './i18n.js';
import { renderBackdrop, setBackdropVisible, loadArtIndex } from './backdrop.js';
import { initGoogle } from './google.js';
import { initLinks, renderLinks } from './links.js';
import { initTodos, renderTodos, focusTodoInput, refreshTodoLanguage } from './todo.js';
import { initHistory, renderHistory } from './history.js';
import { initSettings, openSettings, cycleTheme, refreshSettingsLanguage } from './settings.js';

let themeId = null;

function applyLayout() {
  const { sections, todoSide } = state.settings;
  for (const el of document.querySelectorAll('[data-section]')) {
    el.hidden = sections[el.dataset.section] === false;
  }
  const layout = document.getElementById('layout');
  layout.dataset.todoSide = todoSide;
  layout.classList.toggle('no-todo', !sections.todo);
}

function applyAppearance() {
  const next = resolveThemeId(state.settings);
  if (next !== themeId) {
    themeId = next;
    applyTheme(themeId);
  }
  renderBackdrop(state.settings, themeId);
}

function greeting(now) {
  const hour = now.getHours();
  const key = hour < 5 ? 'night' : hour < 11 ? 'morning' : hour < 13 ? 'noon' : hour < 18 ? 'afternoon' : 'evening';
  const greet = t(`greet.${key}`);
  const name = state.settings.name;
  return name ? t('greet.withName', { greet, name }) : greet;
}

/** Apply the language setting; returns true when it changed. */
let languageApplied = false;
function applyLanguage() {
  const next = resolveLanguage(state.settings.language);
  if (languageApplied && next === getLanguage()) return false;
  languageApplied = true;
  setLanguage(next);
  applyI18n();
  return true;
}

function tickClock() {
  const now = new Date();
  document.getElementById('clock-time').textContent = now.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', hour12: false });
  const date = now.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('clock-greeting').textContent = `${greeting(now)} · ${date}`;
  if (state.settings.themeMode === 'time') applyAppearance();
}

function isTyping(e) {
  const t = e.target;
  return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName);
}

function setupShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isTyping(e) && !document.querySelector('dialog[open]')) {
      e.target.blur();
      return;
    }
    if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    if (e.key === '/') {
      e.preventDefault();
      document.getElementById('search-input').focus();
    } else if (e.key === 't' && state.settings.sections.todo) {
      e.preventDefault();
      focusTodoInput();
    } else if (e.key === 'T') {
      e.preventDefault();
      cycleTheme();
    } else if (e.key === ',') {
      e.preventDefault();
      openSettings();
    }
  });
}

async function main() {
  await Promise.all([loadState(), loadArtIndex()]);
  applyLanguage();
  applyAppearance();
  applyLayout();

  initGoogle({ openSettings });
  initLinks();
  initTodos();
  initHistory();
  initSettings();

  renderLinks();
  renderTodos();
  renderHistory();
  tickClock();
  setInterval(tickClock, 1000 * 15);
  setupShortcuts();

  subscribe((kind) => {
    if (kind === 'settings') {
      if (applyLanguage()) {
        renderLinks();
        refreshTodoLanguage();
        refreshSettingsLanguage();
      }
      applyAppearance();
      applyLayout();
      renderHistory();
      tickClock();
    } else if (kind === 'links') {
      renderLinks();
    } else if (kind === 'todos') {
      renderTodos();
      renderHistory();
    }
  });
  watchExternalChanges();

  document.addEventListener('visibilitychange', () => {
    setBackdropVisible(!document.hidden);
    if (!document.hidden) { renderTodos(); tickClock(); }
  });

  document.body.classList.add('ready');
  console.info('[Drizzle] ready, theme:', themeId, 'language:', getLanguage());
}

main().catch((err) => console.error('[Drizzle] init failed', err));
