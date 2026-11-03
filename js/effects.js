// Animated overlay effects drawn on a transparent canvas above an illustration
// (theme artwork or a user upload): rain, snow, petals, leaves, fireflies, dust,
// light rays, bokeh, flickering lamp glow, steam.
//
// Effect config: { type, ...options }. Positions (x, y) are fractions of the artwork
// (0..1), mapped through the same "object-fit: cover" transform as the image, so a
// glow placed on a lamp in the picture stays on the lamp at any screen size.

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const TAU = Math.PI * 2;

const spriteCache = new Map();
/** Pre-rendered soft round sprite (much faster than radial gradients per particle). */
function softDot(rgb, hard = 0) {
  const key = `${rgb}|${hard}`;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d').createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, `rgba(${rgb},1)`);
  g.addColorStop(hard, `rgba(${rgb},${hard ? 0.9 : 0.6})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  const ctx = c.getContext('2d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  spriteCache.set(key, c);
  return c;
}

function drawSprite(ctx, sprite, x, y, r, alpha) {
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
}

// Maple leaf: 5 main lobes with serrated tips; otherwise a simple oval leaf. Pointing up, stem down.
const MAPLE = [[0, 1], [0.32, 0.55], [0.62, 0.78], [0.5, 0.42], [0.95, 0.36], [0.55, 0.12], [0.62, -0.18], [0.12, -0.05], [0.06, -0.32]];
function drawLeaf(ctx, s, color, maple) {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (maple) {
    // build right half then mirror (y axis is up = negative)
    ctx.moveTo(0, -s);
    for (const [x, y] of MAPLE.slice(1)) ctx.lineTo(x * s, -y * s);
    for (const [x, y] of MAPLE.slice(1).reverse()) ctx.lineTo(-x * s, -y * s);
    ctx.closePath();
  } else {
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.62, -s * 0.2, 0, s * 0.55);
    ctx.quadraticCurveTo(-s * 0.62, -s * 0.2, 0, -s);
  }
  ctx.fill();
  // darker veins + stem
  ctx.strokeStyle = 'rgba(80,25,10,0.45)';
  ctx.lineWidth = Math.max(0.7, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(0, s * 0.75); ctx.lineTo(0, -s * 0.85);
  if (maple) {
    ctx.moveTo(0, -s * 0.05); ctx.lineTo(s * 0.8, -s * 0.33);
    ctx.moveTo(0, -s * 0.05); ctx.lineTo(-s * 0.8, -s * 0.33);
    ctx.moveTo(0, s * 0.1); ctx.lineTo(s * 0.5, s * 0.15);
    ctx.moveTo(0, s * 0.1); ctx.lineTo(-s * 0.5, s * 0.15);
  }
  ctx.stroke();
}

// ---------------------------------------------------------------------------

const EFFECTS = {
  rain: {
    init(W, H, o) {
      const n = Math.round(((W * H) / 2600) * (o.intensity ?? 1));
      const layers = [
        { len: 9, w: 0.7, a: 0.16, v: 520 },
        { len: 17, w: 1, a: 0.26, v: 820 },
        { len: 30, w: 1.5, a: 0.36, v: 1150 },
      ];
      return {
        layers,
        drops: Array.from({ length: n }, () => {
          const l = Math.random() < 0.5 ? 0 : Math.random() < 0.7 ? 1 : 2;
          return { l, x: rand(-W * 0.2, W), y: rand(-H, H), v: layers[l].v * rand(0.85, 1.15) };
        }),
        splashes: [],
      };
    },
    frame(ctx, s, dt, t, W, H, o) {
      const wind = o.wind ?? 0.15;
      const rgb = o.color || '205,220,255';
      ctx.lineCap = 'round';
      for (let li = 0; li < 3; li++) {
        const L = s.layers[li];
        ctx.strokeStyle = `rgba(${rgb},${L.a})`;
        ctx.lineWidth = L.w;
        ctx.beginPath();
        for (const d of s.drops) {
          if (d.l !== li) continue;
          d.y += d.v * dt;
          d.x += d.v * wind * dt;
          const ground = H * (li === 2 ? 0.82 : 1.02);
          if (d.y > ground) {
            if (li === 2 && Math.random() < 0.5) s.splashes.push({ x: d.x, y: rand(H * 0.8, H), life: 0 });
            d.y = rand(-H * 0.3, -10);
            d.x = rand(-W * 0.2, W);
          }
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + L.len * wind, d.y + L.len);
        }
        ctx.stroke();
      }
      // tiny splashes
      ctx.lineWidth = 1;
      for (const p of s.splashes) {
        p.life += dt;
        const k = p.life / 0.35;
        ctx.strokeStyle = `rgba(${rgb},${0.35 * (1 - k)})`;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 2 + k * 9, 1 + k * 2.5, 0, Math.PI, TAU);
        ctx.stroke();
      }
      s.splashes = s.splashes.filter((p) => p.life < 0.35);
    },
  },

  snow: {
    init(W, H, o) {
      const n = Math.round(((W * H) / 5500) * (o.intensity ?? 1));
      return {
        flakes: Array.from({ length: n }, () => {
          const z = Math.random() ** 2; // most flakes far away
          return { x: rand(0, W), y: rand(0, H), z, r: 1 + z * 5, v: 18 + z * 70, ph: rand(0, TAU) };
        }),
      };
    },
    frame(ctx, s, dt, t, W, H, o) {
      const sprite = softDot(o.color || '255,255,255', 0.35);
      const wind = o.wind ?? 12;
      for (const f of s.flakes) {
        f.y += f.v * dt;
        f.x += (Math.sin(t * 0.7 + f.ph) * 18 * (0.4 + f.z) + wind) * dt;
        if (f.y > H + 10) { f.y = -10; f.x = rand(-20, W); }
        if (f.x > W + 10) f.x = -10;
        drawSprite(ctx, sprite, f.x, f.y, f.r * 1.6, 0.45 + f.z * 0.45);
      }
      ctx.globalAlpha = 1;
    },
  },

  petals: {
    init(W, H, o) {
      const n = Math.round(((W * H) / 38000) * (o.intensity ?? 1));
      const colors = o.colors || [['#ffd6e2', '#ff9fbf'], ['#ffe3ec', '#ffb3c9'], ['#ffc9d9', '#f78fb0']];
      return {
        items: Array.from({ length: n }, () => ({
          x: rand(-W * 0.1, W), y: rand(-H, H), s: rand(6, 12), v: rand(35, 80),
          rot: rand(0, TAU), vr: rand(-1.5, 1.5), flip: rand(0, TAU), vf: rand(1.5, 3.5), ph: rand(0, TAU),
          c: pick(colors),
        })),
      };
    },
    frame(ctx, s, dt, t, W, H, o) {
      const wind = o.wind ?? 30;
      for (const p of s.items) {
        p.y += p.v * dt;
        p.x += (wind + Math.sin(t * 0.9 + p.ph) * 25) * dt;
        p.rot += p.vr * dt;
        p.flip += p.vf * dt;
        if (p.y > H + 20 || p.x > W + 20) { p.y = rand(-60, -10); p.x = rand(-W * 0.2, W); }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.flip));
        const g = ctx.createLinearGradient(0, -p.s, 0, p.s);
        g.addColorStop(0, p.c[0]);
        g.addColorStop(1, p.c[1]);
        ctx.fillStyle = g;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(0, -p.s);
        ctx.bezierCurveTo(p.s * 0.95, -p.s * 0.55, p.s * 0.65, p.s * 0.75, 0, p.s);
        ctx.bezierCurveTo(-p.s * 0.65, p.s * 0.75, -p.s * 0.95, -p.s * 0.55, 0, -p.s);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  },

  leaves: {
    init(W, H, o) {
      const n = Math.round(((W * H) / 60000) * (o.intensity ?? 1));
      const colors = o.colors || ['#e8562a', '#f08a2b', '#c93b2b', '#f2b134', '#d9452b'];
      return {
        items: Array.from({ length: n }, () => ({
          x: rand(0, W), y: rand(-H, H), s: rand(10, 18), v: rand(30, 65), maple: Math.random() < 0.55,
          rot: rand(0, TAU), vr: rand(-1.2, 1.2), flip: rand(0, TAU), vf: rand(1, 2.5), ph: rand(0, TAU), c: pick(colors),
        })),
      };
    },
    frame(ctx, s, dt, t, W, H, o) {
      const wind = o.wind ?? 20;
      for (const p of s.items) {
        p.y += p.v * dt;
        p.x += (wind + Math.sin(t * 0.6 + p.ph) * 40) * dt;
        p.rot += p.vr * dt;
        p.flip += p.vf * dt;
        if (p.y > H + 30) { p.y = rand(-80, -20); p.x = rand(-W * 0.1, W); }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(Math.cos(p.flip), 1);
        ctx.globalAlpha = 0.95;
        drawLeaf(ctx, p.s, p.c, p.maple);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  },

  fireflies: {
    init(W, H, o) {
      const n = o.count ?? Math.round((W * H) / 55000);
      const area = o.area || [0, 0.35, 1, 1]; // x0,y0,x1,y1 as screen fractions
      return {
        area,
        items: Array.from({ length: n }, () => ({
          x: rand(area[0], area[2]) * W, y: rand(area[1], area[3]) * H,
          vx: rand(-15, 15), vy: rand(-10, 10), ph: rand(0, TAU), sp: rand(0.6, 1.6), r: rand(8, 16),
        })),
      };
    },
    frame(ctx, s, dt, t, W, H, o) {
      const glow = softDot(o.color || '255,226,130');
      const core = softDot('255,250,220', 0.5);
      ctx.globalCompositeOperation = 'lighter';
      const [x0, y0, x1, y1] = s.area;
      for (const f of s.items) {
        f.vx += rand(-30, 30) * dt; f.vy += rand(-30, 30) * dt;
        f.vx *= 0.98; f.vy *= 0.98;
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.x < x0 * W || f.x > x1 * W) f.vx *= -1;
        if (f.y < y0 * H || f.y > y1 * H) f.vy *= -1;
        const pulse = (Math.sin(t * f.sp * 2 + f.ph) + 1) / 2;
        drawSprite(ctx, glow, f.x, f.y, f.r, 0.15 + pulse * 0.55);
        drawSprite(ctx, core, f.x, f.y, 2.2, 0.3 + pulse * 0.7);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    },
  },

  dust: {
    init(W, H, o) {
      const n = Math.round(((W * H) / 16000) * (o.intensity ?? 1));
      return { items: Array.from({ length: n }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(0.8, 2.4), v: rand(3, 12), ph: rand(0, TAU) })) };
    },
    frame(ctx, s, dt, t, W, H, o) {
      const sprite = softDot(o.color || '255,240,200', 0.4);
      ctx.globalCompositeOperation = 'lighter';
      for (const d of s.items) {
        d.y -= d.v * dt;
        d.x += Math.sin(t * 0.4 + d.ph) * 8 * dt;
        if (d.y < -5) { d.y = H + 5; d.x = rand(0, W); }
        drawSprite(ctx, sprite, d.x, d.y, d.r * 2, 0.25 + 0.35 * Math.sin(t * 1.3 + d.ph));
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    },
  },

  rays: {
    init() {
      return { rays: Array.from({ length: 6 }, (_, i) => ({ off: (i - 2.5) * 0.11 + rand(-0.03, 0.03), w: rand(0.03, 0.07), ph: rand(0, TAU) })) };
    },
    frame(ctx, s, dt, t, W, H, o, map) {
      const src = map(o.x ?? 0.15, o.y ?? -0.05);
      const base = ((o.angle ?? 55) * Math.PI) / 180;
      const len = Math.hypot(W, H) * 1.2;
      const rgb = o.color || '255,246,210';
      ctx.globalCompositeOperation = 'lighter';
      for (const r of s.rays) {
        const a0 = base + r.off, a1 = a0 + r.w;
        const alpha = (o.strength ?? 0.14) * (0.6 + 0.4 * Math.sin(t * 0.35 + r.ph));
        const g = ctx.createLinearGradient(src.x, src.y, src.x + Math.cos(a0) * len * 0.8, src.y + Math.sin(a0) * len * 0.8);
        g.addColorStop(0, `rgba(${rgb},${alpha})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(src.x + Math.cos(a0) * len, src.y + Math.sin(a0) * len);
        ctx.lineTo(src.x + Math.cos(a1) * len, src.y + Math.sin(a1) * len);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  },

  bokeh: {
    init(W, H, o) {
      const colors = o.colors || ['255,190,120', '255,130,190', '140,200,255', '255,230,160'];
      const n = o.count ?? 16;
      return { items: Array.from({ length: n }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(18, 70), c: pick(colors), vx: rand(-6, 6), vy: rand(-4, 4), ph: rand(0, TAU), a: rand(0.05, 0.14) })) };
    },
    frame(ctx, s, dt, t, W, H) {
      ctx.globalCompositeOperation = 'lighter';
      for (const b of s.items) {
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < -80) b.x = W + 80; if (b.x > W + 80) b.x = -80;
        if (b.y < -80) b.y = H + 80; if (b.y > H + 80) b.y = -80;
        drawSprite(ctx, softDot(b.c, 0.75), b.x, b.y, b.r, b.a * (0.7 + 0.3 * Math.sin(t * 0.5 + b.ph)));
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    },
  },

  glow: {
    init() { return { seed: rand(0, 100) }; },
    frame(ctx, s, dt, t, W, H, o, map, scale) {
      const p = map(o.x ?? 0.5, o.y ?? 0.5);
      const r = (o.r ?? 0.08) * scale.w;
      // irregular candle-like flicker from layered sines
      const f = 0.82 + 0.1 * Math.sin(t * 7.3 + s.seed) + 0.06 * Math.sin(t * 13.1 + s.seed * 2) + 0.04 * Math.sin(t * 2.1);
      ctx.globalCompositeOperation = 'lighter';
      drawSprite(ctx, softDot(o.color || '255,180,90'), p.x, p.y, r, (o.strength ?? 0.5) * f);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    },
  },

  steam: {
    init() { return { puffs: [] }; },
    frame(ctx, s, dt, t, W, H, o, map, scale) {
      const p = map(o.x ?? 0.5, o.y ?? 0.7);
      const k = scale.w / 1000;
      if (Math.random() < 0.6) s.puffs.push({ x: p.x + rand(-6, 6) * k, y: p.y, r: 5 * k, a: 0.2, ph: rand(0, TAU) });
      const sprite = softDot('255,255,255');
      for (const q of s.puffs) {
        q.y -= 26 * k * dt; q.r += 9 * k * dt; q.a -= 0.07 * dt;
        drawSprite(ctx, sprite, q.x + Math.sin(t * 1.4 + q.ph + q.y * 0.03) * 10 * k, q.y, q.r, q.a);
      }
      s.puffs = s.puffs.filter((q) => q.a > 0);
      ctx.globalAlpha = 1;
    },
  },
};

