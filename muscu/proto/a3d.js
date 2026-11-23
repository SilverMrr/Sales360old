// Prototype option A : mannequin 3D articulé (cinématique directe + IK 2 segments) et machines procédurales.
import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const ease = t => t * t * (3 - 2 * t);
// cycle de répétition : montée 1,2 s · pause 0,3 · descente 1,7 · pause 0,4
export function repPhase(t) {
  const T = 3.6, x = t % T;
  if (x < 1.2) return ease(x / 1.2);
  if (x < 1.5) return 1;
  if (x < 3.2) return 1 - ease((x - 1.5) / 1.7);
  return 0;
}
// IK 2 segments : renvoie la position du coude/genou
export function ik2(S, T, L1, L2, pole) {
  const st = T.clone().sub(S); let d = st.length();
  d = Math.min(Math.max(d, 1e-4), L1 + L2 - 1e-4);
  const u = st.normalize();
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
  const p = pole.clone().sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
  return S.clone().add(u.multiplyScalar(a)).add(p.multiplyScalar(h));
}

const MAT = {
  skin: new THREE.MeshStandardMaterial({ color: 0xe4ddd2, roughness: 0.6 }),
  joint: new THREE.MeshStandardMaterial({ color: 0xc9c1b4, roughness: 0.6 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x2b303b, roughness: 0.45, metalness: 0.5 }),
  pad: new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.85 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xb9c0cc, roughness: 0.25, metalness: 0.9 }),
  plate: new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.4, metalness: 0.6 }),
  plateOn: new THREE.MeshStandardMaterial({ color: 0xff5a3c, roughness: 0.4, metalness: 0.3 }),
  cable: new THREE.LineBasicMaterial({ color: 0x9aa3b5 }),
};
const hot = () => new THREE.MeshStandardMaterial({ color: 0xe4ddd2, roughness: 0.55, emissive: 0xff2d3c, emissiveIntensity: 0 });

function box(w, h, d, mat, r = 0.015) { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat); m.castShadow = m.receiveShadow = true; return m; }
function cyl(r, len, mat, axis = 'x') {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24), mat);
  if (axis === 'x') m.rotation.z = Math.PI / 2; if (axis === 'z') m.rotation.x = Math.PI / 2;
  m.castShadow = true; return m;
}

// Segment capsule de longueur fixe, orienté entre deux points
class Seg {
  constructor(scene, r, len, mat) { this.m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(len - 2 * r, 0.001), 6, 16), mat); this.m.castShadow = true; scene.add(this.m); }
  set(a, b) { this.m.position.copy(a).add(b).multiplyScalar(0.5); this.m.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize()); }
}

// Mannequin : tronc rigide (groupe) + membres en capsules
class Mannequin {
  constructor(scene, highlight = {}) {
    this.L = { thigh: 0.44, shin: 0.43, foot: 0.2, up: 0.3, fore: 0.27 };
    const torso = this.torso = new THREE.Group(); scene.add(torso);
    const ell = (p, s, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), mat); m.position.set(...p); m.scale.set(...s); m.castShadow = true; torso.add(m); return m; };
    ell([0, 0.03, 0], [0.15, 0.09, 0.1], MAT.skin);
    ell([0, 0.2, 0], [0.13, 0.12, 0.09], highlight.abs || MAT.skin);
    ell([0, 0.38, 0], [0.175, 0.15, 0.11], MAT.skin);
    if (highlight.lats) for (const s of [1, -1]) ell([s * 0.12, 0.27, -0.035], [0.06, 0.16, 0.07], highlight.lats).rotation.z = s * 0.25;
    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.06, 4, 12), MAT.skin); neck.position.set(0, 0.55, 0); torso.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 20), MAT.skin); head.scale.set(0.95, 1.18, 1.02); head.position.set(0, 0.68, 0.01); head.castShadow = true; torso.add(head);
    this.joints = [];
    const mk = (r, len, mat) => new Seg(scene, r, len, mat);
    this.limbs = {};
    for (const s of ['l', 'r']) {
      this.limbs[s] = {
        thigh: mk(0.065, this.L.thigh, highlight.quads || MAT.skin), shin: mk(0.048, this.L.shin, MAT.skin), foot: mk(0.035, this.L.foot, MAT.skin),
        up: mk(0.045, this.L.up, highlight.arms || MAT.skin), fore: mk(0.037, this.L.fore, MAT.skin),
        hand: new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), MAT.joint),
        knee: new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), MAT.joint),
        elbow: new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), MAT.joint),
      };
      for (const k of ['hand', 'knee', 'elbow']) { this.limbs[s][k].castShadow = true; scene.add(this.limbs[s][k]); }
    }
  }
  // place le tronc : centre du bassin + inclinaison arrière (rad)
  setTorso(hip, lean) { this.torso.position.copy(hip); this.torso.rotation.set(-lean, 0, 0); this.torso.updateMatrixWorld(true); }
  shoulder(s) { return this.torso.localToWorld(V(s * 0.19, 0.46, -0.01)); }
  hipJ(s) { return this.torso.localToWorld(V(s * 0.09, 0, 0.01)); }
  leg(side, K, A, footDir) {
    const l = this.limbs[side], s = side === 'l' ? 1 : -1;
    l.thigh.set(this.hipJ(s), K); l.shin.set(K, A); l.foot.set(A, A.clone().add(footDir.clone().multiplyScalar(this.L.foot))); l.knee.position.copy(K);
  }
  arm(side, T, pole) {
    const l = this.limbs[side], s = side === 'l' ? 1 : -1;
    const S = this.shoulder(s), E = ik2(S, T, this.L.up, this.L.fore, pole);
    const H = E.clone().add(T.clone().sub(E).normalize().multiplyScalar(this.L.fore));
    l.up.set(S, E); l.fore.set(E, H); l.elbow.position.copy(E); l.hand.position.copy(H);
    return H;
  }
}

