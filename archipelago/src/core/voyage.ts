import * as THREE from 'three';

export type V3 = THREE.Vector3 | (() => THREE.Vector3);
export interface Key {
  at: number;             // vh from the top of the voyage
  pos: V3;
  look: V3;
  fov?: number;
  /** interpolate this segment around the tower axis instead of in a straight line */
  orbit?: { axis: THREE.Vector3 };
}

const val = (v: V3) => (typeof v === 'function' ? v() : v);
const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * The camera rig. Keys are authored in vh along the scroll; between keys the camera
 * follows a Catmull-Rom spline through its neighbours (so it never stops dead between
 * holds), eased per segment. Segments marked `orbit` interpolate in cylindrical
 * coordinates around an axis, so a climb round the tower never cuts through it.
 */
export class Rig {
  keys: Key[];
  pos = new THREE.Vector3();
  look = new THREE.Vector3();
  fov = 32;
  constructor(keys: Key[]) { this.keys = keys.sort((a, b) => a.at - b.at); }

  get length() { return this.keys[this.keys.length - 1].at; }

  sample(vh: number) {
    const K = this.keys;
    if (vh <= K[0].at) return this.write(K[0], K[0], K[0], K[0], 0);
    if (vh >= K[K.length - 1].at) { const k = K[K.length - 1]; return this.write(k, k, k, k, 0); }
    let i = 0; while (i < K.length - 2 && K[i + 1].at <= vh) i++;
    const a = K[Math.max(0, i - 1)], b = K[i], c = K[i + 1], d = K[Math.min(K.length - 1, i + 2)];
    const t = ease((vh - b.at) / Math.max(1e-6, c.at - b.at));
    return this.write(a, b, c, d, t, c.orbit);
  }

  private write(a: Key, b: Key, c: Key, d: Key, t: number, orbit?: { axis: THREE.Vector3 }) {
    const P = [a, b, c, d].map((k) => val(k.pos)), L = [a, b, c, d].map((k) => val(k.look));
    if (orbit) {
      this.pos.copy(cyl(P[1], P[2], t, orbit.axis));
      this.look.copy(cyl(L[1], L[2], t, orbit.axis));
    } else {
      cr(P[0], P[1], P[2], P[3], t, this.pos);
      cr(L[0], L[1], L[2], L[3], t, this.look);
    }
    this.fov = THREE.MathUtils.lerp(b.fov ?? 32, c.fov ?? 32, t);
    return this;
  }
}

function cr(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number, out: THREE.Vector3) {
  // centripetal-ish Catmull-Rom with damped tangents so holds stay still
  const t2 = t * t, t3 = t2 * t, k = 0.35;
  const m1 = new THREE.Vector3().subVectors(p2, p0).multiplyScalar(k), m2 = new THREE.Vector3().subVectors(p3, p1).multiplyScalar(k);
  return out.set(0, 0, 0)
    .addScaledVector(p1, 2 * t3 - 3 * t2 + 1).addScaledVector(m1, t3 - 2 * t2 + t)
    .addScaledVector(p2, -2 * t3 + 3 * t2).addScaledVector(m2, t3 - t2);
}

function cyl(a: THREE.Vector3, b: THREE.Vector3, t: number, axis: THREE.Vector3) {
  const ax = a.x - axis.x, az = a.z - axis.z, bx = b.x - axis.x, bz = b.z - axis.z;
  const ra = Math.hypot(ax, az), rb = Math.hypot(bx, bz);
  let ta = Math.atan2(az, ax), tb = Math.atan2(bz, bx);
  let dt = tb - ta; while (dt > Math.PI) dt -= Math.PI * 2; while (dt < -Math.PI) dt += Math.PI * 2;
  const th = ta + dt * t;
  // swing wide mid-orbit so the path clears the tower's setbacks
  const r = THREE.MathUtils.lerp(ra, rb, t) + Math.sin(Math.PI * t) * Math.min(14, Math.abs(dt) * 9);
  return new THREE.Vector3(axis.x + Math.cos(th) * r, THREE.MathUtils.lerp(a.y, b.y, t), axis.z + Math.sin(th) * r);
}

/** Piecewise-linear curve over vh, eased per segment; for timeline values like time of day. */
export function curve(points: [number, number][]) {
  return (vh: number) => {
    if (vh <= points[0][0]) return points[0][1];
    for (let i = 0; i < points.length - 1; i++) {
      const [a, va] = points[i], [b, vb] = points[i + 1];
      if (vh <= b) return va + (vb - va) * ease((vh - a) / Math.max(1e-6, b - a));
    }
    return points[points.length - 1][1];
  };
}

/** 0..1 across [a,b], clamped and eased. */
export const span = (vh: number, a: number, b: number) => ease(THREE.MathUtils.clamp((vh - a) / (b - a), 0, 1));
