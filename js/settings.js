// Settings dialog + quick theme popover.
import { state, updateSettings, subscribe, exportData, importData } from './state.js';
import { THEMES, resolveThemeId, themeName } from './themes.js';
import { GOOGLE_APPS, appName } from './google.js';
import { linksManager } from './links.js';
import { addMedia, listMedia, deleteMedia, isExtension } from './storage.js';
import { artUrl } from './backdrop.js';
import { t, LANGUAGES } from './i18n.js';
import { h, icon, toast, setupDialog, setupPopover } from './ui.js';

const SECTIONS = ['general', 'appearance', 'background', 'apps', 'links', 'notify', 'shortcuts', 'backup'];
const AREAS = ['clock', 'google', 'links', 'todo', 'history'];
const OVERLAYS = ['theme', 'none', 'rain', 'snow', 'petals', 'leaves', 'fireflies', 'dust', 'rays', 'bokeh'];

let current = 'general';
let linksMgr = null;

function toggle(label, checked, onchange, hint) {
  const id = `t-${Math.random().toString(36).slice(2, 8)}`;
  return h('div.setting-row', {},
    h('label', { for: id }, h('span', {}, label), hint ? h('span.muted.small.block', {}, hint) : null),
    h('span.switch', {},
      h('input', { id, type: 'checkbox', role: 'switch', checked, onchange: (e) => onchange(e.target.checked) }),
      h('span.switch-ui', { 'aria-hidden': 'true' })));
}

function radioGroup(name, legend, options, value, onchange) {
  return h('fieldset.radio-group', {},
    h('legend', {}, legend),
    ...options.map(([v, label]) => h('label.radio', {},
      h('input', { type: 'radio', name, value: v, checked: v === value, onchange: () => onchange(v) }),
      h('span', {}, label))));
}

function select(label, options, value, onchange) {
  const id = `s-${Math.random().toString(36).slice(2, 8)}`;
  return h('div.setting-row', {},
    h('label', { for: id }, label),
    h('select.field.auto', { id, onchange: (e) => onchange(e.target.value) },
      ...options.map(([v, l]) => h('option', { value: v, selected: String(v) === String(value) }, l))));
}

/** Artwork thumbnail when the theme has one; the gradient shows through if it fails to load. */
function swatchStyle(id) {
  const url = artUrl(id);
  return `background:${url ? `url("${url}") center/cover no-repeat, ` : ''}${THEMES[id].preview}`;
}

function themeCard(id, { onPick, activeId }) {
  return h(`button.theme-card${id === activeId ? '.active' : ''}`, {
    type: 'button', 'aria-pressed': String(id === activeId), onclick: () => onPick(id),
  }, h('span.theme-swatch', { style: swatchStyle(id) }), h('span', {}, themeName(id)));
}

// ---------------- sections ----------------

