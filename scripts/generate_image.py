#!/usr/bin/env python3
"""
Set Hunter — Asset Image Generator
Generates emoji-style artwork using Pollinations.ai (free, no API key).

Usage:
  python scripts/generate_image.py --set home              # all Home & Farm cards
  python scripts/generate_image.py --set aquatic|desert|savanna
  python scripts/generate_image.py --all                   # all 160 cards
  python scripts/generate_image.py --card h_cat            # single card
  python scripts/generate_image.py --card w_anglerfish --extra "terrifying, razor teeth"
  python scripts/generate_image.py --npc rex               # single NPC portrait
  python scripts/generate_image.py --npcs                  # all NPC portraits
  python scripts/generate_image.py --perk hoarder          # single perk icon
  python scripts/generate_image.py --perks                 # all 31 perk icons
  python scripts/generate_image.py --skill oracle          # single skill branch icon
  python scripts/generate_image.py --skills                # all 6 skill branch icons
  python scripts/generate_image.py --event flash_sale      # single event icon
  python scripts/generate_image.py --events                # all 6 market event icons
  python scripts/generate_image.py --settheme home         # single set theme image
  python scripts/generate_image.py --setthemes             # all 4 set theme images
  python scripts/generate_image.py --ace h_aurochs         # single ace card
  python scripts/generate_image.py --aces                  # all 20 ace cards
  python scripts/generate_image.py --aceset aquatic        # 5 aquatic aces

Output directories:
  assets/cards/<id>.png
  assets/npcs/<id>.png
  assets/perks/<id>.png
  assets/skills/<id>.png
  assets/events/<id>.png
  assets/sets/<id>.png
  assets/aces/<id>.png
"""

import argparse, os, sys, time, urllib.request, urllib.parse, urllib.error
from pathlib import Path

ROOT        = Path(__file__).parent.parent
OUT_DIR     = ROOT / "assets" / "cards"
NPC_OUT_DIR = ROOT / "assets" / "npcs"
PERK_DIR    = ROOT / "assets" / "perks"
SKILL_DIR   = ROOT / "assets" / "skills"
EVENT_DIR   = ROOT / "assets" / "events"
SET_DIR     = ROOT / "assets" / "sets"

# ── Shared base style (circular-friendly, matches card/NPC art) ────────────────
STYLE = (
    "flat design illustration, emoji art style, bold simple shapes, "
    "vibrant saturated colors, clean white background, no text no letters, "
    "single centered animal subject, cute cartoon, Google Apple emoji aesthetic, "
    "round friendly shapes, thick outlines, icon design, 512x512"
)

ICON_STYLE = (
    "flat design illustration, emoji art style, bold simple shapes, "
    "vibrant saturated colors, clean white background, no text no letters, "
    "single centered iconic subject, cute cartoon, Google Apple emoji aesthetic, "
    "round friendly shapes, thick outlines, icon design, 512x512"
)

NPC_STYLE = (
    "flat design illustration, emoji art style, bold simple shapes, "
    "vibrant saturated colors, clean white background, no text no letters, "
    "single centered character portrait, cute cartoon, Google Apple emoji aesthetic, "
    "round friendly shapes, thick outlines, icon design, "
    "friendly stylized person face and upper body, expressive eyes, 512x512"
)

RARITY_MOOD = {
    "common":    "simple cheerful design, soft pastel tones, small creature",
    "uncommon":  "bright detailed design, teal and green accents, medium creature",
    "rare":      "glowing blue purple rim light, dramatic pose, large impressive creature",
    "legendary": "golden orange glow, highly detailed, epic powerful pose, shining aura",
}

