# Front Doors

*A portfolio for someone who builds worlds and then builds the websites that let you in.*

---

## The problem: thirteen doors, no hallway

By October 2026 Sumanth had shipped a lot of web work: a neon forest you walk at night, an estate that draws
itself as you drive through it, an art book built on a 156-metre stone ring, a drowned rotunda whose statue turns
to face you, a builder’s site where a house rises as you scroll, and a Telugu wedding invitation you turn the pages
of.

It was spread across 29 repositories and a dozen `github.io` addresses, next to test benches,
abandoned experiments and 3D builds that were never meant to be websites. His existing portfolios showed the 3D
art, not the sites. A visitor had no single place to see the websites, and no way to tell which ones were
finished.

## The first job was editing

Every repository was cloned and every website in it was served locally and walked through in a browser, with
screenshots taken at three scroll depths. The rule was simple: **if it isn’t finished, it isn’t on the shelf.**

- **Thirteen** made it.
- **Eight** didn’t: a CV that goes black after its intro, a portfolio still showing `YOUR_EMAIL`, a car site stuck
  on its loader, three test benches, a recreation of another studio’s site, and an empty repository.
- **Eight** weren’t websites at all, and three of those turned out to be the worlds *behind* websites that made
  the cut.

That last finding gave the site its idea.

## The insight: every site was a door

The strongest sites did not start as web pages. Altair Estates was a Blender build and a set of A3 blueprint
sheets before it had a URL. The Ring Gate was an Unreal scene that needed a book. The Flooded Rotunda had 1.56
billion instanced triangles and one rule (*she turns to face whoever comes in*) before the website made that rule
its loading screen.

Sumanth builds the place first and then the way in. So the portfolio became **one door**, carried down the
page with the visitor and opening onto each world in turn.

## The idea, made literal

- **A real door.** An obsidian arch in three.js, with a world inside the opening and a violet UV light standing in
  the doorway. You can turn it all the way round by dragging, using about forty lines of pointer maths and no
  controls plugin.
- **One night, one scroll.** The light starts ultraviolet at the top and turns to dawn at the bottom. The page
  accent follows it, so the headline is violet and the last line is amber.
- **The door stays while the argument moves.** In the method section the door pins on the left while five rules
  scroll past on the right. Each rule puts a different world in the door and leans the light toward that
  project’s colour.
- **Then the doors open.** The four flagship worlds start as small cards and widen to full screen as you scroll,
  with their names sliding apart in layers.
- **Then the whole shelf.** All thirteen sit on an endless horizontal rail that scrolls natively, so trackpads,
  thumbs and arrow keys all just work.
- **The last door is yours.** The door comes back for the contact section, lit at dawn.

## The hard part: one door, three rooms

The door appears in the hero, the pinned method stage and the contact section. Three canvases would mean three
WebGL contexts, three copies of every texture, and doors that don’t know about each other.

Instead there is **one fixed canvas** behind the whole page, plus a small registry of DOM **anchors**. Each frame
the scene asks which anchor is most on screen, turns that element’s rectangle into world units, and eases the
door into it. When no anchor is visible the canvas fades out and stops drawing.

This makes pinning free. When ScrollTrigger pins the method stage, the anchor stops moving, so the door stops
moving. Layout stays in CSS, where it belongs.

## Keeping it quiet

The brief asked for slow, premium motion, and slow is easy to get wrong. Every duration is long and every ease
settles gradually. Lenis gets a 1.5-second exponential glide. There are no bounces and no parallax for its own
sake: each layer that moves at its own speed sits at a different depth for a reason.

Every effect also has an exit:

- Reduced motion turns off smooth scroll, scrubbing, the idle spin and the moving grain, and shows the end state
  of every reveal.
- Without WebGL2, each door becomes a still image in an arch.
- Case studies are real dialogs, with focus moved in, trapped, and handed back.

## Where it landed

- **13 finished sites**, each with a story-shaped case study: premise → idea → what was built → the hard part
  → where it landed.
- **About 140 KB of gzipped JavaScript** before first paint. three.js (144 KB gzipped) arrives afterwards, so
  the headline never waits for it.
- **2.8 MB of WebP** for every cover and gallery image, all lazy except the first door.
- **A chat panel** that answers questions about the work from the same data that drives the page, and can be
  pointed at a model endpoint with one build variable.
- **Nothing thrown away.** The first thesumanth.com still runs at `/v1/`.

A five-issue UX audit of the live sites came out of the survey too ([`UX-AUDIT.md`](UX-AUDIT.md)). Its first fix
is to replace the hot-linked stock photography that breaks three of the concept sites.
