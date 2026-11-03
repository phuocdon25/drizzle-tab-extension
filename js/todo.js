// Todo list with deadlines, priority, colour by urgency, filters.
import { state, setTodos, uid } from './state.js';
import { h, icon, toast } from './ui.js';
import { t } from './i18n.js';
import { compareTodos, deadlineStatus, relativeLabel, dateKey, priorityLabel } from './todo-logic.js';
import { createDuePicker, fmtShort, closePopover } from './picker.js';

const FILTERS = ['today', 'upcoming', 'overdue', 'all', 'done'];

let filter = 'all';
let editingId = null;
let composerPicker = null;

const visible = () => state.todos.filter((task) => !task.hidden);

function applyFilter(id, now) {
  const today = dateKey(now);
  const v = visible();
  switch (id) {
    case 'today': return v.filter((task) => !task.done && task.deadline === today);
    case 'upcoming': return v.filter((task) => !task.done && task.deadline && task.deadline > today);
    case 'overdue': return v.filter((task) => deadlineStatus(task, now) === 'overdue');
    case 'done': return v.filter((task) => task.done).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    default: {
      const open = v.filter((task) => !task.done).sort((a, b) => compareTodos(a, b, now));
      const done = v.filter((task) => task.done).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
      return [...open, ...done];
    }
  }
}

function formatDeadline(task) {
  if (!task.deadline) return '';
  const s = fmtShort(task.deadline);
  return task.time ? `${s} · ${task.time}` : s;
}

function update(id, patch) {
  setTodos(state.todos.map((task) => (task.id === id ? { ...task, ...patch } : task)));
}

export function toggleDone(id) {
  const task = state.todos.find((x) => x.id === id);
  update(id, task.done ? { done: false, completedAt: null } : { done: true, completedAt: Date.now() });
}

/** Completed tasks are only hidden (kept for history); open tasks are really deleted, with undo. */
function remove(id) {
  const task = state.todos.find((x) => x.id === id);
  if (task.done) {
    update(id, { hidden: true });
    toast(t('todo.hiddenToast'), { label: t('common.undo'), run: () => update(id, { hidden: false }) });
  } else {
    const before = state.todos;
    setTodos(state.todos.filter((x) => x.id !== id));
    toast(t('todo.deletedToast'), { label: t('common.undo'), run: () => setTodos(before) });
  }
}

function editForm(task) {
  const title = h('input.field', { type: 'text', value: task.title, 'aria-label': t('todo.inputLabel'), maxlength: '200' });
  const picker = createDuePicker({ date: task.deadline, time: task.time, priority: task.priority });
  const cancel = () => { editingId = null; closePopover(); renderTodos(); };
  const save = (e) => {
    e.preventDefault();
    const name = title.value.trim();
    if (!name) { title.focus(); return; }
    editingId = null;
    closePopover();
    update(task.id, { title: name, ...picker.value });
  };
  const form = h('form.todo-edit', { onsubmit: save, onkeydown: (e) => { if (e.key === 'Escape') { e.stopPropagation(); cancel(); } } },
    title,
    picker.el,
    h('div.row-end', {},
      h('button.btn.ghost.small', { type: 'button', onclick: cancel }, t('common.cancel')),
      h('button.btn.primary.small', { type: 'submit' }, t('common.save'))));
  queueMicrotask(() => title.focus());
  return form;
}

