// Corps anatomique 3D (Z-Anatomy / BodyParts3D, CC BY-SA 4.0).
// Le fichier GLB contient un mesh par groupe musculaire (nom du nœud = id du muscle),
// plus "other" (muscles non cliquables) et "bones" (squelette).
import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/libs/meshopt_decoder.module.js';

const MUSCLE_COLOR = 0xb8483f;
const OTHER_COLOR = 0x7c4a46;
const BONE_COLOR = 0xd8cfbf;
const DIM_COLOR = 0x4d4444;
const SEL_COLOR = 0x4f86ff;
const HEAD_COLOR = 0x8a5550;

// Zone de la tête dans les coordonnées du modèle (m) : supprime les triangles du visage et du crâne.
const inHead = (x, y, z) => y > 1.556 || (y > 1.488 && z > 0.018) || (y > 1.52 && Math.abs(x) > 0.045 && z > -0.03);
function trimHead(mesh) {
  const g = mesh.geometry, p = g.attributes.position, m = mesh.matrixWorld;
  const idx = g.index ? g.index.array : [...Array(p.count).keys()];
  const v = new THREE.Vector3(), keep = [];
  for (let i = 0; i < idx.length; i += 3) {
    let cx = 0, cy = 0, cz = 0;
    for (let j = 0; j < 3; j++) { v.fromBufferAttribute(p, idx[i + j]).applyMatrix4(m); cx += v.x; cy += v.y; cz += v.z; }
    if (!inHead(cx / 3, cy / 3, cz / 3)) keep.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  g.setIndex(keep);
}
// Tête lisse type mannequin (crâne + bas du visage + cou), sans traits du visage.
function ellipsoid(rx, ry, rz, shape) {
  const g = new THREE.SphereGeometry(1, 56, 40), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (shape) [x, y, z] = shape(x, y, z);
    p.setXYZ(i, x * rx, y * ry, z * rz);
  }
  g.computeVertexNormals();
  return g;
}
function makeHead(mat) {
  const head = new THREE.Group();
  const add = (g, x, y, z, rx = 0) => { const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.rotation.x = rx; head.add(m); return m; };
  // une seule forme : crâne arrondi à l'arrière, section qui avance et s'affine vers le menton
  add(ellipsoid(0.073, 0.112, 0.094, (x, y, z) => {
    const low = Math.max(0, -y);
    x *= (1 - 0.26 * low * low) * (1 + 0.04 * Math.max(0, y));
    z *= 1 - 0.42 * low * low;
    if (z < 0 && y > -0.3) z *= 1.07;
    return [x, y, z + 0.3 * low];
  }), 0, 1.6, -0.008, -0.06);
  // cou (derrière les muscles cliquables du cou)
  const neck = new THREE.CylinderGeometry(0.046, 0.054, 0.17, 40, 1, true);
  neck.scale(1, 1, 1.02);
  add(neck, 0, 1.5, -0.018, 0.18);
  return head;
}

export class Body3D {
  constructor(container, { clickable, onSelect, onHover, onProgress } = {}) {
    this.container = container;
    this.clickable = new Set(clickable);
    this.onSelect = onSelect; this.onHover = onHover;
    this.meshes = {}; // id -> mesh
    this.passive = []; // muscles non cliquables + tête (atténués en mode surbrillance)
    this.inset = 0;
    this.selected = null; this.hovered = null; this.colorFn = null;

    const w = container.clientWidth, h = container.clientHeight;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, w / h, 0.05, 50);
    this.camera.position.set(0, 1.0, 4);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.5; this.controls.maxDistance = 6;
    this.controls.screenSpacePanning = true; this.controls.autoRotateSpeed = 1.4;

