/* game.js — Set Hunter: TCG Collector Roguelike  — Phase 2
   All configurable values live in CONFIG at the top.
   Systems: Perks · Skill Tree · NPCs · Auction · Pity · Commentary · Tutorial */

'use strict';

/* ════════════════════════════════════════════════════════════════
   CONFIG — change any value here; the whole game adjusts.
   ════════════════════════════════════════════════════════════════ */
const CONFIG = {
  packCost:        10,     // base price for 1 pack (bulk discount applied separately)
  instantSellRate: 0.50,   // fraction of market price for instant sell
  eventChance:     0.28,   // probability of a market/game event per day
  npcChanceStep:   0.33,   // day-to-day NPC encounter chance step
  // ── Dynamic base-price tuning ────────────────────────────────────
  // Target: instant-selling every card in a freshly opened pack returns
  // this fraction of the pack cost (e.g. 0.70 = 70 cents back per $1 spent).
  targetInstantSellReturn: 0.70,
  // Relative desirability weights per rarity.
  // commons punch below their pull-rate; legendaries punch well above.
  rarityPriceWeights: { common: 2, uncommon: 4, rare: 14, legendary: 80 },
  pityInterval:    20,     // packs without legendary → force one
  legendaryPerkIntervalRatio: 0.80, // Pity/Rainbow perk interval = round(pityInterval × this)
  packOdds: {
    // Slot 4: leg/rare/uncommon draw. Slot 5: always rare-or-better, leg chance here.
    slot4LegBase:  0.02,  slot4RaBase:  0.10,  slot5LegBase:  0.03,
    // Only slot4RaLucky is still used (Lucky Packs event boosts rare chance on slot 4).
    slot4RaLucky: 0.18,
  },
  marketDrift: { pull: 0.10, noise: 0.14 },
  auctionTargetEV:   0.65,  // E[daily auction revenue] = this × marketPrice, regardless of ask price
  baseAuctionSlots:  3,     // max simultaneous auction listings (base; Salesman skill adds more)
  skillStarCost:   [3, 4, 5],   // stars to unlock tier 1 / 2 / 3
  maxPriceHistory: 7,
};

/* ════════════════════════════════════════════════════════════════
   CARD SET DATA  — ordered by level (1 = easiest, 4 = hardest)
   Each set carries its own economy & grade thresholds.
   ════════════════════════════════════════════════════════════════ */
const CARD_SETS = [
  /* ── LEVEL 1 ── Home & Farm ── 40 cards ── */
  {
    id: 'home', name: 'Home & Farm', theme: '🏡',
    level: 1,
    packCost:        10,
    startBudget:     30,
    dailyAllowance:   5,
    gradeThresholds: { S: 15, A: 20, B: 25, C: 30 },
    cards: [
      /* ── Common (12) ── */
      { id: 'h_cat',       name: 'Cat',           emoji: '🐱', rarity: 'common',    flavor: 'Masters the house on day one.',               basePrice: 1  },
      { id: 'h_dog',       name: 'Dog',           emoji: '🐶', rarity: 'common',    flavor: 'Loyal beyond reason.',                        basePrice: 2  },
      { id: 'h_rabbit',    name: 'Rabbit',        emoji: '🐰', rarity: 'common',    flavor: 'Eats everything, judges nothing.',             basePrice: 1  },
      { id: 'h_hamster',   name: 'Hamster',       emoji: '🐹', rarity: 'common',    flavor: 'Runs all night, goes nowhere.',                basePrice: 1  },
      { id: 'h_mouse',     name: 'Mouse',         emoji: '🐭', rarity: 'common',    flavor: 'In every wall, watching.',                    basePrice: 1  },
      { id: 'h_goldfish',  name: 'Goldfish',      emoji: '🐟', rarity: 'common',    flavor: 'Three-second memory. Lifetime of grace.',     basePrice: 1  },
      { id: 'h_budgie',    name: 'Budgie',        emoji: '🐦', rarity: 'common',    flavor: 'Learned your name. Forgets the rest.',        basePrice: 2  },
      { id: 'h_guinea',    name: 'Guinea Pig',    emoji: '🐾', rarity: 'common',    flavor: 'Maximum cuteness, minimum effort.',            basePrice: 1  },
      { id: 'h_pigeon',    name: 'Pigeon',        emoji: '🕊️', rarity: 'common',    flavor: 'Delivered mail before email existed.',        basePrice: 1  },
      { id: 'h_sparrow',   name: 'Sparrow',       emoji: '🪶', rarity: 'common',    flavor: 'Everywhere at once, noticed by no one.',      basePrice: 1  },
      { id: 'h_snail',     name: 'Snail',         emoji: '🐌', rarity: 'common',    flavor: 'Carries its house at its own pace.',          basePrice: 1  },
      { id: 'h_cricket',   name: 'Cricket',       emoji: '🦗', rarity: 'common',    flavor: 'Sings whether you want it to or not.',        basePrice: 1  },
      /* ── Uncommon (14) ── */
      { id: 'h_cow',       name: 'Cow',           emoji: '🐄', rarity: 'uncommon',  flavor: 'Gave civilization milk and leather.',         basePrice: 5  },
      { id: 'h_pig',       name: 'Pig',           emoji: '🐷', rarity: 'uncommon',  flavor: 'Smarter than your dog.',                      basePrice: 6  },
      { id: 'h_goat',      name: 'Goat',          emoji: '🐐', rarity: 'uncommon',  flavor: 'Will eat the problem.',                       basePrice: 5  },
      { id: 'h_sheep',     name: 'Sheep',         emoji: '🐑', rarity: 'uncommon',  flavor: 'Follows, but in a comforting way.',           basePrice: 5  },
      { id: 'h_duck',      name: 'Duck',          emoji: '🦆', rarity: 'uncommon',  flavor: 'Waddles with unexpected dignity.',             basePrice: 5  },
      { id: 'h_donkey',    name: 'Donkey',        emoji: '🫏', rarity: 'uncommon',  flavor: 'Stubborn and right about it.',                basePrice: 6  },
      { id: 'h_rooster',   name: 'Rooster',       emoji: '🐓', rarity: 'uncommon',  flavor: 'Alarm clock with ambitions.',                 basePrice: 5  },
      { id: 'h_turkey',    name: 'Turkey',        emoji: '🦃', rarity: 'uncommon',  flavor: 'More proud than the situation warrants.',     basePrice: 5  },
      { id: 'h_rat',       name: 'Rat',           emoji: '🐀', rarity: 'uncommon',  flavor: 'Smarter than most give credit for.',          basePrice: 7  },
      { id: 'h_ferret',    name: 'Ferret',        emoji: '🦦', rarity: 'uncommon',  flavor: 'Chaotic neutral house animal.',               basePrice: 6  },
      { id: 'h_parrot',    name: 'Parrot',        emoji: '🦜', rarity: 'uncommon',  flavor: 'Repeats everything. Every. Thing.',           basePrice: 8  },
      { id: 'h_hedgehog',  name: 'Hedgehog',      emoji: '🦔', rarity: 'uncommon',  flavor: 'Prickly exterior, warm heart.',               basePrice: 6  },
      { id: 'h_chicken',   name: 'Chicken',       emoji: '🐔', rarity: 'uncommon',  flavor: 'Came before the egg. Probably.',              basePrice: 5  },
      { id: 'h_frog',      name: 'Frog',          emoji: '🐸', rarity: 'uncommon',  flavor: "The garden pond's mascot.",                  basePrice: 6  },
      /* ── Rare (10) ── */
      { id: 'h_horse',     name: 'Horse',         emoji: '🐴', rarity: 'rare',      flavor: 'Carried civilization on its back.',           basePrice: 22 },
      { id: 'h_peacock',   name: 'Peacock',       emoji: '🦚', rarity: 'rare',      flavor: 'Performance art with feathers.',              basePrice: 24 },
      { id: 'h_swan',      name: 'Swan',          emoji: '🦢', rarity: 'rare',      flavor: 'Graceful above. Fury below.',                 basePrice: 20 },
      { id: 'h_llama',     name: 'Llama',         emoji: '🦙', rarity: 'rare',      flavor: 'Will spit if disrespected.',                  basePrice: 20 },
      { id: 'h_bee',       name: 'Bee',           emoji: '🐝', rarity: 'rare',      flavor: 'Pollinates a third of your food.',            basePrice: 22 },
      { id: 'h_goose',     name: 'Goose',         emoji: '🪿', rarity: 'rare',      flavor: 'Feared more than it should be.',              basePrice: 20 },
      { id: 'h_collie',    name: 'Border Collie', emoji: '🐕', rarity: 'rare',      flavor: 'Herds anything that moves.',                  basePrice: 24 },
      { id: 'h_owl',       name: 'Barn Owl',      emoji: '🦉', rarity: 'rare',      flavor: 'Silent hunter of the hayloft.',               basePrice: 22 },
      { id: 'h_alpaca',    name: 'Alpaca',        emoji: '🐑', rarity: 'rare',      flavor: 'Woolly, gentle, photogenic.',                 basePrice: 20 },
      { id: 'h_fox',       name: 'Fox',           emoji: '🦊', rarity: 'rare',      flavor: 'Too clever for its own good.',                basePrice: 24 },
      /* ── Legendary (4) ── */
      { id: 'h_bull',      name: 'Bull',          emoji: '🐂', rarity: 'legendary', flavor: 'Symbol of power in every civilization.',      basePrice: 80 },
      { id: 'h_stallion',  name: 'Stallion',      emoji: '🐎', rarity: 'legendary', flavor: 'Born to run, impossible to tame.',            basePrice: 88 },
      { id: 'h_persian',   name: 'Persian Cat',   emoji: '🐈', rarity: 'legendary', flavor: 'Judges you from a higher plane.',             basePrice: 82 },
      { id: 'h_greyhound', name: 'Greyhound',     emoji: '🐕‍🦺', rarity: 'legendary', flavor: 'Fastest dog alive. Gentlest at rest.',     basePrice: 85 },
    ],
  },

  /* ── LEVEL 2 ── Aquatic World ── 40 cards ── */
  {
    id: 'aquatic', name: 'Aquatic World', theme: '🌊',
    level: 2,
    packCost:        12,
    startBudget:     40,
    dailyAllowance:   7,
    gradeThresholds: { S: 15, A: 20, B: 25, C: 30 },
    cards: [
      /* ── Common (12) ── */
      { id: 'w_jellyfish',   name: 'Jellyfish',     emoji: '🪼', rarity: 'common',    flavor: 'No brain. No problem.',                       basePrice: 1  },
      { id: 'w_crab',        name: 'Crab',          emoji: '🦀', rarity: 'common',    flavor: 'Sideways, always.',                           basePrice: 2  },
      { id: 'w_starfish',    name: 'Starfish',      emoji: '⭐', rarity: 'common',    flavor: 'Regrows what it loses.',                      basePrice: 1  },
      { id: 'w_clownfish',   name: 'Clownfish',     emoji: '🐠', rarity: 'common',    flavor: 'Home is the anemone.',                        basePrice: 2  },
      { id: 'w_seahorse',    name: 'Seahorse',      emoji: '🌀', rarity: 'common',    flavor: 'The father carries the young.',               basePrice: 2  },
      { id: 'w_shrimp',      name: 'Shrimp',        emoji: '🦐', rarity: 'common',    flavor: 'Small but essential.',                        basePrice: 1  },
      { id: 'w_lobster',     name: 'Lobster',       emoji: '🦞', rarity: 'common',    flavor: 'Biologically immortal (sort of).',            basePrice: 2  },
      { id: 'w_mussel',      name: 'Mussel',        emoji: '🐚', rarity: 'common',    flavor: 'Filters the sea clean.',                      basePrice: 1  },
      { id: 'w_puffin',      name: 'Puffin',        emoji: '🐦‍⬛', rarity: 'common',  flavor: 'Tuxedo bird of the north.',                  basePrice: 2  },
      { id: 'w_anchovy',     name: 'Anchovy',       emoji: '🐟', rarity: 'common',    flavor: 'Holds up the entire food chain.',             basePrice: 1  },
      { id: 'w_seaurchin',   name: 'Sea Urchin',    emoji: '🌑', rarity: 'common',    flavor: "The ocean's spiny sphere.",                  basePrice: 1  },
      { id: 'w_flyingfish',  name: 'Flying Fish',   emoji: '✈️',  rarity: 'common',    flavor: 'Briefly became a bird.',                     basePrice: 2  },
      /* ── Uncommon (14) ── */
      { id: 'w_dolphin',     name: 'Dolphin',       emoji: '🐬', rarity: 'uncommon',  flavor: 'Smarter than most people you know.',          basePrice: 6  },
      { id: 'w_turtle',      name: 'Sea Turtle',    emoji: '🐢', rarity: 'uncommon',  flavor: 'Navigates by Earth\'s magnetic field.',       basePrice: 7  },
      { id: 'w_octopus',     name: 'Octopus',       emoji: '🐙', rarity: 'uncommon',  flavor: 'Eight arms, three hearts, nine brains.',      basePrice: 8  },
      { id: 'w_puffer',      name: 'Puffer Fish',   emoji: '🐡', rarity: 'uncommon',  flavor: 'Inflates on command.',                        basePrice: 6  },
      { id: 'w_penguin',     name: 'Penguin',       emoji: '🐧', rarity: 'uncommon',  flavor: 'Tuxedoed torpedo of the south.',              basePrice: 7  },
      { id: 'w_seal',        name: 'Seal',          emoji: '🦭', rarity: 'uncommon',  flavor: "The ocean's puppy.",                         basePrice: 6  },
      { id: 'w_otter',       name: 'Otter',         emoji: '🦦', rarity: 'uncommon',  flavor: 'Holds hands while sleeping.',                 basePrice: 7  },
      { id: 'w_salmon',      name: 'Salmon',        emoji: '🎣', rarity: 'uncommon',  flavor: 'Swims upstream to be born again.',            basePrice: 5  },
      { id: 'w_squid',       name: 'Squid',         emoji: '🦑', rarity: 'uncommon',  flavor: 'Squirts ink, then vanishes.',                 basePrice: 6  },
      { id: 'w_barracuda',   name: 'Barracuda',     emoji: '🗡️', rarity: 'uncommon',  flavor: 'Silver missile of the reef.',                 basePrice: 7  },
      { id: 'w_walrus',      name: 'Walrus',        emoji: '🦷', rarity: 'uncommon',  flavor: 'Tusked and unbothered.',                      basePrice: 7  },
      { id: 'w_piranha',     name: 'Piranha',       emoji: '🩸', rarity: 'uncommon',  flavor: 'Strips a carcass in minutes.',                basePrice: 6  },
      { id: 'w_eel',         name: 'Moray Eel',     emoji: '〰️', rarity: 'uncommon',  flavor: 'Hides in rock, strikes from nowhere.',        basePrice: 8  },
      { id: 'w_ray',         name: 'Stingray',      emoji: '🪁', rarity: 'uncommon',  flavor: 'Glides like a shadow below the surface.',     basePrice: 6  },
      /* ── Rare (10) ── */
      { id: 'w_shark',       name: 'Shark',         emoji: '🦈', rarity: 'rare',      flavor: 'Top of the chain. 450 million years.',        basePrice: 22 },
      { id: 'w_narwhal',     name: 'Narwhal',       emoji: '🦄', rarity: 'rare',      flavor: 'The real unicorn.',                           basePrice: 24 },
      { id: 'w_orca',        name: 'Orca',          emoji: '🐋', rarity: 'rare',      flavor: 'Hunts great whites for sport.',               basePrice: 28 },
      { id: 'w_hammer',      name: 'Hammerhead',    emoji: '🔨', rarity: 'rare',      flavor: 'Sees in 360 degrees.',                        basePrice: 22 },
      { id: 'w_sword',       name: 'Swordfish',     emoji: '⚔️',  rarity: 'rare',      flavor: 'Bills through anything.',                     basePrice: 20 },
      { id: 'w_manta',       name: 'Manta Ray',     emoji: '🦅', rarity: 'rare',      flavor: 'Filters a ton of plankton daily.',            basePrice: 22 },
      { id: 'w_giantsquid',  name: 'Giant Squid',   emoji: '👾', rarity: 'rare',      flavor: 'Lives where sunlight never reaches.',         basePrice: 24 },
      { id: 'w_anaconda',    name: 'Anaconda',      emoji: '🐍', rarity: 'rare',      flavor: 'The river\'s largest predator.',              basePrice: 26 },
      { id: 'w_riverdolphin',name: 'River Dolphin', emoji: '🌸', rarity: 'rare',      flavor: 'Pink and nearly blind — navigates by sonar.', basePrice: 24 },
      { id: 'w_sealion',     name: 'Sea Lion',      emoji: '🦁', rarity: 'rare',      flavor: 'Acrobat of the sea.',                         basePrice: 20 },
      /* ── Legendary (4) ── */
      { id: 'w_bluewhale',   name: 'Blue Whale',    emoji: '🐳', rarity: 'legendary', flavor: 'Largest animal to ever exist.',               basePrice: 85 },
      { id: 'w_anglerfish',  name: 'Anglerfish',    emoji: '😈', rarity: 'legendary', flavor: 'Nightmare of the deep with a built-in lamp.', basePrice: 90 },
      { id: 'w_whaleshark',  name: 'Whale Shark',   emoji: '🔵', rarity: 'legendary', flavor: 'Biggest fish. Only eats plankton.',           basePrice: 80 },
      { id: 'w_polarbear',   name: 'Polar Bear',    emoji: '🐻‍❄️', rarity: 'legendary', flavor: 'Apex of the arctic sea.',                  basePrice: 88 },
    ],
  },

  /* ── LEVEL 3 ── Desert ── 40 cards ── */
  {
    id: 'desert', name: 'Desert', theme: '🏜️',
    level: 3,
    packCost:        15,
    startBudget:     60,
    dailyAllowance:   9,
    gradeThresholds: { S: 15, A: 20, B: 25, C: 30 },
    cards: [
      /* ── Common (12) ── */
      { id: 'd_scorpion',   name: 'Scorpion',       emoji: '🦂', rarity: 'common',    flavor: 'Ancient, armored, patient.',                  basePrice: 2  },
      { id: 'd_beetle',     name: 'Beetle',         emoji: '🪲', rarity: 'common',    flavor: 'Navigates by the Milky Way.',                 basePrice: 1  },
      { id: 'd_lizard',     name: 'Lizard',         emoji: '🦎', rarity: 'common',    flavor: 'Soaks up the sun, nothing more.',             basePrice: 1  },
      { id: 'd_locust',     name: 'Locust',         emoji: '🦗', rarity: 'common',    flavor: 'One becomes a million.',                      basePrice: 1  },
      { id: 'd_moth',       name: 'Moth',           emoji: '🦋', rarity: 'common',    flavor: 'Navigates by moonlight alone.',               basePrice: 1  },
      { id: 'd_gecko',      name: 'Gecko',          emoji: '🌙', rarity: 'common',    flavor: "Sticks to anything. Even your ceiling.",      basePrice: 2  },
      { id: 'd_spider',     name: 'Spider',         emoji: '🕷️', rarity: 'common',    flavor: 'Eight-legged architect.',                     basePrice: 1  },
      { id: 'd_snake',      name: 'Snake',          emoji: '🐍', rarity: 'common',    flavor: 'Moves without legs.',                         basePrice: 2  },
      { id: 'd_ant',        name: 'Ant',            emoji: '🐜', rarity: 'common',    flavor: 'Colony brain, individual brawn.',             basePrice: 1  },
      { id: 'd_centipede',  name: 'Centipede',      emoji: '🐛', rarity: 'common',    flavor: 'One hundred legs, one purpose.',              basePrice: 1  },
      { id: 'd_jerboa',     name: 'Jerboa',         emoji: '🐹', rarity: 'common',    flavor: 'Kangaroo-mouse of the desert.',               basePrice: 2  },
      { id: 'd_sandgrouse', name: 'Sandgrouse',     emoji: '🐦', rarity: 'common',    flavor: 'Flies 200km for a single drink.',             basePrice: 1  },
      /* ── Uncommon (14) ── */
      { id: 'd_camel',      name: 'Camel',          emoji: '🐪', rarity: 'uncommon',  flavor: 'Crosses 1000km without a drop.',              basePrice: 7  },
      { id: 'd_fennec',     name: 'Fennec Fox',     emoji: '🦊', rarity: 'uncommon',  flavor: 'Big ears, tiny body, huge personality.',      basePrice: 6  },
      { id: 'd_sandcat',    name: 'Sand Cat',       emoji: '🐱', rarity: 'uncommon',  flavor: 'The Sahara\'s miniature lion.',               basePrice: 7  },
      { id: 'd_tortoise',   name: 'Tortoise',       emoji: '🐢', rarity: 'uncommon',  flavor: 'Slow enough to outlive everyone.',            basePrice: 6  },
      { id: 'd_rattlesnake',name: 'Rattlesnake',    emoji: '🔔', rarity: 'uncommon',  flavor: 'Warns before it strikes.',                    basePrice: 7  },
      { id: 'd_monitor',    name: 'Monitor Lizard', emoji: '🦖', rarity: 'uncommon',  flavor: "Komodo's smaller, equally mean cousin.",      basePrice: 7  },
      { id: 'd_roadrunner', name: 'Roadrunner',     emoji: '💨', rarity: 'uncommon',  flavor: 'Sprints faster than it flies.',               basePrice: 5  },
      { id: 'd_bat',        name: 'Bat',            emoji: '🦇', rarity: 'uncommon',  flavor: 'Navigates by sound alone.',                   basePrice: 6  },
      { id: 'd_coyote',     name: 'Coyote',         emoji: '🐕', rarity: 'uncommon',  flavor: 'Survived the concrete jungle too.',           basePrice: 6  },
      { id: 'd_armadillo',  name: 'Armadillo',      emoji: '🛡️', rarity: 'uncommon',  flavor: 'Self-contained tank.',                        basePrice: 5  },
      { id: 'd_falcon',     name: 'Falcon',         emoji: '🦅', rarity: 'uncommon',  flavor: 'Fastest animal alive in a dive.',             basePrice: 8  },
      { id: 'd_aardwolf',   name: 'Aardwolf',       emoji: '🦡', rarity: 'uncommon',  flavor: 'Eats 250,000 termites a night.',              basePrice: 6  },
      { id: 'd_vulture',    name: 'Vulture',        emoji: '🪶', rarity: 'uncommon',  flavor: 'Cleans up what lions leave behind.',          basePrice: 6  },
      { id: 'd_hyena',      name: 'Striped Hyena',  emoji: '🐺', rarity: 'uncommon',  flavor: 'The desert\'s misunderstood scavenger.',      basePrice: 7  },
      /* ── Rare (10) ── */
      { id: 'd_oryx',       name: 'Oryx',           emoji: '🦌', rarity: 'rare',      flavor: 'Inspired the unicorn legend.',                basePrice: 22 },
      { id: 'd_caracal',    name: 'Caracal',        emoji: '🐈', rarity: 'rare',      flavor: 'Tufted ears. Olympic vertical jump.',         basePrice: 24 },
      { id: 'd_cobra',      name: 'Cobra',          emoji: '👑', rarity: 'rare',      flavor: 'Hoods up when it means business.',            basePrice: 22 },
      { id: 'd_hornedviper',name: 'Horned Viper',   emoji: '🌵', rarity: 'rare',      flavor: 'Buries in sand, strikes upward.',             basePrice: 20 },
      { id: 'd_eagleowl',   name: 'Eagle Owl',      emoji: '🦉', rarity: 'rare',      flavor: 'Wingspan of an eagle, silence of the night.', basePrice: 22 },
      { id: 'd_thornydevil',name: 'Thorny Devil',   emoji: '🌪️', rarity: 'rare',      flavor: 'Drinks through its skin.',                    basePrice: 20 },
      { id: 'd_dingo',      name: 'Dingo',          emoji: '🐕‍🦺', rarity: 'rare',   flavor: 'The wild dog civilization forgot.',           basePrice: 22 },
      { id: 'd_tarantula',  name: 'Tarantula',      emoji: '🕸️', rarity: 'rare',      flavor: 'Docile giant. Unless cornered.',              basePrice: 20 },
      { id: 'd_gilamonster',name: 'Gila Monster',   emoji: '🟠', rarity: 'rare',      flavor: 'Venomous and completely unbothered.',         basePrice: 24 },
      { id: 'd_pronghorn',  name: 'Pronghorn',      emoji: '🏃', rarity: 'rare',      flavor: "Second-fastest land animal. Evolved to outrun extinct cheetahs.", basePrice: 22 },
      /* ── Legendary (4) ── */
      { id: 'd_komodo',     name: 'Komodo Dragon',  emoji: '🦖', rarity: 'legendary', flavor: 'Largest lizard. Venomous. Ancient.',          basePrice: 85 },
      { id: 'd_kingcobra',  name: 'King Cobra',     emoji: '💀', rarity: 'legendary', flavor: 'Longest venomous snake. Commands respect.',   basePrice: 88 },
      { id: 'd_jaguar',     name: 'Jaguar',         emoji: '🐆', rarity: 'legendary', flavor: "America's apex predator in the heat.",        basePrice: 82 },
      { id: 'd_barbary',    name: 'Barbary Lion',   emoji: '🦁', rarity: 'legendary', flavor: 'The lost king of North Africa.',              basePrice: 90 },
    ],
  },

  /* ── LEVEL 4 ── African Savanna ── 40 cards ── */
  {
    id: 'savanna', name: 'African Savanna', theme: '🌾',
    level: 4,
    packCost:        20,
    startBudget:     70,
    dailyAllowance:   12,
    gradeThresholds: { S: 15, A: 20, B: 25, C: 30 },
    cards: [
      /* ── Common (12) ── */
      { id: 's_impala',     name: 'Impala',         emoji: '🦌', rarity: 'common',    flavor: "The lion's fast food.",                       basePrice: 2  },
      { id: 's_warthog',    name: 'Warthog',        emoji: '🐗', rarity: 'common',    flavor: 'Ugliest face, toughest attitude.',            basePrice: 1  },
      { id: 's_hornbill',   name: 'Hornbill',       emoji: '🐦‍⬛', rarity: 'common',  flavor: 'Beak like a banana.',                        basePrice: 2  },
      { id: 's_jackal',     name: 'Jackal',         emoji: '🦊', rarity: 'common',    flavor: 'Scavenges smart, not hard.',                  basePrice: 1  },
      { id: 's_hare',       name: 'Hare',           emoji: '🐇', rarity: 'common',    flavor: 'Not a rabbit. Much faster.',                  basePrice: 1  },
      { id: 's_dungbeetle', name: 'Dung Beetle',    emoji: '🪲', rarity: 'common',    flavor: 'Navigates by the Milky Way.',                 basePrice: 1  },
      { id: 's_stork',      name: 'Stork',          emoji: '🕊️', rarity: 'common',    flavor: 'Migrates 10,000km twice a year.',             basePrice: 2  },
      { id: 's_mongoose',   name: 'Mongoose',       emoji: '🦡', rarity: 'common',    flavor: 'Immune to cobra venom.',                      basePrice: 2  },
      { id: 's_porcupine',  name: 'Porcupine',      emoji: '🦔', rarity: 'common',    flavor: 'Every quill a warning.',                      basePrice: 1  },
      { id: 's_guineafowl', name: 'Guinea Fowl',    emoji: '🐓', rarity: 'common',    flavor: "The savanna's alarm system.",                 basePrice: 1  },
      { id: 's_weaver',     name: 'Weaver Bird',    emoji: '🪺', rarity: 'common',    flavor: 'Builds the most intricate nests on earth.',   basePrice: 2  },
      { id: 's_oxpecker',   name: 'Oxpecker',       emoji: '🐦', rarity: 'common',    flavor: 'Rides rhinos and hippos for a living.',       basePrice: 1  },
      /* ── Uncommon (14) ── */
      { id: 's_zebra',      name: 'Zebra',          emoji: '🦓', rarity: 'uncommon',  flavor: 'No two stripes alike.',                       basePrice: 7  },
      { id: 's_wildebeest', name: 'Wildebeest',     emoji: '🐃', rarity: 'uncommon',  flavor: '2 million strong. Always moving.',            basePrice: 6  },
      { id: 's_hyena',      name: 'Spotted Hyena',  emoji: '🐺', rarity: 'uncommon',  flavor: 'Laughs last. Always.',                        basePrice: 7  },
      { id: 's_baboon',     name: 'Baboon',         emoji: '🐒', rarity: 'uncommon',  flavor: 'Politics and drama in equal measure.',        basePrice: 7  },
      { id: 's_ostrich',    name: 'Ostrich',        emoji: '🦤', rarity: 'uncommon',  flavor: 'Fastest bird on land. Kicks like a truck.',   basePrice: 6  },
      { id: 's_wilddog',    name: 'Wild Dog',       emoji: '🐕', rarity: 'uncommon',  flavor: 'Hunts in perfect coordination.',              basePrice: 8  },
      { id: 's_buffalo',    name: 'Buffalo',        emoji: '🦬', rarity: 'uncommon',  flavor: 'Gores more people than lions do.',            basePrice: 7  },
      { id: 's_aardvark',   name: 'Aardvark',       emoji: '🐾', rarity: 'uncommon',  flavor: 'Eats 50,000 ants a night.',                   basePrice: 6  },
      { id: 's_crane',      name: 'Crane',          emoji: '🦢', rarity: 'uncommon',  flavor: 'Dances before it mates.',                     basePrice: 5  },
      { id: 's_eland',      name: 'Eland',          emoji: '🐂', rarity: 'uncommon',  flavor: 'Largest antelope. Still impossibly agile.',   basePrice: 6  },
      { id: 's_gazelle',    name: 'Gazelle',        emoji: '🏃', rarity: 'uncommon',  flavor: "The cheetah's favorite challenge.",           basePrice: 7  },
      { id: 's_gorilla',    name: 'Gorilla',        emoji: '🦍', rarity: 'uncommon',  flavor: 'Commands without speaking.',                  basePrice: 8  },
      { id: 's_flamingo',   name: 'Flamingo',       emoji: '🦩', rarity: 'uncommon',  flavor: 'Pink from the shrimp it eats.',               basePrice: 7  },
      { id: 's_meerkat',    name: 'Meerkat',        emoji: '🧍', rarity: 'uncommon',  flavor: 'Stands watch so the others can eat.',         basePrice: 6  },
      /* ── Rare (10) ── */
      { id: 's_giraffe',    name: 'Giraffe',        emoji: '🦒', rarity: 'rare',      flavor: 'Tallest animal on land.',                     basePrice: 24 },
      { id: 's_hippo',      name: 'Hippo',          emoji: '🦛', rarity: 'rare',      flavor: 'Most dangerous animal in Africa.',            basePrice: 22 },
      { id: 's_leopard',    name: 'Leopard',        emoji: '🐆', rarity: 'rare',      flavor: 'Hides in trees, drops from above.',           basePrice: 24 },
      { id: 's_cheetah',    name: 'Cheetah',        emoji: '💨', rarity: 'rare',      flavor: '0 to 70mph in 3 seconds.',                    basePrice: 26 },
      { id: 's_rhino',      name: 'Rhino',          emoji: '🦏', rarity: 'rare',      flavor: 'Horned and half-blind. Still unstoppable.',   basePrice: 22 },
      { id: 's_eagle',      name: 'Eagle',          emoji: '🦅', rarity: 'rare',      flavor: 'Snatches prey from the sky.',                 basePrice: 22 },
      { id: 's_panther',    name: 'Black Panther',  emoji: '🐈‍⬛', rarity: 'rare',   flavor: 'A leopard turned shadow.',                   basePrice: 24 },
      { id: 's_chimp',      name: 'Chimpanzee',     emoji: '🦍', rarity: 'rare',      flavor: '98.7% human DNA.',                            basePrice: 20 },
      { id: 's_python',     name: 'Python',         emoji: '🐍', rarity: 'rare',      flavor: 'Constricts the wildebeest whole.',            basePrice: 22 },
      { id: 's_secretary',  name: 'Secretary Bird', emoji: '🦚', rarity: 'rare',      flavor: 'Stomps snakes to death with its feet.',       basePrice: 24 },
      /* ── Legendary (4) ── */
      { id: 's_elephant',   name: 'Elephant',       emoji: '🐘', rarity: 'legendary', flavor: 'Grieves its dead. Remembers everything.',     basePrice: 88 },
      { id: 's_lion',       name: 'Lion',           emoji: '🦁', rarity: 'legendary', flavor: 'Rules by presence alone.',                    basePrice: 90 },
      { id: 's_nilecrocodile', name: 'Nile Crocodile', emoji: '🐊', rarity: 'legendary', flavor: 'Unchanged for 70 million years.',          basePrice: 85 },
      { id: 's_blackmamba', name: 'Black Mamba',    emoji: '💀', rarity: 'legendary', flavor: 'Most feared snake in Africa. For good reason.', basePrice: 88 },
    ],
  },
];

