# Drizzle Tab

A lofi-style Chrome extension that replaces the New Tab page. Spec: [drizzle-tab-spec.md](drizzle-tab-spec.md).

## Install (developer mode)

1. Open `chrome://extensions`, turn on **Developer mode**.
2. **Load unpacked** → choose this folder.
3. Open a new tab. Chrome asks whether to keep the new tab page from the extension → choose **Keep it**.

After editing code: click ⟳ on the extension card in `chrome://extensions` and then open a new tab.

You can also preview the UI without installing it: `python3 -m http.server 8765` → open `http://127.0.0.1:8765/newtab.html`
(data is then stored in localStorage; notifications and the badge only work in the extension).

## Structure

| File | Role |
|---|---|
| `manifest.json` | MV3, overrides `newtab`, permissions: storage, unlimitedStorage, alarms, notifications |
| `newtab.html`, `css/style.css` | Layout + glassmorphism styling, themes via CSS variables |
| `js/main.js` | Wires modules together, clock, keyboard shortcuts |
| `js/state.js` | Settings / links / todos, export & import JSON |
| `js/storage.js` | `chrome.storage.sync` (settings, links) · `chrome.storage.local` (todos, history) · IndexedDB (uploaded videos/images) |
| `js/todo-logic.js` | Deadline logic, sorting, "còn N ngày" labels (shared with background) |
| `js/todo.js`, `js/history.js` | Todo list and the GitHub-style heatmap |
| `js/themes.js`, `js/backdrop.js` | 7 themes; picks the background: uploaded file → artwork in `backgrounds/` → canvas scene |
| `js/effects.js` | Animated overlay effects on the artwork (rain, snow, petals, leaves, fireflies, glow, steam…) |
| `js/scenes.js` | Canvas scenes drawn in code (fallback when there is no artwork) |
| `backgrounds/` | Theme artwork + `index.json` (effect positions) + [PROMPTS.md](backgrounds/PROMPTS.md) for generating images with AI |
| `js/google.js`, `js/links.js`, `js/settings.js` | Google area, quick links, settings |
| `js/i18n.js`, `js/locales/*.js` | Multi-language support (Tiếng Việt, English, 日本語), switched live in Settings → Chung |
| `js/picker.js` | Deadline / time / priority picker (quick chips + calendar + 24h time grid) |
| `background.js` | Overdue badge on the icon + deadline reminders (checks every 5 minutes) |

## Languages

The default language follows the browser (Settings → Chung → Ngôn ngữ to change it). Every string lives in `js/locales/<code>.js`.
To add a new language: copy `js/locales/en.js` to e.g. `ko.js`, translate the values, then add it to `DICTS` and `LANGUAGES` in `js/i18n.js`.

## Shortcuts

`/` search · `t` add todo · `Shift+T` next theme · `,` settings · `Esc` close / leave input

## Decisions for the open points in the spec (§6)

- **Todo sync across machines:** no — todos & history live in `storage.local` (sync quota is too small); settings + quick links are synced. Moving between machines: use Export/Import.
- **Built-in themes:** 7 (the 5 spec ideas + Hồ sen mùa thu, Sân vườn Nhật).
- **Animated backgrounds:** each theme uses an artwork in `backgrounds/` (AI-generated from the prompts or licensed) + an animated effects layer, parallax and film grain. With no artwork it falls back to the scene drawn in code. Users can also upload their own MP4/WebM/images.
- **Deadline reminders:** available but **off by default**, enable under Settings → Thông báo.
