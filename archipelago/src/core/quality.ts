export type Tier = 1 | 2 | 3;

export interface Quality {
  tier: Tier;
  dpr: number;
  clouds: number;
  motes: number;
  falls: number;   // particles per ordinary light-fall
  heroFall: number;
  detail: number;  // island tessellation multiplier
  lights: number;  // real point lights in the pool
  fancyPost: boolean; // chromatic aberration and SMAA
  mobile: boolean;
  tablet: boolean;
}

/**
 * Picks a tier from the GPU string and the device, overridable with ?q=1|2|3.
 * T3: discrete or Apple Pro/Max GPUs on desktop. T2: laptops, integrated GPUs, tablets.
 * T1: phones and software renderers. Touch screens render at a lower pixel ratio:
 * the retina panels of tablets cost four times the pixels for little visible gain here.
 */
export function detectQuality(gl?: WebGL2RenderingContext | null): Quality {
  const params = new URLSearchParams(location.search);
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(screen.width, screen.height) < 820;
  const mobile = coarse && small;
  const tablet = coarse && !small;
  let tier: Tier = mobile ? 1 : 2;
  try {
    if (gl && !coarse) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      if (/RTX|GTX 1[0-9]{3}|RX [5-9][0-9]{3}|Radeon Pro|Apple M[1-9] (Pro|Max|Ultra)|Apple M[3-9]/i.test(r)) tier = 3;
      if (/SwiftShader|llvmpipe|Software/i.test(r)) tier = 1;
    }
  } catch { /* keep default */ }
  const q = Number(params.get('q'));
  if (q === 1 || q === 2 || q === 3) tier = q;
  const dprMax = coarse ? (tablet ? 1.1 : 1.25) : tier === 3 ? 1.75 : tier === 2 ? 1.25 : 1;
  return {
    tier,
    dpr: Math.min(window.devicePixelRatio || 1, dprMax),
    clouds: tier === 3 ? 5 : tier === 2 ? 4 : 3,
    motes: tier === 3 ? 16000 : tier === 2 ? 9000 : 4500,
    falls: tier === 3 ? 3000 : tier === 2 ? 1800 : 900,
    heroFall: tier === 3 ? 30000 : tier === 2 ? 16000 : 8000,
    detail: tier === 3 ? 1.1 : tier === 2 ? 0.9 : 0.65,
    lights: tier === 3 ? 8 : 6,
    fancyPost: tier === 3,
    mobile,
    tablet,
  };
}