export const EFFECT_TYPES = Object.keys(EFFECTS);

export class EffectsRunner {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.list = [];
    this.running = false;
    this.loop = this.loop.bind(this);
    let timer;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => this.list.length && this.build(), 150);
    });
  }

  /** @param list effect configs; art = natural size of the artwork ({w,h}) for position mapping */
  set(list, { animate, art }) {
    this.list = (list || []).filter((e) => EFFECTS[e.type]);
    this.animate = animate;
    this.art = art;
    this.canvas.hidden = !this.list.length;
    this.build();
    animate && this.list.length ? this.resume() : this.pause();
  }

  build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = this.canvas.clientWidth || window.innerWidth;
    const H = this.canvas.clientHeight || window.innerHeight;
    Object.assign(this, { dpr, W, H });
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    // object-fit: cover mapping from artwork fractions to canvas pixels
    const iw = this.art?.w || W, ih = this.art?.h || H;
    const sc = Math.max(W / iw, H / ih);
    const ox = (W - iw * sc) / 2, oy = (H - ih * sc) / 2;
    this.scale = { w: iw * sc, h: ih * sc };
    this.map = (x, y) => ({ x: ox + x * iw * sc, y: oy + y * ih * sc });
    this.states = this.list.map((e) => EFFECTS[e.type].init(W, H, e));
    this.t = 0;
    // pre-warm so particles are spread out from the first frame
    for (let i = 0; i < 20; i++) this.step(0.05, false);
    this.render(0);
  }

  step(dt, draw = true) {
    const { ctx, W, H } = this;
    this.t += dt;
    if (draw) {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
    } else {
      ctx.setTransform(0, 0, 0, 0, 0, 0); // draw into nothing while warming up
    }
    this.list.forEach((e, i) => EFFECTS[e.type].frame(ctx, this.states[i], dt, this.t, W, H, e, this.map, this.scale));
  }

  render(dt) { this.step(dt, true); }

  loop(ts) {
    if (!this.running) return;
    const elapsed = ts - (this.last ?? ts);
    if (elapsed >= 1000 / 30 || this.last === undefined) {
      this.last = ts;
      this.render(Math.min(elapsed / 1000, 0.1));
    }
    requestAnimationFrame(this.loop);
  }

  resume() {
    if (this.running || !this.animate || !this.list.length) return;
    this.running = true;
    this.last = undefined;
    requestAnimationFrame(this.loop);
  }

  pause() { this.running = false; }
}
