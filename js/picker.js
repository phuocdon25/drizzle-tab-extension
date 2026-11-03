// Friendly deadline / time / priority picker (replaces the native date, time and select inputs):
// quick chips for common choices + a localized calendar (weeks start on Monday) and a 24h time grid.
import { h, icon } from './ui.js';
import { t } from './i18n.js';
import { dateKey, addDays, parseDateKey, relativeLabel, isLate, priorityLabel, PRIORITIES } from './todo-logic.js';

const TIME_PRESETS = ['09:00', '12:00', '17:00', '21:00'];
const MINUTES = ['00', '15', '30', '45'];
const pad = (n) => String(n).padStart(2, '0');
const dow = (key) => (parseDateKey(key).getDay() + 6) % 7; // Monday = 0

export const fmtShort = (key) => t('fmt.short', parseDateKey(key));
const fmtLong = (key) => t('fmt.long', parseDateKey(key));

function datePresets() {
  const today = dateKey();
  const d = dow(today);
  return [
    { label: t('pick.none'), value: null },
    { label: t('pick.today'), value: today },
    { label: t('pick.tomorrow'), value: addDays(today, 1) },
    { label: t('pick.weekend'), value: addDays(today, (5 - d + 7) % 7) },
    { label: t('pick.nextWeek'), value: addDays(today, 7 - d) },
  ];
}

// ---------------- popover (fixed, so it is never clipped by the scrolling todo panel) ----------------
let active = null;
function closePopover() {
  if (!active) return;
  active.el.remove();
  document.removeEventListener('pointerdown', active.outside, true);
  document.removeEventListener('keydown', active.esc, true);
  window.removeEventListener('resize', closePopover);
  const { anchor } = active;
  active = null;
  anchor?.focus({ preventScroll: true });
}
function openPopover(anchor, content) {
  closePopover();
  const el = h('div.dt-popover', { role: 'dialog' }, content);
  document.body.append(el);
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, ht = el.offsetHeight;
  const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
  const below = r.bottom + 6 + ht < window.innerHeight;
  el.style.left = `${left}px`;
  el.style.top = `${below ? r.bottom + 6 : Math.max(8, r.top - ht - 6)}px`;
  const outside = (e) => { if (!el.contains(e.target) && !anchor.contains(e.target)) closePopover(); };
  const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closePopover(); } };
  document.addEventListener('pointerdown', outside, true);
  document.addEventListener('keydown', esc, true);
  window.addEventListener('resize', closePopover);
  active = { el, anchor, outside, esc };
  (el.querySelector('.selected') || el.querySelector('.cal-day.today') || el.querySelector('.active') || el.querySelector('button'))?.focus({ preventScroll: true });
}

