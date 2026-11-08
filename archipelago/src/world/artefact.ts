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

/** Builds a hit box and label anchor around an object's current bounds. */
export function makeArtefact(slug: string, object: THREE.Object3D, parent: THREE.Object3D, pad = 1.1, labelLift = 0.6): Artefact {
  object.updateMatrixWorld(true);
  parent.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
  const c = box.getCenter(new THREE.Vector3());
  const s = box.getSize(new THREE.Vector3()).multiplyScalar(pad);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(s.x, 0.5), Math.max(s.y, 0.5), Math.max(s.z, 0.5)), hitMat);
  hit.position.copy(c.clone().applyMatrix4(inv));
  hit.userData.slug = slug;
  parent.add(hit);
  const label = new THREE.Object3D();
  label.position.copy(new THREE.Vector3(c.x, box.max.y + labelLift, c.z).applyMatrix4(inv));
  parent.add(label);
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