/* ════════════════════════════════════════════════════════════════
   ACE CARDS — extinct / prehistoric, super-rare 6th-slot pulls
   ════════════════════════════════════════════════════════════════ */
const ACE_CARDS = {
  home: [
    { id:'h_aurochs',    name:'Aurochs',           emoji:'🐂', rarity:'ace', setId:'home',    flavor:'Ancestor of all domestic cattle. Last seen 1627.' },
    { id:'h_tarpan',     name:'Tarpan',             emoji:'🐴', rarity:'ace', setId:'home',    flavor:'Wild horse of Europe, ancestor of all breeds. Extinct 1909.' },
    { id:'h_dodo',       name:'Dodo',               emoji:'🦤', rarity:'ace', setId:'home',    flavor:'Flightless and fearless. Gone by 1681.' },
    { id:'h_mammoth',    name:'Woolly Mammoth',     emoji:'🦣', rarity:'ace', setId:'home',    flavor:'Roamed the frozen north. Last holdouts vanished 1650 BCE.' },
    { id:'h_megaloceros',name:'Irish Elk',          emoji:'🦌', rarity:'ace', setId:'home',    flavor:'Largest deer ever. Antlers spanning 3.7 metres.' },
  ],
  aquatic: [
    { id:'w_megalodon',  name:'Megalodon',          emoji:'🦈', rarity:'ace', setId:'aquatic', flavor:'18 metres of apex predator. Teeth the size of your hand.' },
    { id:'w_livyatan',   name:'Livyatan',           emoji:'🐋', rarity:'ace', setId:'aquatic', flavor:'The prehistoric sperm whale that hunted megalodons.' },
    { id:'w_dunkle',     name:'Dunkleosteus',       emoji:'🐟', rarity:'ace', setId:'aquatic', flavor:'Armored fish with a bite force of 8,000 lbs. No soft tissue survived.' },
    { id:'w_mosasaurus', name:'Mosasaurus',         emoji:'🦕', rarity:'ace', setId:'aquatic', flavor:'Sea monster of the Cretaceous. Entirely real.' },
    { id:'w_stellers',   name:"Steller's Sea Cow",  emoji:'🐄', rarity:'ace', setId:'aquatic', flavor:'8 metres long. Hunted to extinction in just 27 years.' },
  ],
  desert: [
    { id:'d_quagga',     name:'Quagga',             emoji:'🦓', rarity:'ace', setId:'desert',  flavor:'Half zebra, half horse. Last died in captivity 1883.' },
    { id:'d_atlasbear',  name:'Atlas Bear',         emoji:'🐻', rarity:'ace', setId:'desert',  flavor:"North Africa's only native bear. Wiped out by Roman arenas." },
    { id:'d_woollyrhino',name:'Woolly Rhinoceros',  emoji:'🦏', rarity:'ace', setId:'desert',  flavor:'Covered in thick fur. Hunted to extinction by early humans.' },
    { id:'d_sivatherium',name:'Sivatherium',        emoji:'🦒', rarity:'ace', setId:'desert',  flavor:'Giant prehistoric giraffe with enormous moose-like horns.' },
    { id:'d_caspiantiger',name:'Caspian Tiger',     emoji:'🐯', rarity:'ace', setId:'desert',  flavor:"Third largest tiger subspecies. Declared extinct in the 1970s." },
  ],
  savanna: [
    { id:'s_smilodon',   name:'Smilodon',           emoji:'🐱', rarity:'ace', setId:'savanna', flavor:"Saber-tooth cat with 30cm canines. America's apex predator." },
    { id:'s_thylacine',  name:'Thylacine',          emoji:'🦊', rarity:'ace', setId:'savanna', flavor:'The Tasmanian Tiger. Last confirmed 1936. Maybe not.' },
    { id:'s_dinofelis',  name:'Dinofelis',          emoji:'🐆', rarity:'ace', setId:'savanna', flavor:'The false saber-tooth that hunted early humans in Africa.' },
    { id:'s_direwolf',   name:'Dire Wolf',          emoji:'🐺', rarity:'ace', setId:'savanna', flavor:'Larger than the grey wolf. Vanished ~9,500 years ago.' },
    { id:'s_giganto',    name:'Gigantopithecus',    emoji:'🦍', rarity:'ace', setId:'savanna', flavor:'3 metres tall. The real King Kong. Gone 300,000 years ago.' },
  ],
};
const ALL_ACES = Object.values(ACE_CARDS).flat();

/* ── Ace persistence ─────────────────────────────────────────── */
const ACE_STORAGE_RESET_VERSION = 4;

function resetAceIdentityStorageOnce() {
  try {
    const key = 'setHunterAceResetVersion';
    const seen = parseInt(localStorage.getItem(key) || '0', 10);
    if (seen >= ACE_STORAGE_RESET_VERSION) return;
    [
      'setHunterAces',
      'setHunterLastKnownAces',
      'setHunterAceNewsPrimed',
      'setHunterPlayerName',
      'setHunterUUID',
    ].forEach(k => localStorage.removeItem(k));
    localStorage.setItem(key, String(ACE_STORAGE_RESET_VERSION));
  } catch {}
}

resetAceIdentityStorageOnce();

function loadAces() {
  try { return JSON.parse(localStorage.getItem('setHunterAces') || '{}'); }
  catch { return {}; }
}
function saveAces(a) { localStorage.setItem('setHunterAces', JSON.stringify(a)); }
function getAceCount(id) { return loadAces()[id] || 0; }

