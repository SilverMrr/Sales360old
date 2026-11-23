// Animations 2D épurées des exercices (SVG). Une silhouette + la machine, le muscle ciblé s'allume pendant l'effort.
// Coordonnées « monde » en mètres : x vers l'avant (vue de profil) ou vers la droite (vue de face), y vers le haut.
const NS = 'http://www.w3.org/2000/svg';
const ease = t => t * t * (3 - 2 * t);
// répétition : montée 1,2 s · pause 0,3 s · descente 1,7 s · pause 0,4 s
function repPhase(t) {
  const T = 3.6, x = t % T;
  if (x < 1.2) return ease(x / 1.2); if (x < 1.5) return 1;
  if (x < 3.2) return 1 - ease((x - 1.5) / 1.7); return 0;
}
const L = { torso: 0.46, head: 0.22, thigh: 0.44, shin: 0.43, foot: 0.19, up: 0.3, fore: 0.27 };
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const polar = (o, deg, len) => { const r = deg * Math.PI / 180; return [o[0] + Math.sin(r) * len, o[1] - Math.cos(r) * len]; }; // 0° = vers le bas, 90° = vers l'avant
function ik(S, T, L1, L2, pole) {
  const dx = T[0] - S[0], dy = T[1] - S[1], D = Math.hypot(dx, dy) || 1e-4;
  const d = Math.min(D, L1 + L2 - 1e-4), ux = dx / D, uy = dy / D;
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
  let px = -uy, py = ux; if (px * pole[0] + py * pole[1] < 0) { px = -px; py = -py; }
  return [[S[0] + ux * a + px * h, S[1] + uy * a + py * h], [S[0] + ux * d, S[1] + uy * d]];
}
// tronc : bassin + inclinaison (rad, positif = vers l'arrière)
const torsoPts = (hip, lean) => { const d = [-Math.sin(lean), Math.cos(lean)]; return { sh: add(hip, mul(d, L.torso)), head: add(hip, mul(d, L.torso + L.head)) }; };

const C = { skin: '#ece6dc', far: '#a9a39a', frame: '#3b4253', frame2: '#4c566b', pad: '#1c1f27', steel: '#aab3c2', plate: '#343a47', on: '#ff5a3c', cable: '#8b94a7', floor: '#232836' };

// ------------------------------------------------------------------ moteur
function stage(container, scale, origin) {
  container.innerHTML = `<svg viewBox="0 0 400 400" xmlns="${NS}" style="width:100%;height:100%;display:block">
    <defs><linearGradient id="hot" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a4c"/><stop offset="1" stop-color="#ff2d55"/></linearGradient></defs>
    <rect width="400" height="400" rx="20" fill="#11141c"/><g></g></svg>`;
  const g = container.querySelector('g');
  const P = p => [origin[0] + p[0] * scale, origin[1] - p[1] * scale];
  const W = w => w * scale / 260; // épaisseurs calibrées pour une échelle de 260 px/m
  const el = (tag, a = {}) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); g.appendChild(n); return n; };
  const ln = (w, color, extra = {}) => el('line', { stroke: color, 'stroke-width': W(w), 'stroke-linecap': 'round', ...extra });
  const setL = (n, a, b) => { const A = P(a), B = P(b); n.setAttribute('x1', A[0]); n.setAttribute('y1', A[1]); n.setAttribute('x2', B[0]); n.setAttribute('y2', B[1]); };
  const rect = (x, y, w, h, fill, r = 0.02, extra = {}) => { const A = P([x, y + h]); return el('rect', { x: A[0], y: A[1], width: w * scale, height: h * scale, rx: r * scale, fill, ...extra }); };
  const moveRect = (n, x, y, h) => { const A = P([x, y + h]); n.setAttribute('x', A[0]); n.setAttribute('y', A[1]); };
  const circ = (r, fill, extra = {}) => el('circle', { r: r * scale, fill, ...extra });
  const at = (n, p) => { const A = P(p); n.setAttribute('cx', A[0]); n.setAttribute('cy', A[1]); };
  el('line', { x1: 20, x2: 380, y1: origin[1] + 1, y2: origin[1] + 1, stroke: C.floor, 'stroke-width': 3, 'stroke-linecap': 'round' });
  return { P, W, el, ln, setL, rect, moveRect, circ, at, scale };
}
// surbrillance d'un muscle : bande décalée d'un côté d'un segment
function band(s, w, side, onTop = false) {
  const n = s.ln(w * 0.55, 'url(#hot)'); n.setAttribute('stroke-opacity', 0); if (s.mark && !onTop) s.mark.appendChild(n);
  return (a, b, k, t0 = 0.12, t1 = 0.88) => {
    const A = s.P(lerp(a, b, t0)), B = s.P(lerp(a, b, t1));
    let nx = -(B[1] - A[1]), ny = B[0] - A[0]; const l = Math.hypot(nx, ny) || 1; nx = nx / l * side * s.W(w) * 0.22; ny = ny / l * side * s.W(w) * 0.22;
    n.setAttribute('x1', A[0] + nx); n.setAttribute('y1', A[1] + ny); n.setAttribute('x2', B[0] + nx); n.setAttribute('y2', B[1] + ny);
    n.setAttribute('stroke-opacity', 0.15 + 0.85 * k);
  };
}
function dot(s, r) { const n = s.circ(r, 'url(#hot)', { 'fill-opacity': 0 }); if (s.mark) s.mark.appendChild(n); return (p, k) => { s.at(n, p); n.setAttribute('fill-opacity', 0.15 + 0.85 * k); }; }

