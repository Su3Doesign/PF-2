import * as THREE from 'three';

/** A work, placed in the world as a physical object. */
export interface Artefact {
  slug: string;
  object: THREE.Object3D;      // turns toward the viewer on hover
  hit: THREE.Mesh;             // invisible proxy for the raycaster
  label: THREE.Object3D;       // the DOM label follows this
  hovered: boolean;
  /** called with 0..1 hover amount every frame */
  onHover?: (h: number) => void;
  hover: number;
  baseRotY?: number;
}

const hitMat = new THREE.MeshBasicMaterial({ visible: false });

/**
 * Builds a hit box and a label anchor around an object, parented to the object itself so
 * both travel with it (the cars race, the helmet turns). The box is measured in the
 * object's own frame. `_parent` is kept for call-site compatibility.
 */
export function makeArtefact(slug: string, object: THREE.Object3D, _parent: THREE.Object3D | null, pad = 1.1, labelLift = 0.6): Artefact {
  object.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(object.matrixWorld).invert();
  const box = new THREE.Box3(); const tmp = new THREE.Box3(); const m = new THREE.Matrix4();
  object.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry || mesh.userData.slug) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    tmp.copy(mesh.geometry.boundingBox!).applyMatrix4(m.multiplyMatrices(inv, mesh.matrixWorld));
    box.union(tmp);
  });
  if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
  const c = box.getCenter(new THREE.Vector3());
  const s = box.getSize(new THREE.Vector3()).multiplyScalar(pad);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(s.x, 0.4), Math.max(s.y, 0.4), Math.max(s.z, 0.4)), hitMat);
  hit.position.copy(c);
  hit.userData.slug = slug;
  object.add(hit);
  const label = new THREE.Object3D();
  label.position.set(c.x, box.max.y + labelLift / Math.max(1e-3, object.getWorldScale(new THREE.Vector3()).y), c.z);
  object.add(label);
  return { slug, object, hit, label, hovered: false, hover: 0, baseRotY: object.rotation.y };
}

/** Text drawn to a canvas, for signs that live in the world. */
export function textTexture(lines: { text: string; font: string; color: string; y: number; x?: number; align?: CanvasTextAlign; spacing?: number }[], w: number, h: number, bg = 'rgba(0,0,0,0)') {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  for (const l of lines) {
    g.font = l.font; g.fillStyle = l.color; g.textAlign = l.align ?? 'center'; g.textBaseline = 'middle';
    if (l.spacing) (g as any).letterSpacing = `${l.spacing}px`;
    g.fillText(l.text, l.x ?? w / 2, l.y);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** An emissive sign: canvas text on a plane, bright enough to bloom. */
export function neonSign(text: string, opts: { font: string; color: string; glow: number; w: number; h: number; px?: [number, number] }) {
  const [pw, ph] = opts.px ?? [1024, 256];
  const tex = textTexture([{ text, font: opts.font, color: '#fff', y: ph / 2 }], pw, ph);
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(opts.color).multiplyScalar(opts.glow), transparent: true, depthWrite: false, toneMapped: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(opts.w, opts.h), mat);
  return m;
}
