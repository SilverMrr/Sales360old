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
    // un trait parfaitement vertical / horizontal a une boîte englobante plate : le dégradé ne s'afficherait pas
    if (Math.abs(B[0] - A[0]) < 0.5) B[0] += 0.5; if (Math.abs(B[1] - A[1]) < 0.5) B[1] += 0.5;
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
  const torso = s.ln(46, C.skin), torso2 = s.ln(46, C.skin), head = s.circ(0.1, C.skin);
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
      if (j.mid) { s.setL(torso, j.hip, j.mid); s.setL(torso2, j.mid, j.sh); } else { s.setL(torso, j.hip, j.sh); s.setL(torso2, j.sh, j.sh); } // j.mid : tronc enroulé (crunch)
      s.at(head, j.head);
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
  const fig = sideFigure(s); const pec = band(s, 46, 1); const tri = band(s, 16, 1, true);
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
  const fig = sideFigure(s); const back = band(s, 46, -1); const bi = band(s, 16, -1, true);
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

// ------------------------------------------------------------------ lot 2 : l'exercice le plus efficace de chaque muscle
// silhouette de face (ou de dos) : jambes, tronc, tête ; les bras sont dessinés par l'exercice
function frontFigure(s, { seated = false, legs = true } = {}) {
  const lg = legs ? [-1, 1].map(() => [s.ln(30, C.skin), s.ln(22, C.skin)]) : null;
  if (seated) s.rect(-0.15, 0.56, 0.3, 0.14, C.skin, 0.07);
  const torso = s.el('path', { fill: C.skin }); const head = s.circ(0.1, C.skin);
  const tp = (x, y) => s.P([x, y]).join(' ');
  return { tp, update(shY, hipY, o = {}) {
    if (lg) lg.forEach(([t, sh], i) => { const x = i ? 1 : -1;
      if (seated) { s.setL(t, [x * 0.1, hipY], [x * 0.12, 0.5]); s.setL(sh, [x * 0.12, 0.5], [x * 0.13, 0.06]); }
      else { s.setL(t, [x * 0.09, hipY], [x * 0.1, 0.5]); s.setL(sh, [x * 0.1, 0.5], [x * 0.11, 0.06]); } });
    const l = o.sl || [-0.2, shY], r = o.sr || [0.2, shY], m = lerp(l, r, 0.5);
    torso.setAttribute('d', `M ${tp(l[0], l[1] + 0.02)} Q ${tp(m[0], m[1] + 0.06)} ${tp(r[0], r[1] + 0.02)} L ${tp(0.15, hipY + 0.2)} L ${tp(0.15, hipY - 0.04)} L ${tp(-0.15, hipY - 0.04)} L ${tp(-0.15, hipY + 0.2)} Z`);
    s.at(head, [m[0], o.headY ?? m[1] + 0.21]);
  } };
}
const hotPath = s => s.el('path', { fill: 'url(#hot)', 'fill-opacity': 0 });
const lit = (p, d, k) => { p.setAttribute('d', d); p.setAttribute('fill-opacity', 0.15 + 0.85 * k); };

// pec deck (et reverse) vu de face / de dos : adduction horizontale = la main passe du côté vers le centre
function deck(reverse) { return { view: reverse ? 'Dos' : 'Face', muscles: reverse ? 'Deltoïdes postérieurs, milieu du dos' : 'Pectoraux', build(s) {
  s.rect(-0.3, 1.6, 0.6, 0.06, C.frame, 0.03);
  for (const x of [-0.28, 0.28]) s.rect(x - 0.03, 0, 0.06, 1.62, C.frame, 0.02, { opacity: 0.5 });
  const st = stack(s, 0.74, 0.15, 10, 0.16);
  s.rect(-0.035, 0, 0.07, 0.47, C.frame); s.rect(-0.22, 0.47, 0.44, 0.07, C.pad, 0.03);
  s.rect(-0.16, 0.62, 0.32, 0.8, C.pad, 0.04);
  const mk = () => ({ lever: s.ln(7, C.frame2), u: s.ln(15, C.skin), f: s.ln(13, C.skin), g: s.ln(9, C.pad) });
  let arms = reverse ? [mk(), mk()] : null; // de dos, les mains passent derrière le tronc
  const fig = frontFigure(s, { seated: true });
  const pecs = reverse ? null : [hotPath(s), hotPath(s)];
  const rh = reverse ? hotPath(s) : null;
  if (!reverse) arms = [mk(), mk()];
  const dels = reverse ? [dot(s, 0.065), dot(s, 0.065)] : null;
  const tp = fig.tp;
  return k => {
    const shY = 1.04, hipY = 0.6, th = (reverse ? 95 * (1 - k) : 98 * k) * Math.PI / 180, bend = reverse ? 0.1 : 0.26;
    fig.update(shY, hipY);
    arms.forEach((a, i) => { const x = i ? 1 : -1;
      const S = [x * 0.19, shY - 0.02], E = [x * (0.19 + 0.3 * Math.cos(th)), shY - 0.06];
      const H = [E[0] + x * 0.27 * Math.cos(th + bend), shY - 0.08];
      s.setL(a.lever, [x * 0.22, 1.6], H); s.setL(a.u, S, E); s.setL(a.f, E, H); s.setL(a.g, add(H, [0, -0.06]), add(H, [0, 0.06]));
      if (dels) dels[i](S, k); });
    if (pecs) pecs.forEach((p, i) => { const x = i ? 1 : -1;
      lit(p, `M ${tp(x * 0.02, shY - 0.02)} Q ${tp(x * 0.17, shY - 0.01)} ${tp(x * 0.19, shY - 0.08)} Q ${tp(x * 0.16, shY - 0.21)} ${tp(x * 0.03, shY - 0.2)} Z`, k); });
    if (rh) lit(rh, `M ${tp(-0.03, shY - 0.04)} L ${tp(-0.12, shY - 0.08)} L ${tp(-0.04, shY - 0.25)} L ${tp(0.04, shY - 0.25)} L ${tp(0.12, shY - 0.08)} L ${tp(0.03, shY - 0.04)} Z`, k * 0.5);
    st(k * 0.2);
  };
} }; }
A.pec_deck = deck(false);
A.reverse_pec_deck = deck(true);

// rotation externe : l'avant-bras (vu de face, raccourci quand il pointe vers nous) passe du ventre vers l'extérieur
A.ext_rot_cable = { view: 'Face', muscles: 'Coiffe des rotateurs', build(s) {
  s.rect(-0.82, 0, 0.08, 1.9, C.frame, 0.02); const pul = s.circ(0.04, C.steel); s.at(pul, [-0.72, 1.08]);
  const fig = frontFigure(s); const cable = s.ln(2.5, C.cable);
  const idle = [s.ln(15, C.skin), s.ln(13, C.skin)];
  const u = s.ln(15, C.skin), f = s.ln(13, C.skin), g = s.ln(9, C.pad); const rc = dot(s, 0.065);
  return k => {
    const shY = 1.4; fig.update(shY, 0.93);
    s.setL(idle[0], [-0.19, shY], [-0.21, shY - 0.3]); s.setL(idle[1], [-0.21, shY - 0.3], [-0.22, shY - 0.57]);
    const S = [0.19, shY], E = [0.21, shY - 0.3], ph = (170 - 130 * k) * Math.PI / 180;
    const H = [E[0] + 0.27 * Math.cos(ph), E[1] - 0.03 * Math.sin(ph)];
    s.setL(cable, H, [-0.72, 1.08]); s.setL(u, S, E); s.setL(f, E, H); s.setL(g, add(H, [0, -0.05]), add(H, [0, 0.05]));
    rc(S, k);
  };
} };

A.shrug_db = { view: 'Face', muscles: 'Trapèzes', build(s) {
  const fig = frontFigure(s); const traps = [hotPath(s), hotPath(s)];
  const arms = [-1, 1].map(() => [s.ln(15, C.skin), s.ln(13, C.skin), s.ln(18, C.pad)]);
  const tp = fig.tp;
  return k => {
    const shY = 1.4 + 0.07 * k; fig.update(shY, 0.93, { headY: 1.62 });
    traps.forEach((p, i) => { const x = i ? 1 : -1;
      lit(p, `M ${tp(x * 0.035, 1.5)} Q ${tp(x * 0.08, shY + 0.05)} ${tp(x * 0.19, shY + 0.02)} L ${tp(x * 0.13, shY - 0.04)} Q ${tp(x * 0.06, shY - 0.02)} ${tp(x * 0.02, shY - 0.05)} Z`, k); });
    arms.forEach(([u, f, d], i) => { const x = i ? 1 : -1;
      const S = [x * 0.19, shY], E = [x * 0.21, shY - 0.3], H = [x * 0.22, shY - 0.57];
      s.setL(u, S, E); s.setL(f, E, H); s.setL(d, add(H, [0, -0.05]), add(H, [0, 0.05])); });
  };
} };

A.woodchopper = { view: 'Face', muscles: 'Obliques', build(s) {
  s.rect(0.78, 0, 0.08, 2.2, C.frame, 0.02); const pul = s.circ(0.04, C.steel); s.at(pul, [0.74, 2.1]);
  const fig = frontFigure(s); const obl = [hotPath(s), hotPath(s)]; const cable = s.ln(2.5, C.cable);
  const arms = [-1, 1].map(() => [s.ln(15, C.skin), s.ln(13, C.skin)]); const grip = s.ln(10, C.pad);
  const tp = fig.tp;
  return k => {
    const hipY = 0.93, sl = lerp([-0.08, 1.42], [-0.17, 1.3], k), sr = lerp([0.17, 1.38], [0.08, 1.32], k);
    const H = lerp([0.38, 1.8], [-0.3, 0.9], k);
    fig.update(0, hipY, { sl, sr });
    obl.forEach((p, i) => { const x = i ? 1 : -1;
      lit(p, `M ${tp(x * 0.155, hipY + 0.28)} L ${tp(x * 0.15, hipY + 0.02)} Q ${tp(x * 0.1, hipY)} ${tp(x * 0.07, hipY + 0.06)} L ${tp(x * 0.1, hipY + 0.26)} Z`, k); });
    s.setL(cable, H, [0.74, 2.1]);
    arms.forEach(([u, f], i) => { const x = i ? 1 : -1; const S = i ? sr : sl; const [E, Hh] = ik(S, add(H, [x * 0.03, 0]), L.up, L.fore, [x, -1]); s.setL(u, S, E); s.setL(f, E, Hh); });
    s.setL(grip, add(H, [-0.07, 0]), add(H, [0.07, 0]));
  };
} };

// machines abducteurs / adducteurs, vues de face : les genoux s'écartent ou se rapprochent
function hipMachine(out) { return { view: 'Face', muscles: out ? 'Moyen fessier (abducteurs)' : 'Adducteurs', build(s) {
  const st = stack(s, 0.66, 0.12, 10, 0.16);
  s.rect(-0.035, 0, 0.07, 0.47, C.frame); s.rect(-0.28, 0.47, 0.56, 0.07, C.pad, 0.03); s.rect(-0.17, 0.62, 0.34, 0.75, C.pad, 0.04);
  const bar = s.ln(6, C.frame2); s.setL(bar, [-0.42, 0.08], [0.42, 0.08]);
  const legs = [-1, 1].map(() => ({ lev: s.ln(6, C.frame2), t: s.ln(30, C.skin), sh: s.ln(22, C.skin), pad: s.ln(16, C.pad) }));
  const fig = frontFigure(s, { seated: true, legs: false });
  const arms = [-1, 1].map(() => [s.ln(15, C.skin), s.ln(13, C.skin)]);
  const hl = [dot(s, out ? 0.06 : 0.045), dot(s, out ? 0.06 : 0.045)];
  return k => {
    const shY = 1.04, kx = out ? 0.13 + 0.2 * k : 0.33 - 0.2 * k;
    fig.update(shY, 0.6);
    legs.forEach((l, i) => { const x = i ? 1 : -1, px = out ? kx + 0.075 : kx - 0.075;
      const K = [x * kx, 0.5], An = [x * (0.04 + kx * 0.9), 0.12];
      s.setL(l.t, [x * 0.1, 0.6], K); s.setL(l.sh, K, An);
      s.setL(l.pad, [x * px, 0.4], [x * px, 0.6]); s.setL(l.lev, [x * 0.04, 0.3], [x * px, 0.4]);
      hl[i](out ? [x * 0.17, 0.66] : [x * (kx * 0.5 + 0.03), 0.53], k); });
    arms.forEach(([u, f], i) => { const x = i ? 1 : -1; const S = [x * 0.19, shY]; const [E, H] = ik(S, [x * 0.27, 0.62], L.up, L.fore, [x, 0]); s.setL(u, S, E); s.setL(f, E, H); });
    st(k * 0.2);
  };
} }; }
A.abduction_m = hipMachine(true);
A.adduction_m = hipMachine(false);