// silhouette de profil (regard vers la droite) ; far = membres côté opposé, plus sombres, dessinés derrière
function sideFigure(s, { farArm = true, farLeg = false } = {}) {
  const fa = farArm ? [s.ln(15, C.far), s.ln(13, C.far)] : null;
  const fl = farLeg ? [s.ln(30, C.far), s.ln(22, C.far), s.ln(14, C.far)] : null;
  const torso = s.ln(46, C.skin), head = s.circ(0.1, C.skin);
  const ol = (w) => s.ln(w + 7, '#11141c');
  const legO = [ol(32), ol(24), ol(15)];
  const leg = [s.ln(32, C.skin), s.ln(24, C.skin), s.ln(15, C.skin)];
  const late = []; // calques insérés entre jambe et bras (surbrillances)
  const mark = s.el('g'); s.mark = mark;
  const armO = [ol(16), ol(14)];
  const arm = [s.ln(16, C.skin), s.ln(14, C.skin)];
  return {
    mark,
    update(j) {
      if (fl && j.kneeF) { s.setL(fl[0], j.hip, j.kneeF); s.setL(fl[1], j.kneeF, j.ankF); s.setL(fl[2], j.ankF, j.toeF); }
      if (fa) { s.setL(fa[0], j.shF || j.sh, j.elbF || j.elb); s.setL(fa[1], j.elbF || j.elb, j.handF || j.hand); }
      s.setL(torso, j.hip, j.sh); s.at(head, j.head);
      for (const l of [legO, leg]) { s.setL(l[0], j.hip, j.knee); s.setL(l[1], j.knee, j.ank); s.setL(l[2], j.ank, j.toe); }
      for (const a of [armO, arm]) { s.setL(a[0], j.sh, j.elb); s.setL(a[1], j.elb, j.hand); }
    },
    _late: late,
  };
}
function stack(s, x, y0, n = 10, w = 0.2) {
  s.rect(x - w / 2 - 0.03, y0 - 0.03, w + 0.06, n * 0.034 + 0.36, C.frame, 0.03, { opacity: 0.45 });
  const plates = []; for (let i = 0; i < n; i++) plates.push(s.rect(x - w / 2, y0 + i * 0.034, w, 0.026, i >= n - 3 ? C.on : C.plate, 0.008));
  return lift => plates.forEach((p, i) => s.moveRect(p, x - w / 2, y0 + i * 0.034 + (i >= n - 3 ? lift : 0), 0.026));
}
const seatedLegs = (hip, knee, ank) => ({ knee, ank, toe: add(ank, [0.18, -0.04]) });

// ------------------------------------------------------------------ exercices
const A = {};

