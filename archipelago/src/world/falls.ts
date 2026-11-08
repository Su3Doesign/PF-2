import * as THREE from 'three';

export interface FallSpec { origin: THREE.Vector3; out: THREE.Vector3; width: number; count: number; height?: number; }

/**
 * Waterfalls of light: streams of gold points pouring off island lips into the cloud.
 * Motion is analytic (no simulation): each point loops from the lip to the cloud with a
 * gravity curve, a widening sheet and some turbulence, and parts around the cursor ray.
 */
export function createFalls(specs: FallSpec[]) {
  let total = 0; for (const s of specs) total += s.count;
  const origin = new Float32Array(total * 3), dir = new Float32Array(total * 3), prm = new Float32Array(total * 4);
  let k = 0;
  for (const s of specs) {
    const h = s.height ?? s.origin.y + 6;
    const side = new THREE.Vector3(-s.out.z, 0, s.out.x).normalize();
    for (let i = 0; i < s.count; i++, k++) {
      const u = (Math.random() - 0.5) * (Math.random() < 0.8 ? 1 : 1.6);
      origin[k * 3] = s.origin.x + side.x * u * s.width; origin[k * 3 + 1] = s.origin.y; origin[k * 3 + 2] = s.origin.z + side.z * u * s.width;
      dir[k * 3] = s.out.x; dir[k * 3 + 1] = u; dir[k * 3 + 2] = s.out.z;
      prm[k * 4] = Math.random(); prm[k * 4 + 1] = 0.7 + Math.random() * 0.6; prm[k * 4 + 2] = h; prm[k * 4 + 3] = Math.random();
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(origin, 3));
  geo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
  geo.setAttribute('aPrm', new THREE.BufferAttribute(prm, 4));
  const uniforms = {
    uTime: { value: 0 }, uPx: { value: 1 }, uAlpha: { value: 1 }, uReverse: { value: 0 },
    uRayO: { value: new THREE.Vector3() }, uRayD: { value: new THREE.Vector3(0, 0, -1) },
    uBurst: { value: 0 }, uFreeze: { value: 0 }, uChart: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uPx, uReverse, uBurst, uFreeze;
      uniform vec3 uRayO, uRayD;
      attribute vec3 aDir; attribute vec4 aPrm;
      varying float vA; varying float vT;
      void main(){
        float h = aPrm.z;
        float speed = aPrm.y * 0.055 * 30.0 / sqrt(h);
        float t = fract(aPrm.x + uTime * speed * (1.0 - uFreeze*0.9));
        if (uReverse > 0.5) t = 1.0 - t;
        float fallT = t * t;
        vec3 p = position;
        vec3 ow = vec3(aDir.x, 0.0, aDir.z);
        p += ow * (2.0 + t * 7.0) * (0.6 + aPrm.w);
        p.y -= h * fallT;
        // widen into a sheet, with turbulence
        vec3 side = normalize(vec3(-ow.z, 0.0, ow.x));
        p += side * aDir.y * t * h * 0.08;
        p += vec3(sin(t*9.0 + aPrm.w*30.0 + uTime*0.8), 0.0, cos(t*7.0 + aPrm.w*20.0 + uTime*0.6)) * t * 1.6;
        // burst: a click sends the stream upward for a moment
        p.y += uBurst * (1.0 - t) * 18.0 * aPrm.w;
        // part around the cursor
        vec3 toP = p - uRayO; float along = max(dot(toP, uRayD), 0.0);
        vec3 c = uRayO + uRayD * along; vec3 off = p - c; float d = length(off);
        p += normalize(off + 1e-4) * exp(-d*d/40.0) * 5.0;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = -mv.z;
        vT = t;
        vA = (1.0 - smoothstep(0.75, 1.0, t)) * smoothstep(0.0, 0.04, t) * (0.4 + 0.6 * aPrm.w);
        gl_PointSize = clamp(uPx * (1.4 + aPrm.w * 1.8) * 140.0 / dist, 0.7, 8.0 * uPx);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAlpha, uChart;
      varying float vA; varying float vT;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d);
        vec3 c = mix(vec3(1.0, 0.92, 0.72), vec3(0.79, 0.62, 0.36), vT);
        gl_FragColor = vec4(c * a * vA * uAlpha * (1.0 - uChart) * 1.3, 1.0);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 6;
  return { points, uniforms };
}
