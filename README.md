# thesumanth.com — BEAUTY PASS

Portfolio for **Amidyala Sai Sumanth**, 3D environment artist & visual designer.
Static site: no build step, no backend, no database.

---

## Deploy

Upload the whole folder, or push it to a GitHub Pages repo. `CNAME` is already
set to `www.thesumanth.com` — point your DNS at Pages and it picks it up.

Preview locally (do not double-click `index.html` — `file://` blocks WebGL
texture loading):

```bash
python3 -m http.server 8080     # → http://localhost:8080
```

---

## The idea

The site behaves like a render, because that is the vocabulary of the work.
The ground is 18% middle grey — the value on a lighting reference ball — not
the usual portfolio black.

**The pass switcher** (bottom left, or keys `1`–`4`) re-renders the whole
document live, DOM and WebGL together:

| Pass | What it does |
|------|--------------|
| Beauty | the finished frame |
| Clay | colour stripped, everything shaded grey |
| Wire | the site exposed as its own bounding boxes, every block labelled |
| Z-Depth | near is bright, far falls into fog, keyed to scroll position |

---

## The WebGL layer (`gl.js`)

One fixed canvas sits behind the entire document at `z-index: 0`; content
renders above it at `z-index: 2` with transparent section backgrounds.

- **DOM-synced planes.** Every element carrying `data-gl` is drawn as a
  28×20 subdivided plane locked to that element's `getBoundingClientRect()`
  every frame. Scroll velocity curls it, the pointer dents it, chromatic
  split scales with speed, and it resolves in scanline-ordered buckets with
  sampling noise. Nine of these: hero, grey-ball figure, three world plates,
  four study cells.
- **The glass artifact.** An icosahedron displaced by 3D simplex noise in the
  vertex shader, with finite-difference normals so lighting stays correct on
  the deformed surface. It really refracts: the scene renders to an offscreen
  target first, then the glass samples it three times at different offsets for
  per-channel dispersion, plus fresnel and a hard specular.
- **Post.** EffectComposer → UnrealBloom → a custom pass doing barrel
  distortion, pointer ripple, velocity-driven aberration, grain and vignette.
- **The closer.** `treasure-chest.glb` and `strawhat.glb` lit and rotating in
  the contact section. The models only download when that section is within
  900px of the viewport.

Every shader was compiled with `glslangValidator` before shipping, and the
render loop was executed against the real three.js r147 build with a stubbed
GPU to catch runtime errors.

---

## Files

```
index.html      structure and copy
styles.css      design tokens + every component
app.js          data, DOM construction, motion, overlays
gl.js           the WebGL layer
assets/images   web-sized WebP (2000px renders, 1400px social)
assets/videos   H.264, max 1280px, silent loops
assets/posters  first-frame stills so videos never load until played
assets/models   treasure chest + straw hat
tools/          optimize.py — run it on any new artwork
```

### Editing content

Everything lives in the `DATA` block at the top of `app.js`:

- `WORLDS` — the three case studies (plate, shot list, note, tags)
- `STEPS` — the seven-move method rail
- `CLIENTS` — name, group, role, file list. Add one and it appears in the solo
  list and on the wall automatically.
- `STUDIES` — the graphics bento. `span` sets grid width, `ratio` sets frame
  shape, `gl: true` promotes a cell to a WebGL plane.

### Adding new work

```bash
python3 tools/optimize.py ~/Desktop/new-renders
```

Then add the filename to the right array. That is the whole job.

---

## Failure behaviour

Nothing here is animation-gated. If WebGL is unavailable or the Three.js CDN
fails, `data-gl` elements simply show their `<img>` and the site reads
normally. If GSAP fails, everything is still visible and scrollable. If a
texture 404s, that element falls back to its DOM image.
`prefers-reduced-motion` disables smooth scroll, bucket reveals, the pinned
rail, scramble text and the hero sequence.

---

## Performance

- First view is roughly 2–3 MB. Images lazy-load 700px ahead; videos are
  `preload="none"` behind poster frames and pause when they leave the screen.
- Device pixel ratio is capped at 1.75; the refraction target renders at 60%
  scale; the glass drops to a lower subdivision on small screens.
- Originals were 41 MB of images and 60 MB of video (a duplicated folder).
  Now 15.5 MB and 20 MB.

## On protecting the work

Anything a browser displays has already been downloaded, so no script can
truly stop copying. What actually helps is done: only web-resolution copies
are on the server. Keep the 4K originals offline and put your name in the
EXIF/XMP copyright fields of anything you publish.
