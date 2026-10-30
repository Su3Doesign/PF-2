# Sumanth: Front Doors

The portfolio of **Amidyala Sai Sumanth**, 3D environment artist and web designer in Hyderabad. It collects the
**thirteen finished websites** from the Su3Doesign repositories, and each one is the front door to a world built first.

One obsidian door, rendered live with three.js, travels down the page. You can turn it all the way round by
dragging. Its UV light starts violet and ends at dawn as you scroll, and it shows whichever world the page
is talking about.

```bash
npm install
npm run dev        # fetches the fonts, then http://localhost:5173
npm run build      # fetches the fonts, type-checks, builds into dist/
npm run preview    # serve dist/
```

Needs Node 20.19 or newer (22 in CI). Behind an HTTPS proxy, run with `NODE_USE_ENV_PROXY=1` so the font fetch
uses it.

## Type

| Role | Face | Source |
|------|------|--------|
| Display: the giant kinetic words, headings, numbers | **Clash Display** (variable, 200–700) | Fontshare |
| Text and UI | **Satoshi** (variable, 300–900) | Fontshare |
| Small labels | **Geist Mono** | npm (`@fontsource-variable/geist-mono`) |

Clash Display's weight axis drives the kinetic type. The giant **SUMANTH** in the footer thins to a hairline
wherever the cursor passes. Hollow headings use Clash Display's static 600 cut, because the variable font's
overlapping contours would show through a text stroke.

**Licensing.** Clash Display and Satoshi are under the ITF Free Font License, which allows self-hosting on your
own site but not redistributing the font files. So `tools/fonts.mjs` fetches them from Fontshare into
`public/fonts/` before every dev run and build, `.gitignore` keeps them out of the repository, and the deployed
site serves its own copies. No runtime CDN is involved. CI fails the build if the fetch fails, so a deploy never ships
without its fonts.

## What is on the page

| Section | What it does | Built with |
|---------|--------------|------------|
| Menu | Full-screen: sections in giant type, all 13 sites with their picture opening on hover | GSAP |
| Loader | A giant counter to 100 against real loading while an arch draws itself; then the screen splits down the middle and opens like a pair of doors | GSAP, ScrambleText |
| Hero | **FRONT** and **DOORS** fill the screen with the 3D door standing *between* the words (they sit under the canvas). Scrolling slides the words apart like doors while the door comes forward | GSAP ScrollTrigger, SplitText, three.js |
| Tapes | Two marquee tapes cross the page; they speed up with the scroll and reverse with it | GSAP ticker |
| The idea | One big sentence with a window onto each world set into the line; it lights up word by word | ScrollTrigger scrub |
| Method | **The door pins** on the left while five rules scroll on the right. Each rule swaps the world in the door and tints its light | ScrollTrigger `pin` |
| Worlds | Four flagship sites. **Each image opens** from a small card to full-bleed, and the title lines slide apart | ScrollTrigger scrub, `clip-path` |
| Shelf | All 13 sites on an **infinite horizontal rail** with filters and parallax inside each card, or as an **index** of big rows that fill with the project's colour while its picture follows the cursor | CSS scroll-snap, GSAP `quickTo` |
| Ask | A minimal chat panel that answers from the case studies | React |
| Contact | The door comes back, lit at dawn, above a giant **SUMANTH** that reacts to the cursor | three.js, Clash Display's weight axis |
| Case studies | `#/work/<slug>`: premise, idea, what was built, the hard part, the outcome, a gallery, next door | React, ScrollTrigger |

Lenis smooths the scroll. Throughout: link text **rolls** to a fresh copy on hover, buttons are **magnetic**,
headings rise **letter by letter** (GSAP SplitText, with the original text kept for screen readers), images and
titles **lean with scroll speed**, and a custom cursor (a dot with a slow ring) labels what you’re over: *Drag*,
*Open*, *Read*, *Visit*. The interaction pieces live in `src/components/kit/`.

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
    Loader, Cursor, Nav, Menu, Hero, Bands, Manifesto, Process, Worlds, Shelf, CaseStudy, Ask, Contact
    kit/                  Roll (hover text), Magnetic, Marquee, ProximityWord
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
  fonts.mjs               fetch Clash Display + Satoshi from Fontshare into public/fonts/ (git-ignored)
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
