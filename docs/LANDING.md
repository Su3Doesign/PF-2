# Landing page: sections and headline ideas

The portfolio is one long page with a single idea running through it: **every site is the front door to a
world that was built first.** One WebGL door travels down the page with the visitor. Its UV light starts
violet at the top and turns to dawn at the bottom, so the page reads as one night that ends in morning.

| # | Section | Job | Shipped headline | Motion |
|---|---------|-----|------------------|--------|
| 0 | Loader | Buy time for fonts and the first door image, and set the tone | A giant counter to 100 while an arch draws itself | The screen splits down the middle and opens like a pair of doors |
| 1 | Hero | Say what Sumanth does in one breath | **FRONT / DOORS**; h1: **I build worlds, then their front doors.** | Letters rise; the words slide apart while the door, showing the worlds, comes forward |
| 1b | Tapes | Name the craft without a paragraph | *Brand systems ✦ 3D environments ✦ Campaigns ✦ Websites* | Crossing marquees that follow scroll speed and direction |
| 2 | Who’s building | Who he is, in his own words | *I build places that don’t exist…* | Word-by-word light-up with image pills; the résumé statement, tools, path, numbers |
| 3 | Worlds | The best personal work, big | **Three worlds, three hours.** | Each plate opens to full-bleed; kanji down the side; a film strip after |
| 4 | Method (pinned) | Show there is a craft behind the look | **Seven moves, every single time.** | The door pins; each move puts its study in the door |
| 5 | Clients | The commercial half | **Ships on a Friday.** | Bento wall that flips through each client's work |
| 6 | Library | Range | **Thirty-nine studies. Throw it around.** | Endless drag canvas |
| 7 | Websites | The front doors themselves | **The front doors.** | Scroll-snap rail or index; case studies |
| 8 | Commissions | How to start, without a pricing table | *I’d like **a whole world** for **a brand campaign**.* | The sentence is the form: tap a blank to change it, then send it as an email |
| 9 | Ask | Give skimmers a shortcut | **Don’t want to scroll? Ask.** | Opens the chat panel |
| 10 | Contact | One clear action | **Have a place that needs a door?** | The door at dawn; a giant SUMANTH that thins under the cursor |

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
