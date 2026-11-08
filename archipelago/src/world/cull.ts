import * as THREE from 'three';

/**
 * Skips meshes that would cover less than a pixel or two on screen (a helmet on Machines seen
 * from the hero shot, a lamp across the archipelago). They move to a layer the camera does not
 * render; `visible` is left alone, so the scenes' own show/hide logic keeps working.
 */
const HIDDEN = 5;
type Item = { o: THREE.Mesh; c: THREE.Vector3; r: number; tris: number };

export class TinyCuller {
  private items: Item[] = [];
  private v = new THREE.Vector3();
  private i = 0;
  scan(root: THREE.Object3D) {
    this.items.length = 0;
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || (m as unknown as THREE.InstancedMesh).isInstancedMesh || (m as unknown as THREE.SkinnedMesh).isSkinnedMesh) return;
      if (!m.visible || m.frustumCulled === false) return;   // hit boxes and screen-filling shells stay as they are
      const g = m.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
      if (!g.boundingSphere || g.boundingSphere.radius > 40) return;
      const tris = (g.index ? g.index.count : g.getAttribute('position').count) / 3;
      this.items.push({ o: m, c: g.boundingSphere.center.clone(), r: g.boundingSphere.radius, tris });
    });
  }
  /** Re-checks a slice of the list each frame; px is the pixel threshold for the sphere's radius. */
  update(cam: THREE.PerspectiveCamera, viewH: number, px = 1.1, slice = 400) {
    const n = this.items.length; if (!n) return;
    const focal = viewH / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
    for (let k = 0; k < Math.min(slice, n); k++) {
      const it = this.items[this.i]; this.i = (this.i + 1) % n;
      this.v.copy(it.c).applyMatrix4(it.o.matrixWorld);
      const r = it.r * it.o.matrixWorld.getMaxScaleOnAxis();
      const d = Math.max(0.01, this.v.distanceTo(cam.position) - r);
      const s = (r / d) * focal;
      // dense models get skipped while they are still a few pixels wide (their detail is sub-pixel)
      const tiny = s < px || (s < px * 8 && it.tris > 20000) || (s < px * 3.5 && it.tris > 3000);
      if (tiny) it.o.layers.set(HIDDEN); else it.o.layers.set(0);
    }
  }
}
