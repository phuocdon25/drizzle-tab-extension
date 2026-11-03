# Theme backgrounds

Each theme looks for an illustration here, as declared in `index.json`. When the file is
missing, the theme falls back to its scene drawn in code (canvas).

## Adding an image

1. Create the image (see the prompts in [PROMPTS.md](PROMPTS.md)) or use an image you are licensed to use.
   Recommended: 16:9, at least 2560×1440, `.jpg`/`.webp` (≤ 1.5 MB), or `.mp4`/`.webm` (short loop) for animation.
2. Name it after the theme, e.g. `rainy-city.jpg`, and put it in this folder
   (or change `"file"` in `index.json` to match your file name).
3. Reload the extension in `chrome://extensions` and open a new tab.

## Placing effects on the image (optional)

Each theme has default effects (rain, petals, dust…). To add effects that sit **on top of objects in the image**
(the glow of a lantern, steam from a teacup), add `effects` to `index.json`. `x`, `y` are
positions as a fraction of the image (0 = left/top edge, 1 = right/bottom edge); `r` is the radius as a fraction of the image width:

```json
"autumn-pond": {
  "file": "autumn-pond.jpg",
  "effects": [
    { "type": "leaves" },
    { "type": "rain", "intensity": 0.35 },
    { "type": "glow", "x": 0.6, "y": 0.42, "r": 0.09, "color": "255,190,110", "strength": 0.55 },
    { "type": "steam", "x": 0.62, "y": 0.69 },
    { "type": "fireflies", "count": 14 }
  ]
}
```

When `effects` is present, it replaces the theme's default effects.

| type | Options |
|---|---|
| `rain` | `intensity`, `wind`, `color` ("r,g,b") |
| `snow` | `intensity`, `wind`, `color` |
| `petals` | `intensity`, `wind` |
| `leaves` | `intensity`, `wind`, `colors` |
| `fireflies` | `count`, `area` ([x0,y0,x1,y1] screen fractions), `color` |
| `dust` | `intensity`, `color` |
| `rays` | `x`, `y` (light source), `angle` (degrees), `strength`, `color` |
| `bokeh` | `count`, `colors` |
| `glow` | `x`, `y`, `r`, `color`, `strength` — flickers like a lamp/candle |
| `steam` | `x`, `y` — steam rising from a cup / pot |

**Copyright:** only use images you made yourself, AI-generated images, or images that come with a license.