A.leg_ext = { view: 'Profil', muscles: 'Quadriceps', build(s) {
  const st = stack(s, -0.5, 0.1, 10);
  s.rect(-0.25, 0, 1.15, 0.05, C.frame); s.rect(0.06, 0.05, 0.07, 0.42, C.frame);
  const back = s.ln(22, C.pad); s.rect(-0.07, 0.48, 0.47, 0.07, C.pad, 0.03);
  const fig = sideFigure(s); const lever = s.ln(9, C.frame2); const roller = s.circ(0.055, C.pad); const pivot = s.circ(0.03, C.steel);
  const q = band(s, 32, -1);
  const hip = [0, 0.6], lean = 0.17;
  return k => {
    const phi = 8 + 80 * k, knee = [0.44, 0.58];
    const { sh, head } = torsoPts(hip, lean);
    const ank = polar(knee, phi, L.shin), toe = polar(ank, phi + 90, L.foot);
    const [elb, hand] = ik(sh, [0.1, 0.52], L.up, L.fore, [1, 0]);
    s.setL(back, [-0.2, 0.55], torsoPts([-0.13, 0.6], lean).sh);
    fig.update({ hip, sh, head, knee, ank, toe, elb, hand });
    const r = add(polar(knee, phi, 0.37), polar([0, 0], phi + 90, 0.07));
    s.setL(lever, knee, r); s.at(roller, r); s.at(pivot, knee);
    q(hip, knee, k); st(k * 0.2);
  };
} };

A.leg_curl = { view: 'Profil', muscles: 'Ischio-jambiers', build(s) {
  const st = stack(s, -0.5, 0.1, 10);
  s.rect(-0.25, 0, 1.2, 0.05, C.frame); s.rect(0.06, 0.05, 0.07, 0.42, C.frame);
  const back = s.ln(22, C.pad); s.rect(-0.07, 0.48, 0.47, 0.07, C.pad, 0.03);
  const fig = sideFigure(s); const h = band(s, 32, 1);
  s.rect(0.22, 0.65, 0.22, 0.07, C.pad, 0.035); // cale-cuisses
  const lever = s.ln(9, C.frame2); const roller = s.circ(0.055, C.pad); const pivot = s.circ(0.03, C.steel);
  const hip = [0, 0.6], lean = 0.2, knee = [0.44, 0.58];
  return k => {
    const phi = 82 - 115 * k;
    const { sh, head } = torsoPts(hip, lean);
    const ank = polar(knee, phi, L.shin), toe = polar(ank, phi + 90, L.foot);
    const [elb, hand] = ik(sh, [0.12, 0.53], L.up, L.fore, [1, 0]);
    s.setL(back, [-0.22, 0.55], torsoPts([-0.15, 0.6], lean).sh);
    fig.update({ hip, sh, head, knee, ank, toe, elb, hand });
    const r = add(polar(knee, phi, 0.37), polar([0, 0], phi - 90, 0.07));
    s.setL(lever, knee, r); s.at(roller, r); s.at(pivot, knee);
    h(hip, knee, k); st(k * 0.2);
  };
} };

A.leg_press = { view: 'Profil', muscles: 'Quadriceps, fessiers', build(s) {
  s.rect(-0.35, 0, 1.45, 0.05, C.frame); s.rect(-0.05, 0.05, 0.07, 0.38, C.frame);
  s.rect(-0.12, 0.43, 0.4, 0.07, C.pad, 0.03);
  const back = s.ln(24, C.pad);
  const rail = s.ln(8, C.frame2); s.setL(rail, [0.4, 0.38], [1.1, 0.38]);
  const plate = s.rect(0, 0.42, 0.05, 0.5, C.frame2, 0.02);
  const fig = sideFigure(s); const q = band(s, 32, -1); const gl = dot(s, 0.075);
  const hip = [0.02, 0.52], lean = 0.5;
  return k => {
    const ank = [0.45 + 0.36 * k, 0.6];
    const [knee] = ik(hip, ank, L.thigh, L.shin, [0, 1]);
    const toe = add(ank, [0.04, 0.18]);
    const { sh, head } = torsoPts(hip, lean);
    s.setL(back, [-0.12, 0.5], torsoPts([-0.08, 0.5], lean).sh);
    const [elb, hand] = ik(sh, [0.08, 0.46], L.up, L.fore, [1, 0]);
    s.moveRect(plate, ank[0] + 0.07, 0.42, 0.5);
    fig.update({ hip, sh, head, knee, ank, toe, elb, hand });
    q(hip, knee, k); gl(add(hip, [-0.06, -0.02]), k * 0.7);
  };
} };

