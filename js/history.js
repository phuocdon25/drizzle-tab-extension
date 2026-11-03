// GitHub-style heatmap of completed tasks over the last 365 days.
// Hidden (deleted) completed tasks are still counted: deletion only hides them.
import { state, updateSettings } from './state.js';
import { h, icon } from './ui.js';
import { t, locale } from './i18n.js';
import { addDays, dateKey, daysBetween, parseDateKey } from './todo-logic.js';

let selectedDay = null;

const level = (n) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : n <= 6 ? 3 : 4);

function completedByDay() {
  const map = new Map();
  for (const task of state.todos) {
    if (!task.done || !task.completedAt) continue;
    const k = dateKey(new Date(task.completedAt));
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(task);
  }
  return map;
}

function streaks(days, today) {
  const keys = [...days.keys()].sort();
  let longest = 0, run = 0, prev = null;
  for (const k of keys) {
    run = prev && daysBetween(prev, k) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = k;
  }
  let current = 0;
  let k = days.has(today) ? today : addDays(today, -1); // today not done yet doesn't break the streak
  while (days.has(k)) { current++; k = addDays(k, -1); }
  return { longest, current };
}

function fmtDay(key) {
  return parseDateKey(key).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Translated sentence with the given value in bold, e.g. "<b>12</b> tasks this year". */
function withBold(text, value) {
  const i = text.indexOf(value);
  if (i < 0) return [text];
  return [text.slice(0, i), h('strong', {}, value), text.slice(i + value.length)];
}

function renderDay(days) {
  const box = document.getElementById('history-day');
  box.classList.add('panel-strong');
  box.hidden = !selectedDay;
  if (!selectedDay) return;
  const list = (days.get(selectedDay) || []).sort((a, b) => a.completedAt - b.completedAt);
  box.replaceChildren(
    h('div.history-day-head', {},
      h('h3', {}, t('history.dayTitle', { date: fmtDay(selectedDay), n: list.length })),
      h('button.icon-btn.small', { type: 'button', 'aria-label': t('common.close'), onclick: closeDay }, icon('x'))),
    list.length
      ? h('ul.history-list', {}, ...list.map((task) => h('li', {},
        h('span.time', {}, new Date(task.completedAt).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', hour12: false })),
        h('span', {}, task.title),
        task.hidden ? h('span.tag', {}, t('history.hiddenTag')) : null)))
      : h('p.muted.small', {}, t('history.emptyDay')),
  );
}

export function renderHistory() {
  const panel = document.getElementById('history-panel');
  const collapsed = state.settings.historyCollapsed;
  panel.classList.toggle('collapsed', collapsed);
  document.getElementById('history-toggle').setAttribute('aria-expanded', String(!collapsed));

  const today = dateKey();
  const days = completedByDay();
  const first = addDays(today, -364);
  const firstDow = (parseDateKey(first).getDay() + 6) % 7; // Monday = 0
  const start = addDays(first, -firstDow);
  const total = [...days.entries()].filter(([k]) => k >= first).reduce((s, [, v]) => s + v.length, 0);
  const { longest, current } = streaks(days, today);

  document.getElementById('history-stats').replaceChildren(
    h('span', {}, ...withBold(t('history.total', { n: total }), String(total))),
    h('span', {}, ...withBold(t('history.longest', { n: t('unit.days', { n: longest }) }), t('unit.days', { n: longest }))),
    h('span', {}, ...withBold(t('history.current', { n: t('unit.days', { n: current }) }), t('unit.days', { n: current }))),
  );
  if (collapsed) { document.getElementById('history-day').hidden = true; return; }

  // Row labels: Tue / Thu / Sat (rows start on Monday).
  const wd = t('weekdaysShort');
  document.querySelector('.heatmap-days').replaceChildren(...wd.map((w, i) => h('span', {}, i % 2 === 1 ? w : '')));

  const cells = [];
  const months = [];
  let col = 0;
  for (let k = start; k <= today; k = addDays(k, 1)) {
    const d = parseDateKey(k);
    const dow = (d.getDay() + 6) % 7;
    if (dow === 0 && k !== start) col++;
    if ((d.getDate() <= 7 && dow === 0) || (k === start && d.getDate() <= 21)) {
      months.push(h('span', { style: `grid-column:${col + 1}` }, t('fmt.monthShort', d)));
    }
    if (k < first) { cells.push(h('span.cell.pad')); continue; }
    const n = days.get(k)?.length || 0;
    cells.push(h(`button.cell.lv${level(n)}${k === selectedDay ? '.selected' : ''}${k === today ? '.today' : ''}`, {
      type: 'button',
      title: t('history.cellTitle', { n, date: fmtDay(k) }),
      'aria-label': t('history.cellLabel', { n, date: fmtDay(k) }),
      onclick: (e) => { e.stopPropagation(); selectedDay = selectedDay === k ? null : k; renderHistory(); },
    }));
  }
  const heat = document.getElementById('heatmap');
  heat.style.setProperty('--cols', col + 1);
  heat.replaceChildren(...cells);
  const monthsEl = document.getElementById('heatmap-months');
  monthsEl.style.setProperty('--cols', col + 1);
  monthsEl.replaceChildren(...months);
  renderDay(days);
}

function closeDay() {
  selectedDay = null;
  renderHistory();
}

export function initHistory() {
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && selectedDay) closeDay(); });
  document.addEventListener('click', (e) => {
    if (selectedDay && !e.target.closest('#history-day, .cell')) closeDay();
  });
  document.getElementById('history-toggle').addEventListener('click', () => {
    updateSettings((s) => { s.historyCollapsed = !s.historyCollapsed; });
  });
}