# ── Card definitions ───────────────────────────────────────────────────────────
CARDS = {
  # ══ HOME & FARM ══
  "h_cat":       ("Cat",           "cute orange tabby cat sitting upright",                              "common",    "home"),
  "h_dog":       ("Dog",           "friendly golden retriever dog sitting and smiling",                   "common",    "home"),
  "h_rabbit":    ("Rabbit",        "white fluffy rabbit with long ears",                                  "common",    "home"),
  "h_hamster":   ("Hamster",       "round chubby hamster with stuffed cheeks",                            "common",    "home"),
  "h_mouse":     ("Mouse",         "tiny grey mouse with big ears and long tail",                         "common",    "home"),
  "h_goldfish":  ("Goldfish",      "bright orange goldfish with flowing fins in water",                   "common",    "home"),
  "h_budgie":    ("Budgie",        "small green and yellow budgerigar parakeet",                          "common",    "home"),
  "h_guinea":    ("Guinea Pig",    "fluffy brown and white guinea pig looking cute",                      "common",    "home"),
  "h_pigeon":    ("Pigeon",        "grey pigeon with iridescent neck feathers",                           "common",    "home"),
  "h_sparrow":   ("Sparrow",       "small brown sparrow perched on a branch",                             "common",    "home"),
  "h_snail":     ("Snail",         "garden snail with a spiral brown shell",                              "common",    "home"),
  "h_cricket":   ("Cricket",       "green cricket with long antennae and hind legs",                      "common",    "home"),
  "h_cow":       ("Cow",           "black and white dairy cow with a cowbell",                            "uncommon",  "home"),
  "h_pig":       ("Pig",           "pink pig with curly tail and happy snout",                            "uncommon",  "home"),
  "h_goat":      ("Goat",          "white goat with small horns and beard",                               "uncommon",  "home"),
  "h_sheep":     ("Sheep",         "fluffy white sheep with a round woolly body",                         "uncommon",  "home"),
  "h_duck":      ("Duck",          "mallard duck with green head and orange beak",                        "uncommon",  "home"),
  "h_donkey":    ("Donkey",        "grey donkey with large ears and patient expression",                  "uncommon",  "home"),
  "h_rooster":   ("Rooster",       "proud rooster with red comb and colorful tail feathers",              "uncommon",  "home"),
  "h_turkey":    ("Turkey",        "brown turkey with colorful fan tail spread out",                      "uncommon",  "home"),
  "h_rat":       ("Rat",           "grey rat with clever eyes and long whiskers",                         "uncommon",  "home"),
  "h_ferret":    ("Ferret",        "long slender ferret with masked face markings",                       "uncommon",  "home"),
  "h_parrot":    ("Parrot",        "bright red and green parrot with curved beak",                        "uncommon",  "home"),
  "h_hedgehog":  ("Hedgehog",      "small hedgehog curled with spiny back",                               "uncommon",  "home"),
  "h_chicken":   ("Chicken",       "brown hen with red comb and fluffy feathers",                         "uncommon",  "home"),
  "h_frog":      ("Frog",          "green garden frog sitting on a lily pad",                             "uncommon",  "home"),
  "h_horse":     ("Horse",         "brown horse standing proudly with flowing mane",                      "rare",      "home"),
  "h_peacock":   ("Peacock",       "peacock with magnificent blue and green fan tail fully spread",        "rare",      "home"),
  "h_swan":      ("Swan",          "elegant white swan with graceful curved neck on water",               "rare",      "home"),
  "h_llama":     ("Llama",         "fluffy white llama with long neck and gentle expression",             "rare",      "home"),
  "h_bee":       ("Bee",           "honey bee with yellow black stripes and fuzzy body",                  "rare",      "home"),
  "h_goose":     ("Goose",         "white goose with orange beak looking aggressively alert",             "rare",      "home"),
  "h_collie":    ("Border Collie", "black and white border collie in herding stance alert eyes",          "rare",      "home"),
  "h_owl":       ("Barn Owl",      "white barn owl with heart-shaped face and dark eyes",                 "rare",      "home"),
  "h_alpaca":    ("Alpaca",        "fluffy cream alpaca with soft woolly face",                           "rare",      "home"),
  "h_fox":       ("Fox",           "orange red fox with bushy tail and clever amber eyes",                "rare",      "home"),
  "h_bull":      ("Bull",          "massive muscular dark bull with wide horns and powerful stance",      "legendary", "home"),
  "h_stallion":  ("Stallion",      "white stallion rearing up on hind legs with flowing mane",           "legendary", "home"),
  "h_persian":   ("Persian Cat",   "fluffy white persian cat with flat face and jeweled collar",          "legendary", "home"),
  "h_greyhound": ("Greyhound",     "sleek grey greyhound in a powerful running pose",                     "legendary", "home"),

  # ══ AQUATIC ══
  "w_jellyfish":   ("Jellyfish",     "translucent blue jellyfish with glowing tentacles",                 "common",    "aquatic"),
  "w_crab":        ("Crab",          "red crab with claws raised looking feisty",                         "common",    "aquatic"),
  "w_starfish":    ("Starfish",      "orange starfish with five arms on the ocean floor",                 "common",    "aquatic"),
  "w_clownfish":   ("Clownfish",     "orange and white striped clownfish in an anemone",                  "common",    "aquatic"),
  "w_seahorse":    ("Seahorse",      "yellow seahorse with curled tail and textured body",                "common",    "aquatic"),
  "w_shrimp":      ("Shrimp",        "pink translucent shrimp with long antennae",                        "common",    "aquatic"),
  "w_lobster":     ("Lobster",       "bright red lobster with large claws",                               "common",    "aquatic"),
  "w_mussel":      ("Mussel",        "dark blue mussel shell half open with orange inside",               "common",    "aquatic"),
  "w_puffin":      ("Puffin",        "black and white puffin with colorful orange beak",                  "common",    "aquatic"),
  "w_anchovy":     ("Anchovy",       "small silvery blue anchovy fish",                                   "common",    "aquatic"),
  "w_seaurchin":   ("Sea Urchin",    "dark purple sea urchin covered in sharp spines",                    "common",    "aquatic"),
  "w_flyingfish":  ("Flying Fish",   "silver fish leaping out of water with wing-like fins spread",       "common",    "aquatic"),
  "w_dolphin":     ("Dolphin",       "grey dolphin leaping out of the water with big smile",              "uncommon",  "aquatic"),
  "w_turtle":      ("Sea Turtle",    "green sea turtle gracefully swimming with flippers spread",         "uncommon",  "aquatic"),
  "w_octopus":     ("Octopus",       "orange octopus with eight curling tentacles and big eyes",          "uncommon",  "aquatic"),
  "w_puffer":      ("Puffer Fish",   "yellow puffer fish fully inflated into a spiky ball",               "uncommon",  "aquatic"),
  "w_penguin":     ("Penguin",       "black and white penguin standing upright looking formal",           "uncommon",  "aquatic"),
  "w_seal":        ("Seal",          "grey seal with big dark eyes and whiskered muzzle",                 "uncommon",  "aquatic"),
  "w_otter":       ("Otter",         "brown otter floating on its back holding a shellfish",              "uncommon",  "aquatic"),
  "w_salmon":      ("Salmon",        "pink salmon leaping up a waterfall",                                "uncommon",  "aquatic"),
  "w_squid":       ("Squid",         "red squid with ten tentacles and large eyes",                       "uncommon",  "aquatic"),
  "w_barracuda":   ("Barracuda",     "silver barracuda with sharp teeth in an aggressive pose",           "uncommon",  "aquatic"),
  "w_walrus":      ("Walrus",        "large brown walrus with long white tusks on an ice floe",           "uncommon",  "aquatic"),
  "w_piranha":     ("Piranha",       "red piranha with huge sharp teeth in a fierce bite",                "uncommon",  "aquatic"),
  "w_eel":         ("Moray Eel",     "green moray eel emerging from a coral crevice with open jaws",     "uncommon",  "aquatic"),
  "w_ray":         ("Stingray",      "dark blue stingray gliding flat through the water",                 "uncommon",  "aquatic"),
  "w_shark":       ("Shark",         "great white shark with wide open jaws showing rows of teeth",       "rare",      "aquatic"),
  "w_narwhal":     ("Narwhal",       "blue-grey narwhal with a single long spiral horn tusk",             "rare",      "aquatic"),
  "w_orca":        ("Orca",          "black and white orca killer whale breaching the surface",           "rare",      "aquatic"),
  "w_hammer":      ("Hammerhead",    "hammerhead shark with distinctive wide T-shaped head",              "rare",      "aquatic"),
  "w_sword":       ("Swordfish",     "sleek silver swordfish with long pointed bill",                     "rare",      "aquatic"),
  "w_manta":       ("Manta Ray",     "giant black manta ray soaring through deep blue water",             "rare",      "aquatic"),
  "w_giantsquid":  ("Giant Squid",   "massive dark red giant squid with enormous eyes in deep dark sea", "rare",      "aquatic"),
  "w_anaconda":    ("Anaconda",      "enormous green anaconda coiled in a river",                         "rare",      "aquatic"),
  "w_riverdolphin":("River Dolphin", "pink Amazon river dolphin surfacing from murky water",              "rare",      "aquatic"),
  "w_sealion":     ("Sea Lion",      "brown sea lion balancing on a rock with flippers spread",           "rare",      "aquatic"),
  "w_bluewhale":   ("Blue Whale",    "enormous blue whale swimming in sunlit ocean with calf",            "legendary", "aquatic"),
  "w_anglerfish":  ("Anglerfish",    "terrifying deep sea anglerfish with bioluminescent lure and huge teeth", "legendary", "aquatic"),
  "w_whaleshark":  ("Whale Shark",   "enormous whale shark with spotted pattern and wide open mouth",     "legendary", "aquatic"),
  "w_polarbear":   ("Polar Bear",    "massive white polar bear standing on arctic ice floe",              "legendary", "aquatic"),

  # ══ DESERT ══
  "d_scorpion":   ("Scorpion",       "golden scorpion with curved tail raised ready to sting",            "common",    "desert"),
  "d_beetle":     ("Beetle",         "shiny black dung beetle pushing a round ball",                      "common",    "desert"),
  "d_lizard":     ("Lizard",         "green lizard basking on a warm desert rock",                        "common",    "desert"),
  "d_locust":     ("Locust",         "brown locust with large hind legs and wings",                       "common",    "desert"),
  "d_moth":       ("Moth",           "tan moth with patterned wings spread wide",                         "common",    "desert"),
  "d_gecko":      ("Gecko",          "pale nocturnal gecko with big eyes on sand",                        "common",    "desert"),
  "d_spider":     ("Spider",         "sandy colored desert spider with eight eyes",                       "common",    "desert"),
  "d_snake":      ("Snake",          "tan desert snake coiled on warm sand",                              "common",    "desert"),
  "d_ant":        ("Ant",            "bright red desert ant carrying a crumb",                            "common",    "desert"),
  "d_centipede":  ("Centipede",      "orange-red centipede with many legs on rock",                       "common",    "desert"),
  "d_jerboa":     ("Jerboa",         "tiny sand-colored mouse with enormous hind legs and long tail",     "common",    "desert"),
  "d_sandgrouse": ("Sandgrouse",     "sandy colored sandgrouse bird with speckled feathers",              "common",    "desert"),
  "d_camel":      ("Camel",          "tan dromedary camel with one hump and long eyelashes",              "uncommon",  "desert"),
  "d_fennec":     ("Fennec Fox",     "tiny fennec fox with enormous ears in the sand",                    "uncommon",  "desert"),
  "d_sandcat":    ("Sand Cat",       "pale sandy wild cat with wide set ears",                            "uncommon",  "desert"),
  "d_tortoise":   ("Tortoise",       "wrinkled desert tortoise with dome-shaped shell",                   "uncommon",  "desert"),
  "d_rattlesnake":("Rattlesnake",    "brown rattlesnake coiled with rattling tail raised",                "uncommon",  "desert"),
  "d_monitor":    ("Monitor Lizard", "large monitor lizard with forked tongue and scaly skin",            "uncommon",  "desert"),
  "d_roadrunner": ("Roadrunner",     "streaky brown roadrunner bird sprinting at high speed",             "uncommon",  "desert"),
  "d_bat":        ("Bat",            "brown bat hanging upside down with wings folded",                   "uncommon",  "desert"),
  "d_coyote":     ("Coyote",         "scraggly tan coyote howling in the desert",                         "uncommon",  "desert"),
  "d_armadillo":  ("Armadillo",      "grey armadillo curled into a protective ball",                      "uncommon",  "desert"),
  "d_falcon":     ("Falcon",         "peregrine falcon in a steep dive with wings tucked",                "uncommon",  "desert"),
  "d_aardwolf":   ("Aardwolf",       "striped aardwolf with mane raised looking like a small hyena",     "uncommon",  "desert"),
  "d_vulture":    ("Vulture",        "bald-headed vulture perched with hunched wings",                    "uncommon",  "desert"),
  "d_hyena":      ("Striped Hyena",  "striped hyena with shaggy mane in arid landscape",                 "uncommon",  "desert"),
  "d_oryx":       ("Oryx",           "white oryx with two long straight horns in sand dunes",             "rare",      "desert"),
  "d_caracal":    ("Caracal",        "tawny caracal wild cat with long tufted black ear tips",            "rare",      "desert"),
  "d_cobra":      ("Cobra",          "hooded cobra with spread hood looking directly forward",             "rare",      "desert"),
  "d_hornedviper":("Horned Viper",   "sand-colored viper with small horns above eyes partially buried",  "rare",      "desert"),
  "d_eagleowl":   ("Eagle Owl",      "large eagle owl with orange eyes and impressive wingspan",          "rare",      "desert"),
  "d_thornydevil":("Thorny Devil",   "spiky thorny devil lizard covered in protective thorns",            "rare",      "desert"),
  "d_dingo":      ("Dingo",          "golden wild dingo dog in Australian outback",                       "rare",      "desert"),
  "d_tarantula":  ("Tarantula",      "large hairy brown tarantula with eight furry legs",                 "rare",      "desert"),
  "d_gilamonster":("Gila Monster",   "orange and black banded gila monster lizard",                       "rare",      "desert"),
  "d_pronghorn":  ("Pronghorn",      "tan pronghorn antelope with unique forked horns running fast",      "rare",      "desert"),
  "d_komodo":     ("Komodo Dragon",  "massive grey-green komodo dragon with forked tongue",               "legendary", "desert"),
  "d_kingcobra":  ("King Cobra",     "enormous king cobra fully hooded rising high in a menacing pose",  "legendary", "desert"),
  "d_jaguar":     ("Jaguar",         "spotted jaguar crouching on a sun-baked rock",                      "legendary", "desert"),
  "d_barbary":    ("Barbary Lion",   "massive dark-maned barbary lion with enormous mane roaring",        "legendary", "desert"),

  # ══ SAVANNA ══
  "s_impala":     ("Impala",         "graceful brown impala antelope with lyre-shaped horns",             "common",    "savanna"),
  "s_warthog":    ("Warthog",        "grey warthog with curved tusks and wart bumps running",             "common",    "savanna"),
  "s_hornbill":   ("Hornbill",       "black and white hornbill bird with giant banana-shaped beak",       "common",    "savanna"),
  "s_jackal":     ("Jackal",         "golden jackal with alert ears and sharp muzzle",                    "common",    "savanna"),
  "s_hare":       ("Hare",           "brown savanna hare with very long ears",                            "common",    "savanna"),
  "s_dungbeetle": ("Dung Beetle",    "shiny black dung beetle rolling a large dung ball",                 "common",    "savanna"),
  "s_stork":      ("Stork",          "tall white stork with red legs and black wing tips",                "common",    "savanna"),
  "s_mongoose":   ("Mongoose",       "alert brown mongoose standing on hind legs",                        "common",    "savanna"),
  "s_porcupine":  ("Porcupine",      "african porcupine with long black and white quills raised",         "common",    "savanna"),
  "s_guineafowl": ("Guinea Fowl",    "spotted grey guinea fowl with blue and red head",                   "common",    "savanna"),
  "s_weaver":     ("Weaver Bird",    "bright yellow weaver bird building an intricate hanging nest",      "common",    "savanna"),
  "s_oxpecker":   ("Oxpecker",       "small red-billed oxpecker bird perched on a large animal hide",    "common",    "savanna"),
  "s_zebra":      ("Zebra",          "black and white striped zebra with flowing mane",                   "uncommon",  "savanna"),
  "s_wildebeest": ("Wildebeest",     "dark gnu wildebeest with curved horns and shaggy beard",           "uncommon",  "savanna"),
  "s_hyena":      ("Spotted Hyena",  "spotted hyena with characteristic sloped back and evil grin",      "uncommon",  "savanna"),
  "s_baboon":     ("Baboon",         "olive baboon with distinctive dog-like muzzle and red bottom",     "uncommon",  "savanna"),
  "s_ostrich":    ("Ostrich",        "tall ostrich with fluffy black and white feathers and long neck",   "uncommon",  "savanna"),
  "s_wilddog":    ("Wild Dog",       "painted african wild dog with big round ears and mottled coat",    "uncommon",  "savanna"),
  "s_buffalo":    ("Buffalo",        "massive african buffalo with wide curved boss horns",               "uncommon",  "savanna"),
  "s_aardvark":   ("Aardvark",       "strange pink aardvark with long tubular snout and big ears",       "uncommon",  "savanna"),
  "s_crane":      ("Crane",          "crowned crane with golden feather crown dancing",                   "uncommon",  "savanna"),
  "s_eland":      ("Eland",          "large tan eland antelope with spiral horns and dewlap",            "uncommon",  "savanna"),
  "s_gazelle":    ("Gazelle",        "slender golden gazelle with ringed horns in mid leap",              "uncommon",  "savanna"),
  "s_gorilla":    ("Gorilla",        "massive silverback gorilla beating its chest",                      "uncommon",  "savanna"),
  "s_flamingo":   ("Flamingo",       "bright pink flamingo standing on one leg in water",                 "uncommon",  "savanna"),
  "s_meerkat":    ("Meerkat",        "meerkat standing upright on guard duty with tiny paws raised",     "uncommon",  "savanna"),
  "s_giraffe":    ("Giraffe",        "towering giraffe with long neck reaching into a tree",              "rare",      "savanna"),
  "s_hippo":      ("Hippo",          "enormous hippo with wide open jaws in a river",                    "rare",      "savanna"),
  "s_leopard":    ("Leopard",        "spotted leopard draped over a tree branch looking down",            "rare",      "savanna"),
  "s_cheetah":    ("Cheetah",        "cheetah in full sprint with all four feet off the ground",         "rare",      "savanna"),
  "s_rhino":      ("Rhino",          "white rhino with two large horns charging forward",                 "rare",      "savanna"),
  "s_eagle":      ("Eagle",          "african fish eagle with wings spread in a dramatic hunting dive",   "rare",      "savanna"),
  "s_panther":    ("Black Panther",  "sleek all-black panther with glowing golden eyes in the grass",    "rare",      "savanna"),
  "s_chimp":      ("Chimpanzee",     "chimpanzee sitting and using a stick as a tool",                   "rare",      "savanna"),
  "s_python":     ("Python",         "enormous african rock python coiled around a tree branch",          "rare",      "savanna"),
  "s_secretary":  ("Secretary Bird", "secretary bird with long crest feathers stomping a snake",          "rare",      "savanna"),
  "s_elephant":   ("Elephant",       "massive african elephant with huge tusks raising its trunk",        "legendary", "savanna"),
  "s_lion":       ("Lion",           "male lion with enormous dark mane roaring with full authority",    "legendary", "savanna"),
  "s_nilecrocodile": ("Nile Crocodile", "massive nile crocodile with armored back and toothy jaws open", "legendary", "savanna"),
  "s_blackmamba": ("Black Mamba",    "black mamba rearing up with mouth wide open in strike position",   "legendary", "savanna"),
}