const builders = {
  general() {
    const s = state.settings;
    return [
      select(t('set.language'), [['auto', t('set.languageAuto')], ...Object.entries(LANGUAGES)], s.language,
        (v) => updateSettings((x) => { x.language = v; })),
      h('div.setting-row', {},
        h('label', { for: 'set-name' }, t('set.name'), h('span.muted.small.block', {}, t('set.nameHint'))),
        h('input.field.auto', { id: 'set-name', type: 'text', value: s.name, maxlength: '30', placeholder: t('set.namePh'), oninput: (e) => updateSettings((x) => { x.name = e.target.value.trim(); }) })),
      h('h3', {}, t('set.showHide')),
      ...AREAS.map((k) => toggle(t(`sec.${k}`), s.sections[k], (v) => updateSettings((x) => { x.sections[k] = v; }))),
      radioGroup('todo-side', t('set.todoSide'), [['left', t('set.left')], ['right', t('set.right')]], s.todoSide, (v) => updateSettings((x) => { x.todoSide = v; })),
    ];
  },

  appearance() {
    const s = state.settings;
    const ids = Object.keys(THEMES);
    const opts = ids.map((id) => [id, themeName(id)]);
    return [
      h('div.theme-grid', {}, ...ids.map((id) => themeCard(id, {
        activeId: resolveThemeId(s),
        onPick: (pick) => { updateSettings((x) => { x.theme = pick; x.themeMode = 'manual'; }); renderSection(); },
      }))),
      radioGroup('theme-mode', t('set.themeMode'), [['manual', t('mode.manualLong')], ['random', t('mode.randomLong')], ['time', t('mode.timeLong')]], s.themeMode,
        (v) => { updateSettings((x) => { x.themeMode = v; }); renderSection(); }),
      s.themeMode === 'time' ? h('div', {},
        select(t('set.dayTheme'), opts, s.dayTheme, (v) => updateSettings((x) => { x.dayTheme = v; })),
        select(t('set.nightTheme'), opts, s.nightTheme, (v) => updateSettings((x) => { x.nightTheme = v; }))) : null,
      toggle(t('set.battery'), s.batterySaver, (v) => updateSettings((x) => { x.batterySaver = v; }), t('set.batteryHint')),
    ];
  },

  background() {
    const wrap = h('div.media-grid');
    const refresh = async () => {
      let items = [];
      try { items = await listMedia(); } catch (err) { console.error(err); }
      const s = state.settings;
      const pick = (id) => { updateSettings((x) => { x.customBackground = id; }); refresh(); };
      wrap.replaceChildren(
        h(`button.media-card${!s.customBackground ? '.active' : ''}`, { type: 'button', 'aria-pressed': String(!s.customBackground), onclick: () => pick(null) },
          h('span.media-thumb.theme-thumb', { style: swatchStyle(resolveThemeId(s)) }), h('span', {}, t('bg.theme'))),
        ...items.map((m) => {
          const url = URL.createObjectURL(m.blob);
          const thumb = m.type.startsWith('video/')
            ? h('video.media-thumb', { src: url, muted: true, preload: 'metadata' })
            : h('img.media-thumb', { src: url, alt: '' });
          return h('div.media-item', {},
            h(`button.media-card${s.customBackground === m.id ? '.active' : ''}`, { type: 'button', 'aria-pressed': String(s.customBackground === m.id), onclick: () => pick(m.id) },
              thumb, h('span', { title: m.name }, m.name)),
            h('button.icon-btn.small.media-del', {
              type: 'button', 'aria-label': t('bg.deleteNamed', { name: m.name }),
              onclick: async () => {
                await deleteMedia(m.id);
                if (state.settings.customBackground === m.id) updateSettings((x) => { x.customBackground = null; });
                refresh();
              },
            }, icon('trash')));
        }),
      );
    };
    refresh();
    const input = h('input.sr-only', {
      id: 'media-upload', type: 'file', accept: 'video/mp4,video/webm,image/*',
      onchange: async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        if (file.size > 200 * 1024 * 1024) { toast(t('bg.tooBig')); return; }
        try {
          const item = await addMedia(file);
          updateSettings((x) => { x.customBackground = item.id; });
          toast(t('bg.added'));
          refresh();
        } catch (err) {
          console.error(err);
          toast(t('bg.saveFail'));
        }
      },
    });
    const s = state.settings;
    const dimId = 'set-dim';
    const themeId = resolveThemeId(s);
    return [
      h('p.muted.small', {}, t('bg.hint')),
      wrap,
      input,
      h('label.btn.ghost', { for: 'media-upload' }, icon('upload'), t('bg.upload')),
      h('h3', {}, t('bg.effects')),
      select(t('bg.overlay'), OVERLAYS.map((k) => [k, t(`fx.${k}`)]), s.overlayEffect, (v) => updateSettings((x) => { x.overlayEffect = v; })),
      h('div.setting-row', {},
        h('label', { for: dimId }, t('bg.dim'), h('span.muted.small.block', {}, t('bg.dimHint'))),
        h('input.range', {
          id: dimId, type: 'range', min: '0', max: '0.6', step: '0.05', value: String(s.artDim),
          oninput: (e) => updateSettings((x) => { x.artDim = Number(e.target.value); }),
        })),
      h('p.muted.small', {}, artUrl(themeId) ? t('bg.usingArt', { file: artUrl(themeId) }) : t('bg.noArt')),
    ];
  },

  apps() {
    const s = state.settings;
    return [
      h('p.muted.small', {}, t('apps.hint')),
      h('div.check-grid', {}, ...Object.keys(GOOGLE_APPS).map((id) => h('label.check-item', {},
        h('input', {
          type: 'checkbox', checked: s.apps.includes(id),
          onchange: (e) => updateSettings((x) => {
            const set = new Set(x.apps);
            e.target.checked ? set.add(id) : set.delete(id);
            x.apps = Object.keys(GOOGLE_APPS).filter((k) => set.has(k));
          }),
        }),
        h('span', {}, appName(id))))),
    ];
  },

  links() {
    linksMgr = linksManager();
    return [linksMgr.el];
  },

  notify() {
    const s = state.settings;
    const leads = [[15, t('span.min', { n: 15 })], [30, t('span.min', { n: 30 })], [60, t('span.hour', { n: 1 })], [120, t('span.hour', { n: 2 })], [1440, t('span.day', { n: 1 })]];
    return [
      !isExtension ? h('p.notice', {}, t('notify.outside')) : null,
      toggle(t('notify.remind'), s.notifications.enabled, (v) => updateSettings((x) => { x.notifications.enabled = v; }), t('notify.remindHint')),
      select(t('notify.lead'), leads, s.notifications.leadMinutes, (v) => updateSettings((x) => { x.notifications.leadMinutes = Number(v); })),
      toggle(t('notify.badge'), s.badge, (v) => updateSettings((x) => { x.badge = v; })),
    ];
  },

  shortcuts() {
    const rows = [['/', 'sc.search'], ['T', 'sc.todo'], ['Shift + T', 'sc.theme'], [',', 'sc.settings'], ['Esc', 'sc.esc']];
    return [h('table.shortcuts', {}, h('tbody', {}, ...rows.map(([k, d]) => h('tr', {}, h('td', {}, h('kbd', {}, k)), h('td', {}, t(d))))))];
  },

  backup() {
    const input = h('input.sr-only', {
      id: 'import-file', type: 'file', accept: 'application/json,.json',
      onchange: async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
          const data = JSON.parse(await file.text());
          if (!confirm(t('backup.confirm'))) return;
          await importData(data);
          toast(t('backup.imported'));
        } catch (err) {
          toast(t('backup.importFail', { msg: err.message }));
        }
      },
    });
    return [
      h('p.muted.small', {}, t('backup.hint')),
      h('div.row', {},
        h('button.btn.primary', {
          type: 'button',
          onclick: () => {
            const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
            const a = h('a', { href: URL.createObjectURL(blob), download: `drizzle-tab-${new Date().toISOString().slice(0, 10)}.json` });
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          },
        }, icon('download'), t('backup.export')),
        input,
        h('label.btn.ghost', { for: 'import-file' }, icon('upload'), t('backup.import'))),
    ];
  },
};

