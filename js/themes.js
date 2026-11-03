import { t } from './i18n.js';

// A theme = background (illustration in backgrounds/ + animated effects, or a procedural
// canvas scene as fallback) + palette + font + panel style (opacity, radius, blur).
// Display names are translated via themeName(id) (keys theme.<id> in js/locales).
// `effects` are the default overlay effects; backgrounds/index.json can override them
// with effects positioned on the artwork (lamp glow, tea steam...).

export const THEMES = {
  'rainy-city': {
    mode: 'night',
    scene: 'rain',
    effects: [{ type: 'rain', intensity: 1 }, { type: 'bokeh' }],
    preview: 'linear-gradient(180deg,#0b1026,#2a2350 60%,#4a3560)',
    vars: {
      '--font-display': "'Nunito', system-ui, sans-serif",
      '--text': '#eef2fb',
      '--muted': '#b4bfd6',
      '--accent': '#7cc4ff',
      '--on-accent': '#0b1026',
      '--panel': 'rgba(14, 18, 38, 0.52)',
      '--panel-strong': 'rgba(14, 18, 38, 0.82)',
      '--panel-border': 'rgba(255, 255, 255, 0.12)',
      '--field': 'rgba(255, 255, 255, 0.08)',
      '--radius': '18px',
      '--blur': '16px',
      '--heat-0': 'rgba(255,255,255,0.08)',
    },
  },
  'afternoon-cafe': {
    mode: 'day',
    scene: 'cafe',
    effects: [{ type: 'rays', x: 0.2, y: -0.05, angle: 50 }, { type: 'dust' }],
    preview: 'linear-gradient(180deg,#f8d49a,#e8956b 60%,#7a4a35)',
    vars: {
      '--font-display': "'Lora', Georgia, serif",
      '--text': '#3b2418',
      '--muted': '#6b4a38',
      '--accent': '#b5532a',
      '--on-accent': '#fff8f0',
      '--panel': 'rgba(255, 244, 228, 0.58)',
      '--panel-strong': 'rgba(255, 244, 228, 0.92)',
      '--panel-border': 'rgba(120, 70, 40, 0.18)',
      '--field': 'rgba(120, 70, 40, 0.08)',
      '--radius': '12px',
      '--blur': '12px',
      '--heat-0': 'rgba(120,70,40,0.10)',
    },
  },
  'snowy-town': {
    mode: 'night',
    scene: 'snow',
    effects: [{ type: 'snow' }, { type: 'bokeh', count: 8, colors: ['255,210,140', '200,225,255'] }],
    preview: 'linear-gradient(180deg,#1b2a4a,#3d5a80 60%,#dfe9f5)',
    vars: {
      '--font-display': "'Quicksand', system-ui, sans-serif",
      '--text': '#f2f7ff',
      '--muted': '#c3d2e8',
      '--accent': '#a8d8ff',
      '--on-accent': '#13223d',
      '--panel': 'rgba(24, 40, 70, 0.48)',
      '--panel-strong': 'rgba(24, 40, 70, 0.85)',
      '--panel-border': 'rgba(255, 255, 255, 0.18)',
      '--field': 'rgba(255, 255, 255, 0.10)',
      '--radius': '22px',
      '--blur': '18px',
      '--heat-0': 'rgba(255,255,255,0.10)',
    },
  },
  'forest-morning': {
    mode: 'day',
    scene: 'forest',
    effects: [{ type: 'rays', x: 0.25, y: -0.05, angle: 60, strength: 0.16 }, { type: 'dust', color: '255,245,190' }],
    preview: 'linear-gradient(180deg,#e4f3dc,#9cc9a7 55%,#3f6b50)',
    vars: {
      '--font-display': "'Nunito', system-ui, sans-serif",
      '--text': '#1d3326',
      '--muted': '#3f5a49',
      '--accent': '#2f7d4f',
      '--on-accent': '#f3fbf5',
      '--panel': 'rgba(246, 252, 244, 0.58)',
      '--panel-strong': 'rgba(246, 252, 244, 0.92)',
      '--panel-border': 'rgba(30, 70, 45, 0.16)',
      '--field': 'rgba(30, 70, 45, 0.07)',
      '--radius': '20px',
      '--blur': '14px',
      '--heat-0': 'rgba(30,70,45,0.10)',
    },
  },
  'night-study': {
    mode: 'night',
    scene: 'study',
    effects: [{ type: 'dust', intensity: 0.6, color: '255,210,150' }, { type: 'bokeh', count: 6, colors: ['255,190,120'] }],
    preview: 'linear-gradient(180deg,#120f24,#2a1f45 60%,#ffb86b)',
    vars: {
      '--font-display': "'JetBrains Mono', ui-monospace, monospace",
      '--text': '#f3ecff',
      '--muted': '#c2b6dc',
      '--accent': '#ffb86b',
      '--on-accent': '#1d1430',
      '--panel': 'rgba(22, 16, 40, 0.55)',
      '--panel-strong': 'rgba(22, 16, 40, 0.88)',
      '--panel-border': 'rgba(255, 200, 140, 0.16)',
      '--field': 'rgba(255, 255, 255, 0.07)',
      '--radius': '10px',
      '--blur': '12px',
      '--heat-0': 'rgba(255,255,255,0.08)',
    },
  },
  'autumn-pond': {
    mode: 'night',
    scene: 'cafe',
    effects: [{ type: 'leaves' }, { type: 'rain', intensity: 0.35, color: '255,235,210' }, { type: 'fireflies', count: 14 }],
    preview: 'linear-gradient(180deg,#5a2a1a,#a8452a 45%,#3d4a2a)',
    vars: {
      '--font-display': "'Lora', Georgia, serif",
      '--text': '#fff3e6',
      '--muted': '#ead0b8',
      '--accent': '#f39a4b',
      '--on-accent': '#2a1408',
      '--panel': 'rgba(40, 22, 14, 0.52)',
      '--panel-strong': 'rgba(40, 22, 14, 0.88)',
      '--panel-border': 'rgba(255, 210, 160, 0.16)',
      '--field': 'rgba(255, 230, 200, 0.08)',
      '--radius': '16px',
      '--blur': '14px',
      '--heat-0': 'rgba(255,230,200,0.09)',
    },
  },
  'zen-garden': {
    mode: 'day',
    scene: 'forest',
    effects: [{ type: 'petals' }, { type: 'rays', x: 0.05, y: -0.05, angle: 40, strength: 0.18 }, { type: 'dust', intensity: 0.5 }],
    preview: 'linear-gradient(180deg,#bfe3f0,#f7c6d4 50%,#9a6a45)',
    vars: {
      '--font-display': "'Lora', Georgia, serif",
      '--text': '#2b1d18',
      '--muted': '#5e463a',
      '--accent': '#c2416b',
      '--on-accent': '#fff5f8',
      '--panel': 'rgba(255, 248, 244, 0.6)',
      '--panel-strong': 'rgba(255, 248, 244, 0.93)',
      '--panel-border': 'rgba(120, 60, 50, 0.16)',
      '--field': 'rgba(120, 60, 50, 0.07)',
      '--radius': '14px',
      '--blur': '14px',
      '--heat-0': 'rgba(120,60,50,0.10)',
    },
  },
};

export const themeName = (id) => t(`theme.${id}`);

let randomPick = null;

/** Which theme should be shown right now, according to the theme mode. */
export function resolveThemeId(settings, now = new Date()) {
  const ids = Object.keys(THEMES);
  if (settings.themeMode === 'random') {
    randomPick ??= ids[Math.floor(Math.random() * ids.length)];
    return randomPick;
  }
  if (settings.themeMode === 'time') {
    const h = now.getHours();
    const id = h >= 6 && h < 18 ? settings.dayTheme : settings.nightTheme;
    return THEMES[id] ? id : ids[0];
  }
  return THEMES[settings.theme] ? settings.theme : ids[0];
}

export function applyTheme(id) {
  const theme = THEMES[id];
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.vars)) root.style.setProperty(k, v);
  root.dataset.theme = id;
  root.dataset.mode = theme.mode;
  root.style.colorScheme = theme.mode === 'day' ? 'light' : 'dark';
}