# ── NPC definitions ────────────────────────────────────────────────────────────
NPCS = {
    "rex":        ("Rex the Dealer",    "sharp-dressed man in a dark trench coat, slicked-back hair, knowing smirk, back-alley vibe"),
    "vera":       ("Vera the Collector","passionate woman with paint-stained hands, art gallery background, expressive eyes, colourful scarf"),
    "larry":      ("Lucky Larry",       "grinning man with dice earrings and a lucky streak, garage workshop background, wild hair"),
    "mom":        ("Mom",               "warm middle-aged woman with a caring smile, cozy kitchen background, gentle expression"),
    "jenny":      ("Junkyard Jenny",    "tough woman in grease-stained overalls, mechanical goggles on forehead, mountains of scrap behind her"),
    "auctioneer": ("The Auctioneer",    "formal auctioneer in black bow tie holding a wooden gavel, auction house podium, dramatic lighting"),
    "mike":       ("Big Mike",          "intimidating loan shark in a sharp suit, heavy gold ring, cold calculating eyes, city night background"),
    "oracle":     ("The Oracle",        "mysterious fortune teller with glowing eyes, crystal ball, draped in deep purple robes"),
    "oligarch":   ("The Oligarch",      "ultra-wealthy collector in an expensive navy suit, shelves of rare collectibles behind, aloof expression"),
    "mae":        ("Farmer Mae",        "cheerful farmer woman in overalls and straw hat, sunny farmyard backdrop, warm smile"),
    "pearl":      ("Captain Pearl",     "weathered sea captain in a navy peacoat, binoculars around neck, ocean horizon behind"),
    "zaid":       ("Nomad Zaid",        "desert nomad in a flowing keffiyeh and travel gear, golden sand dunes and sunset sky"),
    "uma":        ("Ranger Uma",        "park ranger in khaki uniform with binoculars, golden savanna grass swaying behind her"),
    "fence":      ("The Fence",         "shifty merchant in an oversized coat with many pockets, dim warehouse lighting, secretive smirk"),
    "tommy":      ("Tommy the Kid",     "enthusiastic young boy with a huge grin holding card packs, school backpack, messy hair, bright eyes full of wonder"),
    "chen":       ("Prof. Chen",        "sharp academic professor with round glasses, lab coat, clipboard with market charts, focused analytical expression"),
    "insider":    ("The Insider",       "mysterious figure in a dark hood and sunglasses, collar turned up, secretive expression, city shadows behind"),
    "marcus":     ("Marcus the Rival",  "competitive young collector in a flashy jacket, arms crossed, confident smirk, trophy shelf visible behind"),
    "archivist":  ("The Archivist",     "elderly scholar with round spectacles and a neat grey cardigan, floor-to-ceiling bookshelves crammed with catalogues behind, magnifying glass in hand, kind methodical expression"),
    "syndicate":  ("Syndicate Rep",     "sleek corporate figure in a charcoal suit, no tie, polished earpiece, anonymous expression, glass-and-steel office behind, slightly intimidating aura"),
}