A.wrist_curl = { view: 'Profil', muscles: 'Fléchisseurs du poignet (avant-bras)', build(s) {
  s.rect(-0.3, 0.42, 0.55, 0.07, C.pad, 0.03); s.rect(-0.1, 0, 0.07, 0.42, C.frame);
  const fig = sideFigure(s); const fl = band(s, 14, -1, true);
  const hd = s.ln(11, C.skin), db = s.ln(9, C.steel), w1 = s.ln(16, C.pad), w2 = s.ln(16, C.pad);
  const hip = [0, 0.56], lean = -0.6, knee = [0.43, 0.53], ank = [0.47, 0.08], wr = [0.5, 0.6];
  return k => {
    const { sh, head } = torsoPts(hip, lean);
    const [elb] = ik(sh, wr, L.up, L.fore, [0, -1]);
    fig.update({ hip, sh, head, knee, ank, toe: add(ank, [0.18, -0.04]), elb, hand: wr });
    const ps = 20 + 125 * k, tip = polar(wr, ps, 0.09), d = polar([0, 0], ps + 90, 0.08);
    s.setL(hd, wr, tip); s.setL(db, add(tip, mul(d, -1)), add(tip, d)); s.setL(w1, add(tip, mul(d, -1)), add(tip, mul(d, -0.6))); s.setL(w2, add(tip, mul(d, 0.6)), add(tip, d));
    fl(elb, wr, k);
  };
} };

A.straight_arm = { view: 'Profil', muscles: 'Grand dorsal', build(s) {
  s.rect(0.82, 0, 0.08, 2.1, C.frame, 0.02); const pul = s.circ(0.04, C.steel); s.at(pul, [0.8, 2.0]);
  const cable = s.ln(2.5, C.cable), grip = s.ln(10, C.pad);
  const fig = sideFigure(s, { farLeg: true }); const lat = band(s, 46, -1);
  const hip = [-0.05, 0.9], lean = -0.45;
  return k => {
    const { sh, head } = torsoPts(hip, lean);
    const a = 150 - 140 * k, elb = polar(sh, a, L.up), hand = polar(elb, a - 8, L.fore);
    fig.update({ hip, sh, head, knee: [0.05, 0.49], ank: [0, 0.08], toe: [0.19, 0.04], kneeF: [-0.02, 0.49], ankF: [-0.12, 0.08], toeF: [0.07, 0.04], elb, hand });
    s.setL(cable, hand, [0.8, 2.0]); s.setL(grip, add(hand, [-0.05, 0.03]), add(hand, [0.05, -0.03]));
    lat(hip, sh, k, 0.4, 0.95);
  };
} };

A.back_ext = { view: 'Profil', muscles: 'Lombaires (fessiers en second)', build(s) {
  const hip = [0, 0.88], knee = polar(hip, -45, L.thigh), ank = polar(knee, -45, L.shin), toe = polar(ank, 45, L.foot);
  const base = s.ln(8, C.frame); s.setL(base, [-0.75, 0.03], [0.3, 0.03]);
  const pad = add(polar(hip, -45, 0.12), polar([0, 0], 45, 0.1));
  const post = s.ln(8, C.frame); s.setL(post, [pad[0], 0.03], pad);
  const off = polar([0, 0], -45, 0.045), plat = s.ln(8, C.frame2); s.setL(plat, add(add(ank, off), polar([0, 0], -135, 0.03)), add(toe, off));
  const leg2 = s.ln(8, C.frame); s.setL(leg2, add(ank, off), [ank[0] - 0.02, 0.03]);
  s.at(s.circ(0.07, C.pad), pad);
  const fig = sideFigure(s); const lb = band(s, 46, -1); const gl = dot(s, 0.07);
  return k => {
    const a = 40 + 95 * k, { sh, head } = torsoPts(hip, (a - 180) * Math.PI / 180);
    const [elb, hand] = ik(sh, polar(polar(hip, a, 0.3), a - 90, 0.1), L.up, L.fore, polar([0, 0], a - 90, 1));
    fig.update({ hip, sh, head, knee, ank, toe, elb, hand });
    lb(hip, sh, k, 0.08, 0.6); gl(polar(hip, a + 90, 0.06), k * 0.6);
  };
} };

A.crunch = { view: 'Profil', muscles: 'Abdominaux (grand droit)', build(s) {
  s.rect(-0.78, 0, 1.4, 0.025, C.pad, 0.01);
  const fig = sideFigure(s); const ab1 = band(s, 46, 1), ab2 = band(s, 46, 1);
  const hip = [0, 0.12], mid = [-0.22, 0.12], ank = [0.42, 0.075];
  return k => {
    const a = -90 - 38 * k, sh = polar(mid, a, 0.24), head = polar(sh, a, L.head);
    const [knee] = ik(hip, ank, L.thigh, L.shin, [0, 1]);
    const [elb, hand] = ik(sh, lerp(sh, head, 0.8), L.up, L.fore, [0.3, 1]);
    fig.update({ hip, mid, sh, head, knee, ank, toe: add(ank, [0.17, -0.04]), elb, hand });
    ab1(hip, mid, k * 0.8, 0, 1); ab2(mid, sh, k, 0, 0.9);
  };
} };

A.hip_thrust = { view: 'Profil', muscles: 'Fessiers', build(s) {
  s.rect(-0.5, 0.05, 0.42, 0.35, C.frame, 0.02); s.rect(-0.52, 0.38, 0.46, 0.08, C.pad, 0.03);
  const plate = s.circ(0.22, C.plate);
  const fig = sideFigure(s); const gl = dot(s, 0.085); const ham = band(s, 32, 1);
  const bar = s.circ(0.035, C.steel);
  const sh = [-0.1, 0.52], ank = [0.8, 0.08];
  return k => {
    const th = (48 - 52 * k) * Math.PI / 180, hip = [sh[0] + 0.46 * Math.cos(th), sh[1] - 0.46 * Math.sin(th)];
    const head = add(sh, mul([sh[0] - hip[0], sh[1] - hip[1]], L.head / 0.46));
    const [knee] = ik(hip, ank, L.thigh, L.shin, [0, 1]);
    const bp = add(hip, [0.06, 0.1]); s.at(plate, bp); s.at(bar, bp);
    const [elb, hand] = ik(sh, add(bp, [-0.05, 0]), L.up, L.fore, [0, 1]);
    fig.update({ hip, sh, head, knee, ank, toe: add(ank, [0.18, -0.04]), elb, hand });
    gl(add(hip, [-0.03, -0.05]), k); ham(hip, knee, k * 0.4);
  };
} };

A.captain_chair = { view: 'Profil', muscles: 'Abdominaux, fléchisseurs de hanche', build(s) {
  s.rect(-0.34, 0, 0.08, 1.95, C.frame, 0.02); s.rect(-0.34, 0, 0.7, 0.05, C.frame);
  s.rect(-0.27, 1.0, 0.07, 0.78, C.pad, 0.03); s.rect(-0.12, 1.27, 0.42, 0.06, C.pad, 0.03); s.rect(-0.27, 1.28, 0.15, 0.04, C.frame);
  const fig = sideFigure(s); const ab = band(s, 46, 1); const hf = band(s, 32, -1);
  const sh = [-0.04, 1.66], elb = [-0.03, 1.36], hand = [0.24, 1.36];
  return k => {
    const lean = 0.2 * k, d = [-Math.sin(lean), Math.cos(lean)], hip = add(sh, mul(d, -L.torso)), head = add(sh, mul(d, L.head));
    const a = 4 + 100 * k, b = a - 90 * k, knee = polar(hip, a, L.thigh), ank = polar(knee, b, L.shin), toe = polar(ank, b + 55, L.foot);
    fig.update({ hip, sh, head, knee, ank, toe, elb, hand });
    ab(hip, sh, k, 0.1, 0.8); hf(hip, knee, k * 0.6, 0.05, 0.5);
  };
} };

A.calf_leg_press = { view: 'Profil', muscles: 'Mollets', build(s) {
  s.rect(-0.35, 0, 1.45, 0.05, C.frame); s.rect(-0.05, 0.05, 0.07, 0.38, C.frame);
  s.rect(-0.12, 0.43, 0.4, 0.07, C.pad, 0.03);
  const back = s.ln(24, C.pad);
  const rail = s.ln(8, C.frame2); s.setL(rail, [0.4, 0.38], [1.1, 0.38]);
  const plate = s.rect(0, 0.42, 0.05, 0.5, C.frame2, 0.02);
  const fig = sideFigure(s); const cf = band(s, 24, 1);
  const hip = [0.02, 0.52], lean = 0.5, ank = [0.76, 0.6];
  return k => {
    const [knee] = ik(hip, ank, L.thigh, L.shin, [0, 1]), toe = polar(ank, 196 - 50 * k, L.foot);
    const { sh, head } = torsoPts(hip, lean);
    s.setL(back, [-0.12, 0.5], torsoPts([-0.08, 0.5], lean).sh);
    const [elb, hand] = ik(sh, [0.08, 0.46], L.up, L.fore, [1, 0]);
    s.moveRect(plate, toe[0] + 0.02, 0.42, 0.5);
    fig.update({ hip, sh, head, knee, ank, toe, elb, hand });
    cf(knee, ank, k, 0.1, 0.75);
  };
} };

A.tib_raise = { view: 'Profil', muscles: 'Tibial antérieur', build(s) {
  s.rect(-0.16, 0, 0.08, 2.05, C.frame, 0.02, { opacity: 0.6 });
  const fig = sideFigure(s); const tb = band(s, 24, -1);
  const hip = [0.03, 0.9], ank = [0.33, 0.08], knee = lerp(hip, ank, 0.5);
  return k => {
    const { sh, head } = torsoPts(hip, 0.02);
    const elb = polar(sh, 3, L.up), hand = polar(elb, 8, L.fore);
    fig.update({ hip, sh, head, knee, ank, toe: polar(ank, 105 + 32 * k, L.foot), elb, hand });
    tb(knee, ank, k, 0.1, 0.85);
  };
} };

A.neck_flex = { view: 'Profil', muscles: 'Fléchisseurs du cou', build(s) {
  s.rect(-0.45, 0, 0.06, 0.4, C.frame); s.rect(0.2, 0, 0.06, 0.4, C.frame); s.rect(-0.55, 0.38, 0.88, 0.07, C.pad, 0.03);
  const neck = s.ln(16, C.skin);
  const fig = sideFigure(s); const nk = band(s, 16, -1, true); const plate = s.ln(8, C.plate);
  const hip = [-0.16, 0.53], sh = [0.3, 0.53], pv = [0.36, 0.53];
  const knee = [-0.6, 0.5], ank = [-0.64, 0.08];
  return k => {
    const phi = 62 + 98 * k, head = polar(pv, phi, 0.14), pc = polar(head, phi + 90, 0.12);
    s.setL(neck, sh, head);
    const [elb, hand] = ik(sh, pc, L.up, L.fore, [0, 1]);
    fig.update({ hip, sh, head, knee, ank, toe: add(ank, [-0.18, -0.03]), elb, hand });
    s.setL(plate, polar(pc, phi, 0.1), polar(pc, phi + 180, 0.1));
    nk(sh, head, k, 0.3, 0.75);
  };
} };

// ------------------------------------------------------------------ lot 3 : le 2e exercice le plus efficace de chaque muscle
function dumbbell(s, r = 0.08) { // barre le long de la direction polaire deg
  const db = s.ln(9, C.steel), w1 = s.ln(16, C.pad), w2 = s.ln(16, C.pad);
  return (h, deg) => { const d = polar([0, 0], deg, r); s.setL(db, add(h, mul(d, -1)), add(h, d)); s.setL(w1, add(h, mul(d, -1)), add(h, mul(d, -0.6))); s.setL(w2, add(h, mul(d, 0.6)), add(h, d)); };
}
const pecD = (tp, x, shY) => `M ${tp(x * 0.02, shY - 0.02)} Q ${tp(x * 0.17, shY - 0.01)} ${tp(x * 0.19, shY - 0.08)} Q ${tp(x * 0.16, shY - 0.21)} ${tp(x * 0.03, shY - 0.2)} Z`;
const STAND = { knee: [0.03, 0.5], ank: [0, 0.08], toe: [0.19, 0.04], kneeF: [-0.02, 0.5], ankF: [-0.05, 0.08], toeF: [0.14, 0.04] };
// bras vu de face avec contour sombre (lisible devant le tronc)
function frontArm(s) {
  const o = [s.ln(22, '#11141c'), s.ln(20, '#11141c')], l = [s.ln(15, C.skin), s.ln(13, C.skin)];
  return (S, E, H) => { s.setL(o[0], S, E); s.setL(o[1], E, H); s.setL(l[0], S, E); s.setL(l[1], E, H); };
}
const pulley = (s, x, y) => { const n = s.circ(0.04, C.steel); s.at(n, [x, y]); return n; };

