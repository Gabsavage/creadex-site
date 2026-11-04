// Animated type backdrop of the detail page: the same loop as the game's interface backdrop
// (maquette « Fond de type », docs/features/ui-backdrop in creatures-rumble). A light middle, two
// dark corner triangles (top left, bottom right), a fast irregular light line on each edge and
// the type's stylised word scrolling along both sides of each line. Everything is relative to the
// screen height, so it fits any screen.

// Gab's settings from the maquette (04/11/2026); the game uses the same ones.
const S = {
  cornerH: 0.25,   // top corner: height taken on the left edge (fraction of the height)
  cornerW: 0.58,   // top corner: length taken on the top edge (fraction of the width)
  textSec: 14,     // seconds for the text to move by one tile
  lineMul: 18,     // light lines speed, × the text
  lineThick: 1,
  textSize: 0.085, // fraction of the height
  gap: 2.2,        // space between two words, × the word width
  dist: 0.65,      // text row distance to the line, × the row height
  outlineLight: 7, outlineDark: 7, // outline, % of the text size
  opacity: 0.16,
};

// Palettes that differ from the type color (red mixed with white reads pink, not fire).
const LOOKS = { Fire: { dark: [226, 84, 20], light: [255, 168, 60], lightHi: [255, 214, 118] } };

const WHITE = [255, 255, 255], BLACK = [0, 0, 0];
const mix = (c, w, k) => c.map((v, i) => Math.round(v + (w[i] - v) * k));
const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const hexRgb = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

// Irregular light line: ribbons whose offset and width are sums of sines with integer harmonics
// of the period, so the strip tiles exactly.
function makeLine(seed) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const ribbons = [];
  for (let r = 0; r < 4; r++) {
    const harm = [1, 2, 3, 5].map(k => ({ k, a: rnd() * (1 / k), p: rnd() * Math.PI * 2 }));
    const wid = [1, 2, 4].map(k => ({ k, a: rnd(), p: rnd() * Math.PI * 2 }));
    ribbons.push({ harm, wid, base: (rnd() - 0.5) * 1.6, w: 0.25 + rnd() * 0.9, alpha: 0.45 + rnd() * 0.5 });
  }
  return ribbons;
}
const LINES = [makeLine(1234567), makeLine(7654321)];

const WORDMARK_XH = 80; // x-height of assets/wordmarks/<Type>.png, in px