# ── Perk icon definitions ──────────────────────────────────────────────────────
# (display_name, visual prompt description)
PERKS = {
    # Economy
    "hoarder":      ("Hoarder",        "cartoon squirrel hugging a giant pile of colorful cards with a greedy happy grin"),
    "whale":        ("Whale",          "large blue whale wearing a tiny top hat, gold coins floating around it, wealthy and powerful"),
    "bargain":      ("Bargain Hunter", "bright red price tag with a big discount sticker and scissors cutting a string, cheerful"),
    "packdeal":     ("Pack Deal",      "tall neat stack of cardboard boxes tied with a ribbon and a discount bow"),
    "loanshark":    ("Loan Shark",     "cartoon shark in a slim business suit holding a briefcase with dollar sign teeth"),
    "insurance":    ("Insurance",      "golden shield with a glowing star in the center, protective sparkling aura"),
    # Luck
    "luckstreak":   ("Lucky Streak",   "glowing four-leaf clover radiating golden rays with rainbow sparkles"),
    "pityperk":     ("Pity Timer",     "cute hourglass with golden sand flowing, warm amber glow, countdown feeling"),
    "rainbow":      ("Rainbow Pack",   "sealed card pack with a rainbow arc and magical colourful light rays"),
    "foil":         ("Foil Edition",   "holographic shimmering card tilted, rainbow iridescent reflections across the surface"),
    "hothand":      ("Hot Hand",       "hand engulfed in orange fire holding a glowing golden card, dramatic flames"),
    "gut":          ("Lucky 7",        "large lucky number seven on a classic dice, four-leaf clovers and gold stars around it"),
    # Information
    "analyst":      ("Market Analyst", "cartoon magnifying glass hovering over a rising bar chart with green upward arrows"),
    "insider":      ("Insider",        "satellite dish beaming a signal beam with a winking eye on the dish face"),
    "memory":       ("Price Memory",   "glowing cartoon brain with circuit board patterns, tiny price tags floating around it"),
    "setcoll":      ("Set Collector",  "open colourful folder holding a fan of cards with a golden discount star sticker"),
    # Time
    "timewarp":     ("Market Freeze",  "large blue snowflake encasing a price tag in clear ice, frozen cold glow"),
    "patience":     ("Patience",       "small green seedling sprouting from a golden coin, gentle warm sunlight above"),
    "slowburn":     ("Slow Burn",      "elegant white candle with a slow dripping wax flame, warm amber golden glow"),
    "eventmag":     ("Event Magnet",   "horseshoe magnet pulling coins and cards toward it with visible magnetic field arcs"),
    "eventshield":  ("Event Shield",   "blue energy dome force field bubble protecting glowing cards inside, sci-fi shield"),
    # Negotiation
    "tongue":       ("Sharp Tongue",   "bold speech bubble with a jagged lightning bolt inside, confident sharp edges"),
    "network":      ("Network",        "five glowing nodes connected by golden lines forming a web network pattern"),
    "bulk":         ("Bulk Discount",  "shopping cart overflowing with stacked items, big discount tag hanging from the handle"),
    "firstdibs":    ("Quick Flip",     "yellow lightning bolt with spinning coins around it, fast kinetic energy lines"),
    "extralisting": ("Extra Listing",  "clipboard with a checklist of three cards listed, neat tick marks, organised feel"),
    # Unique
    "collector":    ("Collector's Ed.","open rare hardcover book with glowing collectible cards fanning out of the pages"),
    "estatesale":   ("Estate Sale",    "cute house with a cheerful yard sale sign on the lawn, sunshine and colourful items"),
    "packhunter":   ("Pack Hunter Mode", "stack of glowing trading card packs tucked into an adventurer backpack, collectible card hunt, cheerful and clear"),
    "midas":        ("Midas Touch",    "golden glowing hand reaching out, objects around it turning solid gold on contact"),
    "mirror":       ("Mirror Market",  "ornate gold-framed mirror reflecting a glowing card, magical shimmering light"),
}

