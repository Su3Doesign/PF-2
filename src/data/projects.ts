// Every finished site from the Su3Doesign repositories, written as a short case study.
// Facts come from each repository's README and source. To add a site: drop images into
// public/work/<slug>/ (cover.webp is required) and add an entry below.

export type Kind = 'World' | 'Client' | 'Concept' | 'Self';

export interface Shot {
  src: string;
  alt: string;
  caption?: string;
}

export interface Project {
  slug: string;
  title: string;
  /** The line under the title everywhere it appears. */
  line: string;
  kind: Kind;
  year: number;
  role: string;
  stack: string[];
  live: string;
  repo?: string;
  /** Hex used to tint the portal light and the case-study accent. */
  tone: string;
  featured?: boolean;
  cover: Shot;
  gallery: Shot[];
  story: {
    premise: string;
    idea: string;
    built: string[];
    hardPart: string;
    outcome: string;
  };
  facts: [label: string, value: string][];
}

const img = (slug: string, name: string, alt: string, caption?: string): Shot => ({
  src: `work/${slug}/${name}.webp`,
  alt,
  caption,
});

const gh = (repo: string) => `https://github.com/Su3Doesign/${repo}`;
const pages = (repo: string) => `https://su3doesign.github.io/${repo}/`;

export const projects: Project[] = [
  {
    slug: 'overgrown-archive',
    title: 'The Overgrown Archive',
    line: 'A night walk through a neon forest that ends at the sea at dawn. The portfolio is the place.',
    kind: 'Self',
    year: 2026,
    role: 'Design, 3D, code',
    stack: ['three.js', 'TypeScript', 'Vite', 'Blender (headless)', 'Lenis'],
    live: 'https://www.thesumanth.com/',
    repo: gh('PF-1'),
    tone: '#2fe0c0',
    featured: true,
    cover: img('overgrown-archive', 'cover', 'Moss-covered SUMANTH letters standing in a mirror-still pond, outlined in teal neon'),
    gallery: [
      img('overgrown-archive', 'worlds', 'A forest path of stepping stones beside a glowing neon line, small screens hanging among the trees', 'The walk. Scroll moves the camera along a rail and pauses at each stop.'),
      img('overgrown-archive', 'method', 'A white spirit deer by a mossy boulder, a neon 七手 METHOD sign beyond it', 'The spirit deer near the method stop. Walk too close and it dissolves.'),
      img('overgrown-archive', 'clients', 'A mossy rack of CRT monitors, each showing client work', 'Clients: sixteen CRTs, one per client, each opening that client’s gallery.'),
      img('overgrown-archive', 'sea', 'A terrace over the sea at dawn with a torii offshore and a SAY HELLO sign', 'Contact: the walk ends at the sea, with a glass panel of real HTML.'),
    ],
    story: {
      premise:
        'Environment art looks small in a grid of thumbnails. The work is about places, so a page of rectangles was always going to undersell it.',
      idea:
        'Make the portfolio a place. Scrolling walks a camera along a rail through an overgrown forest, and every section of a normal portfolio becomes a stop on the walk: monoliths for the worlds, stone lanterns for the method, a rack of CRTs for the clients, a flooded cave for the about page, a baroque hall for the archive, the sea for contact.',
      built: [
        'Every asset comes from a script: Blender, run headless, models the props and bakes their ambient occlusion; trees, cave, hall, shore and sea are built procedurally at load time.',
        'One planar reflection serves every water surface in the world, because all of them sit at y = 0.',
        'Only six point lights exist. Each frame they are handed to the neon sources nearest the camera, so the shaders never recompile.',
        'Three quality tiers picked from the GPU, and a frame governor that changes resolution before a frame is drawn, never after.',
        'Seven kodama, a spirit deer, a broken television and a whale of light hidden along the way.',
      ],
      hardPart:
        'The mirror pass uses an oblique near plane to clip everything under the water, and that projection quietly defeats frustum culling, so the whole world was being drawn twice every frame. The fix was to cull against the true frustum by hand before the mirror draws.',
      outcome:
        'About 330 to 480 draw calls including the mirror, 345 KB of gzipped JavaScript, and every stop mirrored by a real HTML panel. Without WebGL2 the site falls back to work.html, a fast flat version of the same portfolio.',
    },
    facts: [
      ['Stops', '9'],
      ['Point lights', '6'],
      ['JS, gzipped', '345 KB'],
      ['Fallback', 'work.html'],
    ],
  },
  {
    slug: 'altair-estates',
    title: 'Altair Estates: The Aether Monolith',
    line: 'A collector’s estate on a sea cliff, drawn in pencil as you drive from the gate to the sea.',
    kind: 'World',
    year: 2026,
    role: 'Concept, architecture, 3D, code',
    stack: ['three.js', 'Draco', 'GSAP + ScrollTrigger', 'Lenis', 'Blender + Cycles'],
    live: pages('Altair-Estates-The-Aether-Monolith'),
    repo: gh('Altair-Estates-The-Aether-Monolith'),
    tone: '#ff9a5c',
    featured: true,
    cover: img('altair-estates', 'cover', 'Aerial render of a clifftop estate above the sea at sunset'),
    gallery: [
      img('altair-estates', 'site', 'The website’s opening: the estate as a line drawing under the title THE AETHER MONOLITH', 'The opening: the estate drawn out from its middle as the camera comes down.'),
      img('altair-estates', 'blueprint', 'A cyanotype view of the house at night, white lines on Prussian blue, with a red pencil camera wedge', 'After dark the drawing turns cyanotype, and a red pencil marks the view ahead.'),
      img('altair-estates', 'fountain', 'Night render of the fountain court with a lit fountain and parked cars', 'The fountain court, in the hour its render was lit for.'),
      img('altair-estates', 'canal', 'Palm-lined canal reflecting a lit pavilion at dusk', 'The palm canal.'),
      img('altair-estates', 'house', 'The cliff house at dusk, built into the rock', 'The house at the end of the drive.'),
    ],
    story: {
      premise:
        'The estate already existed as a Blender build and a set of A3 blueprint sheets: a gate, a maple avenue between a lake and a lavender field, a glass-block bridge, a gallery street, a palm canal and a house cut into a cliff. Renders show it one frame at a time. Nobody gets the drive.',
      idea:
        'Let the visitor take the drive, with the website itself drawing it. The world arrives as a pencil drawing on the page’s paper; as the camera reaches a view, the drawing turns into the white model and the real render develops over it. Leaving, it goes back to lines.',
      built: [
        'The estate as the Blender build made it, exported with Draco: a 2 m terrain grid, the house, the roads, the far shore, with 808 trees, 2,141 lamps and 52 cameras placed from the same data.',
        'Pencil hatching that lies on the surfaces themselves, so it stays put as the camera moves, with darker tones hatched across.',
        'A watercolour wash by day and a cyanotype of white lines on Prussian blue after dark, using the blueprint sheets’ own colours.',
        'A red pencil that keeps up with the camera, drawing the route along the ground as far as it has come.',
      ],
      hardPart:
        'Making a drawing hold still in 3D. Screen-space hatching swims as the camera moves, so the strokes are laid on the surfaces at two blended spacings, which keeps them the same width on screen near and far.',
      outcome:
        'One long scroll from the gate to the sea, followed by the cars, the estate in the viewer’s hands, the making-of, the plates and the drawing table.',
    },
    facts: [
      ['Trees', '808'],
      ['Lamps', '2,141'],
      ['Cameras', '52'],
      ['Looks', 'Pencil · Cyanotype'],
    ],
  },
  {
    slug: 'ring-gate',
    title: 'The Ring Gate',
    line: 'A concept-art book you scroll: a 156-metre stone ring whose door shows you what you want most.',
    kind: 'World',
    year: 2026,
    role: 'World-building, 3D, writing, code',
    stack: ['three.js', 'rough.js', 'Blender', 'Unreal Engine 5'],
    live: pages('Tirthavel'),
    repo: gh('Tirthavel'),
    tone: '#f0a24a',
    featured: true,
    cover: img('ring-gate', 'cover', 'The giant stone ring silhouetted against a low sun, light pouring through its door'),
    gallery: [
      img('ring-gate', 'site', 'The website’s opening: the ring gate standing in the sea at sunset under the title THE RING GATE', 'The opening, on the real gate mesh. One day passes over the Ring as you read.'),
      img('ring-gate', 'door', 'The carved door of the ring, lit from behind', 'The door that shows you what you want most, and takes your shadow.'),
      img('ring-gate', 'island', 'The ring city on its island, silhouetted at dusk', 'Tirthavel, the drowned city that climbs toward it.'),
      img('ring-gate', 'seawall', 'A sea wall crowned with white towers above turquoise water', 'The sea wall.'),
      img('ring-gate', 'chapter', 'A chapter opener: a brush-drawn ring on deep teal paper', 'Chapter openers are brush rings on coloured paper.'),
    ],
    story: {
      premise:
        'Kaalavalaya is a 156-metre carved stone ring with a door that shows you what you want most and takes your shadow in return. Tirthavel is the drowned city climbing toward it. The world was modelled in Blender and rendered in Unreal, and it needed a book.',
      idea:
        'Make the art book a website, built on the real gate mesh. One day passes over the Ring while you read, from dawn to the Hollow Sun, and the chapters (origins, lore, why a ring, the Mahabharata echoes, the city, materials, the sea, light, the making-of) are annotated by hand.',
      built: [
        'A scroll-driven three.js story on the production mesh of the gate.',
        'A turntable of the gate in four looks: clay, ink, stone and overgrown.',
        'Hand-drawn annotations throughout, drawn live with rough.js.',
        'Everything vendored, including three.js, rough.js and the fonts, so the page makes no external requests.',
      ],
      hardPart:
        'Choosing the shape. The ring was not the first idea, and the book keeps the losers: one spread shows the shapes tried first, the next says why the ring won. A later one admits the city ate the gate.',
      outcome:
        'A book that runs from any static host, with a shareable social card and an embeddable version for portfolios like this one.',
    },
    facts: [
      ['Ring', '156 m'],
      ['Looks', 'Clay · Ink · Stone · Overgrown'],
      ['External requests', '0'],
      ['Rendered in', 'UE5'],
    ],
  },
  {
    slug: 'flooded-rotunda',
    title: 'The Flooded Rotunda',
    line: 'A world-building sketchbook read inside the live 3D world it was built as.',
    kind: 'World',
    year: 2026,
    role: 'World-building, 3D, writing, code',
    stack: ['three.js', 'GSAP', 'Lenis', 'Unreal Engine 5', 'Blender'],
    live: pages('flooded-rotunda-site'),
    repo: gh('flooded-rotunda-site'),
    tone: '#8fd19a',
    featured: true,
    cover: img('flooded-rotunda', 'cover', 'Light shafts falling through a ruined dome into a flooded rotunda'),
    gallery: [
      img('flooded-rotunda', 'site', 'The loading screen: a chalk drawing of the marble keeper turning on her plinth', 'The loading screen. She turns to face whoever comes in.'),
      img('flooded-rotunda', 'keeper', 'The ivy-covered marble statue standing in green water', 'La Custode. AQVAM • TENEO • DONEC • REDEAS.'),
      img('flooded-rotunda', 'shafts', 'The statue in a beam of light under the ruined dome', 'The Night of Bells: seventeen shafts of light.'),
      img('flooded-rotunda', 'page', 'A sketchbook page of procedural texture maps above the 3D world', 'Making the stones. Every map is procedural; none is photographed.'),
    ],
    story: {
      premise:
        'A drowned Romanesque ring of twelve bays with a marble keeper in the middle, built in Unreal at 7.9 million triangles of unique geometry plus 1.56 billion instanced through Nanite. The place has one rule: she turns to face whoever comes in.',
      idea:
        'Make the rule the interface. While the world downloads, the statue is the loading screen: she turns on her plinth, drawn in chalk, looking for whoever just arrived. When it has loaded she stops, faces you, and the drawing dissolves into the rendered room. Then the book’s pages slide over the world as the camera travels through it.',
      built: [
        'The real scene, exported from the Blender and Unreal build, streamed into the browser.',
        'A camera station for every chapter: the plan, the twelve bays, the dome, the statue, the water, the ivy, the door.',
        'A tide staff on the right that rises with your scroll. Every chapter you enter raises the water one finger, in the world too.',
        'Quality tiers that step down on their own if frames stay slow.',
      ],
      hardPart:
        'Sticks, then leaves. The first ivy was alpha cards, which fell apart up close, so the foliage was rebuilt as real geometry, the change the book itself calls the alpha-card problem.',
      outcome:
        'Seven chapters, six making-of pages, a breakdown that scrubs from clay to final, and an epilogue that rises out through the oculus with the water a little higher than when you came in.',
    },
    facts: [
      ['Bays', '12'],
      ['Instanced triangles', '1.56 B'],
      ['Light shafts', '17'],
      ['Chapters', 'VII'],
    ],
  },
  {
    slug: 'lotus-constructions',
    title: 'Lotus Constructions',
    line: 'A builder’s website where a house rises from bare ground as you scroll.',
    kind: 'Client',
    year: 2026,
    role: 'Brand, design, 3D, code',
    stack: ['three.js', 'Vanilla JS', 'GitHub Pages'],
    live: 'https://lotusconstructions.in',
    repo: gh('Lotusconstructions'),
    tone: '#d8b26a',
    cover: img('lotus-constructions', 'cover', 'A 3D modern house on a street with neighbouring buildings and parked cars'),
    gallery: [
      img('lotus-constructions', 'structure', 'A 3D concrete frame of columns and a slab on a gold grid, captioned One grid, footing to roof', 'Chapter four: one grid, footing to roof.'),
      img('lotus-constructions', 'render', 'Render of a residential building by Lotus', 'Each neighbour on the street is a real Lotus project.'),
    ],
    story: {
      premise:
        'A Hyderabad civil engineering and construction firm with 25+ years of work. Its record was renders, site photographs and presentation boards, and a lot of it could not be published.',
      idea:
        'Don’t describe building, show it. Scroll the home page and a house is built from bare ground in 3D: footing, frame, walls, glass. At the end the camera pulls back over the street, and the neighbours are real Lotus projects with name tags that link to each one.',
      built: [
        'A 3D street of eleven modelled projects, walked one building at a time at golden hour, with the real render or photograph beside each model.',
        'A full portfolio with filters and a zoomable viewer, and a link for every project.',
        'Deeper pages on construction, materials and interiors.',
        'A lotus-and-NK logo, drawn as a corner building in perspective, in gold and dark versions.',
      ],
      hardPart:
        'Showing the work without the paperwork. No client names, addresses, plot numbers or working drawings go on the page, so projects that only existed as drawings are shown as 3D presentation boards: a road view and an aerial view of the model.',
      outcome:
        'Live at lotusconstructions.in from one HTML file with no build step: edit, commit, and GitHub Pages publishes.',
    },
    facts: [
      ['Projects on the street', '11'],
      ['Build step', 'None'],
      ['Domain', 'lotusconstructions.in'],
      ['Experience shown', '25+ yrs'],
    ],
  },
  {
    slug: 'capq',
    title: 'CapQ',
    line: 'The site for the finance advisory where I run marketing: a coming-soon page that already takes enquiries.',
    kind: 'Client',
    year: 2026,
    role: 'Head of Marketing · brand, design, code',
    stack: ['Astro', 'Tailwind CSS', 'GSAP', 'Lenis'],
    live: pages('CapQ'),
    repo: gh('CapQ'),
    tone: '#3fbf4a',
    cover: img('capq', 'cover', 'CapQ coming soon page: Right Capital. Structured Right., with a glass logo card'),
    gallery: [img('capq', 'form', 'A glass enquiry form with name, mobile number, requirement and amount fields', 'The enquiry form, live before the platform.')],
    story: {
      premise:
        'A business finance advisory in Hyderabad, matching MSMEs with lenders from 117+ banking and NBFC partners, where I lead marketing end to end. It was launching soon and couldn’t afford a quiet page in the meantime.',
      idea:
        'A coming-soon page that does the job early: say the promise in four words, Right Capital. Structured Right., then put a WhatsApp line, a phone line and a real enquiry form right under it.',
      built: [
        'Frosted glass panels with a pointer-tracking specular highlight, and 3D tilt cards with chromatic edges.',
        'A glass logo card that responds to the pointer.',
        'An enquiry form that matches the visitor to a specialist within four hours.',
        'Static Astro output, deployed to GitHub Pages.',
      ],
      hardPart:
        'Making a pre-launch page do real work. The WhatsApp line, the phone line and the enquiry form all sit within the first two screens, under the promise.',
      outcome:
        'A single static page that collects leads from day one, inside a brand I run end to end: the identity and design system, the collateral and pitch material, and the expos and MSME outreach around it.',
    },
    facts: [
      ['Partners', '117+'],
      ['Framework', 'Astro'],
      ['Callback within', '4 hrs'],
      ['Output', 'Static'],
    ],
  },
  {
    slug: 'aevum',
    title: 'AEVUM',
    line: 'A watch for all twenty-four hours. The page opens at your real time and scrolls through a day.',
    kind: 'Concept',
    year: 2026,
    role: 'Concept, design, code',
    stack: ['HTML', 'CSS', 'GSAP', 'Lenis'],
    live: pages('Aevum'),
    repo: gh('Aevum'),
    tone: '#c9a36a',
    cover: img('aevum', 'cover', 'A huge live clock reading the visitor’s current time over a starfield'),
    gallery: [
      img('aevum', 'specs', 'Dawn section with watch specifications and a Request Aube button', 'Dawn: the Aube dial and the palette warms to plum.'),
      img('aevum', 'quote', 'Golden hour: a quote animating word by word over a large 19:42', 'Golden hour, at 19:42.'),
    ],
    story: {
      premise: 'A maker that builds one watch a year, forty-eight pieces, hand-wound, worn through every hour that follows.',
      idea:
        'The page is a day. It opens at true midnight with a live clock of the visitor’s own time, and scrolling moves through dawn, noon and golden hour back to midnight.',
      built: [
        'A preloader that counts up to the present second.',
        'A fixed 24-hour dial whose hand follows the scroll from 00:00 to 23:59.',
        'A gold hairline across the top that fills once every real minute.',
        'Navigation links written as times instead of words.',
      ],
      hardPart: 'A cursor that stays visible on both the black and paper sections. It uses a blend mode, so it inverts whatever it is over.',
      outcome: 'An editorial single page, photography only, with no illustrated watch anywhere in it.',
    },
    facts: [
      ['Pieces a year', '48'],
      ['Clock', 'Live'],
      ['Nav', 'In hours'],
      ['Dial', '24 h'],
    ],
  },
  {
    slug: 'volta',
    title: 'VOLTA®',
    line: 'Clothes with voltage: limewhite brutalism, mega-type and a cursor you can’t ignore.',
    kind: 'Concept',
    year: 2026,
    role: 'Concept, design, code',
    stack: ['HTML', 'CSS', 'Vanilla JS'],
    live: pages('VOLTA'),
    repo: gh('VOLTA'),
    tone: '#ff4a1c',
    cover: img('volta', 'cover', 'Giant black THE LOUD headline on off-white with a vermilion dot and a circular text badge'),
    gallery: [img('volta', 'index', 'A product index list: Static Trench, Silk Circuit Slip, Feedback Roll-neck', 'The hover index: hover a row and its photo follows the pointer.')],
    story: {
      premise: 'A boutique called “the loud” needed a page that is loud too, without being a mess.',
      idea: 'Strip everything back to off-white, ink and one vermilion, and let the type shout.',
      built: [
        'A hero image trail that follows the cursor.',
        'A draggable lookbook with inertia.',
        'A ticker that skews with scroll velocity.',
        'Sticky full-screen collection panels that change accent palettes.',
      ],
      hardPart: 'Keeping a page this loud legible. There is one accent colour, everything else is ink on off-white, and type size carries the whole hierarchy.',
      outcome: 'One HTML file that works as a component sampler for fashion lookbooks and editorial portfolios.',
    },
    facts: [
      ['Palette', 'Lime-white · Ink · Vermilion'],
      ['Files', '1'],
      ['Restocks', '0'],
      ['Type', 'Mega'],
    ],
  },
  {
    slug: 'vespera',
    title: 'VESPERA',
    line: 'Maison de l’Heure Bleue: a boutique for the hour the light turns.',
    kind: 'Concept',
    year: 2026,
    role: 'Concept, design, code',
    stack: ['HTML', 'CSS', 'GSAP + ScrollTrigger', 'Lenis'],
    live: pages('Vespera-Boutique'),
    repo: gh('Vespera-Boutique'),
    tone: '#c8a27a',
    cover: img('vespera', 'cover', 'Large bone-white VESPERA wordmark on a near-black page'),
    gallery: [
      img('vespera', 'house', 'We dress the hour between day and night, l’heure bleue', 'The house. 48 pieces a season, 3 ateliers, 0 restocks.'),
      img('vespera', 'afterdark', 'THE BOUTIQUE IS OPEN after dark', 'Appointments, after dark.'),
    ],
    story: {
      premise: 'A fashion house that only releases pieces when they are ready, and never restocks them.',
      idea: 'Dress the page like dusk: a near-black canvas, bone-white Italiana display type and one champagne accent, with film grain over all of it.',
      built: [
        'A preloader counter that opens into the hero with a curtain.',
        'A pinned horizontal rail of collections that stacks vertically on phones.',
        'A custom cursor that turns into View over imagery, with magnetic buttons.',
        'A footer wordmark in outline that fills on hover.',
      ],
      hardPart: 'Making scarcity part of the voice, not a banner: 48 pieces a season, zero restocks and “ring twice” live in the copy.',
      outcome: 'A cinematic editorial landing page.',
    },
    facts: [
      ['Pieces a season', '48'],
      ['Restocks', '0'],
      ['Display face', 'Italiana'],
      ['Hours', 'After dark'],
    ],
  },
  {
    slug: 'meridian',
    title: 'MERIDIAN',
    line: 'A portfolio that runs on solar time. The sun rises and sets as you scroll.',
    kind: 'Self',
    year: 2026,
    role: 'Design, code',
    stack: ['three.js', 'GSAP + ScrollTrigger', 'Lenis'],
    live: pages('Portfolio'),
    repo: gh('Portfolio'),
    tone: '#6fc8ff',
    cover: img('meridian', 'cover', 'SUMANTH in large type over a procedural night sky with lightning'),
    gallery: [img('meridian', 'sun', 'A procedural sun rising over a wireframe terrain', 'Blue hour into dawn. The sky has no asset files at all.')],
    story: {
      premise: 'A portfolio for environment work, where everything depends on the hour of the light.',
      idea:
        'The whole site is one day. A procedural three.js sky with sun, terrain and stars sits behind everything, and each project appears at its true hour: Rōman no Yoake at 05:42, Fudō Myō-ō at 17:48, Koi Pond at 21:12.',
      built: [
        'A sky built entirely in code, with no asset files.',
        'A solar clock in the HUD that follows the scroll.',
        'A pinned horizontal manifesto at blue hour and a philosophy section at golden hour.',
        'Missing renders show a designed AWAITING RENDER blueprint frame instead of a broken image.',
      ],
      hardPart: 'Keeping the text readable while the sky goes from starlight to noon. At 09:30 the pages turn light and the type turns to ink.',
      outcome: 'A day from 23:58 to 00:00 that rolls over at the contact section.',
    },
    facts: [
      ['Day', '23:58 → 00:00'],
      ['Sky assets', '0'],
      ['Hours shown', '12'],
      ['Build step', 'None'],
    ],
  },
  {
    slug: 'thesumanth-v1',
    title: 'thesumanth v1',
    line: 'The first thesumanth.com: four pages, one canvas, and a glass artifact that really refracts.',
    kind: 'Self',
    year: 2026,
    role: 'Design, WebGL, code',
    stack: ['three.js', 'GLSL', 'GSAP', 'Lenis'],
    live: 'v1/',
    repo: gh('PF-2'),
    tone: '#ff7a3d',
    cover: img('thesumanth-v1', 'cover', 'A refracting glass artifact over a render, with a RENDERING panel and key light control'),
    gallery: [
      img('thesumanth-v1', 'method', 'Seven moves, every single time. The method section in heavy display type', 'The method.'),
      img('thesumanth-v1', 'world', 'The Fudō Myō-ō world page title', 'World pages dissolve into each other in GLSL.'),
    ],
    story: {
      premise: 'A portfolio that keeps its images out of reach of right-click, without pretending that is real protection.',
      idea: 'Draw the work in WebGL. Every plate is a mesh locked to its DOM element, so the page reads like HTML and renders like a scene.',
      built: [
        'DOM-synced planes that curl with scroll velocity and dent under the cursor.',
        'A glass icosahedron that really refracts the scene, sampling it three times for per-channel dispersion.',
        'An infinite draggable mosaic: 24 tiles on a wrapping lattice cycle through 164 pieces and never repeat a screen.',
        'Page transitions as a 22-band slice dissolve in GLSL. Press W for wireframe.',
      ],
      hardPart: 'A draggable key light that is not decoration: it drives the specular direction on the glass, the rake across every plate, and the site’s accent colour.',
      outcome: 'Still running: it is hosted inside this site at /v1/.',
    },
    facts: [
      ['Mosaic pieces', '164'],
      ['Dissolve bands', '22'],
      ['Pages', '4'],
      ['Hidden key', 'W'],
    ],
  },
];

export const bySlug = (slug: string) => projects.find((p) => p.slug === slug);

export const profile = {
  name: 'Amidyala Sai Sumanth',
  short: 'Sumanth',
  role: 'Brand & design systems · 3D artist · Head of Marketing',
  city: 'Hyderabad, India',
  email: 'talktorichie.workspace@gmail.com',
  /** The 2026 résumé, served from this site. */
  resume: 'resume/Sumanth-Resume-2026.pdf',
  /** Full case studies, boards and credits. */
  behance: 'https://www.behance.net/sumanthrichie',
  links: [
    ['LinkedIn', 'https://www.linkedin.com/in/amidyala-sumanth-1ab236250/'],
    ['Behance', 'https://www.behance.net/sumanthrichie'],
    ['Instagram', 'https://instagram.com/sumofDanth'],
    ['GitHub', 'https://github.com/Su3Doesign'],
  ] as [string, string][],
};