A.chest_press = { view: 'Profil', muscles: 'Pectoraux, triceps', build(s) {
  const st = stack(s, -0.52, 0.1, 10);
  s.rect(-0.3, 0, 1.0, 0.05, C.frame); s.rect(-0.02, 0.05, 0.07, 0.42, C.frame);
  s.rect(-0.1, 0.47, 0.44, 0.07, C.pad, 0.03); const back = s.ln(24, C.pad);
  const fig = sideFigure(s); const pec = band(s, 46, -1); const tri = band(s, 16, 1, true);
  const lever = s.ln(8, C.frame2), grip = s.ln(10, C.pad); const piv = s.circ(0.03, C.steel); s.at(piv, [-0.02, 1.42]);
  const hip = [0.02, 0.58], lean = 0.06;
  return k => {
    const { sh, head } = torsoPts(hip, lean);
    s.setL(back, [-0.12, 0.56], torsoPts([-0.11, 0.58], lean).sh);
    const T = [sh[0] + 0.14 + 0.42 * k, sh[1] - 0.06];
    const [elb, hand] = ik(sh, T, L.up, L.fore, [-0.3, -1]);
    const knee = [0.44, 0.56], ank = [0.47, 0.1];
    fig.update({ hip, sh, head, knee, ank, toe: add(ank, [0.18, -0.04]), elb, hand });
    s.setL(lever, [-0.02, 1.42], hand); s.setL(grip, add(hand, [0, -0.06]), add(hand, [0, 0.06]));
    pec(hip, sh, k, 0.55, 0.95); tri(sh, elb, k * 0.6); st(k * 0.2);
  };
} };

A.shoulder_press_m = { view: 'Profil', muscles: 'Deltoïdes, triceps', build(s) {
  const st = stack(s, -0.55, 0.1, 10);
  s.rect(-0.3, 0, 1.0, 0.05, C.frame); s.rect(-0.02, 0.05, 0.07, 0.42, C.frame);
  s.rect(-0.1, 0.47, 0.44, 0.07, C.pad, 0.03); const back = s.ln(24, C.pad);
  const fig = sideFigure(s); const del = dot(s, 0.07); const tri = band(s, 16, 1, true);
  const lever = s.ln(8, C.frame2), grip = s.ln(10, C.pad); const piv = s.circ(0.03, C.steel); s.at(piv, [-0.3, 1.25]);
  const hip = [0.02, 0.58], lean = 0.1;
  return k => {
    const { sh, head } = torsoPts(hip, lean);
    s.setL(back, [-0.12, 0.56], torsoPts([-0.11, 0.58], lean).sh);
    const T = [sh[0] + 0.07, sh[1] + 0.04 + 0.5 * k];
    const [elb, hand] = ik(sh, T, L.up, L.fore, [1, -0.6]);
    const knee = [0.44, 0.56], ank = [0.47, 0.1];
    fig.update({ hip, sh, head, knee, ank, toe: add(ank, [0.18, -0.04]), elb, hand });
    s.setL(lever, [-0.3, 1.25], hand); s.setL(grip, add(hand, [-0.05, 0]), add(hand, [0.05, 0]));
    del(sh, k); tri(sh, elb, k * 0.6); st(k * 0.2);
  };
} };

A.seated_row = { view: 'Profil', muscles: 'Milieu du dos, grand dorsal, biceps', build(s) {
  s.rect(-0.35, 0, 1.4, 0.05, C.frame); s.rect(-0.12, 0.05, 0.07, 0.36, C.frame); s.rect(-0.22, 0.41, 0.4, 0.07, C.pad, 0.03);
  const foot = s.rect(0.62, 0.05, 0.06, 0.38, C.frame2, 0.02);
  const pul = s.circ(0.04, C.steel); s.at(pul, [0.8, 0.5]); s.rect(0.76, 0.05, 0.08, 0.42, C.frame);
  const cable = s.ln(2.5, C.cable);
  const fig = sideFigure(s); const back = band(s, 46, 1); const bi = band(s, 16, -1, true);
  const hip = [0, 0.53];
  return k => {
    const lean = -0.28 + 0.36 * k;
    const { sh, head } = torsoPts(hip, lean);
    const ank = [0.6, 0.32];
    const [knee] = ik(hip, ank, L.thigh, L.shin, [0, 1]);
    const T = lerp([sh[0] + 0.55, sh[1] - 0.1], [hip[0] + 0.14, hip[1] + 0.2], k);
    const [elb, hand] = ik(sh, T, L.up, L.fore, [-1, -0.3]);
    fig.update({ hip, sh, head, knee, ank, toe: add(ank, [0.03, 0.18]), elb, hand });
    s.setL(cable, hand, [0.8, 0.5]);
    back(hip, sh, k, 0.45, 0.95); bi(sh, elb, k * 0.5);
  };
} };