export function createBackdrop(host) {
  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  host.appendChild(cv);
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const images = {};
  const tiles = new Map();
  let type = null, color = [45, 48, 50], raf = 0, t = 0, last = 0, running = false;

  function wordmark(name) {
    if (!images[name]) {
      const im = new Image();
      im.src = `assets/wordmarks/${name}.png`;
      im.onload = () => tiles.clear();
      images[name] = im;
    }
    const im = images[name];
    return im.complete && im.naturalWidth ? im : null;
  }

  function tinted(img, fill, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = fill; x.fillRect(0, 0, w, h);
    return c;
  }

  // One opaque tile (word, fill + outline), drawn with one alpha.
  function tile(fontPx, fill, stroke, pct) {
    const key = [type, fontPx, fill, stroke, pct].join('|');
    if (tiles.has(key)) return tiles.get(key);
    const sw = fontPx * pct / 100, pad = Math.ceil(sw + 2);
    const c = document.createElement('canvas'), x = c.getContext('2d');
    const img = wordmark(type);
    if (img) {
      const k = (fontPx * 0.62) / WORDMARK_XH;
      const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
      c.width = w + pad * 2; c.height = h + pad * 2;
      if (sw > 0) {
        const o = tinted(img, stroke, w, h);
        for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; x.drawImage(o, pad + Math.cos(a) * sw, pad + Math.sin(a) * sw); }
      }
      x.drawImage(tinted(img, fill, w, h), pad, pad);
      c.wordW = w;
      tiles.set(key, c);
    } else { // until the image is in: plain text, not cached
      const font = `900 ${fontPx}px "Source Sans 3", Arial, sans-serif`;
      x.font = font;
      const tw = x.measureText(type).width;
      c.width = Math.ceil(tw + pad * 2); c.height = Math.ceil(fontPx * 1.2 + pad * 2);
      x.font = font; x.textBaseline = 'middle'; x.lineJoin = 'round';
      if (sw > 0) { x.lineWidth = sw * 2; x.strokeStyle = stroke; x.strokeText(type, pad, c.height / 2); }
      x.fillStyle = fill; x.fillText(type, pad, c.height / 2);
      c.wordW = tw;
    }
    if (tiles.size > 40) tiles.delete(tiles.keys().next().value);
    return c;
  }

  function row(img, alpha, y, dir, span) {
    const step = img.wordW * (1 + S.gap);
    const off = ((t * (step / S.textSec) * dir) % step + step) % step;
    ctx.globalAlpha = alpha;
    for (let x = -span - step * 2 + off; x < span + step; x += step) ctx.drawImage(img, x, y - img.height / 2);
    ctx.globalAlpha = 1;
  }

  function line(ribbons, offset, period, unit, span) {
    const g = ctx.createLinearGradient(0, -unit * 3, 0, unit * 3);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.32)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-span, -unit * 3, span * 2, unit * 6);
    const stepX = Math.max(4, period / 160);
    for (const rb of ribbons) {
      const top = [], bot = [];
      for (let x = -span; x <= span + stepX; x += stepX) {
        const u = ((x - offset) / period) * Math.PI * 2;
        let dy = rb.base;
        for (const h of rb.harm) dy += h.a * Math.sin(h.k * u + h.p) * 1.4;
        let w = 0;
        for (const h of rb.wid) w += h.a * Math.sin(h.k * u + h.p);
        w = Math.max(0, 0.15 + w * 0.55) * rb.w * unit * S.lineThick * 0.9;
        const y = dy * unit * 1.2;
        top.push([x, y - w]); bot.push([x, y + w]);
      }
      ctx.beginPath();
      top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
      ctx.closePath();
      ctx.fillStyle = `rgba(255,255,255,${rb.alpha})`;
      ctx.fill();
    }
  }

  function draw() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(host.clientWidth * dpr), H = Math.round(host.clientHeight * dpr);
    if (!W || !H) return;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const look = LOOKS[type] || {};
    const base = look.dark || color;
    const light = look.light || mix(base, WHITE, 0.55), lightHi = look.lightHi || mix(base, WHITE, 0.72);
    const deep = mix(base, BLACK, 0.22);

    const rg = ctx.createRadialGradient(W * 0.45, H * 0.5, 0, W * 0.45, H * 0.5, Math.hypot(W, H) * 0.55);
    rg.addColorStop(0, rgba(lightHi)); rg.addColorStop(1, rgba(light));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

    const D = Math.hypot(W, H);
    const fontPx = Math.round(H * S.textSize), rowH = fontPx * 1.9;
    const unit = H * 0.012, period = H * 1.7;
    const lineSpeed = (H * 0.33 / S.textSec) * S.lineMul;
    const tDark = tile(fontPx, rgba(mix(base, WHITE, 0.45)), rgba(mix(base, BLACK, 0.3)), S.outlineDark);
    const tLight = tile(fontPx, rgba(mix(light, WHITE, 0.35)), rgba(mix(base, BLACK, 0.05)), S.outlineLight);
    const aDark = Math.min(1, S.opacity * 1.6), aLight = Math.min(1, S.opacity * 0.7);

    const aH = H * S.cornerH, cW = W * S.cornerW, theta = Math.atan2(aH, cW);
    const corners = [
      { mx: cW / 2, my: aH / 2, side: -1, textDir: -1, lineDir: 1, ribbons: LINES[0] },
      { mx: W - cW / 2, my: H - aH / 2, side: 1, textDir: 1, lineDir: -1, ribbons: LINES[1] },
    ];
    for (const c of corners) {
      ctx.save();
      ctx.translate(c.mx, c.my);
      ctx.rotate(-theta);
      const depth = Math.min(aH, cW) * Math.cos(theta);
      const g = ctx.createLinearGradient(0, 0, 0, c.side * depth);
      g.addColorStop(0, rgba(base)); g.addColorStop(1, rgba(deep));
      ctx.fillStyle = g;
      if (c.side < 0) ctx.fillRect(-D, -D, 2 * D, D); else ctx.fillRect(-D, 0, 2 * D, D);
      row(tDark, aDark, c.side * rowH * S.dist, c.textDir, D);
      row(tLight, aLight, -c.side * rowH * S.dist, -c.textDir, D);
      line(c.ribbons, ((t * lineSpeed * c.lineDir) % period + period) % period, period, unit, D);
      ctx.restore();
    }
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!reduce.matches) t += dt;
    draw();
    raf = requestAnimationFrame(frame);
  }

  return {
    setType(name, hex) { type = name; color = hexRgb(hex || '#2d3032'); tiles.clear(); wordmark(name); if (!running) draw(); },
    start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}