A.cable_cross = { view: 'Face', muscles: 'Pectoraux', build(s) {
  for (const x of [-0.84, 0.84]) s.rect(x - 0.04, 0, 0.08, 2.0, C.frame, 0.02, { opacity: 0.6 });
  for (const x of [-0.76, 0.76]) pulley(s, x, 1.92);
  const fig = frontFigure(s); const pecs = [hotPath(s), hotPath(s)];
  const cables = [s.ln(2.5, C.cable), s.ln(2.5, C.cable)];
  const arms = [-1, 1].map(() => ({ arm: frontArm(s), g: s.ln(9, C.pad) }));
  return k => {
    const shY = 1.4, th = (8 + 92 * k) * Math.PI / 180, drop = 0.02 + 0.25 * k;
    fig.update(shY, 0.93);
    pecs.forEach((p, i) => lit(p, pecD(fig.tp, i ? 1 : -1, shY), k));
    arms.forEach((a, i) => { const x = i ? 1 : -1;
      const S = [x * 0.19, shY - 0.02], E = [x * (0.19 + 0.3 * Math.cos(th)), shY - 0.04 - drop * 0.5], H = [E[0] + x * 0.27 * Math.cos(th + 0.3), shY - 0.06 - drop];
      s.setL(cables[i], H, [x * 0.76, 1.92]); a.arm(S, E, H); s.setL(a.g, add(H, [0, -0.05]), add(H, [0, 0.05])); });
  };
} };

A.ohp_db = { view: 'Profil', muscles: 'Deltoïdes antérieurs, triceps', build(s) {
  s.rect(-0.16, 0, 0.06, 0.45, C.frame); s.rect(0.2, 0, 0.06, 0.45, C.frame); s.rect(-0.2, 0.45, 0.5, 0.07, C.pad, 0.03);
  const hip = [0.02, 0.58], lean = 0.06;
  const back = s.ln(24, C.pad); s.setL(back, [-0.12, 0.52], torsoPts([-0.11, 0.58], lean).sh);
  const fig = sideFigure(s); const del = dot(s, 0.07); const tri = band(s, 16, 1, true);
  const db = s.circ(0.075, C.pad), dbc = s.circ(0.025, C.steel);
  return k => {
    const { sh, head } = torsoPts(hip, lean);
    const [elb, hand] = ik(sh, [sh[0] + 0.06, sh[1] + 0.06 + 0.46 * k], L.up, L.fore, [1, -0.6]);
    fig.update({ hip, sh, head, knee: [0.44, 0.56], ank: [0.47, 0.1], toe: [0.65, 0.06], elb, hand });
    s.at(db, hand); s.at(dbc, hand); del(sh, k); tri(sh, elb, k * 0.6);
  };
} };

A.overhead_cable = { view: 'Profil', muscles: 'Triceps (chef long)', build(s) {
  s.rect(-0.66, 0, 0.08, 1.9, C.frame, 0.02); pulley(s, -0.56, 1.78);
  const cable = s.ln(2.5, C.cable), grip = s.ln(10, C.pad);
  const fig = sideFigure(s, { farLeg: true }); const tri = band(s, 16, 1, true);
  const hip = [0, 0.93], lean = -0.35;
  return k => {
    const { sh, head } = torsoPts(hip, lean);
    const elb = polar(sh, 140, L.up), hand = polar(elb, 300 - 150 * k, L.fore);
    fig.update({ hip, sh, head, knee: [0.12, 0.5], ank: [0.18, 0.08], toe: [0.37, 0.04], kneeF: [-0.12, 0.5], ankF: [-0.25, 0.09], toeF: [-0.07, 0.03], elb, hand });
    s.setL(cable, hand, [-0.56, 1.78]); s.setL(grip, add(hand, [-0.03, -0.04]), add(hand, [0.03, 0.04]));
    tri(sh, elb, k);
  };
} };

A.cable_crunch = { view: 'Profil', muscles: 'Abdominaux (grand droit)', build(s) {
  s.rect(0.8, 0, 0.08, 2.1, C.frame, 0.02); pulley(s, 0.78, 2.0);
  s.rect(-0.66, 0, 0.8, 0.025, C.pad, 0.01);
  const cable = s.ln(2.5, C.cable);
  const fig = sideFigure(s); const ab1 = band(s, 46, 1), ab2 = band(s, 46, 1);
  const knee = [0.02, 0.07], ank = [-0.41, 0.07], toe = [-0.57, 0.03], hip = [0, 0.51];
  return k => {
    const a1 = 168 - 28 * k, a2 = 160 - 95 * k;
    const mid = polar(hip, a1, 0.22), sh = polar(mid, a2, 0.24), head = polar(sh, a2, L.head);
    const [elb, hand] = ik(sh, polar(lerp(sh, head, 0.7), a2 - 90, 0.07), L.up, L.fore, polar([0, 0], a2 - 90, 1));
    fig.update({ hip, mid, sh, head, knee, ank, toe, elb, hand });
    s.setL(cable, hand, [0.78, 2.0]);
    ab1(hip, mid, k * 0.8, 0, 1); ab2(mid, sh, k, 0, 0.9);
  };
} };

A.lat_raise_cable = { view: 'Face', muscles: 'Deltoïde latéral', build(s) {
  s.rect(-0.8, 0, 0.08, 1.9, C.frame, 0.02); pulley(s, -0.7, 0.14);
  const fig = frontFigure(s);
  const idle = [s.ln(15, C.skin), s.ln(13, C.skin)];
  const cable = s.ln(2.5, C.cable);
  const arm = frontArm(s), g = s.ln(18, C.pad); const del = dot(s, 0.065);
  return k => {
    const shY = 1.4; fig.update(shY, 0.93);
    const SL = [-0.19, shY], [eL, hL] = ik(SL, [-0.68, 1.15], L.up, L.fore, [0, -1]);
    s.setL(idle[0], SL, eL); s.setL(idle[1], eL, hL);
    const S = [0.19, shY], a = -8 + 94 * k, E = polar(S, a, L.up), H = polar(E, a + 10, L.fore);
    s.setL(cable, H, [-0.7, 0.14]); arm(S, E, H); s.setL(g, add(H, [0, -0.05]), add(H, [0, 0.05]));
    del(S, k);
  };
} };

A.shrug_smith = { view: 'Face', muscles: 'Trapèzes', build(s) {
  for (const x of [-0.74, 0.74]) s.rect(x - 0.035, 0, 0.07, 2.05, C.frame, 0.02, { opacity: 0.5 });
  s.rect(-0.78, 2.03, 1.56, 0.06, C.frame, 0.03, { opacity: 0.5 });
  const fig = frontFigure(s); const traps = [hotPath(s), hotPath(s)];
  const arms = [-1, 1].map(() => [s.ln(15, C.skin), s.ln(13, C.skin)]);
  const bar = s.ln(6, C.steel), plates = [s.ln(30, C.plate), s.ln(30, C.plate)];
  const tp = fig.tp;
  return k => {
    const shY = 1.4 + 0.07 * k, bY = shY - 0.57; fig.update(shY, 0.93, { headY: 1.62 });
    traps.forEach((p, i) => { const x = i ? 1 : -1;
      lit(p, `M ${tp(x * 0.035, 1.5)} Q ${tp(x * 0.08, shY + 0.05)} ${tp(x * 0.19, shY + 0.02)} L ${tp(x * 0.13, shY - 0.04)} Q ${tp(x * 0.06, shY - 0.02)} ${tp(x * 0.02, shY - 0.05)} Z`, k); });
    arms.forEach(([u, f], i) => { const x = i ? 1 : -1;
      const S = [x * 0.19, shY], E = [x * 0.22, shY - 0.3], H = [x * 0.25, bY];
      s.setL(u, S, E); s.setL(f, E, H); });
    s.setL(bar, [-0.84, bY], [0.84, bY]);
    plates.forEach((p, i) => { const x = i ? 1 : -1; s.setL(p, [x * 0.58, bY - 0.16], [x * 0.58, bY + 0.16]); });
  };
} };

A.face_pull = { view: 'Profil', muscles: 'Deltoïdes postérieurs, coiffe des rotateurs', build(s) {
  s.rect(0.88, 0, 0.08, 2.0, C.frame, 0.02); pulley(s, 0.86, 1.55);
  const cable = s.ln(2.5, C.cable), rope = s.ln(8, C.pad);
  const fig = sideFigure(s, { farLeg: true }); const dp = dot(s, 0.07);
  const hip = [0, 0.93], lean = 0.05;
  return k => {
    const { sh, head } = torsoPts(hip, lean);
    const e0 = polar(sh, 88, L.up), elb = lerp(e0, add(sh, [-0.03, 0.05]), k);
    const hand = lerp(polar(e0, 92, L.fore), add(sh, [0.1, 0.32]), k);
    fig.update({ hip, sh, head, ...STAND, elb, hand });
    s.setL(cable, hand, [0.86, 1.55]); s.setL(rope, add(hand, [0, -0.05]), add(hand, [0, 0.05]));
    dp(add(sh, [-0.04, 0]), k);
  };
} };

A.incline_curl = { view: 'Profil', muscles: 'Biceps (chef long)', build(s) {
  s.rect(-0.14, 0, 0.06, 0.45, C.frame); s.rect(0.22, 0, 0.06, 0.45, C.frame); s.rect(-0.2, 0.45, 0.52, 0.07, C.pad, 0.03);
  const hip = [0.02, 0.58], lean = 0.62;
  const back = s.ln(24, C.pad); s.setL(back, [-0.14, 0.5], torsoPts([-0.12, 0.56], lean).head);
  const fig = sideFigure(s); const bi = band(s, 16, -1, true); const db = dumbbell(s);
  return k => {
    const { sh, head } = torsoPts(hip, lean);
    const elb = add(sh, [0, -L.up]), phi = 4 + 130 * k, hand = polar(elb, phi, L.fore);
    fig.update({ hip, sh, head, knee: [0.44, 0.56], ank: [0.47, 0.1], toe: [0.65, 0.06], elb, hand });
    db(hand, phi + 90); bi(sh, elb, k);
  };
} };

A.cable_rear_fly = { view: 'Dos', muscles: 'Deltoïdes postérieurs, milieu du dos', build(s) {
  for (const x of [-0.86, 0.86]) s.rect(x - 0.04, 0, 0.08, 1.9, C.frame, 0.02, { opacity: 0.6 });
  for (const x of [-0.78, 0.78]) pulley(s, x, 1.36);
  const cables = [s.ln(2.5, C.cable), s.ln(2.5, C.cable)];
  const arms = [-1, 1].map(() => ({ u: s.ln(15, C.skin), f: s.ln(13, C.skin), g: s.ln(9, C.pad) }));
  const fig = frontFigure(s); const rh = hotPath(s); const dels = [dot(s, 0.065), dot(s, 0.065)];
  const tp = fig.tp;
  return k => {
    const shY = 1.4, th = (105 - 105 * k) * Math.PI / 180;
    fig.update(shY, 0.93);
    arms.forEach((a, i) => { const x = i ? 1 : -1;
      const S = [x * 0.19, shY - 0.02], E = [x * (0.19 + 0.3 * Math.cos(th)), shY - 0.05], H = [E[0] + x * 0.27 * Math.cos(th + 0.1), shY - 0.07];
      s.setL(cables[i], H, [-x * 0.78, 1.36]); s.setL(a.u, S, E); s.setL(a.f, E, H); s.setL(a.g, add(H, [0, -0.05]), add(H, [0, 0.05]));
      dels[i](S, k); });
    lit(rh, `M ${tp(-0.03, shY - 0.04)} L ${tp(-0.12, shY - 0.08)} L ${tp(-0.04, shY - 0.25)} L ${tp(0.04, shY - 0.25)} L ${tp(0.12, shY - 0.08)} L ${tp(0.03, shY - 0.04)} Z`, k * 0.5);
  };
} };

A.row_smith = { view: 'Profil', muscles: 'Milieu du dos, grand dorsal, biceps', build(s) {
  const bx = 0.27;
  s.rect(bx - 0.035, 0, 0.07, 1.85, C.frame, 0.02, { opacity: 0.45 });
  const plate = s.circ(0.17, C.plate);
  const fig = sideFigure(s); const back = band(s, 46, -1); const bi = band(s, 16, -1, true);
  const bar = s.circ(0.035, C.steel);
  const hip = [-0.02, 0.86], ank = [0.04, 0.08], lean = -0.78;
  return k => {
    const { sh, head } = torsoPts(hip, lean);
    const [knee] = ik(hip, ank, L.thigh, L.shin, [1, 0]);
    const hand = [bx, 0.62 + 0.38 * k];
    const [elb] = ik(sh, hand, L.up, L.fore, [-1, 0.4]);
    s.at(plate, hand); s.at(bar, hand);
    fig.update({ hip, sh, head, knee, ank, toe: add(ank, [0.19, -0.04]), elb, hand });
    back(hip, sh, k, 0.45, 0.95); bi(sh, elb, k * 0.5);
  };
} };