# ── Skill branch icon definitions ─────────────────────────────────────────────
SKILLS = {
    "oracle":      ("The Oracle",      "mystical golden telescope pointed at glowing stars and a ringed planet, cosmic purple glow"),
    "negotiator":  ("The Negotiator",  "two hands shaking in a firm business handshake, golden light radiating from between them"),
    "gambler":     ("The Gambler",     "pair of white dice mid-roll in the air, lucky stars and gold coins scattering"),
    "thief":       ("The Thief",       "sleek dark shadow silhouette holding a glinting lockpick, sparkle of a successful pick"),
    "timekeeper":  ("The Timekeeper",  "ornate golden pocket watch open with intricate clockwork gears visible inside, time glow"),
    "salesman":    ("The Salesman",    "sleek leather briefcase with a golden lock latch, professional shine and clean lines"),
    "teamplayer":  ("Team Player",     "two friendly cartoon animal characters high-fiving with sparkling energy burst between them, cooperative teamwork, warm cheerful glow"),
}

# ── Market event icon definitions ─────────────────────────────────────────────
EVENTS = {
    "flash_sale":    ("Flash Sale",       "yellow lightning bolt striking over a sale price tag, electric flash, red discount banner"),
    "market_crash":  ("Market Crash",     "bold red downward graph arrow crashing through a chart floor, dramatic shatter impact"),
    "hype_spike":    ("Hype Spike",       "green rocket launching upward trailing sparkles, price arrow pointing to the sky"),
    "lucky_packs":   ("Lucky Packs",      "sealed golden pack glowing with warm light rays and lucky stars bursting out"),
    "free_pack":     ("Free Pack",        "wrapped gift box with a colourful ribbon and bow, golden glow, surprise sparkling inside"),
    "fair":          ("Collector's Fair", "festive striped carnival tent with colourful bunting flags, cheerful collector market vibe"),
}

# ── Set theme image definitions ───────────────────────────────────────────────
SETS = {
    "home":    ("Home & Farm",      "cozy red farmhouse with rolling green fields, white fence, farm animals visible, bright blue sky"),
    "aquatic": ("Aquatic World",    "deep blue ocean wave cresting with coral reef and tropical fish visible beneath the surface"),
    "desert":  ("Desert",          "golden sand dunes under a blazing orange sun, lone cactus, heat shimmer on the horizon"),
    "savanna": ("African Savanna",  "golden savanna plain with a lone acacia tree silhouette at warm orange sunset, vast open sky"),
}

# ── Ace card definitions ───────────────────────────────────────────────────────
# (display_name, prompt_description, set_id)
ACE_STYLE = (
    "dramatic fantasy illustration, emoji art style, bold simple shapes, "
    "deep black background with golden shimmering aura, extinct prehistoric animal, "
    "ethereal glowing edges, legendary rarity, awe-inspiring majestic powerful, "
    "clean centered single subject, thick glowing outlines, icon design, 512x512"
)

