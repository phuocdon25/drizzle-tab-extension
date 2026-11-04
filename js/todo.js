// Todo list with deadlines, priority, colour by urgency, filters.
import { state, setTodos, uid } from './state.js';
import { h, icon, toast } from './ui.js';
import { t } from './i18n.js';
import { compareDisplayOrder, reorderTodos, deadlineStatus, relativeLabel, dateKey, priorityLabel } from './todo-logic.js';
import { createDuePicker, fmtShort, closePopover } from './picker.js';

const FILTERS = ['today', 'upcoming', 'overdue', 'all', 'done'];

let filter = 'all'; // default tab
let editingId = null;
let draggedId = null;
let reordering = false;
let composerPicker = null;
let composerNote = null;

const visible = () => state.todos.filter((task) => !task.hidden);

function applyFilter(id, now) {
  const today = dateKey(now);
  const v = visible();
  switch (id) {
    // Today includes tasks due today and anything already overdue.
    case 'today': return v
      .filter((task) => !task.done && (task.deadline === today || deadlineStatus(task, now) === 'overdue'))
      .sort((a, b) => compareDisplayOrder(a, b, now));
    case 'upcoming': return v.filter((task) => !task.done && task.deadline && task.deadline > today).sort((a, b) => compareDisplayOrder(a, b, now));
    case 'overdue': return v.filter((task) => deadlineStatus(task, now) === 'overdue').sort((a, b) => compareDisplayOrder(a, b, now));
    case 'done': return v.filter((task) => task.done).sort((a, b) => compareDisplayOrder(a, b, now));
    default: { // 'all' = open tasks first, then completed ones (shown under a divider)
      const open = v.filter((task) => !task.done).sort((a, b) => compareDisplayOrder(a, b, now));
      const done = v.filter((task) => task.done).sort((a, b) => compareDisplayOrder(a, b, now));
      return [...open, ...done];
    }
  }
}