A.reverse_curl = { view: 'Profil', muscles: 'Avant-bras (brachio-radial), biceps', build(s) {
  const fig = sideFigure(s, { farLeg: true }); const bi = band(s, 16, -1, true); const fa = band(s, 14, -1, true);
  const bar = s.circ(0.04, C.steel);
  const hip = [0, 0.93], lean = 0.02;
  return k => {
    const { sh, head } = torsoPts(hip, lean);
    const elb = add(sh, [0.02, -L.up]), hand = polar(elb, 8 + 125 * k, L.fore);
    fig.update({ hip, sh, head, ...STAND, ankF: [-0.04, 0.08], toeF: [0.15, 0.04], elb, hand });
    s.at(bar, hand); fa(elb, hand, k); bi(sh, elb, k * 0.6);
  };
} };

A.lat_pd_uni = { view: 'Face', muscles: 'Grand dorsal', build(s) {
  s.rect(-0.04, 2.0, 0.62, 0.06, C.frame, 0.03); s.rect(0.5, 0, 0.08, 2.06, C.frame, 0.02, { opacity: 0.6 });
  pulley(s, 0.2, 1.97); const cable = s.ln(2.5, C.cable);
  s.rect(-0.32, 0, 0.64, 0.025, C.pad, 0.01);
  for (const x of [-1, 1]) s.setL(s.ln(30, C.skin), [x * 0.1, 0.5], [x * 0.12, 0.08]);
  const fig = frontFigure(s, { legs: false }); const lat = hotPath(s);
  const idle = [s.ln(15, C.skin), s.ln(13, C.skin)];
  const u = s.ln(15, C.skin), f = s.ln(13, C.skin), g = s.ln(10, C.pad);
  const tp = fig.tp;
  return k => {
    const shY = 0.97 - 0.02 * k, hipY = 0.5; fig.update(shY, hipY);
    lit(lat, `M ${tp(0.175, shY - 0.04)} Q ${tp(0.2 + 0.02 * k, shY - 0.2)} ${tp(0.12, hipY + 0.14)} L ${tp(0.1, hipY + 0.22)} Q ${tp(0.14, shY - 0.18)} ${tp(0.12, shY - 0.05)} Z`, k);
    const SL = [-0.19, shY], [eL, hL] = ik(SL, [-0.16, 0.56], L.up, L.fore, [-1, 0]);
    s.setL(idle[0], SL, eL); s.setL(idle[1], eL, hL);
    const S = [0.19, shY], H = lerp([0.2, shY + 0.54], [0.34, shY + 0.06], k);
    const [E] = ik(S, H, L.up, L.fore, [1, -0.3]);
    s.setL(u, S, E); s.setL(f, E, H); s.setL(g, add(H, [-0.05, 0]), add(H, [0.05, 0]));
    s.setL(cable, H, [0.2, 1.97]);
  };
} };

A.pallof = { view: 'Profil', muscles: 'Obliques (anti-rotation)', build(s) {
  s.rect(-0.46, 0, 0.08, 1.9, C.frame, 0.02); // poulie sur le côté, un peu en arrière
  pulley(s, -0.38, 1.2);
  const cable = s.ln(2.5, C.cable);
  const fig = sideFigure(s, { farLeg: true }); const ob = band(s, 46, 0);
  const grip = s.ln(10, C.pad);
  const hip = [0, 0.93];
  return k => {
    const { sh, head } = torsoPts(hip, 0);
    const [elb, hand] = ik(sh, [sh[0] + 0.14 + 0.42 * k, sh[1] - 0.14], L.up, L.fore, [-0.3, -1]);
    fig.update({ hip, sh, head, knee: [0.06, 0.5], ank: [0.05, 0.08], toe: [0.24, 0.04], kneeF: [-0.05, 0.5], ankF: [-0.08, 0.08], toeF: [0.11, 0.04], elb, hand });
    s.setL(cable, hand, [-0.38, 1.2]); s.setL(grip, add(hand, [0, -0.05]), add(hand, [0, 0.05]));
    ob(hip, sh, 0.3 + 0.7 * k, 0.12, 0.6);
  };
} };

A.cable_kickback = { view: 'Profil', muscles: 'Grand fessier', build(s) {
  s.rect(0.66, 0, 0.08, 1.9, C.frame, 0.02); pulley(s, 0.62, 0.12);
  const cable = s.ln(2.5, C.cable);
  const fig = sideFigure(s, { farLeg: true }); const gl = dot(s, 0.085); const ham = band(s, 32, 1);
  const strap = s.circ(0.035, C.pad);
  const hip = [0, 0.93], lean = -0.32;
  return k => {
    const { sh, head } = torsoPts(hip, lean);
    const a = 6 - 42 * k, knee = polar(hip, a, L.thigh), ank = polar(knee, a - 12, L.shin), toe = polar(ank, a + 80, L.foot);
    const [elb, hand] = ik(sh, [0.62, 1.2], L.up, L.fore, [0, -1]);
    fig.update({ hip, sh, head, knee, ank, toe, kneeF: [0.03, 0.5], ankF: [0.01, 0.08], toeF: [0.2, 0.04], elb, hand });
    s.setL(cable, ank, [0.62, 0.12]); s.at(strap, ank);
    gl(add(hip, [-0.06, 0]), k); ham(hip, knee, k * 0.4);
  };
} };

A.calf_smith = { view: 'Profil', muscles: 'Mollets', build(s) {
  s.rect(-0.12, 0, 0.07, 2.05, C.frame, 0.02, { opacity: 0.45 });
  s.rect(0.02, 0, 0.3, 0.08, C.frame2, 0.015); // step
  const plate = s.circ(0.2, C.plate);
  const fig = sideFigure(s); const cf = band(s, 24, 1);
  const bar = s.circ(0.035, C.steel);
  const toe = [0.17, 0.085];
  return k => {
    const phi = 108 - 60 * k, ank = polar(toe, phi + 180, L.foot);
    const knee = add(ank, [0.01, L.shin]), hip = add(knee, [-0.01, L.thigh]);
    const { sh, head } = torsoPts(hip, 0.02);
    const bp = add(sh, [-0.07, 0.03]); s.at(plate, bp); s.at(bar, bp);
    const [elb, hand] = ik(sh, add(sh, [0.05, 0.03]), L.up, L.fore, [0.3, -1]);
    fig.update({ hip, sh, head, knee, ank, toe, elb, hand });
    cf(knee, ank, k, 0.1, 0.75);
  };
} };

A.nordic = { view: 'Profil', muscles: 'Ischio-jambiers', build(s) {
  s.rect(-0.75, 0, 1.95, 0.025, C.pad, 0.01); s.rect(-0.41, 0.025, 0.06, 0.13, C.frame);
  const knee = [0, 0.07], ank = [-0.42, 0.07], toe = [-0.58, 0.02];
  const fig = sideFigure(s); const ham = band(s, 32, 1);
  s.at(s.circ(0.05, C.pad), [-0.38, 0.16]); // cale-chevilles
  return k => {
    const a = 178 - 62 * k, hip = polar(knee, a, L.thigh), sh = polar(hip, a, L.torso), head = polar(hip, a, L.torso + L.head);
    const [elb, hand] = ik(sh, polar(polar(hip, a, 0.3), a - 90, 0.12), L.up, L.fore, polar([0, 0], a - 90, 1));
    fig.update({ hip, sh, head, knee, ank, toe, elb, hand });
    ham(hip, knee, k);
  };
} };

A.sissy = { view: 'Profil', muscles: 'Quadriceps', build(s) {
  s.rect(0.22, 0, 0.07, 1.4, C.frame, 0.02, { opacity: 0.6 });
  const fig = sideFigure(s); const q = band(s, 32, -1);
  const ank = [0, 0.1], toe = [0.17, 0.02];
  return k => {
    const sa = 175 - 55 * k, ta = 182 + 48 * k;
    const knee = polar(ank, sa, L.shin), hip = polar(knee, ta, L.thigh);
    const sh = polar(hip, ta, L.torso), head = polar(hip, ta, L.torso + L.head);
    const [elb, hand] = ik(sh, [0.22, 1.05 - 0.25 * k], L.up, L.fore, [0, -1]);
    fig.update({ hip, sh, head, knee, ank, toe, elb, hand });
    q(hip, knee, k);
  };
} };

A.sumo_squat = { view: 'Face', muscles: 'Adducteurs, quadriceps, fessiers', build(s) {
  const legs = [-1, 1].map(() => ({ t: s.ln(30, C.skin), sh: s.ln(22, C.skin), f: s.ln(15, C.skin) }));
  const adds = [band(s, 30, -1), band(s, 30, 1)];
  const fig = frontFigure(s, { legs: false });
  const arms = [frontArm(s), frontArm(s)];
  const db = s.ln(9, C.steel), w1 = s.ln(16, C.pad), w2 = s.ln(16, C.pad);
  return k => {
    const hipY = 0.86 - 0.34 * k, shY = hipY + 0.47, hy = shY - 0.54;
    legs.forEach((l, i) => { const x = i ? 1 : -1; const H = [x * 0.1, hipY], An = [x * 0.42, 0.08];
      const [K] = ik(H, An, L.thigh, L.shin, [x, 0.3]);
      s.setL(l.t, H, K); s.setL(l.sh, K, An); s.setL(l.f, An, add(An, [x * 0.12, -0.04]));
      adds[i](H, K, k, 0.1, 0.75); });
    fig.update(shY, hipY);
    arms.forEach((arm, i) => { const x = i ? 1 : -1; const S = [x * 0.19, shY]; const [E, H] = ik(S, [x * 0.05, hy], L.up, L.fore, [x, -0.2]); arm(S, E, H); });
    s.setL(db, [0, hy + 0.03], [0, hy - 0.2]); s.setL(w1, [-0.08, hy + 0.01], [0.08, hy + 0.01]); s.setL(w2, [-0.08, hy - 0.18], [0.08, hy - 0.18]);
  };
} };

A.hanging_leg_raise = { view: 'Profil', muscles: 'Abdominaux, fléchisseurs de hanche', build(s) {
  s.rect(-0.38, 0, 0.08, 2.22, C.frame, 0.02); s.rect(-0.38, 2.14, 0.52, 0.06, C.frame, 0.03);
  const fig = sideFigure(s); const ab = band(s, 46, 1); const hf = band(s, 32, -1);
  s.at(s.circ(0.03, C.steel), [0.04, 2.12]);
  const sh = [0.02, 1.54], elb = [0.03, 1.83], hand = [0.04, 2.1];
  return k => {
    const lean = 0.22 * k, d = [-Math.sin(lean), Math.cos(lean)], hip = add(sh, mul(d, -L.torso)), head = add(sh, mul(d, L.head));
    const a = 4 + 100 * k, b = a - 90 * k, knee = polar(hip, a, L.thigh), ank = polar(knee, b, L.shin), toe = polar(ank, b + 55, L.foot);
    fig.update({ hip, sh, head, knee, ank, toe, elb, hand });
    ab(hip, sh, k, 0.1, 0.8); hf(hip, knee, k * 0.6, 0.05, 0.5);
  };
} };

A.cable_abduction = { view: 'Face', muscles: 'Moyen fessier (abducteurs)', build(s) {
  s.rect(-0.84, 0, 0.08, 1.9, C.frame, 0.02); pulley(s, -0.74, 0.1);
  for (const [a, b, w] of [[[-0.09, 0.93], [-0.1, 0.5], 30], [[-0.1, 0.5], [-0.11, 0.06], 22]]) s.setL(s.ln(w, C.skin), a, b);
  const leg = [s.ln(30, C.skin), s.ln(22, C.skin)];
  const fig = frontFigure(s, { legs: false }); const gm = dot(s, 0.06);
  const cable = s.ln(2.5, C.cable), strap = s.circ(0.03, C.pad);
  const arms = [s.ln(15, C.skin), s.ln(13, C.skin), s.ln(15, C.skin), s.ln(13, C.skin)];
  return k => {
    fig.update(1.4, 0.93);
    const H = [0.09, 0.93], a = 3 + 36 * k, K = polar(H, a, L.thigh), An = polar(K, a, L.shin);
    s.setL(leg[0], H, K); s.setL(leg[1], K, An); s.setL(cable, An, [-0.74, 0.1]); s.at(strap, An);
    const SL = [-0.19, 1.4], [eL, hL] = ik(SL, [-0.7, 1.15], L.up, L.fore, [0, -1]);
    const SR = [0.19, 1.4], [eR, hR] = ik(SR, [0.19, 1.1], L.up, L.fore, [1, 0]);
    s.setL(arms[0], SL, eL); s.setL(arms[1], eL, hL); s.setL(arms[2], SR, eR); s.setL(arms[3], eR, hR);
    gm([0.16, 0.98], k);
  };
} };