A.lat_pd = { view: 'Face', muscles: 'Grand dorsal', build(s) {
  for (const x of [-0.2, 0.2]) s.rect(x - 0.035, 0, 0.07, 2.32, C.frame, 0.02, { opacity: 0.5 });
  s.rect(-0.26, 2.3, 0.52, 0.06, C.frame, 0.03);
  const st = stack(s, 0, 1.5, 10, 0.24);
  const pul = s.circ(0.045, C.steel); s.at(pul, [0, 2.22]); const cable = s.ln(2.5, C.cable);
  s.rect(-0.22, 0.47, 0.44, 0.07, C.pad, 0.03); s.rect(-0.035, 0, 0.07, 0.47, C.frame);
  const legs = [-1, 1].map(() => [s.ln(30, C.skin), s.ln(22, C.skin)]);
  const pelvis = s.rect(-0.15, 0.56, 0.3, 0.14, C.skin, 0.07);
  const torso = s.el('path', { fill: C.skin });
  const lats = [-1, 1].map(() => s.el('path', { fill: 'url(#hot)' }));
  const head = s.circ(0.1, C.skin);
  s.rect(-0.26, 0.6, 0.52, 0.1, C.pad, 0.05);
  const arms = [-1, 1].map(() => [s.ln(15, C.skin), s.ln(13, C.skin)]);
  const bar = s.ln(5, C.steel), grips = [s.ln(9, C.pad), s.ln(9, C.pad)];
  const tp = (x, y) => s.P([x, y]).join(' ');
  return k => {
    const shY = 1.04 - 0.03 * k, hipY = 0.6, bY = 1.6 - 0.62 * k;
    legs.forEach(([t, sh], i) => { const x = i ? 1 : -1; s.setL(t, [x * 0.1, hipY], [x * 0.12, 0.5]); s.setL(sh, [x * 0.12, 0.5], [x * 0.13, 0.06]); });
    torso.setAttribute('d', `M ${tp(-0.2, shY + 0.03)} Q ${tp(0, shY + 0.07)} ${tp(0.2, shY + 0.03)} L ${tp(0.15, hipY + 0.3)} Q ${tp(0.13, hipY + 0.05)} ${tp(0, hipY + 0.05)} Q ${tp(-0.13, hipY + 0.05)} ${tp(-0.15, hipY + 0.3)} Z`);
    lats.forEach((l, i) => { const x = i ? 1 : -1;
      l.setAttribute('d', `M ${tp(x * 0.175, shY - 0.04)} Q ${tp(x * (0.2 + 0.02 * k), shY - 0.2)} ${tp(x * 0.12, hipY + 0.14)} L ${tp(x * 0.1, hipY + 0.22)} Q ${tp(x * 0.14, shY - 0.18)} ${tp(x * 0.12, shY - 0.05)} Z`);
      l.setAttribute('fill-opacity', 0.15 + 0.85 * k); });
    s.at(head, [0, shY + 0.21]);
    arms.forEach(([u, f], i) => { const x = i ? 1 : -1; const S = [x * 0.19, shY]; const [E, H] = ik(S, [x * 0.46, bY], L.up, L.fore, [x, -0.2]); s.setL(u, S, E); s.setL(f, E, H); });
    s.setL(bar, [-0.6, bY], [0.6, bY]); s.setL(grips[0], [-0.56, bY], [-0.4, bY]); s.setL(grips[1], [0.4, bY], [0.56, bY]);
    s.setL(cable, [0, bY], [0, 2.22]); st(k * 0.25);
  };
} };

A.pushdown = { view: 'Profil', muscles: 'Triceps', build(s) {
  s.rect(0.36, 0, 0.08, 2.15, C.frame, 0.02); const pul = s.circ(0.04, C.steel); s.at(pul, [0.34, 2.05]);
  const cable = s.ln(2.5, C.cable), grip = s.ln(10, C.pad);
  const fig = sideFigure(s, { farLeg: true }); const tri = band(s, 16, 1, true);
  const hip = [0, 0.93], lean = -0.1;
  return k => {
    const { sh, head } = torsoPts(hip, lean);
    const elb = add(sh, [0.04, -L.up]);
    const hand = polar(elb, 108 - 108 * k, L.fore);
    fig.update({ hip, sh, head, knee: [0.03, 0.5], ank: [0, 0.08], toe: [0.19, 0.04], kneeF: [-0.02, 0.5], ankF: [-0.1, 0.08], toeF: [0.09, 0.04], elb, hand });
    s.setL(cable, hand, [0.34, 2.05]); s.setL(grip, add(hand, [-0.04, -0.04]), add(hand, [0.04, 0.04]));
    tri(sh, elb, k);
  };
} };