/* ── Player identity ─────────────────────────────────────────── */
function getPlayerName() {
  return localStorage.getItem('setHunterPlayerName') || '';
}
function setPlayerName(n) {
  const clean = String(n).replace(/[^a-zA-Z0-9_ \-]/g, '').slice(0, 20).trim();
  const final = clean || `Player_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  localStorage.setItem('setHunterPlayerName', final);
  return final;
}
function getPlayerUUID() {
  let u = localStorage.getItem('setHunterUUID');
  if (!u) { u = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem('setHunterUUID', u); }
  return u;
}

/* ════════════════════════════════════════════════════════════════
   GAME EVENTS
   ════════════════════════════════════════════════════════════════ */
const EVENTS = [
  {
    id: 'flash_sale', icon: '⚡', title: 'Flash Sale!', ambState: 'hype',
    buildDesc: () => 'Pack prices reduced by 30% today!',
    apply(G) { G.packDiscount = 0.70; },
    remove(G) { G.packDiscount = 1.0; },
  },
  {
    id: 'market_crash', icon: '📉', title: 'Market Crash!', ambState: 'tense', negative: true,
    buildDesc: () => 'All singles prices drop 35% today!',
    apply(G) {
      G.currentSet.cards.forEach(c => {
        G.market.set(c.id, Math.max(1, Math.round((G.market.get(c.id) || c.basePrice) * 0.65)));
      });
    },
    remove(G) {},
  },
  {
    id: 'hype_spike', icon: '📈', title: 'Hype Spike!', ambState: 'tense', negative: true,
    buildDesc(G) {
      const card = G.currentSet.cards.find(c => c.id === G.hypeCard);
      return card ? `${card.name} surges to 3× price!` : 'A rare card triples in value!';
    },
    apply(G) {
      const missing = G.currentSet.cards.filter(c => (G.collection.get(c.id) || 0) === 0);
      const pool = (G.eventShield && missing.length) ? missing : G.currentSet.cards;
      const card = pool[Math.floor(Math.random() * pool.length)];
      G.hypeCard = card.id;
      G.market.set(card.id, Math.round((G.market.get(card.id) || card.basePrice) * 3));
    },
    remove(G) { G.hypeCard = null; },
  },
  {
    id: 'lucky_packs', icon: '🍀', title: 'Lucky Packs!', ambState: 'hype',
    buildDesc: () => 'Legendary drop rate doubled today!',
    apply(G) { G.luckyPacks = true; },
    remove(G) { G.luckyPacks = false; },
  },
  {
    id: 'free_pack', icon: '🎁', title: 'Free Pack!', ambState: 'hype',
    buildDesc: () => 'A mysterious sponsor gifts you a free pack!',
    apply(G) { G.freePacks = (G.freePacks || 0) + 1; },
    remove(G) {},
  },
  {
    id: 'fair', icon: '🎪', title: "Collector's Fair!", ambState: 'hype',
    buildDesc: () => 'All Rare & Legendary cards discounted 25%!',
    apply(G) {
      G.currentSet.cards
        .filter(c => c.rarity === 'rare' || c.rarity === 'legendary')
        .forEach(c => {
          G.market.set(c.id, Math.round((G.market.get(c.id) || c.basePrice) * 0.75));
        });
    },
    remove(G) {},
  },
];

/* ════════════════════════════════════════════════════════════════
   NPC EVENTS — 12 characters, event-driven
   ════════════════════════════════════════════════════════════════ */
const NPC_EVENTS = [
  {
    id: 'rex', name: 'Rex the Dealer', emoji: '🤵',
    tierDescs: ['Sells missing cards at 80% market', 'Prioritizes rare+ missing cards', 'Prioritizes legendary missing cards'],
    desc: 'Back-alley dealer with access to cards you\'re missing.',
    rewardLabel: (G) => {
      if (!G._npcRexCard) return null;
      const c = G.currentSet.cards.find(x => x.id === G._npcRexCard);
      const p = Math.round(marketPrice(G._npcRexCard) * 0.80);
      return c ? `Add ${c.emoji} ${c.name} to collection for ${fmt(p)} (20% off market)` : null;
    },
    buildMsg: (G) => {
      const rel = (G.npcRelations && G.npcRelations['rex']) || 0;
      const missing = G.currentSet.cards.filter(c => cardCount(c.id) === 0);
      if (!missing.length) return "I've got cards, but you seem to have them all.";
      const legendary = missing.filter(c => c.rarity === 'legendary');
      const rarePlus  = missing.filter(c => c.rarity === 'rare' || c.rarity === 'legendary');
      const pool = rel >= 2 && legendary.length ? legendary
        : rel >= 1 && rarePlus.length ? rarePlus
        : missing;
      const card = randFrom(pool);
      G._npcRexCard = card.id;
      const price = Math.round(marketPrice(card.id) * 0.80);
      return `"I'll part with ${card.emoji} ${card.name} for ${fmt(price)} — 20% below market. Take it?"`;
    },
    acceptLabel: 'Buy it',
    canAccept: (G) => {
      if (!G._npcRexCard) return false;
      return G.budget >= Math.round(marketPrice(G._npcRexCard) * 0.80);
    },
    accept(G) {
      const cardId = G._npcRexCard;
      if (!cardId) return;
      const price = Math.round(marketPrice(cardId) * 0.80);
      G.budget -= price; G.totalSpent += price;
      G.collection.set(cardId, cardCount(cardId) + 1);
      G.singlesBought++;
      Sounds.play('coin');
      const card = G.currentSet.cards.find(c => c.id === cardId);
      showToast(`Rex sold you ${card.name} for ${fmt(price)}!`, 'success');
      checkCompletion(); renderAll();
    },
  },
  {
    id: 'vera', name: 'Vera the Collector', emoji: '👩‍🎨',
    tierDescs: ['Offers 1.30× market for cards', 'Offers 1.42× market', 'Offers 1.55× market'],
    desc: 'Passionate collector who pays above market for the right piece.',
    rewardLabel: (G) => {
      if (!G._npcVeraCard) return null;
      const c = G.currentSet.cards.find(x => x.id === G._npcVeraCard);
      const rel = (G.npcRelations && G.npcRelations['vera']) || 0;
      const offer = Math.round(marketPrice(G._npcVeraCard) * [1.20,1.30,1.42,1.55][rel]);
      return c ? `Earn ${fmt(offer)} for selling ${c.emoji} ${c.name}` : null;
    },
    buildMsg: (G) => {
      const owned = G.currentSet.cards.filter(c => cardCount(c.id) > 0);
      if (!owned.length) return "I need cards, but you have none. Come back later.";
      const card = randFrom(owned);
      G._npcVeraCard = card.id;
      const rel = (G.npcRelations && G.npcRelations['vera']) || 0;
      const mult = [1.20, 1.30, 1.42, 1.55][rel];
      const offer = Math.round(marketPrice(card.id) * mult);
      const pct = Math.round(mult * 100);
      const extra = rel >= 2 ? ' Old friends get my best prices.' : rel >= 1 ? ' Good doing business again.' : '';
      return `"I need ${card.emoji} ${card.name}. ${fmt(offer)} — ${pct}% market.${extra}"`;
    },
    acceptLabel: 'Sell it',
    canAccept: (G) => !!G._npcVeraCard && cardCount(G._npcVeraCard) > 0,
    accept(G) {
      const cardId = G._npcVeraCard;
      if (!cardId || cardCount(cardId) === 0) return;
      const rel = (G.npcRelations && G.npcRelations['vera']) || 0;
      const mult = [1.20, 1.30, 1.42, 1.55][rel];
      const offer = Math.round(marketPrice(cardId) * mult);
      G.collection.set(cardId, cardCount(cardId) - 1);
      G.budget += offer; G.totalEarned += offer;
      G.singlesSold++;
      Sounds.play('auctionSold');
      const card = G.currentSet.cards.find(c => c.id === cardId);
      showToast(`Vera bought ${card.name} for ${fmt(offer)}!`, 'success');
      renderAll();
    },
  },
  {
    id: 'tommy', name: 'Tommy the Kid', emoji: '🧒',
    desc: 'Enthusiastic kid who loves trading — never knows real card values.',
    rewardLabel: (G) => {
      if (!G._npcTommyOffer) return null;
      const c = G.currentSet.cards.find(x => x.id === G._npcTommyOffer);
      return c ? `Receive ${c.emoji} ${c.name} in exchange for one of your commons` : null;
    },
    buildMsg: (G) => {
      const ownedCommons = G.currentSet.cards.filter(c => c.rarity === 'common' && cardCount(c.id) > 0);
      const missingUncommons = G.currentSet.cards.filter(c => c.rarity === 'uncommon' && cardCount(c.id) === 0);
      const rares = G.currentSet.cards.filter(c => c.rarity === 'rare');
      if (!ownedCommons.length) return '"Trade me a common? You don\'t have any..."';
      const offer = missingUncommons.length ? randFrom(missingUncommons) : randFrom(rares);
      G._npcTommyOffer = offer.id;
      return `"Trade? I'll give you ${offer.emoji} ${offer.name} for any common you own!"`;
    },
    acceptLabel: 'Trade',
    canAccept: (G) => {
      const ownedCommons = G.currentSet.cards.filter(c => c.rarity === 'common' && cardCount(c.id) > 0);
      return ownedCommons.length > 0 && !!G._npcTommyOffer;
    },
    accept(G) {
      const offerCardId = G._npcTommyOffer;
      if (!offerCardId) return;
      const ownedCommons = G.currentSet.cards.filter(c => c.rarity === 'common' && cardCount(c.id) > 0);
      if (!ownedCommons.length) return;
      const give = randFrom(ownedCommons);
      G.collection.set(give.id, cardCount(give.id) - 1);
      G.collection.set(offerCardId, cardCount(offerCardId) + 1);
      Sounds.play('coin');
      const offerCard = G.currentSet.cards.find(c => c.id === offerCardId);
      showToast(`Traded ${give.name} for ${offerCard.name}!`, 'success');
      checkCompletion(); renderAll();
    },
  },
  {
    id: 'chen', name: 'Prof. Chen', emoji: '🧑‍🔬',
    desc: 'Academic who tracks market fluctuations obsessively.',
    rewardLabel: () => 'Free legendary price forecast — no cost, just intel',
    buildMsg: (G) => {
      const legendary = G.currentSet.cards.filter(c => c.rarity === 'legendary');
      const card = randFrom(legendary.length ? legendary : G.currentSet.cards);
      G._npcChenCard = card.id;
      const cur = marketPrice(card.id);
      const pull = (card.basePrice - cur) * CONFIG.marketDrift.pull;
      const forecast = cur + pull;
      const dir = forecast > cur + 1 ? '↑↑' : forecast > cur ? '↑' : forecast < cur - 1 ? '↓↓' : '↓';
      return `"${card.emoji} ${card.name} — legendary price forecast: ${dir}. I'd act accordingly."`;
    },
    acceptLabel: 'Got it',
    canAccept: () => true,
    accept() { Sounds.play('tutStep'); },
  },
  {
    id: 'larry', name: 'Lucky Larry', emoji: '🎲',
    tierDescs: ['Mystery box $4, no commons', 'Box costs $3, uncommon+ pool', 'Costs $2, uncommon+ pool'],
    desc: 'Runs a mystery-box operation from his garage. High risk, possible treasure.',
    rewardLabel: (G) => {
      const rel = (G.npcRelations && G.npcRelations['larry']) || 0;
      const cost = [5,4,3,2][rel];
      const pool = rel >= 2 ? 'uncommon+' : rel >= 1 ? 'no commons' : 'any rarity';
      return `Pay ${fmt(cost)} for 1 random card (${pool})`;
    },
    buildMsg: (G) => {
      const rel = (G.npcRelations && G.npcRelations['larry']) || 0;
      const cost = [5, 4, 3, 2][rel];
      const pool = rel >= 2 ? ['uncommon','rare','legendary'] : rel >= 1 ? ['common','uncommon','rare'] : null;
      const poolStr = rel >= 2 ? 'uncommon+ only' : rel >= 1 ? 'no commons' : 'any rarity';
      return `"Blind box, $${cost}. ${poolStr}. Feeling lucky?"`;
    },
    acceptLabel: 'Go for it!',
    canAccept: (G) => { const rel = (G.npcRelations && G.npcRelations['larry']) || 0; return G.budget >= [5,4,3,2][rel]; },
    accept(G) {
      const rel = (G.npcRelations && G.npcRelations['larry']) || 0;
      const cost = [5, 4, 3, 2][rel];
      G.budget -= cost; G.totalSpent += cost;
      const pool = rel >= 2
        ? G.currentSet.cards.filter(c => ['uncommon','rare','legendary'].includes(c.rarity))
        : rel >= 1
        ? G.currentSet.cards.filter(c => c.rarity !== 'common')
        : G.currentSet.cards;
      const card = randFrom(pool.length ? pool : G.currentSet.cards);
      G.collection.set(card.id, cardCount(card.id) + 1);
      const snd = card.rarity === 'legendary' ? 'legendary' : card.rarity === 'rare' ? 'cardFlip' : 'coin';
      Sounds.play(snd);
      showToast(`Larry's box: ${card.emoji} ${card.name} (${card.rarity})!`, card.rarity === 'legendary' ? 'success' : 'warning');
      checkCompletion(); renderAll();
    },
  },
  {
    id: 'mike', name: 'Big Mike', emoji: '🦈',
    tierDescs: ['Loan up to $65, repay $80', 'Loan up to $80, repay $95', 'Loan up to $100, repay $112'],
    desc: 'Loan shark. Easy money upfront, painful if you miss the deadline.',
    rewardLabel: (G) => {
      const rel = (G.npcRelations && G.npcRelations['mike']) || 0;
      const [loan, repay, pen] = [[50,68,85],[65,80,95],[80,95,110],[100,112,130]][rel];
      return `Receive $${loan} now — repay $${repay} within 5 days (or $${pen} penalty)`;
    },
    buildMsg: (G) => {
      const rel = (G.npcRelations && G.npcRelations['mike']) || 0;
      const [loan, repay, pen] = [[50,68,85],[65,80,95],[80,95,110],[100,112,130]][rel];
      const tag = rel >= 2 ? ' You\'re good for it.' : rel >= 1 ? ' Returning customer.' : '';
      return `"Need cash? $${loan} loan. Pay back $${repay} in 5 days, or I take $${pen}.${tag} Deal?"`;
    },
    acceptLabel: 'Take the loan',
    canAccept: (G) => !G.debtDue,
    accept(G) {
      const rel = (G.npcRelations && G.npcRelations['mike']) || 0;
      const [loan, repay, pen] = [[50,68,85],[65,80,95],[80,95,110],[100,112,130]][rel];
      G.budget += loan;
      G.debtDue = { amount: repay, penalty: pen, byDay: G.day + 5 };
      showToast(`Borrowed $${loan} from Big Mike. Pay back $${repay} by day ${G.debtDue.byDay}!`, 'warning');
      renderHUD();
    },
  },
  {
    id: 'insider', name: 'The Insider', emoji: '🕶️',
    desc: 'Knows what\'s coming tomorrow. Usually right. Never cheap.',
    rewardLabel: () => 'Free tip about tomorrow\'s market event',
    buildMsg: (G) => {
      const willFire = Math.random() < G.eventChance;
      G._npcInsiderHint = willFire ? randFrom(EVENTS) : null;
      return G._npcInsiderHint
        ? `"Heads up — tomorrow: ${G._npcInsiderHint.icon} ${G._npcInsiderHint.title} Don't tell anyone I said that."`
        : '"Quiet day tomorrow. Nothing unusual. Move along."';
    },
    acceptLabel: 'Noted',
    canAccept: () => true,
    accept() { Sounds.play('tutStep'); },
  },
  {
    id: 'marcus', name: 'Marcus the Rival', emoji: '😤',
    desc: 'Your rival collector. Always competing, usually making your life harder.',
    rewardLabel: (G) => {
      if (!G._npcMarcusCard) return null;
      const c = G.currentSet.cards.find(x => x.id === G._npcMarcusCard);
      return c ? `Heads-up: ${c.emoji} ${c.name} price rising 20% due to Marcus` : null;
    },
    buildMsg: (G) => {
      const unowned = G.currentSet.cards.filter(c => cardCount(c.id) === 0);
      const card = randFrom(unowned.length ? unowned : G.currentSet.cards);
      G._npcMarcusCard = card.id;
      return `"Ha! I just bought ${card.emoji} ${card.name} from the market. Price is going up."`;
    },
    acceptLabel: 'Noted',
    canAccept: () => true,
    accept(G) {
      if (G._npcMarcusCard) {
        const cur = marketPrice(G._npcMarcusCard);
        G.market.set(G._npcMarcusCard, Math.round(cur * 1.20));
        const card = G.currentSet.cards.find(c => c.id === G._npcMarcusCard);
        showToast(`Marcus drove up ${card.name} by 20%!`, 'warning');
        renderMarket();
      }
    },
  },
  {
    id: 'mom', name: 'Mom', emoji: '👩',
    tierDescs: ['$13 gift if no packs opened today', '$17 gift if no packs opened', '$22 gift if no packs opened'],
    desc: 'Proud when you\'re responsible. Disapproves of impulse pack buying.',
    rewardLabel: (G) => {
      const rel = (G.npcRelations && G.npcRelations['mom']) || 0;
      const gift = [10,13,17,22][rel];
      return G.packsOpenedToday === 0 ? `Receive $${gift} gift (no packs opened today ✓)` : null;
    },
    buildMsg: (G) => {
      const rel = (G.npcRelations && G.npcRelations['mom']) || 0;
      const gift = [10, 13, 17, 22][rel];
      if (G.packsOpenedToday === 0) {
        const note = rel >= 2 ? ' You\'ve really grown up.' : rel >= 1 ? ' Proud of you.' : '';
        return `"You've been responsible today. Here's $${gift}.${note}"`;
      }
      return '"You bought packs again? I\'m not giving you money for that habit."';
    },
    acceptLabel: 'Thanks!',
    canAccept: (G) => G.packsOpenedToday === 0,
    accept(G) {
      const rel = (G.npcRelations && G.npcRelations['mom']) || 0;
      const gift = [10, 13, 17, 22][rel];
      G.budget += gift; G.totalEarned += gift;
      showToast(`Mom gave you $${gift}!`, 'success');
      renderHUD();
    },
  },
  {
    id: 'jenny', name: 'Junkyard Jenny', emoji: '🛻',
    tierDescs: ['Buys dupes at 58% market', 'Buys dupes at 64% market', 'Buys dupes at 70% market'],
    desc: 'Bulk buyer. Takes all your duplicates for cash, no negotiations.',
    rewardLabel: (G) => {
      const rel = (G.npcRelations && G.npcRelations['jenny']) || 0;
      const rate = [0.52,0.58,0.64,0.70][rel];
      const dupes = G.currentSet.cards.filter(c => cardCount(c.id) > 1);
      const total = dupes.reduce((sum, c) => sum + Math.round(marketPrice(c.id) * rate) * (cardCount(c.id) - 1), 0);
      return dupes.length ? `Sell ${dupes.length} types of dupes for ${fmt(total)} total (${Math.round(rate*100)}¢ / $1)` : null;
    },
    buildMsg: (G) => {
      const dupes = G.currentSet.cards.filter(c => cardCount(c.id) > 1);
      if (!dupes.length) return '"No dupes to sell? Come back when you\'ve been over-buying."';
      const rel = (G.npcRelations && G.npcRelations['jenny']) || 0;
      const rate = [0.52, 0.58, 0.64, 0.70][rel];
      const total = dupes.reduce((sum, c) => sum + Math.round(marketPrice(c.id) * rate) * (cardCount(c.id) - 1), 0);
      const pct = Math.round(rate * 100);
      return `"All your dupes — ${pct} cents on the dollar. ${fmt(total)} total. Cash now."`;
    },
    acceptLabel: 'Sell all dupes',
    canAccept: (G) => G.currentSet.cards.some(c => cardCount(c.id) > 1),
    accept(G) {
      const rel = (G.npcRelations && G.npcRelations['jenny']) || 0;
      const rate = [0.52, 0.58, 0.64, 0.70][rel];
      let total = 0; let count = 0;
      G.currentSet.cards.forEach(c => {
        const dupes = cardCount(c.id) - 1;
        if (dupes > 0) {
          const price = Math.round(marketPrice(c.id) * rate) * dupes;
          G.collection.set(c.id, 1);
          G.budget += price; G.totalEarned += price;
          total += price; count += dupes;
        }
      });
      G.singlesSold += count;
      Sounds.play('sellAll');
      showToast(`Jenny took ${count} dupes for ${fmt(total)}`, 'success');
      renderAll();
    },
  },
  {
    id: 'auctioneer', name: 'The Auctioneer', emoji: '🔨',
    tierDescs: ['Offers 1.38× market for cards', 'Offers 1.46× market', 'Offers 1.55× market'],
    desc: 'Flash-sale specialist who bids above market — for the right card.',
    rewardLabel: (G) => {
      if (!G._npcAuctionCard) return null;
      const c = G.currentSet.cards.find(x => x.id === G._npcAuctionCard);
      const rel = (G.npcRelations && G.npcRelations['auctioneer']) || 0;
      const offer = Math.round(marketPrice(G._npcAuctionCard) * [1.30,1.38,1.46,1.55][rel]);
      return c ? `Earn ${fmt(offer)} for ${c.emoji} ${c.name} (above market)` : null;
    },
    buildMsg: (G) => {
      const owned = G.currentSet.cards.filter(c => cardCount(c.id) > 0);
      if (!owned.length) return '"Nothing to auction. Come back when you have a collection."';
      const best = owned.reduce((a, b) => marketPrice(a.id) > marketPrice(b.id) ? a : b);
      G._npcAuctionCard = best.id;
      const rel = (G.npcRelations && G.npcRelations['auctioneer']) || 0;
      const mult = [1.30, 1.38, 1.46, 1.55][rel];
      const offer = Math.round(marketPrice(best.id) * mult);
      return `"Flash auction! ${best.emoji} ${best.name} — ${fmt(offer)} (${Math.round(mult*100)}% market), right now!"`;
    },
    acceptLabel: 'Sold!',
    canAccept: (G) => !!G._npcAuctionCard && cardCount(G._npcAuctionCard) > 0,
    accept(G) {
      const cardId = G._npcAuctionCard;
      if (!cardId || cardCount(cardId) === 0) return;
      const rel = (G.npcRelations && G.npcRelations['auctioneer']) || 0;
      const mult = [1.30, 1.38, 1.46, 1.55][rel];
      const offer = Math.round(marketPrice(cardId) * mult);
      G.collection.set(cardId, cardCount(cardId) - 1);
      G.budget += offer; G.totalEarned += offer;
      G.singlesSold++;
      Sounds.play('auctionSold');
      const card = G.currentSet.cards.find(c => c.id === cardId);
      showToast(`Auctioned ${card.name} for ${fmt(offer)}!`, 'success');
      renderAll();
    },
  },
  /* ── Level 2+ exclusive ── */
  {
    id: 'archivist', name: 'The Archivist', emoji: '📚',
    minLevel: 2,
    desc: 'Meticulous scholar who upgrades bulk commons into useful uncommons.',
    rewardLabel: (G) => {
      const have3 = G.currentSet.cards.filter(c => c.rarity === 'common' && cardCount(c.id) >= 3);
      const want  = G.currentSet.cards.filter(c => c.rarity === 'uncommon' && cardCount(c.id) === 0);
      if (!have3.length || !want.length) return null;
      const target = randFrom(want);
      return `Trade 3 copies of a common for ${target.emoji} ${target.name} (missing uncommon)`;
    },
    buildMsg: (G) => {
      const have3 = G.currentSet.cards.filter(c => c.rarity === 'common' && cardCount(c.id) >= 3);
      const want  = G.currentSet.cards.filter(c => c.rarity === 'uncommon' && cardCount(c.id) === 0);
      if (!have3.length) return '"You need at least 3 copies of a common. Come back when you\'re drowning in duplicates."';
      if (!want.length)  return '"You already have all the uncommons. My services aren\'t needed."';
      const src = randFrom(have3); G._npcArchivistSrc = src.id;
      const dst = randFrom(want);  G._npcArchivistDst = dst.id;
      return `"3× ${src.emoji} ${src.name} in exchange for ${dst.emoji} ${dst.name}. A fair trade for the patient."`;
    },
    acceptLabel: 'Trade 3 commons',
    canAccept: (G) => !!G._npcArchivistSrc && !!G._npcArchivistDst && cardCount(G._npcArchivistSrc) >= 3,
    accept(G) {
      const src = G._npcArchivistSrc; const dst = G._npcArchivistDst;
      if (!src || !dst) return;
      G.collection.set(src, cardCount(src) - 3);
      G.collection.set(dst, cardCount(dst) + 1);
      const sc = G.currentSet.cards.find(c => c.id === src);
      const dc = G.currentSet.cards.find(c => c.id === dst);
      Sounds.play('coin');
      showToast(`Traded 3× ${sc.name} for ${dc.emoji} ${dc.name}!`, 'success');
      checkCompletion(); renderAll();
    },
  },

  /* ── Level 3+ exclusive ── */
  {
    id: 'syndicate', name: 'Syndicate Rep', emoji: '🕴️',
    minLevel: 3,
    desc: 'Well-connected fixer who can swap any card for another of equal rarity.',
    rewardLabel: (G) => {
      const owned = G.currentSet.cards.filter(c => cardCount(c.id) > 0);
      if (!owned.length) return null;
      const src  = owned.reduce((a, b) => marketPrice(a.id) < marketPrice(b.id) ? a : b);
      const want = G.currentSet.cards.filter(c => c.rarity === src.rarity && cardCount(c.id) === 0);
      if (!want.length) return null;
      const dst = randFrom(want);
      return `Swap your ${src.emoji} ${src.name} for missing ${dst.emoji} ${dst.name} (same rarity)`;
    },
    buildMsg: (G) => {
      const owned = G.currentSet.cards.filter(c => cardCount(c.id) > 0);
      if (!owned.length) return '"Nothing to swap. Collect some cards first."';
      const src   = owned.reduce((a, b) => marketPrice(a.id) < marketPrice(b.id) ? a : b);
      const want  = G.currentSet.cards.filter(c => c.rarity === src.rarity && cardCount(c.id) === 0);
      if (!want.length) return '"You\'ve got all the cards at this rarity. Nothing for me to offer."';
      const dst   = randFrom(want); G._npcSynSrc = src.id; G._npcSynDst = dst.id;
      return `"Give me your ${src.emoji} ${src.name}, I hand you ${dst.emoji} ${dst.name}. Same rarity, no cash."`;
    },
    acceptLabel: 'Make the swap',
    canAccept: (G) => !!G._npcSynSrc && !!G._npcSynDst && cardCount(G._npcSynSrc) > 0,
    accept(G) {
      const src = G._npcSynSrc; const dst = G._npcSynDst;
      if (!src || !dst) return;
      G.collection.set(src, cardCount(src) - 1);
      G.collection.set(dst, cardCount(dst) + 1);
      const sc = G.currentSet.cards.find(c => c.id === src);
      const dc = G.currentSet.cards.find(c => c.id === dst);
      Sounds.play('coin');
      showToast(`Swapped ${sc.name} for ${dc.emoji} ${dc.name}!`, 'success');
      checkCompletion(); renderAll();
    },
  },

  /* ── Level 4+ exclusive ── */
  {
    id: 'oligarch', name: 'The Oligarch', emoji: '💎',
    tierDescs: ['Pays 2.5× market for rare cards', 'Offers on more card types', 'Best price guaranteed'],
    minLevel: 4,
    desc: 'Corporate collector who overpays absurdly for your highest-value card.',
    rewardLabel: (G) => {
      const best = G.currentSet.cards.filter(c => cardCount(c.id) > 0)
                    .sort((a, b) => marketPrice(b.id) - marketPrice(a.id))[0];
      if (!best) return null;
      const offer = Math.round(marketPrice(best.id) * 2.5);
      return `Sell ${best.emoji} ${best.name} for ${fmt(offer)} — 2.5× market price`;
    },
    buildMsg: (G) => {
      const best = G.currentSet.cards.filter(c => cardCount(c.id) > 0)
                    .sort((a, b) => marketPrice(b.id) - marketPrice(a.id))[0];
      if (!best) return '"You have nothing worth my time. Accumulate a collection first."';
      G._npcOligarchCard = best.id;
      const offer = Math.round(marketPrice(best.id) * 2.5);
      return `"${best.emoji} ${best.name}. ${fmt(offer)} — cash, immediate, no questions. 2.5× market."`;
    },
    acceptLabel: 'Sell it',
    canAccept: (G) => !!G._npcOligarchCard && cardCount(G._npcOligarchCard) > 0,
    accept(G) {
      const cardId = G._npcOligarchCard; if (!cardId) return;
      const offer  = Math.round(marketPrice(cardId) * 2.5);
      G.collection.set(cardId, cardCount(cardId) - 1);
      G.budget += offer; G.totalEarned += offer; G.singlesSold++;
      Sounds.play('auctionSold');
      const card = G.currentSet.cards.find(c => c.id === cardId);
      showToast(`The Oligarch paid ${fmt(offer)} for ${card.name}!`, 'success');
      renderAll();
    },
  },

  /* ── Set-specific NPCs ── */
  {
    id: 'mae', name: 'Farmer Mae', emoji: '🧑‍🌾',
    tierDescs: ['Trades a card 1:1', 'Better trade options', 'Can swap for a rare'],
    setId: 'home',
    desc: 'Veteran homesteader who knows every creature on the farm — and a fair swap.',
    rewardLabel: (G) => {
      const missing = G.currentSet.cards.filter(c => cardCount(c.id) === 0);
      const dupes   = G.currentSet.cards.filter(c => cardCount(c.id) > 1);
      if (!missing.length || !dupes.length) return null;
      const reward = G._npcMaeReward ? G.currentSet.cards.find(c => c.id === G._npcMaeReward) : null;
      return reward ? `Swap a spare for ${reward.emoji} ${reward.name}` : null;
    },
    buildMsg: (G) => {
      const missing = G.currentSet.cards.filter(c => cardCount(c.id) === 0);
      const dupes   = G.currentSet.cards.filter(c => cardCount(c.id) > 1);
      if (!missing.length) return '"You\'ve got the whole farm! Nothing left for me to offer."';
      if (!dupes.length)   return '"Come back when you\'ve got spares — I only trade, I don\'t sell."';
      const reward = randFrom(missing);
      G._npcMaeReward  = reward.id;
      G._npcMaeDupe    = randFrom(dupes).id;
      return `"On the farm nothin' goes to waste. Give me one spare, I'll give you ${reward.emoji} ${reward.name}."`;
    },
    acceptLabel: 'Swap',
    canAccept: (G) => {
      const dupes = G.currentSet.cards.filter(c => cardCount(c.id) > 1);
      return !!G._npcMaeReward && dupes.length > 0;
    },
    accept(G) {
      const reward = G._npcMaeReward; if (!reward) return;
      // Remove one dupe (cheapest spare)
      const cheapestDupe = G.currentSet.cards
        .filter(c => cardCount(c.id) > 1)
        .sort((a,b) => marketPrice(a.id) - marketPrice(b.id))[0];
      if (cheapestDupe) G.collection.set(cheapestDupe.id, cardCount(cheapestDupe.id) - 1);
      G.collection.set(reward, cardCount(reward) + 1);
      Sounds.play('coin');
      const card = G.currentSet.cards.find(c => c.id === reward);
      showToast(`Mae traded you ${card.name}!`, 'success');
      checkCompletion(); renderAll();
    },
  },
  {
    id: 'pearl', name: 'Captain Pearl', emoji: '⚓',
    tierDescs: ['Buys missing cards at 55% market', 'Access to rarer cards', 'May offer legendary'],
    setId: 'aquatic',
    desc: 'Deep-sea diver who surfaces with rarities — for the right buyer.',
    rewardLabel: (G) => {
      if (!G._npcPearlCard) return null;
      const c = G.currentSet.cards.find(x => x.id === G._npcPearlCard);
      const price = Math.round(marketPrice(G._npcPearlCard) * 0.55);
      return c ? `Buy ${c.emoji} ${c.name} for ${fmt(price)} (45% off)` : null;
    },
    buildMsg: (G) => {
      const missing = G.currentSet.cards.filter(c => cardCount(c.id) === 0);
      if (!missing.length) return '"You\'ve already got the whole ocean. Impressive."';
      const card = randFrom(missing);
      G._npcPearlCard = card.id;
      const price = Math.round(marketPrice(card.id) * 0.55);
      return `"Pulled ${card.emoji} ${card.name} from forty fathoms down. Yours for ${fmt(price)} — half what it costs above water."`;
    },
    acceptLabel: 'Buy it',
    canAccept: (G) => !!G._npcPearlCard && G.budget >= Math.round(marketPrice(G._npcPearlCard) * 0.55),
    accept(G) {
      const cardId = G._npcPearlCard; if (!cardId) return;
      const price = Math.round(marketPrice(cardId) * 0.55);
      G.budget -= price; G.totalSpent += price;
      G.collection.set(cardId, cardCount(cardId) + 1);
      G.singlesBought++;
      Sounds.play('coin');
      const card = G.currentSet.cards.find(c => c.id === cardId);
      showToast(`Pearl sold you ${card.name} for ${fmt(price)}!`, 'success');
      checkCompletion(); renderAll();
    },
  },
  {
    id: 'zaid', name: 'Nomad Zaid', emoji: '🐪',
    tierDescs: ['Sells missing cards at 65% market', 'Wider card selection', 'Access to rare cards'],
    setId: 'desert',
    desc: 'Wandering desert trader. Crossed the dunes so you don\'t have to.',
    rewardLabel: (G) => {
      if (!G._npcZaidCard) return null;
      const c = G.currentSet.cards.find(x => x.id === G._npcZaidCard);
      const price = Math.round(marketPrice(G._npcZaidCard) * 0.65);
      return c ? `Buy ${c.emoji} ${c.name} for ${fmt(price)} (35% off)` : null;
    },
    buildMsg: (G) => {
      const rareOrBetter = G.currentSet.cards.filter(c =>
        (c.rarity === 'rare' || c.rarity === 'legendary') && cardCount(c.id) === 0
      );
      const pool = rareOrBetter.length ? rareOrBetter
                 : G.currentSet.cards.filter(c => cardCount(c.id) === 0);
      if (!pool.length) return '"You\'ve collected every beast of the sands. The desert respects you."';
      const card = randFrom(pool);
      G._npcZaidCard = card.id;
      const price = Math.round(marketPrice(card.id) * 0.65);
      return `"Three days across the dunes for ${card.emoji} ${card.name}. ${fmt(price)} and it's yours — city price is much higher."`;
    },
    acceptLabel: 'Buy it',
    canAccept: (G) => !!G._npcZaidCard && G.budget >= Math.round(marketPrice(G._npcZaidCard) * 0.65),
    accept(G) {
      const cardId = G._npcZaidCard; if (!cardId) return;
      const price = Math.round(marketPrice(cardId) * 0.65);
      G.budget -= price; G.totalSpent += price;
      G.collection.set(cardId, cardCount(cardId) + 1);
      G.singlesBought++;
      Sounds.play('coin');
      const card = G.currentSet.cards.find(c => c.id === cardId);
      showToast(`Zaid sold you ${card.name} for ${fmt(price)}!`, 'success');
      checkCompletion(); renderAll();
    },
  },
  {
    id: 'uma', name: 'Ranger Uma', emoji: '🦁',
    tierDescs: ['Offers 1.55× market for cards', 'Offers 1.65× market', 'Offers 1.80× market'],
    setId: 'savanna',
    desc: 'Wildlife ranger who pays above market — she needs specific specimens for research.',
    rewardLabel: (G) => {
      if (!G._npcUmaCard) return null;
      const c = G.currentSet.cards.find(x => x.id === G._npcUmaCard);
      const rel = (G.npcRelations && G.npcRelations['uma']) || 0;
      const offer = Math.round(marketPrice(G._npcUmaCard) * [1.45,1.55,1.65,1.80][rel]);
      return c ? `Sell ${c.emoji} ${c.name} for ${fmt(offer)} (above market)` : null;
    },
    buildMsg: (G) => {
      const owned = G.currentSet.cards.filter(c => cardCount(c.id) > 0);
      if (!owned.length) return '"I need specimens, but your collection is empty. Come back when you\'ve been out in the field."';
      const card = randFrom(owned);
      G._npcUmaCard = card.id;
      const rel = (G.npcRelations && G.npcRelations['uma']) || 0;
      const mult = [1.45, 1.55, 1.65, 1.80][rel];
      const offer = Math.round(marketPrice(card.id) * mult);
      const extra = rel >= 2 ? ' The conservancy funds my best rates.' : '';
      return `"I've tracked every predator on this plain. I need ${card.emoji} ${card.name} for my research. ${fmt(offer)} — ${Math.round(mult*100)}% market.${extra}"`;
    },
    acceptLabel: 'Sell it',
    canAccept: (G) => !!G._npcUmaCard && cardCount(G._npcUmaCard) > 0,
    accept(G) {
      const cardId = G._npcUmaCard; if (!cardId) return;
      const rel = (G.npcRelations && G.npcRelations['uma']) || 0;
      const offer = Math.round(marketPrice(cardId) * [1.45, 1.55, 1.65, 1.80][rel]);
      G.collection.set(cardId, cardCount(cardId) - 1);
      G.budget += offer; G.totalEarned += offer; G.singlesSold++;
      Sounds.play('auctionSold');
      const card = G.currentSet.cards.find(c => c.id === cardId);
      showToast(`Uma paid ${fmt(offer)} for ${card.name}!`, 'success');
      renderAll();
    },
  },

  /* ── Original last NPC ── */
  {
    id: 'fence', name: 'The Fence', emoji: '🌫️',
    tierDescs: ['Cards at 62% market (no questions)', 'Missing cards at 55% market', 'Missing rare+ cards at 48% market'],
    desc: 'Procurement expert. Below-market prices, no paperwork.',
    rewardLabel: (G) => {
      if (!G._npcFenceCard) return null;
      const c = G.currentSet.cards.find(x => x.id === G._npcFenceCard);
      const rel = (G.npcRelations && G.npcRelations['fence']) || 0;
      const price = Math.round(marketPrice(G._npcFenceCard) * [0.70,0.62,0.55,0.48][rel]);
      return c ? `Add ${c.emoji} ${c.name} for ${fmt(price)} (no questions asked)` : null;
    },
    buildMsg: (G) => {
      const rel = (G.npcRelations && G.npcRelations['fence']) || 0;
      const missing = G.currentSet.cards.filter(c => cardCount(c.id) === 0);
      const missingRarePlus = missing.filter(c => c.rarity === 'rare' || c.rarity === 'legendary');
      const pool = rel >= 2 && missingRarePlus.length ? missingRarePlus
        : rel >= 1 && missing.length ? missing
        : G.currentSet.cards;
      const card = randFrom(pool);
      G._npcFenceCard = card.id;
      const rate = [0.70, 0.62, 0.55, 0.48][rel];
      const price = Math.round(marketPrice(card.id) * rate);
      const tag = rel >= 2 ? ' Old clients get real discounts.' : rel >= 1 ? ' Loyalty discount.' : '';
      return `"'Acquired' item. ${card.emoji} ${card.name} — ${fmt(price)}.${tag} No questions."`;
    },
    acceptLabel: 'No questions asked',
    canAccept: (G) => {
      if (!G._npcFenceCard) return false;
      const rel = (G.npcRelations && G.npcRelations['fence']) || 0;
      const rate = [0.70, 0.62, 0.55, 0.48][rel];
      return G.budget >= Math.round(marketPrice(G._npcFenceCard) * rate);
    },
    accept(G) {
      const cardId = G._npcFenceCard;
      if (!cardId) return;
      const rel = (G.npcRelations && G.npcRelations['fence']) || 0;
      const rate = [0.70, 0.62, 0.55, 0.48][rel];
      const price = Math.round(marketPrice(cardId) * rate);
      G.budget -= price; G.totalSpent += price;
      G.collection.set(cardId, cardCount(cardId) + 1);
      G.singlesBought++;
      Sounds.play('coin');
      const card = G.currentSet.cards.find(c => c.id === cardId);
      showToast(`Got ${card.name} for ${fmt(price)} (no questions asked)`, 'warning');
      checkCompletion(); renderAll();
    },
  },
];

/* ════════════════════════════════════════════════════════════════
   PERKS — 30 Balatro-style modifiers, pick 1 of 3 per run
   ════════════════════════════════════════════════════════════════ */
const PERKS = [
  // Economy
  { id:'hoarder',    family:'Economy',     name:'Hoarder',          emoji:'🐿️', desc:'Instant sell rate 50% → 65%.',
    apply(G){ G.instantSellRate = 0.65; } },
  { id:'whale',      family:'Economy',     name:'Whale',            emoji:'🐋', desc:'Bonus starting cash (5× pack cost). Market prices +50%.',
    apply(G){ G.budget += G.packCost * 5; G.currentSet.cards.forEach(c => G.market.set(c.id, Math.round((G.market.get(c.id)||c.basePrice)*1.50))); } },
  { id:'bargain',    family:'Economy',     name:'Bargain Hunter',   emoji:'🏷️', desc:'Singles buy price -15%.',
    apply(G){ G.singleDiscount = 0.85; } },
  { id:'packdeal',   family:'Economy',     name:'Pack Deal',        emoji:'📦', desc:'Pack cost reduced by 15%.',
    apply(G){ G.packCost = Math.max(1, Math.round(G.packCost * 0.85)); } },
  { id:'loanshark',  family:'Economy',     name:'Loan Shark',       emoji:'💸', desc:'Bonus cash (5× pack cost) now. Daily allowance halved.',
    apply(G){ G.budget += G.packCost * 5; G.dailyAllowance = Math.max(1, Math.floor(G.dailyAllowance / 2)); } },
  { id:'insurance',  family:'Economy',     name:'Insurance',        emoji:'🛡️', desc:'35% chance each day to refund half a pack cost.',
    apply(G){ G.insuranceActive = true; } },
  // Luck
  { id:'luckstreak', family:'Luck',        name:'Lucky Streak',     emoji:'🍀', desc:'Legendary pack chance ×1.3.',
    apply(G){ G.legChanceMult = 1.3; } },
  { id:'pityperk',   family:'Luck',        name:'Pity Timer',       emoji:'⏱️', desc:'Pity interval becomes 80% of the base legendary pity count.',
    apply(G){ G.pityInterval = legendaryPerkInterval(); } },
  { id:'rainbow',    family:'Luck',        name:'Rainbow Pack',     emoji:'🌈', desc:'Every 80%-pity interval pack has 1 of each rarity (guaranteed legendary).',
    apply(G){ G.rainbowActive = true; G.rainbowInterval = legendaryPerkInterval(); } },
  { id:'foil',       family:'Luck',        name:'Foil Edition',     emoji:'✨', desc:'20% of packs yield an extra copy of the best card.',
    apply(G){ G.foilActive = true; } },
  { id:'hothand',    family:'Luck',        name:'Hot Hand',         emoji:'🔥', desc:'After a legendary pull, next pack has double leg chance.',
    apply(G){ G.hotHandActive = true; } },
  { id:'gut',        family:'Luck',        name:'Lucky 7',          emoji:'7️⃣', desc:'Every 7th single card bought from the market is free.',
    apply(G){ G.lucky7Active = true; G.lucky7Counter = 0; } },
  // Information
  { id:'analyst',    family:'Information', name:'Market Analyst',   emoji:'📊', desc:'Price trend arrows show tomorrow\'s direction.',
    apply(G){ G.marketAnalystActive = true; } },
  { id:'insider',    family:'Information', name:'Insider',          emoji:'📡', desc:'See next event type 1 day early.',
    apply(G){ G.insiderPerkActive = true; } },
  { id:'memory',     family:'Information', name:'Price Memory',     emoji:'🧠', desc:'Market shows 7-day high/low per card.',
    apply(G){ G.priceMemoryActive = true; } },
  { id:'setcoll',    family:'Information', name:'Set Collector',    emoji:'🗂️', desc:'One random rare-or-legendary card is permanently 30% discounted.',
    apply(G){
      const premium = G.currentSet.cards.filter(c => c.rarity === 'rare' || c.rarity === 'legendary');
      const card = randFrom(premium.length ? premium : G.currentSet.cards);
      G.setCollectorId = card.id;
      G.market.set(card.id, Math.round((G.market.get(card.id)||card.basePrice)*0.70));
    } },
  // Time / Events
  { id:'timewarp',   family:'Time',        name:'Market Freeze',    emoji:'❄️', desc:'Market prices cannot rise for the first 5 days.',
    apply(G){ G.marketFreezeUntil = 5; } },
  { id:'patience',   family:'Time',        name:'Patience',         emoji:'🌿', desc:'Daily allowance ×2.',
    apply(G){ G.dailyAllowance *= 2; } },
  { id:'slowburn',   family:'Time',        name:'Slow Burn',        emoji:'🕯️', desc:'Market fluctuates at 50% speed. Daily allowance +1.',
    apply(G){ G.marketDriftScale = 0.5; G.dailyAllowance += 1; } },
  { id:'eventmag',   family:'Time',        name:'Event Magnet',     emoji:'🧲', desc:'Event chance is doubled.',
    apply(G){ G.eventChance = Math.min(1, G.eventChance * 2); } },
  { id:'eventshield',family:'Time',        name:'Event Shield',     emoji:'🔰', desc:'Negative event price spikes skip cards you already own.',
    apply(G){ G.eventShield = true; } },
  // Negotiation
  { id:'tongue',     family:'Negotiation', name:'Sharp Tongue',     emoji:'💬', desc:'Auction buyer chances all +15%.',
    apply(G){ G.auctionBonus = 0.15; } },
  { id:'network',    family:'Negotiation', name:'Network',          emoji:'🤝', desc:'One guaranteed auction buyer per day.',
    apply(G){ G.networkActive = true; } },
  { id:'bulk',       family:'Negotiation', name:'Bulk Discount',    emoji:'🛒', desc:'Buy singles on 3 consecutive days to get 10% cash back on the third buy.',
    apply(G){ G.bulkDiscountActive = true; } },
  { id:'firstdibs',  family:'Negotiation', name:'Quick Flip',       emoji:'⚡', desc:'First 5 instant sells pay out 80% market rate instead of normal.',
    apply(G){ G.quickFlipCharges = 5; } },
  { id:'extralisting',family:'Negotiation',name:'Extra Listing',    emoji:'📋', desc:'+1 auction listing slot and +5% auction buyer chance for this run.',
    apply(G){ G.maxAuctionSlots = (G.maxAuctionSlots || CONFIG.baseAuctionSlots) + 1; G.auctionBonus += 0.05; } },
  // Unique
  { id:'collector',  family:'Unique',      name:"Collector's Ed.",  emoji:'📖', desc:'Start with three random rares already collected.',
    apply(G){
      const rares = [...G.currentSet.cards.filter(c => c.rarity === 'rare')].sort(() => Math.random() - 0.5);
      rares.slice(0, 3).forEach(c => G.collection.set(c.id, (G.collection.get(c.id) || 0) + 1));
    } },
  { id:'estatesale', family:'Unique',      name:'Estate Sale',      emoji:'🏡', desc:'Start with 2 random rares and 4 random uncommons already collected.',
    apply(G){
      const rares = [...G.currentSet.cards.filter(c => c.rarity === 'rare')].sort(() => Math.random() - 0.5);
      const uncommons = [...G.currentSet.cards.filter(c => c.rarity === 'uncommon')].sort(() => Math.random() - 0.5);
      [...rares.slice(0, 2), ...uncommons.slice(0, 4)].forEach(c => {
        G.collection.set(c.id, (G.collection.get(c.id)||0) + 1);
      });
    } },
  { id:'packhunter', family:'Unique',      name:'Pack Hunter Mode', emoji:'🎒', desc:'Bonus 3× pack cost. Every 10th pack is free.',
    apply(G){ G.budget += G.packCost * 3; G.packHunterModeActive = true; G.packHunterCounter = 0; } },
  { id:'midas',      family:'Unique',      name:'Midas Touch',      emoji:'💰', desc:'All commons sell for 2× normal rate.',
    apply(G){ G.midasActive = true; } },
  { id:'mirror',     family:'Unique',      name:'Mirror Market',    emoji:'🪞', desc:'First buy each day: pay yesterday\'s lower price. Discounted buys are labeled in the market.',
    apply(G){ G.mirrorActive = true; G.mirrorPrices = new Map(); } },
];