A.neck_ext = { view: 'Profil', muscles: 'Extenseurs du cou', build(s) {
  s.rect(0.92, 0, 0.08, 1.2, C.frame, 0.02); pulley(s, 0.88, 0.12);
  const neck = s.ln(16, C.skin); const cable = s.ln(2.5, C.cable);
  const fig = sideFigure(s, { farLeg: true }); const nk = band(s, 16, -1, true);
  const hip = [0, 0.9], knee = [0.07, 0.47], ank = [0, 0.07];
  const { sh } = torsoPts(hip, -0.95);
  return k => {
    const head = polar(sh, 50 + 95 * k, 0.2);
    s.setL(neck, sh, head);
    const [elb, hand] = ik(sh, [0.14, 0.68], L.up, L.fore, [0.3, -1]);
    fig.update({ hip, sh, head, knee, ank, toe: add(ank, [0.19, -0.03]), kneeF: [0.03, 0.47], ankF: [-0.06, 0.07], toeF: [0.13, 0.04], elb, hand });
    s.setL(cable, head, [0.88, 0.12]);
    nk(sh, head, k, 0.25, 0.8);
  };
} };

A.trap_dl_db = { view: 'Profil', muscles: 'Fessiers, quadriceps, lombaires', build(s) {
  const fig = sideFigure(s); const gl = dot(s, 0.08); const q = band(s, 32, -1); const lb = band(s, 46, -1);
  const db = dumbbell(s, 0.1);
  const ank = [0.05, 0.08], toe = [0.24, 0.04];
  return k => {
    const hip = lerp([-0.24, 0.5], [0, 0.93], k), lean = -0.85 + 0.83 * k;
    const [knee] = ik(hip, ank, L.thigh, L.shin, [1, 0]);
    const { sh, head } = torsoPts(hip, lean);
    const elb = add(sh, [0, -L.up]), hand = add(elb, [0, -L.fore]);
    fig.update({ hip, sh, head, knee, ank, toe, elb, hand });
    db(hand, 90);
    gl(add(hip, [-0.06, 0]), k); q(hip, knee, k * 0.6); lb(hip, sh, k * 0.7, 0.08, 0.6);
  };
} };

A.ab_wheel = { view: 'Profil', muscles: 'Abdominaux (grand droit)', build(s) {
  s.rect(-0.7, 0, 2.1, 0.025, C.pad, 0.01);
  const wheel = s.circ(0.1, C.pad, { stroke: C.steel, 'stroke-width': s.W(5) });
  const knee = [0, 0.07], ank = [-0.42, 0.07], toe = [-0.58, 0.02];
  const fig = sideFigure(s); const ab = band(s, 46, 1); const axle = s.circ(0.025, C.steel);
  return k => {
    const hip = polar(knee, 176 - 56 * k, L.thigh), W = [0.46 + 0.8 * k, 0.1];
    const [sh] = ik(hip, W, L.torso, L.up + L.fore, [0, 1]);
    const head = add(hip, mul([sh[0] - hip[0], sh[1] - hip[1]], (L.torso + L.head) / L.torso));
    s.at(wheel, W); s.at(axle, W);
    fig.update({ hip, sh, head, knee, ank, toe, elb: lerp(sh, W, 0.53), hand: W });
    ab(hip, sh, k, 0.1, 0.9);
  };
} };

// ------------------------------------------------------------------ lot 4 : le 3e exercice le plus efficace de chaque muscle
const seatBench = (s, back = true) => { // banc assis, dossier vertical
  s.rect(-0.16, 0, 0.06, 0.45, C.frame); s.rect(0.2, 0, 0.06, 0.45, C.frame); s.rect(-0.2, 0.45, 0.5, 0.07, C.pad, 0.03);
  if (back) s.setL(s.ln(24, C.pad), [-0.12, 0.52], torsoPts([-0.11, 0.58], 0.06).sh);
};
const SEAT = { knee: [0.44, 0.56], ank: [0.47, 0.1], toe: [0.65, 0.06] };
const endOn = s => { const a = s.circ(0.075, C.pad), b = s.circ(0.025, C.steel); return p => { s.at(a, p); s.at(b, p); }; }; // haltère vu de bout

// écarté couché vu depuis les pieds : coupe du banc, buste, bras qui se referment au-dessus de la poitrine
A.fly_db = { view: 'Face', muscles: 'Pectoraux', build(s) {
  s.rect(-0.035, 0, 0.07, 0.38, C.frame); s.rect(-0.17, 0.38, 0.34, 0.07, C.pad, 0.03);
  const head = s.circ(0.09, C.skin); s.at(head, [0, 0.62]);
  const torso = s.el('ellipse', { fill: C.skin }); { const c = s.P([0, 0.54]); torso.setAttribute('cx', c[0]); torso.setAttribute('cy', c[1]); torso.setAttribute('rx', 0.21 * s.scale); torso.setAttribute('ry', 0.095 * s.scale); }
  const pecs = [hotPath(s), hotPath(s)]; const tp = (x, y) => s.P([x, y]).join(' ');
  const arms = [frontArm(s), frontArm(s)], dbs = [endOn(s), endOn(s)];
  return k => {
    pecs.forEach((p, i) => { const x = i ? 1 : -1;
      lit(p, `M ${tp(x * 0.02, 0.63)} Q ${tp(x * 0.12, 0.65)} ${tp(x * 0.19, 0.59)} L ${tp(x * 0.15, 0.55)} Q ${tp(x * 0.08, 0.58)} ${tp(x * 0.02, 0.57)} Z`, k); });
    arms.forEach((arm, i) => { const x = i ? 1 : -1;
      const S = [x * 0.18, 0.6], a = 80 + 98 * k, E = polar(S, x * a, L.up), H = polar(E, x * (a + 24), L.fore);
      arm(S, E, H); dbs[i](H); });
  };
} };

A.arnold = { view: 'Face', muscles: 'Deltoïdes antérieurs et latéraux', build(s) {
  s.rect(-0.035, 0, 0.07, 0.47, C.frame); s.rect(-0.22, 0.47, 0.44, 0.07, C.pad, 0.03); s.rect(-0.16, 0.62, 0.32, 0.78, C.pad, 0.04);
  const fig = frontFigure(s, { seated: true }); const dels = [dot(s, 0.065), dot(s, 0.065)];
  const arms = [frontArm(s), frontArm(s)], dbs = [dumbbell(s), dumbbell(s)];
  return k => {
    const shY = 1.04; fig.update(shY, 0.6);
    arms.forEach((arm, i) => { const x = i ? 1 : -1, S = [x * 0.19, shY - 0.02];
      // départ : coudes devant le buste, mains devant le visage ; arrivée : coudes écartés, bras au-dessus de la tête
      const E = lerp([x * 0.11, shY - 0.2], [x * 0.3, shY + 0.26], k), H = lerp([x * 0.1, shY + 0.1], [x * 0.2, shY + 0.52], k);
      arm(S, E, H); dbs[i](H, 90); dels[i](S, k); });
  };
} };

A.overhead_db = { view: 'Profil', muscles: 'Triceps (chef long)', build(s) {
  seatBench(s);
  const fig = sideFigure(s); const tri = band(s, 16, -1, true); const db = dumbbell(s, 0.09);
  const hip = [0.02, 0.58];
  return k => {
    const { sh, head } = torsoPts(hip, 0.06);
    const elb = polar(sh, 165, L.up), phi = -45 + 220 * k, hand = polar(elb, phi, L.fore);
    fig.update({ hip, sh, head, ...SEAT, elb, hand });
    db(polar(hand, phi, 0.05), phi); tri(sh, elb, k);
  };
} };

A.ohp_smith = { view: 'Profil', muscles: 'Deltoïdes antérieurs, triceps', build(s) {
  const bx = 0.16;
  s.rect(bx - 0.035, 0, 0.07, 1.9, C.frame, 0.02, { opacity: 0.45 });
  const plate = s.circ(0.15, C.plate);
  seatBench(s);
  const fig = sideFigure(s); const del = dot(s, 0.07); const tri = band(s, 16, 1, true);
  const bar = s.circ(0.035, C.steel); const hip = [0.02, 0.58];
  return k => {
    const { sh, head } = torsoPts(hip, 0.06);
    const hand = [bx, sh[1] + 0.03 + 0.48 * k];
    const [elb] = ik(sh, hand, L.up, L.fore, [1, -0.6]);
    s.at(plate, hand); s.at(bar, hand);
    fig.update({ hip, sh, head, ...SEAT, elb, hand });
    del(sh, k); tri(sh, elb, k * 0.6);
  };
} };

A.reverse_crunch = { view: 'Profil', muscles: 'Abdominaux (bas du grand droit)', build(s) {
  s.rect(-0.85, 0, 1.4, 0.025, C.pad, 0.01);
  const fig = sideFigure(s); const ab1 = band(s, 46, 1), ab2 = band(s, 46, 1);
  const sh = [-0.46, 0.11], mid = [-0.22, 0.11], head = [-0.68, 0.11];
  return k => {
    const hip = polar(mid, 90 + 42 * k, 0.24);
    const ta = 172 + 58 * k, knee = polar(hip, ta, L.thigh), sa = ta - 95, ank = polar(knee, sa, L.shin), toe = polar(ank, sa + 90, L.foot);
    fig.update({ hip, mid, sh, head, knee, ank, toe, elb: [-0.17, 0.06], hand: [0.09, 0.05] });
    ab1(hip, mid, k, 0, 1); ab2(mid, sh, k * 0.5, 0, 0.9);
  };
} };

A.upright_row = { view: 'Face', muscles: 'Deltoïdes latéraux, trapèzes', build(s) {
  const fig = frontFigure(s); const traps = [hotPath(s), hotPath(s)]; const dels = [dot(s, 0.065), dot(s, 0.065)];
  const arms = [frontArm(s), frontArm(s)]; const bar = s.ln(6, C.steel), w = [s.ln(16, C.pad), s.ln(16, C.pad)];
  const tp = fig.tp;
  return k => {
    const shY = 1.4; fig.update(shY, 0.93);
    traps.forEach((p, i) => { const x = i ? 1 : -1;
      lit(p, `M ${tp(x * 0.035, 1.5)} Q ${tp(x * 0.08, shY + 0.05)} ${tp(x * 0.19, shY + 0.02)} L ${tp(x * 0.13, shY - 0.04)} Q ${tp(x * 0.06, shY - 0.02)} ${tp(x * 0.02, shY - 0.05)} Z`, k * 0.6); });
    const hy = 0.86 + 0.46 * k;
    arms.forEach((arm, i) => { const x = i ? 1 : -1, S = [x * 0.19, shY], H = [x * 0.2, hy];
      const [E] = ik(S, H, L.up, L.fore, [x, 0.6]); arm(S, E, H); dels[i](S, k); });
    s.setL(bar, [-0.36, hy], [0.36, hy]); w.forEach((n, i) => { const x = i ? 1 : -1; s.setL(n, [x * 0.3, hy], [x * 0.36, hy]); });
  };
} };

// oiseau buste penché, vu de dos : le buste paraît raccourci, la tête plonge entre les épaules
A.rear_fly_db = { view: 'Dos', muscles: 'Deltoïdes postérieurs, milieu du dos', build(s) {
  const fig = frontFigure(s); const rh = hotPath(s); const dels = [dot(s, 0.065), dot(s, 0.065)];
  const arms = [-1, 1].map(() => [s.ln(15, C.skin), s.ln(13, C.skin)]); const dbs = [endOn(s), endOn(s)];
  const tp = fig.tp;
  return k => {
    const shY = 1.2; fig.update(shY, 0.93, { headY: 1.24 });
    arms.forEach(([u, f], i) => { const x = i ? 1 : -1, S = [x * 0.19, shY], a = 6 + 80 * k;
      const E = polar(S, x * a, L.up), H = polar(E, x * (a - 14), L.fore);
      s.setL(u, S, E); s.setL(f, E, H); dbs[i](H); dels[i](S, k); });
    lit(rh, `M ${tp(-0.03, shY - 0.04)} L ${tp(-0.12, shY - 0.07)} L ${tp(-0.04, shY - 0.2)} L ${tp(0.04, shY - 0.2)} L ${tp(0.12, shY - 0.07)} L ${tp(0.03, shY - 0.04)} Z`, k * 0.5);
  };
} };

A.bayesian_curl = { view: 'Profil', muscles: 'Biceps (chef long)', build(s) {
  s.rect(-0.72, 0, 0.08, 1.9, C.frame, 0.02); pulley(s, -0.62, 0.14);
  const cable = s.ln(2.5, C.cable), grip = s.ln(10, C.pad);
  const fig = sideFigure(s, { farLeg: true }); const bi = band(s, 16, -1, true);
  const hip = [0, 0.92];
  return k => {
    const { sh, head } = torsoPts(hip, -0.1);
    const elb = polar(sh, -24, L.up), phi = -28 + 130 * k, hand = polar(elb, phi, L.fore);
    fig.update({ hip, sh, head, knee: [0.12, 0.5], ank: [0.17, 0.08], toe: [0.36, 0.04], kneeF: [-0.1, 0.5], ankF: [-0.22, 0.09], toeF: [-0.04, 0.03], elb, hand });
    s.setL(cable, hand, [-0.62, 0.14]); s.setL(grip, add(hand, [0, -0.05]), add(hand, [0, 0.05]));
    bi(sh, elb, k);
  };
} };

