import * as THREE from 'three';
import { TEXNOISE, makeNoiseTexture } from './noise';

/** Uniforms every world material shares, so one write moves the whole archipelago. */
export const G = {
  uTime: { value: 0 },
  uChart: { value: 0 },   // 0 = world, 1 = the gold-line chart (the Map beat)
  uTod: { value: 0 },
  uWire: { value: 0 },    // Konami: viewport shading, wireframe
  uDim: { value: 0 },     // overlays open: the world dims
  tNoise: { value: makeNoiseTexture() as THREE.Texture },
};

export interface PatchOpts {
  bump?: number;          // derivative bump strength from world-space noise
  bumpScale?: number;     // noise frequency
  tint?: number;          // albedo variation from noise
  contour?: number;       // contour line spacing in metres for the chart (0 = none)
  chartGlow?: number;     // how strongly this surface glows in chart mode
}

/**
 * Patches a MeshStandard/PhysicalMaterial with: world-space noise bump (rock and concrete
 * read as rough without textures), albedo variation, and the chart mode (ink surfaces with
 * gold iso-height contour lines). Every world surface goes through here.
 */
/** Set once at start-up: on phones and tablets surfaces keep their tint but skip the fine bump. */
export const PATCH = { lite: false };
export function patchMaterial<T extends THREE.MeshStandardMaterial>(mat: T, o: PatchOpts = {}): T {
  // bump strength is normalised by frequency, so a fine noise never tilts normals steeper than a coarse one
  const bs = o.bumpScale ?? 0.6, bump0 = (o.bump ?? 0) * Math.min(1, 0.22 / bs), tint = (o.tint ?? 0) * 0.75, contour = o.contour ?? 6, glow = o.chartGlow ?? 1;
  mat.onBeforeCompile = (shader) => {
    const bump = PATCH.lite ? 0 : bump0, lite = PATCH.lite;
    shader.uniforms.uChart = G.uChart;
    shader.uniforms.uTime = G.uTime;
    shader.uniforms.uDim = G.uDim;
    shader.uniforms.tNoise = G.tNoise;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNorm;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWNorm = normalize(mat3(modelMatrix) * objectNormal);');
    // worldpos_vertex only computes worldPosition under some defines; vWPos uses modelMatrix directly.
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; varying vec3 vWNorm;
        uniform float uChart; uniform float uTime; uniform float uDim;
        ${bump > 0 || tint > 0 ? TEXNOISE : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        ${tint > 0 ? `{ vec3 wn = normalize(vWNorm);
          float t1 = triLo(vWPos * ${(bs * 0.03).toFixed(4)}, wn);
          float t2 = ${lite ? '0.5' : `tri(vWPos * ${(bs * 0.25).toFixed(4)}, wn)`};
          diffuseColor.rgb *= mix(1.0 - ${tint.toFixed(3)}, 1.0 + ${(tint * 0.6).toFixed(3)}, t1) * (1.0 + (t2 - 0.5) * ${(tint * 0.5).toFixed(3)}); }` : ''}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        ${bump > 0 ? `{ float hgt = tri(vWPos * ${(bs * 0.12).toFixed(4)}, normalize(vWNorm));
          vec3 dpx = dFdx(vViewPosition), dpy = dFdy(vViewPosition);
          float dhx = dFdx(hgt), dhy = dFdy(hgt);
          vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
          float det = dot(dpx, r1);
          vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
          float upK = mix(1.0, 0.3, smoothstep(0.55, 0.92, normalize(vWNorm).y));
          vec3 nn = abs(det) * normal - grad * ${bump.toFixed(3)} * upK;
          if (abs(det) > 1e-10 && dot(nn, nn) > 1e-20) normal = normalize(nn); }` : ''}`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        if (uChart > 0.001) {
          vec3 ink = vec3(0.020, 0.026, 0.055);
          float y = vWPos.y;
          float sp = ${contour.toFixed(2)};
          float l = abs(fract(y / sp) - 0.5);
          float w = fwidth(y / sp) * 1.2;
          float line = 1.0 - smoothstep(0.0, w, 0.5 - l);
          float major = 1.0 - smoothstep(0.0, w * 1.4, 0.5 - abs(fract(y / (sp * 5.0)) - 0.5));
          float rim = pow(clamp(1.0 - abs(dot(normalize(vWNorm + vec3(0.0,1e-5,0.0)), vec3(0.0,1.0,0.0))), 0.0, 1.0), 2.0);
          vec3 gold = vec3(0.79, 0.66, 0.42);
          vec3 chart = ink + gold * (line * 0.55 + major * 0.9 + rim * 0.08) * ${glow.toFixed(2)};
          gl_FragColor.rgb = mix(gl_FragColor.rgb, chart, uChart);
        }
        gl_FragColor.rgb *= 1.0 - uDim * 0.7;`);
  };
  mat.customProgramCacheKey = () => `p${bump0}_${bs}_${tint}_${contour}_${glow}_${PATCH.lite ? 1 : 0}`;
  return mat;
}

/** Seeded random. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return (s >>> 0) / 4294967296; };
}

/** Value noise in JS for geometry (deterministic, cheap). */
export function makeNoise3(seed: number) {
  const r = rng(seed); const perm = new Uint8Array(512); const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h: number, x: number, y: number, z: number) => {
    const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  };
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);
  const noise = (x: number, y: number, z: number) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z, B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(lerp(lerp(grad(perm[AA] & 15, x, y, z), grad(perm[BA] & 15, x - 1, y, z), u),
      lerp(grad(perm[AB] & 15, x, y - 1, z), grad(perm[BB] & 15, x - 1, y - 1, z), u), v),
      lerp(lerp(grad(perm[AA + 1] & 15, x, y, z - 1), grad(perm[BA + 1] & 15, x - 1, y, z - 1), u),
        lerp(grad(perm[AB + 1] & 15, x, y - 1, z - 1), grad(perm[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
  };
  const fbm = (x: number, y: number, z: number, oct = 4) => { let a = 0.5, s = 0; for (let i = 0; i < oct; i++) { s += a * noise(x, y, z); x *= 2.03; y *= 2.03; z *= 2.03; a *= 0.5; } return s; };
  return { noise, fbm };
}