/* ════════════════════════════════════════════════════════════════
   COMMENTARY BANKS — 5 banks × ~10 templates each
   ════════════════════════════════════════════════════════════════ */
const COMMENTARY = {
  grade: {
    S: [
      "Done in {day} days. You don't collect cards — you hunt them.",
      "S rank. You finished faster than our servers expected.",
      "Set complete in {day} days. That's not luck, that's market violence.",
      "{day} days. The efficiency is honestly offensive.",
    ],
    A: [
      "A rank in {day} days. Close to perfect. We see you.",
      "Solid work. {day} days. One or two less pack-buying sessions and that's an S.",
      "{day} days, A grade. The oracle approves.",
    ],
    B: [
      "B rank. {day} days. You played it safe. Safe is fine. Safe is... fine.",
      "Serviceable. You'll do better. {day} days isn't the worst we've seen.",
      "B grade. Technically a win. Spiritually... room to grow.",
    ],
    C: [
      "C rank. {day} days. Did you just buy packs every day?",
      "{day} days. The market has a long memory. It saw everything.",
      "C grade. We've seen worse. We won't name names.",
    ],
    D: [
      "D rank. {day} days. At some point this stopped being collecting and became something else.",
      "You spent {day} days on this. The cards are complete. Are you?",
      "D grade. The set was hunted, eventually.",
    ],
  },
  packs: [
    "You opened {packs} packs. The odds were not in your favour, and yet.",
    "{packs} packs torn open. The paper manufacturers send their thanks.",
    "Opened {packs} packs. Found {legs} legendary cards. Math checks out.",
    "{packs} total packs. That's {packs} moments of hope. Some paid off.",
    "Only {packs} packs? You played the market hard. Respect.",
  ],
  market: [
    "Bought {singles} singles from the market. Direct. Efficient.",
    "You earned back {earned} selling duplicates. Not bad for a rat.",
    "{singles} market purchases. The singles market noticed.",
    "Net cost for the set: {net}. Frame it.",
    "Sold {sold} cards total. The market is just organised gambling, and you knew that.",
  ],
  days: [
    "{day} days elapsed. The set stands complete.",
    "The run lasted {day} days. Markets shifted. You adapted.",
    "{day} days. Some collectors take months. You took {day} days.",
    "Day {day}. The curtain falls. Final inventory taken.",
  ],
  closer: [
    "Next run: try the auction mechanic. It pays when patience permits.",
    "A new set awaits. Different odds. Same rat.",
    "The {set} collection is now complete. Frame it somewhere.",
    "Every run teaches something. What did this one teach you?",
    "Reset. Shuffle. Begin again.",
    "The market forgets nothing. Neither should you.",
  ],
};

/* ════════════════════════════════════════════════════════════════
   GAME STATE
   ════════════════════════════════════════════════════════════════ */
let G = null;
let _pendingSet = null;
let _currentNpc = null;
let _confirmCallback = null;

function createState(setDef) {
  const market      = new Map();
  const marketBase  = new Map();   // mean-reversion anchors (computed once per run)
  const trend       = new Map();
  const priceHistory = new Map();
  const setPackCost = setDef.packCost || CONFIG.packCost;
  setDef.cards.forEach(c => {
    const p = computeCardBasePrice(c, setPackCost);
    market.set(c.id, p);
    marketBase.set(c.id, p);
    trend.set(c.id, 'flat');
    priceHistory.set(c.id, [p]);
  });

  return {
    currentSet: setDef,
    budget:     setDef.startBudget,
    totalSpent: 0,
    totalEarned: 0,
    collection: new Map(),
    market,
    marketBase,
    trend,
    priceHistory,
    day: 1,
    packCost: setPackCost,
    packDiscount: 1.0,
    luckyPacks: false,
    freePacks: 0,
    hypeCard: null,
    activeEvent: null,
    packsOpened: 0,
    singlesBought: 0,
    singlesSold: 0,
    completed: false,
    dailyAllowance: setDef.dailyAllowance,
    packsSinceLastLegendary: 0,
    legendaryCount: 0,
    auctionListings: [],
    perkIds: [],
    debtDue: null,
    eventChance: CONFIG.eventChance,
    pityInterval: CONFIG.pityInterval,
    instantSellRate: CONFIG.instantSellRate,
    marketDriftScale: 1.0,
    auctionBonus: 0,
    legChanceMult: 1.0,
    hotHandBonus: false,
    hotHandActive: false,
    rainbowActive: false,
    rainbowInterval: 0,
    rainbowCounter: 0,
    foilActive: false,
    gutFeelingAvailable: false,
    lucky7Active: false,
    lucky7Counter: 0,
    quickFlipCharges: 0,
    marketAnalystActive: false,
    insiderPerkActive: false,
    priceMemoryActive: false,
    setCollectorId: null,
    timeWarpActive: false,
    eventShield: false,
    networkActive: false,
    networkUsedToday: false,
    bulkDiscountActive: false,
    bulkSingleStreak: 0,
    lastSingleBuyDay: 0,
    bulkBoughtToday: 0,
    firstDibsAvailable: false,
    firstDibsUsed: false,
    midasActive: false,
    mirrorActive: false,
    mirrorPrices: null,
    mirrorUsedToday: false,
    packHunterModeActive: false,
    packHunterCounter: 0,
    insuranceActive: false,
    singleDiscount: 1.0,
    packsOpenedToday: 0,
    npcChanceToday: 0,
    npcEncounteredToday: false,
    npcMeetings: 0,
    eventForecast: null,
    auctionSales: 0,
    marketFreezeUntil: 0,
    maxAuctionSlots: CONFIG.baseAuctionSlots,
    oracleTier: 0,
    negotiatorTier: 0,
    gamblerTier: 0,
    thiefTier: 0,
    timekeeperTier: 0,
    timekeeperRewindAvailable: false,
    daySnapshot: null,
    oracleEventHint: null,
    oracleNextPrices: null,
    npcLog: [],
    npcRelations: {},   // per-run: npc.id → relationship level (0–3)
    perkOfferGiven: false,
  };
}

/* ════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════ */
function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fmt(n) {
  const v = Math.round(n * 10) / 10;
  return '$' + (v % 1 === 0 ? v.toLocaleString() : v.toFixed(1));
}
function legendaryPerkInterval() {
  return Math.max(1, Math.round(CONFIG.pityInterval * CONFIG.legendaryPerkIntervalRatio));
}

/* Compute the starting market price for a card from first principles.
   Called once per card when a run is created — no hardcoded prices needed.

   Math:
     targetEV   = packCost × targetInstantSellReturn / instantSellRate
     denom      = Σ (cardsOfRarityPerPack × rarityWeight)
     unitPrice  = targetEV / denom
     rarityBase = unitPrice × rarityWeight[rarity]
     finalPrice = round( rarityBase × noiseFactor )   clamped to ≥ 1

   Noise range ±25 % (factor 0.75–1.25) is deterministic per card id,
   so prices are stable across reloads but vary meaningfully within a tier. */
function computeCardBasePrice(card, packCostOverride) {
  const o = CONFIG.packOdds;
  const packCost = packCostOverride || CONFIG.packCost;
  const commonPerPack    = 3;
  const uncommonPerPack  = 1 - o.slot4LegBase - o.slot4RaBase;
  const rarePerPack      = o.slot4RaBase + (1 - o.slot5LegBase);
  const legPerPack       = o.slot4LegBase + o.slot5LegBase;

  const targetEV = packCost * CONFIG.targetInstantSellReturn / CONFIG.instantSellRate;

  const W = CONFIG.rarityPriceWeights;
  const denom =
    commonPerPack    * W.common    +
    uncommonPerPack  * W.uncommon  +
    rarePerPack      * W.rare      +
    legPerPack       * W.legendary;

  const unitPrice  = targetEV / denom;
  const rarityBase = unitPrice * W[card.rarity];

  // Fresh random ±25 % noise each game — 1 decimal place so prices vary
  // meaningfully even within cheap tiers (commons: ~$0.7–1.1, etc.)
  const noise = 0.75 + Math.random() * 0.50;   // 0.75 … 1.25
  return Math.max(0.1, Math.round(rarityBase * noise * 10) / 10);
}
function cardCount(id)  { return G.collection.get(id) || 0; }
function ownedUnique()  { return G.currentSet.cards.filter(c => cardCount(c.id) > 0).length; }
function effectivePackCost() { return Math.round(G.packCost * G.packDiscount * 10) / 10; }
function marketPrice(id) { return G.market.get(id) || 1; }

function instantSellPrice(id) {
  let rate = G.instantSellRate;
  if (G.midasActive) {
    const card = G.currentSet.cards.find(c => c.id === id);
    if (card && card.rarity === 'common') rate = Math.min(1, rate * 2);
  }
  if (G.negotiatorTier >= 1) rate = Math.min(1, rate + 0.10);
  return Math.max(0.1, Math.round(marketPrice(id) * rate * 10) / 10);
}

function effectiveBuyPrice(id) {
  let price = marketPrice(id);
  if (G.singleDiscount !== 1.0) price = Math.round(price * G.singleDiscount * 10) / 10;
  if (G.mirrorActive && !G.mirrorUsedToday && G.mirrorPrices) {
    const yest = G.mirrorPrices.get(id);
    if (yest && yest < price) price = yest;
  }
  return Math.max(0.1, Math.round(price * 10) / 10);
}

function packCostForN(n) {
  // Bulk discount: 5+ packs → 80%/ea, 3+ packs → 90%/ea.
  // Discounted bundle per-pack prices round down to avoid awkward decimals.
  const base = effectivePackCost();
  const rate  = n >= 5 ? 0.80 : n >= 3 ? 0.90 : 1.0;
  const perPack = n >= 3 ? Math.floor(base * rate) : base;
  const free = Math.min(n, G.freePacks);
  return Math.max(0, Math.round(perPack * (n - free) * 10) / 10);
}

function getGrade(days) {
  const { S, A, B, C } = (G && G.currentSet && G.currentSet.gradeThresholds) || { S: 15, A: 20, B: 25, C: 30 };
  if (days <= S) return 'S';
  if (days <= A) return 'A';
  if (days <= B) return 'B';
  if (days <= C) return 'C';
  return 'D';
}

/* ════════════════════════════════════════════════════════════════
   PACK RNG — with pity, hot hand, rainbow, foil
   ════════════════════════════════════════════════════════════════ */
/* Weighted random — cards you already own are less likely to drop again.
   Unowned = weight 4, owned×1 = weight 1, owned×2+ = weight 0.3          */
function weightedRandFrom(pool) {
  if (!pool.length) return null;
  const items = pool.map(c => {
    const n = cardCount(c.id);
    const w = n === 0 ? 4 : n === 1 ? 1 : 0.3;
    return { c, w };
  });
  let r = Math.random() * items.reduce((s, x) => s + x.w, 0);
  for (const { c, w } of items) { r -= w; if (r <= 0) return c; }
  return items[items.length - 1].c;
}

/** DEBUG: set true temporarily to compare legendary SFX against ace fanfare */
const DEBUG_PACK_LEGENDARY_FIFTY = false;

function generateOnePack(forceRainbow) {
  const { cards } = G.currentSet;
  const C = cards.filter(c => c.rarity === 'common');
  const U = cards.filter(c => c.rarity === 'uncommon');
  const R = cards.filter(c => c.rarity === 'rare');
  const L = cards.filter(c => c.rarity === 'legendary');
  const result = [];

  if (forceRainbow) {
    result.push(weightedRandFrom(C), weightedRandFrom(U), weightedRandFrom(R), weightedRandFrom(L), weightedRandFrom(C));
    return result;
  }

  for (let i = 0; i < 3; i++) result.push(weightedRandFrom(C));

  // Slot 4 — legendary chance.
  // legChanceMult already incorporates Gambler T1 (set in applySkillBonuses),
  // so only multiply by event/perk factors here — no double-counting.
  const legMult  = G.luckyPacks ? 2 : 1;
  const legMult2 = G.hotHandBonus ? 2 : 1;
  const legMult3 = (G.legChanceMult || 1);
  const legChance4 = DEBUG_PACK_LEGENDARY_FIFTY
    ? 0.5
    : CONFIG.packOdds.slot4LegBase * legMult * legMult2 * legMult3;
  const raChance4  = G.luckyPacks ? CONFIG.packOdds.slot4RaLucky : CONFIG.packOdds.slot4RaBase;
  const u4 = Math.random();
  if (u4 < legChance4)                  result.push(weightedRandFrom(L));
  else if (u4 < legChance4 + raChance4) result.push(weightedRandFrom(R));
  else                                  result.push(weightedRandFrom(U));

  // Slot 5 — guaranteed rare/leg
  const legUp5 = DEBUG_PACK_LEGENDARY_FIFTY
    ? 0.5
    : CONFIG.packOdds.slot5LegBase * legMult * legMult2 * legMult3;
  let slot5 = Math.random() < legUp5 ? weightedRandFrom(L) : weightedRandFrom(R);

  // Pity system — the configured interval is the exact pack count.
  G.packsSinceLastLegendary++;
  const _rawPity = G.pityInterval || CONFIG.pityInterval;
  const pityCap  = _rawPity;
  if (G.packsSinceLastLegendary >= pityCap) {
    // Force legendary on slot 5
    slot5 = randFrom(L);
    G.packsSinceLastLegendary = 0;
    setTimeout(() => { showToast('🌟 Pity triggered — guaranteed legendary!', 'success'); Sounds.play('pity'); }, 0);
  }
  result.push(slot5);

  // Track legendary
  const hasLeg = result.some(c => c.rarity === 'legendary');
  if (hasLeg) {
    G.packsSinceLastLegendary = 0;
    G.legendaryCount++;
    if (G.hotHandActive) G.hotHandBonus = true;
  } else {
    if (G.hotHandActive) G.hotHandBonus = false;
  }

  // Gambler T3: every 5th pack gets a 6th card
  if (G.gamblerTier >= 3) {
    G._gamblerBonusCounter = (G._gamblerBonusCounter || 0) + 1;
    if (G._gamblerBonusCounter >= 5) {
      G._gamblerBonusCounter = 0;
      result.push(randFrom(cards));
    }
  }

  // Thief T2: a small chance to sneak an extra card into each pack.
  if (G.thiefTier >= 2 && Math.random() < 0.10) {
    result.push(weightedRandFrom(cards));
  }

  // Foil: extra copy of best card
  if (G.foilActive && Math.random() < 0.20) {
    const best = result.reduce((a, b) => b.basePrice > a.basePrice ? b : a);
    result.push(best);
  }

  // Slot 6: Ace card (0.1% base / 1 in 1000, scaled by Team Player skill)
  if (!forceRainbow) {
    const acePool   = ACE_CARDS[G.currentSet.id] || [];
    const aceChance = 0.001 * (G.aceChanceMult || 1); // 1 in 1000 base, scaled by Team Player
    if (acePool.length > 0 && Math.random() < aceChance) {
      const ownedAces = loadAces();
      const unfound = acePool.filter(a => !ownedAces[a.id]);
      // T3 bonus: always prefer unfound, never pull duplicates if any remain
      const pickFrom = (unfound.length > 0) ? unfound : acePool;
      result.push({ ...randFrom(pickFrom), isAce: true });
    }
  }

  return result;
}

/* ════════════════════════════════════════════════════════════════
   MARKET SIMULATION
   ════════════════════════════════════════════════════════════════ */
function fluctuateMarket() {
  const scale = G.marketDriftScale || 1.0;
  G.currentSet.cards.forEach(card => {
    const cur  = G.market.get(card.id);
    const base = (G.marketBase && G.marketBase.get(card.id)) || cur;
    const pull  = (base - cur) * CONFIG.marketDrift.pull * scale;
    const noise = (Math.random() - 0.48) * cur * CONFIG.marketDrift.noise * scale;
    let next  = Math.max(0.1, Math.round((cur + pull + noise) * 10) / 10);
    if (G.marketFreezeUntil && G.day <= G.marketFreezeUntil) {
      next = Math.min(cur, next);
    }
    G.trend.set(card.id, next > cur ? 'up' : next < cur ? 'down' : 'flat');
    G.market.set(card.id, next);

    // Price history
    const hist = G.priceHistory.get(card.id) || [];
    hist.push(next);
    if (hist.length > CONFIG.maxPriceHistory) hist.shift();
    G.priceHistory.set(card.id, hist);
  });

  // Oracle T3: compute expected next prices (no noise component)
  if (G.oracleTier >= 3) {
    G.oracleNextPrices = new Map();
    G.currentSet.cards.forEach(card => {
      const cur = G.market.get(card.id);
      const pull = (card.basePrice - cur) * CONFIG.marketDrift.pull;
      G.oracleNextPrices.set(card.id, Math.max(1, Math.round(cur + pull)));
    });
  }

  // Mirror Market: save current prices for tomorrow's first-buy perk
  if (G.mirrorActive) {
    G.mirrorPrices = new Map(G.market);
    G.mirrorUsedToday = false;
  }
}

function shouldForecastEvents() {
  return !!(G && (G.oracleTier >= 2 || G.insiderPerkActive));
}

function ensureEventForecast() {
  if (!shouldForecastEvents()) return null;
  if (G.eventForecast) return G.eventForecast;
  const willFire = Math.random() < G.eventChance;
  const event = willFire ? randFrom(EVENTS) : null;
  G.eventForecast = {
    willFire,
    eventId: event ? event.id : null,
  };
  return G.eventForecast;
}

function eventFromForecast(forecast) {
  return forecast && forecast.eventId
    ? EVENTS.find(e => e.id === forecast.eventId) || null
    : null;
}

/* ════════════════════════════════════════════════════════════════
   EVENT ROLLING
   ════════════════════════════════════════════════════════════════ */
function rollEvent() {
  if (G.activeEvent) {
    G.activeEvent.remove(G);
    G.activeEvent = null;
  }

  const forecast = G.eventForecast;
  G.eventForecast = null;
  const forecastEvent = eventFromForecast(forecast);
  const eventFires = forecast ? !!forecast.willFire : Math.random() <= G.eventChance;

  if (!eventFires) {
    document.getElementById('event-banner')?.classList.add('hidden');
    Sounds.setAmbientState('normal');
    return;
  }

  const ev = forecastEvent || randFrom(EVENTS);
  if (G.timekeeperTier >= 2 && ev.negative) {
    Sounds.setAmbientState('normal');
    showEventBanner('timekeeper_skip', '⌛', `Timekeeper blocked bad event: ${ev.title}`);
    return;
  }
  ev.apply(G);
  G.activeEvent = ev;
  Sounds.setAmbientState(ev.ambState || 'normal');

  showEventBanner(ev.id, ev.icon, ev.title + ' — ' + ev.buildDesc(G));
}

function rollNpcEvent() {
  if (!G) return false;
  G.npcEncounteredToday = false;
  if (Math.random() >= (G.npcChanceToday || 0)) return false;

  const currentLevel = (G.currentSet && G.currentSet.level) || 1;
  const currentSetId = G.currentSet && G.currentSet.id;
  const eligible = NPC_EVENTS.filter(n => {
    if (n.minLevel && n.minLevel > currentLevel) return false;
    if (n.setId && n.setId !== currentSetId) return false;   // set-specific NPCs
    return true;
  });
  const npc = randFrom(eligible);
  G.npcEncounteredToday = true;
  enqueueNpc(npc);
  return true;
}

function getNpcChanceTomorrow() {
  if (!G) return 0;
  return G.npcEncounteredToday
    ? CONFIG.npcChanceStep
    : Math.min(1, (G.npcChanceToday || 0) + CONFIG.npcChanceStep);
}

/* ════════════════════════════════════════════════════════════════
   AUCTION SYSTEM
   ════════════════════════════════════════════════════════════════ */
function auctionHitChance(askPrice, cardId) {
  const ratio = askPrice / marketPrice(cardId);
  return Math.min(1.0, CONFIG.auctionTargetEV / ratio) + (G.auctionBonus || 0);
}

// Returns { dot, color } for a pct5 value (already rounded to nearest 5).
// 5 tiers covering the full 0–100 range, each 20 percentage points wide.
function auctionChanceStyle(pct5) {
  if (pct5 >= 85) return { dot: '🟢', color: '#4cdd7a' };   // very likely
  if (pct5 >= 65) return { dot: '🟡', color: '#b8e030' };   // good
  if (pct5 >= 45) return { dot: '🟠', color: '#f0a030' };   // moderate
  if (pct5 >= 25) return { dot: '🔴', color: '#f05858' };   // unlikely
  return                 { dot: '⚫', color: '#888898' };    // very unlikely
}

function rollAuctionBuyers() {
  if (!G.auctionListings.length) return;
  G.auctionListings = G.auctionListings.filter(listing => {
    listing.daysListed = (listing.daysListed || 0) + 1;
    const chance     = auctionHitChance(listing.askPrice, listing.cardId);
    const guaranteed = G.networkActive && !G.networkUsedToday;
    if (Math.random() < chance || guaranteed) {
      G.networkUsedToday = guaranteed ? true : G.networkUsedToday;
      completeSale(listing.cardId, listing.askPrice);
      return false;
    }
    return true;
  });
}

function completeSale(cardId, price) {
  G.budget += price;
  G.totalEarned += price;
  G.singlesSold++;
  G.auctionSales = (G.auctionSales || 0) + 1;
  Sounds.play('auctionSold');
  const card = G.currentSet.cards.find(c => c.id === cardId);
  if (card) showToast(`Auction sold: ${card.name} for ${fmt(price)}!`, 'success');
  renderAll();
}

/* ════════════════════════════════════════════════════════════════
   ACTIONS
   ════════════════════════════════════════════════════════════════ */
function actionOpenPacks(n) {
  const cost = packCostForN(n);
  if (G.budget < cost) { showToast('Not enough budget!', 'danger'); Sounds.play('negative'); return; }

  Sounds.init();
  Sounds.prime();

  G.budget -= cost;
  G.totalSpent += cost;
  G.freePacks -= Math.min(n, G.freePacks);
  G.packsOpened += n;
  G.packsOpenedToday = (G.packsOpenedToday || 0) + n;

  // Pack Hunter Mode: every 10th pack free
  if (G.packHunterModeActive) {
    G.packHunterCounter = (G.packHunterCounter || 0) + n;
    const freePacks = Math.floor(G.packHunterCounter / 10);
    if (freePacks > 0) {
      G.freePacks += freePacks;
      G.packHunterCounter = G.packHunterCounter % 10;
    }
  }

  const allCards = [];
  for (let i = 0; i < n; i++) {
    G.rainbowCounter = (G.rainbowCounter || 0) + 1;
    const forceRainbow = G.rainbowActive && G.rainbowCounter % (G.rainbowInterval || legendaryPerkInterval()) === 0;
    allCards.push(...generateOnePack(forceRainbow));
  }

  const afterReveal = () => {
    commitCards(allCards);
    endDayWithDigest();
  };

  if (n === 1) {
    PackRenderer.playAnimation(allCards, G.currentSet.name, afterReveal);
  } else {
    PackRenderer.playQuickReveal(allCards, n, afterReveal);
  }
}

function commitCards(cards) {
  const aces    = cards.filter(c => c.rarity === 'ace');
  const regular = cards.filter(c => c.rarity !== 'ace');

  regular.forEach(c => {
    G.collection.set(c.id, cardCount(c.id) + 1);
    recordDiscovery('card', c.id);
  });

  aces.forEach(ace => handleAceFound(ace));

  checkCompletion();
  renderAll();
}

function handleAceFound(ace) {
  const ownedAces = loadAces();
  const wasNew = !ownedAces[ace.id];
  ownedAces[ace.id] = (ownedAces[ace.id] || 0) + 1;
  saveAces(ownedAces);

  // Immediately update the worldwide display with this find — don't wait for API
  const playerName = getPlayerName() || 'Anonymous';
  const currentDiscovered = (() => {
    try { return JSON.parse(localStorage.getItem('setHunterLastKnownAces') || '{}'); } catch { return {}; }
  })();
  if (!currentDiscovered[ace.id]) {
    currentDiscovered[ace.id] = { firstBy: playerName, foundAt: Date.now() };
  }
  updateAceStatusBar(currentDiscovered, 20);

  // Post to global discovery API in background
  fetch('/api/aces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ace_id: ace.id, player_name: playerName, player_uuid: getPlayerUUID() }),
  }).then(r => r.json()).then(data => {
    // Merge API response with local data
    const apiDisc = data.discovered || {};
    const localAces = loadAces();
    const merged = { ...apiDisc };
    Object.keys(localAces).forEach(id => {
      if (!merged[id]) merged[id] = { firstBy: playerName, foundAt: Date.now() };
    });
    updateAceStatusBar(merged, data.total || 20);
    if (data.isNew) showGlobalAceCelebration(ace, data);
  }).catch(() => {});

  // Local celebration
  Sounds.play('ace');
  showAceCelebrationLocal(ace, wasNew);
}

function _doActionBuySingle(cardId) {
  let price = effectiveBuyPrice(cardId);

  // Lucky 7: every 7th single market purchase is free
  if (G.lucky7Active) {
    G.lucky7Counter = (G.lucky7Counter || 0) + 1;
    if (G.lucky7Counter % 7 === 0) {
      price = 0;
      showToast('7️⃣ Lucky 7! Free card!', 'success');
    }
  }

  if (price > 0 && G.budget < price) { showToast('Not enough budget!', 'danger'); Sounds.play('negative'); return; }

  const wasNew = cardCount(cardId) === 0;
  G.budget -= price;
  G.totalSpent += price;
  G.collection.set(cardId, cardCount(cardId) + 1);
  recordDiscovery('card', cardId);
  G.singlesBought++;
  G.bulkBoughtToday = (G.bulkBoughtToday || 0) + 1;
  if (G.bulkDiscountActive) {
    G.bulkSingleStreak = G.lastSingleBuyDay === G.day - 1 ? (G.bulkSingleStreak || 0) + 1 : 1;
    G.lastSingleBuyDay = G.day;
    if (G.bulkSingleStreak >= 3 && price > 0) {
      const refund = Math.max(0.1, Math.round(price * 0.10 * 10) / 10);
      G.budget += refund;
      G.totalEarned += refund;
      G.bulkSingleStreak = 0;
      showToast(`🛒 Bulk Discount refunded ${fmt(refund)}!`, 'success');
    }
  }
  if (G.mirrorActive) G.mirrorUsedToday = true;
  Sounds.play('coin');

  const name = G.currentSet.cards.find(c => c.id === cardId).name;
  showToast(wasNew ? `✓ Added ${name}!` : `Bought duplicate ${name}`, wasNew ? 'success' : 'warning');

  checkCompletion();
  renderAll();
  endDayWithDigest();
}

function actionBuySingle(cardId) {
  if (localStorage.getItem('setHunterSkipSingleWarn') === 'yes') {
    _doActionBuySingle(cardId); return;
  }
  // Reuse the confirm dialog, injecting a "don't show again" checkbox
  _confirmCallback = () => {
    const cb = document.getElementById('single-warn-cb');
    if (cb && cb.checked) localStorage.setItem('setHunterSkipSingleWarn', 'yes');
    _doActionBuySingle(cardId);
  };
  const textEl = document.getElementById('confirm-text');
  textEl.innerHTML = `⏰ Buying a single card ends the current day.<br><br>
    <label style="font-size:12px;color:rgba(255,255,255,.5);cursor:pointer;user-select:none">
      <input type="checkbox" id="single-warn-cb" style="margin-right:6px;cursor:pointer">
      Don't show this again
    </label>`;
  document.getElementById('confirm-yes').textContent = 'Buy it';
  document.getElementById('confirm-no').textContent  = 'Cancel';
  document.getElementById('confirm-dialog').classList.remove('hidden');
}

