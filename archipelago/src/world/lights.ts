import * as THREE from 'three';

/**
 * Virtual lights. The islands declare as many point and spot lights as they like, but
 * none of them is a real three.js light: a real light in the scene costs every lit pixel
 * of every material a loop iteration, and ~50 of them both crawled and overflowed the
 * uniform limits on iPad. Instead a pool of a few real point lights is handed, each frame,
 * to the virtual lights that matter most near the camera, with a short fade so nothing pops.
 * The light count never changes, so shaders never recompile.
 */
export class VPoint extends THREE.Object3D {
  readonly isVLight = true;
  color: THREE.Color;
  constructor(color: THREE.ColorRepresentation = 0xffffff, public intensity = 1, public distance = 0, public decay = 2) {
    super();
    this.color = new THREE.Color(color);
  }
}
/** Spot lights become points in the pool; the target is kept so existing code still works. */
export class VSpot extends VPoint {
  target = new THREE.Object3D();
  constructor(color?: THREE.ColorRepresentation, intensity?: number, distance?: number, _angle?: number, _penumbra?: number, decay?: number) {
    super(color, (intensity ?? 1) * 0.6, distance ?? 0, decay ?? 2);
  }
}

export class LightPool {
  lights: THREE.PointLight[] = [];
  private v: VPoint[] = [];
  private slot: (VPoint | null)[] = [];
  private fade: number[] = [];
  private wp = new THREE.Vector3();
  constructor(scene: THREE.Scene, n: number) {
    for (let i = 0; i < n; i++) { const l = new THREE.PointLight(0xffffff, 0, 1, 2); l.position.set(0, -1e4, 0); scene.add(l); this.lights.push(l); this.slot.push(null); this.fade.push(0); }
  }
  /** Re-collect the virtual lights (after models load and add their own). */
  scan(root: THREE.Object3D) {
    this.v = [];
    root.traverse((o) => { if ((o as VPoint).isVLight) this.v.push(o as VPoint); });
  }
  update(cam: THREE.Vector3, dt: number) {
    // rank by how much each light can reach the camera's surroundings
    const ranked: { l: VPoint; s: number }[] = [];
    for (const l of this.v) {
      if (l.intensity <= 0 || !visibleChain(l)) continue;
      l.getWorldPosition(this.wp);
      const range = l.distance || 60;
      const d = this.wp.distanceTo(cam);
      if (d > range * 3 + 60) continue;
      ranked.push({ l, s: d / range - Math.log10(1 + l.intensity) * 0.15 });
    }
    ranked.sort((a, b) => a.s - b.s);
    const want = new Set(ranked.slice(0, this.lights.length).map((r) => r.l));
    // keep lights already in a slot; fill free slots with the rest
    for (let i = 0; i < this.slot.length; i++) if (this.slot[i] && !want.has(this.slot[i]!)) { this.fade[i] -= dt * 4; if (this.fade[i] <= 0) { this.slot[i] = null; this.fade[i] = 0; } }
    for (const l of want) {
      if (this.slot.includes(l)) continue;
      const free = this.slot.findIndex((s) => s === null);
      if (free >= 0) { this.slot[free] = l; this.fade[free] = 0; }
    }
    for (let i = 0; i < this.lights.length; i++) {
      const v = this.slot[i], L = this.lights[i];
      if (!v) { L.intensity = 0; continue; }
      if (want.has(v)) this.fade[i] = Math.min(1, this.fade[i] + dt * 3);
      v.getWorldPosition(L.position);
      L.color.copy(v.color); L.distance = v.distance; L.decay = v.decay;
      L.intensity = v.intensity * this.fade[i];
    }
  }
}

function visibleChain(o: THREE.Object3D | null) {
  while (o) { if (!o.visible) return false; o = o.parent; }
  return true;
}
