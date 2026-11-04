// Full-screen background, in order of preference:
//   1. a user uploaded video/image (IndexedDB)
//   2. the theme illustration from backgrounds/ (see backgrounds/index.json)
//   3. the procedural canvas scene of the theme (fallback when no artwork exists)
// 1 and 2 get an animated effects overlay (rain, petals, glow...).
import { SceneRunner } from './scenes.js';
import { EffectsRunner } from './effects.js';
import { THEMES } from './themes.js';
import { getMedia } from './storage.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = (id) => document.getElementById(id);

let scene, fx;
let mediaUrl = null;
let currentKey = '';
let token = 0;
let artIndex = {};

/** backgrounds/index.json: { "<theme-id>": { "file": "name.jpg", "effects": [...] } } */
export async function loadArtIndex() {
  try {
    const r = await fetch('backgrounds/index.json', { cache: 'no-cache' });
    artIndex = r.ok ? await r.json() : {};
  } catch {
    artIndex = {};
  }
  return artIndex;
}

export function artUrl(themeId) {
  const file = artIndex[themeId]?.file;
  return file ? `backgrounds/${file}` : null;
}

const isVideo = (s) => /^video\/|\.(mp4|webm)$/i.test(s || '');

function loadEl(src, video, animate) {
  return new Promise((resolve, reject) => {
    if (video) {
      const v = document.createElement('video');
      Object.assign(v, { muted: true, loop: true, playsInline: true, autoplay: animate, preload: 'auto' });
      v.addEventListener('loadeddata', () => { if (!animate) v.pause(); resolve({ el: v, w: v.videoWidth, h: v.videoHeight }); }, { once: true });
      v.addEventListener('error', () => reject(new Error(`cannot load ${src}`)), { once: true });
      v.src = src;
    } else {
      const img = new Image();
      img.decoding = 'async';
      img.alt = '';
      img.onload = () => resolve({ el: img, w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error(`cannot load ${src}`));
      img.src = src;
    }
  });
}

function effectsFor(settings, theme, artConfig) {
  const o = settings.overlayEffect;
  if (o === 'none') return [];
  if (o && o !== 'theme') return [{ type: o }];
  return artConfig?.effects || theme.effects || [];
}

// ---------------- main ----------------
export async function renderBackdrop(settings, themeId) {
  scene ??= new SceneRunner($('scene'));
  fx ??= new EffectsRunner($('fx'));

  const theme = THEMES[themeId];
  const animate = !settings.batterySaver && !reducedMotion.matches;
  const key = JSON.stringify([themeId, settings.customBackground, animate, settings.overlayEffect]);
  $('backdrop').style.setProperty('--art-dim', String(settings.artDim ?? 0));
  if (key === currentKey) return;
  currentKey = key;
  const my = ++token;

  // Pick the source: user upload → theme artwork → none.
  let loaded = null;
  let artConfig = null;
  try {
    if (settings.customBackground) {
      const media = await getMedia(settings.customBackground);
      if (media) {
        const url = URL.createObjectURL(media.blob);
        loaded = await loadEl(url, isVideo(media.type), animate);
        loaded.url = url;
      }
    }
    if (!loaded && artUrl(themeId)) {
      artConfig = artIndex[themeId];
      loaded = await loadEl(artUrl(themeId), isVideo(artConfig.file), animate);
    }
  } catch (err) {
    console.info('[Drizzle] background artwork not available, using canvas scene:', err.message);
    loaded = null;
  }
  if (my !== token) { if (loaded?.url) URL.revokeObjectURL(loaded.url); return; } // a newer render won

  const art = $('art');
  if (mediaUrl) URL.revokeObjectURL(mediaUrl);
  mediaUrl = loaded?.url || null;
  art.replaceChildren();

  if (loaded) {
    scene.pause();
    $('scene').hidden = true;
    $('art-layer').hidden = false;
    $('backdrop').classList.add('has-art');
    art.append(loaded.el);
    fx.set(effectsFor(settings, theme, artConfig), { animate, art: { w: loaded.w, h: loaded.h } });
  } else {
    fx.set([], { animate: false });
    $('art-layer').hidden = true;
    $('backdrop').classList.remove('has-art');
    $('scene').hidden = false;
    scene.set(theme.scene, { animate });
  }
}

/** Stop animating while the tab is not visible. */
export function setBackdropVisible(visible) {
  const video = $('art').querySelector('video');
  if (visible) {
    if (!$('scene').hidden) scene?.resume();
    fx?.resume();
    if (video?.autoplay) video.play().catch(() => {});
  } else {
    scene?.pause();
    fx?.pause();
    video?.pause();
  }
}

reducedMotion.addEventListener?.('change', () => { currentKey = ''; });
