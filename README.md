# thesumanth.com

Portfolio for **Amidyala Sai Sumanth**, 3D environment artist & visual designer.
Four pages, one canvas, no build step, no backend.

```bash
python3 -m http.server 8080      # → http://localhost:8080
```

Do not open `index.html` by double-clicking — `file://` blocks WebGL texture
loading and you will see the fallback instead of the site.

---

## Structure

```
index.html            home
roman-no-yoake.html   world 01
fudo-myo-o.html       world 02
koi-pond.html         world 03
data.js               all copy and file lists — the only file you edit
gl.js                 the WebGL engine
app.js                router, page builders, overlays, motion
styles.css            design tokens and components
tools/pages.py        regenerates the four page shells
tools/optimize.py     processes new artwork
```

Pages are thin shells. `<main>` is rendered from `data.js`, which is what
lets the router move between worlds without a reload — the canvas keeps
running and the two hero plates dissolve into each other.

---

## What is in the engine

**DOM-synced planes.** Any element carrying `data-gl` is drawn as a 28×20
subdivided plane locked to that element's rect every frame. Scroll velocity
curls it, the cursor dents it, chromatic split scales with speed, and it
resolves in scanline-ordered render buckets.

**The glass artifact.** An icosahedron displaced by 3D simplex noise, with
finite-difference normals so it lights correctly on the deformed surface. It
really refracts: the scene renders to an offscreen target, then the glass
samples it three times at different offsets for per-channel dispersion.

**The archive.** An infinite draggable mosaic. Twenty-four tiles ride a
wrapping lattice; each time a tile crosses into a new lattice cell it hashes
its coordinates to a different one of the 164 pieces and swaps texture. So it
never repeats a screen and never ends. Throw it, filter it by client, click
anything to open it full size. Press **A** from anywhere.

**Page transitions.** Navigating between worlds runs a slice dissolve in
GLSL — 22 horizontal bands, each starting at its own time, with a liquid
displacement at the midpoint and a bright seam on the moving edge. The DOM
swaps under it at 50%.

**The key light.** Bottom-left, draggable. It is not decoration: it drives
the specular direction on the glass, the rake across every plate, the colour
temperature readout, and the site's accent colour, which is recomputed live.

**Post.** Bloom, then barrel distortion, pointer ripple, velocity-driven
chromatic aberration, grain and vignette.

Every shader is compiled with `glslangValidator` before shipping, and the
whole engine is executed against real three.js r147 with a stubbed GPU to
catch runtime errors.

Hidden: press **W** for wireframe view of everything the GPU is drawing.

---

## Editing

`data.js` holds it all.

- `WORLDS` — each world's plate, copy, stats, and `chapters` (a kicker, a
  heading, a paragraph, and its media). Add a chapter and the page grows.
- `CLIENTS` — name, group, role, file list. Add a client and it appears in
  the archive and its filter chip.
- `STUDIES` — the graphics and product work.
- `MOSAIC` is assembled from those two automatically.

Adding a world means adding an entry to `WORLDS` and a line in `tools/pages.py`,
then re-running it.

New artwork:

```bash
python3 tools/optimize.py ~/Desktop/new-renders
```

---

## About protecting the images

Be clear-eyed: anything a browser displays has already been downloaded to the
viewer's machine. No script can change that, and any site claiming otherwise
is selling comfort. Blocking right-click stops a casual save and nothing more
— the file is still in the network panel.

What this build actually does:

1. **The hero, every world plate and the entire archive are drawn in WebGL.**
   There is no `<img>` element to right-click, no source path in the element
   inspector, and dragging the canvas gives you nothing.
2. **Right-click and drag-out are disabled**, with a note pointing at your
   email instead of a dead end.
3. **Only web-resolution files exist on the server** — 2000px renders, 1400px
   social crops, 1280px video. The 4K originals are not deployed and should
   stay on your drive.

If you want more than that, the real answers are outside the browser: embed
your name in the EXIF/XMP copyright fields of everything you publish, and
register the work you care about. A visible watermark is the only genuinely
effective deterrent, and it costs you the image.

---

## Failure behaviour

Nothing is animation-gated. No WebGL or a failed CDN and `data-gl` elements
show their `<img>`; the site reads normally. No GSAP and everything is still
visible and scrollable. `prefers-reduced-motion` disables smooth scroll,
bucket reveals, the pinned rail, dissolves and scramble text.

## Performance

First view is roughly 2–3 MB. Images lazy-load 700px ahead, videos are
`preload="none"` behind poster frames, the 3 MB chest model waits until the
footer is near, DPR is capped at 1.75, the refraction target renders at 60%
scale, and the texture cache holds 70 entries with in-use tiles pinned.
