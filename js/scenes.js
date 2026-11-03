// Built-in animated lofi backgrounds, drawn procedurally on a <canvas>.
// Everything here is generated in code, so there are no licensing concerns.
// Each scene has a static layer (drawn once per resize) and a light particle layer (animated).

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rr = (rnd, a, b) => a + rnd() * (b - a);
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];

function vGradient(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function glow(ctx, x, y, r, color, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

function windows(ctx, rnd, x, y, w, h, cell, litChance, colors, alpha) {
  for (let wy = y + cell; wy < y + h - cell; wy += cell * 1.8) {
    for (let wx = x + cell * 0.6; wx < x + w - cell; wx += cell * 1.5) {
      if (rnd() < litChance) {
        ctx.globalAlpha = alpha * rr(rnd, 0.5, 1);
        ctx.fillStyle = pick(rnd, colors);
        ctx.fillRect(wx, wy, cell * 0.8, cell);
      }
    }
  }
  ctx.globalAlpha = 1;
}

function pine(ctx, x, base, h, color, snow) {
  const w = h * 0.42;
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    const top = base - h + (i * h) / 4;
    const bw = w * (0.55 + i * 0.22);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x - bw / 2, top + h / 2.2);
    ctx.lineTo(x + bw / 2, top + h / 2.2);
    ctx.closePath();
    ctx.fill();
    if (snow) {
      ctx.fillStyle = snow;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x - bw / 6, top + h / 9);
      ctx.lineTo(x + bw / 6, top + h / 9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = color;
    }
  }
  ctx.fillRect(x - h * 0.03, base - h * 0.12, h * 0.06, h * 0.12);
}

function hill(ctx, W, baseY, amp, freq, phase, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  for (let x = 0; x <= W; x += 10) {
    ctx.lineTo(x, baseY - Math.sin(x * freq + phase) * amp - Math.sin(x * freq * 2.3 + phase * 2) * amp * 0.4);
  }
  ctx.lineTo(W, 99999);
  ctx.lineTo(0, 99999);
  ctx.closePath();
  ctx.fill();
}

// ---------------- Phố đêm mưa ----------------
const rain = {
  drawStatic(ctx, W, H, rnd) {
    const horizon = H * 0.78;
    vGradient(ctx, 0, 0, W, horizon, ['#070b1f', '#1a1a42', '#3b2c5a', '#6a3d68']);
    glow(ctx, W * 0.5, horizon, W * 0.6, 'rgba(255,120,170,0.25)');
    const lights = ['#ffd27a', '#ff9ecf', '#9fd8ff', '#ffe9b0'];
    // far skyline
    for (let x = -20; x < W; ) {
      const w = rr(rnd, 40, 110), h = H * rr(rnd, 0.22, 0.5);
      ctx.fillStyle = '#1b1838';
      ctx.fillRect(x, horizon - h, w, h);
      windows(ctx, rnd, x, horizon - h, w, h, 5, 0.22, lights, 0.55);
      x += w + rr(rnd, 0, 8);
    }
    // near skyline
    for (let x = -40; x < W; ) {
      const w = rr(rnd, 90, 190), h = H * rr(rnd, 0.14, 0.34);
      ctx.fillStyle = '#0c0b1e';
      ctx.fillRect(x, horizon - h, w, h);
      windows(ctx, rnd, x, horizon - h, w, h, 8, 0.16, lights, 0.8);
      if (rnd() < 0.35) {
        const c = pick(rnd, ['#ff4fa3', '#4fd8ff', '#ffb84f']);
        const sx = x + w * 0.2, sy = horizon - h + 20, sw = w * 0.5;
        glow(ctx, sx + sw / 2, sy + 8, sw, c, 0.35);
        ctx.fillStyle = c;
        ctx.fillRect(sx, sy, sw, 14);
      }
      x += w + rr(rnd, 4, 20);
    }
    // wet street with reflections
    vGradient(ctx, 0, horizon, W, H - horizon, ['#151230', '#07060f']);
    for (let i = 0; i < W / 14; i++) {
      ctx.globalAlpha = rr(rnd, 0.05, 0.18);
      ctx.fillStyle = pick(rnd, lights);
      ctx.fillRect(rr(rnd, 0, W), horizon + rr(rnd, 2, 20), rr(rnd, 2, 6), rr(rnd, 20, H - horizon));
    }
    ctx.globalAlpha = 1;
  },
  init(W, H, rnd) {
    const n = Math.round((W * H) / 5000);
    return {
      drops: Array.from({ length: n }, () => ({ x: rr(rnd, -100, W), y: rr(rnd, 0, H), len: rr(rnd, 10, 24), v: rr(rnd, 600, 950) })),
      ripples: [],
    };
  },
  frame(ctx, p, dt, t, W, H) {
    const wind = 0.18;
    ctx.strokeStyle = 'rgba(190,210,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of p.drops) {
      d.y += d.v * dt; d.x += d.v * wind * dt;
      if (d.y > H) {
        if (Math.random() < 0.08) p.ripples.push({ x: d.x, y: H * rr(Math.random, 0.8, 1), r: 1, a: 0.5 });
        d.y = -d.len; d.x = Math.random() * (W + 100) - 100;
      }
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + d.len * wind, d.y + d.len);
    }
    ctx.stroke();
    for (const r of p.ripples) {
      r.r += 18 * dt; r.a -= 0.6 * dt;
      ctx.strokeStyle = `rgba(190,210,255,${Math.max(r.a, 0)})`;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.r * 2, r.r * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    p.ripples = p.ripples.filter((r) => r.a > 0);
  },
};

