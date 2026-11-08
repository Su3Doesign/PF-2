import * as THREE from 'three';

/**
 * Gold motes drifting through the mist. The volume wraps around the camera, so the
 * density stays the same wherever the voyage goes without simulating the whole sky.
 * Drift is analytic (layered sines) and leans toward the cursor ray.
 */
export function createMotes(count: number, size = 260) {
  const pos = new Float32Array(count * 3);
  const rnd = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * size;
    pos[i * 3 + 1] = (Math.random() - 0.5) * size;
    pos[i * 3 + 2] = (Math.random() - 0.5) * size;
    rnd[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
  const uniforms = {
    uTime: { value: 0 },
    uCam: { value: new THREE.Vector3() },
    uSize: { value: size },
    uPx: { value: 1 },
    uAlpha: { value: 1 },
    uRayO: { value: new THREE.Vector3() },
    uRayD: { value: new THREE.Vector3(0, 0, -1) },
    uStorm: { value: 0 },
    uSpeed: { value: 0 },
    uWarm: { value: 0 },
    uFreeze: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uSize, uPx, uStorm, uSpeed, uFreeze;
      uniform vec3 uCam, uRayO, uRayD;
      attribute float aRnd;
      varying float vA; varying float vR;
      void main(){
        float t = uTime * (1.0 - uFreeze);
        vec3 drift = vec3(sin(t*0.07 + aRnd*40.0), sin(t*0.05 + aRnd*17.0)*0.6 + 0.25, cos(t*0.06 + aRnd*23.0)) * (6.0 + aRnd*10.0);
        drift.y -= uStorm * t * 6.0 * (0.5 + aRnd);
        vec3 p = position + drift;
        p = mod(p - uCam + uSize*0.5, uSize) - uSize*0.5 + uCam;
        // lean toward the cursor ray
        vec3 toP = p - uRayO; float along = dot(toP, uRayD);
        vec3 closest = uRayO + uRayD * max(along, 0.0);
        vec3 off = closest - p; float d = length(off);
        float pull = exp(-d*d/180.0) * step(0.0, along);
        p += off * pull * 0.35 * (1.0 - uFreeze);
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = -mv.z;
        float edge = 1.0 - smoothstep(uSize*0.32, uSize*0.5, length(p - uCam));
        vA = edge * smoothstep(0.5, 4.0, dist) * (0.35 + 0.65*aRnd) * (1.0 + pull*2.0);
        vR = aRnd;
        gl_PointSize = clamp((1.2 + aRnd*2.2) * uPx * 120.0 / dist * (1.0 + uSpeed*0.6), 0.6, 9.0 * uPx);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAlpha, uWarm;
      varying float vA; varying float vR;
      void main(){
        vec2 c = gl_PointCoord - 0.5; float d = length(c);
        float a = smoothstep(0.5, 0.0, d); a *= a;
        vec3 gold = mix(vec3(0.79,0.66,0.42), vec3(0.95,0.84,0.62), vR);
        gold = mix(gold, vec3(1.0,0.72,0.5), uWarm);
        gl_FragColor = vec4(gold * a * vA * uAlpha * 1.6, 1.0);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 5;
  return { points, uniforms };
}
