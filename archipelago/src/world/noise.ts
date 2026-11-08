import * as THREE from 'three';

/**
 * One tiling noise texture replaces procedural noise in every shader: the four channels
 * hold four octaves (periods 4, 8, 16, 32 cells across), so a single fetch gives fbm.
 * Built once at boot in ~15 ms; sampling it costs a fraction of the simplex noise it replaces.
 */
export function makeNoiseTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  const seedGrid = (period: number, seed: number) => {
    const g = new Float32Array(period * period * 2);
    let s = seed;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < period * period; i++) { const a = rnd() * Math.PI * 2; g[i * 2] = Math.cos(a); g[i * 2 + 1] = Math.sin(a); }
    return g;
  };
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const octave = (period: number, seed: number, out: Float32Array) => {
    const g = seedGrid(period, seed);
    const dot = (ix: number, iy: number, fx: number, fy: number) => { const k = ((iy % period) * period + (ix % period)) * 2; return g[k] * fx + g[k + 1] * fy; };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const px = (x / size) * period, py = (y / size) * period;
      const ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy;
      const u = fade(fx), v = fade(fy);
      const a = dot(ix, iy, fx, fy), b = dot(ix + 1, iy, fx - 1, fy), c = dot(ix, iy + 1, fx, fy - 1), d = dot(ix + 1, iy + 1, fx - 1, fy - 1);
      out[y * size + x] = (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
    }
  };
  const tmp = new Float32Array(size * size);
  [4, 8, 16, 32].forEach((p, ch) => {
    octave(p, 1234 + ch * 977, tmp);
    for (let i = 0; i < size * size; i++) data[i * 4 + ch] = Math.max(0, Math.min(255, Math.round((tmp[i] * 0.72 + 0.5) * 255)));
  });
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** GLSL helpers over the noise texture. tn() is fbm in 0..1; tri() samples it triplanar. */
export const TEXNOISE = /* glsl */ `
uniform sampler2D tNoise;
float tn(vec2 p){ return dot(texture2D(tNoise, p), vec4(0.5333, 0.2667, 0.1333, 0.0667)); }
float tnLo(vec2 p){ return dot(texture2D(tNoise, p).rg, vec2(0.667, 0.333)); }
float tri(vec3 p, vec3 n){ vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z + 1e-5); return tn(p.yz) * w.x + tn(p.xz) * w.y + tn(p.xy) * w.z; }
float triLo(vec3 p, vec3 n){ vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z + 1e-5); return tnLo(p.yz) * w.x + tnLo(p.xz) * w.y + tnLo(p.xy) * w.z; }
`;
