// Corps humain schématique en 3D : chaque muscle est un mesh cliquable (userData.muscle).
import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a.clone().lerp(b, t);
const SPHERE = new THREE.SphereGeometry(1, 40, 28);

export class Body3D {
  constructor(container, { onSelect, onHover } = {}) {
    this.container = container;
    this.onSelect = onSelect;
    this.onHover = onHover;
    this.muscleMeshes = {}; // id -> [mesh]
    this.selected = null;
    this.hovered = null;
    this.colorFn = null;

    const w = container.clientWidth, h = container.clientHeight;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, w / h, 0.05, 50);
    this.camera.position.set(0, 1.05, 3.6);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.98, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 6;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = true;
    this.controls.autoRotateSpeed = 1.6;
    this.controls.update();

    this.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x20242c, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(2, 3, 3); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xc8d6ff, 1.5); rim.position.set(-2.5, 2.5, -3); this.scene.add(rim);
    const back = new THREE.DirectionalLight(0xffffff, 0.9); back.position.set(2, 1.5, -3); this.scene.add(back);
    const fill = new THREE.DirectionalLight(0xffffff, 0.45); fill.position.set(0, -1, 2); this.scene.add(fill);

    // socle
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.55, 64), new THREE.MeshBasicMaterial({ color: 0x5b8cff, transparent: true, opacity: 0.08 }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.001; this.scene.add(disc);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.53, 0.55, 64), new THREE.MeshBasicMaterial({ color: 0x5b8cff, transparent: true, opacity: 0.35 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; this.scene.add(ring);

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.baseMat = new THREE.MeshStandardMaterial({ color: 0x4a505e, roughness: 0.75, metalness: 0.05 });
    this.buildBody();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.bindEvents();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.renderer.setAnimationLoop(() => { this.controls.update(); this.renderer.render(this.scene, this.camera); });
  }

  // ---------- construction
  ellipsoid(pos, scale, mat, rot = [0, 0, 0]) {
    const m = new THREE.Mesh(SPHERE, mat);
    m.position.copy(pos); m.scale.set(...scale); m.rotation.set(...rot);
    this.root.add(m); return m;
  }
  between(a, b, rx, rz, mat, offset = V(0, 0, 0), stretch = 1) {
    const dir = b.clone().sub(a); const len = dir.length();
    const m = new THREE.Mesh(SPHERE, mat);
    m.position.copy(lerp(a, b, 0.5).add(offset));
    m.scale.set(rx, (len / 2) * stretch, rz);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), dir.normalize());
    this.root.add(m); return m;
  }
  muscleMat() {
    return new THREE.MeshStandardMaterial({ color: 0xb4473f, roughness: 0.5, metalness: 0.05, emissive: 0x000000 });
  }
  addMuscle(id, mesh) {
    mesh.userData.muscle = id;
    (this.muscleMeshes[id] ||= []).push(mesh);
  }

  buildBody() {
    const B = this.baseMat;
    // tronc / tête (non musculaire)
    this.ellipsoid(V(0, 1.665, 0.005), [0.085, 0.108, 0.098], B);          // tête
    this.between(V(0, 1.46, -0.005), V(0, 1.6, 0.0), 0.05, 0.05, B);      // cou
    this.ellipsoid(V(0, 1.28, 0), [0.142, 0.19, 0.09], B);                   // cage thoracique
    this.ellipsoid(V(0, 1.08, 0), [0.115, 0.13, 0.078], B);                // taille
    this.ellipsoid(V(0, 0.94, -0.005), [0.148, 0.095, 0.098], B);          // bassin

    for (const s of [1, -1]) {
      const S = V(0.2 * s, 1.415, -0.005), E = V(0.245 * s, 1.135, -0.02), W = V(0.275 * s, 0.885, 0.02);
      const H = V(0.093 * s, 0.9, 0), K = V(0.103 * s, 0.515, 0.01), A = V(0.106 * s, 0.09, -0.015);

      // squelette "peau"
      this.ellipsoid(V(0.175 * s, 1.43, -0.005), [0.05, 0.045, 0.05], B);   // épaule
      this.between(S, E, 0.032, 0.032, B);
      this.ellipsoid(E, [0.034, 0.034, 0.034], B);
      this.between(E, W, 0.027, 0.024, B);
      this.ellipsoid(W.clone().add(V(0.006 * s, -0.062, 0.0)), [0.024, 0.07, 0.042], B, [0, 0, 0.05 * s]); // main
      this.between(H, K, 0.056, 0.056, B);
      this.ellipsoid(K, [0.05, 0.05, 0.05], B);
      this.between(K, A, 0.037, 0.037, B);
      this.ellipsoid(A, [0.035, 0.035, 0.035], B);
      this.ellipsoid(V(0.108 * s, 0.035, 0.045), [0.042, 0.03, 0.105], B);   // pied

      // ---- MUSCLES
      this.addMuscle('pecs', this.ellipsoid(V(0.08 * s, 1.33, 0.07), [0.097, 0.078, 0.048], this.muscleMat(), [0.15, -0.25 * s, -0.12 * s]));
      this.addMuscle('delt_ant', this.ellipsoid(V(0.198 * s, 1.395, 0.042), [0.047, 0.08, 0.042], this.muscleMat(), [0.25, 0, 0.12 * s]));
      this.addMuscle('delt_lat', this.ellipsoid(V(0.233 * s, 1.4, -0.005), [0.044, 0.082, 0.052], this.muscleMat(), [0, 0, 0.22 * s]));
      this.addMuscle('delt_post', this.ellipsoid(V(0.198 * s, 1.395, -0.052), [0.047, 0.078, 0.042], this.muscleMat(), [-0.25, 0, 0.12 * s]));
      this.addMuscle('biceps', this.between(lerp(S, E, 0.22), lerp(S, E, 0.97), 0.038, 0.037, this.muscleMat(), V(0, 0, 0.017)));
      this.addMuscle('triceps', this.between(lerp(S, E, 0.12), lerp(S, E, 0.92), 0.041, 0.039, this.muscleMat(), V(0.004 * s, 0, -0.019)));
      this.addMuscle('forearms', this.between(lerp(E, W, -0.02), lerp(E, W, 0.82), 0.042, 0.036, this.muscleMat(), V(0.003 * s, 0, 0.003)));
      this.addMuscle('traps', this.between(V(0.03 * s, 1.5, -0.03), V(0.17 * s, 1.445, -0.03), 0.04, 0.045, this.muscleMat()));
      this.addMuscle('rhomboids', this.ellipsoid(V(0.062 * s, 1.31, -0.077), [0.046, 0.065, 0.026], this.muscleMat(), [0, 0, 0.45 * s]));
      this.addMuscle('lats', this.ellipsoid(V(0.108 * s, 1.2, -0.045), [0.072, 0.165, 0.045], this.muscleMat(), [0.12, 0.35 * s, -0.22 * s]));
      this.addMuscle('lowerback', this.ellipsoid(V(0.034 * s, 1.055, -0.062), [0.034, 0.105, 0.03], this.muscleMat()));
      this.addMuscle('obliques', this.ellipsoid(V(0.1 * s, 1.08, 0.018), [0.04, 0.095, 0.062], this.muscleMat(), [0, 0.3 * s, 0]));
      for (const [y, h] of [[1.205, 0.033], [1.13, 0.034], [1.055, 0.035]]) {
        this.addMuscle('abs', this.ellipsoid(V(0.033 * s, y, 0.073), [0.032, h, 0.026], this.muscleMat()));
      }
      this.addMuscle('glutes', this.ellipsoid(V(0.072 * s, 0.905, -0.062), [0.082, 0.096, 0.062], this.muscleMat()));
      this.addMuscle('abductors', this.ellipsoid(V(0.132 * s, 0.965, -0.02), [0.035, 0.055, 0.05], this.muscleMat(), [0, 0, -0.2 * s]));
      this.addMuscle('quads', this.between(lerp(H, K, 0.08), lerp(H, K, 0.92), 0.07, 0.06, this.muscleMat(), V(0.008 * s, 0, 0.018)));
      this.addMuscle('quads', this.ellipsoid(V(0.078 * s, 0.6, 0.038), [0.04, 0.06, 0.034], this.muscleMat()));
      this.addMuscle('hamstrings', this.between(lerp(H, K, 0.12), lerp(H, K, 0.95), 0.06, 0.052, this.muscleMat(), V(0.002 * s, 0, -0.022)));
      this.addMuscle('adductors', this.between(V(0.05 * s, 0.86, 0.004), V(0.085 * s, 0.63, 0.0), 0.036, 0.048, this.muscleMat()));
      this.addMuscle('calves', this.between(lerp(K, A, 0.06), lerp(K, A, 0.58), 0.05, 0.048, this.muscleMat(), V(0, 0, -0.016)));
      this.addMuscle('tibialis', this.between(lerp(K, A, 0.12), lerp(K, A, 0.78), 0.022, 0.022, this.muscleMat(), V(0.011 * s, 0, 0.026)));
      this.addMuscle('neck', this.between(V(0.034 * s, 1.6, 0.022), V(0.014 * s, 1.475, 0.045), 0.016, 0.016, this.muscleMat()));
    }
    // pièces centrales
    this.addMuscle('traps', this.ellipsoid(V(0, 1.37, -0.075), [0.06, 0.13, 0.028], this.muscleMat()));
    this.addMuscle('abs', this.ellipsoid(V(0, 0.985, 0.07), [0.062, 0.045, 0.026], this.muscleMat()));
  }

  // ---------- interaction
  bindEvents() {
    const el = this.renderer.domElement;
    let down = null;
    el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', e => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 6) return; // drag = rotation, pas un clic
      const id = this.pick(e);
      this.select(id);
      this.onSelect?.(id);
    });
    el.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const id = this.pick(e);
      if (id !== this.hovered) {
        this.hovered = id; this.refresh();
        el.style.cursor = id ? 'pointer' : 'grab';
      }
      this.onHover?.(id, e);
    });
    el.addEventListener('pointerleave', () => { this.hovered = null; this.refresh(); this.onHover?.(null); });
  }
  pick(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.root.children, false);
    if (!hits.length) return null;
    return hits[0].object.userData.muscle || null;
  }
  select(id) { this.selected = id; this.refresh(); }

  // colorFn(id) -> hex | null
  setColorFn(fn) { this.colorFn = fn; this.refresh(); }

  refresh() {
    for (const [id, meshes] of Object.entries(this.muscleMeshes)) {
      const base = new THREE.Color(this.colorFn?.(id) ?? 0xb4473f);
      for (const m of meshes) {
        m.material.color.copy(base);
        if (id === this.selected) { m.material.emissive.set(0x5b8cff); m.material.emissiveIntensity = 0.55; }
        else if (id === this.hovered) { m.material.emissive.set(0xffffff); m.material.emissiveIntensity = 0.18; }
        else { m.material.emissive.set(0x000000); }
      }
    }
  }

  view(name) {
    const d = this.camera.position.distanceTo(this.controls.target);
    const t = this.controls.target;
    const pos = { front: [0, 0, d], back: [0, 0, -d], left: [-d, 0, 0], right: [d, 0, 0] }[name];
    if (!pos) return;
    this.animateTo(V(t.x + pos[0], t.y + 0.05, t.z + pos[2]));
  }
  animateTo(target) {
    const start = this.camera.position.clone(); const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 450); const e = 1 - Math.pow(1 - k, 3);
      this.camera.position.lerpVectors(start, target, e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  setAutoRotate(on) { this.controls.autoRotate = on; }
  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