function actionFirstDibs(cardId) {
  if (!G.firstDibsAvailable || G.firstDibsUsed) return;
  const price = Math.max(0.1, Math.round(marketPrice(cardId) * 0.60 * 10) / 10);
  if (G.budget < price) { showToast('Not enough budget!', 'danger'); Sounds.play('negative'); return; }

  const wasNew = cardCount(cardId) === 0;
  G.budget -= price;
  G.totalSpent += price;
  G.collection.set(cardId, cardCount(cardId) + 1);
  recordDiscovery('card', cardId);
  G.singlesBought++;
  G.firstDibsUsed = true;
  Sounds.play('coin');

  const name = G.currentSet.cards.find(c => c.id === cardId).name;
  showToast(`🤝 First Dibs: ${name} for ${fmt(price)}!`, wasNew ? 'success' : 'warning');

  checkCompletion();
  renderAll();
  endDayWithDigest();
}

function actionSellInstant(cardId) {
  const count = cardCount(cardId);
  if (count === 0) return;
  const card = G.currentSet.cards.find(c => c.id === cardId);
  if (count === 1) {
    showConfirm(
      `Selling ${card.emoji} ${card.name} will remove it from your set progress!`,
      'Sell Anyway',
      'Keep It',
      () => _doSellInstant(cardId)
    );
    return;
  }
  _doSellInstant(cardId);
}

function _doSellInstant(cardId) {
  let price = instantSellPrice(cardId);

  // Quick Flip: first 5 instant sells pay 80% instead of normal rate
  if (G.quickFlipCharges && G.quickFlipCharges > 0) {
    const boosted = Math.max(0.1, Math.round(marketPrice(cardId) * 0.80 * 10) / 10);
    if (boosted > price) {
      price = boosted;
      G.quickFlipCharges--;
      showToast(`⚡ Quick Flip! ${G.quickFlipCharges} left`, 'success');
    }
  }

  G.collection.set(cardId, cardCount(cardId) - 1);
  G.budget += price;
  G.totalEarned += price;
  G.singlesSold++;
  Sounds.play('coin');
  const card = G.currentSet.cards.find(c => c.id === cardId);
  showToast(`Sold ${card.name} for ${fmt(price)}`, 'success');
  renderAll();
}

function actionPostAuction(cardId, askPrice) {
  const count = cardCount(cardId);
  if (count === 0) return;
  const price = parseFloat(askPrice);
  if (isNaN(price) || price < 0.1) { showToast('Enter a valid price!', 'danger'); return; }
  const maxSlots = G.maxAuctionSlots || CONFIG.baseAuctionSlots;
  if (G.auctionListings.length >= maxSlots) {
    showToast(`Auction full (${maxSlots} slots). Sell or wait for a buyer first.`, 'danger');
    return;
  }

  const card = G.currentSet.cards.find(c => c.id === cardId);
  if (count === 1) {
    showConfirm(
      `Listing last copy of ${card.emoji} ${card.name} will remove it from set progress if sold!`,
      'List Anyway',
      'Keep It',
      () => _doPostAuction(cardId, price)
    );
    return;
  }
  _doPostAuction(cardId, price);
}

function _doPostAuction(cardId, price) {
  // Remove card from collection while it's listed
  G.collection.set(cardId, cardCount(cardId) - 1);
  G.auctionListings.push({ cardId, askPrice: price, daysListed: 0 });
  Sounds.play('auction');
  const card = G.currentSet.cards.find(c => c.id === cardId);
  showToast(`Listed ${card.name} for ${fmt(price)} at auction`, 'success');
  renderAll();
}

function actionCancelAuction(cardId) {
  const idx = G.auctionListings.findIndex(l => l.cardId === cardId);
  if (idx === -1) return;
  G.auctionListings.splice(idx, 1);
  // Return card to collection
  G.collection.set(cardId, cardCount(cardId) + 1);
  showToast('Auction cancelled — card returned', 'warning');
  renderAll();
}

function actionSellAllDupes() {
  let total = 0; let count = 0;
  G.currentSet.cards.forEach(c => {
    const dupes = cardCount(c.id) - 1;
    if (dupes > 0) {
      const price = instantSellPrice(c.id) * dupes;
      G.collection.set(c.id, 1);
      G.budget += price;
      G.totalEarned += price;
      total += price;
      count += dupes;
    }
  });
  if (count === 0) { showToast('No duplicates to sell', 'warning'); return; }
  G.singlesSold += count;
  Sounds.play('sellAll');
  showToast(`Sold ${count} duplicates for ${fmt(total)}`, 'success');
  renderAll();
}

/* Shared helper — show digest then advance the day (used by all daily actions) */
function endDayWithDigest() {
  if (G.completed) return;
  Sounds.play('dayPass');
  const digestItems = buildDigestItems();
  showDailyDigest(digestItems, () => {
    advanceDay();
  });
}

function actionPassDay() {
  endDayWithDigest();
}

// Thief T3: claim cheapest unowned card for free
function actionThiefClaim() {
  if (G.thiefTier < 3 || G.thiefClaimUsed) return;
  const unowned = G.currentSet.cards.filter(c => cardCount(c.id) === 0);
  if (!unowned.length) { showToast('You own all cards!', 'warning'); return; }
  const cheapest = unowned.reduce((a, b) => marketPrice(a.id) < marketPrice(b.id) ? a : b);
  G.collection.set(cheapest.id, 1);
  G.thiefClaimUsed = true;
  Sounds.play('pity');
  showToast(`Thief: claimed ${cheapest.emoji} ${cheapest.name} for free!`, 'success');
  checkCompletion(); renderAll();
}

// Timekeeper T3: rewind 1 day
function actionTimekeeperRewind() {
  if (!G.timekeeperRewindAvailable || !G.daySnapshot) return;
  G.budget     = G.daySnapshot.budget;
  G.collection = new Map(G.daySnapshot.collection);
  G.market     = new Map(G.daySnapshot.market);
  G.trend      = new Map(G.daySnapshot.trend);
  G.priceHistory = new Map(G.daySnapshot.priceHistory.map(([id, hist]) => [id, [...hist]]));
  G.auctionListings = G.daySnapshot.auctionListings.map(l => ({ ...l }));
  G.day        = G.daySnapshot.day;
  G.totalSpent = G.daySnapshot.totalSpent;
  G.totalEarned = G.daySnapshot.totalEarned;
  G.activeEvent = G.daySnapshot.activeEvent;
  G.freePacks = G.daySnapshot.freePacks;
  G.packsSinceLastLegendary = G.daySnapshot.packsSinceLastLegendary;
  G.npcChanceToday = G.daySnapshot.npcChanceToday;
  G.npcEncounteredToday = G.daySnapshot.npcEncounteredToday;
  G.timekeeperRewindAvailable = false;
  G.daySnapshot = null;
  showToast('⏮ Day rewound! (one use per run)', 'success');
  renderAll();
}

/* ════════════════════════════════════════════════════════════════
   DAY ADVANCEMENT
   ════════════════════════════════════════════════════════════════ */
function advanceDay() {
  // Timekeeper T3 snapshot (before advancing)
  if (G.timekeeperTier >= 3 && G.timekeeperRewindAvailable === false && !G.daySnapshot) {
    G.timekeeperRewindAvailable = true;
  }
  if (G.timekeeperTier >= 3) {
    G.daySnapshot = {
      budget: G.budget,
      collection: new Map(G.collection),
      market: new Map(G.market),
      trend: new Map(G.trend),
      priceHistory: [...G.priceHistory.entries()].map(([id, hist]) => [id, [...hist]]),
      auctionListings: G.auctionListings.map(l => ({ ...l })),
      day: G.day,
      totalSpent: G.totalSpent,
      totalEarned: G.totalEarned,
      activeEvent: G.activeEvent,
      freePacks: G.freePacks,
      packsSinceLastLegendary: G.packsSinceLastLegendary,
      npcChanceToday: G.npcChanceToday,
      npcEncounteredToday: G.npcEncounteredToday,
    };
  }

  const prevNpcChance = G.npcChanceToday || 0;
  const encounteredYesterday = !!G.npcEncounteredToday;

  G.day++;
  G.npcChanceToday = encounteredYesterday
    ? CONFIG.npcChanceStep
    : Math.min(1, prevNpcChance + CONFIG.npcChanceStep);
  G.npcEncounteredToday = false;

  // Daily allowance
  G.budget += G.dailyAllowance;
  G.totalEarned += G.dailyAllowance;

  // Insurance perk — 35% chance to refund half a pack cost
  if (G.insuranceActive && Math.random() < 0.35) {
    const refund = Math.max(0.1, Math.round(G.packCost * 0.5 * 10) / 10);
    G.budget += refund;
    G.totalEarned += refund;
    showToast(`Insurance refunded ${fmt(refund)}!`, 'success');
  }

  // Big Mike's debt
  if (G.debtDue && G.day >= G.debtDue.byDay) {
    const pen = G.debtDue.penalty;
    const amt = G.debtDue.amount;
    if (G.budget >= amt) {
      G.budget -= amt;
      G.totalSpent += amt;
      showToast(`💸 Paid back Big Mike $${amt}`, 'warning');
    } else {
      G.budget -= pen;
      G.totalSpent += pen;
      showToast(`💀 Big Mike collected $${pen} penalty!`, 'danger');
    }
    G.debtDue = null;
  }

  // Reset daily flags
  G.networkUsedToday = false;
  G.bulkBoughtToday = 0;
  G.packsOpenedToday = 0;

  fluctuateMarket();
  rollEvent();
  rollAuctionBuyers();
  rollNpcEvent();

  // State-reactive ambient based on budget/day
  if (G.budget < 30 || G.day > 40) {
    Sounds.setAmbientState('tense');
  }

  // Second perk offer at day 10
  if (G.day === 10 && !G.perkOfferGiven) {
    G.perkOfferGiven = true;
    setTimeout(() => showPerkScreen(true), 300);
  }

  renderHUD();
  renderShop();
  renderMarket();
}

function checkCompletion() {
  if (!G.completed && G.currentSet.cards.every(c => cardCount(c.id) > 0)) {
    G.completed = true;
    setTimeout(showComplete, 600);
  }
}

/* ════════════════════════════════════════════════════════════════
   DAILY DIGEST
   ════════════════════════════════════════════════════════════════ */
function buildDigestItems() {
  const items = [];

  // Daily allowance coming
  items.push({ icon: '💰', text: `Daily allowance incoming: +${fmt(G.dailyAllowance)}`, type: 'positive' });

  // Big Mike debt warning
  if (G.debtDue) {
    const daysLeft = G.debtDue.byDay - G.day - 1;
    if (daysLeft <= 2) {
      const urgency = daysLeft <= 0 ? 'DUE NOW' : `due in ${daysLeft} day(s)`;
      items.push({ icon: '💀', text: `Big Mike debt: ${fmt(G.debtDue.amount)} ${urgency}!`, type: 'negative' });
    }
  }

  // Active market event
  if (G.activeEvent) {
    items.push({ icon: G.activeEvent.icon, text: `Event finished: ${G.activeEvent.title} — ${G.activeEvent.buildDesc(G)}`, type: 'event' });
  }

  // Tomorrow's event forecast from Insider perk / Oracle T2+
  const forecast = ensureEventForecast();
  if (forecast) {
    const ev = eventFromForecast(forecast);
    const text = ev
      ? `Tomorrow's forecast: ${ev.title} — ${ev.buildDesc(G)}`
      : "Tomorrow's forecast: Quiet day ahead";
    items.push({ icon: ev ? ev.icon : '📡', text, type: 'neutral' });
  }

  // Auction listings — buyer chance preview
  if (G.auctionListings.length) {
    G.auctionListings.forEach(l => {
      const card  = G.currentSet.cards.find(c => c.id === l.cardId);
      const chance = Math.min(1, auctionHitChance(l.askPrice, l.cardId));
      const pct5        = Math.round(Math.round(chance * 100) / 5) * 5;
      const { dot }     = auctionChanceStyle(pct5);
      if (card) items.push({ icon: dot, text: `${card.name} @ ${fmt(l.askPrice)} — ~${pct5}% ± 5% buyer chance today`, type: 'neutral' });
    });
  }

  // Grade reminder
  const nextDay  = G.day + 1;
  const grade    = getGrade(nextDay);
  const gradeIcon = { S: '🥇', A: '🥈', B: '🥉', C: '🎖️', D: '💤' }[grade] || '🎖️';
  items.push({ icon: gradeIcon, text: `After today: Day ${nextDay} — on track for Grade ${grade}`, type: 'neutral' });

  return items;
}

function showDailyDigest(items, onClose) {
  const overlay = document.getElementById('daily-digest');
  const list    = document.getElementById('digest-list');
  const dayEl   = document.getElementById('digest-day');

  dayEl.textContent = `Day ${G.day} → ${G.day + 1}`;

  list.innerHTML = items.length
    ? items.map(item => `
        <div class="digest-item digest-${item.type}">
          <span class="digest-icon">${item.icon}</span>
          <span class="digest-text">${item.text}</span>
        </div>`).join('')
    : '<div class="digest-item digest-neutral"><span class="digest-text">Quiet day ahead. Markets look stable.</span></div>';

  overlay.classList.remove('hidden');

  document.getElementById('btn-digest-close').onclick = () => {
    overlay.classList.add('hidden');
    if (onClose) onClose();
  };
}

/* ════════════════════════════════════════════════════════════════
   CONTACTS SCREEN
   ════════════════════════════════════════════════════════════════ */
function showContacts() {
  const screen = document.getElementById('contacts-screen');
  const list   = document.getElementById('contacts-list');

  if (!G || !G.npcLog || G.npcLog.length === 0) {
    list.innerHTML = '<div class="contacts-empty">No encounters yet this run.<br>NPCs visit randomly each day.</div>';
  } else {
    const byNpc = new Map();
    G.npcLog.forEach(entry => {
      const key = entry.id || entry.name;
      if (!byNpc.has(key)) {
        byNpc.set(key, {
          id: entry.id,
          name: entry.name,
          emoji: entry.emoji,
          bio: entry.bio || '',
          rel: entry.rel || 0,
          latestDay: entry.day || 0,
          encounters: [],
        });
      }
      const group = byNpc.get(key);
      if ((entry.day || 0) >= group.latestDay) {
        group.rel = entry.rel || 0;
        group.latestDay = entry.day || 0;
        if (entry.bio) group.bio = entry.bio;
      }
      group.encounters.push(entry);
    });

    const groups = [...byNpc.values()].sort((a, b) => b.latestDay - a.latestDay);
    list.innerHTML = groups.map(group => {
      const hearts = '❤️'.repeat(group.rel || 0) + '🖤'.repeat(3 - (group.rel || 0));
      const portraitHTML = group.id
        ? `<span class="contact-portrait">${assetIconHTML(`assets/npcs/${group.id}.png`, group.emoji, 'contact-portrait-img')}</span>`
        : `<span class="contact-emoji">${group.emoji}</span>`;
      const historyHtml = [...group.encounters]
        .sort((a, b) => (a.day || 0) - (b.day || 0))
        .map(entry => {
          const outcomeClass = entry.outcome === 'Accepted'
            ? 'outcome-yes'
            : entry.outcome === 'Declined'
              ? 'outcome-no'
              : 'outcome-no';
          const prefix = entry.outcome === 'Accepted' ? '✓' : entry.outcome === 'Declined' ? '✕' : '•';
          const text = entry.rewardText && entry.outcome === 'Accepted'
            ? decorateContactRewardText(entry.rewardText)
            : entry.outcome;
          return `<div class="contact-history-item ${outcomeClass}">
            <span class="contact-history-prefix">${prefix}</span>
            <span class="contact-history-text">Day ${entry.day}: ${text}</span>
          </div>`;
        }).join('');

      return `<div class="contact-entry">
        <div class="contact-top">
          ${portraitHTML}
          <span class="contact-name">${group.name}</span>
          <span class="contact-hearts">${hearts}</span>
        </div>
        ${group.bio ? `<div class="contact-bio">${group.bio}</div>` : ''}
        <div class="contact-history">${historyHtml}</div>
      </div>`;
    }).join('');
  }

  screen.classList.remove('hidden');
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decorateContactRewardText(text) {
  let out = String(text || '');
  if (!G || !G.currentSet || !G.currentSet.cards) return out;
  const cards = [...G.currentSet.cards].sort((a, b) => b.name.length - a.name.length);
  cards.forEach(card => {
    const token = `${card.emoji} ${card.name}`;
    const icon = `<span class="contact-reward-card">${assetIconHTML(`assets/cards/${card.id}.png`, card.emoji, 'contact-reward-img')}</span>${card.name}`;
    out = out.replace(new RegExp(escapeRegExp(token), 'g'), icon);
  });
  return out;
}

/* ════════════════════════════════════════════════════════════════
   MID-RUN PERK APPLICATION
   ════════════════════════════════════════════════════════════════ */
function applyMidRunPerk(perkId) {
  document.getElementById('perk-screen').classList.add('hidden');
  const perk = PERKS.find(p => p.id === perkId);
  if (perk && G) {
    if (!G.perkIds.includes(perkId)) G.perkIds.push(perkId);
    perk.apply(G);
    showToast(`🎴 Day 10 bonus: ${perk.emoji} ${perk.name} activated!`, 'success');
    renderAll();
  }
}

/* ════════════════════════════════════════════════════════════════
   PORTAL INTEGRATION
   ════════════════════════════════════════════════════════════════ */
function setupPortal() {
  const params = new URLSearchParams(window.location.search);
  const viaPortal = params.get('portal') === 'true' || params.get('portal') === '1';
  const ref = params.get('ref');

  if (viaPortal && ref) {
    const returnDiv = document.getElementById('portal-return');
    returnDiv.classList.remove('hidden');
    document.getElementById('btn-return-portal').addEventListener('click', () => {
      let url = ref;
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      const fwd = new URLSearchParams(window.location.search);
      fwd.delete('ref');
      window.location.href = url + (fwd.toString() ? '?' + fwd.toString() : '');
    });
  }

  function goPortal() {
    const p = new URLSearchParams();
    p.set('portal', 'true');
    p.set('ref', window.location.hostname || 'sethunter.game');
    window.location.href = 'https://vibej.am/portal/2026?' + p.toString();
  }

  document.getElementById('btn-portal').addEventListener('click', goPortal);
  const btnPortalComplete = document.getElementById('btn-portal-complete');
  if (btnPortalComplete) btnPortalComplete.addEventListener('click', goPortal);
}

/* ════════════════════════════════════════════════════════════════
   SKILL TREE
   ════════════════════════════════════════════════════════════════ */
const SKILL_BRANCHES = [
  {
    id: 'oracle', name: 'The Oracle', emoji: '🔭',
    tiers: [
      { name: 'Price Trends',    desc: 'Trend arrows (↑↓) shown for all market cards.' },
      { name: 'Event Forecast',  desc: 'Next event type hinted 1 day early.' },
      { name: 'Price Preview',   desc: 'Expected prices for tomorrow shown in market.' },
    ],
  },
  {
    id: 'negotiator', name: 'The Negotiator', emoji: '🤝',
    tiers: [
      { name: 'Better Deals',    desc: 'Instant sell rate +10% (50% → 60%).' },
      { name: 'Buyer Network',   desc: 'Auction buyer chances all +15%.' },
      { name: 'First Dibs',      desc: 'Once per run: buy any card at 60% market price.' },
    ],
  },
  {
    id: 'gambler', name: 'The Gambler', emoji: '🎲',
    tiers: [
      { name: 'Hot Odds',        desc: 'Legendary pack chance +25%.' },
      { name: 'Faster Pity',     desc: 'Pity interval -2 packs.' },
      { name: 'Bonus Slot',      desc: 'Every 5th pack gets an extra 6th card.' },
    ],
  },
  {
    id: 'thief', name: 'The Thief', emoji: '🦹',
    tiers: [
      { name: 'Extra Allowance', desc: 'Daily allowance +$2.' },
      { name: 'Light Fingers',   desc: '10% chance each pack yields an extra free card.' },
      { name: 'One-Time Claim',  desc: 'Once per run: claim cheapest unowned card free.' },
    ],
  },
  {
    id: 'timekeeper', name: 'The Timekeeper', emoji: '⌛',
    tiers: [
      { name: 'Market Grace',    desc: 'Pass Day: market swings are slightly softer.' },
      { name: 'Event Cutter',    desc: 'Bad market events are blocked before they trigger.' },
      { name: 'Time Rewind',     desc: 'Once per run: undo the last day advance.' },
    ],
  },
  {
    id: 'salesman', name: 'The Salesman', emoji: '💼',
    tiers: [
      { name: 'Pitch',       desc: 'Auction listing slots +1 (3 → 4 simultaneous listings).' },
      { name: 'Enthusiasm',  desc: 'Auction listing slots +1 (4 → 5 simultaneous listings).' },
      { name: 'Conviction',  desc: 'Auction listing slots +2 (5 → 7 simultaneous listings).' },
    ],
  },
  {
    id: 'teamplayer', name: 'Team Player', emoji: '🌍',
    tiers: [
      { name: "Fossil Luck",    desc: 'Ace draw chance ×1.5 (0.1% → 0.15% per pack).' },
      { name: "Fossil Hunter",  desc: 'Ace draw chance ×3 (0.1% → 0.3% per pack).' },
      { name: "Ace Magnet",     desc: 'Ace draw chance ×4 (0.1% → 0.4% per pack). Also prioritizes unfound aces.' },
    ],
  },
];

function loadSkills() {
  const def = { oracle: 0, negotiator: 0, gambler: 0, thief: 0, timekeeper: 0, salesman: 0, teamplayer: 0, stars: 0 };
  try {
    return Object.assign({}, def, JSON.parse(localStorage.getItem('setHunterSkills') || '{}'));
  } catch { return def; }
}

function saveSkills(skills) {
  localStorage.setItem('setHunterSkills', JSON.stringify(skills));
}

function applySkillBonuses() {
  const skills = loadSkills();
  G.oracleTier     = skills.oracle     || 0;
  G.negotiatorTier = skills.negotiator || 0;
  G.gamblerTier    = skills.gambler    || 0;
  G.thiefTier      = skills.thief      || 0;
  G.timekeeperTier = skills.timekeeper || 0;
  G.salesmanTier   = skills.salesman   || 0;

  if (G.negotiatorTier >= 1) G.instantSellRate += 0.10;
  if (G.negotiatorTier >= 2) G.auctionBonus   += 0.15;
  if (G.negotiatorTier >= 3) G.firstDibsAvailable = true;

  if (G.gamblerTier >= 1) G.legChanceMult  = (G.legChanceMult || 1) * 1.25;
  if (G.gamblerTier >= 2) G.pityInterval   = Math.max(1, G.pityInterval - 2);
  if (G.gamblerTier >= 3) G._gamblerBonusCounter = 0;

  if (G.thiefTier >= 1) G.dailyAllowance += 2;
  if (G.thiefTier >= 3) G.thiefClaimUsed = false;

  if (G.timekeeperTier >= 1) G.marketDriftScale *= 0.85;
  if (G.timekeeperTier >= 3) G.timekeeperRewindAvailable = true;

  // Salesman: tier 1 → +1 slot, tier 2 → +1, tier 3 → +2 (total: 3, 4, 5, 7)
  if (G.salesmanTier >= 1) G.maxAuctionSlots += 1;
  if (G.salesmanTier >= 2) G.maxAuctionSlots += 1;
  if (G.salesmanTier >= 3) G.maxAuctionSlots += 2;

  // Team Player: ace draw chance multiplier
  G.teamplayerTier = skills.teamplayer || 0;
  G.aceChanceMult  = G.teamplayerTier >= 3 ? 4.0
                   : G.teamplayerTier >= 2 ? 3.0
                   : G.teamplayerTier >= 1 ? 1.5
                   : 1.0;
}

async function showSkillTree() {
  await preloadUiArt();
  const skills = loadSkills();
  const panel = document.getElementById('skill-screen');
  const content = document.getElementById('skill-tree-content');

  content.innerHTML = `
    <div class="skill-header">
      <h2 class="skill-title">Skill Tree</h2>
      <div class="skill-stars">⭐ ${skills.stars} Stars available</div>
    </div>
    <div class="skill-branches">
      ${SKILL_BRANCHES.map(b => `
        <div class="skill-branch">
          <div class="branch-label">
            ${assetIconHTML(`assets/skills/${b.id}.png`, b.emoji, 'branch-art')}
            ${b.name}
          </div>
          ${b.tiers.map((t, i) => {
            const tier = i + 1;
            const locked = (skills[b.id] || 0) < tier;
            const owned  = (skills[b.id] || 0) >= tier;
            const canAfford = skills.stars >= CONFIG.skillStarCost[i];
            const canUnlock = !owned && !locked || (!owned && (skills[b.id] || 0) === i && canAfford);
            const unlockable = !owned && (skills[b.id] || 0) === i && canAfford;
            const cls = owned ? 'skill-node owned' : unlockable ? 'skill-node unlockable' : 'skill-node locked';
            return `<div class="${cls}" data-branch="${b.id}" data-tier="${tier}" title="${t.desc}">
              <div class="sn-tier">T${tier}</div>
              <div class="sn-name">${t.name}</div>
              <div class="sn-desc">${t.desc}</div>
              ${owned ? '<div class="sn-status">✓ Owned</div>'
                : unlockable ? `<button class="sn-buy-btn" data-branch="${b.id}" data-tier="${tier}" data-cost="${CONFIG.skillStarCost[i]}">Unlock ⭐×${CONFIG.skillStarCost[i]}</button>`
                : `<div class="sn-status">${(skills[b.id]||0) < i ? '🔒 Unlock T'+(i)+' first' : '⭐ Need '+ CONFIG.skillStarCost[i] +' stars'}</div>`}
            </div>`;
          }).join('')}
        </div>
      `).join('')}
    </div>`;

  // Attach buy handlers
  content.querySelectorAll('.sn-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const branchId = btn.dataset.branch;
      const tier     = parseInt(btn.dataset.tier);
      const cost     = parseInt(btn.dataset.cost);
      const s = loadSkills();
      if (s.stars < cost) return;
      s.stars -= cost;
      s[branchId] = tier;
      saveSkills(s);
      Sounds.play('pity');
      showSkillTree(); // re-render
    });
  });

  panel.classList.remove('hidden');
}

/* ════════════════════════════════════════════════════════════════
   PERKS SELECTION SCREEN
   ════════════════════════════════════════════════════════════════ */
async function showPerkScreen(midRun = false) {
  await preloadUiArt();
  if (!midRun) {
    document.getElementById('intro-screen').classList.add('hidden');
    document.getElementById('complete-overlay').classList.add('hidden');
  }

  const screen   = document.getElementById('perk-screen');
  const grid     = document.getElementById('perk-grid');
  const subtitle = screen.querySelector('.perk-modal-sub');
  if (subtitle) {
    subtitle.textContent = midRun
      ? '🎴 Day 10 bonus! Choose a second perk to stack for the rest of this run.'
      : 'One modifier that lasts the whole run';
  }

  // Exclude already-held perks from mid-run offer
  const heldIds = (G && G.perkIds) || [];
  const available = midRun && G ? PERKS.filter(p => !heldIds.includes(p.id)) : PERKS;

  // Pick 3 perks from 3 distinct families
  const byFamily = {};
  available.forEach(p => { (byFamily[p.family] = byFamily[p.family] || []).push(p); });
  const families = Object.keys(byFamily).sort(() => Math.random() - 0.5);
  const picks = [];
  for (const f of families) {
    if (picks.length >= 3) break;
    picks.push(randFrom(byFamily[f]));
  }
  // Fallback if fewer than 3 families
  if (picks.length < 3) {
    const extra = available.filter(p => !picks.includes(p)).sort(() => Math.random() - 0.5);
    picks.push(...extra.slice(0, 3 - picks.length));
  }

  // Record offered perks for Codex discovery
  picks.forEach(p => recordDiscovery('perk', p.id));

  grid.innerHTML = picks.map(p => `
    <div class="perk-card" data-id="${p.id}">
      <div class="perk-family-tag">${p.family}</div>
      <div class="perk-emoji">
        ${assetIconHTML(`assets/perks/${p.id}.png`, p.emoji, 'perk-art')}
      </div>
      <div class="perk-name">${p.name}</div>
      <div class="perk-desc">${p.desc}</div>
      <button class="btn-primary perk-pick-btn" data-id="${p.id}">Choose</button>
    </div>
  `).join('');

  grid.querySelectorAll('.perk-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => midRun ? applyMidRunPerk(btn.dataset.id) : confirmPerk(btn.dataset.id));
  });

  document.getElementById('btn-skip-perk').onclick = () => {
    if (midRun) { screen.classList.add('hidden'); }
    else { confirmPerk(null); }
  };

  screen.classList.remove('hidden');
}