ACES = {
    # Home & Farm
    "h_aurochs":     ("Aurochs",           "massive bull ancestor of all cattle, huge curved horns, muscular dark brown body, noble prehistoric animal", "home"),
    "h_tarpan":      ("Tarpan",            "wild grey horse, extinct European stallion, flowing mane, fierce yet graceful, primitive horse", "home"),
    "h_dodo":        ("Dodo",              "plump extinct dodo bird, large hooked beak, tiny wings, round fluffy body, friendly and curious", "home"),
    "h_mammoth":     ("Woolly Mammoth",    "giant woolly mammoth with massive curved tusks, thick fur, ice age prehistoric giant", "home"),
    "h_megaloceros": ("Irish Elk",         "giant Irish elk with enormous moose-like antlers spanning wide, majestic prehistoric deer", "home"),
    # Aquatic
    "w_megalodon":   ("Megalodon",         "enormous prehistoric shark megalodon, massive serrated teeth, giant shadow in ocean, terrifying apex predator", "aquatic"),
    "w_livyatan":    ("Livyatan",          "colossal prehistoric sperm whale livyatan, enormous jaws with large teeth, whale-like body, ancient ocean leviathan", "aquatic"),
    "w_dunkle":      ("Dunkleosteus",      "armored prehistoric fish dunkleosteus, bony armored head plates, massive powerful jaws, ancient ocean warrior", "aquatic"),
    "w_mosasaurus":  ("Mosasaurus",        "giant mosasaurus sea monster, long serpentine body, powerful flippers, large gaping jaws, cretaceous sea dragon", "aquatic"),
    "w_stellers":    ("Steller's Sea Cow", "enormous steller sea cow, massive gentle herbivore, manatee-like body, peaceful extinct ocean giant", "aquatic"),
    # Desert
    "d_quagga":      ("Quagga",           "quagga extinct half-zebra half-horse, stripes only on front half fading to plain brown, unique extinct equine", "desert"),
    "d_atlasbear":   ("Atlas Bear",       "atlas bear north africa extinct bear, stocky dark bear, powerful ancient predator, roman arena survivor", "desert"),
    "d_woollyrhino": ("Woolly Rhinoceros", "woolly rhinoceros covered in thick fur, two large horns, prehistoric ice age giant rhino", "desert"),
    "d_sivatherium": ("Sivatherium",      "sivatherium giant prehistoric giraffe with large moose-like ossicones horns, short-necked giraffe ancestor", "desert"),
    "d_caspiantiger":("Caspian Tiger",    "caspian tiger, massive striped extinct tiger subspecies, powerful and fierce, central asian jungle predator", "desert"),
    # Savanna
    "s_smilodon":    ("Smilodon",         "smilodon saber-tooth cat, enormous curved canine fangs 30cm long, muscular powerful extinct feline", "savanna"),
    "s_thylacine":   ("Thylacine",        "thylacine tasmanian tiger, striped marsupial predator, dog-like body with tiger stripes, extinct marsupial", "savanna"),
    "s_dinofelis":   ("Dinofelis",        "dinofelis false saber-tooth cat, semi-saber fangs, leopard-like powerful prehistoric feline", "savanna"),
    "s_direwolf":    ("Dire Wolf",        "dire wolf, larger prehistoric wolf, powerful muscular grey wolf, pleistocene ice age predator", "savanna"),
    "s_giganto":     ("Gigantopithecus",  "gigantopithecus enormous prehistoric ape 3 metres tall, king kong real, giant orangutan ancestor", "savanna"),
}


def build_prompt(card_id, extra=""):
    name, desc, rarity, _ = CARDS[card_id]
    mood = RARITY_MOOD[rarity]
    extra_part = f" {extra.strip()}," if extra and extra.strip() else ""
    return f"{STYLE}, {mood}.{extra_part} Subject: {desc}."

def build_npc_prompt(npc_id):
    _, desc = NPCS[npc_id]
    return f"{NPC_STYLE}. Character: {desc}."

def build_icon_prompt(desc):
    return f"{ICON_STYLE}. Subject: {desc}."


def generate_pollinations(prompt, out_path, retries=3):
    encoded = urllib.parse.quote(prompt)
    seed    = abs(hash(prompt)) % 99999
    url = (f"https://image.pollinations.ai/prompt/{encoded}"
           f"?width=512&height=512&model=flux&nologo=true&seed={seed}")
    req = urllib.request.Request(url, headers={"User-Agent": "SetHunter/1.0"})
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                data = r.read()
            if len(data) < 1000:
                raise ValueError(f"Response too small ({len(data)} bytes)")
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_bytes(data)
            print(f"✅  {out_path.name}  ({len(data) // 1024} KB)")
            return True
        except Exception as e:
            if attempt < retries:
                print(f"⚠️  attempt {attempt} failed ({e}) — retrying...")
                time.sleep(3)
            else:
                print(f"❌  failed after {retries} attempts: {e}")
                return False

def generate_gemini(prompt, out_path):
    import json, base64
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("❌  GEMINI_API_KEY not set. Using pollinations instead.")
        return generate_pollinations(prompt, out_path)
    model = "gemini-2.5-flash-image"
    url   = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    body  = json.dumps({
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
    }).encode()
    req = urllib.request.Request(url, data=body,
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            resp = json.loads(r.read())
        for part in resp.get("candidates", [{}])[0].get("content", {}).get("parts", []):
            if "inlineData" in part:
                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_bytes(base64.b64decode(part["inlineData"]["data"]))
                print(f"✅  {out_path.name}  ({out_path.stat().st_size // 1024} KB)")
                return True
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"❌  Gemini {e.code}: {err[:200]}")
        if e.code == 429:
            print("   → Rate limited. Falling back to pollinations.")
            return generate_pollinations(prompt, out_path)
    return False

def versioned_path(base_dir, name):
    """Return base_dir/name.png if it doesn't exist, else base_dir/name_2.png, _3, etc."""
    p = base_dir / f"{name}.png"
    if not p.exists():
        return p
    n = 2
    while True:
        p = base_dir / f"{name}_{n}.png"
        if not p.exists():
            return p
        n += 1

def _do_generate(asset_id, desc, out_dir, label, backend, delay, overwrite, skip_existing):
    out_path = out_dir / f"{asset_id}.png" if overwrite else versioned_path(out_dir, asset_id)
    if skip_existing and (out_dir / f"{asset_id}.png").exists():
        print(f"  ⏭️  {asset_id} (exists, skipping)")
        return True
    prompt = build_icon_prompt(desc)
    print(f"  {label:<24s} → {out_path.name} ", end="", flush=True)
    ok = generate_gemini(prompt, out_path) if backend == "gemini" else generate_pollinations(prompt, out_path)
    if ok:
        time.sleep(delay)
    return ok

def generate(card_id, backend="pollinations", delay=1.5, extra="", overwrite=False, skip_existing=False):
    if skip_existing and (OUT_DIR / f"{card_id}.png").exists():
        print(f"  ⏭️  {card_id} (exists, skipping)")
        return True
    entry    = CARDS[card_id]
    prompt   = build_prompt(card_id, extra=extra)
    out_path = OUT_DIR / f"{card_id}.png" if overwrite else versioned_path(OUT_DIR, card_id)
    print(f"  {card_id:22s} [{entry[2]:9s}] → {out_path.name} ", end="", flush=True)
    ok = generate_gemini(prompt, out_path) if backend == "gemini" else generate_pollinations(prompt, out_path)
    if ok:
        time.sleep(delay)
    return ok

def generate_npc(npc_id, backend="pollinations", delay=1.5, overwrite=False, skip_existing=False):
    if skip_existing and (NPC_OUT_DIR / f"{npc_id}.png").exists():
        print(f"  ⏭️  npc:{npc_id} (exists, skipping)")
        return True
    prompt   = build_npc_prompt(npc_id)
    out_path = NPC_OUT_DIR / f"{npc_id}.png" if overwrite else versioned_path(NPC_OUT_DIR, npc_id)
    print(f"  npc:{npc_id:18s} → {out_path.name} ", end="", flush=True)
    ok = generate_gemini(prompt, out_path) if backend == "gemini" else generate_pollinations(prompt, out_path)
    if ok:
        time.sleep(delay)
    return ok