function calendar(selected, onPick) {
  const view = selected ? parseDateKey(selected) : new Date();
  view.setDate(1);
  const root = h('div.cal');
  const render = () => {
    const y = view.getFullYear(), m = view.getMonth();
    const offset = (new Date(y, m, 1).getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const today = dateKey();
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(h('span'));
    for (let d = 1; d <= days; d++) {
      const k = dateKey(new Date(y, m, d));
      const cls = `${k === today ? '.today' : ''}${k === selected ? '.selected' : ''}${k < today ? '.past' : ''}${dow(k) >= 5 ? '.weekend' : ''}`;
      cells.push(h(`button.cal-day${cls}`, { type: 'button', 'aria-label': fmtLong(k), 'aria-pressed': String(k === selected), onclick: () => onPick(k) }, String(d)));
    }
    root.replaceChildren(
      h('div.cal-head', {},
        h('button.icon-btn.small', { type: 'button', 'aria-label': t('pick.prevMonth'), onclick: () => { view.setMonth(m - 1); render(); } }, icon('chevron-left')),
        h('strong', {}, t('fmt.month', new Date(y, m, 1))),
        h('button.icon-btn.small', { type: 'button', 'aria-label': t('pick.nextMonth'), onclick: () => { view.setMonth(m + 1); render(); } }, icon('chevron-right'))),
      h('div.cal-grid', {}, ...t('weekdaysShort').map((w, i) => h(`span.cal-wd${i >= 5 ? '.weekend' : ''}`, {}, w)), ...cells),
      h('div.cal-foot', {},
        h('button.btn.ghost.small', { type: 'button', onclick: () => onPick(null) }, t('pick.clearDue')),
        h('button.btn.ghost.small', { type: 'button', onclick: () => onPick(today) }, t('pick.today'))));
  };
  render();
  return root;
}

function timeGrid(selected, onPick) {
  let [hour, min] = selected ? selected.split(':') : ['09', '00'];
  if (!MINUTES.includes(min)) MINUTES.push(min); // keep a custom minute (e.g. 17:20) selectable
  const root = h('div.tp');
  const render = () => {
    const focusedKey = root.contains(document.activeElement) ? document.activeElement.dataset.key : null;
    root.replaceChildren(
      h('p.tp-title', {}, t('pick.hour')),
      h('div.tp-grid', {}, ...Array.from({ length: 24 }, (_, i) => pad(i)).map((hh) =>
        h(`button.tp-cell${hh === hour ? '.active' : ''}`, { type: 'button', dataset: { key: `h${hh}` }, 'aria-label': t('pick.hourLabel', { h: hh }), 'aria-pressed': String(hh === hour), onclick: () => { hour = hh; render(); } }, hh))),
      h('p.tp-title', {}, t('pick.minute')),
      h('div.tp-grid.tp-min', {}, ...MINUTES.map((mm) =>
        h(`button.tp-cell${mm === min ? '.active' : ''}`, { type: 'button', dataset: { key: `m${mm}` }, 'aria-label': t('pick.minuteLabel', { m: mm }), 'aria-pressed': String(mm === min), onclick: () => { min = mm; render(); } }, `:${mm}`))),
      h('div.cal-foot', {},
        h('span.tp-preview', {}, `${hour}:${min}`),
        h('button.btn.primary.small', { type: 'button', onclick: () => onPick(`${hour}:${min}`) }, t('pick.useTime'))));
    if (focusedKey) root.querySelector(`[data-key="${focusedKey}"]`)?.focus({ preventScroll: true });
  };
  render();
  return root;
}

// ---------------- the picker ----------------

/**
 * @param init {date, time, priority}
 * @returns {{ el, value, reset(), isDefault() }}
 */
export function createDuePicker(init = {}) {
  const st = { date: init.date ?? null, time: init.time ?? '', priority: init.priority ?? 'medium' };
  const el = h('div.due-picker');

  const set = (patch) => {
    Object.assign(st, patch);
    if (!st.date) st.time = '';
    render();
  };

  const chip = (key, label, isActive, onclick, extra = {}) =>
    h(`button.chip${isActive ? '.active' : ''}`, { type: 'button', 'aria-pressed': String(isActive), dataset: { key }, onclick, ...extra }, ...[].concat(label));

  function render() {
    const focusedKey = el.contains(document.activeElement) ? document.activeElement.dataset.key : null;
    const presets = datePresets();
    const presetHit = presets.findIndex((p) => p.value === st.date);
    const customDate = st.date && presetHit < 0;

    const dateRow = h('div.dp-row', { role: 'group', 'aria-label': t('pick.due') },
      h('span.dp-label', {}, icon('calendar'), t('pick.due')),
      h('div.dp-chips', {},
        ...presets.map((p, i) => chip(`d${i}`, p.label, i === presetHit, () => set({ date: p.value }))),
        chip('dcal', [icon('calendar'), customDate ? fmtShort(st.date) : t('pick.chooseDate')], customDate, (e) =>
          openPopover(e.currentTarget, calendar(st.date, (k) => { closePopover(); set({ date: k }); })),
        { 'aria-haspopup': 'dialog' })));

    const timeHit = TIME_PRESETS.indexOf(st.time);
    const customTime = st.time && timeHit < 0;
    const timeRow = st.date ? h('div.dp-row', { role: 'group', 'aria-label': t('pick.time') },
      h('span.dp-label', {}, icon('clock'), t('pick.time')),
      h('div.dp-chips', {},
        chip('t-all', t('pick.allDay'), !st.time, () => set({ time: '' })),
        ...TIME_PRESETS.map((t, i) => chip(`t${i}`, t, i === timeHit, () => set({ time: t }))),
        chip('tcustom', [icon('clock'), customTime ? st.time : t('pick.other')], customTime, (e) =>
          openPopover(e.currentTarget, timeGrid(st.time, (t) => { closePopover(); set({ time: t }); })),
        { 'aria-haspopup': 'dialog' }))) : null;

    const prioRow = h('div.dp-row', { role: 'group', 'aria-label': t('pick.priority') },
      h('span.dp-label', {}, icon('flag'), t('pick.priority')),
      h('div.dp-chips', {}, ...PRIORITIES.map((p) =>
        chip(`p-${p}`, [h(`span.dot.dot-${p}`), priorityLabel(p)], st.priority === p, () => set({ priority: p })))));

    let summary;
    if (st.date) {
      const due = { deadline: st.date, time: st.time };
      const rel = relativeLabel(due);
      summary = h(`p.dp-summary${isLate(due) ? '.late' : ''}`, {},
        t('pick.summaryLabel'), h('strong', {}, `${fmtShort(st.date)}${st.time ? ` · ${st.time}` : ''}`), ` — ${rel.toLowerCase()}`);
    } else {
      summary = h('p.dp-summary', {}, t('pick.noDue'));
    }

    el.replaceChildren(dateRow, timeRow || '', prioRow, summary);
    if (focusedKey) el.querySelector(`[data-key="${focusedKey}"]`)?.focus({ preventScroll: true });
  }

  render();
  return {
    el,
    get value() { return { deadline: st.date, time: st.date ? st.time : '', priority: st.priority }; },
    reset() { set({ date: null, time: '', priority: 'medium' }); },
    isDefault() { return !st.date && st.priority === 'medium'; },
    refresh: render, // re-render after a language change
  };
}

export { closePopover };
