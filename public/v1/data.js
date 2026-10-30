/* ══════════════════════════════════════════════════════════════
   data.js — one source of truth for every page.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var IMG = 'assets/images/';
  var VID = 'assets/videos/';

  function seq(prefix, a, b, suffix, pad) {
    var out = [];
    for (var i = a; i <= b; i++) out.push(prefix + (pad && i < 10 ? '0' + i : i) + (suffix || '.webp'));
    return out;
  }

  var WORLDS = [
    {
      id: 'roman-no-yoake',
      url: 'roman-no-yoake.html',
      title: 'Rōman no Yoake',
      jp: '浪漫の夜明け',
      sub: 'Pagoda, first light, and a sea that has not started talking yet',
      year: '2025', kind: 'Personal', place: 'Nowhere in particular, somewhere on the Seto coast',
      accent: '#FFA24A',
      plate: IMG + 'japa-render-1.webp',
      alt: 'A pagoda above a misty treeline at sunrise',
      note: 'The hour before anything is awake. I wanted the fog to do the modelling — the pagoda barely earns its silhouette, the treeline dissolves, and the only hard edge in the whole frame is the sun clearing the ridge.',
      tags: ['Maya', 'Arnold', 'Substance', 'After Effects', 'Fog volumes', '5 renders'],
      stats: [
        ['Scene', '1.2M polys'], ['Lights', '1 sun · 1 sky · 2 bounce cards'],
        ['Render', '512 spp · 41 min / frame'], ['AOVs', 'beauty · Z · fog · specular']
      ],
      chapters: [
        {
          k: 'THE BRIEF I GAVE MYSELF',
          h: 'Make the fog do the modelling.',
          p: 'Every reference photo I pulled of a pagoda at dawn had the same thing in common: you cannot see most of it. The eye fills in the roofline from three visible corners. So the modelling budget went almost entirely into the silhouette and the first twenty metres of ground, and everything past that is a depth-graded volume doing the work for free.',
          media: [{ src: IMG + 'japa-render-3.webp', cap: 'Pink hour — the version where the flowers got a say' }]
        },
        {
          k: 'THE LIGHT',
          h: 'One sun, and four hundred rejections.',
          p: 'The sun elevation moved in half-degree steps for most of a week. Too low and the pagoda goes to pure silhouette and the whole thing turns into a postcard. Too high and the fog stops scattering and you lose the god rays through the treeline. It lands at about four degrees, warm enough to read as morning and weak enough that the foreground still belongs to the blue of the night before.',
          media: [
            { src: IMG + 'japa-render-5.webp', cap: 'Eclipse variant — same set, borrowed sky' },
            { src: IMG + 'japa-render-2.webp', cap: 'The tower, from the water side' }
          ]
        },
        {
          k: 'MOTION',
          h: 'It had to survive moving.',
          p: 'A still can cheat. A turntable cannot — the moment the camera travels, any geometry you faked with a matte painting announces itself. Both moves are here: a full orbit and a slow lateral push through the grass, rendered at the same sample count as the stills.',
          media: [
            { src: VID + 'Japa-Turntable-1.mp4', cap: 'Turntable · full orbit' },
            { src: VID + 'Japa-Panningshot-2.mp4', cap: 'Panning shot · lateral push' }
          ]
        },
        {
          k: 'THE LAST FRAME',
          h: 'Grass, moon, and knowing when to stop.',
          p: 'This one is the runt of the set and my favourite. No hero architecture, no sun — just the grass and a moon that has not clocked off yet. It exists because I kept rendering after the project was finished, which is usually when the good one shows up.',
          media: [{ src: IMG + 'japa-render-4.webp', cap: 'Grass, moon, nothing else' }]
        }
      ]
    },
    {
      id: 'fudo-myo-o',
      url: 'fudo-myo-o.html',
      title: 'Fudō Myō-ō',
      jp: '不動明王',
      sub: 'A forest shrine at the hour the candles take over from the sun',
      year: '2025', kind: 'Personal', place: 'A shrine that has stopped expecting visitors',
      accent: '#FF6A1A',
      plate: IMG + 'fudomyo-render-1.webp',
      alt: 'A forest shrine lit by candlelight through the trees',
      note: 'Built around a single practical light. Everything else in the scene is either reflecting that candle or hiding from it. The foxes have stopped expecting visitors but they still keep watch, and the moss has opinions about where the water goes.',
      tags: ['Maya', 'ZBrush', 'Arnold', 'Substance', 'Practical light', 'Turntable'],
      stats: [
        ['Scene', '3.4M polys · 8 sculpts'], ['Lights', '1 practical · 1 moon · 0 cheats'],
        ['Render', '640 spp · 1 h 06 / frame'], ['AOVs', 'beauty · direct · indirect · Z']
      ],
      chapters: [
        {
          k: 'THE RULE',
          h: 'The candle is the only honest light.',
          p: 'One practical, sitting inside the shrine, doing all the work. No fill cards, no invisible area light politely lifting the foreground. If a surface is visible it is because that flame reached it, and if it is not, it stays gone. This is a harder way to light a scene and it is the only reason the frame reads as a place rather than a set.',
          media: [{ src: IMG + 'fudomyo-render-2.webp', cap: 'The approach — everything past the treeline is falloff, not fog' }]
        },
        {
          k: 'THE SCULPTS',
          h: 'Foxes that have stopped expecting visitors.',
          p: 'The komainu were sculpted in ZBrush and then deliberately ruined: lichen in the deep cuts, a chipped ear, the base sunk unevenly because a hundred monsoons went through here. A clean sculpt in a scene like this looks like it was delivered yesterday, and the whole point is that nobody delivered anything for a very long time.',
          media: [{ src: VID + 'Fudomyo-Turntable-1.mp4', cap: 'Turntable · the full shrine' }]
        },
        {
          k: 'THE VERTICAL',
          h: 'Recut for a phone, not cropped for one.',
          p: 'The vertical is a separate camera and a separate light balance, not a crop. Cropping a 16:9 to 3:4 throws away the composition and everyone can tell. Moving the camera and re-balancing the practical takes an afternoon and the frame survives.',
          media: [{ src: IMG + 'fudomyo-render-mobile-1.webp', cap: 'Vertical cut — its own camera, its own balance' }]
        }
      ]
    },
    {
      id: 'koi-pond',
      url: 'koi-pond.html',
      title: 'Koi Pond',
      jp: '錦鯉の池',
      sub: 'Bioluminescence, autumn, and light that comes from under the water',
      year: '2024', kind: 'Personal', place: 'A pond that knows every season it has held',
      accent: '#2FD3BE',
      plate: IMG + 'koipond-render-2.webp',
      alt: 'A glowing teal pond surrounded by rocks and palms at night',
      note: 'The rule for this one: no light from above. Everything is lit from inside the water, so the caustics run the wrong way up the rocks and the leaves take their colour from below.',
      tags: ['Maya', 'Arnold', 'Substance', 'Photoshop', 'Caustics', 'Two seasons'],
      stats: [
        ['Scene', '2.1M polys · 40 scatter species'], ['Lights', 'Emissive water volume'],
        ['Render', '384 spp · 28 min / frame'], ['AOVs', 'beauty · caustics · Z · cryptomatte']
      ],
      chapters: [
        {
          k: 'THE INVERSION',
          h: 'No light from above. None.',
          p: 'The water is the light source, so every shadow in this scene points the wrong way. Undersides of leaves are the brightest surfaces in frame, rock overhangs glow, and the sky contributes almost nothing. It took three attempts before it stopped looking like a mistake and started looking like a decision.',
          media: [
            { src: IMG + 'koipond-render-1.webp', cap: 'Shallows — caustics climbing the wrong way' },
            { src: IMG + 'koipond-render-4.webp', cap: 'Overgrowth' }
          ]
        },
        {
          k: 'THE SPREAD',
          h: 'Wide enough to get lost in.',
          p: 'The wide is the one that had to hold up. Scatter systems for forty plant species, hand-placed rocks along every sightline, and a water surface with enough displacement to break the reflection without turning it to soup.',
          media: [{ src: IMG + 'koipond-render-5.webp', cap: 'Wide, night' }]
        },
        {
          k: 'TWO SEASONS',
          h: 'The same pond, after the maples turned.',
          p: 'Once a scene is built properly, a season is a shader change and a scatter swap, not a rebuild. Autumn re-uses every asset in the summer render. The last frame drops the bioluminescence entirely and lets an actual sun in for the first and only time in the project.',
          media: [
            { src: IMG + 'koipond-render-3.webp', cap: 'Autumn pass — same geometry, new palette' },
            { src: IMG + 'koipond-render-6.webp', cap: 'Last light — the one frame with a sun in it' }
          ]
        }
      ]
    }
  ];

  var STEPS = [
    ['Reference', 'Look at the real thing for longer than is comfortable. Then keep looking.'],
    ['Blockout', 'Grey boxes, honest proportions. If it is boring in clay it will be boring in colour.'],
    ['Hard-surface', 'Edges that hold a highlight. Bevels you could run a thumb along.'],
    ['Sculpt', 'Wear where hands have been. Nothing in a lived world is factory-new.'],
    ['Texture', 'A working life: dust settles, paint chips, water always stains downward.'],
    ['Light', 'One key that tells the truth. Everything after it is support and flattery.'],
    ['Comp', 'Grade it, then remove half of what you just added.']
  ];

  var CLIENTS = [
    { name: 'Classic Partnership', group: 'Agency', role: 'Calendar campaigns · visual design', files: seq(IMG + 'tcp-calendarposts-', 1, 13) },
    { name: 'Midea Canada', group: 'Agency', role: 'Social overlays · PWHL · Pelonis', files: seq(IMG + 'midea-posts-', 1, 6).concat(seq(VID + 'midea-overlays-', 1, 8, '.mp4'), [IMG + 'midea-PWHL-banner.webp', IMG + 'midea-pelonis-banner-1.webp']) },
    { name: 'Eureka', group: 'Agency', role: 'Product social · reels', files: seq(IMG + 'midea-eureka-overlays-', 1, 4).concat(seq(VID + 'midea-eureka-', 1, 3, '.mp4')) },
    { name: 'Comfee', group: 'Agency', role: 'Social campaign', files: [IMG + 'midea-comfee-post-01.webp', IMG + 'midea-comfee-post-02.webp'].concat(seq(VID + 'midea-comfee-social-', 1, 2, '.mp4')) },
    { name: 'Home Depot Canada', group: 'Agency', role: 'RAC advertisements', files: seq(IMG + 'midea-rac-advertisements-', 1, 8, '.webp', true) },
    { name: 'KD Displays', group: 'Agency', role: 'Retail display content', files: seq(IMG + 'kddisplays-posts-', 1, 10).concat([VID + 'kddisplays-posts-1.mp4']) },
    { name: 'GC Burger', group: 'Agency', role: 'Campaign · five locations', files: seq(IMG + 'gcburger-campaign-', 1, 28) },
    { name: 'Investohome PR', group: 'Agency', role: 'Google ads · social · web', files: seq(IMG + 'investohome-googleads-banners-', 1, 5).concat(seq(IMG + 'investohome-socialads-banners-', 1, 5), seq(IMG + 'investohome-websitebanner-', 1, 4), [VID + 'investohome-outro-1.mp4']) },
    { name: 'Amaya Restaurant', group: 'Agency', role: 'Calendar posts · reel', files: seq(IMG + 'amayarestaurant-calendarposts-', 1, 5).concat([VID + 'amayarestaurant-reel-1.mp4']) },
    { name: 'VS Design Studio', group: 'Studio', role: 'Event & brand posts', files: seq(IMG + 'vsdesignstudio-posts-', 1, 4).concat([VID + 'vsdesignstudio-event-1.mp4']) },
    { name: 'nxtwave', group: 'Freelance', role: 'Slide system', files: seq(IMG + 'nxtwave-slide-', 1, 7) },
    { name: 'Tamada Media', group: 'Freelance', role: 'Branding', files: [IMG + 'tamadamedia-branding-1.webp', VID + 'tamadamedia-branding-2.mp4'] },
    { name: 'Lakshmi Bakers', group: 'Freelance', role: 'Identity · via Tamada Media', files: seq(IMG + 'tamadamedia-laxmibakery-', 1, 3) },
    { name: 'Inertia Productions', group: 'Freelance', role: 'Motion graphics', files: [VID + 'motiongraphicsmozilla-3.mp4', VID + 'motiongraphicsnews-1.mp4', VID + 'motiongraphicsnews-2.mp4'] },
    { name: 'LLT Overseas', group: 'Freelance', role: 'Illustration', files: [IMG + 'overseas-illustration-1.webp'] },
    { name: 'AZ Coffee', group: 'Freelance', role: 'Via Coalition Technologies · under NDA', files: [] }
  ];

  var STUDIES = [
    { src: IMG + '10.webp', nm: 'Nike Phantom', kind: 'Sport campaign' },
    { src: IMG + '1.webp', nm: 'Magma', kind: 'Beverage identity' },
    { src: IMG + '3.webp', nm: 'Magma', kind: 'Can · product viz' },
    { src: IMG + '2.webp', nm: 'Magma', kind: 'Strawberry key art' },
    { src: IMG + '12.webp', nm: 'Reebok', kind: 'Sport campaign' },
    { src: IMG + '7.webp', nm: 'Messi × Ronaldo', kind: 'Match poster' },
    { src: IMG + '16.webp', nm: 'Cloudbank', kind: 'Sky study' },
    { src: IMG + '8.webp', nm: 'Mustang', kind: 'Automotive' },
    { src: IMG + '1 (2).webp', nm: 'Octavia', kind: 'Automotive · night' },
    { src: IMG + '1 (10).webp', nm: 'Octavia', kind: 'Automotive · forest' },
    { src: IMG + 'car-render-2.webp', nm: 'Supra', kind: 'Studio viz' },
    { src: IMG + 'car-render-1.webp', nm: 'Supra', kind: 'Three-quarter' },
    { src: IMG + 'car2-shadowmatte-1.webp', nm: 'Ferrari', kind: 'Shadow matte' },
    { src: IMG + '11.webp', nm: 'Titan', kind: 'Product advert' },
    { src: IMG + 'op-perfume-1.webp', nm: 'Perfume', kind: 'Fragrance key art' },
    { src: IMG + '21.webp', nm: 'Nipura Luxe', kind: 'Jewellery · cool' },
    { src: IMG + '22.webp', nm: 'Nipura Luxe', kind: 'Jewellery · warm' },
    { src: IMG + 'cd.webp', nm: 'Nipura', kind: 'Seasonal post' },
    { src: IMG + '15.webp', nm: 'FittR', kind: 'Food packaging' },
    { src: IMG + '4.webp', nm: 'Science Focus', kind: 'Editorial cover' },
    { src: IMG + '5.webp', nm: 'The Alchemist', kind: 'Cover · mockup' },
    { src: IMG + '6.webp', nm: 'The Alchemist', kind: 'Title lockup' },
    { src: IMG + '13.webp', nm: 'Yesteryay Land', kind: 'Event poster' },
    { src: IMG + 'sensei-mugen.webp', nm: 'Sensei', kind: 'Character' },
    { src: IMG + '9.webp', nm: 'The lamppost', kind: 'Illustration' },
    { src: IMG + '14.webp', nm: 'Ship, dusk', kind: 'Illustration' },
    { src: IMG + '18.webp', nm: 'Dead wood', kind: 'Matte illustration' },
    { src: IMG + '17.webp', nm: 'Late room', kind: 'Interior light study' },
    { src: IMG + 'conceptdesign-2.webp', nm: 'Red tree', kind: 'Concept' },
    { src: IMG + 'conceptdesign-1.webp', nm: 'Moon field', kind: 'Concept' },
    { src: IMG + 'cylinder-1.webp', nm: 'Hard-surface', kind: 'Practice' },
    { src: IMG + 'conceptdesign-3.webp', nm: 'Clay pass', kind: 'Hard-surface' },
    { src: IMG + 'cylinder-3.webp', nm: 'Extinguisher', kind: 'Texture study' },
    { src: IMG + '19.webp', nm: 'Grey ball', kind: 'Lighting reference' },
    { src: IMG + 'carousel_banner_full.webp', nm: 'Web carousel', kind: 'Banner system' }
  ];

  // Everything that can appear in the infinite mosaic, tagged by source.
  var MOSAIC = [];
  CLIENTS.forEach(function (c, ci) {
    c.files.forEach(function (f) { MOSAIC.push({ src: f, label: c.name, group: c.group, ci: ci }); });
  });
  STUDIES.forEach(function (s) { MOSAIC.push({ src: s.src, label: s.nm, group: 'Studies', ci: -1 }); });

  window.DATA = {
    IMG: IMG, VID: VID, POS: 'assets/posters/',
    WORLDS: WORLDS, STEPS: STEPS, CLIENTS: CLIENTS, STUDIES: STUDIES, MOSAIC: MOSAIC,
    byId: function (id) {
      for (var i = 0; i < WORLDS.length; i++) if (WORLDS[i].id === id) return WORLDS[i];
      return null;
    },
    nextWorld: function (id) {
      for (var i = 0; i < WORLDS.length; i++) if (WORLDS[i].id === id) return WORLDS[(i + 1) % WORLDS.length];
      return WORLDS[0];
    }
  };
})();