function confirmPerk(perkId) {
  document.getElementById('perk-screen').classList.add('hidden');

  G = createState(_pendingSet);
  Sounds.setSet(G.currentSet.id);   // switch to this set's track
  _pendingSet = null;
  _msgQueue.length = 0;
  _msgBusy = false;
  _currentNpc = null;

  applySkillBonuses();

  if (perkId) {
    const perk = PERKS.find(p => p.id === perkId);
    if (perk) { G.perkIds = [perkId]; perk.apply(G); }
  }

  // Reset trends (no warm-up drift — base prices are formula-calibrated)
  G.currentSet.cards.forEach(c => G.trend.set(c.id, 'flat'));

  Sounds.setAmbientState('normal');

  document.getElementById('intro-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  document.getElementById('complete-overlay').classList.add('hidden');
  document.getElementById('event-banner').classList.add('hidden');

  PackRenderer.init();
  PackRenderer.setCurrentSet(G.currentSet.id); // preload set-specific card back texture
  preloadEmojiFont();
  preloadSetCardImages(G.currentSet);
  renderAll();
  showToast(`New run: "${G.currentSet.name}"${perkId ? ` — ${PERKS.find(p=>p.id===perkId)?.name} active!` : ''}`, 'success');

  if (G.currentSet.level === 1 && !sessionStorage.getItem('setHunterTutorialShown')) {
    sessionStorage.setItem('setHunterTutorialShown', '1');
    setTimeout(startTutorial, 700);
  }
}

/* showNextNpc is now handled by _showNpcNow via the unified queue. */

/* ════════════════════════════════════════════════════════════════
   TUTORIAL
   ════════════════════════════════════════════════════════════════ */
const TUTORIAL_STEPS = [
  { title: 'Welcome to Set Hunter!',   text: 'You\'re a TCG collector trying to complete a card set as fast as possible. Your grade depends on how many days it takes.',                                   target: null },
  { title: 'Pack Shop (Left)',          text: 'Buy packs here — 5 cards each. Pack prices scale by set; 3-pack and 5-pack bundles are discounted. Each pack action advances the day, or you can Rest without spending.',    target: '#shop-panel' },
  { title: 'Your Collection (Center)', text: 'Track every card here. Missing cards appear faded. Duplicates show a gold badge. Use the filter tabs to show only what you need.',                         target: '#collection-panel' },
  { title: 'Singles Market (Right)',   text: 'Buy specific cards directly, or sell duplicates. Buying a single is a daily action and advances the day. Post an auction to get better prices — buyers appear over multiple days.', target: '#market-panel' },
  { title: 'Ace Cards & Community',    text: 'Ultra-rare Ace cards can appear as a 6th card in a pack. They can\'t be traded on the market — they\'re for your trophy case. Below your collection, Worldwide Ace Discoveries shows which aces players around the world have found first; everyone contributes to the same puzzle. Tap a glowing pip to zoom an ace.', target: '#ace-tracker-section' },
  { title: 'Daily Allowance & Grade',  text: 'You earn a daily allowance each day. Complete the set faster for a higher grade: S by day 15, A by day 20, B by day 25, and C by day 30. Good luck!', target: '#hud' },
];

let _tutStep = 0;
let _prevTutTarget = null;
let _tutorialSingleMessage = false;

function startTutorial() {
  _tutorialSingleMessage = false;
  _tutStep = 0;
  showTutorialStep();
}

function _tutGlow(el) {
  let g = document.getElementById('tut-glow');
  if (!el) { if (g) g.remove(); return; }
  if (!g) { g = document.createElement('div'); g.id = 'tut-glow'; document.body.appendChild(g); }
  const pad = 6;
  const r   = el.getBoundingClientRect();
  g.style.top    = (r.top    - pad) + 'px';
  g.style.left   = (r.left   - pad) + 'px';
  g.style.width  = (r.width  + pad * 2) + 'px';
  g.style.height = (r.height + pad * 2) + 'px';
}

function showTutorialStep() {
  _tutorialSingleMessage = false;
  if (_prevTutTarget) {
    const prevEl = document.querySelector(_prevTutTarget);
    if (prevEl) prevEl.classList.remove('tut-spotlight');
    _prevTutTarget = null;
  }

  const step = TUTORIAL_STEPS[_tutStep];
  if (!step) { closeTutorial(); return; }

  document.getElementById('tut-title').textContent   = step.title;
  document.getElementById('tut-text').textContent    = step.text;
  document.getElementById('tut-counter').textContent = `${_tutStep + 1} / ${TUTORIAL_STEPS.length}`;
  document.getElementById('tut-counter').style.display = '';
  document.getElementById('btn-tut-skip').classList.remove('hidden');
  document.getElementById('btn-tut-next').textContent = 'Next →';
  Sounds.play('tutStep');

  if (step.target) {
    const el = document.querySelector(step.target);
    if (el) {
      el.classList.add('tut-spotlight');
      _prevTutTarget = step.target;
      _tutGlow(el);
      if (step.target === '#ace-tracker-section') {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    } else {
      _tutGlow(null);
    }
  } else {
    _tutGlow(null);
  }

  document.getElementById('tut-backdrop').classList.remove('hidden');
  document.getElementById('tutorial-overlay').classList.remove('hidden');
}

function showTutorialStyleMessage(title, text, target = null) {
  _tutorialSingleMessage = true;
  if (_prevTutTarget) {
    const prevEl = document.querySelector(_prevTutTarget);
    if (prevEl) prevEl.classList.remove('tut-spotlight');
    _prevTutTarget = null;
  }
  document.getElementById('tut-title').textContent = title;
  document.getElementById('tut-text').textContent = text;
  document.getElementById('tut-counter').textContent = '';
  document.getElementById('tut-counter').style.display = 'none';
  document.getElementById('btn-tut-skip').classList.add('hidden');
  document.getElementById('btn-tut-next').textContent = 'Close';
  Sounds.play('tutStep');

  if (target) {
    const el = document.querySelector(target);
    if (el) {
      el.classList.add('tut-spotlight');
      _prevTutTarget = target;
      _tutGlow(el);
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else {
      _tutGlow(null);
    }
  } else {
    _tutGlow(null);
  }

  document.getElementById('tut-backdrop').classList.remove('hidden');
  document.getElementById('tutorial-overlay').classList.remove('hidden');
}

function closeTutorial() {
  if (_prevTutTarget) {
    const prevEl = document.querySelector(_prevTutTarget);
    if (prevEl) prevEl.classList.remove('tut-spotlight');
    _prevTutTarget = null;
  }
  _tutGlow(null);
  _tutorialSingleMessage = false;
  document.getElementById('tut-counter').style.display = '';
  document.getElementById('btn-tut-skip').classList.remove('hidden');
  document.getElementById('btn-tut-next').textContent = 'Next →';
  document.getElementById('tut-backdrop').classList.add('hidden');
  document.getElementById('tutorial-overlay').classList.add('hidden');
}

/* ════════════════════════════════════════════════════════════════
   CARD DETAIL POPUP
   ════════════════════════════════════════════════════════════════ */
const RARITY_HEX = {
  common:    '#888899',
  uncommon:  '#2dd86e',
  rare:      '#4499ff',
  legendary: '#ffaa22',
};

function showCardPopup(card) {
  const overlay  = document.getElementById('card-popup-overlay');
  const box      = document.getElementById('card-popup-box');
  const color    = RARITY_HEX[card.rarity] || '#888899';
  const mode     = 'artwork';
  const price    = G ? marketPrice(card.id) : card.basePrice;
  const count    = G ? cardCount(card.id) : 0;
  const revealed = isRevealedCard(card);

  box.style.setProperty('--popup-rarity-color', color);

  const artHtml = !revealed
    ? `<span class="popup-emoji mystery-popup-icon">?</span>`
    : mode === 'artwork'
      ? `<img class="popup-art" src="assets/cards/${card.id}.png" alt="${card.name}"
              onerror="this.style.display='none';this.nextElementSibling.style.display='block'">`
        + `<span class="popup-emoji" style="display:none">${card.emoji}</span>`
      : `<span class="popup-emoji">${card.emoji}</span>`;

  box.innerHTML = `
    <button class="popup-close" id="popup-close-btn">✕</button>
    ${artHtml}
    <div class="popup-name">${revealed ? card.name : '???'}</div>
    <div class="popup-rarity">${card.rarity.toUpperCase()}</div>
    <div class="popup-flavor">${revealed ? `"${card.flavor}"` : '<em>Pull it to reveal its secret.</em>'}</div>
    <div class="popup-price">Market: ${fmt(price)} · Owned: ×${count}</div>`;

  overlay.classList.remove('hidden');

  document.getElementById('popup-close-btn').onclick = () => overlay.classList.add('hidden');
  overlay.onclick = e => { if (e.target === overlay) overlay.classList.add('hidden'); };
}

/* ════════════════════════════════════════════════════════════════
   CONFIRM DIALOG
   ════════════════════════════════════════════════════════════════ */
function showConfirm(msg, yesLabel, noLabel, onYes) {
  _confirmCallback = onYes;
  const textEl = document.getElementById('confirm-text');
  textEl.textContent = msg;  // clears any previous input children too
  document.getElementById('confirm-yes').textContent = yesLabel || 'Yes';
  document.getElementById('confirm-no').textContent  = noLabel  || 'Cancel';
  document.getElementById('confirm-dialog').classList.remove('hidden');
}

function returnToMainMenu() {
  showConfirm(
    'Return to the main menu? Your current run will be abandoned.',
    'Main Menu',
    'Stay',
    () => {
      _msgQueue.length = 0;
      _msgBusy = false;
      _currentNpc = null;
      Sounds.setAmbientState('normal');
      Sounds.setSet('home');
      document.getElementById('game-screen')?.classList.add('hidden');
      document.getElementById('complete-overlay')?.classList.add('hidden');
      document.getElementById('event-banner')?.classList.add('hidden');
      document.getElementById('npc-dialog')?.classList.add('hidden');
      document.getElementById('intro-screen')?.classList.remove('hidden');
    }
  );
}

function showAceInfoPopup() {
  showTutorialStyleMessage(
    'Ace Cards & Community',
    'Ultra-rare Ace cards can appear as a 6th card in a pack. They can\'t be traded on the market — they\'re for your trophy case. Below your collection, Worldwide Ace Discoveries shows which aces players around the world have found first; everyone contributes to the same puzzle. Tap a glowing pip to zoom an ace.',
    '#ace-tracker-section'
  );
}

/* ════════════════════════════════════════════════════════════════
   RENDERING
   ════════════════════════════════════════════════════════════════ */
const ACTIVE = { filter: 'all', sort: 'rarity' };

/* ════════════════════════════════════════════════════════════════
   GLOBAL ACE STATUS & CELEBRATION
   ════════════════════════════════════════════════════════════════ */
let _aceStatusPollTimer = null;

const ACE_SET_COLORS = {
  home:    '#d4914a',
  aquatic: '#33aadd',
  desert:  '#ee8833',
  savanna: '#77bb44',
};

// large=true renders a bigger, labelled version with finder names and ace images
function buildAceCirclesHTML(discovered, large = false) {
  const d = discovered || {};
  const SET_LABELS = { home: 'Home', aquatic: 'Aquatic', desert: 'Desert', savanna: 'Savanna' };
  const groups = ['home', 'aquatic', 'desert', 'savanna'].map(setId => {
    const color = ACE_SET_COLORS[setId];
    const aces  = ALL_ACES.filter(a => a.setId === setId);

    const pipClass = large ? 'ace-pip ace-pip-found ace-pip-lg' : 'ace-pip ace-pip-found';
    const missingClass = large ? 'ace-pip ace-pip-lg' : 'ace-pip';
    const circles = aces.map(ace => {
      const entry  = d[ace.id];
      const found  = !!entry;
      const finder = found && typeof entry === 'object' && entry.firstBy ? entry.firstBy : null;
      const style  = found
        ? `border-color:${color};box-shadow:0 0 ${large ? 10 : 5}px ${color}`
        : `border-color:${color}44`;
      const title  = found ? `${ace.name}${finder ? ' — found by ' + finder : ''}` : '???';
      const finderLabel = large && finder
        ? `<span class="ace-pip-finder">${finder}</span>` : '';

      let innerContent;
      if (found && large) {
        innerContent = `<img src="assets/aces/${ace.id}.png" class="ace-pip-img"
          alt="${ace.name}" title="${title}"
          onerror="this.style.display='none';this.nextSibling.style.display='flex'">
          <span class="ace-pip-emoji-fallback" style="display:none">${ace.emoji}</span>`;
      } else if (found) {
        innerContent = '';
      } else {
        innerContent = '?';
      }

      const clickAttr = large
        ? `data-ace-id="${ace.id}" style="${style};cursor:pointer"`
        : `style="${style}"`;

      return `<span class="ace-pip-wrap">
        <span class="${found ? pipClass : missingClass}" ${clickAttr} title="${title}">${innerContent}</span>
        ${finderLabel}
      </span>`;
    }).join('');

    if (large) {
      return `<span class="ace-pip-group-lg">
        <span class="ace-set-label" style="color:${color}">${SET_LABELS[setId]}</span>
        <span class="ace-pips-row">${circles}</span>
      </span>`;
    }
    return `<span class="ace-pip-group">${circles}</span>`;
  }).join('');

  const count = Object.keys(d).length;
  if (large) {
    return `<span class="ace-circles-wrap-lg">${groups}</span>`;
  }
  return `<span class="ace-circles-wrap">${groups}</span><span class="ace-circles-label">${count}/20</span>`;
}

function updateAceStatusBar(discovered, total) {
  localStorage.setItem('setHunterLastKnownAces', JSON.stringify(discovered || {}));
  const htmlLarge = buildAceCirclesHTML(discovered, true);
  // All ace status containers use the large layout
  document.querySelectorAll('.global-ace-status').forEach(el => {
    el.innerHTML = htmlLarge;
  });
  const trackerEl = document.getElementById('ace-tracker-ingame');
  if (trackerEl) trackerEl.innerHTML = htmlLarge;
}

async function pollGlobalAceStatus() {
  try {
    const r = await fetch('/api/aces');
    if (!r.ok) return;
    const data = await r.json();
    const total = data.total || 20;

    // Merge API discovered with locally-owned aces so local finds always show,
    // even when Vercel KV isn't configured or the POST hasn't been processed yet.
    const apiDiscovered = data.discovered || {};
    const localAces = loadAces();
    const merged = { ...apiDiscovered };
    const playerName = localStorage.getItem('setHunterPlayerName') || 'you';
    Object.keys(localAces).forEach(id => {
      if (!merged[id]) merged[id] = { firstBy: playerName, foundAt: Date.now() };
    });

    // First successful sync establishes the "news" baseline without backfilling alerts.
    const newsPrimed = localStorage.getItem('setHunterAceNewsPrimed') === 'yes';

    // Check for new global discoveries since last check
    let lastKnown = {};
    try { lastKnown = JSON.parse(localStorage.getItem('setHunterLastKnownAces') || '{}'); } catch {}
    const newlyFound = newsPrimed
      ? Object.entries(apiDiscovered).filter(([id]) => !lastKnown[id] && !localAces[id])
      : [];
    if (newlyFound.length > 0) {
      newlyFound.forEach(([id]) => {
        const ace = ALL_ACES.find(a => a.id === id);
        if (ace) showGlobalAceCelebration(ace, data);
      });
    }
    updateAceStatusBar(merged, total);
    if (!newsPrimed) localStorage.setItem('setHunterAceNewsPrimed', 'yes');
  } catch {}
}

function startAceStatusPolling() {
  // Immediately show circles: merge cached global data with local aces
  let lastKnown = {};
  try { lastKnown = JSON.parse(localStorage.getItem('setHunterLastKnownAces') || '{}'); } catch {}
  const playerName = localStorage.getItem('setHunterPlayerName') || 'you';
  const localAces = loadAces();
  const initialMerged = { ...lastKnown };
  Object.keys(localAces).forEach(id => {
    if (!initialMerged[id]) initialMerged[id] = { firstBy: playerName, foundAt: Date.now() };
  });
  updateAceStatusBar(initialMerged, 20);

  pollGlobalAceStatus();
  clearInterval(_aceStatusPollTimer);
  _aceStatusPollTimer = setInterval(pollGlobalAceStatus, 120_000); // every 2 min
}

function showAceCelebrationLocal(ace, wasNew) {
  const overlay = document.getElementById('ace-found-overlay');
  if (!overlay) return;
  const ownedAces = loadAces();
  const count = ownedAces[ace.id] || 1;
  // Show ace image, fall back to emoji if missing
  const emojiEl = overlay.querySelector('.ace-found-emoji');
  emojiEl.innerHTML = `<img src="assets/aces/${ace.id}.png" class="ace-celebration-img"
    alt="${ace.name}" onerror="this.outerHTML='<span style=\\'font-size:64px\\'>${ace.emoji}</span>'">`;
  overlay.querySelector('.ace-found-name').textContent   = ace.name;
  overlay.querySelector('.ace-found-flavor').textContent = ace.flavor;
  overlay.querySelector('.ace-found-status').textContent = wasNew
    ? '✨ First time finding this ace!'
    : `You now have ${count}× ${ace.name}`;
  overlay.querySelector('.ace-found-badge').textContent = 'ACE';
  overlay.classList.remove('hidden');
}

function showGlobalAceCelebration(ace, data) {
  const overlay = document.getElementById('ace-global-overlay');
  if (!overlay) return;
  const count = Object.keys(data.discovered || {}).length;
  const disc   = data.discovered?.[ace.id];
  // Show ace image, fall back to emoji
  const emojiEl = overlay.querySelector('.ace-global-emoji');
  emojiEl.innerHTML = `<img src="assets/aces/${ace.id}.png" class="ace-celebration-img"
    alt="${ace.name}" onerror="this.outerHTML='<span style=\\'font-size:64px\\'>${ace.emoji}</span>'">`;
  overlay.querySelector('.ace-global-name').textContent  = ace.name;
  overlay.querySelector('.ace-global-by').textContent = disc?.firstBy
    ? `First discovered by: ${disc.firstBy}` : '';
  overlay.querySelector('.ace-global-count').textContent =
    `${count} / ${data.total || 20} aces found worldwide`;
  overlay.classList.remove('hidden');
}

function showAceCollection() {
  // Build a modal showing all aces — found ones with image, unfound as '?'
  let disc = {};
  try { disc = JSON.parse(localStorage.getItem('setHunterLastKnownAces') || '{}'); } catch {}
  const playerName = getPlayerName() || 'you';
  const localAces = loadAces();
  Object.keys(localAces).forEach(id => {
    if (!disc[id]) disc[id] = { firstBy: playerName, foundAt: Date.now() };
  });

  const found = ALL_ACES.filter(a => disc[a.id]);
  const missing = ALL_ACES.filter(a => !disc[a.id]);
  const total = ALL_ACES.length;

  const foundHTML = found.map(ace => {
    const color = ACE_SET_COLORS[ace.setId] || '#888';
    const entry = disc[ace.id];
    const finder = typeof entry === 'object' && entry.firstBy ? entry.firstBy : null;
    return `<div class="ace-coll-card found" style="border-color:${color}">
      <img src="assets/aces/${ace.id}.png" class="ace-coll-img"
        onerror="this.outerHTML='<span style=\\'font-size:40px;line-height:1\\'>${ace.emoji}</span>'">
      <div class="ace-coll-name">${ace.name}</div>
      ${finder ? `<div class="ace-coll-finder" style="color:${color}">by ${finder}</div>` : ''}
    </div>`;
  }).join('');

  const missingHTML = missing.map(ace => {
    const color = ACE_SET_COLORS[ace.setId] || '#888';
    return `<div class="ace-coll-card missing" style="border-color:${color}44">
      <div class="ace-coll-unknown">?</div>
      <div class="ace-coll-name" style="opacity:.4">???</div>
    </div>`;
  }).join('');

  // Reuse leaderboard overlay structure for simplicity
  let modal = document.getElementById('ace-collection-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'ace-collection-modal';
    modal.className = 'overlay';
    modal.innerHTML = `<div class="ace-coll-modal">
      <div class="ace-coll-header">
        <h2 class="ace-coll-title">✨ Worldwide Ace Discoveries</h2>
        <button class="skill-close-btn" id="btn-ace-coll-close">✕ Close</button>
      </div>
      <div id="ace-coll-body"></div>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#btn-ace-coll-close').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
  }

  modal.querySelector('#ace-coll-body').innerHTML = `
    <p class="ace-coll-count">${found.length} / ${total} aces discovered worldwide</p>
    <div class="ace-coll-grid">${foundHTML}${missingHTML}</div>`;
  modal.classList.remove('hidden');
}

function showAceDetail(aceId) {
  document.getElementById('ace-collection-modal')?.classList.add('hidden');
  const ace = ALL_ACES.find(a => a.id === aceId);
  if (!ace) return;
  let disc = {};
  try { disc = JSON.parse(localStorage.getItem('setHunterLastKnownAces') || '{}'); } catch {}
  const entry = disc[ace.id];
  const finder = typeof entry === 'object' && entry.firstBy ? entry.firstBy : null;
  const color  = ACE_SET_COLORS[ace.setId] || '#ff8c00';
  const setLabel = { home: 'Home & Farm', aquatic: 'Aquatic World', desert: 'Desert', savanna: 'African Savanna' }[ace.setId] || ace.setId;

  // Reuse ace-found-overlay for the detail view
  const overlay = document.getElementById('ace-found-overlay');
  if (!overlay) return;
  const ownedAces = loadAces();
  const count = ownedAces[ace.id] || 0;
  const found = !!entry || count > 0;
  if (found) {
    overlay.querySelector('.ace-found-emoji').innerHTML =
      `<img src="assets/aces/${ace.id}.png" class="ace-celebration-img" style="border-color:${color}"
        alt="${ace.name}" onerror="this.outerHTML='<span style=\\'font-size:64px\\'>${ace.emoji}</span>'">`;
    overlay.querySelector('.ace-found-name').textContent   = ace.name;
    overlay.querySelector('.ace-found-flavor').textContent = ace.flavor;
    overlay.querySelector('.ace-found-status').innerHTML =
      `<span style="color:${color}">${setLabel}</span>` +
      (finder ? `<br><small>First found by: <strong>${finder}</strong></small>` : '') +
      (count > 0 ? `<br>You own ${count}×` : '');
    overlay.querySelector('.ace-found-badge').textContent = 'ACE';
    overlay.querySelector('.btn-ace-close').textContent = 'Amazing! ✨';
  } else {
    overlay.querySelector('.ace-found-emoji').innerHTML =
      `<span class="ace-unknown-mark" style="color:${color}">?</span>`;
    overlay.querySelector('.ace-found-name').textContent = 'Unknown Ace';
    overlay.querySelector('.ace-found-flavor').textContent =
      'This ace has not been discovered yet. Be the one who uncovers it.';
    overlay.querySelector('.ace-found-status').innerHTML =
      `<span style="color:${color}">${setLabel}</span><br><small>Not yet found worldwide.</small>`;
    overlay.querySelector('.ace-found-badge').textContent = 'UNFOUND';
    overlay.querySelector('.btn-ace-close').textContent = 'Still Hidden';
  }
  overlay.classList.remove('hidden');
}

function renderAll() {
  renderHUD();
  renderShop();
  renderCollection();
  renderMarket();
}

function renderHUD() {
  document.getElementById('set-theme').textContent      = G.currentSet.theme;
  document.getElementById('set-name').textContent       = G.currentSet.name;
  document.getElementById('stat-budget').textContent    = fmt(G.budget);
  document.getElementById('stat-spent').textContent     = fmt(G.totalSpent);
  document.getElementById('stat-progress').textContent  = `${ownedUnique()}/${G.currentSet.cards.length}`;
  document.getElementById('stat-day').textContent       = G.day;

  // Debt indicator
  const debtEl = document.getElementById('debt-indicator');
  if (G.debtDue) {
    const due = G.debtDue.byDay - G.day;
    debtEl.textContent = `💀 Debt ${fmt(G.debtDue.amount)} due in ${due}d`;
    debtEl.classList.remove('hidden');
  } else {
    debtEl.classList.add('hidden');
  }

  // Perk badge — show all held perks
  const perkEl = document.getElementById('perk-badge');
  const heldPerks = (G.perkIds || []).map(id => PERKS.find(p => p.id === id)).filter(Boolean);
  if (heldPerks.length) {
    perkEl.innerHTML = heldPerks.map(p => `<span class="perk-badge-item">${p.emoji} ${p.name}</span>`).join('');
    perkEl.classList.remove('hidden');
  } else {
    perkEl.classList.add('hidden');
  }
}

const SET_COLORS_GAME = {
  home:    '#c4803a',
  aquatic: '#2288bb',
  desert:  '#cc6622',
  savanna: '#449922',
};

function renderShop() {
  const cost = effectivePackCost();
  document.getElementById('pack-price-display').textContent = `${fmt(cost)} / pack`;
  document.getElementById('pack-set-label').textContent     = G.currentSet.name;

  // Update pack-visual: set-colored glow + set image as logo
  const setColor = SET_COLORS_GAME[G.currentSet.id] || '#9944ff';
  const packVisual = document.getElementById('pack-visual');
  if (packVisual) {
    packVisual.style.borderColor  = setColor;
    packVisual.style.boxShadow    = `0 8px 30px ${setColor}55, inset 0 0 40px ${setColor}18`;
    packVisual.style.background   = `linear-gradient(160deg, ${setColor}18, ${setColor}08, #09090f)`;
    const logo = packVisual.querySelector('.pack-logo');
    if (logo) {
      logo.innerHTML = `<img src="assets/sets/${G.currentSet.id}.png"
        style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid ${setColor}88"
        onerror="this.outerHTML='<span style=\\'font-size:44px\\'>${G.currentSet.theme}</span>'">`;
    }
  }

  const discountEl = document.getElementById('pack-discount-label');
  if (G.packDiscount < 1) {
    discountEl.textContent = `${Math.round((1 - G.packDiscount) * 100)}% DISCOUNT!`;
    discountEl.classList.remove('hidden');
  } else {
    discountEl.classList.add('hidden');
  }

  const free = G.freePacks;
  const c1 = packCostForN(1), c3 = packCostForN(3), c5 = packCostForN(5);
  document.getElementById('btn-open-1').textContent = free > 0 ? 'Open 1 Pack — FREE!' : `Open 1 Pack — ${fmt(c1)}`;
  document.getElementById('btn-open-3').textContent = `Open 3 Packs — ${fmt(c3)} (${fmt(Math.round(c3/3))}/ea)`;
  document.getElementById('btn-open-5').textContent = `Open 5 Packs — ${fmt(c5)} (${fmt(Math.round(c5/5))}/ea)`;
  document.getElementById('btn-open-1').disabled    = G.budget < c1;
  document.getElementById('btn-open-3').disabled    = G.budget < c3;
  document.getElementById('btn-open-5').disabled    = G.budget < c5;
  const thiefBtn = document.getElementById('btn-thief-claim');
  if (thiefBtn) {
    const show = G.thiefTier >= 3 && !G.thiefClaimUsed && G.currentSet.cards.some(c => cardCount(c.id) === 0);
    thiefBtn.classList.toggle('hidden', !show);
    thiefBtn.disabled = !show;
  }
  const rewindBtn = document.getElementById('btn-timekeeper-rewind');
  if (rewindBtn) {
    const show = G.timekeeperTier >= 3 && G.timekeeperRewindAvailable && !!G.daySnapshot;
    rewindBtn.classList.toggle('hidden', !show);
    rewindBtn.disabled = !show;
  }

  document.getElementById('allowance-label').textContent = `+${fmt(G.dailyAllowance)}/day`;

  // Update legendary odds display — combined per-pack chance across both slots.
  // Mirrors generateOnePack exactly (legChanceMult already includes Gambler T1).
  {
    const lm1 = G.luckyPacks ? 2 : 1;
    const lm2 = G.hotHandBonus ? 2 : 1;
    const lm3 = G.legChanceMult || 1;
    const lc4 = CONFIG.packOdds.slot4LegBase * lm1 * lm2 * lm3;
    const lc5 = CONFIG.packOdds.slot5LegBase * lm1 * lm2 * lm3;
    // P(at least one legendary) = P(slot4 leg) + P(slot4 not leg) × P(slot5 leg)
    const combinedLeg = lc4 + (1 - lc4) * lc5;
    const legPct = Math.min(100, Math.round(combinedLeg * 100));
    const oddsLeg = document.getElementById('odds-legendary');
    if (oddsLeg) oddsLeg.textContent = '~' + legPct + '%';

    // Ace odds (per-pack chance, considering aceChanceMult)
    const aceBase = 0.001; // 1 in 1000 base chance before Team Player multiplier
    const aceChance = aceBase * (G.aceChanceMult || 1);
    const oddsAce = document.getElementById('odds-ace');
    if (oddsAce) oddsAce.textContent = (aceChance * 100).toFixed(aceChance < 0.01 ? 2 : 1) + '%';
    const oddsNpcToday = document.getElementById('odds-npc-today');
    const oddsNpcTomorrow = document.getElementById('odds-npc-tomorrow');
    if (oddsNpcToday) {
      const todayState = G.npcEncounteredToday ? 'appeared' : 'not appeared';
      oddsNpcToday.textContent = `${Math.round((G.npcChanceToday || 0) * 100)}% (${todayState})`;
    }
    if (oddsNpcTomorrow) oddsNpcTomorrow.textContent = `${Math.round(getNpcChanceTomorrow() * 100)}%`;
  }
}

/* ── Collection ─────────────────────────────────────────────── */
/* Scroll the market panel to a card and briefly highlight it. */
function focusMarketCard(cardId) {
  const row = document.querySelector(`#market-list [data-card-id="${cardId}"]`);
  if (!row) return;
  row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  row.classList.add('market-item--focused');
  setTimeout(() => row.classList.remove('market-item--focused'), 1200);
}

// Legendary cards are "secret" until the player has pulled one.
function isRevealedCard(card) {
  return card.rarity !== 'legendary' || (G && cardCount(card.id) > 0);
}

function cardEmojiHTML(card) {
  if (!isRevealedCard(card)) return `<span class="mystery-icon">?</span>`;
  const mode = 'artwork';
  return mode === 'artwork'
    ? `<img src="assets/cards/${card.id}.png" class="card-art-img" alt="${card.name}">`
    : card.emoji;
}

/**
 * Returns an <img> from the given asset path, falling back to the emoji
 * text if the image fails to load. Used for perks, skills, events, sets.
 */
function assetIconHTML(path, fallbackEmoji, cls = 'asset-icon') {
  return `<img src="${path}" class="${cls}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display=''"><span class="asset-icon-fallback" style="display:none">${fallbackEmoji}</span>`;
}

function buildCardEl(card) {
  const count    = cardCount(card.id);
  const missing  = count === 0;
  const dupe     = count > 1;
  const revealed = isRevealedCard(card);
  const el = document.createElement('div');
  el.className = `card-item rarity-${card.rarity}${missing ? ' is-missing' : ''}${!revealed ? ' is-mystery-leg' : ''}`;
  el.innerHTML = `
    <div class="card-bg"></div>
    <div class="card-border"></div>
    <div class="card-content">
      <div class="card-emoji">${cardEmojiHTML(card)}</div>
      <div class="card-name">${revealed ? card.name : '???'}</div>
      <div class="card-dot"></div>
    </div>
    ${count > 0 ? `<div class="card-count${dupe ? ' is-dupe' : ''}">×${count}</div>` : ''}`;
  el.addEventListener('mouseenter', e => showTooltip(e, card));
  el.addEventListener('mouseleave', hideTooltip);
  el.addEventListener('mousemove',  moveTooltip);
  el.addEventListener('click', () => focusMarketCard(card.id));
  return el;
}

function renderCollection() {
  renderRarityBars();
  let cards = [...G.currentSet.cards];
  if (ACTIVE.filter === 'missing') cards = cards.filter(c => cardCount(c.id) === 0);
  if (ACTIVE.filter === 'dupes')   cards = cards.filter(c => cardCount(c.id) > 1);
  const grid = document.getElementById('collection-grid');
  grid.innerHTML = '';
  cards.forEach(c => grid.appendChild(buildCardEl(c)));
  scheduleCollectionGridLayout();

  // Sell all dupes button
  const hasDupes = G.currentSet.cards.some(c => cardCount(c.id) > 1);
  document.getElementById('btn-sell-all-dupes').disabled = !hasDupes;
}

function renderRarityBars() {
  const RARITIES = ['common','uncommon','rare','legendary'];
  const COLORS   = { common:'var(--c-common)',uncommon:'var(--c-uncommon)',rare:'var(--c-rare)',legendary:'var(--c-legendary)' };
  const LABELS   = { common:'Common',uncommon:'Uncommon',rare:'Rare',legendary:'Legendary' };
  const container = document.getElementById('rarity-bars');
  container.innerHTML = RARITIES.map(r => {
    const all   = G.currentSet.cards.filter(c => c.rarity === r);
    const owned = all.filter(c => cardCount(c.id) > 0);
    const pct   = all.length ? (owned.length / all.length * 100).toFixed(0) : 0;
    return `<div class="rb-item">
      <div class="rb-label" style="color:${COLORS[r]}">${LABELS[r]}</div>
      <div class="rb-track"><div class="rb-fill" style="width:${pct}%;background:${COLORS[r]}"></div></div>
      <div class="rb-count">${owned.length}/${all.length}</div>
    </div>`;
  }).join('');
}

/* ── Market ─────────────────────────────────────────────────── */
const RARITY_ORDER = { legendary: 0, rare: 1, uncommon: 2, common: 3 };
const RARITY_COLOR = { common:'rdot-common',uncommon:'rdot-uncommon',rare:'rdot-rare',legendary:'rdot-legendary' };

function buildSparkline(history) {
  if (!history || history.length < 2) return '';
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = Math.max(max - min, 1);
  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1)) * 52 + 2;
    const y = 16 - ((v - min) / range) * 12;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const isUp = history[history.length - 1] >= history[history.length - 2];
  const col  = isUp ? '#2dd86e' : '#ff3355';
  return `<svg viewBox="0 0 56 18" class="sparkline" style="overflow:visible">
    <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`;
}

function renderMarket() {
  let cards = [...G.currentSet.cards];
  if (ACTIVE.sort === 'price') {
    cards.sort((a,b) => marketPrice(b.id) - marketPrice(a.id));
  } else if (ACTIVE.sort === 'missing') {
    cards.sort((a,b) => {
      const am = cardCount(a.id) === 0 ? 0 : 1;
      const bm = cardCount(b.id) === 0 ? 0 : 1;
      return am !== bm ? am - bm : RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
    });
  } else if (ACTIVE.sort === 'owned') {
    cards.sort((a,b) => {
      const diff = cardCount(b.id) - cardCount(a.id);
      return diff !== 0 ? diff : RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
    });
  } else {
    cards.sort((a,b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);
  }

  const list = document.getElementById('market-list');
  list.innerHTML = '';

  cards.forEach(card => {
    const count    = cardCount(card.id);
    const price    = marketPrice(card.id);
    const sp       = instantSellPrice(card.id);
    const buyPrice = effectiveBuyPrice(card.id);
    const mirrorPrice = G.mirrorActive && !G.mirrorUsedToday && G.mirrorPrices
      ? G.mirrorPrices.get(card.id)
      : null;
    const mirrorDeal = mirrorPrice && mirrorPrice < price && buyPrice === mirrorPrice;
    const tr       = G.trend.get(card.id) || 'flat';
    const trIcon   = tr === 'up' ? '▲' : tr === 'down' ? '▼' : '—';
    const trClass  = tr === 'up' ? 't-up' : tr === 'down' ? 't-down' : 't-flat';
    const canBuy   = G.budget >= buyPrice;
    const canSell  = count > 0;
    const dibsPrice = Math.max(0.1, Math.round(price * 0.60 * 10) / 10);
    const canDibs  = G.firstDibsAvailable && !G.firstDibsUsed && G.budget >= dibsPrice;
    const history  = G.priceHistory.get(card.id) || [];
    const sparkline = buildSparkline(history);
    const nextPrice = G.oracleNextPrices ? G.oracleNextPrices.get(card.id) : null;
    const isListed  = G.auctionListings.some(l => l.cardId === card.id);

    // Price memory (7-day high/low)
    let memoryHtml = '';
    if (G.priceMemoryActive && history.length >= 2) {
      const lo = Math.min(...history); const hi = Math.max(...history);
      memoryHtml = `<div class="m-mem">Lo:${fmt(lo)} Hi:${fmt(hi)}</div>`;
    }

    const revealed = isRevealedCard(card);
    const el = document.createElement('div');
    el.className = `market-item${!revealed ? ' market-item--mystery' : ''}`;
    el.dataset.cardId = card.id;
    el.innerHTML = `
      <div class="m-emoji">${cardEmojiHTML(card)}</div>
      <div class="m-info">
        <div class="m-name">${revealed ? card.name : '? Legendary ?'}</div>
        <div class="m-rarity">
          <span class="rdot ${RARITY_COLOR[card.rarity]}"></span>
          ${card.rarity}
          <span class="m-owned-badge">×${count}</span>
          ${isListed ? '<span class="m-listed-tag">📋listed</span>' : ''}
        </div>
        ${revealed ? memoryHtml : ''}
      </div>
      <div class="m-price-col">
        <div class="m-price">${fmt(price)}</div>
        <div class="m-trend ${trClass}">${trIcon}</div>
        ${nextPrice ? `<div class="m-oracle">→${fmt(nextPrice)}</div>` : ''}
        ${sparkline}
      </div>
      <div class="m-actions">
        <button class="m-buy-btn" ${canBuy && !isListed ? '' : 'disabled'} data-id="${card.id}">Buy ${fmt(buyPrice)}${mirrorDeal ? ' 🪞' : ''}</button>
        ${G.firstDibsAvailable && !G.firstDibsUsed ? `<button class="m-dibs-btn" ${canDibs && !isListed ? '' : 'disabled'} data-id="${card.id}">Dibs ${fmt(dibsPrice)}</button>` : ''}
        <button class="m-sell-btn" ${canSell && !isListed ? '' : 'disabled'} data-id="${card.id}" title="Instant sell for ${fmt(sp)}">Sell ${fmt(sp)}</button>
        <button class="m-auction-btn" ${canSell && !isListed ? '' : 'disabled'} data-id="${card.id}">Auction</button>
      </div>`;

    el.querySelector('.m-buy-btn').addEventListener('click', e => {
      e.stopPropagation(); actionBuySingle(card.id);
    });
    el.querySelector('.m-sell-btn').addEventListener('click', e => {
      e.stopPropagation(); actionSellInstant(card.id);
    });
    el.querySelector('.m-dibs-btn')?.addEventListener('click', e => {
      e.stopPropagation(); actionFirstDibs(card.id);
    });
    el.querySelector('.m-auction-btn').addEventListener('click', e => {
      e.stopPropagation(); promptAuction(card);
    });
    // Click on the row (not buttons) → show enlarged card popup
    el.addEventListener('click', () => showCardPopup(card));

    list.appendChild(el);
  });

  renderAuctionListings();
}

function promptAuction(card) {
  const suggested = marketPrice(card.id);
  showConfirm(
    `List ${card.emoji} ${card.name} at auction. Enter asking price:`,
    'List It',
    'Cancel',
    () => {
      const input = document.getElementById('auction-price-input');
      const price = parseFloat(input ? input.value : suggested);
      actionPostAuction(card.id, isNaN(price) ? suggested : Math.round(price * 10) / 10);
    }
  );

  const confirmText = document.getElementById('confirm-text');
  const inp = document.createElement('input');
  inp.id = 'auction-price-input';
  inp.type = 'number';
  inp.min = 0.1;
  inp.step = 0.1;
  inp.value = suggested;
  inp.className = 'auction-price-field';
  confirmText.appendChild(document.createElement('br'));
  confirmText.appendChild(inp);

  // Live buyer-chance hint
  const hint = document.createElement('div');
  hint.id = 'auction-chance-hint';
  hint.className = 'auction-chance-hint';
  confirmText.appendChild(hint);

  function updateHint() {
    const price = parseFloat(inp.value);
    if (isNaN(price) || price < 0.1) { hint.textContent = ''; return; }
    const chance  = Math.min(1, auctionHitChance(price, card.id));
    const pct5    = Math.round(Math.round(chance * 100) / 5) * 5;
    const { dot, color } = auctionChanceStyle(pct5);
    hint.textContent = `${dot} ~${pct5}% chance for a buyer each day`;
    hint.style.color = color;
  }

  inp.addEventListener('input', updateHint);
  updateHint();
  inp.focus();
}

function renderAuctionListings() {
  const section = document.getElementById('auction-listings');
  if (!G.auctionListings.length) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');
  const maxSlots = G.maxAuctionSlots || CONFIG.baseAuctionSlots;
  const used = G.auctionListings.length;
  const slotsLabel = `<span class="auction-slots">${used}/${maxSlots} slots</span>`;
  section.innerHTML = `<div class="auction-title">📋 Your Listings ${slotsLabel}</div>` +
    G.auctionListings.map(l => {
      const card        = G.currentSet.cards.find(c => c.id === l.cardId);
      const chance      = Math.min(1, auctionHitChance(l.askPrice, l.cardId));
      const pct5        = Math.round(Math.round(chance * 100) / 5) * 5;
      const { dot }     = auctionChanceStyle(pct5);
      const chanceLabel = `${dot} ~${pct5}% ± 5%`;
      return `<div class="auction-item">
        <span class="alist-emoji">${cardEmojiHTML(card)}</span>
        <span class="alist-name">${card.name}</span>
        <span class="alist-price">${fmt(l.askPrice)}</span>
        <span class="alist-chance">${chanceLabel} · Day ${l.daysListed}</span>
        <button class="alist-cancel" data-id="${l.cardId}">✕</button>
      </div>`;
    }).join('');

  section.querySelectorAll('.alist-cancel').forEach(btn => {
    btn.addEventListener('click', () => actionCancelAuction(btn.dataset.id));
  });
}

/* ════════════════════════════════════════════════════════════════
   COMPLETION SCREEN
   ════════════════════════════════════════════════════════════════ */
function buildCommentary() {
  const grade = getGrade(G.day);
  const bank  = COMMENTARY;
  const gradeLines = bank.grade[grade] || bank.grade.D;
  const packLine   = randFrom(bank.packs);
  const dayLine    = randFrom(bank.days);
  const closeLine  = randFrom(bank.closer);

  function fill(t) {
    return t
      .replace('{day}',    G.day)
      .replace('{packs}',  G.packsOpened)
      .replace('{legs}',   G.legendaryCount)
      .replace('{singles}', G.singlesBought)
      .replace('{earned}', fmt(G.totalEarned))
      .replace('{net}',    fmt(G.totalSpent - G.totalEarned))
      .replace('{sold}',   G.singlesSold)
      .replace('{set}',    G.currentSet.name);
  }

  return [fill(randFrom(gradeLines)), fill(packLine), fill(dayLine), fill(closeLine)];
}

function saveHighScore() {
  const grade = getGrade(G.day);
  const gradeRank = { S: 0, A: 1, B: 2, C: 3, D: 4 };
  let best = null;
  try { best = JSON.parse(localStorage.getItem('setHunterBestRun')); } catch {}
  const isBetter = !best || gradeRank[grade] < gradeRank[best.grade] ||
    (gradeRank[grade] === gradeRank[best.grade] && G.day < best.day);
  if (isBetter) {
    localStorage.setItem('setHunterBestRun', JSON.stringify({ grade, day: G.day, spent: G.totalSpent }));
  }
  return best;
}

function showComplete() {
  // Drain the NPC message queue and dismiss any open dialog
  _msgQueue.length = 0;
  _msgBusy = false;
  document.getElementById('npc-dialog')?.classList.add('hidden');
  document.getElementById('event-banner')?.classList.add('hidden');

  Sounds.play('complete');
  Sounds.setAmbientState('victory');

  const grade = getGrade(G.day);

  // Save progress: best grade + unlock next level
  const progress = loadProgress();
  const currentSetId = G.currentSet.id;
  if (!progress.grades[currentSetId] || gradeValue(grade) < gradeValue(progress.grades[currentSetId])) {
    progress.grades[currentSetId] = grade;
  }
  const currentLevel = G.currentSet.level;
  const nextSet = CARD_SETS.find(s => s.level === currentLevel + 1);
  if (nextSet && !progress.unlocked.includes(nextSet.id)) {
    progress.unlocked.push(nextSet.id);
    showToast(`🔓 Unlocked: Level ${nextSet.level} — ${nextSet.name}!`, 'success');
  }
  saveProgress(progress);

  // Show "Next Level" button only if there is one to unlock/play
  const nextLevelBtn = document.getElementById('btn-next-level');
  if (nextSet) {
    nextLevelBtn.textContent = `Next Level: ${nextSet.name} ▶`;
    nextLevelBtn.classList.remove('hidden');
  } else {
    nextLevelBtn.classList.add('hidden');
  }
  const gradeDescriptions = {
    S: 'Speed Legend — fastest set completion on record!',
    A: 'Quick Collector — excellent pace!',
    B: 'Steady Collector — solid run.',
    C: 'Slow Burner — room to speed up.',
    D: 'Set Straggler — the days just kept coming.',
  };

  document.getElementById('complete-grade').textContent = grade;
  document.getElementById('complete-grade').className   = `grade-display grade-${grade}`;

  const netCost = Math.max(0, G.totalSpent - G.totalEarned);
  const avgSpendPerDay = G.day > 0 ? fmt(Math.round(G.totalSpent / G.day)) : '$0';
  document.getElementById('complete-stats').innerHTML = `
    <div class="cstat">
      <div class="cstat-label">DAYS TAKEN</div>
      <div class="cstat-value" style="color:var(--c-gold)">${G.day}</div>
    </div>
    <div class="cstat">
      <div class="cstat-label">PACKS OPENED</div>
      <div class="cstat-value">${G.packsOpened}</div>
    </div>
    <div class="cstat">
      <div class="cstat-label">SINGLES BOUGHT</div>
      <div class="cstat-value">${G.singlesBought}</div>
    </div>
    <div class="cstat">
      <div class="cstat-label">SINGLES SOLD</div>
      <div class="cstat-value">${G.singlesSold}</div>
    </div>
    <div class="cstat">
      <div class="cstat-label">AUCTION SALES</div>
      <div class="cstat-value">${G.auctionSales || 0}</div>
    </div>
    <div class="cstat">
      <div class="cstat-label">NPC MEETINGS</div>
      <div class="cstat-value">${G.npcMeetings || 0}</div>
    </div>
    <div class="cstat">
      <div class="cstat-label">TOTAL SPENT</div>
      <div class="cstat-value">${fmt(G.totalSpent)}</div>
    </div>
    <div class="cstat">
      <div class="cstat-label">TOTAL EARNED</div>
      <div class="cstat-value">${fmt(G.totalEarned)}</div>
    </div>
    <div class="cstat">
      <div class="cstat-label">NET COST</div>
      <div class="cstat-value">${fmt(netCost)}</div>
    </div>
    <div class="cstat">
      <div class="cstat-label">AVG SPEND / DAY</div>
      <div class="cstat-value">${avgSpendPerDay}</div>
    </div>`;

  // Run modifiers summary
  const perkSummary = buildPerkSummaryHtml();
  const skillSummary = buildSkillSummaryHtml();

  // NPC relations summary
  const npcRels  = G.npcRelations || {};
  const metNpcs  = NPC_EVENTS.filter(n => npcRels[n.id] > 0);
  const unmetCount = NPC_EVENTS.length - metNpcs.length;
  const mysteryDots = unmetCount > 0
    ? `<div class="cnpc-mystery-row">
        ${'<span class="cnpc-mystery-dot">?</span>'.repeat(Math.min(unmetCount, 8))}
        ${unmetCount > 8 ? `<span class="cnpc-mystery-more">+${unmetCount - 8}</span>` : ''}
        <span class="cnpc-mystery-label">${unmetCount} NPC${unmetCount !== 1 ? 's' : ''} not yet met</span>
      </div>`
    : '<div class="cnpc-all-met">✓ All NPCs encountered!</div>';

  const npcRelHtml = `<div class="complete-npc-rels">
      <div class="cnpc-title">NPC RELATIONS</div>
      ${metNpcs.length ? `<div class="cnpc-grid">
        ${metNpcs.map(n => {
          const lv = npcRels[n.id] || 0;
          const filledHeart = '<span class="cnpc-heart cnpc-heart-filled">♥</span>';
          const emptyHeart  = '<span class="cnpc-heart cnpc-heart-empty">♥</span>';
          const hearts = filledHeart.repeat(lv) + emptyHeart.repeat(3 - lv);
          return `<div class="cnpc-row">
            <span class="cnpc-portrait-wrap">${assetIconHTML(`assets/npcs/${n.id}.png`, n.emoji, 'cnpc-portrait-img')}</span>
            <span class="cnpc-name">${n.name}</span>
            <span class="cnpc-hearts">${hearts}</span>
          </div>`;
        }).join('')}
      </div>` : ''}
      ${mysteryDots}
    </div>`;

  const prev = saveHighScore();
  const bestHtml = prev
    ? `<p class="best-run-text">Previous best: Grade <strong>${prev.grade}</strong> in <strong>${prev.day}</strong> days</p>`
    : '';

  document.getElementById('complete-breakdown').innerHTML = `
    <p>${gradeDescriptions[grade]}</p>
    ${bestHtml}
    ${perkSummary}
    ${skillSummary}
    ${npcRelHtml}`;

  // Commentary
  const lines = buildCommentary();
  document.getElementById('complete-commentary').innerHTML =
    lines.map(l => `<p class="commentary-line">"${l}"</p>`).join('');

  // Award stars to skill tree
  const starsEarned = { S: 4, A: 3, B: 2, C: 1, D: 0 }[grade];
  if (starsEarned > 0) {
    const sk = loadSkills();
    sk.stars = (sk.stars || 0) + starsEarned;
    saveSkills(sk);
    document.getElementById('stars-earned').textContent = `+${starsEarned} ⭐ stars earned!`;
    document.getElementById('stars-earned').classList.remove('hidden');
  } else {
    document.getElementById('stars-earned').classList.add('hidden');
  }

  // Submit to leaderboard
  const lbBanner = document.getElementById('lb-rank-banner');
  if (lbBanner) lbBanner.textContent = 'Submitting to leaderboard…';
  submitLeaderboardEntry(G.currentSet.id, G.day, grade).then(data => {
    if (data && lbBanner) {
      lbBanner.innerHTML = `
        <span>You ranked <strong>#${data.rank}</strong> of <strong>${data.total}</strong> players on the <em>${G.currentSet.name}</em> leaderboard!</span>`;
    }
  });

  document.getElementById('complete-overlay').classList.remove('hidden');
}

function buildPerkSummaryHtml() {
  const perks = (G.perkIds || [])
    .map(id => PERKS.find(p => p.id === id))
    .filter(Boolean);

  const rows = perks.length
    ? perks.map(p => `<span class="complete-chip">${assetIconHTML(`assets/perks/${p.id}.png`, p.emoji, 'complete-chip-img')} ${p.name}</span>`).join('')
    : '<span class="complete-muted">No perk used</span>';

  return `<div class="complete-run-mods">
    <div class="complete-mod-title">PERKS USED</div>
    <div class="complete-chip-row">${rows}</div>
  </div>`;
}

function buildSkillSummaryHtml() {
  const skills = loadSkills();
  const active = SKILL_BRANCHES
    .map(branch => ({ branch, tier: skills[branch.id] || 0 }))
    .filter(x => x.tier > 0);

  const rows = active.length
    ? active.map(({ branch, tier }) => {
        const tierName = branch.tiers[tier - 1]?.name || `Tier ${tier}`;
        return `<span class="complete-chip">${assetIconHTML(`assets/skills/${branch.id}.png`, branch.emoji, 'complete-chip-img')} ${branch.name} T${tier}: ${tierName}</span>`;
      }).join('')
    : '<span class="complete-muted">No skill upgrades active</span>';

  return `<div class="complete-run-mods">
    <div class="complete-mod-title">SKILLS ACTIVE</div>
    <div class="complete-chip-row">${rows}</div>
  </div>`;
}

/* ════════════════════════════════════════════════════════════════
   UI HELPERS
   ════════════════════════════════════════════════════════════════ */
// npcId (optional) — when set, shows NPC portrait instead of the generic event icon
function showEventBanner(eventId, icon, text, npcId = null) {
  const banner = document.getElementById('event-banner');
  const iconEl = document.getElementById('event-icon');
  if (npcId) {
    iconEl.innerHTML = assetIconHTML(`assets/npcs/${npcId}.png`, icon, 'event-art');
  } else {
    iconEl.innerHTML = assetIconHTML(`assets/events/${eventId}.png`, icon, 'event-art');
  }
  // Enrich text: replace card emoji+name combos with inline white-circle thumbnails
  const textEl = document.getElementById('event-text');
  textEl.innerHTML = _enrichNpcMsg(text);
  banner.classList.remove('hidden');
  clearTimeout(banner._hideTimer);
  banner._hideTimer = setTimeout(() => banner.classList.add('hidden'), 7000);
}

let _toastContainer = null;
/* ════════════════════════════════════════════════════════════════
   UNIFIED MESSAGE QUEUE
   All pop-ups — toasts, NPC encounters — are serialised here so
   they always play one at a time, in order, fully animated.
   ════════════════════════════════════════════════════════════════ */
const _msgQueue = [];
let   _msgBusy  = false;

function _enqueueMsg(item) {
  _msgQueue.push(item);
  if (!_msgBusy) _nextMsg();
}

function _nextMsg() {
  if (!_msgQueue.length) { _msgBusy = false; return; }
  _msgBusy = true;
  const item = _msgQueue.shift();
  if      (item.kind === 'toast') _showToastNow(item.msg, item.type);
  else if (item.kind === 'npc')   _showNpcNow(item.npc);
}

function _msgDone() {
  // Small gap between items so they feel distinct
  setTimeout(_nextMsg, 120);
}

/* ── Toasts ── */
function showToast(msg, type = 'success') {
  _enqueueMsg({ kind: 'toast', msg, type });
}

function _showToastNow(msg, type) {
  if (!_toastContainer) {
    _toastContainer = document.createElement('div');
    _toastContainer.id = 'toast-container';
    document.body.appendChild(_toastContainer);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  _toastContainer.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => { el.remove(); _msgBusy = false; _msgDone(); }, 380);
  }, 2400);
}

/* ── NPC encounters ── */
function enqueueNpc(npc) {
  _enqueueMsg({ kind: 'npc', npc });
}

// Replace "emoji name" patterns in NPC messages with inline card/animal img tags
function _enrichNpcMsg(text) {
  if (!G || !G.currentSet) return text;
  let out = text;
  // Build lookup: emoji+name → card id
  const allCards = G.currentSet.cards.concat(ALL_ACES || []);
  allCards.forEach(card => {
    const token = `${card.emoji} ${card.name}`;
    if (out.includes(token)) {
      const imgSrc = `assets/cards/${card.id}.png`;
      const fallback = card.emoji;
      const img = `<img src="${imgSrc}" class="npc-card-thumb" alt="${card.name}"
        onerror="this.outerHTML='${fallback}'"
        onload="this.style.display='inline-block'">`;
      out = out.split(token).join(`${img} <strong>${card.name}</strong>`);
    }
  });
  return out;
}

function _showNpcNow(npc) {
  // Don't show NPC dialogs after the game has completed
  if (!G || document.getElementById('complete-overlay')?.classList.contains('hidden') === false) {
    _msgDone(); return;
  }
  _currentNpc = npc;
  const dlg = document.getElementById('npc-dialog');
  // Show name without emoji — portrait image handles the visual identity
  document.getElementById('npc-name').textContent = npc.name;
  const bioEl = document.getElementById('npc-bio');
  if (bioEl) bioEl.textContent = npc.desc || '';
  const rawMsg = npc.buildMsg(G);
  const npcMsgEl = document.getElementById('npc-msg');
  npcMsgEl.innerHTML = _enrichNpcMsg(rawMsg);
  const rewardRow  = document.getElementById('npc-reward-row');
  const rewardText = document.getElementById('npc-reward-text');
  const rewardStr  = npc.rewardLabel ? npc.rewardLabel(G) : null;
  if (rewardRow && rewardText && rewardStr) {
    rewardText.textContent = rewardStr;
    rewardRow.classList.remove('hidden');
  } else if (rewardRow) {
    rewardRow.classList.add('hidden');
  }
  const acceptBtn = document.getElementById('npc-accept');
  acceptBtn.textContent = npc.acceptLabel || '✓ Accept';
  acceptBtn.disabled    = !npc.canAccept(G);
  const curRel = (G && G.npcRelations && G.npcRelations[npc.id]) || 0;
  if (G && G.npcLog) {
    G.npcLog.push({
      id: npc.id, name: npc.name, emoji: npc.emoji,
      outcome: 'Pending', day: G.day, rel: curRel,
      bio: npc.desc || '', rewardText: null,
    });
  }
  const footer = document.getElementById('npc-footer');
  if (footer) {
    const hearts = '❤️'.repeat(curRel) + '🖤'.repeat(3 - curRel);
    const bonus  = curRel > 0 ? ` · Lv ${curRel} — better reward!` : ' · First meeting';
    footer.textContent = hearts + bonus;
  }
  G.npcMeetings = (G.npcMeetings || 0) + 1;
  recordDiscovery('npc', { id: npc.id, level: 0 });

  // NPC portrait
  const portraitEl = document.getElementById('npc-portrait');
  if (portraitEl) {
    const portraitSrc = `assets/npcs/${npc.id}.png`;
    portraitEl.src = portraitSrc;
    portraitEl.onerror = () => { portraitEl.style.display = 'none'; };
    portraitEl.onload  = () => { portraitEl.style.display = 'block'; };
    portraitEl.style.display = 'none'; // hide until loaded
  }

  Sounds.play('npcAppear');
  dlg.classList.remove('hidden');
  // _msgDone() is called in the accept / decline handlers below
}

const _tooltip = document.getElementById('tooltip');
function showTooltip(e, card) {
  const COLORS   = { common:'var(--c-common)',uncommon:'var(--c-uncommon)',rare:'var(--c-rare)',legendary:'var(--c-legendary)' };
  const count    = cardCount(card.id);
  const revealed = isRevealedCard(card);
  const hist     = G.priceHistory.get(card.id) || [];
  const hiLo     = hist.length ? ` · Hi:${fmt(Math.max(...hist))} Lo:${fmt(Math.min(...hist))}` : '';
  _tooltip.innerHTML = revealed ? `
    <div class="tt-name">${card.emoji} ${card.name}</div>
    <div class="tt-rarity" style="color:${COLORS[card.rarity]}">${card.rarity.toUpperCase()}</div>
    <div class="tt-flavor">"${card.flavor}"</div>
    <div class="tt-info">Owned: ${count} &nbsp;|&nbsp; Market: ${fmt(marketPrice(card.id))}${hiLo}</div>`
  : `
    <div class="tt-name">? Legendary ?</div>
    <div class="tt-rarity" style="color:${COLORS.legendary}">LEGENDARY</div>
    <div class="tt-flavor"><em>Pull it to reveal its secret.</em></div>
    <div class="tt-info">Market: ${fmt(marketPrice(card.id))}</div>`;
  _tooltip.classList.remove('hidden');
  moveTooltip(e);
}
function moveTooltip(e) {
  _tooltip.style.left = Math.min(e.clientX + 16, window.innerWidth  - 240) + 'px';
  _tooltip.style.top  = Math.min(e.clientY -  8, window.innerHeight - 180) + 'px';
}
function hideTooltip() { _tooltip.classList.add('hidden'); }

/* ════════════════════════════════════════════════════════════════
   FONT PRELOAD
   ════════════════════════════════════════════════════════════════ */
function preloadEmojiFont() {
  // Must use a canvas large enough that text actually lands inside it.
  // A 1×1 canvas draws all text outside bounds — no glyph cache warmup occurs.
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  x.font = '88px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  CARD_SETS.forEach(set => set.cards.forEach(card => x.fillText(card.emoji, 128, 128)));
}

function preloadSetCardImages(set) {
  // Fire-and-forget image preloads for all cards in the set so the browser
  // caches them before they're needed in the pack animation or card list.
  if (!set || !set.cards) return;
  set.cards.forEach(card => { new Image().src = `assets/cards/${card.id}.png`; });
  // Also preload aces for this set
  ALL_ACES.filter(a => a.setId === set.id).forEach(ace => {
    new Image().src = `assets/aces/${ace.id}.png`;
  });
}

let _uiArtPreloadPromise = null;
const _uiArtPreloadImgs = [];
function preloadUiArt() {
  if (_uiArtPreloadPromise) return _uiArtPreloadPromise;
  const urls = [
    ...PERKS.map(perk => `assets/perks/${perk.id}.png`),
    ...SKILL_BRANCHES.map(branch => `assets/skills/${branch.id}.png`),
  ];
  _uiArtPreloadPromise = Promise.allSettled(urls.map(src => new Promise(resolve => {
    const img = new Image();
    img.decoding = 'sync';
    img.fetchPriority = 'high';
    img.onload = async () => {
      try { if (img.decode) await img.decode(); } catch {}
      resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
    _uiArtPreloadImgs.push(img);
  })));
  return _uiArtPreloadPromise;
}

function startCascadePreload() {
  // Preload set 1 immediately on page load so cards appear instantly on first run.
  // Then cascade: preload each subsequent set after a short delay so it's ready
  // by the time the player finishes the previous set.
  const sets = CARD_SETS.filter(s => !s.demo).sort((a, b) => (a.level || 0) - (b.level || 0));
  sets.forEach((set, i) => {
    setTimeout(() => preloadSetCardImages(set), i * 4000);
  });
}

let _collectionLayoutRaf = null;
function updateCollectionGridLayout() {
  const grid = document.getElementById('collection-grid');
  if (!grid) return;
  const cs = getComputedStyle(grid);
  const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  const available = Math.floor(grid.clientWidth - padX);
  if (available <= 0) return;
  const minCard = 78;
  const colGap = 7;
  const rowGap = 20;
  const cols = Math.max(1, Math.floor((available + colGap) / (minCard + colGap)));
  const cardW = Math.max(minCard, Math.floor((available - colGap * (cols - 1)) / cols));
  const cardH = Math.ceil(cardW * 7 / 5);
  grid.style.gridTemplateColumns = `repeat(${cols}, ${cardW}px)`;
  grid.style.gridAutoRows = `${cardH}px`;
  grid.style.rowGap = `${rowGap}px`;
}

function scheduleCollectionGridLayout() {
  if (_collectionLayoutRaf !== null) cancelAnimationFrame(_collectionLayoutRaf);
  _collectionLayoutRaf = requestAnimationFrame(() => {
    _collectionLayoutRaf = null;
    updateCollectionGridLayout();
  });
}

/* ════════════════════════════════════════════════════════════════
   INITIALISATION
   ════════════════════════════════════════════════════════════════ */
/* ── Discovery helpers (cross-run codex tracking) ── */
function loadDiscovery() {
  try { return JSON.parse(localStorage.getItem('setHunterDiscovery') || '{}'); }
  catch { return {}; }
}
function saveDiscovery(d) { localStorage.setItem('setHunterDiscovery', JSON.stringify(d)); }

function recordDiscovery(type, value) {
  const d = loadDiscovery();
  if (type === 'card') {
    d.cards = d.cards || {};
    d.cards[value] = true;
  } else if (type === 'perk') {
    d.perks = d.perks || [];
    if (!d.perks.includes(value)) d.perks.push(value);
  } else if (type === 'npc') {
    const { id, level } = value;
    d.npcs = d.npcs || {};
    d.npcs[id] = Math.max(d.npcs[id] || 0, level);
    if (!d.npcsMet) d.npcsMet = [];
    if (!d.npcsMet.includes(id)) d.npcsMet.push(id);
  }
  saveDiscovery(d);
}

/* ── Level progress helpers ── */
function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem('setHunterProgress')) ||
      { unlocked: ['home'], grades: {} };
    // Migrate old saves that reference removed set IDs
    const validIds = new Set(CARD_SETS.map(s => s.id));
    p.unlocked = p.unlocked.filter(id => validIds.has(id));
    if (p.unlocked.length === 0) p.unlocked.push('home');
    return p;
  } catch { return { unlocked: ['home'], grades: {} }; }
}
function saveProgress(p) {
  localStorage.setItem('setHunterProgress', JSON.stringify(p));
}
function gradeValue(g) { return { S: 0, A: 1, B: 2, C: 3, D: 4 }[g] ?? 5; }

