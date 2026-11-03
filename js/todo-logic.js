// Pure todo/date logic, shared by the new tab page and the background service worker.
import { t } from './i18n.js';

export const DAY_MS = 86400000;
export const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
export const PRIORITIES = ['high', 'medium', 'low'];
export const priorityLabel = (p) => t(`prio.${p}`);

export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole days from key a to key b (b - a). Rounded so DST shifts don't matter. */
export function daysBetween(a, b) {
  return Math.round((parseDateKey(b) - parseDateKey(a)) / DAY_MS);
}

export function addDays(key, n) {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** Moment the task is due. Date-only deadlines are due at the end of that day. */
export function dueDate(todo) {
  if (!todo.deadline) return null;
  const d = parseDateKey(todo.deadline);
  if (todo.time) {
    const [h, m] = todo.time.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  } else {
    d.setHours(23, 59, 59, 999);
  }
  return d;
}

/** 'done' | 'none' | 'overdue' | 'today' | 'soon' (≤3 days) | 'later' */
export function deadlineStatus(todo, now = new Date()) {
  if (todo.done) return 'done';
  if (!todo.deadline) return 'none';
  if (now > dueDate(todo)) return 'overdue';
  const diff = daysBetween(dateKey(now), todo.deadline);
  if (diff === 0) return 'today';
  if (diff <= 3) return 'soon';
  return 'later';
}

function formatSpan(mins) {
  if (mins < 60) return t('span.min', { n: mins });
  if (mins < 60 * 24) return t('span.hour', { n: Math.floor(mins / 60) });
  return t('span.day', { n: Math.floor(mins / 1440) });
}

/** Human label such as "2 days left", "1 day late", "3 hours left" (localized). */
export function relativeLabel(todo, now = new Date()) {
  if (!todo.deadline) return t('rel.none');
  const diff = daysBetween(dateKey(now), todo.deadline);
  if (diff < 0) return t('rel.daysLate', { n: -diff });
  if (diff === 0) {
    if (!todo.time) return t('rel.today');
    const mins = Math.round((dueDate(todo) - now) / 60000);
    return mins < 0 ? t('rel.late', { span: formatSpan(-mins) }) : t('rel.left', { span: formatSpan(Math.max(mins, 1)) });
  }
  return t('rel.daysLeft', { n: diff });
}

/** True when the deadline moment has passed. */
export const isLate = (todo, now = new Date()) => !!todo.deadline && now > dueDate(todo);

/** Overdue first → nearest deadline → priority → time → creation order. No deadline goes last. */
export function compareTodos(a, b, now = new Date()) {
  const oa = deadlineStatus(a, now) === 'overdue' ? 0 : 1;
  const ob = deadlineStatus(b, now) === 'overdue' ? 0 : 1;
  if (oa !== ob) return oa - ob;
  if (a.deadline && !b.deadline) return -1;
  if (!a.deadline && b.deadline) return 1;
  if (a.deadline && b.deadline && a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1;
  const p = (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
  if (p) return p;
  if (a.deadline && b.deadline) {
    const t = dueDate(a) - dueDate(b);
    if (t) return t;
  }
  return (a.createdAt || 0) - (b.createdAt || 0);
}

export function countOverdue(todos, now = new Date()) {
  return todos.filter((t) => !t.hidden && deadlineStatus(t, now) === 'overdue').length;
}

/** When to fire a reminder: `leadMinutes` before a timed deadline, 9:00 on the day for date-only ones. */
export function reminderTime(todo, leadMinutes) {
  if (!todo.deadline) return null;
  if (todo.time) return new Date(dueDate(todo).getTime() - leadMinutes * 60000);
  const d = parseDateKey(todo.deadline);
  d.setHours(9, 0, 0, 0);
  return d;
}
