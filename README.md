# Sumanth: Front Doors

The portfolio of **Amidyala Sai Sumanth**, 3D environment artist and web designer in Hyderabad. It collects the
**thirteen finished websites** from the Su3Doesign repositories, and each one is the front door to a world built first.

One obsidian door, rendered live with three.js, travels down the page. You can turn it all the way round by
dragging. Its UV light starts violet and ends at dawn as you scroll, and it shows whichever world the page
is talking about.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/
```

Needs Node 20.19 or newer (22 in CI).

## What is on the page

| Section | What it does | Built with |
|---------|--------------|------------|
| Loader | Counts to 100 against the fonts and the first door image, then lifts like a shutter | GSAP |
| Hero | Fullscreen. Three layers (the word “Doors”, the 3D door, the headline) drift at different speeds | GSAP ScrollTrigger, three.js |
| The idea | The paragraph lights up word by word as you scroll; counters | ScrollTrigger scrub |
| Method | **The door pins** on the left while five rules scroll on the right. Each rule swaps the world in the door and tints its light | ScrollTrigger `pin` |
| Worlds | Four flagship sites. **Each image opens** from a small card to full-bleed, and the title lines slide apart | ScrollTrigger scrub, `clip-path` |
| Shelf | All 13 sites on an **infinite horizontal rail** with filters and parallax inside each card | CSS scroll-snap |
| Ask | A minimal chat panel that answers from the case studies | React |
| Contact | The door comes back, lit at dawn | three.js |
| Case studies | `#/work/<slug>`: premise, idea, what was built, the hard part, the outcome, a gallery, next door | React, ScrollTrigger |

Lenis smooths the scroll. A custom cursor (a dot with a slow ring) labels what you’re over: *Drag*, *Open*,
*Read*, *Visit*.

### The door

`src/components/portal/PortalScene.ts`

- **360° with no plugin.** Dragging sets a target angle, releasing throws it with inertia, and at rest it drifts
  slowly. Arrow keys turn it too. There are no OrbitControls: it is about forty lines of pointer maths.
- **A point light that follows the scroll.** Its colour follows the page from UV violet to dawn amber, leans
  toward the pinned project’s tone in the method section, and brightens with scroll speed. At the top of the page it
  waits behind the door, and the first scroll brings it through the opening.
- **One canvas, many places.** Elements marked as anchors (`PortalAnchor`) register in a small bus. Each frame
  the scene finds the anchor most on screen, then moves and scales the door into it. Pinning the method stage
  pins the door with it, and the hero, method and contact share one WebGL context.
- **A world behind the opening.** The screen inside the arch is a shader with a cover-fit, a rising wipe
  between projects, and a parallax shift as the door turns, so the image reads as a place behind the door, not a
  picture on it.
- three.js loads in its own chunk after first paint. Without WebGL2 each anchor shows a still image in an arch.

## Structure

```
index.html
src/
  main.tsx, App.tsx       fonts, providers, section order, routes
  index.css               Tailwind v4 theme tokens, grain, utilities
  data/projects.ts        every site: copy, facts, story, images, links (the only file to edit for content)
  lib/
    motion.ts             GSAP + ScrollTrigger + Lenis, scroll state for WebGL, the UV-to-dawn accent
    useHashRoute.ts       #/work/<slug> routing for GitHub Pages
    ask.ts                local answers, optional model endpoint
  components/
    Loader, Cursor, Nav, Hero, Manifesto, Process, Worlds, Shelf, CaseStudy, Ask, Contact
    portal/               PortalScene (three.js), PortalCanvas, PortalAnchor, bus
public/
  work/<slug>/*.webp      covers and gallery images
  v1/                     the first thesumanth.com, still running
docs/
  LANDING.md              sections and a headline bank
  CASE-STUDY.md           the story of this site
  UX-AUDIT.md             top five UX issues across the live sites, with quick fixes
  CHAT-UI.md              the chat panel’s design and its endpoint contract
tools/
  capture.mjs             screenshot a site into public/work/<slug>/
  v1/                     the first version’s page and image scripts
```

## Adding a site

1. Put images in `public/work/<slug>/`. `cover.webp` (16:9, about 1600–1920 px wide) is required; gallery images
   are optional. `node tools/capture.mjs <slug> <url>` will take the screenshots for you.
2. Add an entry to `projects` in `src/data/projects.ts`. Set `featured: true` to give it a full-screen chapter in
   Worlds; set `tone` to the colour the door’s light should lean toward.

The shelf, the counters, the chat answers and the case study all update from that one entry.

## Which repositories made the cut

All 29 repositories were cloned and every website among them was rendered and read. Thirteen are finished
and on the shelf. The rest, and the reason for each, are listed in [`docs/LANDING.md`](docs/LANDING.md#what-was-left-off-and-why).

## Accessibility and fallbacks

- `prefers-reduced-motion`: native scroll, no scrubbing or pinning tricks, no idle spin, static states shown.
- The door is a focusable group with a live label; arrow keys turn it.
- Case studies are modal dialogs with focus moved in, trapped, and handed back; <kbd>Esc</kbd> closes them.
- The shelf is a native scroller (keyboard, touch and trackpad), and its clones are hidden from assistive tech.
- No WebGL2: still images in arches. No JavaScript: a pointer to `/v1/`.
- Text never relies on an animation finishing to be visible under reduced motion.

## Deploy

`.github/workflows/deploy.yml` builds and publishes `dist/` to GitHub Pages on every push to `main`;
`ci.yml` builds every pull request. One-time setup: **Settings → Pages → Source: GitHub Actions**.

`public/CNAME` still says `www.thesumanth.com`, as before. If that domain is meant to keep serving the forest
(`PF-1`), remove the file here and use the Pages URL, or give this site its own subdomain. The build uses relative
paths, so it works at `su3doesign.github.io/PF-2/` too.

The first version of this repository now lives at `/v1/`, unchanged apart from its canonical URLs.
