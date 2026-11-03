// Tiny DOM helpers shared by all widgets.

/** h('button.btn.primary', { onclick }, 'Text', child) */
export function h(tag, props = {}, ...children) {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export function icon(name, cls = 'icon') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

let toastTimer;
export function toast(message, action) {
  const el = document.getElementById('toast');
  el.replaceChildren(h('span', {}, message));
  if (action) {
    el.append(h('button.btn.ghost.small', { type: 'button', onclick: () => { action.run(); el.classList.remove('show'); } }, action.label));
  }
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), action ? 6000 : 3500);
}

export function faviconUrl(url, size = 64) {
  try {
    return `https://www.google.com/s2/favicons?sz=${size}&domain_url=${encodeURIComponent(new URL(url).origin)}`;
  } catch {
    return '';
  }
}

/** Image with a letter avatar fallback when the favicon cannot be loaded. */
export function favicon(url, label, size = 32) {
  const wrap = h('span.favicon', { style: `--size:${size}px` });
  const letter = (label || '?').trim().charAt(0).toUpperCase();
  const img = h('img', { src: faviconUrl(url), alt: '', width: size, height: size, loading: 'lazy', decoding: 'async' });
  img.addEventListener('error', () => img.replaceWith(h('span.favicon-letter', {}, letter)));
  wrap.append(img);
  return wrap;
}

/** Popover open/close with outside click + Escape. */
export function setupPopover(button, popover, onOpen) {
  const close = () => {
    popover.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = popover.hidden;
    document.querySelectorAll('.popover').forEach((p) => { p.hidden = true; });
    document.querySelectorAll('[aria-haspopup]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (open) {
      onOpen?.();
      popover.hidden = false;
      button.setAttribute('aria-expanded', 'true');
    }
  });
  document.addEventListener('click', (e) => { if (!popover.hidden && !popover.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !popover.hidden) { close(); button.focus(); } });
  return close;
}

/** Close dialogs from [data-close] buttons and backdrop clicks. */
export function setupDialog(dialog) {
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
  });
}