/* ════════════════════════════════════════════════════════════════
   CODEX SCREEN
   ════════════════════════════════════════════════════════════════ */
let _codexTab = 'cards';
let _codexSet = 'home';

function showCodex() {
  const screen = document.getElementById('codex-screen');
  renderCodexTab();
  screen.classList.remove('hidden');
}

function renderCodexTab() {
  const content  = document.getElementById('codex-content');
  const disc     = loadDiscovery();
  const tabBtns  = document.querySelectorAll('.codex-tab');
  tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === _codexTab));

  if (_codexTab === 'cards') {
    const setButtons = CARD_SETS.map(s =>
      `<button class="codex-set-btn${_codexSet === s.id ? ' active' : ''}" data-set="${s.id}">
        ${assetIconHTML(`assets/sets/${s.id}.png`, s.theme, 'codex-set-art')} ${s.name}
      </button>`
    ).join('');
    const set = CARD_SETS.find(s => s.id === _codexSet);
    const RARITY_COLOR = { common: 'var(--c-common)', uncommon: 'var(--c-uncommon)', rare: 'var(--c-rare)', legendary: 'var(--c-legendary)' };
    const cards = set.cards.map(card => {
      const discovered = disc.cards && disc.cards[card.id];
      const ownedNow   = G && G.currentSet.id === set.id ? (G.collection.get(card.id) || 0) : 0;
      if (!discovered) {
        return `<div class="cdx-card cdx-undiscovered" title="Not yet found">
          <div class="cdx-card-mystery"><span class="mystery-icon">?</span></div>
          <div class="cdx-card-rarity" style="color:${RARITY_COLOR[card.rarity]}">${card.rarity[0].toUpperCase()}</div>
        </div>`;
      }
      const mode = 'artwork';
      const artHTML = mode === 'artwork'
        ? `<img src="assets/cards/${card.id}.png" class="cdx-card-art" alt="${card.name}">`
        : `<span class="cdx-card-emoji-inner">${card.emoji}</span>`;
      return `<div class="cdx-card${ownedNow > 0 ? ' cdx-owned' : ''}" title="${card.name}: ${card.flavor}">
        <div class="cdx-card-emoji">${artHTML}</div>
        <div class="cdx-card-name">${card.name}</div>
        <div class="cdx-card-rarity" style="color:${RARITY_COLOR[card.rarity]}">${card.rarity[0].toUpperCase()}</div>
        ${ownedNow > 0 ? `<div class="cdx-card-own">${ownedNow}</div>` : ''}
      </div>`;
    }).join('');
    const foundCount = set.cards.filter(c => disc.cards && disc.cards[c.id]).length;
    content.innerHTML = `
      <div class="codex-set-tabs">${setButtons}</div>
      <div class="codex-set-progress">${foundCount}/${set.cards.length} discovered</div>
      <div class="cdx-card-grid">${cards}</div>`;
    content.querySelectorAll('.codex-set-btn').forEach(b =>
      b.addEventListener('click', () => { _codexSet = b.dataset.set; renderCodexTab(); })
    );

  } else if (_codexTab === 'perks') {
    const FAMILY_COLOR = { Economy: '#f0a030', Luck: '#4cdd7a', Information: '#30d0f0', Time: '#c080ff', Negotiation: '#f08060', Unique: '#f0e050' };
    const perks = PERKS.map(p => {
      const known = disc.perks && disc.perks.includes(p.id);
      if (!known) {
        return `<div class="cdx-perk cdx-undiscovered" title="Not yet encountered">
          <div class="cdx-perk-family" style="color:${FAMILY_COLOR[p.family] || '#888'}">${p.family}</div>
          <div class="cdx-perk-icon"><span class="mystery-icon">?</span></div>
          <div class="cdx-perk-name">???</div>
          <div class="cdx-perk-desc">Not yet encountered.</div>
        </div>`;
      }
      return `<div class="cdx-perk">
        <div class="cdx-perk-family" style="color:${FAMILY_COLOR[p.family] || '#888'}">${p.family}</div>
        <div class="cdx-perk-icon">${assetIconHTML(`assets/perks/${p.id}.png`, p.emoji, 'cdx-perk-art')}</div>
        <div class="cdx-perk-name">${p.name}</div>
        <div class="cdx-perk-desc">${p.desc}</div>
      </div>`;
    }).join('');
    const knownCount = PERKS.filter(p => disc.perks && disc.perks.includes(p.id)).length;
    content.innerHTML = `
      <div class="codex-set-progress">${knownCount}/${PERKS.length} perks discovered</div>
      <div class="cdx-perk-grid">${perks}</div>`;

  } else { // npcs
    const metIds = disc.npcsMet || [];
    const npcRelMax = disc.npcs || {};
    const npcs = NPC_EVENTS.map(npc => {
      const met = metIds.includes(npc.id);
      const maxRel = npcRelMax[npc.id] || 0;
      const hearts = met ? ('❤️'.repeat(maxRel) + '🖤'.repeat(3 - maxRel)) : '';
      const tiers = (npc.tierDescs || []).map((td, i) => {
        const reached = maxRel > i;
        return `<div class="cdx-npc-tier${reached ? '' : ' cdx-tier-locked'}">
          <span class="cdx-tier-num">T${i + 1}</span>
          <span class="cdx-tier-desc">${reached ? td : '???'}</span>
        </div>`;
      }).join('');
      if (!met) {
        return `<div class="cdx-npc cdx-undiscovered">
          <div class="cdx-npc-portrait"><span class="mystery-icon">?</span></div>
          <div class="cdx-npc-info">
            <div class="cdx-npc-name">??? NPC</div>
            <div class="cdx-npc-desc">Not yet encountered.</div>
          </div>
        </div>`;
      }
      return `<div class="cdx-npc">
        <div class="cdx-npc-portrait">${assetIconHTML(`assets/npcs/${npc.id}.png`, npc.emoji, 'cdx-npc-portrait-img')}</div>
        <div class="cdx-npc-info">
          <div class="cdx-npc-name">${npc.name} <span class="cdx-npc-hearts">${hearts}</span></div>
          <div class="cdx-npc-desc">${npc.desc}</div>
          <div class="cdx-npc-tiers">${tiers}</div>
        </div>
      </div>`;
    }).join('');
    content.innerHTML = `
      <div class="codex-set-progress">${metIds.length}/${NPC_EVENTS.length} NPCs met</div>
      <div class="cdx-npc-list">${npcs}</div>`;
  }
}

