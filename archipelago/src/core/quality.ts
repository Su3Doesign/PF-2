export type Tier = 1 | 2 | 3;

export interface Quality {
  tier: Tier;
  dpr: number;
  clouds: number;
  motes: number;
  falls: number;   // particles per ordinary light-fall
  heroFall: number;
  detail: number;  // island tessellation multiplier
  bloom: boolean;
  mobile: boolean;
}

/**
 * Picks a tier from the GPU string and the device, overridable with ?q=1|2|3.
 * T3: discrete or Apple Pro/Max GPUs. T2: laptops and integrated GPUs. T1: phones.
 */
export function detectQuality(gl?: WebGL2RenderingContext | null): Quality {
  const params = new URLSearchParams(location.search);
  const mobile = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
  let tier: Tier = mobile ? 1 : 2;
  try {
    if (gl && !mobile) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      if (/RTX|GTX 1[0-9]{3}|RX [5-9][0-9]{3}|Radeon Pro|Apple M[1-9] (Pro|Max|Ultra)|Apple M[3-9]/i.test(r)) tier = 3;
      if (/SwiftShader|llvmpipe|Software/i.test(r)) tier = 1;
    }
  } catch { /* keep default */ }
  const q = Number(params.get('q'));
  if (q === 1 || q === 2 || q === 3) tier = q;
  const dprMax = tier === 3 ? 2 : tier === 2 ? 1.5 : 1.25;
  return {
    tier,
    dpr: Math.min(window.devicePixelRatio || 1, dprMax),
    clouds: tier === 3 ? 8 : tier === 2 ? 6 : 4,
    motes: tier === 3 ? 26000 : tier === 2 ? 14000 : 6000,
    falls: tier === 3 ? 4500 : tier === 2 ? 2600 : 1100,
    heroFall: tier === 3 ? 60000 : tier === 2 ? 30000 : 12000,
    detail: tier === 3 ? 1.3 : tier === 2 ? 1 : 0.7,
    bloom: true,
    mobile,
  };
}