function stage(container) {
  const w = container.clientWidth, h = container.clientHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0f121a);
  scene.fog = new THREE.Fog(0x0f121a, 5, 10);
  const camera = new THREE.PerspectiveCamera(35, w / h, 0.05, 50);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.minDistance = 1.5; controls.maxDistance = 6; controls.maxPolarAngle = Math.PI * 0.49;
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x1a1d24, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(2.5, 4, 3); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2.5, bottom: -1, near: 0.5, far: 12 }); key.shadow.bias = -0.0004; key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb0ff, 1.2); rim.position.set(-3, 2.5, -2.5); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(20, 64), new THREE.MeshStandardMaterial({ color: 0x161a23, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  new ResizeObserver(() => { const W = container.clientWidth, H = container.clientHeight; if (!W || !H) return; camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H); }).observe(container);
  return { renderer, scene, camera, controls };
}

function weightStack(scene, x, z, top = 1.5) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  for (const dx of [-0.13, 0.13]) { const r = cyl(0.012, top, MAT.steel, 'y'); r.position.set(dx, top / 2, 0); g.add(r); }
  const base = []; const moving = new THREE.Group(); g.add(moving);
  for (let i = 0; i < 12; i++) {
    const p = box(0.24, 0.032, 0.14, i >= 8 ? MAT.plateOn : MAT.plate, 0.006);
    p.position.set(0, 0.08 + i * 0.036, 0);
    (i >= 8 ? moving : g).add(p); base.push(p);
  }
  return { group: g, moving, topY: () => 0.08 + 11 * 0.036 + moving.position.y };
}

// ----------------------------------------------------------- LEG EXTENSION
export function legExtension(container) {
  const { renderer, scene, camera, controls } = stage(container);
  camera.position.set(2.0, 1.25, 1.6); controls.target.set(0, 0.6, 0.15); controls.update();
  const quads = hot();
  const man = new Mannequin(scene, { quads });
  // machine
  const seat = box(0.44, 0.07, 0.42, MAT.pad, 0.03); seat.position.set(0, 0.47, 0.16); scene.add(seat);
  const back = box(0.44, 0.62, 0.08, MAT.pad, 0.035); back.position.set(0, 0.86, -0.15); back.rotation.x = -0.17; scene.add(back);
  const rail = box(0.08, 0.06, 1.1, MAT.frame); rail.position.set(0, 0.03, 0.1); scene.add(rail);
  const post = box(0.08, 0.44, 0.08, MAT.frame); post.position.set(0, 0.24, 0.1); scene.add(post);
  const upr = box(0.06, 1.0, 0.06, MAT.frame); upr.position.set(0, 0.6, -0.24); upr.rotation.x = -0.17; scene.add(upr);
  const sideArm = box(0.05, 0.05, 0.5, MAT.frame); sideArm.position.set(0.27, 0.5, 0.2); scene.add(sideArm);
  for (const s of [1, -1]) { const hnd = cyl(0.018, 0.16, MAT.steel, 'z'); hnd.position.set(s * 0.3, 0.52, 0.08); scene.add(hnd); }
  const pivotP = V(0.29, 0.57, 0.44);
  const pivot = cyl(0.04, 0.08, MAT.steel); pivot.position.copy(pivotP); scene.add(pivot);
  const lever = new THREE.Group(); lever.position.copy(pivotP); scene.add(lever);
  const leverBar = box(0.05, 0.42, 0.05, MAT.frame); leverBar.position.set(0, -0.21, 0); lever.add(leverBar);
  const roller = cyl(0.055, 0.5, MAT.pad); roller.position.set(-0.27, -0.38, 0.07); lever.add(roller);
  const rollerAxle = cyl(0.015, 0.56, MAT.steel); rollerAxle.position.set(-0.27, -0.38, 0.07); lever.add(rollerAxle);
  const stack = weightStack(scene, 0.62, -0.05, 1.2);

  const hip = V(0, 0.6, 0);
  const clock = new THREE.Clock();
  const api = { playing: true, speed: 1, t: 0 };
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta(); if (api.playing) api.t += dt * api.speed;
    const k = repPhase(api.t);
    const phi = THREE.MathUtils.degToRad(8 + k * 80); // angle du tibia depuis la verticale
    man.setTorso(hip, 0.17);
    const shinDir = V(0, -Math.cos(phi), Math.sin(phi)), footDir = V(0, Math.sin(phi), Math.cos(phi));
    for (const [side, s] of [['l', 1], ['r', -1]]) {
      const K = V(s * 0.1, 0.58, 0.44), A = K.clone().add(shinDir.clone().multiplyScalar(man.L.shin));
      man.leg(side, K, A, footDir);
      man.arm(side, V(s * 0.3, 0.53, 0.08), V(s * 1, -0.2, -1));
    }
    lever.rotation.x = -phi;
    stack.moving.position.y = k * 0.22;
    quads.emissiveIntensity = 0.15 + 0.6 * k; quads.color.setRGB(1, 0.62 - 0.25 * k, 0.55 - 0.3 * k);
    controls.update(); renderer.render(scene, camera);
  });
  return api;
}