/* ════════════════════════════════════════════════════════════════
   PLAYER NAME PROMPT
   ════════════════════════════════════════════════════════════════ */
function promptPlayerName(callback) {
  const existing = getPlayerName();
  if (existing) { callback(existing); return; }

  const overlay = document.getElementById('name-prompt');
  const input   = document.getElementById('name-input');
  const def     = `Player_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  input.value       = def;
  input.placeholder = def;
  overlay.classList.remove('hidden');

  document.getElementById('btn-name-confirm').onclick = () => {
    const final = setPlayerName(input.value || def);
    overlay.classList.add('hidden');
    callback(final);
  };
}

/* ════════════════════════════════════════════════════════════════
   LEADERBOARD
   ════════════════════════════════════════════════════════════════ */
async function submitLeaderboardEntry(setId, days, grade) {
  const name = getPlayerName() || 'Anonymous';
  try {
    const r = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ set_id: setId, player_name: name, days, grade }),
    });
    return await r.json(); // { rank, total, entries }
  } catch { return null; }
}

async function showLeaderboard(initialSetId) {
  const screen = document.getElementById('leaderboard-screen');
  const content = document.getElementById('leaderboard-content');
  screen.classList.remove('hidden');

  let activeSet = initialSetId || 'home';

  async function renderLb(setId) {
    activeSet = setId;
    content.innerHTML = `<div class="lb-loading">Loading…</div>`;
    screen.querySelectorAll('.lb-tab').forEach(b => b.classList.toggle('active', b.dataset.set === setId));
    try {
      const r = await fetch(`/api/leaderboard?set=${setId}`);
      const data = await r.json();
      const entries = data.entries || [];
      const myName  = getPlayerName();

      if (!entries.length) {
        content.innerHTML = '<div class="lb-empty">No scores yet. Be the first!</div>';
        return;
      }
      content.innerHTML = `
        <table class="lb-table">
          <thead><tr><th>#</th><th>Player</th><th>Days</th><th>Grade</th></tr></thead>
          <tbody>
            ${entries.map((e, i) => `
              <tr class="${e.name === myName ? 'lb-me' : ''}">
                <td class="lb-rank">${i + 1}</td>
                <td class="lb-name">${e.name}</td>
                <td class="lb-days">${e.days}</td>
                <td class="lb-grade grade-${e.grade}">${e.grade}</td>
              </tr>`).join('')}
          </tbody>
        </table>`;
    } catch {
      content.innerHTML = '<div class="lb-empty">Could not load leaderboard.</div>';
    }
  }

  screen.querySelectorAll('.lb-tab').forEach(btn => {
    btn.onclick = () => renderLb(btn.dataset.set);
  });

  renderLb(activeSet);
}

function showLevelSelect() {
  const progress = loadProgress();
  // Debug mode: add ?debug=1 to the URL to unlock all levels without saving progress
  if (new URLSearchParams(window.location.search).get('debug') === '1') {
    CARD_SETS.forEach(s => { if (!progress.unlocked.includes(s.id)) progress.unlocked.push(s.id); });
  }
  const grid = document.getElementById('level-grid');
  grid.innerHTML = '';

  const sortedSets = CARD_SETS.slice().sort((a, b) => a.level - b.level);

  sortedSets.forEach(set => {
    const unlocked  = progress.unlocked.includes(set.id);
    const bestGrade = progress.grades[set.id] || null;
    const card = document.createElement('div');
    card.className = 'level-card' + (unlocked ? '' : ' level-locked');
    const gt = set.gradeThresholds;
    card.innerHTML = `
      <div class="lc-theme">${assetIconHTML(`assets/sets/${set.id}.png`, set.theme, 'set-theme-art')}</div>
      <div class="lc-level">Level ${set.level}</div>
      <div class="lc-name">${set.name}</div>
      <div class="lc-cards">${set.cards.length} cards</div>
      <div class="lc-economy">
        <span>Pack $${set.packCost || 10}</span>
        <span>+$${set.dailyAllowance}/day</span>
        <span>Start $${set.startBudget}</span>
      </div>
      <div class="lc-grades">S≤${gt.S}d · A≤${gt.A}d · B≤${gt.B}d · C≤${gt.C}d</div>
      ${bestGrade ? `<div class="lc-best">Best: <strong>${bestGrade}</strong></div>` : ''}
      ${(!unlocked) ? '<div class="lc-lock">🔒 Complete previous level</div>' : ''}
    `;
    if (unlocked) {
      card.addEventListener('click', () => {
        document.getElementById('level-select').classList.add('hidden');
        startRun(set.id);
      });
    }
    grid.appendChild(card);
  });

  document.getElementById('intro-screen').classList.add('hidden');
  document.getElementById('level-select').classList.remove('hidden');
}

function startRun(setId) {
  const id = setId || 'home';
  _pendingSet = CARD_SETS.find(s => s.id === id) || CARD_SETS[0];
  promptPlayerName(() => showPerkScreen());
}

function setupListeners() {
  // Start music on first any-click — browsers allow audio after any user gesture.
  // This plays the home track immediately when the player touches anything on the start screen.
  document.addEventListener('click', () => {
    Sounds.init();
    if (!G) Sounds.setSet('home');
  }, { once: true });

  document.getElementById('btn-start').addEventListener('click', () => {
    Sounds.init();
    Sounds.setSet('home');   // ensure home track on level select
    showLevelSelect();
  });

  document.getElementById('btn-back-intro').addEventListener('click', () => {
    document.getElementById('level-select').classList.add('hidden');
    document.getElementById('intro-screen').classList.remove('hidden');
  });

  document.getElementById('btn-skill-tree').addEventListener('click', showSkillTree);
  document.getElementById('btn-skill-tree-hud').addEventListener('click', showSkillTree);
  document.getElementById('btn-close-skill').addEventListener('click', () => {
    document.getElementById('skill-screen').classList.add('hidden');
    if (!G) document.getElementById('intro-screen').classList.remove('hidden');
  });

  // Codex
  document.getElementById('btn-codex').addEventListener('click', showCodex);
  document.getElementById('btn-codex-hud').addEventListener('click', showCodex);
  document.getElementById('btn-close-codex').addEventListener('click', () => {
    document.getElementById('codex-screen').classList.add('hidden');
    if (!G) document.getElementById('intro-screen').classList.remove('hidden');
  });
  document.querySelectorAll('.codex-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _codexTab = btn.dataset.tab;
      renderCodexTab();
    });
  });

  // Contacts screen
  document.getElementById('btn-contacts').addEventListener('click', showContacts);
  document.getElementById('btn-close-contacts').addEventListener('click', () => {
    document.getElementById('contacts-screen').classList.add('hidden');
  });

  // Perk badge click → show active perk description
  document.getElementById('perk-badge').addEventListener('click', () => {
    if (!G || !G.perkIds?.length) return;
    const lines = G.perkIds.map(id => {
      const p = PERKS.find(p => p.id === id);
      return p ? `${p.emoji} ${p.name}: ${p.desc}` : null;
    }).filter(Boolean);
    if (lines.length) showToast(lines.join(' | '), 'success');
  });

  document.getElementById('btn-open-1').addEventListener('click',  () => actionOpenPacks(1));
  document.getElementById('btn-open-3').addEventListener('click',  () => actionOpenPacks(3));
  document.getElementById('btn-open-5').addEventListener('click',  () => actionOpenPacks(5));
  document.getElementById('btn-pass-day').addEventListener('click', actionPassDay);
  document.getElementById('btn-thief-claim')?.addEventListener('click', actionThiefClaim);
  document.getElementById('btn-timekeeper-rewind')?.addEventListener('click', actionTimekeeperRewind);
  document.getElementById('btn-main-menu')?.addEventListener('click', returnToMainMenu);

  document.getElementById('btn-sell-all-dupes').addEventListener('click', actionSellAllDupes);

  document.getElementById('btn-new-run').addEventListener('click', () => {
    Sounds.init();
    Sounds.setSet('home');   // back to default while on level-select
    document.getElementById('complete-overlay').classList.add('hidden');
    showLevelSelect();
  });
  document.getElementById('btn-next-level').addEventListener('click', () => {
    Sounds.init();
    const currentLevel = G ? G.currentSet.level : 1;
    // Only look in main (non-demo) sets for the next level
    const nextSet = CARD_SETS.find(s => !s.demo && s.level === currentLevel + 1);
    document.getElementById('complete-overlay').classList.add('hidden');
    if (nextSet) startRun(nextSet.id); else showLevelSelect();
  });

  // Mute — swap between sound/mute images
  const muteBtn = document.getElementById('btn-mute');
  const _muteImg = muteBtn.querySelector('img');
  const _updateMuteBtn = () => {
    const muted = Sounds.isMuted();
    if (_muteImg) {
      _muteImg.src = muted ? 'assets/buttons/mute.png' : 'assets/buttons/sound.png';
      _muteImg.alt = muted ? '🔇' : '🔊';
    } else {
      muteBtn.textContent = muted ? '🔇' : '🔊';
    }
  };
  muteBtn.addEventListener('click', () => {
    Sounds.setMuted(!Sounds.isMuted());
    _updateMuteBtn();
  });

  // Card mode is always AI artwork — no toggle needed.


  // Confirm dialog
  document.getElementById('confirm-yes').addEventListener('click', () => {
    document.getElementById('confirm-dialog').classList.add('hidden');
    const cb = _confirmCallback; _confirmCallback = null;
    if (cb) cb();
  });
  document.getElementById('confirm-no').addEventListener('click', () => {
    document.getElementById('confirm-dialog').classList.add('hidden');
    _confirmCallback = null;
  });

  // NPC dialog
  document.getElementById('npc-accept').addEventListener('click', () => {
    if (_currentNpc) {
      // Increment relationship level (cap at 3)
      if (G && G.npcRelations) {
        const prev = G.npcRelations[_currentNpc.id] || 0;
        G.npcRelations[_currentNpc.id] = Math.min(3, prev + 1);
        recordDiscovery('npc', { id: _currentNpc.id, level: G.npcRelations[_currentNpc.id] });
      }
      const newRel        = (G && G.npcRelations && G.npcRelations[_currentNpc.id]) || 0;
      const npcForToast   = _currentNpc; // capture before nulling
      const rewardTextNow = _currentNpc.rewardLabel ? _currentNpc.rewardLabel(G) : null;
      // Update the Pending log entry created in showNextNpc
      if (G && G.npcLog) {
        const last = G.npcLog[G.npcLog.length - 1];
        if (last && last.name === _currentNpc.name && last.outcome === 'Pending') {
          last.outcome    = 'Accepted';
          last.rel        = newRel;
          last.rewardText = rewardTextNow;
        }
      }
      _currentNpc.accept(G);
      // Queue the relationship level-up toast — it will show after the accept toast
      if (newRel > 0) {
        const relLabels = ['', 'Friendly', 'Trusted', 'Old Friends'];
        showToast(
          `${npcForToast.emoji} Relationship Lv ${newRel} — ${relLabels[newRel] || ''}! Better deals next time.`,
          'success'
        );
      }
      _currentNpc = null;
    }
    document.getElementById('npc-dialog').classList.add('hidden');
    _msgBusy = false;
    _msgDone();
  });
  document.getElementById('npc-decline').addEventListener('click', () => {
    if (_currentNpc && G && G.npcLog) {
      const last = G.npcLog[G.npcLog.length - 1];
      if (last && last.name === _currentNpc.name && last.outcome === 'Pending') {
        last.outcome = 'Declined';
      }
    }
    _currentNpc = null;
    document.getElementById('npc-dialog').classList.add('hidden');
    _msgBusy = false;
    _msgDone();
  });

  // Tutorial
  document.getElementById('btn-tut-next').addEventListener('click', () => {
    if (_tutorialSingleMessage) { closeTutorial(); return; }
    _tutStep++;
    if (_tutStep >= TUTORIAL_STEPS.length) closeTutorial();
    else showTutorialStep();
  });
  document.getElementById('btn-tut-skip').addEventListener('click', closeTutorial);
  document.getElementById('btn-tutorial').addEventListener('click', () => {
    startTutorial();
  });

  // Collection filters
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ACTIVE.filter = btn.dataset.filter;
      renderCollection();
    });
  });

  // Market sort
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ACTIVE.sort = btn.dataset.sort;
      renderMarket();
    });
  });

  // Player name prompt confirm
  const nameConfirmBtn = document.getElementById('btn-name-confirm');
  if (nameConfirmBtn) {
    nameConfirmBtn.addEventListener('click', () => {
      const input = document.getElementById('name-input');
      const def = input.placeholder || `Player_${Math.random().toString(36).slice(2,7).toUpperCase()}`;
      setPlayerName(input.value || def);
      document.getElementById('name-prompt').classList.add('hidden');
    });
  }
  const nameInput = document.getElementById('name-input');
  if (nameInput) {
    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-name-confirm').click();
    });
  }

  // Ace overlay close
  const aceFoundOverlay = document.getElementById('ace-found-overlay');
  if (aceFoundOverlay) {
    aceFoundOverlay.querySelector('.btn-ace-close')?.addEventListener('click', () =>
      aceFoundOverlay.classList.add('hidden'));
  }
  const aceGlobalOverlay = document.getElementById('ace-global-overlay');
  if (aceGlobalOverlay) {
    aceGlobalOverlay.querySelector('.btn-ace-global-close')?.addEventListener('click', () =>
      aceGlobalOverlay.classList.add('hidden'));
  }

  // Intro ace header is informational only — no click action.
  document.querySelectorAll('.intro-ace-header').forEach(el => {
    el.style.cursor = 'default';
  });

  // In-game tracker hero explains aces with the same visual treatment as the tutorial.
  document.querySelectorAll('.ace-tracker-hero').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', e => {
      if (e.target.closest('[data-ace-id]')) return;
      e.preventDefault();
      e.stopPropagation();
      showAceInfoPopup();
    });
  });

  // Pip clicks: capture phase so parent "open collection" never runs on the same tap
  document.addEventListener('click', e => {
    const pip = e.target.closest('[data-ace-id]');
    if (pip) {
      e.preventDefault();
      e.stopPropagation();
      showAceDetail(pip.dataset.aceId);
    }
  }, true);

  // Leaderboard buttons
  document.querySelectorAll('.btn-leaderboard').forEach(btn => {
    btn.addEventListener('click', () => showLeaderboard());
  });
  const lbClose = document.getElementById('btn-leaderboard-close');
  if (lbClose) lbClose.addEventListener('click', () => {
    document.getElementById('leaderboard-screen').classList.add('hidden');
  });

  // Start ace polling (only contacts server, so safe to do immediately)
  startAceStatusPolling();

  // Warm UI art first so perk/skill icons do not flash white on first open.
  preloadUiArt().finally(() => {
    // Cascade-preload card images only after perks/skills get first shot at loading.
    startCascadePreload();
  });

  window.addEventListener('resize', scheduleCollectionGridLayout, { passive: true });
  scheduleCollectionGridLayout();

  setupPortal();

  const params = new URLSearchParams(window.location.search);
  if (params.get('portal') === 'true' || params.get('portal') === '1') {
    Sounds.init();
    Sounds.setSet('home');
    startRun();
  }
}

// Start warming perk/skill art as soon as the script is parsed.
preloadUiArt();

window.addEventListener('DOMContentLoaded', setupListeners);