ACE_OUT_DIR = ROOT / "assets" / "aces"
BTN_DIR     = ROOT / "assets" / "buttons"

BUTTONS = {
    "sound":       ("Sound On",       "vintage loudspeaker horn broadcasting sound, warm golden tones, retro audio speaker emitting musical notes with vibrations, friendly and clear"),
    "mute":        ("Muted",          "vintage loudspeaker horn with a bold red X cross through it, silenced muted audio, same retro warm style as the sound-on speaker"),
    "skill":       ("Skill Tree",     "glowing golden star with branching tree constellation paths, skill upgrade"),
    "codex":       ("Codex",          "ancient leather-bound open book with glowing golden pages and mystical runes"),
    "contacts":    ("NPC Contacts",   "friendly cartoon merchant character portrait, jolly shopkeeper with a hat and warm smile, NPC character face close-up, approachable and charming"),
    "tutorial":    ("Tutorial Help",  "round speech bubble with large question mark inside, help guide"),
    "cardmode":    ("Card Art Mode",  "playing card overlaid with artist palette and paintbrush, art style toggle"),
    "leaderboard": ("Leaderboard",    "gleaming gold trophy cup with laurel wreath, championship first place"),
    "menu":        ("Main Menu",      "three stacked trading cards with golden edges and a small home doorway symbol, return to main menu, warm gold and purple accents, clear at small icon size"),
    "portal":      ("Vibe Jam Portal","glowing hexagonal portal vortex swirling with colorful light beams"),
}

def build_ace_prompt(ace_id, extra=""):
    name, desc, _ = ACES[ace_id]
    extra_part = f" {extra.strip()}," if extra and extra.strip() else ""
    return f"{ACE_STYLE}.{extra_part} Subject: {desc}."

def generate_ace(ace_id, backend="pollinations", delay=1.5, extra="", overwrite=False, skip_existing=False):
    if skip_existing and (ACE_OUT_DIR / f"{ace_id}.png").exists():
        print(f"  ⏭️  ace:{ace_id} (exists, skipping)")
        return True
    prompt   = build_ace_prompt(ace_id, extra=extra)
    out_path = ACE_OUT_DIR / f"{ace_id}.png" if overwrite else versioned_path(ACE_OUT_DIR, ace_id)
    print(f"  ace:{ace_id:20s} → {out_path.name} ", end="", flush=True)
    ok = generate_gemini(prompt, out_path) if backend == "gemini" else generate_pollinations(prompt, out_path)
    if ok:
        time.sleep(delay)
    return ok