function moveTask(sourceId, target, after) {
  if (!reordering) return;
  const reordered = reorderTodos(state.todos, sourceId, target.id, after);
  if (reordered !== state.todos) setTodos(reordered);
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

/** Text with URLs turned into links (built from text nodes, so user content is never parsed as HTML). */
function linkify(text) {
  const parts = [];
  const re = /\bhttps?:\/\/[^\s<>"')]+/gi;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(h('a', { href: m[0], target: '_blank', rel: 'noopener noreferrer', onclick: (e) => e.stopPropagation() }, m[0]));
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/**
 * Optional note: a small "Note" chip that expands into an auto-growing textarea.
 * Ctrl/⌘ + Enter submits the surrounding form.
 */
function noteField(initial = '') {
  const area = h('textarea.field.note-input', {
    rows: '2', maxlength: '2000', placeholder: t('note.placeholder'), 'aria-label': t('note.label'),
    oninput: () => grow(),
    onkeydown: (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); area.form?.requestSubmit(); } },
  });
  area.value = initial;
  const grow = () => { area.style.height = 'auto'; area.style.height = `${Math.min(area.scrollHeight, 160)}px`; };
  const chip = h('button.chip.note-chip', { type: 'button', onclick: () => expand(true) }, icon('note'), t('note.add'));
  const el = h('div.note-field', {}, chip, area);
  const expand = (focus) => {
    el.classList.add('open');
    requestAnimationFrame(grow);
    if (focus) area.focus();
  };
  if (initial) expand(false);
  return {
    el,
    get value() { return area.value.trim(); },
    reset() { area.value = ''; el.classList.remove('open'); },
    refresh() { area.placeholder = t('note.placeholder'); area.setAttribute('aria-label', t('note.label')); chip.lastChild.textContent = t('note.add'); },
  };
}

function editForm(task) {
  const title = h('input.field', { type: 'text', value: task.title, 'aria-label': t('todo.inputLabel'), maxlength: '200' });
  const picker = createDuePicker({ date: task.deadline, time: task.time, priority: task.priority });
  const note = noteField(task.note || '');
  const cancel = () => { editingId = null; closePopover(); renderTodos(); };
  const save = (e) => {
    e.preventDefault();
    const name = title.value.trim();
    if (!name) { title.focus(); return; }
    editingId = null;
    closePopover();
    update(task.id, { title: name, note: note.value, ...picker.value });
  };
  const form = h('form.todo-edit', { onsubmit: save, onkeydown: (e) => { if (e.key === 'Escape') { e.stopPropagation(); cancel(); } } },
    title,
    picker.el,
    note.el,
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
  return h(`li.todo-item.st-${status}.pr-${task.priority}`, { dataset: { id: task.id },
    ondragover: (e) => {
      const source = state.todos.find((item) => item.id === draggedId);
      if (!source || source.done !== task.done || source.id === task.id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const after = e.clientY > e.currentTarget.getBoundingClientRect().top + e.currentTarget.offsetHeight / 2;
      e.currentTarget.classList.toggle('drop-before', !after);
      e.currentTarget.classList.toggle('drop-after', after);
    },
    ondragleave: (e) => e.currentTarget.classList.remove('drop-before', 'drop-after'),
    ondrop: (e) => {
      e.preventDefault();
      const after = e.currentTarget.classList.contains('drop-after');
      e.currentTarget.classList.remove('drop-before', 'drop-after');
      moveTask(draggedId, task, after);
    },
  },
    reordering ? h('button.todo-drag', {
      type: 'button', draggable: true, title: t('todo.reorder'), 'aria-label': t('todo.reorder'),
      ondragstart: (e) => { draggedId = task.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', task.id); },
      ondragend: () => { draggedId = null; document.querySelectorAll('.drop-before, .drop-after').forEach((el) => el.classList.remove('drop-before', 'drop-after')); },
      onkeydown: (e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        const items = applyFilter(filter, new Date()).filter((item) => item.done === task.done);
        const target = items[items.findIndex((item) => item.id === task.id) + (e.key === 'ArrowUp' ? -1 : 1)];
        if (target) { moveTask(task.id, target, e.key === 'ArrowDown'); document.querySelector(`[data-id="${task.id}"] .todo-drag`)?.focus(); }
      },
    }, '⠿') : null,
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
        h(`span.prio.prio-${task.priority}`, {}, priorityLabel(task.priority))),
      task.note ? h('p.todo-note', {
        title: t('note.expand'),
        onclick: (e) => e.currentTarget.classList.toggle('expanded'),
        ondblclick: (e) => e.stopPropagation(),
      }, ...linkify(task.note)) : null),
    h('div.todo-actions', {},
      h('button.icon-btn.small', { type: 'button', 'aria-label': t('todo.editNamed', { title: task.title }), onclick: edit }, icon('pencil')),
      h('button.icon-btn.small', { type: 'button', 'aria-label': t('todo.deleteNamed', { title: task.title }), onclick: () => remove(task.id) }, icon('trash'))));
}

export function renderTodos() {
  const now = new Date();
  const tabs = document.getElementById('todo-filters');
  tabs.replaceChildren(...FILTERS.map((id) => {
    const n = applyFilter(id, now).length; // "All" counts everything it lists (open + done)
    return h(`button.tab${id === filter ? '.active' : ''}${id === 'overdue' && n ? '.alert' : ''}`, {
      type: 'button', role: 'tab', 'aria-selected': String(id === filter),
      onclick: () => { filter = id; renderTodos(); },
    }, t(`filter.${id}`), n ? h('span.count', {}, String(n)) : null);
  }));

  const items = applyFilter(filter, now);
  const ul = document.getElementById('todo-list');
  ul.classList.toggle('reordering', reordering);
  const reorderToggle = document.getElementById('todo-reorder-toggle');
  reorderToggle.textContent = t(reordering ? 'todo.reorderFinish' : 'todo.reorderStart');
  reorderToggle.setAttribute('aria-pressed', String(reordering));
  const rows = [];
  items.forEach((task, i) => {
    if (filter === 'all' && task.done && !items[i - 1]?.done) {
      rows.push(h('li.todo-divider', { role: 'separator' }, h('span', {}, `${t('filter.done')} (${items.length - i})`)));
    }
    rows.push(todoItem(task, now));
  });
  ul.replaceChildren(...(items.length
    ? rows
    : [h('li.empty', {}, icon(filter === 'done' ? 'history' : 'check', 'icon empty-icon'), h('span', {}, t(`empty.${filter}`)))]));

  const open = visible().filter((task) => !task.done).length;
  const overdue = applyFilter('overdue', now).length;
  document.getElementById('todo-summary').textContent = t('todo.summary', { open, overdue });
  document.getElementById('todo-clear-done').hidden = filter !== 'done' || !items.length;
}

/** Re-render everything that holds translated text (called after a language change). */
export function refreshTodoLanguage() {
  composerPicker?.refresh();
  composerNote?.refresh();
  renderTodos();
}

export function focusTodoInput() {
  const input = document.getElementById('todo-input');
  input.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  input.focus();
}

export function initTodos() {
  document.getElementById('todo-reorder-toggle').addEventListener('click', () => {
    reordering = !reordering;
    draggedId = null;
    renderTodos();
  });
  const form = document.getElementById('todo-form');
  const input = document.getElementById('todo-input');
  const picker = createDuePicker();
  const note = noteField();
  composerPicker = picker;
  composerNote = note;
  const composer = document.getElementById('todo-composer');
  composer.prepend(picker.el, note.el);

  // The picker opens while composing a task and folds away when nothing has been entered.
  const open = () => form.classList.add('composing');
  const foldIfEmpty = () => { if (!input.value.trim() && !note.value && picker.isDefault()) form.classList.remove('composing'); };
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
      note: note.value,
      ...picker.value,
      done: false,
      hidden: false,
      createdAt: Date.now(),
      completedAt: null,
    };
    setTodos([...state.todos, todo]);
    input.value = '';
    picker.reset();
    note.reset();
    closePopover();
    // Make sure the new task is visible: jump to "All" if the current tab would hide it.
    if (!applyFilter(filter, new Date()).some((x) => x.id === todo.id)) filter = 'all';
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