A.row_db = { view: 'Profil', muscles: 'Grand dorsal, milieu du dos, biceps', build(s) {
  s.rect(-0.55, 0, 0.06, 0.47, C.frame); s.rect(0.32, 0, 0.06, 0.47, C.frame); s.rect(-0.62, 0.47, 1.06, 0.07, C.pad, 0.03);
  const fig = sideFigure(s, { farLeg: true }); const back = band(s, 46, -1); const bi = band(s, 16, -1, true); const db = dumbbell(s);
  const hip = [-0.2, 0.92], ank = [-0.3, 0.08];
  return k => {
    const { sh, head } = torsoPts(hip, -1.45);
    const [knee] = ik(hip, ank, L.thigh, L.shin, [1, 0]);
    const [elbF, handF] = ik(sh, [0.3, 0.56], L.up, L.fore, [1, 0]);
    const hand = lerp([sh[0] + 0.02, sh[1] - 0.55], [sh[0] - 0.16, sh[1] - 0.2], k);
    const [elb] = ik(sh, hand, L.up, L.fore, [-0.5, 1]);
    fig.update({ hip, sh, head, knee, ank, toe: add(ank, [0.19, -0.04]), kneeF: [-0.06, 0.6], ankF: [-0.48, 0.6], toeF: [-0.6, 0.56], elbF, handF, elb, hand });
    db(hand, 90); back(hip, sh, k, 0.35, 0.95); bi(sh, elb, k * 0.5);
  };
} };

A.hammer_curl = { view: 'Profil', muscles: 'Brachial, brachio-radial (avant-bras), biceps', build(s) {
  const fig = sideFigure(s, { farLeg: true }); const bi = band(s, 16, -1, true); const fa = band(s, 14, -1, true); const db = dumbbell(s, 0.1);
  const hip = [0, 0.93];
  return k => {
    const { sh, head } = torsoPts(hip, 0.02);
    const elb = add(sh, [0.02, -L.up]), phi = 8 + 128 * k, hand = polar(elb, phi, L.fore);
    fig.update({ hip, sh, head, ...STAND, ankF: [-0.04, 0.08], toeF: [0.15, 0.04], elb, hand });
    db(hand, phi + 90); bi(sh, elb, k); fa(elb, hand, k * 0.9);
  };
} };

A.lat_pd_close = { view: 'Profil', muscles: 'Grand dorsal, biceps', build(s) {
  const st = stack(s, -0.62, 0.1, 10, 0.16);
  s.rect(-0.44, 0, 0.08, 2.2, C.frame, 0.02); s.rect(-0.44, 2.15, 0.6, 0.06, C.frame, 0.03); pulley(s, 0.12, 2.12);
  s.rect(-0.02, 0.05, 0.07, 0.42, C.frame); s.rect(-0.12, 0.47, 0.44, 0.07, C.pad, 0.03);
  const cable = s.ln(2.5, C.cable), vh = s.ln(9, C.pad);
  const fig = sideFigure(s); const lat = band(s, 46, -1); const bi = band(s, 16, -1, true);
  s.rect(0.3, 0.63, 0.22, 0.07, C.pad, 0.035); s.rect(0.38, 0.7, 0.05, 0.25, C.frame2);
  const hip = [0.02, 0.58];
  return k => {
    const { sh, head } = torsoPts(hip, 0.12 + 0.12 * k);
    const hand = lerp([sh[0] + 0.12, sh[1] + 0.54], [sh[0] + 0.16, sh[1] - 0.06], k);
    const [elb] = ik(sh, hand, L.up, L.fore, [-1, -0.2]);
    fig.update({ hip, sh, head, knee: [0.44, 0.56], ank: [0.47, 0.1], toe: [0.65, 0.06], elb, hand });
    s.setL(cable, hand, [0.12, 2.12]); s.setL(vh, add(hand, [-0.05, -0.04]), add(hand, [0.05, 0.04]));
    lat(hip, sh, k, 0.3, 0.85); bi(sh, elb, k * 0.5); st(k * 0.25);
  };
} };

A.glute_bridge = { view: 'Profil', muscles: 'Fessiers', build(s) {
  s.rect(-0.75, 0, 1.4, 0.025, C.pad, 0.01);
  const fig = sideFigure(s); const gl = dot(s, 0.085); const ham = band(s, 32, 1);
  const sh = [-0.32, 0.11], ank = [0.38, 0.08];
  return k => {
    const th = (2 + 30 * k) * Math.PI / 180, hip = [sh[0] + 0.46 * Math.cos(th), sh[1] + 0.46 * Math.sin(th)];
    const head = add(sh, mul([sh[0] - hip[0], sh[1] - hip[1]], L.head / 0.46));
    const [knee] = ik(hip, ank, L.thigh, L.shin, [0, 1]);
    fig.update({ hip, sh, head, knee, ank, toe: add(ank, [0.18, -0.04]), elb: [-0.03, 0.05], hand: [0.23, 0.05] });
    gl(add(hip, [-0.03, -0.05]), k); ham(hip, knee, k * 0.4);
  };
} };

A.calf_db = { view: 'Profil', muscles: 'Mollets', build(s) {
  s.rect(0.02, 0, 0.3, 0.08, C.frame2, 0.015);
  const fig = sideFigure(s, { farLeg: true }); const cf = band(s, 24, 1); const db = dumbbell(s);
  const toe = [0.17, 0.085];
  return k => {
    const phi = 108 - 60 * k, ank = polar(toe, phi + 180, L.foot);
    const knee = add(ank, [0.01, L.shin]), hip = add(knee, [-0.01, L.thigh]);
    const { sh, head } = torsoPts(hip, 0.02);
    const elb = add(sh, [0.02, -L.up]), hand = add(elb, [0, -L.fore]);
    const kneeF = add(hip, [0.02, -L.thigh]), ankF = add(kneeF, [-0.3, 0.3]);
    fig.update({ hip, sh, head, knee, ank, toe, kneeF, ankF, toeF: add(ankF, [0.04, -0.18]), elb, hand });
    db(hand, 90); cf(knee, ank, k, 0.1, 0.75);
  };
} };

// soulevé de terre roumain : charnière de hanche, jambes presque tendues ; k = 1 debout (fin de la remontée)
function rdl(smith) { return { view: 'Profil', muscles: 'Ischio-jambiers, fessiers', build(s) {
  const bx = 0.07;
  let plate = null; if (smith) { s.rect(bx - 0.035, 0, 0.07, 1.85, C.frame, 0.02, { opacity: 0.45 }); plate = s.circ(0.17, C.plate); }
  const fig = sideFigure(s); const ham = band(s, 32, 1); const gl = dot(s, 0.08); const lb = band(s, 46, -1);
  const db = smith ? null : dumbbell(s, 0.1); const bar = smith ? s.circ(0.035, C.steel) : null;
  const ank = [0.05, 0.08], toe = [0.24, 0.04];
  return k => {
    const hip = lerp([-0.32, 0.86], [0, 0.93], k), { sh, head } = torsoPts(hip, -1.2 + 1.18 * k);
    const [knee] = ik(hip, ank, L.thigh, L.shin, [1, 0]);
    let elb, hand;
    if (smith) { hand = [bx, sh[1] - 0.55]; [elb] = ik(sh, hand, L.up, L.fore, [-1, 0]); s.at(plate, hand); s.at(bar, hand); }
    else { elb = add(sh, [0, -L.up]); hand = add(elb, [0, -L.fore]); db(hand, 90); }
    fig.update({ hip, sh, head, knee, ank, toe, elb, hand });
    ham(hip, knee, k); gl(add(hip, [-0.06, 0]), k * 0.8); lb(hip, sh, k * 0.5, 0.08, 0.6);
  };
} }; }
A.rdl_db = rdl(false);
A.rdl_smith = rdl(true);

A.smith_squat = { view: 'Profil', muscles: 'Quadriceps, fessiers', build(s) {
  s.rect(-0.065, 0, 0.07, 2.05, C.frame, 0.02, { opacity: 0.45 }); const plate = s.circ(0.2, C.plate);
  const fig = sideFigure(s); const q = band(s, 32, -1); const gl = dot(s, 0.08); const bar = s.circ(0.035, C.steel);
  const ank = [0.12, 0.08];
  return k => {
    const hip = lerp([-0.02, 0.93], [-0.25, 0.5], k), lean = Math.asin(hip[0] / L.torso);
    const { sh, head } = torsoPts(hip, lean);
    const [knee] = ik(hip, ank, L.thigh, L.shin, [1, 0]);
    const bp = add(sh, [-0.03, 0.03]); s.at(plate, bp); s.at(bar, bp);
    const elb = polar(sh, -12 + lean * 57, L.up), hand = add(bp, [0.02, 0]); // coude sous la barre, main sur la barre
    fig.update({ hip, sh, head, knee, ank, toe: add(ank, [0.19, -0.04]), elb, hand });
    q(hip, knee, k); gl(add(hip, [-0.06, 0]), k * 0.6);
  };
} };

A.goblet = { view: 'Profil', muscles: 'Quadriceps, fessiers', build(s) {
  const fig = sideFigure(s); const q = band(s, 32, -1); const gl = dot(s, 0.08);
  const kb = s.circ(0.075, C.pad), hd = s.circ(0.04, 'none', { stroke: C.steel, 'stroke-width': s.W(5) });
  const ank = [0.05, 0.08];
  return k => {
    const hip = lerp([-0.02, 0.93], [-0.2, 0.42], k), lean = -0.38 * k;
    const { sh, head } = torsoPts(hip, lean);
    const [knee] = ik(hip, ank, L.thigh, L.shin, [1, 0]);
    const d = [-Math.sin(lean), Math.cos(lean)], n = [Math.cos(lean), Math.sin(lean)];
    const c = add(add(sh, mul(d, -0.16)), mul(n, 0.17)), hand = add(c, mul(d, 0.08));
    const [elb] = ik(sh, hand, L.up, L.fore, [0.3, -1]);
    fig.update({ hip, sh, head, knee, ank, toe: add(ank, [0.19, -0.04]), elb, hand });
    s.at(hd, hand); s.at(kb, c); q(hip, knee, k); gl(add(hip, [-0.06, 0]), k * 0.6);
  };
} };

A.step_up = { view: 'Profil', muscles: 'Quadriceps, fessiers', build(s) {
  s.rect(0.14, 0, 0.06, 0.38, C.frame); s.rect(0.52, 0, 0.06, 0.38, C.frame); s.rect(0.08, 0.38, 0.56, 0.07, C.pad, 0.03);
  const fig = sideFigure(s, { farLeg: true }); const q = band(s, 32, -1); const gl = dot(s, 0.08); const db = dumbbell(s);
  const ank = [0.3, 0.49], toe = [0.48, 0.45];
  return k => {
    const hip = lerp([0, 0.9], [0.27, 1.34], k), { sh, head } = torsoPts(hip, -0.25 + 0.2 * k);
    const [knee] = ik(hip, ank, L.thigh, L.shin, [1, 0]);
    const ankF = lerp([-0.1, 0.08], [0.16, 0.62], k), [kneeF] = ik(hip, ankF, L.thigh, L.shin, [1, 0]);
    const elb = add(sh, [0.02, -L.up]), hand = add(elb, [0, -L.fore]);
    fig.update({ hip, sh, head, knee, ank, toe, kneeF, ankF, toeF: add(ankF, [0.18, -0.04]), elb, hand });
    db(hand, 90); q(hip, knee, k); gl(add(hip, [-0.06, 0]), k * 0.8);
  };
} };

