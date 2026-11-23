// Prototype option B : animations 2D vectorielles (SVG), même cinématique que la 3D.
const NS = 'http://www.w3.org/2000/svg';
const ease = t => t * t * (3 - 2 * t);
function repPhase(t) {
  const T = 3.6, x = t % T;
  if (x < 1.2) return ease(x / 1.2); if (x < 1.5) return 1;
  if (x < 3.2) return 1 - ease((x - 1.5) / 1.7); return 0;
}
function ik2(S, T, L1, L2, pole) { // 2D
  let dx = T[0] - S[0], dy = T[1] - S[1]; let d = Math.hypot(dx, dy);
  d = Math.min(Math.max(d, 1e-4), L1 + L2 - 1e-4);
  const ux = dx / Math.hypot(dx, dy), uy = dy / Math.hypot(dx, dy);
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
  let px = -uy, py = ux; if (px * pole[0] + py * pole[1] < 0) { px = -px; py = -py; }
  const E = [S[0] + ux * a + px * h, S[1] + uy * a + py * h];
  const H = [S[0] + ux * d, S[1] + uy * d];
  return [E, H];
}

const C = { skin: '#ece6dc', skinFar: '#b9b2a7', frame: '#3a4152', frameLight: '#4b5468', pad: '#1b1e25', steel: '#aeb6c4', plate: '#353b48', on: '#ff5a3c', cable: '#8c95a8' };

