import { countOverdue, deadlineStatus, dueDate, reminderTime, relativeLabel } from './js/todo-logic.js';
import { t as tr, setLanguage, resolveLanguage } from './js/i18n.js';

const ALARM = 'drizzle-check';

async function getSetting() {
  try {
    const { settings } = await chrome.storage.sync.get('settings');
    if (settings) return settings;
  } catch { /* fall through */ }
  const { settings } = await chrome.storage.local.get('settings');
  return settings || {};
}

async function refresh() {
  const [{ todos = [], notified = {} }, settings] = await Promise.all([
    chrome.storage.local.get(['todos', 'notified']),
    getSetting(),
  ]);
  const now = new Date();
  setLanguage(resolveLanguage(settings.language || 'auto'));

  // Badge: number of overdue tasks.
  const showBadge = settings.badge !== false;
  const overdue = countOverdue(todos, now);
  await chrome.action.setBadgeText({ text: showBadge && overdue ? String(overdue) : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#e5484d' });

  // Deadline reminders.
  const notif = settings.notifications || {};
  if (!notif.enabled) return;
  const lead = Number(notif.leadMinutes) || 60;
  let changed = false;
  for (const task of todos) {
    if (task.done || task.hidden || !task.deadline) continue;
    const key = `${task.deadline}T${task.time || ''}`;
    if (notified[task.id] === key) continue;
    const at = reminderTime(task, lead);
    if (!at || now < at || deadlineStatus(task, now) === 'overdue' || now > dueDate(task)) continue;
    chrome.notifications.create(`todo:${task.id}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: tr('notif.title', { title: task.title }),
      message: relativeLabel(task, now) + (task.time ? tr('notif.at', { time: task.time }) : ''),
      priority: task.priority === 'high' ? 2 : 0,
    });
    notified[task.id] = key;
    changed = true;
  }
  if (changed) await chrome.storage.local.set({ notified });
}

function setup() {
  chrome.alarms.create(ALARM, { periodInMinutes: 5 });
  refresh();
}

chrome.runtime.onInstalled.addListener(setup);
chrome.runtime.onStartup.addListener(setup);
chrome.alarms.onAlarm.addListener((a) => { if (a.name === ALARM) refresh(); });
chrome.storage.onChanged.addListener((changes) => {
  if (changes.todos || changes.settings) refresh();
});
chrome.notifications.onClicked.addListener((id) => {
  chrome.notifications.clear(id);
  chrome.tabs.create({});
});
