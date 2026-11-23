// Mini-bibliothèque de graphiques SVG (sans dépendance).
const NS = 'http://www.w3.org/2000/svg';
const fmtDate = t => new Date(t).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function frame(el, h) {
  const w = Math.max(260, el.clientWidth || 320);
  el.innerHTML = '';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('width', '100%'); svg.setAttribute('height', h);
  svg.classList.add('chart');
  el.appendChild(svg);
  return { svg, w, h };
}
function node(svg, tag, attrs, text) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  svg.appendChild(n); return n;
}
function yAxis(svg, pad, w, h, max, fmt) {
  for (let i = 0; i <= 4; i++) {
    const v = max * i / 4, y = h - pad.b - (h - pad.t - pad.b) * i / 4;
    node(svg, 'line', { x1: pad.l, x2: w - pad.r, y1: y, y2: y, class: 'grid' });
    node(svg, 'text', { x: pad.l - 6, y: y + 3, 'text-anchor': 'end', class: 'axis' }, fmt(v));
  }
}

// points: [{t, v, label?}]
export function lineChart(el, points, { height = 200, fmt = v => Math.round(v), color = 'var(--accent)', bands } = {}) {
  const { svg, w, h } = frame(el, height);
  if (!points.length) { node(svg, 'text', { x: w / 2, y: h / 2, 'text-anchor': 'middle', class: 'axis' }, 'Pas encore de données'); return; }
  const pad = { l: 42, r: 12, t: 12, b: 24 };
  const vmax = niceMax(Math.max(...points.map(p => p.v)) * 1.08);
  const vmin = 0;
  const t0 = points[0].t, t1 = points[points.length - 1].t || t0 + 1;
  const X = t => pad.l + (w - pad.l - pad.r) * (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0));
  const Y = v => h - pad.b - (h - pad.t - pad.b) * (v - vmin) / (vmax - vmin);
  yAxis(svg, pad, w, h, vmax, fmt);
  if (bands) for (const b of bands) node(svg, 'rect', { x: pad.l, width: w - pad.l - pad.r, y: Y(Math.min(b.to, vmax)), height: Math.max(0, Y(b.from) - Y(Math.min(b.to, vmax))), fill: b.color, opacity: 0.12 });
  const d = points.map((p, i) => (i ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join(' ');
  const area = d + ` L ${X(t1)} ${Y(0)} L ${X(t0)} ${Y(0)} Z`;
  node(svg, 'path', { d: area, fill: color, opacity: 0.1 });
  node(svg, 'path', { d, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round' });
  points.forEach(p => {
    const c = node(svg, 'circle', { cx: X(p.t), cy: Y(p.v), r: 3.5, fill: color, class: 'pt' });
    const tt = document.createElementNS(NS, 'title'); tt.textContent = `${fmtDate(p.t)} : ${p.label ?? fmt(p.v)}`; c.appendChild(tt);
  });
  const nTicks = Math.min(points.length, Math.floor(w / 70));
  for (let i = 0; i < nTicks; i++) {
    const p = points[Math.round(i * (points.length - 1) / Math.max(1, nTicks - 1))];
    node(svg, 'text', { x: X(p.t), y: h - 6, 'text-anchor': 'middle', class: 'axis' }, fmtDate(p.t));
  }
}

// bars: [{label, v, color?}]
export function barChart(el, bars, { height = 180, fmt = v => Math.round(v), color = 'var(--accent)', refLines = [] } = {}) {
  const { svg, w, h } = frame(el, height);
  const pad = { l: 42, r: 8, t: 12, b: 24 };
  const vmax = niceMax(Math.max(1, ...bars.map(b => b.v), ...refLines.map(r => r.v)) * 1.05);
  yAxis(svg, pad, w, h, vmax, fmt);
  const bw = (w - pad.l - pad.r) / bars.length;
  const Y = v => h - pad.b - (h - pad.t - pad.b) * v / vmax;
  bars.forEach((b, i) => {
    const x = pad.l + i * bw + bw * 0.15;
    const r = node(svg, 'rect', { x, width: bw * 0.7, y: Y(b.v), height: Math.max(0, Y(0) - Y(b.v)), rx: 3, fill: b.color || color });
    const tt = document.createElementNS(NS, 'title'); tt.textContent = `${b.label} : ${fmt(b.v)}`; r.appendChild(tt);
    if (bw >= 38 || i % 2 === (bars.length - 1) % 2) node(svg, 'text', { x: x + bw * 0.35, y: h - 6, 'text-anchor': 'middle', class: 'axis' }, b.label);
  });
  for (const r of refLines) {
    node(svg, 'line', { x1: pad.l, x2: w - pad.r, y1: Y(r.v), y2: Y(r.v), stroke: r.color, 'stroke-dasharray': '4 4', 'stroke-width': 1.5 });
    node(svg, 'text', { x: w - pad.r - 2, y: Y(r.v) - 4, 'text-anchor': 'end', class: 'axis', fill: r.color }, r.label);
  }
}

// Heatmap calendrier type "contributions" ; map: {dayTs: valeur}
export function calendarHeatmap(el, map, weeks = 26) {
  const cell = 13, gap = 3;
  const w = weeks * (cell + gap) + 24, h = 7 * (cell + gap) + 18;
  el.innerHTML = '';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('width', w); svg.style.maxWidth = '100%'; svg.style.height = 'auto'; svg.classList.add('chart');
  el.appendChild(svg);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - ((today.getDay() + 6) % 7) - (weeks - 1) * 7);
  const vmax = Math.max(1, ...Object.values(map));
  let lastMonth = -1;
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    if (d > today) break;
    const col = Math.floor(i / 7), row = i % 7;
    const v = map[d.getTime()] || 0;
    const x = 24 + col * (cell + gap), y = 14 + row * (cell + gap);
    const r = node(svg, 'rect', { x, y, width: cell, height: cell, rx: 3, fill: v ? 'var(--accent)' : 'var(--cell)', opacity: v ? 0.3 + 0.7 * v / vmax : 1 });
    const tt = document.createElementNS(NS, 'title'); tt.textContent = `${d.toLocaleDateString('fr-FR')} : ${v} séries`; r.appendChild(tt);
    if (row === 0 && d.getMonth() !== lastMonth) { lastMonth = d.getMonth(); node(svg, 'text', { x, y: 9, class: 'axis' }, d.toLocaleDateString('fr-FR', { month: 'short' })); }
  }
  ['L', '', 'M', '', 'V', '', 'D'].forEach((l, i) => l && node(svg, 'text', { x: 0, y: 14 + i * (cell + gap) + 10, class: 'axis' }, l));
}
