// All dimensions are in scene units. 1 unit = MM_PER_UNIT millimetres, so one
// voxel (0.042 units) is 1.5 mm and a 17-voxel charm is about 25 mm across.
export const MM_PER_UNIT = 1.5 / 0.042;

export const MAX_CHARMS = 5;
export const MIN_LINKS = 4;
export const MAX_LINKS = 10;
export const SPREAD_MIN = 0.75;
export const SPREAD_MAX = 1.35;

// Real-world molded thickness (mm) for each thickness mode.
export const THICKNESS_MM = { 1: 3.0, 2: 4.5, 3: 6.0 };

export const CONFIG = Object.freeze({
  scaleVoxel: 0.042,

  // Master split ring (shared anchor for every charm)
  masterRingRadius: 0.30,
  masterRingWire: 0.02,

  // Wall peg the master ring hangs from (the pendulum pivot sits on the peg)
  pegRadius: 0.014,

  // Jump rings
  jumpRingRadius: 0.0544,
  jumpRingWire: 0.012,

  // Charm lug
  lugHoleRadius: 0.024,
  lugWall: 0.026,

  // Stadium chain links
  linkOuterL: 0.0832,
  linkOuterW: 0.0544,
  linkWireR: 0.0104,
  linkPitch: 0.056,
});

export const HARDWARE_MATS = {
  steel: { color: 0xe0e5ec, metalness: 0.96, roughness: 0.18 },
  gold: { color: 0xdfb445, metalness: 0.93, roughness: 0.22 },
  noir: { color: 0x454a57, metalness: 0.88, roughness: 0.32 },
};

export const FINISHES = ['steel', 'gold', 'noir'];

export const SCENE_BG = {
  light: { hex: 0xebebeb, css: '#EBEBEB' },
  dark: { hex: 0x212121, css: '#212121' },
};

// Lighting presets (an environment map supplies most of the metal reflections).
export const LIGHTING = {
  light: { ambient: 0.35, key: 1.7, rim: 1.1, env: 0.95 },
  dark: { ambient: 0.25, key: 1.9, rim: 1.7, env: 0.6 },
};

export const ADD_POOL = ['💎', '⭐', '🍕', '🎮', '🚀', '🦄', '🕹️', '⚡', '👑', '🌈'];
export const SURPRISE_POOL = ['🥷', '❤️‍🔥', '🛸', '🪐', '🦄', '🕹️', '🐉', '🍄', '🧿', '👑', '🧸', '🍦', '🏴‍☠️'];

export const CATEGORIES = ['all', 'faces', 'animals', 'food', 'objects', 'symbols'];