function makeSvg(container, defsExtra = '') {
  container.innerHTML = `<svg viewBox="0 0 400 400" width="100%" height="100%" xmlns="${NS}">
    <defs>
      <linearGradient id="bgB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#171b27"/><stop offset="1" stop-color="#0b0d12"/></linearGradient>
      <linearGradient id="hotB" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff8a4c"/><stop offset="1" stop-color="#ff2d55"/></linearGradient>
      <filter id="glowB" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      ${defsExtra}
    </defs>
    <rect width="400" height="400" rx="24" fill="url(#bgB)"/>
    <ellipse cx="200" cy="372" rx="170" ry="10" fill="#000" opacity=".35"/>
    <g id="scene"></g></svg>`;
  const g = container.querySelector('#scene');
  const el = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); g.appendChild(n); return n; };
  const line = (w, color, extra = {}) => el('line', { stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', ...extra });
  const setL = (n, a, b) => { n.setAttribute('x1', a[0]); n.setAttribute('y1', a[1]); n.setAttribute('x2', b[0]); n.setAttribute('y2', b[1]); };
  return { el, line, setL };
}
function loop(fn) {
  const api = { playing: true, speed: 1, t: 0 }; let last = performance.now();
  const step = now => { const dt = (now - last) / 1000; last = now; if (api.playing) api.t += dt * api.speed; fn(repPhase(api.t)); requestAnimationFrame(step); };
  requestAnimationFrame(step); return api;
}

// ----------------------------------------------------------- LEG EXTENSION (vue de profil)
export function legExtension2D(container) {
  const { el, line, setL } = makeSvg(container);
  const S = 260, P = (z, y) => [150 + z * S, 370 - y * S];
  // pile de charges (arrière-plan)
  const stackX = P(-0.45, 0)[0];
  el('rect', { x: stackX - 22, y: P(0, 1.25)[1], width: 44, height: 1.25 * S - 4, rx: 6, fill: C.frame, opacity: 0.35 });
  const plates = []; for (let i = 0; i < 12; i++) plates.push(el('rect', { x: stackX - 16, width: 32, height: 6.5, rx: 2, fill: i >= 8 ? C.on : C.plate }));
  // bâti
  el('rect', { x: P(-0.2, 0)[0], y: P(0, 0.06)[1], width: 1.15 * S, height: 0.06 * S, rx: 6, fill: C.frame });
  el('rect', { x: P(0.07, 0)[0], y: P(0, 0.45)[1], width: 0.07 * S, height: 0.4 * S, rx: 5, fill: C.frame });
  const back = el('rect', { x: -10, y: -170, width: 22, height: 170, rx: 10, fill: C.pad });
  back.setAttribute('transform', `translate(${P(-0.17, 0.56).join(' ')}) rotate(-10)`);
  el('rect', { x: P(-0.06, 0)[0], y: P(0, 0.52)[1], width: 0.46 * S, height: 0.075 * S, rx: 9, fill: C.pad });
  // cinématique
  const farArm = [line(15, C.skinFar), line(13, C.skinFar)];
  const torso = line(46, C.skin), head = el('ellipse', { rx: 26, ry: 31, fill: C.skin });
  const lever = line(10, C.frameLight), roller = el('circle', { r: 15, fill: C.pad, stroke: '#2c313c', 'stroke-width': 3 });
  const thigh = line(32, C.skin), quad = line(18, 'url(#hotB)', { filter: 'url(#glowB)' });
  const shin = line(24, C.skin), foot = line(16, C.skin);
  const pivot = el('circle', { r: 9, fill: C.steel });
  const nearArm = [line(16, C.skin), line(14, C.skin)];
  const hip = [0, 0.6], lean = 0.17, knee = [0.44, 0.58];
  return loop(k => {
    const phi = (8 + 80 * k) * Math.PI / 180;
    const sh = [hip[0] - Math.sin(lean) * 0.46, hip[1] + Math.cos(lean) * 0.46];
    const hd = [hip[0] - Math.sin(lean) * 0.68, hip[1] + Math.cos(lean) * 0.68];
    const ank = [knee[0] + Math.sin(phi) * 0.43, knee[1] - Math.cos(phi) * 0.43];
    const toe = [ank[0] + Math.cos(phi) * 0.2, ank[1] + Math.sin(phi) * 0.2];
    setL(torso, P(...hip), P(...sh)); head.setAttribute('cx', P(...hd)[0]); head.setAttribute('cy', P(...hd)[1]);
    setL(thigh, P(...hip), P(...knee)); setL(shin, P(...knee), P(...ank)); setL(foot, P(...ank), P(...toe));
    const qa = P(hip[0] + 0.06, hip[1] + 0.035), qb = P(knee[0] - 0.04, knee[1] + 0.035);
    setL(quad, qa, qb); quad.setAttribute('opacity', 0.25 + 0.75 * k); quad.setAttribute('stroke-width', 14 + 6 * k);
    const pv = P(...knee); pivot.setAttribute('cx', pv[0]); pivot.setAttribute('cy', pv[1]);
    const rl = [knee[0] + Math.sin(phi) * 0.38 + Math.cos(phi) * 0.07, knee[1] - Math.cos(phi) * 0.38 + Math.sin(phi) * 0.07];
    setL(lever, P(...knee), P(...rl)); roller.setAttribute('cx', P(...rl)[0]); roller.setAttribute('cy', P(...rl)[1]);
    for (const [arm, off] of [[farArm, -0.02], [nearArm, 0]]) {
      const [E, H] = ik2(P(sh[0] + off, sh[1]), P(0.08 + off, 0.53), 0.3 * S, 0.27 * S, [1, 0]);
      setL(arm[0], P(sh[0] + off, sh[1]), E); setL(arm[1], E, H);
    }
    plates.forEach((p, i) => p.setAttribute('y', P(0, 0.1 + i * 0.03 + (i >= 8 ? k * 0.2 : 0))[1]));
  });
}

// ----------------------------------------------------------- TIRAGE VERTICAL (vue de face)
export function latPulldown2D(container) {
  const { el, line, setL } = makeSvg(container);
  const S = 150, P = (x, y) => [200 + x * S, 372 - y * S];
  // bâti en arrière-plan
  for (const x of [-0.2, 0.2]) el('rect', { x: P(x, 0)[0] - 6, y: P(0, 2.32)[1], width: 12, height: 2.32 * S, rx: 5, fill: C.frame, opacity: 0.55 });
  el('rect', { x: P(-0.26, 0)[0], y: P(0, 2.34)[1], width: 0.52 * S, height: 12, rx: 6, fill: C.frame });
  const plates = []; for (let i = 0; i < 12; i++) plates.push(el('rect', { x: P(-0.13, 0)[0], width: 0.26 * S, height: 5, rx: 2, fill: i >= 8 ? C.on : C.plate, opacity: 0.9 }));
  const pulley = el('circle', { cx: P(0, 2.22)[0], cy: P(0, 2.22)[1], r: 9, fill: C.steel });
  const cable = line(2, C.cable);
  // siège et cale-genoux
  el('rect', { x: P(-0.22, 0)[0], y: P(0, 0.52)[1], width: 0.44 * S, height: 12, rx: 6, fill: C.pad });
  el('rect', { x: P(-0.035, 0)[0], y: P(0, 0.47)[1], width: 0.07 * S, height: 0.47 * S, rx: 4, fill: C.frame });
  // corps
  const legs = [-1, 1].map(s => [line(30, C.skin), line(22, C.skin), s]);
  const pelvis = el('rect', { width: 0.3 * S, height: 0.14 * S, rx: 18, fill: C.skin });
  const torso = el('path', { fill: C.skin });
  const lats = [-1, 1].map(() => el('path', { fill: 'url(#hotB)', filter: 'url(#glowB)' }));
  const head = el('ellipse', { rx: 0.1 * S, ry: 0.12 * S, fill: C.skin });
  el('rect', { x: P(-0.26, 0)[0], y: P(0, 0.62)[1], width: 0.52 * S, height: 16, rx: 8, fill: C.pad });
  const arms = [-1, 1].map(s => [line(15, C.skin), line(13, C.skin), s]);
  const bar = line(5, C.steel), grips = [line(9, C.pad), line(9, C.pad)];
  const top = 1.6, bottom = 0.98;
  return loop(k => {
    const shY = 1.04 - 0.03 * k, hipY = 0.6;
    const bY = top + (bottom - top) * k;
    for (const [th, sh, s] of legs) { setL(th, P(s * 0.1, hipY), P(s * 0.12, 0.5)); setL(sh, P(s * 0.12, 0.5), P(s * 0.13, 0.07)); }
    const pp = P(-0.15, hipY + 0.08); pelvis.setAttribute('x', pp[0]); pelvis.setAttribute('y', pp[1]);
    const tp = (x, y) => P(x, y).join(' ');
    torso.setAttribute('d', `M ${tp(-0.2, shY + 0.03)} Q ${tp(0, shY + 0.07)} ${tp(0.2, shY + 0.03)} L ${tp(0.15, hipY + 0.3)} Q ${tp(0.13, hipY + 0.05)} ${tp(0, hipY + 0.05)} Q ${tp(-0.13, hipY + 0.05)} ${tp(-0.15, hipY + 0.3)} Z`);
    lats.forEach((l, i) => {
      const s = i ? 1 : -1;
      l.setAttribute('d', `M ${tp(s * 0.175, shY - 0.04)} Q ${tp(s * (0.2 + 0.02 * k), shY - 0.2)} ${tp(s * 0.12, hipY + 0.14)} L ${tp(s * 0.1, hipY + 0.22)} Q ${tp(s * 0.14, shY - 0.18)} ${tp(s * 0.12, shY - 0.05)} Z`);
      l.setAttribute('opacity', 0.2 + 0.8 * k);
    });
    const hd = P(0, shY + 0.21); head.setAttribute('cx', hd[0]); head.setAttribute('cy', hd[1]);
    const hands = arms.map(([u, f, s]) => {
      const Sp = P(s * 0.19, shY), T = P(s * 0.46, bY);
      const [E, H] = ik2(Sp, T, 0.3 * S, 0.27 * S, [s, 1]);
      setL(u, Sp, E); setL(f, E, H); return H;
    });
    setL(bar, P(-0.6, bY), P(0.6, bY));
    setL(grips[0], P(-0.56, bY), P(-0.4, bY)); setL(grips[1], P(0.4, bY), P(0.56, bY));
    setL(cable, P(0, bY), P(0, 2.22));
    plates.forEach((p, i) => p.setAttribute('y', P(0, 1.55 + i * 0.035 + (i >= 8 ? k * 0.25 : 0))[1]));
    void hands;
  });
}