// ----------------------------------------------------------- TIRAGE VERTICAL
export function latPulldown(container) {
  const { renderer, scene, camera, controls } = stage(container);
  camera.position.set(-1.6, 1.5, -2.2); controls.target.set(0, 1.0, 0.2); controls.update();
  const lats = hot(), arms = new THREE.MeshStandardMaterial({ color: 0xe4ddd2, roughness: 0.55, emissive: 0xff7a45, emissiveIntensity: 0 });
  const man = new Mannequin(scene, { lats, arms });
  // machine
  const seat = box(0.42, 0.07, 0.38, MAT.pad, 0.03); seat.position.set(0, 0.47, 0.06); scene.add(seat);
  const seatPost = box(0.07, 0.44, 0.07, MAT.frame); seatPost.position.set(0, 0.22, 0.1); scene.add(seatPost);
  const kneePad = cyl(0.06, 0.5, MAT.pad); kneePad.position.set(0, 0.74, 0.38); scene.add(kneePad);
  const kneePost = box(0.05, 0.3, 0.05, MAT.frame); kneePost.position.set(0, 0.6, 0.52); scene.add(kneePost);
  for (const x of [-0.2, 0.2]) { const p = box(0.07, 2.3, 0.07, MAT.frame); p.position.set(x, 1.15, 0.85); scene.add(p); }
  const beam = box(0.08, 0.08, 0.95, MAT.frame); beam.position.set(0, 2.28, 0.42); scene.add(beam);
  const baseR = box(0.6, 0.05, 1.2, MAT.frame); baseR.position.set(0, 0.025, 0.35); scene.add(baseR);
  const pul1 = cyl(0.05, 0.03, MAT.steel); pul1.position.set(0, 2.22, 0.13); scene.add(pul1);
  const pul2 = cyl(0.05, 0.03, MAT.steel); pul2.position.set(0, 2.22, 0.85); scene.add(pul2);
  const stack = weightStack(scene, 0, 0.85, 1.9);
  const bar = new THREE.Group(); scene.add(bar);
  const barMesh = cyl(0.014, 1.2, MAT.steel); bar.add(barMesh);
  for (const s of [1, -1]) { const g = cyl(0.02, 0.2, MAT.pad); g.position.x = s * 0.48; bar.add(g); const bend = cyl(0.014, 0.12, MAT.steel, 'y'); bend.position.set(s * 0.6, -0.05, 0); bend.rotation.z = s * 0.6; bar.add(bend); }
  const cable = new THREE.Line(new THREE.BufferGeometry(), MAT.cable); scene.add(cable);

  const hip = V(0, 0.58, 0.02);
  const clock = new THREE.Clock();
  const api = { playing: true, speed: 1, t: 0 };
  const top = V(0, 1.6, 0.12), bottom = V(0, 0.98, 0.22);
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta(); if (api.playing) api.t += dt * api.speed;
    const k = repPhase(api.t);
    man.setTorso(hip, 0.08 + 0.14 * k);
    const B = top.clone().lerp(bottom, k);
    bar.position.copy(B);
    for (const [side, s] of [['l', 1], ['r', -1]]) {
      const K = V(s * 0.11, 0.57, 0.43), A = V(s * 0.12, 0.14, 0.5);
      man.leg(side, K, A, V(0, 0, 1));
      man.arm(side, B.clone().add(V(s * 0.46, 0, 0)), V(s * 1, -0.6 - k, -0.6));
    }
    stack.moving.position.y = k * 0.5;
    lats.emissiveIntensity = 0.1 + 0.7 * k; lats.color.setRGB(1, 0.6 - 0.25 * k, 0.55 - 0.3 * k);
    arms.emissiveIntensity = 0.25 * k;
    cable.geometry.setFromPoints([B, V(0, 2.22, 0.13), V(0, 2.25, 0.85), V(0, stack.topY() + 0.02, 0.85)]);
    controls.update(); renderer.render(scene, camera);
  });
  return api;
}