// ---------------- Quán cà phê chiều ----------------
const cafe = {
  drawStatic(ctx, W, H, rnd) {
    vGradient(ctx, 0, 0, W, H, ['#e9b17c', '#d68a5c', '#a5603f']);
    // window
    const wx = W * 0.06, wy = H * 0.08, ww = W * 0.52, wh = H * 0.6;
    vGradient(ctx, wx, wy, ww, wh, ['#ffe2ad', '#ffb27d', '#f08a63', '#d46a56']);
    ctx.save();
    ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    glow(ctx, wx + ww * 0.6, wy + wh * 0.72, ww * 0.5, 'rgba(255,240,190,0.9)');
    ctx.fillStyle = '#fff1c9';
    ctx.beginPath(); ctx.arc(wx + ww * 0.6, wy + wh * 0.72, Math.min(ww, wh) * 0.09, 0, Math.PI * 2); ctx.fill();
    for (let x = wx; x < wx + ww; ) {
      const w = rr(rnd, 20, 60), h = wh * rr(rnd, 0.1, 0.32);
      ctx.fillStyle = 'rgba(160,80,70,0.55)';
      ctx.fillRect(x, wy + wh - h, w, h);
      x += w + rr(rnd, 2, 10);
    }
    ctx.restore();
    ctx.strokeStyle = '#5a3322';
    ctx.lineWidth = Math.max(8, W * 0.008);
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh * 0.42); ctx.lineTo(wx + ww, wy + wh * 0.42);
    ctx.stroke();
    // sill + plant
    ctx.fillStyle = '#5a3322';
    ctx.fillRect(wx - 16, wy + wh, ww + 32, 14);
    const px = wx + ww * 0.12, py = wy + wh;
    ctx.fillStyle = '#9c4f32';
    ctx.fillRect(px - 18, py - 34, 36, 34);
    ctx.fillStyle = '#4f7a4a';
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(px + rr(rnd, -26, 26), py - 50 - rr(rnd, 0, 40), 10, 26, rr(rnd, -0.8, 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
    // warm light from the window
    glow(ctx, wx + ww * 0.6, wy + wh * 0.6, W * 0.7, 'rgba(255,210,150,0.35)');
    // hanging lamp
    const lx = W * 0.72;
    ctx.strokeStyle = '#3a2216'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, H * 0.18); ctx.stroke();
    glow(ctx, lx, H * 0.22, H * 0.35, 'rgba(255,220,150,0.55)');
    ctx.fillStyle = '#3a2216';
    ctx.beginPath(); ctx.moveTo(lx - 40, H * 0.22); ctx.lineTo(lx - 14, H * 0.17); ctx.lineTo(lx + 14, H * 0.17); ctx.lineTo(lx + 40, H * 0.22); ctx.closePath(); ctx.fill();
    // table
    const ty = H * 0.8;
    vGradient(ctx, 0, ty, W, H - ty, ['#6e3f28', '#4a2817']);
    ctx.fillStyle = 'rgba(255,220,170,0.15)';
    ctx.fillRect(0, ty, W, 3);
    // cup
    const cx = W * 0.72, cw = Math.max(70, W * 0.05), ch = cw * 0.8;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(cx, ty + 10, cw * 1.1, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4ece2';
    ctx.beginPath(); ctx.ellipse(cx, ty + 4, cw * 0.95, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(cx - cw / 2, ty - ch, cw, ch, [4, 4, cw / 3, cw / 3]); ctx.fill();
    ctx.strokeStyle = '#f4ece2'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(cx + cw / 2, ty - ch / 2, ch / 4, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.fillStyle = '#5b3420';
    ctx.beginPath(); ctx.ellipse(cx, ty - ch, cw / 2, 6, 0, 0, Math.PI * 2); ctx.fill();
    this.cup = { x: cx, y: ty - ch, w: cw };
  },
  init(W, H, rnd) {
    return {
      dust: Array.from({ length: Math.round((W * H) / 22000) }, () => ({ x: rr(rnd, 0, W), y: rr(rnd, 0, H), r: rr(rnd, 0.6, 2), v: rr(rnd, 4, 14), ph: rr(rnd, 0, 6.28) })),
      steam: [],
    };
  },
  frame(ctx, p, dt, t, W, H) {
    for (const d of p.dust) {
      d.y -= d.v * dt; d.x += Math.sin(t * 0.4 + d.ph) * 6 * dt;
      if (d.y < -5) { d.y = H + 5; d.x = Math.random() * W; }
      ctx.fillStyle = `rgba(255,236,200,${0.35 + 0.3 * Math.sin(t + d.ph)})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    }
    const cup = this.cup;
    if (cup && Math.random() < 0.5) p.steam.push({ x: cup.x + (Math.random() - 0.5) * cup.w * 0.5, y: cup.y, r: 4, a: 0.28, ph: Math.random() * 6 });
    for (const s of p.steam) {
      s.y -= 22 * dt; s.r += 5 * dt; s.a -= 0.09 * dt;
      const x = s.x + Math.sin(t * 1.5 + s.ph + s.y * 0.04) * 8;
      ctx.fillStyle = `rgba(255,255,255,${Math.max(s.a, 0)})`;
      ctx.beginPath(); ctx.arc(x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    p.steam = p.steam.filter((s) => s.a > 0);
  },
};

// ---------------- Thị trấn tuyết ----------------
const snow = {
  drawStatic(ctx, W, H, rnd) {
    vGradient(ctx, 0, 0, W, H, ['#0d1730', '#22385f', '#4f6f9a']);
    for (let i = 0; i < (W * H) / 6000; i++) {
      ctx.globalAlpha = rr(rnd, 0.2, 0.9);
      ctx.fillStyle = '#fff';
      ctx.fillRect(rr(rnd, 0, W), rr(rnd, 0, H * 0.55), 1.2, 1.2);
    }
    ctx.globalAlpha = 1;
    const mx = W * 0.8, my = H * 0.17;
    glow(ctx, mx, my, H * 0.3, 'rgba(240,240,220,0.35)');
    ctx.fillStyle = '#f6f2df';
    ctx.beginPath(); ctx.arc(mx, my, H * 0.05, 0, Math.PI * 2); ctx.fill();
    hill(ctx, W, H * 0.62, H * 0.05, 0.004, 1, '#8fa8c9');
    for (let x = 0; x < W; x += rr(rnd, 18, 40)) pine(ctx, x, H * 0.63 - Math.sin(x * 0.004 + 1) * H * 0.05, rr(rnd, 30, 70), '#3d5579', '#d7e4f3');
    hill(ctx, W, H * 0.74, H * 0.03, 0.003, 3, '#cfdcec');
    // houses
    const base = H * 0.84;
    for (let x = rr(rnd, 0, 60); x < W; x += rr(rnd, 110, 220)) {
      const w = rr(rnd, 70, 120), h = rr(rnd, 50, 80);
      ctx.fillStyle = pick(rnd, ['#5b4a63', '#6d5560', '#4f5d78', '#7a5a4f']);
      ctx.fillRect(x, base - h, w, h);
      ctx.fillStyle = '#3a2f44';
      ctx.fillRect(x + w * 0.7, base - h - 34, 12, 26);
      ctx.fillStyle = '#f2f7ff';
      ctx.beginPath(); ctx.moveTo(x - 10, base - h + 2); ctx.lineTo(x + w / 2, base - h - 40); ctx.lineTo(x + w + 10, base - h + 2); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 2; i++) {
        if (rnd() < 0.8) {
          const wx = x + w * (0.2 + i * 0.4), wy = base - h * 0.65;
          glow(ctx, wx + 8, wy + 8, 40, 'rgba(255,200,110,0.6)');
          ctx.fillStyle = '#ffd27a';
          ctx.fillRect(wx, wy, 16, 16);
        }
      }
    }
    vGradient(ctx, 0, base, W, H - base, ['#eaf1fa', '#c9d7ea']);
  },
  init(W, H, rnd) {
    return { flakes: Array.from({ length: Math.round((W * H) / 6500) }, () => ({ x: rr(rnd, 0, W), y: rr(rnd, 0, H), r: rr(rnd, 0.8, 3.2), v: rr(rnd, 18, 55), ph: rr(rnd, 0, 6.28) })) };
  },
  frame(ctx, p, dt, t, W, H) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    for (const f of p.flakes) {
      f.y += f.v * dt * (0.6 + f.r / 4);
      f.x += Math.sin(t * 0.8 + f.ph) * 14 * dt;
      if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
      ctx.moveTo(f.x + f.r, f.y);
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    }
    ctx.fill();
  },
};

// ---------------- Rừng buổi sáng ----------------
const forest = {
  drawStatic(ctx, W, H, rnd) {
    vGradient(ctx, 0, 0, W, H, ['#fbf4dc', '#e2f0d6', '#b5d8b6', '#7fb08d']);
    glow(ctx, W * 0.22, H * 0.08, H * 0.6, 'rgba(255,245,200,0.9)');
    const layers = [
      { base: H * 0.62, h: [60, 120], color: '#a9cdb0', gap: [14, 30] },
      { base: H * 0.76, h: [100, 190], color: '#6b9e7a', gap: [22, 46] },
      { base: H * 0.95, h: [180, 320], color: '#2f5a41', gap: [40, 90] },
    ];
    layers.forEach((L, i) => {
      for (let x = rr(rnd, -20, 10); x < W + 40; x += rr(rnd, ...L.gap)) pine(ctx, x, L.base + rr(rnd, -8, 8), rr(rnd, ...L.h), L.color);
      ctx.fillStyle = L.color;
      ctx.fillRect(0, L.base, W, H - L.base);
      if (i < 2) vGradient(ctx, 0, L.base - 60, W, 90, ['rgba(255,255,255,0)', 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']);
    });
  },
  init(W, H, rnd) {
    return {
      motes: Array.from({ length: Math.round((W * H) / 18000) }, () => ({ x: rr(rnd, 0, W), y: rr(rnd, 0, H), r: rr(rnd, 1, 2.6), v: rr(rnd, 3, 10), ph: rr(rnd, 0, 6.28) })),
      rays: Array.from({ length: 6 }, (_, i) => ({ a: 0.35 + i * 0.13 + rr(rnd, -0.04, 0.04), w: rr(rnd, 0.03, 0.07), ph: rr(rnd, 0, 6.28) })),
    };
  },
  frame(ctx, p, dt, t, W, H) {
    const sx = W * 0.22, sy = H * 0.08, len = Math.hypot(W, H);
    for (const r of p.rays) {
      ctx.fillStyle = `rgba(255,250,215,${0.07 + 0.05 * Math.sin(t * 0.5 + r.ph)})`;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(r.a) * len, sy + Math.sin(r.a) * len);
      ctx.lineTo(sx + Math.cos(r.a + r.w) * len, sy + Math.sin(r.a + r.w) * len);
      ctx.closePath();
      ctx.fill();
    }
    for (const m of p.motes) {
      m.y -= m.v * dt; m.x += Math.sin(t * 0.6 + m.ph) * 10 * dt;
      if (m.y < -5) { m.y = H + 5; m.x = Math.random() * W; }
      ctx.fillStyle = `rgba(255,236,150,${0.4 + 0.35 * Math.sin(t * 1.4 + m.ph)})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
    }
  },
};

// ---------------- Phòng làm việc đêm ----------------
const study = {
  drawStatic(ctx, W, H, rnd) {
    vGradient(ctx, 0, 0, W, H, ['#151029', '#22193b', '#2c2048']);
    const wx = W * 0.52, wy = H * 0.07, ww = W * 0.4, wh = H * 0.5;
    vGradient(ctx, wx, wy, ww, wh, ['#070a22', '#18204a', '#3a2f63']);
    ctx.save();
    ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    glow(ctx, wx + ww * 0.75, wy + wh * 0.25, wh * 0.4, 'rgba(230,225,255,0.35)');
    ctx.fillStyle = '#efeaff';
    ctx.beginPath(); ctx.arc(wx + ww * 0.75, wy + wh * 0.25, wh * 0.07, 0, Math.PI * 2); ctx.fill();
    for (let x = wx; x < wx + ww; ) {
      const w = rr(rnd, 18, 46), h = wh * rr(rnd, 0.12, 0.38);
      ctx.fillStyle = '#0d0b1f';
      ctx.fillRect(x, wy + wh - h, w, h);
      windows(ctx, rnd, x, wy + wh - h, w, h, 3, 0.3, ['#ffd27a', '#9fd8ff'], 0.7);
      x += w + rr(rnd, 1, 6);
    }
    ctx.restore();
    ctx.strokeStyle = '#0f0a1d'; ctx.lineWidth = Math.max(10, W * 0.009);
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
    this.win = { x: wx, y: wy, w: ww, h: wh * 0.55 };
    // desk
    const dy = H * 0.78;
    vGradient(ctx, 0, dy, W, H - dy, ['#3a2a3f', '#1b1224']);
    ctx.fillStyle = 'rgba(255,190,120,0.18)'; ctx.fillRect(0, dy, W, 3);
    // lamp
    const lx = W * 0.16;
    this.lamp = { x: lx + 60, y: dy - 150 };
    glow(ctx, lx + 60, dy - 120, H * 0.55, 'rgba(255,170,90,0.4)');
    ctx.strokeStyle = '#120c1c'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(lx, dy - 4); ctx.lineTo(lx + 10, dy - 120); ctx.lineTo(lx + 60, dy - 160); ctx.stroke();
    ctx.fillStyle = '#120c1c';
    ctx.fillRect(lx - 30, dy - 10, 60, 10);
    ctx.beginPath(); ctx.moveTo(lx + 40, dy - 175); ctx.lineTo(lx + 100, dy - 150); ctx.lineTo(lx + 70, dy - 125); ctx.closePath(); ctx.fill();
    // books
    let bx = W * 0.3;
    for (let i = 0; i < 5; i++) {
      const bw = rr(rnd, 14, 24), bh = rr(rnd, 60, 95);
      ctx.fillStyle = pick(rnd, ['#6b3f5e', '#3f4f7a', '#7a5a3f', '#4f6b5a', '#8a4a4a']);
      ctx.fillRect(bx, dy - bh, bw, bh);
      bx += bw + 2;
    }
    // laptop
    const lpx = W * 0.5, lpw = Math.max(160, W * 0.14);
    glow(ctx, lpx + lpw / 2, dy - 60, 160, 'rgba(140,170,255,0.25)');
    ctx.fillStyle = '#0e0b18';
    ctx.beginPath(); ctx.moveTo(lpx + 10, dy - 6); ctx.lineTo(lpx + 24, dy - lpw * 0.62); ctx.lineTo(lpx + lpw - 24, dy - lpw * 0.62); ctx.lineTo(lpx + lpw - 10, dy - 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#20193a'; ctx.fillRect(lpx - 10, dy - 8, lpw + 20, 8);
    // mug + plant
    const mx = W * 0.78;
    ctx.fillStyle = '#c96f5a';
    ctx.beginPath(); ctx.roundRect(mx, dy - 46, 36, 46, 5); ctx.fill();
    ctx.fillStyle = '#5a3a6a'; ctx.fillRect(W * 0.88, dy - 40, 40, 40);
    ctx.fillStyle = '#3f6b55';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(W * 0.88 + 20 + rr(rnd, -20, 20), dy - 60 - rr(rnd, 0, 30), 8, 22, rr(rnd, -0.8, 0.8), 0, Math.PI * 2); ctx.fill(); }
  },
  init(W, H, rnd) {
    const win = this.win;
    return {
      stars: Array.from({ length: 40 }, () => ({ x: win.x + rr(rnd, 0, win.w), y: win.y + rr(rnd, 0, win.h), ph: rr(rnd, 0, 6.28), s: rr(rnd, 0.6, 1.8) })),
      dust: Array.from({ length: 30 }, () => ({ x: rr(rnd, 0, W * 0.4), y: rr(rnd, H * 0.3, H * 0.8), r: rr(rnd, 0.6, 1.8), ph: rr(rnd, 0, 6.28) })),
    };
  },
  frame(ctx, p, dt, t, W, H) {
    for (const s of p.stars) {
      ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.45 * Math.sin(t * s.s + s.ph)})`;
      ctx.fillRect(s.x, s.y, 1.6, 1.6);
    }
    for (const d of p.dust) {
      d.y -= 4 * dt; d.x += Math.sin(t * 0.5 + d.ph) * 5 * dt;
      if (d.y < H * 0.3) d.y = H * 0.8;
      ctx.fillStyle = `rgba(255,210,150,${0.3 + 0.3 * Math.sin(t + d.ph)})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    }
  },
};

export const SCENES = { rain, cafe, snow, forest, study };

export class SceneRunner {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.layer = document.createElement('canvas');
    this.running = false;
    this.animate = true;
    this.loop = this.loop.bind(this);
    let timer;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => this.scene && this.build(), 150);
    });
  }

  set(name, { animate }) {
    this.scene = SCENES[name];
    this.animate = animate;
    this.build();
    animate ? this.resume() : this.pause();
  }

  build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    Object.assign(this, { dpr, W, H });
    for (const c of [this.canvas, this.layer]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const lctx = this.layer.getContext('2d');
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scene.drawStatic(lctx, W, H, mulberry32(42));
    this.particles = this.scene.init(W, H, mulberry32(7));
    this.t = 0;
    this.render(0);
  }

  render(dt) {
    const { ctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.layer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scene.frame(ctx, this.particles, dt, this.t, this.W, this.H);
  }

  loop(ts) {
    if (!this.running) return;
    const elapsed = ts - (this.last ?? ts);
    if (elapsed >= 1000 / 30 || this.last === undefined) { // cap at ~30fps to save battery
      const dt = Math.min(elapsed / 1000, 0.1);
      this.t += dt;
      this.last = ts;
      this.render(dt);
    }
    requestAnimationFrame(this.loop);
  }

  resume() {
    if (this.running || !this.animate || !this.scene) return;
    this.running = true;
    this.last = undefined;
    requestAnimationFrame(this.loop);
  }

  pause() {
    this.running = false;
  }
}
