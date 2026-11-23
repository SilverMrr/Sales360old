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
const DIM_COLOR = 0x5a4f4f;

export class Body3D {
  constructor(container, { clickable, onSelect, onHover, onProgress } = {}) {
    this.container = container;
    this.clickable = new Set(clickable);
    this.onSelect = onSelect; this.onHover = onHover;
    this.meshes = {}; // id -> mesh
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
    });
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
    for (const [id, m] of Object.entries(this.meshes)) {
      const c = this.colorFn ? (this.colorFn(id) ?? DIM_COLOR) : MUSCLE_COLOR;
      m.material.color.set(c);
      if (id === this.selected) { m.material.emissive.set(0x3d6bff); m.material.emissiveIntensity = 0.65; }
      else if (id === this.hovered) { m.material.emissive.set(0xffffff); m.material.emissiveIntensity = 0.15; }
      else m.material.emissive.set(0x000000);
    }
  }
  view(name) {
    const t = this.controls.target;
    const d = this.camera.position.distanceTo(t);
    const dir = { front: [0, 0, 1], back: [0, 0, -1], left: [-1, 0, 0], right: [1, 0, 0] }[name];
    if (!dir) return;
    const target = new THREE.Vector3(t.x + dir[0] * d, t.y + 0.03, t.z + dir[2] * d);
    const start = this.camera.position.clone(), t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 450), e = 1 - Math.pow(1 - k, 3);
      this.camera.position.lerpVectors(start, target, e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  focus(part) {
    // zoom rapide : haut / bas / tout
    const H = this.height || 1.75;
    const y = { upper: 0.72, lower: 0.3, all: 0.55 }[part] * H;
    const dist = { upper: 1.25, lower: 1.4, all: 2.3 }[part] * H;
    const dir = this.camera.position.clone().sub(this.controls.target).setY(0).normalize();
    this.controls.target.set(0, y, 0);
    this.camera.position.set(dir.x * dist, y + 0.03, dir.z * dist);
  }
  setAutoRotate(on) { this.controls.autoRotate = on; }
  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h);
  }
}