// ------------------------------------------------------------------ lot 5 : développés, pompes, dips, épaules
// développé allongé de profil (tête à droite) ; th = inclinaison du buste (rad, + = tête plus haute)
function press({ th = 0, tool = 'db', floor = false, close = false, hip = [-0.25, 0.55] }) {
  const tri = close ? 'Triceps, pectoraux' : 'Pectoraux, triceps';
  return { view: 'Profil', muscles: th > 0.2 ? 'Haut des pectoraux, deltoïdes antérieurs, triceps' : th < -0.1 ? 'Bas des pectoraux, triceps' : tri, build(s) {
    const d = [Math.cos(th), Math.sin(th)], nu = [-Math.sin(th), Math.cos(th)];
    const H = hip, sh = add(H, mul(d, L.torso)), head = add(H, mul(d, L.torso + L.head));
    const chest = add(add(sh, mul(d, -0.08)), mul(nu, 0.13)), top = [tool === 'smith' || tool === 'm' ? chest[0] : sh[0] - 0.01, sh[1] + 0.55];
    if (floor) s.rect(-0.85, 0, 1.45, 0.025, C.pad, 0.01);
    else {
      const a = add(add(H, mul(d, -0.12)), mul(nu, -0.13)), b = add(add(H, mul(d, L.torso + 0.12)), mul(nu, -0.13));
      for (const p of [lerp(a, b, 0.12), lerp(a, b, 0.88)]) s.setL(s.ln(14, C.frame), p, [p[0], 0]);
      s.setL(s.ln(24, C.pad), a, b);
    }
    let st = null, lever = null, piv = null;
    if (tool === 'smith') s.rect(chest[0] - 0.035, 0, 0.07, 1.6, C.frame, 0.02, { opacity: 0.45 });
    if (tool === 'm') { st = stack(s, -0.62, 0.1, 10, 0.16); piv = [sh[0] - 0.5, sh[1] + 0.2]; lever = s.ln(8, C.frame2); }
    const plate = tool === 'smith' || tool === 'bb' ? s.circ(tool === 'bb' ? 0.2 : 0.16, C.plate) : null;
    let knee, ank, toe, roller = null;
    if (th < -0.1) { knee = add(H, [-0.42, 0.13]); ank = add(knee, [-0.02, -0.43]); toe = add(ank, [-0.17, -0.05]); roller = add(ank, [0.07, 0.02]); s.setL(s.ln(8, C.frame), roller, [roller[0], 0]); }
    else if (floor) { ank = [H[0] - 0.36, 0.08]; [knee] = ik(H, ank, L.thigh, L.shin, [0, 1]); toe = add(ank, [-0.17, -0.04]); }
    else { ank = [H[0] - 0.4, 0.08]; [knee] = ik(H, ank, L.thigh, L.shin, [-0.3, 1]); toe = add(ank, [-0.17, -0.04]); }
    const fig = sideFigure(s); const pec = band(s, 46, -1); const tb = band(s, 16, -1, true);
    if (roller) s.at(s.circ(0.05, C.pad), roller);
    const db = tool === 'db' ? endOn(s) : null, bar = plate ? s.circ(0.035, C.steel) : null, grip = tool === 'm' ? s.ln(10, C.pad) : null;
    return k => {
      let hand = lerp(chest, top, k); if (floor) hand = lerp([chest[0], chest[1] + 0.06], top, k);
      const [elb] = ik(sh, hand, L.up, L.fore, [-0.4, -1]);
      if (floor && elb[1] < 0.07) elb[1] = 0.07;
      fig.update({ hip: H, sh, head, knee, ank, toe, elb, hand });
      if (db) db(hand); if (plate) { s.at(plate, hand); s.at(bar, hand); }
      if (lever) { s.setL(lever, piv, hand); s.setL(grip, add(hand, [-0.05, 0]), add(hand, [0.05, 0])); st(k * 0.2); }
      pec(H, sh, close ? k * 0.7 : k, 0.5, 0.95); tb(sh, elb, close ? k : k * 0.6);
    };
  } };
}
A.bench_db = press({ tool: 'db' });
A.bench_smith = press({ tool: 'smith' });
A.bench_bb = press({ tool: 'bb' });
A.close_bench_smith = press({ tool: 'smith', close: true });
A.floor_press_db = press({ tool: 'db', floor: true, hip: [-0.25, 0.11] });
A.decline_db = press({ tool: 'db', th: -0.28, hip: [-0.25, 0.68] });
A.incline_db = press({ tool: 'db', th: 0.45, hip: [-0.22, 0.55] });
A.incline_smith = press({ tool: 'smith', th: 0.45, hip: [-0.22, 0.55] });
A.incline_bb = press({ tool: 'bb', th: 0.45, hip: [-0.22, 0.55] });
A.incline_m = press({ tool: 'm', th: 0.45, hip: [-0.22, 0.55] });

// pompes de profil : corps gainé pivotant autour des pieds ; hy / fy = hauteur des mains / des pieds
function pushup({ hy = 0, fy = 0, close = false }) { return { view: 'Profil', muscles: close ? 'Triceps, pectoraux' : 'Pectoraux, triceps', build(s) {
  s.rect(-0.9, 0, 1.75, 0.025, C.pad, 0.01);
  const bench = (x0, x1, y) => { s.rect(x0, y - 0.07, x1 - x0, 0.07, C.pad, 0.03); s.rect(x0 + 0.05, 0, 0.05, y - 0.07, C.frame); s.rect(x1 - 0.1, 0, 0.05, y - 0.07, C.frame); };
  const A0 = [-0.72, fy + 0.11], BL = 1.33;
  const shAt = k => { const y = hy + 0.03 + 0.17 + 0.38 * k; return [A0[0] + Math.sqrt(BL * BL - (y - A0[1]) ** 2), y]; };
  const hand = [shAt(1)[0], hy + 0.03];
  if (hy > 0) bench(hand[0] - 0.2, hand[0] + 0.25, hy); if (fy > 0) bench(A0[0] - 0.2, A0[0] + 0.25, fy);
  const fig = sideFigure(s); const pec = band(s, 46, 1); const tb = band(s, 16, 1, true);
  return k => {
    const sh = shAt(k), u = mul([sh[0] - A0[0], sh[1] - A0[1]], 1 / BL);
    const knee = add(A0, mul(u, L.shin)), hip = add(A0, mul(u, L.shin + L.thigh)), head = add(A0, mul(u, BL + L.head));
    const [elb] = ik(sh, hand, L.up, L.fore, close ? [-1, 0.6] : [-0.6, 1]);
    fig.update({ hip, sh, head, knee, ank: A0, toe: add(A0, [0.08, -0.1]), elb, hand });
    pec(hip, sh, close ? k * 0.7 : k, 0.5, 0.95); tb(sh, elb, close ? k : k * 0.6);
  };
} }; }
A.pushup = pushup({});
A.diamond_pushup = pushup({ close: true });
A.pushup_incline = pushup({ hy: 0.45 });
A.pushup_decline = pushup({ fy: 0.45 });

// dips aux barres parallèles (profil) ; assist = genoux sur la plate-forme de la machine
function dips({ lean = -0.35, assist = false }) { return { view: 'Profil', muscles: lean < -0.2 ? 'Bas des pectoraux, triceps' : 'Triceps, pectoraux', build(s) {
  const hand = [0.02, 1.25];
  s.rect(0.2, 0, 0.08, 1.3, C.frame, 0.02, { opacity: 0.6 }); s.setL(s.ln(9, C.steel), [-0.12, hand[1] - 0.02], [0.3, hand[1] - 0.02]);
  const st = assist ? stack(s, -0.6, 0.1, 10, 0.16) : null;
  const plat = assist ? s.ln(14, C.pad) : null, post = assist ? s.ln(8, C.frame2) : null;
  const fig = sideFigure(s); const pec = band(s, 46, 1); const tb = band(s, 16, 1, true);
  return k => {
    const sh = lerp([hand[0] - 0.08, hand[1] + 0.12], [hand[0] - 0.03, hand[1] + 0.54], k), { head } = torsoPts([0, 0], 0);
    const dT = [-Math.sin(lean), Math.cos(lean)], hip = add(sh, mul(dT, -L.torso)), hd = add(sh, mul(dT, L.head)); void head;
    const [elb] = ik(sh, hand, L.up, L.fore, [-1, 0.2]);
    let knee, ank, toe;
    if (assist) { knee = add(hip, [0.03, -L.thigh]); ank = add(knee, [-L.shin, 0.02]); toe = add(ank, [-0.17, -0.03]); s.setL(plat, add(knee, [-0.45, -0.08]), add(knee, [0.08, -0.08])); s.setL(post, add(knee, [-0.2, -0.08]), [-0.2 + knee[0], 0.05]); st(k * 0.2); }
    else { knee = polar(hip, 12, L.thigh); ank = polar(knee, -75, L.shin); toe = polar(ank, 15, L.foot); }
    fig.update({ hip, sh, head: hd, knee, ank, toe, elb, hand });
    pec(hip, sh, lean < -0.2 ? k : k * 0.6, 0.5, 0.95); tb(sh, elb, lean < -0.2 ? k * 0.7 : k);
  };
} }; }
A.dips_chest = dips({});
A.dips_assist = dips({ lean: -0.25, assist: true });

A.bench_dips = { view: 'Profil', muscles: 'Triceps', build(s) {
  s.rect(-0.5, 0.38, 0.45, 0.07, C.pad, 0.03); s.rect(-0.45, 0, 0.05, 0.38, C.frame); s.rect(-0.15, 0, 0.05, 0.38, C.frame);
  const hand = [-0.1, 0.47], heel = [0.66, 0.07];
  const fig = sideFigure(s); const tb = band(s, 16, 1, true);
  return k => {
    const sh = lerp([hand[0] + 0.08, hand[1] + 0.2], [hand[0] + 0.03, hand[1] + 0.55], k), hip = add(sh, [0, -L.torso]), head = add(sh, [0, L.head]);
    const [knee, ank] = ik(hip, heel, L.thigh, L.shin, [0, 1]);
    const [elb] = ik(sh, hand, L.up, L.fore, [-1, 0.2]);
    fig.update({ hip, sh, head, knee, ank, toe: add(ank, [0.04, 0.17]), elb, hand });
    tb(sh, elb, k);
  };
} };

A.triceps_m = { view: 'Profil', muscles: 'Triceps', build(s) {
  const st = stack(s, -0.6, 0.1, 10, 0.16);
  seatBench(s);
  const lever = s.ln(8, C.frame2), grip = s.ln(10, C.pad);
  const fig = sideFigure(s); const tb = band(s, 16, 1, true);
  const hip = [0.02, 0.58];
  return k => {
    const { sh, head } = torsoPts(hip, 0.06);
    const hand = lerp([sh[0] - 0.02, sh[1] - 0.22], [sh[0] + 0.03, sh[1] - 0.55], k);
    const [elb] = ik(sh, hand, L.up, L.fore, [-1, 0.3]);
    fig.update({ hip, sh, head, ...SEAT, elb, hand });
    s.setL(lever, [-0.38, 0.95], hand); s.setL(grip, add(hand, [-0.05, 0]), add(hand, [0.05, 0]));
    tb(sh, elb, k); st(k * 0.2);
  };
} };

A.cable_fly_low = { view: 'Face', muscles: 'Haut des pectoraux', build(s) {
  for (const x of [-0.84, 0.84]) s.rect(x - 0.04, 0, 0.08, 2.0, C.frame, 0.02, { opacity: 0.6 });
  for (const x of [-0.76, 0.76]) pulley(s, x, 0.14);
  const fig = frontFigure(s); const pecs = [hotPath(s), hotPath(s)];
  const cables = [s.ln(2.5, C.cable), s.ln(2.5, C.cable)];
  const arms = [-1, 1].map(() => ({ arm: frontArm(s), g: s.ln(9, C.pad) }));
  return k => {
    const shY = 1.4; fig.update(shY, 0.93);
    pecs.forEach((p, i) => lit(p, pecD(fig.tp, i ? 1 : -1, shY), k));
    arms.forEach((a, i) => { const x = i ? 1 : -1, S = [x * 0.19, shY - 0.02];
      const H = lerp([x * 0.6, 0.98], [x * 0.1, 1.34], k), E = add(lerp(S, H, 0.52), [x * 0.07, -0.04]); // bras presque tendus, raccourcis vers l'avant
      s.setL(cables[i], H, [x * 0.76, 0.14]); a.arm(S, E, H); s.setL(a.g, add(H, [0, -0.05]), add(H, [0, 0.05])); });
  };
} };

A.cable_press = { view: 'Profil', muscles: 'Pectoraux, triceps', build(s) {
  s.rect(-0.62, 0, 0.08, 1.9, C.frame, 0.02); pulley(s, -0.52, 1.28);
  const cable = s.ln(2.5, C.cable), grip = s.ln(10, C.pad);
  const fig = sideFigure(s, { farLeg: true }); const pec = band(s, 46, 1); const tb = band(s, 16, 1, true);
  const hip = [0, 0.92];
  return k => {
    const { sh, head } = torsoPts(hip, -0.12);
    const [elb, hand] = ik(sh, lerp([sh[0] + 0.1, sh[1] - 0.12], [sh[0] + 0.56, sh[1] - 0.1], k), L.up, L.fore, [-0.3, -1]);
    fig.update({ hip, sh, head, knee: [0.14, 0.5], ank: [0.2, 0.08], toe: [0.39, 0.04], kneeF: [-0.12, 0.5], ankF: [-0.24, 0.09], toeF: [-0.06, 0.03], elb, hand });
    s.setL(cable, hand, [-0.52, 1.28]); s.setL(grip, add(hand, [0, -0.05]), add(hand, [0, 0.05]));
    pec(hip, sh, k, 0.55, 0.95); tb(sh, elb, k * 0.6);
  };
} };

