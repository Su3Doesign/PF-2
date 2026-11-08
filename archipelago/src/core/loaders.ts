import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const base = import.meta.env.BASE_URL;
export const url = (p: string) => `${base}${p.replace(/^\//, '')}`;

const draco = new DRACOLoader(); // three bundles its own glTF decoders
const gltf = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<string, Promise<GLTF>>();
const progress = new Map<string, number>();
const listeners = new Set<() => void>();

/** Loads a model once; progress is reported per file for the preloader. */
export function loadModel(name: string): Promise<GLTF> {
  if (!cache.has(name)) {
    progress.set(name, 0);
    cache.set(name, new Promise((res, rej) => gltf.load(url(`models/${name}.glb`), (g) => { progress.set(name, 1); emit(); sanitizeNormals(g.scene); flattenGlass(g.scene); res(g); },
      (e) => { if (e.total) { progress.set(name, e.loaded / e.total); emit(); } }, rej)));
  }
  return cache.get(name)!;
}
function emit() { for (const l of listeners) l(); }
export function onLoadProgress(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
export function modelProgress(names: string[]) {
  return names.reduce((s, n) => s + (progress.get(n) ?? 0), 0) / Math.max(1, names.length);
}

const texLoader = new THREE.TextureLoader();
const texCache = new Map<string, THREE.Texture>();
export function loadTexture(path: string, srgb = true): THREE.Texture {
  if (texCache.has(path)) return texCache.get(path)!;
  const t = texLoader.load(url(path));
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(path, t);
  return t;
}

/**
 * Normalises a model: centres it on its footprint, sits it on y = 0 and scales its longest
 * horizontal side to `length` metres. Returns a wrapper group.
 */
export function fitModel(root: THREE.Object3D, length: number, axis: 'x' | 'z' | 'auto' = 'auto') {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const L = axis === 'x' ? size.x : axis === 'z' ? size.z : Math.max(size.x, size.z);
  const s = length / L;
  const wrap = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(root);
  const c = box.getCenter(new THREE.Vector3());
  root.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
  inner.scale.setScalar(s);
  wrap.add(inner);
  wrap.userData.size = size.multiplyScalar(s);
  return wrap;
}

/**
 * Merges a rigid model's meshes by material, so a 249-mesh car draws in ~70 calls.
 * Geometries with different attribute sets are kept in separate buckets.
 */
export function mergeByMaterial(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[] }>();
  const remove: THREE.Object3D[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material) || (m as any).isSkinnedMesh) return;
    const g = m.geometry.clone();
    if (g.index === null) continue_(g);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color', 'tangent'].includes(k)) g.deleteAttribute(k);
    // de-quantise first: a matrix applied to a normalised integer attribute clamps to [-1, 1]
    for (const k of Object.keys(g.attributes)) g.setAttribute(k, toFloat(g.getAttribute(k) as THREE.BufferAttribute)); // fresh float attributes merge cleanly
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    g.morphAttributes = {};
    const sig = (m.material as THREE.Material).uuid + '|' + Object.keys(g.attributes).sort().map((k) => k + g.getAttribute(k).itemSize).join(',');
    if (!buckets.has(sig)) buckets.set(sig, { mat: m.material as THREE.Material, geos: [] });
    buckets.get(sig)!.geos.push(g);
    remove.push(m);
  });
  for (const m of remove) m.parent?.remove(m);
  const out = new THREE.Group();
  for (const { mat, geos } of buckets.values()) {
    const merged = mergeGeometries(geos, false);
    if (merged) out.add(new THREE.Mesh(merged, mat));
  }
  root.add(out);
  return root;
}
function continue_(g: THREE.BufferGeometry) {
  const n = g.getAttribute('position').count; const idx = new Uint32Array(n); for (let i = 0; i < n; i++) idx[i] = i; g.setIndex(new THREE.BufferAttribute(idx, 1));
}
function toFloat(a: THREE.BufferAttribute) {
  const out = new Float32Array(a.count * a.itemSize);
  const get = [a.getX, a.getY, a.getZ, a.getW];
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = get[k].call(a, i);
  return new THREE.BufferAttribute(out, a.itemSize);
}

/** A dark studio with a few soft boxes: what the car paint and chrome reflect. */
export function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030409);
  const box = (w: number, h: number, pos: [number, number, number], rot: [number, number, number], color: number, i: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(i), side: THREE.DoubleSide }));
    m.position.set(...pos); m.rotation.set(...rot); scene.add(m);
  };
  box(14, 2.2, [0, 9, 0], [Math.PI / 2, 0, 0], 0xffffff, 3.2);       // overhead strip
  box(10, 3, [-11, 4, 2], [0, Math.PI / 2, 0], 0xb8c6ff, 1.4);       // cool side box
  box(10, 3, [11, 3, -3], [0, -Math.PI / 2, 0], 0xffd9a3, 1.6);       // warm side box
  box(30, 0.5, [0, 1.2, -12], [0, 0, 0], 0xc9a86a, 1.2);              // gold horizon line
  box(30, 6, [0, -3, 12], [0, Math.PI, 0], 0x1a2244, 0.6);            // indigo bounce
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.03).texture;
  pmrem.dispose();
  return env;
}

export function applyEnv(root: THREE.Object3D, env: THREE.Texture, intensity = 1) {
  root.traverse((o) => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[]) {
      if ('envMap' in mat) { mat.envMap = env; mat.envMapIntensity = intensity; mat.needsUpdate = true; }
    }
  });
}

/** Quantised normals can collapse to zero length; a zero normal lights as NaN. */
export function sanitizeNormals(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    const n = m.geometry.getAttribute('normal') as THREE.BufferAttribute | undefined; if (!n) return;
    let bad = 0; const v = new THREE.Vector3();
    for (let i = 0; i < n.count; i++) { v.fromBufferAttribute(n, i); if (!(v.lengthSq() > 1e-8) || !Number.isFinite(v.x)) bad++; }
    if (bad) { m.geometry.deleteAttribute('normal'); m.geometry.computeVertexNormals(); }
  });
}

/**
 * Transmission renders the whole scene a second time per frame, which a voyage this big
 * cannot afford. Glass becomes thin reflective glass instead: transparent, dark, glossy.
 */
export function flattenGlass(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshPhysicalMaterial[]) {
      // anisotropy needs tangents these models do not carry, and sheen is costly; both go
      if (mat.anisotropy) mat.anisotropy = 0;
      if (mat.sheen) mat.sheen = 0;
      if (mat.iridescence) mat.iridescence = 0;
      if (mat.transmission && mat.transmission > 0) {
        mat.transmission = 0; mat.transparent = true; mat.opacity = Math.min(mat.opacity, 0.32);
        mat.roughness = Math.min(mat.roughness, 0.06); mat.metalness = 0; mat.depthWrite = false;
        mat.color.multiplyScalar(0.35); mat.needsUpdate = true;
      }
    }
  });
}