def main():
    p = argparse.ArgumentParser(description="Generate card artwork and icons for Set Hunter")
    p.add_argument("prompt",    nargs="?", help="Free-form prompt")
    p.add_argument("output",    nargs="?", default="./generated-image.png")

    # Cards
    p.add_argument("--card",    help="Card id (e.g. s_lion)")
    p.add_argument("--extra",   default="", help="Extra prompt for --card (e.g. 'meaner, razor teeth')")
    p.add_argument("--all",     action="store_true", help="All 160 card images")
    p.add_argument("--set",     choices=["home", "aquatic", "desert", "savanna"], help="One set's cards")

    # NPCs
    p.add_argument("--npc",     help="NPC id (e.g. rex, jenny, uma)")
    p.add_argument("--npcs",    action="store_true", help="All NPC portraits")

    # Perks
    p.add_argument("--perk",    help="Perk id (e.g. hoarder, whale, midas)")
    p.add_argument("--perks",   action="store_true", help="All 31 perk icons → assets/perks/")

    # Skills
    p.add_argument("--skill",   help="Skill branch id (e.g. oracle, gambler, salesman)")
    p.add_argument("--skills",  action="store_true", help="All 7 skill branch icons → assets/skills/")

    # Events
    p.add_argument("--event",   help="Event id (e.g. flash_sale, market_crash, fair)")
    p.add_argument("--events",  action="store_true", help="All 6 market event icons → assets/events/")

    # Set themes
    p.add_argument("--settheme",  help="Set theme id (e.g. home, aquatic, desert, savanna)")
    p.add_argument("--setthemes", action="store_true", help="All 4 set theme images → assets/sets/")

    # Ace cards
    p.add_argument("--ace",      help="Ace card id (e.g. h_aurochs, w_megalodon)")
    p.add_argument("--aces",     action="store_true", help="All 20 ace card images → assets/aces/")
    p.add_argument("--aceset",   choices=["home","aquatic","desert","savanna"], help="One set's ace cards")

    # UI Buttons
    p.add_argument("--btn",      help="Button icon id (e.g. sound, skill, codex)")
    p.add_argument("--btns",     action="store_true", help="All UI button icons → assets/buttons/")

    # Options
    p.add_argument("--backend", default="pollinations", choices=["pollinations", "gemini"])
    p.add_argument("--skip-existing", action="store_true", help="Skip if .png already exists")
    p.add_argument("--overwrite",     action="store_true", help="Overwrite existing file (no _2, _3 suffix)")
    args = p.parse_args()

    backend = args.backend
    skip    = args.skip_existing
    ow      = args.overwrite

    # ── Cards ────────────────────────────────────────────────────────────────
    if args.all or args.set:
        pool = {cid: v for cid, v in CARDS.items() if not args.set or v[3] == args.set}
        if skip:
            pool = {cid: v for cid, v in pool.items() if not (OUT_DIR / f"{cid}.png").exists()}
        print(f"Backend: {backend}\nGenerating {len(pool)} card images → {OUT_DIR}/\n")
        ok = sum(generate(cid, backend, overwrite=ow, skip_existing=skip) for cid in sorted(pool))
        print(f"\n✅  Done: {ok}/{len(pool)} cards.")

    elif args.card:
        if args.card not in CARDS:
            print(f"Unknown card id. Example ids: h_cat, w_anglerfish, d_jaguar, s_lion"); sys.exit(1)
        generate(args.card, backend, delay=0, extra=args.extra, overwrite=ow)

    # ── NPCs ─────────────────────────────────────────────────────────────────
    elif args.npcs:
        pool = list(NPCS.keys())
        if skip:
            pool = [nid for nid in pool if not (NPC_OUT_DIR / f"{nid}.png").exists()]
        print(f"Backend: {backend}\nGenerating {len(pool)} NPC portraits → {NPC_OUT_DIR}/\n")
        ok = sum(generate_npc(nid, backend, overwrite=ow) for nid in pool)
        print(f"\n✅  Done: {ok}/{len(pool)} NPC portraits.")

    elif args.npc:
        if args.npc not in NPCS:
            print(f"Unknown NPC id. Available: {', '.join(NPCS)}"); sys.exit(1)
        generate_npc(args.npc, backend, delay=0, overwrite=ow)

    # ── Perks ─────────────────────────────────────────────────────────────────
    elif args.perks:
        pool = list(PERKS.items())
        if skip:
            pool = [(pid, v) for pid, v in pool if not (PERK_DIR / f"{pid}.png").exists()]
        print(f"Backend: {backend}\nGenerating {len(pool)} perk icons → {PERK_DIR}/\n")
        ok = sum(_do_generate(pid, v[1], PERK_DIR, f"perk:{pid}", backend, 1.5, ow, skip) for pid, v in pool)
        print(f"\n✅  Done: {ok}/{len(pool)} perk icons.")

    elif args.perk:
        if args.perk not in PERKS:
            print(f"Unknown perk id. Available: {', '.join(PERKS)}"); sys.exit(1)
        _, desc = PERKS[args.perk]
        _do_generate(args.perk, desc, PERK_DIR, f"perk:{args.perk}", backend, 0, ow, False)

    # ── Skills ────────────────────────────────────────────────────────────────
    elif args.skills:
        pool = list(SKILLS.items())
        if skip:
            pool = [(sid, v) for sid, v in pool if not (SKILL_DIR / f"{sid}.png").exists()]
        print(f"Backend: {backend}\nGenerating {len(pool)} skill icons → {SKILL_DIR}/\n")
        ok = sum(_do_generate(sid, v[1], SKILL_DIR, f"skill:{sid}", backend, 1.5, ow, skip) for sid, v in pool)
        print(f"\n✅  Done: {ok}/{len(pool)} skill icons.")

    elif args.skill:
        if args.skill not in SKILLS:
            print(f"Unknown skill id. Available: {', '.join(SKILLS)}"); sys.exit(1)
        _, desc = SKILLS[args.skill]
        _do_generate(args.skill, desc, SKILL_DIR, f"skill:{args.skill}", backend, 0, ow, False)

    # ── Events ────────────────────────────────────────────────────────────────
    elif args.events:
        pool = list(EVENTS.items())
        if skip:
            pool = [(eid, v) for eid, v in pool if not (EVENT_DIR / f"{eid}.png").exists()]
        print(f"Backend: {backend}\nGenerating {len(pool)} event icons → {EVENT_DIR}/\n")
        ok = sum(_do_generate(eid, v[1], EVENT_DIR, f"event:{eid}", backend, 1.5, ow, skip) for eid, v in pool)
        print(f"\n✅  Done: {ok}/{len(pool)} event icons.")

    elif args.event:
        if args.event not in EVENTS:
            print(f"Unknown event id. Available: {', '.join(EVENTS)}"); sys.exit(1)
        _, desc = EVENTS[args.event]
        _do_generate(args.event, desc, EVENT_DIR, f"event:{args.event}", backend, 0, ow, False)

    # ── Set themes ────────────────────────────────────────────────────────────
    elif args.setthemes:
        pool = list(SETS.items())
        if skip:
            pool = [(sid, v) for sid, v in pool if not (SET_DIR / f"{sid}.png").exists()]
        print(f"Backend: {backend}\nGenerating {len(pool)} set theme images → {SET_DIR}/\n")
        ok = sum(_do_generate(sid, v[1], SET_DIR, f"set:{sid}", backend, 1.5, ow, skip) for sid, v in pool)
        print(f"\n✅  Done: {ok}/{len(pool)} set theme images.")

    elif args.settheme:
        if args.settheme not in SETS:
            print(f"Unknown set id. Available: {', '.join(SETS)}"); sys.exit(1)
        _, desc = SETS[args.settheme]
        _do_generate(args.settheme, desc, SET_DIR, f"set:{args.settheme}", backend, 0, ow, False)

    # ── Ace cards ─────────────────────────────────────────────────────────────
    elif args.aces or args.aceset:
        pool = [(aid, v) for aid, v in ACES.items()
                if not args.aceset or v[2] == args.aceset]
        if skip:
            pool = [(aid, v) for aid, v in pool if not (ACE_OUT_DIR / f"{aid}.png").exists()]
        print(f"Generating {len(pool)} ace card images…")
        ok = sum(generate_ace(aid, backend=backend, delay=2.0, overwrite=ow, skip_existing=skip) for aid, _ in pool)
        print(f"\n✅  Done: {ok}/{len(pool)} ace images.")

    elif args.ace:
        if args.ace not in ACES:
            print(f"Unknown ace id. Available: {', '.join(ACES)}"); sys.exit(1)
        generate_ace(args.ace, backend=backend, extra=args.extra, overwrite=ow)

    # ── UI Buttons ────────────────────────────────────────────────────────────
    elif args.btns:
        pool = list(BUTTONS.items())
        if skip:
            pool = [(bid, v) for bid, v in pool if not (BTN_DIR / f"{bid}.png").exists()]
        print(f"Generating {len(pool)} button icon images…")
        ok = sum(_do_generate(bid, v[1], BTN_DIR, f"btn:{bid}", backend, 1.5, ow, skip) for bid, v in pool)
        print(f"\n✅  Done: {ok}/{len(pool)} button icons.")

    elif args.btn:
        if args.btn not in BUTTONS:
            print(f"Unknown button id. Available: {', '.join(BUTTONS)}"); sys.exit(1)
        _, desc = BUTTONS[args.btn]
        _do_generate(args.btn, desc, BTN_DIR, f"btn:{args.btn}", backend, 0, ow, False)

    # ── Free-form prompt ──────────────────────────────────────────────────────
    elif args.prompt:
        out = Path(args.output)
        print(f"Generating custom image → {out}")
        encoded = urllib.parse.quote(args.prompt)
        url = f"https://image.pollinations.ai/prompt/{encoded}?width=512&height=512&model=flux&nologo=true"
        req = urllib.request.Request(url, headers={"User-Agent": "SetHunter/1.0"})
        with urllib.request.urlopen(req, timeout=90) as r:
            out.write_bytes(r.read())
        print(f"Saved to {out}")

    else:
        p.print_help()
        print("\nExamples:")
        print("  python scripts/generate_image.py --set home            # 40 farm/pet cards")
        print("  python scripts/generate_image.py --all                 # all 160 cards")
        print("  python scripts/generate_image.py --card s_lion")
        print("  python scripts/generate_image.py --card w_anglerfish --extra 'meaner terrifying'")
        print("  python scripts/generate_image.py --npcs                # all NPC portraits")
        print("  python scripts/generate_image.py --npc jenny")
        print("  python scripts/generate_image.py --perks               # all 31 perk icons")
        print("  python scripts/generate_image.py --perk hoarder")
        print("  python scripts/generate_image.py --skills              # all 6 skill branch icons")
        print("  python scripts/generate_image.py --events              # all 6 market event icons")
        print("  python scripts/generate_image.py --setthemes           # all 4 set theme images")
        print("  python scripts/generate_image.py --all --skip-existing # resume interrupted run")

if __name__ == "__main__":
    main()