    this.scene.add(new THREE.HemisphereLight(0xeef2ff, 0x2a2420, 1.4));
    const key = new THREE.DirectionalLight(0xfff4ea, 2.2); key.position.set(1.5, 3, 2.5); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xbcd0ff, 1.6); rim.position.set(-2.5, 2, -2.5); this.scene.add(rim);
    const back = new THREE.DirectionalLight(0xffffff, 1.0); back.position.set(2, 1, -3); this.scene.add(back);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(-2, 0.5, 2); this.scene.add(fill);

    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.44, 64), new THREE.MeshBasicMaterial({ color: 0x5b8cff, transparent: true, opacity: 0.35 }));
    ring.rotation.x = -Math.PI / 2; this.scene.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 64), new THREE.MeshBasicMaterial({ color: 0x5b8cff, transparent: true, opacity: 0.07 }));
    disc.rotation.x = -Math.PI / 2; this.scene.add(disc);

    this.root = new THREE.Group(); this.scene.add(this.root);
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2();
    this.bindEvents();
    new ResizeObserver(() => this.resize()).observe(container);
    this.renderer.setAnimationLoop(() => { this.controls.update(); this.renderer.render(this.scene, this.camera); });

    this.ready = this.load(onProgress);
  }

  async load(onProgress) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync('models/body.glb', e => e.total && onProgress?.(e.loaded / e.total));
    const model = gltf.scene;
    model.traverse(o => {
      if (!o.isMesh) return;
      const id = o.name.replace(/_\d+$/, '');
      const isBone = id === 'bones';
      o.material = new THREE.MeshStandardMaterial({
        color: isBone ? BONE_COLOR : id === 'other' ? OTHER_COLOR : MUSCLE_COLOR,
        roughness: isBone ? 0.8 : 0.55, metalness: 0.0,
      });
      o.userData.id = id;
      if (this.clickable.has(id)) { o.userData.muscle = id; this.meshes[id] = o; }
      if (id === 'other' || id === 'bones') { o.updateMatrixWorld(true); trimHead(o); }
      if (id === 'other') this.passive.push(o);
    });
    // Tête : on remplace crâne, yeux et muscles du visage (peu lisibles) par une tête lisse type mannequin.
    const head = makeHead(new THREE.MeshStandardMaterial({ color: HEAD_COLOR, roughness: 0.6, metalness: 0, side: THREE.DoubleSide }));
    model.add(head); this.passive.push(head.children[0]);
    // recentrage : pieds au sol, centré en x/z
    const box = new THREE.Box3().setFromObject(model);
    const c = box.getCenter(new THREE.Vector3());
    model.position.set(-c.x, -box.min.y, -c.z);
    this.root.add(model);
    this.height = box.max.y - box.min.y;
    this.controls.target.set(0, this.height * 0.55, 0);
    this.camera.position.set(0, this.height * 0.58, this.height * 2.3);
    this.controls.update();
    this.refresh();
  }

  bindEvents() {
    const el = this.renderer.domElement;
    let down = null;
    el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', e => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
      if (moved > 6) return;
      const id = this.pick(e);
      this.select(id); this.onSelect?.(id);
    });
    el.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const id = this.pick(e);
      if (id !== this.hovered) { this.hovered = id; this.refresh(); el.style.cursor = id ? 'pointer' : 'grab'; }
      this.onHover?.(id, e);
    });
    el.addEventListener('pointerleave', () => { this.hovered = null; this.refresh(); this.onHover?.(null); });
  }
  pick(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.root.children, true)[0];
    return hit?.object.userData.muscle || null;
  }
  select(id) { this.selected = id; this.refresh(); }
  // fn(id) -> couleur hex ou null (null = couleur "atténuée")
  setColorFn(fn) { this.colorFn = fn; this.refresh(); }
  refresh() {
    for (const m of this.passive) m.material.color.set(this.colorFn ? DIM_COLOR : (m.userData.id === 'other' ? OTHER_COLOR : HEAD_COLOR));
    for (const [id, m] of Object.entries(this.meshes)) {
      const c = this.colorFn ? (this.colorFn(id) ?? DIM_COLOR) : MUSCLE_COLOR;
      m.material.color.set(c);
      if (id === this.selected) { m.material.color.set(SEL_COLOR); m.material.emissive.set(0x1d3d9e); m.material.emissiveIntensity = 0.35; }
      else if (id === this.hovered) { m.material.emissive.set(0xffffff); m.material.emissiveIntensity = 0.15; }
      else m.material.emissive.set(0x000000);
    }
  }
  // Animation caméra vers (cible, position)
  fly(target, pos, ms = 550) {
    const t0 = performance.now(), sT = this.controls.target.clone(), sP = this.camera.position.clone();
    const id = (this.flyId = (this.flyId || 0) + 1);
    const step = now => {
      if (id !== this.flyId) return;
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      this.controls.target.lerpVectors(sT, target, e);
      this.camera.position.lerpVectors(sP, pos, e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  dirOf(name) {
    const d = { front: [0, 0, 1], back: [0, 0, -1], left: [-1, 0, 0], right: [1, 0, 0] }[name];
    return d ? new THREE.Vector3(...d) : this.camera.position.clone().sub(this.controls.target).setY(0).normalize();
  }
  view(name) {
    const t = this.controls.target.clone(), d = this.camera.position.distanceTo(t);
    this.fly(t, t.clone().add(this.dirOf(name).multiplyScalar(d)).setY(t.y + 0.03));
  }
  reset(name = 'front') {
    const H = this.height || 1.7, t = new THREE.Vector3(0, H * 0.53, 0);
    this.fly(t, t.clone().add(this.dirOf(name).multiplyScalar(H * 2.35)).setY(H * 0.56));
  }
  // Cadre un ou plusieurs muscles (face ou dos selon `side`, sinon direction actuelle)
  frame(ids, side) {
    const box = new THREE.Box3();
    for (const id of [].concat(ids)) if (this.meshes[id]) box.expandByObject(this.meshes[id]);
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    const fov = THREE.MathUtils.degToRad(this.camera.fov), aspect = this.camera.aspect;
    const vis = Math.max(0.35, 1 - this.inset / Math.max(1, this.container.clientHeight));
    const fit = Math.max(s.y / vis, s.x / Math.max(aspect, 0.3)) * 1.8;
    const d = THREE.MathUtils.clamp(fit / (2 * Math.tan(fov / 2)), 1.5, 4.6);
    this.fly(c, c.clone().add(this.dirOf(side).multiplyScalar(d)).setY(c.y + 0.05));
  }
  // Partie basse du canvas masquée (panneau mobile) : recentre l'image dans la zone visible.
  setInset(px) { this.inset = px; this.resize(); }
  setAutoRotate(on) { this.controls.autoRotate = on; }
  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h; this.renderer.setSize(w, h);
    if (this.inset > 0) this.camera.setViewOffset(w, h, 0, Math.round(this.inset / 2), w, h); else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }
}