function renderSection() {
  const nav = document.getElementById('settings-nav');
  nav.replaceChildren(...SECTIONS.map((id) => h(`button.nav-item${id === current ? '.active' : ''}`, {
    type: 'button', 'aria-current': id === current ? 'page' : null,
    onclick: () => { current = id; renderSection(); },
  }, t(`set.${id}`))));
  linksMgr = null;
  const body = document.getElementById('settings-body');
  body.replaceChildren(h('h3.section-title', {}, t(`set.${current}`)), ...builders[current]().filter(Boolean));
}

export function openSettings(section = 'general') {
  current = section;
  renderSection();
  const dialog = document.getElementById('settings-dialog');
  if (!dialog.open) dialog.showModal();
}

/** Re-render the open dialog after a language change. */
export function refreshSettingsLanguage() {
  if (document.getElementById('settings-dialog').open) renderSection();
  if (!document.getElementById('theme-popover').hidden) renderThemePopover();
}

function renderThemePopover() {
  const pop = document.getElementById('theme-popover');
  const s = state.settings;
  const modes = ['manual', 'random', 'time'];
  pop.replaceChildren(
    h('p.popover-title', {}, t('theme.title')),
    h('div.theme-list', {}, ...Object.keys(THEMES).map((id) => themeCard(id, {
      activeId: resolveThemeId(s),
      onPick: (pick) => { updateSettings((x) => { x.theme = pick; x.themeMode = 'manual'; }); renderThemePopover(); },
    }))),
    h('div.segmented', { role: 'group', 'aria-label': t('set.themeMode') }, ...modes.map((v) => h(`button${s.themeMode === v ? '.active' : ''}`, {
      type: 'button', 'aria-pressed': String(s.themeMode === v),
      onclick: () => { updateSettings((x) => { x.themeMode = v; }); renderThemePopover(); },
    }, t(`mode.${v}`)))),
  );
}

export function cycleTheme() {
  const ids = Object.keys(THEMES);
  const next = ids[(ids.indexOf(resolveThemeId(state.settings)) + 1) % ids.length];
  updateSettings((x) => { x.theme = next; x.themeMode = 'manual'; });
  toast(t('theme.toast', { name: themeName(next) }));
}

export function initSettings() {
  const dialog = document.getElementById('settings-dialog');
  setupDialog(dialog);
  document.getElementById('settings-btn').addEventListener('click', () => openSettings(current));
  setupPopover(document.getElementById('theme-btn'), document.getElementById('theme-popover'), renderThemePopover);
  subscribe((kind) => {
    if (kind === 'links' && linksMgr && dialog.open) linksMgr.render();
  });
}
