export const CONFIG = {
  bgMode: 'light',
  sound: true,
  scaleVoxel: 0.042,

  // Master Top Split Ring (Shared anchor for all cluster charms)
  masterRingRadius: 0.165,
  masterRingWire: 0.013,

  // Short Hardware Dimensions
  jumpRingRadius: 0.034,
  jumpRingWire: 0.0075,
  lugHoleRadius: 0.024,
  lugWall: 0.026,

  // Stadium Cable Link Dimensions (Interlocking 90° twists)
  linkOuterL: 0.052,
  linkOuterW: 0.034,
  linkWireR: 0.0065,
  linkPitch: 0.035, // Distance between adjacent link pivots

  clusterSpread: 1.0,
};

export const HARDWARE_MATS = {
  steel: { color: 0xe0e5ec, metalness: 0.96, roughness: 0.18 },
  gold:  { color: 0xdfb445, metalness: 0.93, roughness: 0.22 },
  noir:  { color: 0x22242b, metalness: 0.90, roughness: 0.28 }
};

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
  { char: '❤', cat: 'symbols', tags: 'red heart love romance' },
  { char: '💖', cat: 'symbols', tags: 'sparkling heart love romance shiny' },
  { char: '💯', cat: 'symbols', tags: 'hundred score 100 percent perfect' },
  { char: '👑', cat: 'symbols', tags: 'crown king queen royal gold' },
  { char: '🍀', cat: 'symbols', tags: 'four leaf clover lucky irish green' },
  { char: '🪐', cat: 'symbols', tags: 'saturn planet ring cosmos space' },
  { char: '☀️', cat: 'symbols', tags: 'sun bright daylight sunny weather' }
];
