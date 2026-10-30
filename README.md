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

Each piece of work appears in one place only.

| # | Section | What it shows | How |
|---|---------|---------------|-----|
| — | Loader | A giant counter while an arch draws itself | The screen splits open like a pair of doors |
| 01 | Hero | **FRONT / DOORS**, with the 3D door between the words showing the worlds; **Résumé** button | SplitText, three.js |
| — | Tapes | Brand systems, 3D, campaigns, websites; the tools | Marquees that follow scroll speed and direction |
| 02 | Who’s building | The line, the résumé statement, tools, the desk on loop, the path so far, numbers | Word-by-word light-up with image pills |
| 03 | Worlds | Rōman no Yoake, Fudō Myō-ō, Koi Pond, each in its own colour, hour and kanji | Card-to-full-bleed expansion, then a film strip of renders and turntables |
| 04 | Method | The seven moves, Reference → Comp | The door pins and shows the study where each move is easiest to see |
| 05 | Clients | 16 clients, 129 pieces including 21 films | Bento wall; tiles flip through the work on hover; full gallery in the lightbox |
| 06 | Library | 39 studies | An endless canvas you throw in any direction |
| 07 | Websites | 12 finished sites | Scroll-snap rail or index list; story-shaped case studies at `#/work/<slug>` |
| 08 | Commissions | “I’d like ___ for ___.”: a single frame, a whole world, the full pipeline, a brand and a website | Tap a blank to change it; what arrives, the usual timeline and an example follow; the sentence is sent as an email |
| 09 | Ask | A chat panel that answers from all of the above | |
| 10 | Contact | Email, **Résumé**, links; the door again at dawn; a giant SUMANTH that thins under the cursor | |

The résumé is `public/resume/Sumanth-Resume-2026.pdf`. Every Résumé button links to it: the nav, the hero, the
about section, the menu and the footer.

### The door

`src/components/portal/PortalScene.ts`

- **360° with no plugin.** Dragging sets a target angle, releasing throws it with inertia, and arrow keys turn it
  too. At rest it lingers while it faces you (either side shows the work) and swings quickly through the
  edge-on angles. In idle mode it swaps to the next world while edge-on, so every turn reveals a new one.
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
  data/projects.ts        the twelve websites, plus the profile (email, links, résumé)
  data/work.ts            the 3D and visual-design work, with each world's colour and hour and the door's reel
  data/pf1.json           imported from PF-1 by tools/import-pf1.mjs
  lib/
    motion.ts             GSAP + ScrollTrigger + Lenis, scroll state for WebGL, the UV-to-dawn accent
    useHashRoute.ts       #/work/<slug> routing for GitHub Pages
    ask.ts                local answers, optional model endpoint
  components/
    Loader, Cursor, Nav, Menu, Hero, Bands, Manifesto (about), Worlds, Process (method), Clients, Library,
    Shelf (websites), Commissions, CaseStudy, Lightbox, Ask, Contact
    kit/                  Roll (hover text), Magnetic, Marquee, ProximityWord, InViewVideo
    portal/               PortalScene (three.js), PortalCanvas, PortalAnchor, bus
public/
  work/<slug>/*.webp      covers and gallery images
  v1/                     the first thesumanth.com, still running; v1/assets is also the media library
                          (renders, client work, studies, films, posters, 640px thumbnails)
  resume/                 the 2026 résumé (PDF)
docs/
  LANDING.md              sections and a headline bank
  CASE-STUDY.md           the story of this site
  UX-AUDIT.md             top five UX issues across the live sites, with quick fixes
  CHAT-UI.md              the chat panel’s design and its endpoint contract
tools/
  fonts.mjs               fetch Clash Display + Satoshi from Fontshare into public/fonts/ (git-ignored)
  import-pf1.mjs          import worlds, method, clients, studies, tiers and profile from PF-1
  capture.mjs             screenshot a site into public/work/<slug>/
  v1/                     the first version’s page and image scripts
```

## Adding a site

1. Put images in `public/work/<slug>/`. `cover.webp` (16:9, about 1600–1920 px wide) is required; gallery images
   are optional. `node tools/capture.mjs <slug> <url>` will take the screenshots for you.
2. Add an entry to `projects` in `src/data/projects.ts`. Set `tone` to the project's colour; `featured: true` puts
   it first in the rail.

The rail, the index, the counters, the chat answers and the case study all update from that one entry.

## Adding 3D and visual-design work

The worlds, method, clients, studies and the 3D commissions come from the PF-1 portfolio, so the two never drift
apart:

1. Copy any new files from PF-1's `public/assets/` (images, videos, posters, `thumbs/640`) into
   `public/v1/assets/`.
2. Run `node tools/import-pf1.mjs ../PF-1/src/data/content.json`. It rewrites the paths, checks that every file
   exists, and writes `src/data/pf1.json`.

Each world's colour and hour, and the study the door shows at each step of the method, are set in
`src/data/work.ts`.

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
