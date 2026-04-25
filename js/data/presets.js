/* Default starter projects the user can pick from on the start screen. */

window.PRESET_PLANET = {
  name: 'Hidden Planet',
  baseType: 'svg',            // 'svg' | 'image'
  baseContent: 'PLANET_SVG',  // reference to global or data-url
  items: [
    { id: 'castle',   name: 'the castle',            x: 1062, y: 560,  r: 75 },
    { id: 'zeppelin', name: 'the cloud zeppelin',    x: 440,  y: 510,  r: 60 },
    { id: 'flower',   name: 'the big flower',        x: 820,  y: 1120, r: 70 },
    { id: 'flagger',  name: 'person planting a flag',x: 780,  y: 325,  r: 40 },
    { id: 'pointy',   name: 'someone in a pointy hat',x:860,  y: 360,  r: 28 },
    { id: 'star',     name: 'a five-pointed star',   x: 290,  y: 1110, r: 40 },
    { id: 'gear',     name: 'a clockwork gear',      x: 1140, y: 880,  r: 55 },
    { id: 'heart',    name: 'a tiny heart',          x: 1260, y: 432,  r: 18 },
    { id: 'note',     name: 'a musical note',        x: 506,  y: 494,  r: 18 },
    { id: 'house',    name: 'a cottage with a roof', x: 620,  y: 820,  r: 50 },
    { id: 'ohyeah',   name: '"oh yeah!"',            x: 848,  y: 600,  r: 30 },
    { id: 'jobq',     name: '"what is your job?"',   x: 722,  y: 868,  r: 45 },
    { id: 'pond',     name: 'a pond with lily pad',  x: 420,  y: 970,  r: 60 },
    { id: 'tree',     name: 'a tree',                x: 1200, y: 690,  r: 40 },
  ],
  surprises: [
    { id: 'bird',  name: 'bird flies across',   x: 700, y: 460, r: 30, sprite: 'bird',  anim: ['fly'],   sound: 'chirp' },
    { id: 'fish',  name: 'fish jumps',          x: 420, y: 970, r: 40, sprite: 'fish',  anim: ['jump'],  sound: 'splash' },
    { id: 'smoke', name: 'chimney smoke',       x: 436, y: 700, r: 20, sprite: 'smoke', anim: ['float'], sound: 'puff' },
    { id: 'mouse', name: 'mouse peeks out',     x: 404, y: 833, r: 18, sprite: 'mouse', anim: ['pop'],   sound: 'squeak' },
  ],
  drawings: [],   // array of SVG path strings drawn by user
  sprites:  [],   // array of user-imported image sprites
  customSounds: {}, // itemId -> data URL for custom sound
};

window.PRESET_SCAN = {
  name: 'Original Scan',
  baseType: 'image',
  baseContent: 'SCENE_JPG',
  // Since the scan is portrait ~900x1600, items are placed in % but we store
  // in the same 1600x1600 coordinate space. We'll translate through the
  // image's actual aspect.  For scan, we want to let it fill the world.
  items: [
    { id: 'castle',   name: 'the castle',           x: 800, y: 220, r: 120 },
    { id: 'hatperson',name: 'a person in a hat',    x: 190, y: 485, r: 85 },
    { id: 'heart',    name: 'a tiny heart',         x: 1180,y: 165, r: 40 },
    { id: 'check',    name: 'a checkmark',          x: 640, y: 60,  r: 45 },
    { id: 'plus',     name: 'a plus sign',          x: 855, y: 60,  r: 45 },
    { id: 'ohyeah',   name: '"oh yeah!"',           x: 830, y: 755, r: 70 },
    { id: 'diamonds', name: 'a row of diamonds',    x: 910, y: 990, r: 80 },
    { id: 'flower',   name: 'the big flower',       x: 800, y: 1420,r: 140 },
    { id: 'smallcloud',name:'a curly cloud face',   x: 175, y: 930, r: 60 },
    { id: 'question', name: 'a question in cursive',x: 710, y: 1125,r: 75 },
  ],
  surprises: [],
  drawings: [],
  sprites: [],
  customSounds: {},
};

window.PRESET_BLANK = {
  name: 'New Project',
  baseType: 'empty',
  baseContent: '',
  items: [],
  surprises: [],
  drawings: [],
  sprites: [],
  customSounds: {},
};