A.curl_db = { view: 'Profil', muscles: 'Biceps', build(s) {
  const fig = sideFigure(s, { farLeg: true }); const bi = band(s, 16, -1, true);
  const db = s.ln(9, C.steel), w1 = s.ln(16, C.pad), w2 = s.ln(16, C.pad);
  const hip = [0, 0.93], lean = 0.02;
  return k => {
    const { sh, head } = torsoPts(hip, lean);
    const elb = add(sh, [0.02, -L.up]);
    const hand = polar(elb, 8 + 132 * k, L.fore);
    fig.update({ hip, sh, head, knee: [0.03, 0.5], ank: [0, 0.08], toe: [0.19, 0.04], kneeF: [-0.02, 0.5], ankF: [-0.04, 0.08], toeF: [0.15, 0.04], elb, hand });
    // haltère vu de bout, perpendiculaire à l'avant-bras
    const a = (8 + 132 * k + 90) * Math.PI / 180, d = [Math.sin(a) * 0.08, -Math.cos(a) * 0.08];
    s.setL(db, add(hand, mul(d, -1)), add(hand, d)); s.setL(w1, add(hand, mul(d, -1)), add(hand, mul(d, -0.6))); s.setL(w2, add(hand, mul(d, 0.6)), add(hand, d));
    bi(sh, elb, k);
  };
} };

A.lat_raise_db = { view: 'Face', muscles: 'Deltoïdes latéraux', build(s) {
  const legs = [-1, 1].map(() => [s.ln(30, C.skin), s.ln(22, C.skin)]);
  const torso = s.el('path', { fill: C.skin });
  const head = s.circ(0.1, C.skin);
  const arms = [-1, 1].map(() => [s.ln(15, C.skin), s.ln(13, C.skin), s.ln(18, C.pad)]);
  const dels = [dot(s, 0.065), dot(s, 0.065)];
  const tp = (x, y) => s.P([x, y]).join(' ');
  return k => {
    const shY = 1.4, hipY = 0.93;
    legs.forEach(([t, sh], i) => { const x = i ? 1 : -1; s.setL(t, [x * 0.09, hipY], [x * 0.1, 0.5]); s.setL(sh, [x * 0.1, 0.5], [x * 0.11, 0.06]); });
    torso.setAttribute('d', `M ${tp(-0.2, shY + 0.02)} Q ${tp(0, shY + 0.06)} ${tp(0.2, shY + 0.02)} L ${tp(0.15, hipY + 0.2)} L ${tp(0.15, hipY - 0.04)} L ${tp(-0.15, hipY - 0.04)} L ${tp(-0.15, hipY + 0.2)} Z`);
    s.at(head, [0, shY + 0.21]);
    arms.forEach(([u, f, d], i) => { const x = i ? 1 : -1;
      const S = [x * 0.19, shY], a = (12 + 76 * k) * x;
      const E = polar(S, a, L.up), H = polar(E, a + 12 * x, L.fore);
      s.setL(u, S, E); s.setL(f, E, H); s.setL(d, add(H, [0, -0.05]), add(H, [0, 0.05]));
      dels[i](S, k); });
  };
} };

// ------------------------------------------------------------------ API publique
const SCALE = { 'Profil': [260, [140, 372]], 'Face': [150, [200, 372]] };
const STANDING = { leg_ext: [235, [178, 372]], leg_curl: [235, [178, 372]], chest_press: [235, [175, 372]], shoulder_press_m: [215, [185, 372]], pushdown: [175, [150, 380]], curl_db: [175, [170, 380]], lat_raise_db: [185, [200, 380]], leg_press: [250, [130, 372]], seated_row: [240, [120, 372]] };

export const hasAnim = id => id in A;
export function animInfo(id) { return A[id] ? { view: A[id].view, muscles: A[id].muscles } : null; }
export function mountAnim(container, id) {
  const spec = A[id]; if (!spec) return null;
  const [scale, origin] = STANDING[id] || SCALE[spec.view];
  const s = stage(container, scale, origin);
  const draw = spec.build(s);
  const api = { playing: true, speed: 1, t: 0, stopped: false };
  let last = performance.now();
  const step = now => {
    if (api.stopped || !container.isConnected) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (api.playing) api.t += dt * api.speed;
    draw(repPhase(api.t));
    requestAnimationFrame(step);
  };
  draw(0); requestAnimationFrame(step);
  api.stop = () => { api.stopped = true; };
  return api;
}
export const ANIM_IDS = Object.keys(A);