function todoItem(task, now) {
  if (editingId === task.id) return h('li.todo-item.editing', {}, editForm(task));
  const status = deadlineStatus(task, now);
  const label = task.done
    ? t('todo.doneOn', { date: t('fmt.doneOn', new Date(task.completedAt)) })
    : relativeLabel(task, now);
  const edit = () => { editingId = task.id; renderTodos(); };
  return h(`li.todo-item.st-${status}.pr-${task.priority}`, { dataset: { id: task.id } },
    h('button.check', {
      type: 'button', role: 'checkbox', 'aria-checked': String(!!task.done),
      'aria-label': t(task.done ? 'todo.markUndone' : 'todo.markDone', { title: task.title }),
      onclick: () => toggleDone(task.id),
    }, icon('check')),
    h('div.todo-main', { ondblclick: edit },
      h('span.todo-title', {}, task.title),
      h('span.todo-meta', {},
        h('span.due', {}, label),
        task.deadline ? h('span.muted', {}, formatDeadline(task)) : null,
        h(`span.prio.prio-${task.priority}`, {}, priorityLabel(task.priority)))),
    h('div.todo-actions', {},
      h('button.icon-btn.small', { type: 'button', 'aria-label': t('todo.editNamed', { title: task.title }), onclick: edit }, icon('pencil')),
      h('button.icon-btn.small', { type: 'button', 'aria-label': t('todo.deleteNamed', { title: task.title }), onclick: () => remove(task.id) }, icon('trash'))));
}

export function renderTodos() {
  const now = new Date();
  const tabs = document.getElementById('todo-filters');
  tabs.replaceChildren(...FILTERS.map((id) => {
    const n = applyFilter(id, now).length;
    return h(`button.tab${id === filter ? '.active' : ''}${id === 'overdue' && n ? '.alert' : ''}`, {
      type: 'button', role: 'tab', 'aria-selected': String(id === filter),
      onclick: () => { filter = id; renderTodos(); },
    }, t(`filter.${id}`), n ? h('span.count', {}, String(n)) : null);
  }));

  const items = applyFilter(filter, now);
  const ul = document.getElementById('todo-list');
  ul.replaceChildren(...(items.length
    ? items.map((task) => todoItem(task, now))
    : [h('li.empty', {}, icon(filter === 'done' ? 'history' : 'check', 'icon empty-icon'), h('span', {}, t(`empty.${filter}`)))]));

  const open = visible().filter((task) => !task.done).length;
  const overdue = applyFilter('overdue', now).length;
  document.getElementById('todo-summary').textContent = t('todo.summary', { open, overdue });
  document.getElementById('todo-clear-done').hidden = filter !== 'done' || !items.length;
}

/** Re-render everything that holds translated text (called after a language change). */
export function refreshTodoLanguage() {
  composerPicker?.refresh();
  renderTodos();
}

export function focusTodoInput() {
  const input = document.getElementById('todo-input');
  input.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  input.focus();
}

export function initTodos() {
  const form = document.getElementById('todo-form');
  const input = document.getElementById('todo-input');
  const picker = createDuePicker();
  composerPicker = picker;
  document.getElementById('todo-composer').prepend(picker.el);

  // The picker opens while composing a task and folds away when nothing has been entered.
  const open = () => form.classList.add('composing');
  const foldIfEmpty = () => { if (!input.value.trim() && picker.isDefault()) form.classList.remove('composing'); };
  input.addEventListener('focus', open);
  input.addEventListener('input', open);
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !input.value) { form.classList.remove('composing'); input.blur(); } });
  document.addEventListener('pointerdown', (e) => {
    if (!form.contains(e.target) && !e.target.closest('.dt-popover')) foldIfEmpty();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = input.value.trim();
    if (!title) { input.focus(); return; }
    const todo = {
      id: uid(),
      title,
      ...picker.value,
      done: false,
      hidden: false,
      createdAt: Date.now(),
      completedAt: null,
    };
    setTodos([...state.todos, todo]);
    input.value = '';
    picker.reset();
    closePopover();
    if (filter === 'done') filter = 'all';
    renderTodos();
    input.focus();
  });
  document.getElementById('todo-clear-done').addEventListener('click', () => {
    const ids = new Set(visible().filter((task) => task.done).map((task) => task.id));
    const before = state.todos;
    setTodos(state.todos.map((task) => (ids.has(task.id) ? { ...task, hidden: true } : task)));
    toast(t('todo.clearedToast', { n: ids.size }), { label: t('common.undo'), run: () => setTodos(before) });
  });
  // Refresh relative labels ("3 hours left") every minute.
  setInterval(() => { if (!editingId && !document.hidden) renderTodos(); }, 60000);
}
