# UX audit: the top five issues across the live sites

Each site was served locally and walked in headless Chromium at 1440 × 900, with screenshots at
three scroll depths. The source was also searched for the patterns below. These are the five
issues that cost visitors the most, ordered by impact, each with a fix that takes under an hour.

---

## 1. Hot-linked stock photos break three sites

**Where:** VOLTA (26 Unsplash URLs), VESPERA (19), AEVUM (2).

**What happens:** every product, lookbook and campaign image loads from `images.unsplash.com`. When
that host is slow, rate-limited or blocked on a corporate network, the page shows broken-image icons
and alt text ("Editorial look", "Coat detail") in the hero. VESPERA’s collections rail and product grid
turn into empty black boxes.

**Quick fix:** download the images you use, export them as WebP at two widths, and serve them from the
repository with `width`/`height` set and a background colour on the frame. That also removes a
third-party dependency, and a licence question, from a portfolio piece.

## 2. A gate before the work

**Where:** thesumanth.com (the forest). After loading, the page holds on “Enter with sound / Enter
quietly” and shows nothing of the portfolio until one is clicked.

**What happens:** a recruiter who opens the link in a background tab comes back to a loader and a
choice instead of the work. Every gate costs some visitors.

**Quick fix:** enter quietly on its own once loading finishes, and keep the sound toggle in the top bar,
which already exists. Keep the choice only when sound was turned on last time.

## 3. Libraries from public CDNs

**Where:** thesumanth v1 (52 CDN references), Lotus Constructions (14), MERIDIAN, AEVUM, VOLTA,
VESPERA, the invitation book.

**What happens:** three.js, GSAP and Lenis load from jsDelivr, cdnjs and unpkg. If any of those is
blocked, the page loses its motion or its 3D, and in `Portfolio-testserver` it throws
`THREE is not defined`. The Ring Gate, the Flooded Rotunda and Altair Estates vendor everything and
make no third-party requests, and they are the sturdiest sites in the set.

**Quick fix:** copy the pattern from the Ring Gate: vendor the exact files into `vendor/` with their
licences, or bundle them with Vite. Pin versions either way.

## 4. Reduced motion is ignored on four sites

**Where:** AEVUM, VOLTA, VESPERA and the Résumé contain no `prefers-reduced-motion` query. The first
three run Lenis smooth scroll and ScrollTrigger; the Résumé runs over a hundred CSS animations and
transitions, plus scroll reveals.

**What happens:** visitors who have asked their OS for less motion still get smooth scroll and
parallax, which can cause nausea. Text that waits for a reveal can also stay hidden if the animation
never fires.

**Quick fix:** wrap Lenis and the scroll-triggered timelines in
`if (!matchMedia('(prefers-reduced-motion: reduce)').matches)`, and make the resting state in CSS the
visible state, so text is never hidden behind an animation that doesn’t run.

## 5. Half-finished sites are still public

**Where:** `Sumanth.CV` (mostly black after the intro), `Vedapriya-portfolio` (contact rows read
“Add your email in js/config.js”), `hyperion-site` (stalls on “Loading Hyperion” with no timeout or
error message), and three test repositories.

**What happens:** anything on `su3doesign.github.io` can be found from the GitHub profile, and a
broken page there counts against the finished ones.

**Quick fix:** turn off GitHub Pages for those repositories, or archive them, until they are done. For
loaders in general, race the load against a timeout and show a way in (a still image and a “continue”
link), as the forest’s `work.html` fallback already does.

---

### Worth copying

- **The invitation book** handles reduced motion in 15 places and animates only opacity and position,
  so page turns stay smooth on cheap phones.
- **The forest** mirrors every 3D stop with a real HTML panel, and falls back to `work.html` when
  WebGL2 is missing.
- **The Flooded Rotunda** steps its quality tier down on its own when frames stay slow.

This site uses all three: every world shown in the door is also on the page as HTML, reduced motion turns
off smooth scroll and scrubbing, and without WebGL2 each door becomes a still image.