export const EMOJI_DATABASE = [
  // FACES & SMILEYS
  { char: '👾', cat: 'faces', tags: 'space invader alien retro 8bit monster' },
  { char: '😀', cat: 'faces', tags: 'grinning happy smile face' },
  { char: '😎', cat: 'faces', tags: 'cool sunglasses chill smile' },
  { char: '🥳', cat: 'faces', tags: 'party celebrate horn hat' },
  { char: '🤠', cat: 'faces', tags: 'cowboy sheriff hat smile' },
  { char: '😈', cat: 'faces', tags: 'devil purple horns evil smile' },
  { char: '🤖', cat: 'faces', tags: 'robot bot metal droid face' },
  { char: '👽', cat: 'faces', tags: 'alien ufo extraterrestrial' },
  { char: '🤡', cat: 'faces', tags: 'clown circus costume face' },
  { char: '👻', cat: 'faces', tags: 'ghost spooky halloween boo' },
  { char: '💀', cat: 'faces', tags: 'skull dead skeleton bone' },
  { char: '💩', cat: 'faces', tags: 'poop poo smile brown' },
  { char: '🤩', cat: 'faces', tags: 'star eyes starry excited' },
  { char: '😜', cat: 'faces', tags: 'winking tongue playful crazy' },
  { char: '🥶', cat: 'faces', tags: 'cold freeze blue ice' },
  { char: '😴', cat: 'faces', tags: 'sleeping zzz tired bed' },
  { char: '😷', cat: 'faces', tags: 'mask doctor sick face' },
  { char: '🤓', cat: 'faces', tags: 'nerd glasses smart geek' },

  // ANIMALS & CREATURES
  { char: '🐱', cat: 'animals', tags: 'cat kitty pet feline' },
  { char: '🐶', cat: 'animals', tags: 'dog puppy pet canine' },
  { char: '🦊', cat: 'animals', tags: 'fox wild animal orange' },
  { char: '🐻', cat: 'animals', tags: 'bear teddy brown animal' },
  { char: '🐼', cat: 'animals', tags: 'panda bear bamboo china' },
  { char: '🦁', cat: 'animals', tags: 'lion king mane safari' },
  { char: '🐸', cat: 'animals', tags: 'frog toad amphibian green' },
  { char: '🐵', cat: 'animals', tags: 'monkey ape jungle animal' },
  { char: '🦄', cat: 'animals', tags: 'unicorn magic horn fantasy' },
  { char: '🐙', cat: 'animals', tags: 'octopus squid ocean sea tentacle' },
  { char: '🦖', cat: 'animals', tags: 't-rex dinosaur jurassic dino' },
  { char: '🐝', cat: 'animals', tags: 'bee honey bumble insect' },
  { char: '🦉', cat: 'animals', tags: 'owl bird night wise' },
  { char: '🦋', cat: 'animals', tags: 'butterfly insect wings colorful' },

  // FOOD & DRINK
  { char: '🥑', cat: 'food', tags: 'avocado green healthy fruit' },
  { char: '🍕', cat: 'food', tags: 'pizza slice cheese crust fast food' },
  { char: '🍔', cat: 'food', tags: 'burger hamburger cheese beef fast food' },
  { char: '🍟', cat: 'food', tags: 'french fries potato fast food' },
  { char: '🌮', cat: 'food', tags: 'taco mexican food shell' },
  { char: '🍣', cat: 'food', tags: 'sushi japanese fish roll' },
  { char: '🍦', cat: 'food', tags: 'ice cream cone dessert soft' },
  { char: '🍩', cat: 'food', tags: 'doughnut donut dessert sprinkles' },
  { char: '☕', cat: 'food', tags: 'coffee cup hot cafe morning' },
  { char: '🍓', cat: 'food', tags: 'strawberry fruit sweet berry' },
  { char: '🍒', cat: 'food', tags: 'cherries fruit sweet red pair' },

  // OBJECTS & TOOLS
  { char: '💎', cat: 'objects', tags: 'diamond gem jewel crystal rich' },
  { char: '🎮', cat: 'objects', tags: 'gamepad video game controller play' },
  { char: '🚀', cat: 'objects', tags: 'rocket space ship blast launch' },
  { char: '⚡', cat: 'objects', tags: 'lightning bolt zap power electricity' },
  { char: '🔥', cat: 'objects', tags: 'fire flame hot lit burn' },
  { char: '✨', cat: 'objects', tags: 'sparkles stars shine magic' },
  { char: '⚔️', cat: 'objects', tags: 'crossed swords fight battle weapon' },
  { char: '🛡️', cat: 'objects', tags: 'shield protect defense armor' },
  { char: '🎸', cat: 'objects', tags: 'guitar music rock electric' },
  { char: '🕹️', cat: 'objects', tags: 'joystick arcade retro game' },
  { char: '🔑', cat: 'objects', tags: 'key unlock secret door lock' },

  // SYMBOLS & HEARTS
  { char: '⭐', cat: 'symbols', tags: 'star yellow rating favorite' },
  { char: '🌟', cat: 'symbols', tags: 'glowing star bright sparkle' },
  { char: '❤️', cat: 'symbols', tags: 'red heart love romance' },
  { char: '💖', cat: 'symbols', tags: 'sparkling heart love romance shiny' },
  { char: '💯', cat: 'symbols', tags: 'hundred score 100 percent perfect' },
  { char: '👑', cat: 'symbols', tags: 'crown king queen royal gold' },
  { char: '🍀', cat: 'symbols', tags: 'four leaf clover lucky irish green' },
  { char: '🪐', cat: 'symbols', tags: 'saturn planet ring cosmos space' },
  { char: '☀️', cat: 'symbols', tags: 'sun bright daylight sunny weather' },
];
