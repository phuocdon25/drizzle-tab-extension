// Quick links: max 8, add / edit / delete, drag & drop reorder (plus keyboard alternative in the dialog).
import { state, setLinks, uid, MAX_LINKS } from './state.js';
import { h, icon, favicon, setupDialog } from './ui.js';
import { t } from './i18n.js';

let editingId = null;
let dragId = null;

export function normalizeUrl(raw) {
  let s = raw.trim();
  if (!s) return null;
  if (!/^[a-z][\w+.-]*:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.') && u.hostname !== 'localhost') return null;
    return u.toString();
  } catch {
    return null;
  }
}

function titleFromUrl(url) {
  const host = new URL(url).hostname.replace(/^www\./, '');
  const base = host.split('.')[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function move(id, delta) {
  const links = [...state.links];
  const i = links.findIndex((l) => l.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= links.length) return;
  [links[i], links[j]] = [links[j], links[i]];
  setLinks(links);
}

export function renderLinks() {
  const ul = document.getElementById('links');
  const items = state.links.map((link) =>
    h('li.link-item', {
      draggable: 'true',
      dataset: { id: link.id },
      ondragstart: (e) => { dragId = link.id; e.dataTransfer.effectAllowed = 'move'; e.currentTarget.classList.add('dragging'); },
      ondragend: (e) => { dragId = null; e.currentTarget.classList.remove('dragging'); },
      ondragover: (e) => { if (dragId) { e.preventDefault(); e.currentTarget.classList.add('drop-target'); } },
      ondragleave: (e) => e.currentTarget.classList.remove('drop-target'),
      ondrop: (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drop-target');
        if (!dragId || dragId === link.id) return;
        const links = [...state.links];
        const from = links.findIndex((l) => l.id === dragId);
        const to = links.findIndex((l) => l.id === link.id);
        links.splice(to, 0, links.splice(from, 1)[0]);
        setLinks(links);
      },
    },
    h('a.link-tile', { href: link.url, title: link.url, draggable: 'false' },
      h('span.link-icon', {}, favicon(link.url, link.title, 28)),
      h('span.link-label', {}, link.title)),
    h('button.link-edit', { type: 'button', 'aria-label': t('link.editNamed', { name: link.title }), onclick: () => openLinkDialog(link.id) }, icon('pencil'))),
  );
  if (state.links.length < MAX_LINKS) {
    items.push(h('li.link-item',
      {},
      h('button.link-tile.link-add', { type: 'button', onclick: () => openLinkDialog(null) },
        h('span.link-icon', {}, icon('plus')),
        h('span.link-label', {}, t('link.add')))));
  }
  ul.replaceChildren(...items);
}

export function openLinkDialog(id) {
  const dialog = document.getElementById('link-dialog');
  const link = state.links.find((l) => l.id === id);
  editingId = link ? link.id : null;
  if (!link && state.links.length >= MAX_LINKS) return;
  document.getElementById('link-dialog-title').textContent = t(link ? 'link.edit' : 'link.add');
  document.getElementById('link-title').value = link?.title || '';
  document.getElementById('link-url').value = link?.url || '';
  document.getElementById('link-error').textContent = '';
  document.getElementById('link-delete').hidden = !link;
  dialog.showModal();
  document.getElementById(link ? 'link-title' : 'link-url').focus();
}

export function initLinks() {
  const dialog = document.getElementById('link-dialog');
  setupDialog(dialog);
  document.getElementById('link-form').addEventListener('submit', (e) => {
    const url = normalizeUrl(document.getElementById('link-url').value);
    if (!url) {
      e.preventDefault();
      document.getElementById('link-error').textContent = t('link.invalid');
      document.getElementById('link-url').focus();
      return;
    }
    const title = document.getElementById('link-title').value.trim() || titleFromUrl(url);
    const links = [...state.links];
    if (editingId) {
      const i = links.findIndex((l) => l.id === editingId);
      links[i] = { ...links[i], title, url };
    } else {
      links.push({ id: uid(), title, url });
    }
    setLinks(links.slice(0, MAX_LINKS));
  });
  document.getElementById('link-delete').addEventListener('click', () => {
    setLinks(state.links.filter((l) => l.id !== editingId));
    dialog.close();
  });
}

/** Management list used inside the settings dialog (includes keyboard reordering). */
export function linksManager() {
  const list = h('ul.manage-list');
  const render = () => {
    list.replaceChildren(...state.links.map((l, i) =>
      h('li.manage-row', {},
        favicon(l.url, l.title, 20),
        h('span.grow', {}, h('strong', {}, l.title), h('span.muted.small.block', {}, l.url)),
        h('button.icon-btn.small', { type: 'button', 'aria-label': t('link.moveLeft', { name: l.title }), disabled: i === 0, onclick: () => { move(l.id, -1); render(); } }, icon('chevron-left')),
        h('button.icon-btn.small', { type: 'button', 'aria-label': t('link.moveRight', { name: l.title }), disabled: i === state.links.length - 1, onclick: () => { move(l.id, 1); render(); } }, icon('chevron-right')),
        h('button.icon-btn.small', { type: 'button', 'aria-label': t('link.editNamed', { name: l.title }), onclick: () => openLinkDialog(l.id) }, icon('pencil')),
        h('button.icon-btn.small', { type: 'button', 'aria-label': t('link.deleteNamed', { name: l.title }), onclick: () => { setLinks(state.links.filter((x) => x.id !== l.id)); render(); } }, icon('trash')))));
  };
  render();
  return {
    el: h('div', {},
      h('p.muted.small', {}, t('link.managerHint', { max: MAX_LINKS })),
      list,
      h('button.btn.ghost', { type: 'button', onclick: () => openLinkDialog(null) }, icon('plus'), t('link.add'))),
    render,
  };
}
