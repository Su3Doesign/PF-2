# Landing page: sections and headline ideas

The portfolio is one long page with a single idea running through it: **every site is the front door to a
world that was built first.** One WebGL door travels down the page with the visitor. Its UV light starts
violet at the top and turns to dawn at the bottom, so the page reads as one night that ends in morning.

| # | Section | Job | Shipped headline | Motion |
|---|---------|-----|------------------|--------|
| 0 | Loader | Buy time for fonts and the first door image, and set the tone | A giant counter to 100 while an arch draws itself | The screen splits down the middle and opens like a pair of doors |
| 1 | Hero | Say what Sumanth does in one breath | **FRONT / DOORS**, with the 3D door standing between the words; h1: **I build worlds, then their front doors.** | Letters rise; scrolling slides the words apart while the door comes forward |
| 1b | Tapes | Name the craft without a paragraph | *Worlds first ✦ Websites second ✦ No templates* | Two crossing marquees that follow scroll speed and direction |
| 2 | The idea | Turn the headline into a belief | *Every site here began as a place…*, with a window onto each world in the line | Word-by-word light-up on scroll; counters |
| 3 | Method (pinned) | Prove there is a process, not luck | **Five rules, every time.** | The door pins on the left while five rules scroll on the right; each rule swaps the world in the door and tints the light |
| 4 | Worlds | Show the four flagship sites big | **Four worlds, four doors.** | Each image opens from a small card to full-bleed; title lines slide at different speeds |
| 5 | Shelf | Show breadth: all 13 | **Everything that shipped.** | Infinite horizontal CSS scroll-snap rail, or an index whose rows fill with colour while the picture follows the cursor |
| 6 | Ask | Give skimmers a shortcut | **Don’t want to scroll? Ask.** | Opens the chat panel |
| 7 | Contact | One clear action | **Have a place that needs a door?** | The door comes back, lit at dawn; a giant SUMANTH thins wherever the cursor passes |

## Headline bank

Alternatives for each slot, written in the same voice. Swap them in `src/components/*`.

**Hero**
1. I build worlds, then their front doors. *(shipped)*
2. Places that don’t exist, with a URL.
3. Every website here is a door. Step through.
4. Worlds first. Websites second. Never templates.
5. Thirteen doors. Each one opens onto somewhere I built.

**The idea**
1. Every site here began as a place. *(shipped)*
2. I don’t design pages. I design the way in.
3. The world comes first; the scroll is how you arrive.

**Method**
1. Five rules, every time. *(shipped)*
2. How a door gets built.
3. Same five moves, thirteen times.

**Worlds**
1. Four worlds, four doors. *(shipped)*
2. Built in Blender. Opened in a browser.
3. Walk in. They’re all still lit.

**Shelf**
1. Everything that shipped. *(shipped)*
2. The whole shelf, nothing half-finished.
3. Thirteen sites, no templates.

**Contact**
1. Have a place that needs a door? *(shipped)*
2. Tell me about the world. I’ll build the way in.
3. The last door is yours.

## What was left off, and why

Only finished sites are on the page. These repositories were reviewed and left out:

| Repository | Why it is not on the shelf |
|------------|----------------------------|
| `Sumanth.CV` | After the intro the page is mostly empty black screens. |
| `Portfolio-testserver`, `Testingtesting1Oi0`, `Test-Websites` | Test benches (`Test-Websites` says so in its README); one throws `THREE is not defined`. |
| `hyperion-site` | Uses a model named `hyperion_trial_v1.glb`, and the build stalled on its loader when tested. |
| `Vedapriya-portfolio` | The contact config still has `YOUR_EMAIL` and other placeholder tokens. |
| `igloo-inc-clone` | A recreation of another studio’s site, not original work. |
| `meridian` | Empty repository. |
| `car-mansion`, `ring-gate-citadel`, `Colosseum`, `wizardingworld`, `world-1/2/3`, `Garage-1` | 3D world builds, not websites. Three of them are inside the shelf already, as the worlds behind Altair Estates, the Ring Gate and the Flooded Rotunda. |

Add any of them back by adding an entry to `src/data/projects.ts`.