A.ohp_bb = { view: 'Profil', muscles: 'Deltoïdes antérieurs, triceps', build(s) {
  const plate = s.circ(0.2, C.plate);
  const fig = sideFigure(s, { farLeg: true }); const del = dot(s, 0.07); const tb = band(s, 16, 1, true); const bar = s.circ(0.035, C.steel);
  const hip = [0, 0.93];
  return k => {
    const { sh, head } = torsoPts(hip, 0.05 * k);
    const hand = lerp([sh[0] + 0.12, sh[1] + 0.02], [sh[0] + 0.02, sh[1] + 0.55], k);
    const [elb] = ik(sh, hand, L.up, L.fore, [1, -0.6]);
    s.at(plate, hand); s.at(bar, hand);
    fig.update({ hip, sh, head, ...STAND, elb, hand });
    del(sh, k); tb(sh, elb, k * 0.6);
  };
} };

A.lat_raise_m = { view: 'Face', muscles: 'Deltoïdes latéraux', build(s) {
  const st = stack(s, 0.72, 0.12, 10, 0.16);
  s.rect(-0.035, 0, 0.07, 0.47, C.frame); s.rect(-0.22, 0.47, 0.44, 0.07, C.pad, 0.03); s.rect(-0.12, 0.62, 0.24, 0.55, C.pad, 0.04);
  const fig = frontFigure(s, { seated: true }); const dels = [dot(s, 0.065), dot(s, 0.065)];
  const arms = [-1, 1].map(() => ({ u: s.ln(15, C.skin), f: s.ln(13, C.skin), pad: s.ln(18, C.pad), lev: s.ln(7, C.frame2) }));
  return k => {
    const shY = 1.04; fig.update(shY, 0.6);
    arms.forEach((a, i) => { const x = i ? 1 : -1, S = [x * 0.19, shY], an = x * (8 + 80 * k);
      const E = polar(S, an, L.up), H = add(E, [0, 0.06]); // avant-bras vers l'avant (raccourci)
      s.setL(a.u, S, E); s.setL(a.f, E, H); s.setL(a.lev, [x * 0.19, shY + 0.12], polar(S, an, 0.24)); s.setL(a.pad, polar(S, an, 0.18), polar(S, an, 0.3));
      dels[i](S, k); });
    st(k * 0.2);
  };
} };

A.lean_lat_raise = { view: 'Face', muscles: 'Deltoïde latéral', build(s) {
  s.rect(-0.8, 0, 0.08, 1.9, C.frame, 0.02); pulley(s, -0.7, 0.14);
  const fig = frontFigure(s); const idle = [s.ln(15, C.skin), s.ln(13, C.skin)];
  const cable = s.ln(2.5, C.cable); const arm = frontArm(s), g = s.ln(18, C.pad); const del = dot(s, 0.065);
  return k => {
    const sl = [-0.06, 1.37], sr = [0.33, 1.33]; fig.update(0, 0.93, { sl, sr });
    const [eL, hL] = ik(sl, [-0.72, 1.3], L.up, L.fore, [0, -1]); s.setL(idle[0], sl, eL); s.setL(idle[1], eL, hL);
    const a = -14 + 100 * k, E = polar(sr, a, L.up), H = polar(E, a + 10, L.fore);
    s.setL(cable, H, [-0.7, 0.14]); arm(sr, E, H); s.setL(g, add(H, [0, -0.05]), add(H, [0, 0.05])); del(sr, k);
  };
} };

function frontRaise(cable) { return { view: 'Profil', muscles: 'Deltoïdes antérieurs', build(s) {
  if (cable) { s.rect(-0.5, 0, 0.08, 1.9, C.frame, 0.02); pulley(s, -0.4, 0.12); }
  const cb = cable ? s.ln(2.5, C.cable) : null;
  const fig = sideFigure(s, { farLeg: true }); const del = dot(s, 0.07);
  const db = cable ? null : endOn(s), grip = cable ? s.ln(10, C.pad) : null;
  const hip = [0, 0.93];
  return k => {
    const { sh, head } = torsoPts(hip, 0.02);
    const a = 6 + 86 * k, elb = polar(sh, a, L.up), hand = polar(elb, a + 6, L.fore);
    fig.update({ hip, sh, head, ...STAND, elb, hand });
    if (db) db(hand); else { s.setL(cb, hand, [-0.4, 0.12]); s.setL(grip, add(hand, [0, -0.05]), add(hand, [0, 0.05])); }
    del(add(sh, [0.03, 0]), k);
  };
} }; }
A.front_raise_db = frontRaise(false);
A.front_raise_cable = frontRaise(true);

A.y_raise = { view: 'Profil', muscles: 'Trapèze inférieur, deltoïdes', build(s) {
  const lean = -0.8, hip = [-0.05, 0.78], { sh, head } = torsoPts(hip, lean);
  const nf = [Math.cos(lean), Math.sin(lean)], a0 = add(add(hip, mul(nf, 0.13)), [0, -0.1]), a1 = add(add(sh, mul(nf, 0.13)), [-0.04, 0]);
  s.setL(s.ln(24, C.pad), a0, a1); s.setL(s.ln(10, C.frame), a0, [a0[0] - 0.05, 0]); s.setL(s.ln(10, C.frame), lerp(a0, a1, 0.7), [lerp(a0, a1, 0.7)[0], 0]);
  const fig = sideFigure(s); const tr = band(s, 46, -1); const del = dot(s, 0.065); const db = endOn(s);
  const ank = [-0.45, 0.08]; const [knee] = ik(hip, ank, L.thigh, L.shin, [1, 0]);
  return k => {
    const a = 6 + 128 * k, elb = polar(sh, a, L.up), hand = polar(elb, a, L.fore);
    fig.update({ hip, sh, head, knee, ank, toe: add(ank, [0.19, -0.04]), elb, hand });
    db(hand); tr(hip, sh, k, 0.45, 0.9); del(sh, k * 0.6);
  };
} };

A.rear_delt_row = { view: 'Profil', muscles: 'Deltoïdes postérieurs, milieu du dos', build(s) {
  s.rect(-0.35, 0, 1.4, 0.05, C.frame); s.rect(-0.12, 0.05, 0.07, 0.36, C.frame); s.rect(-0.22, 0.41, 0.4, 0.07, C.pad, 0.03);
  s.rect(0.62, 0.05, 0.06, 0.38, C.frame2, 0.02); s.rect(0.84, 0.05, 0.08, 1.05, C.frame); pulley(s, 0.84, 1.02);
  const cable = s.ln(2.5, C.cable), bar = s.ln(10, C.pad);
  const fig = sideFigure(s); const back = band(s, 46, -1); const dp = dot(s, 0.07);
  const hip = [0, 0.53], ank = [0.6, 0.32]; const [knee] = ik(hip, ank, L.thigh, L.shin, [0, 1]);
  return k => {
    const { sh, head } = torsoPts(hip, 0.06);
    const hand = lerp([sh[0] + 0.55, sh[1] - 0.06], [sh[0] + 0.1, sh[1] - 0.02], k), [elb] = ik(sh, hand, L.up, L.fore, [-1, 0.5]);
    fig.update({ hip, sh, head, knee, ank, toe: add(ank, [0.03, 0.18]), elb, hand });
    s.setL(cable, hand, [0.84, 1.02]); s.setL(bar, add(hand, [0, -0.05]), add(hand, [0, 0.05]));
    dp(add(sh, [-0.04, 0]), k); back(hip, sh, k * 0.6, 0.5, 0.95);
  };
} };

A.high_row_cable = { view: 'Profil', muscles: 'Milieu du dos, deltoïdes postérieurs', build(s) {
  s.rect(-0.75, 0, 1.6, 0.025, C.pad, 0.01); s.rect(0.66, 0, 0.08, 2.1, C.frame, 0.02); pulley(s, 0.62, 2.0);
  const cable = s.ln(2.5, C.cable), rope = s.ln(8, C.pad);
  const fig = sideFigure(s); const back = band(s, 46, -1); const dp = dot(s, 0.07);
  const knee = [0, 0.07], ank = [-0.42, 0.07], hip = [0.02, 0.51];
  return k => {
    const { sh, head } = torsoPts(hip, 0.08);
    const hand = lerp([sh[0] + 0.3, sh[1] + 0.46], [sh[0] + 0.12, sh[1] + 0.06], k), [elb] = ik(sh, hand, L.up, L.fore, [-1, -0.1]);
    fig.update({ hip, sh, head, knee, ank, toe: [-0.58, 0.02], elb, hand });
    s.setL(cable, hand, [0.62, 2.0]); s.setL(rope, add(hand, [0, -0.05]), add(hand, [0, 0.05]));
    dp(add(sh, [-0.04, 0]), k); back(hip, sh, k, 0.45, 0.95);
  };
} };

// ------------------------------------------------------------------ API publique
const SCALE = { 'Profil': [260, [140, 372]], 'Face': [150, [200, 372]], 'Dos': [150, [200, 372]] };
const STANDING = { leg_ext: [235, [178, 372]], leg_curl: [235, [178, 372]], chest_press: [235, [175, 372]], shoulder_press_m: [215, [185, 372]], pushdown: [175, [150, 380]], curl_db: [175, [170, 380]], lat_raise_db: [185, [200, 380]], leg_press: [250, [130, 372]], seated_row: [240, [120, 372]],
  pec_deck: [190, [200, 372]], reverse_pec_deck: [190, [200, 372]], ext_rot_cable: [185, [220, 380]], shrug_db: [185, [200, 380]], woodchopper: [165, [190, 380]],
  abduction_m: [215, [195, 372]], adduction_m: [215, [195, 372]], wrist_curl: [290, [120, 378]], straight_arm: [175, [120, 380]], back_ext: [230, [230, 372]],
  crunch: [240, [215, 372]], hip_thrust: [240, [135, 372]], captain_chair: [175, [170, 380]], calf_leg_press: [250, [130, 372]], tib_raise: [175, [180, 380]], neck_flex: [230, [225, 372]],
  cable_cross: [170, [200, 380]], ohp_db: [215, [185, 372]], overhead_cable: [170, [200, 380]], cable_crunch: [175, [150, 380]], lat_raise_cable: [185, [215, 380]],
  shrug_smith: [185, [200, 380]], face_pull: [175, [150, 380]], incline_curl: [235, [190, 372]], cable_rear_fly: [170, [200, 380]], row_smith: [200, [150, 380]],
  reverse_curl: [175, [170, 380]], lat_pd_uni: [170, [200, 380]], pallof: [175, [195, 380]], cable_kickback: [175, [150, 380]], calf_smith: [175, [170, 380]],
  nordic: [200, [150, 372]], sissy: [190, [200, 380]], sumo_squat: [185, [200, 380]], hanging_leg_raise: [165, [190, 380]], cable_abduction: [185, [215, 380]],
  neck_ext: [220, [140, 372]], trap_dl_db: [210, [160, 380]], ab_wheel: [190, [130, 372]],
  fly_db: [220, [200, 372]], arnold: [190, [200, 372]], overhead_db: [210, [175, 372]], ohp_smith: [215, [185, 372]], reverse_crunch: [240, [230, 372]],
  upright_row: [185, [200, 380]], rear_fly_db: [185, [200, 380]], bayesian_curl: [180, [240, 380]], row_db: [230, [205, 378]], hammer_curl: [175, [170, 380]],
  lat_pd_close: [160, [205, 380]], glute_bridge: [250, [200, 372]], calf_db: [175, [170, 380]], rdl_db: [200, [195, 380]], rdl_smith: [200, [195, 380]],
  smith_squat: [200, [200, 380]], goblet: [200, [195, 380]], step_up: [165, [180, 380]],
  bench_db: [250, [235, 372]], bench_smith: [250, [235, 372]], bench_bb: [250, [235, 372]], close_bench_smith: [250, [235, 372]], floor_press_db: [250, [235, 372]], decline_db: [230, [225, 372]],
  incline_db: [215, [220, 372]], incline_smith: [215, [220, 372]], incline_bb: [215, [220, 372]], incline_m: [200, [230, 372]],
  pushup: [220, [195, 372]], diamond_pushup: [220, [195, 372]], pushup_incline: [215, [205, 372]], pushup_decline: [200, [190, 372]],
  dips_chest: [170, [215, 380]], dips_assist: [165, [225, 380]], bench_dips: [230, [175, 372]], triceps_m: [215, [210, 372]],
  cable_fly_low: [170, [200, 380]], cable_press: [175, [195, 380]], ohp_bb: [165, [175, 380]], lat_raise_m: [190, [190, 372]], lean_lat_raise: [185, [215, 380]],
  front_raise_db: [175, [160, 380]], front_raise_cable: [175, [190, 380]], y_raise: [190, [190, 380]], rear_delt_row: [240, [120, 372]], high_row_cable: [175, [175, 380]] };

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
