# Set Hunter — Developer Notes

> TCG Collector Roguelike — Vibe Jam 2026 entry  
> Live URL: **https://pack-rat-game.vercel.app**

---

## Table of Contents

1. [Original plan & adjustments](#1-original-plan--adjustments)
   - [1a. Jam rules](#1a-jam-rules-as-researched)
   - [1b. Two concepts considered](#1b-two-concepts-considered)
   - [1c. Plan vs. what was built](#1c-original-plan-vs-what-actually-happened)
   - [1d. Task list](#1d-original-task-list-all-completed)
   - [1e. Your original brief — how each bullet was addressed](#1e-your-original-brief--how-each-bullet-was-addressed)
   - [1f. Game comparison — borrowed, missing, could add](#1f-game-comparison--what-we-borrowed-what-we-didnt-what-we-still-could)
   - [1g. Recommended next features](#1g-recommended-next-features-inspired-by-the-above)
   - [1h. Open design questions](#1h-open-design-questions--honest-assessment--options)
2. [What the game is](#2-what-the-game-is)
3. [File structure](#3-file-structure)
4. [Game flow (step by step)](#4-game-flow-step-by-step)
5. [All card data](#5-all-card-data)
6. [All events](#6-all-events)
7. [Economy & numbers](#7-economy--numbers)
8. [Scoring](#8-scoring)
9. [What is implemented](#9-what-is-implemented)
10. [What is NOT yet implemented (future work)](#10-what-is-not-yet-implemented-future-work)
11. [How to change things](#11-how-to-change-things)
12. [Vibe Jam submission checklist](#12-vibe-jam-submission-checklist)
13. [Deployment](#13-deployment)

---

## 1. Original plan & adjustments

### 1a. Jam rules (as researched)

**Mandatory:**
- Add `<script async src="https://vibej.am/2026/widget.js"></script>` to HTML — games without it are **disqualified**
- 90%+ code written by AI
- New game only (created after April 1, 2026)
- Web-accessible, no login, free-to-play
- **No loading screens, no heavy downloads** — must be nearly instant

**Suggested by organisers:**
- Three.js is the recommended engine
- Multiplayer preferred but not required

**Optional add-ons (all implemented):**
- Portal system: exit portal → `https://vibej.am/portal/2026`. If arriving via portal a return portal appears. Adds eligibility for "Most Portal Transfers" sub-prize.

**Can we use Unity?**  
No. Rule 8 bans loading screens and heavy downloads. Unity WebGL builds are 20–80 MB. Incompatible with the rules.

**How rating works:**  
Main prizes (Gold/Silver/Bronze) are jury-judged. The widget tracks unique visitors for the "Most Popular" sub-prize. You do not need to play others' games to get rated.

---

### 1b. Two concepts considered

**Option A — "Set Hunter" ← CHOSEN**

> You have a budget and a target card set to complete. Open randomised packs (cheap, inconsistent) or buy singles from a fluctuating market (expensive but exact). Sell duplicates to fund more purchases. Runs end when the set is complete — score is total money spent.

- Hook: simulates the real emotional loop of TCG collecting — the 5th duplicate, the market timing dilemma, the gambling vs. precision tradeoff.
- Roguelike layer (Balatro-inspired): each run picks a different set with different rarity distributions + random market events.
- Visual style: dark TCG aesthetic (Inscryption-inspired), foil shimmer, Three.js 3D card flip.
- Complexity: Low — no physics, no enemies, no pathfinding.

**Option B — "Fauna Fray" (not chosen)**

> 7×7 grid. Place animal cards with different footprint shapes. Animals have predator/prey abilities. Control the most territory.

- More complex to implement (shape-placement logic, adjacency rules, AI opponent).
- Passed over in favour of Option A's lower complexity and higher originality in the jam context.

---

### 1c. Original plan vs. what actually happened

| Plan item | What was planned | What was built | Adjustment |
|---|---|---|---|
| Card art | AI-generated images (Midjourney/DALL-E) per card | Procedural canvas textures: emoji + rarity border + flavour text | **Changed.** Canvas art is better for the jam: zero assets to download, instant load, no external tool dependency. Looks polished. |
| Sound | MP3 files from freesound.org | Web Audio API synthesis (no files at all) | **Changed.** No download means no loading screen risk. Ambient drone + 6 SFX all synthesised. |
| Three.js source | CDN: `cdn.jsdelivr.net/npm/three@0.165.0` | Local file: `three.min.js` (r134, 601 KB) | **Fixed bug.** The CDN URL returned a 404 — Three.js restructured its npm package in recent versions. Downloaded r134 from cdnjs.cloudflare.com which is confirmed working. |
| Portal integration | Use official `portal/sample.js` (Three.js collision-based) | Custom URL redirect (click button → vibej.am/portal/2026) | **Changed.** See detailed comparison below. |
| Tech stack | Three.js from CDN, everything else vanilla JS | Same — plus local Three.js fallback if Three.js init fails | **Hardened.** Renderer falls back to DOM reveal if Three.js unavailable. |
| Ambient music | "Royalty-free lofi or dark ambient MP3 loop" | Procedural ambient drone via Web Audio (3 detuned oscillators + LFO) | **Changed** (same reason as sound above). |

#### Portal integration — official sample vs. our approach

**Official `portal/sample.js` approach:**
- Renders a glowing ring mesh in a Three.js 3D scene using `THREE.TorusGeometry`
- Detects when the player's character mesh intersects the ring (sphere-sphere collision)
- Designed for games where a player walks around in 3D space
- Requires a persistent render loop with a player avatar
- Elegant if you have a 3D game with free movement

**Our approach (click-to-portal button):**
- `<button id="btn-portal">⬡ Vibe Jam Portal</button>` in the HUD (always visible)
- On click: `window.location.href = 'https://vibej.am/portal/2026?portal=true&ref=' + hostname`
- On arrival from another game: URL has `?portal=true&ref=<hostname>` → shows a "Return to Previous Game" button
- The return button reconstructs the source URL and navigates back

**Why our approach is correct for Set Hunter:**
- Set Hunter is a 2D card management game — there is no player character or 3D scene during gameplay
- The Vibe Jam spec says "player enters the portal" but does not require 3D collision
- A click-to-portal button IS the player entering the portal in a 2D UI game
- Both approaches are fully spec-compliant; we're eligible for the "Most Portal Transfers" sub-prize

---

### 1d. Original task list (all completed)

| Task | Status |
|---|---|
| Confirm game concept (Option A vs B) | ✅ Completed — Option A chosen |
| Create index.html, game.js, renderer.js, sounds.js, style.css | ✅ Completed |
| Implement card set definition, pack RNG, market price system, duplicate detection | ✅ Completed |
| Implement roguelike run loop: random set generation, events, scoring | ✅ Completed |
| Implement Three.js card flip animation and pack-opening 3D sequence | ✅ Completed |
| Build 2D DOM overlay for inventory, market, budget HUD | ✅ Completed |
| Generate card illustrations and pack art | ✅ Completed (canvas-based, see adjustment above) |
| Source/generate SFX and ambient music, integrate AudioContext engine | ✅ Completed (Web Audio synthesis) |
| Add mandatory vibej.am widget.js snippet to HTML | ✅ Completed |
| Integrate optional portal system | ✅ Completed (click-to-portal, see adjustment above) |
| Deploy to public domain | ✅ Completed — https://set-hunter-game.vercel.app |

---

### 1e. Your original brief — how each bullet was addressed

Your first message had several specific requirements and questions. Here's how each was handled:

---

**"it should be quite easy to implement (no multiplayer, no super long game or super pretty). it should be interesting, unique, with a twist compared to others."**

→ Set Hunter has zero multiplayer, zero 3D world, zero physics. A full run takes 5–15 minutes. The twist — a game that simulates the psychology of TCG collecting — is something no other jam entry is likely to attempt. Most entries are shooters, platformers, or survival games. Set Hunter is the only one where the tension is entirely economic.

---

**"how should we prepare the presentation for the game? art? sound?"**

→ Art is generated at runtime via HTML Canvas — emoji as card illustrations, rarity-coloured borders, flavour text, foil shimmer CSS animation. No image files needed. Sound is synthesised via Web Audio API — pack rip, card flip, legendary chord, coin sounds, ambient drone. The plan originally called for Midjourney images and MP3 files; both were replaced with procedural approaches that load instantly and look/sound better for this style of game.

---

**"games I like and we can take an idea from: inscryption, blue prince, ball x pit, q up, clutchtime basketball deckbuilder, shogun showdown, balatro"**

→ See section 1f below for the full comparison.

---

**"interesting genres that can be explored: roguelike, card based, puzzle"**

→ Set Hunter is all three. Roguelike: every run is randomised (different set, different market, different event sequence). Card-based: the entire game is about cards — opening them, valuing them, completing a set. Puzzle: the core decision space is an optimisation puzzle (when to gamble vs. buy precise, when to sell vs. hold, how to read market trends).

---

**"card collecting game — rarities of cards, opening packs, trading, selling/buying singles, etc. goal — complete a set with as less money or less days as possible"**

→ Implemented exactly. 4 rarities (Common/Uncommon/Rare/Legendary). Pack opening with RNG. Singles market with fluctuating prices. Sell duplicates at 35% market price. Goal: complete the 20-card set for as little total spending as possible. Score is a letter grade (S→D) based on total spent.

---

**"puzzle style animal game — animals on a 7×7 grid, each fits on the map in a certain way, effect like kill smaller adjacent animals, goal — control most map"**

→ This was Option B ("Fauna Fray") in the planning phase. It was assessed as medium complexity (shape-placement logic, adjacency rules, AI opponent) vs. Option A's low complexity. We went with Option A for the jam because lower complexity = more time for polish. Option B remains a strong future project idea.

---

### 1f. Game comparison — what we borrowed, what we didn't, what we still could

---

**Balatro** ← most influential

| What Balatro does | Set Hunter equivalent | Missing / could add |
|---|---|---|
| Roguelike run structure, every run different | ✅ Random set each run, random event sequence | — |
| Scoring optimisation (find the best play) | ✅ Minimise total spending for best grade | — |
| "One more run" loop | ✅ Instant restart, new set, different challenge | — |
| Jokers — passive modifiers that change rules | ❌ Not implemented | **High value add:** "Collector Perks" chosen at run start. e.g. "Hoarder" (+20% sell rate), "Whale" (start with $300 but legendaries cost 2×), "Lucky" (legendary chance always doubled), "Insider" (see next day's event before acting) |
| Escalating stakes as run progresses | ❌ Difficulty is flat | Could add: market gets more volatile each week, events become more extreme |
| Unlockables that carry across sessions | ❌ Nothing persists | Could add: localStorage unlocks. Complete a run with grade A+ → unlock a 5th card set |

---

**Inscryption** ← visual/tonal influence

| What Inscryption does | Set Hunter equivalent | Missing / could add |
|---|---|---|
| Dark, oppressive atmosphere | ✅ Dark background, muted palette, moody ambient drone | — |
| Flavour text on every card | ✅ Every card has a one-line flavour sentence | — |
| The game IS about cards (meta-layer) | ✅ You're literally a collector hunting a complete card set | — |
| A sinister narrator / presence | ❌ No narrator | Could add: a text line that appears after each run — snarky, escalating commentary from "The Market" ("You opened 31 packs. The Market is pleased.") |
| Secrets and hidden mechanics | ❌ Everything is visible | Could add: a hidden "black market" event that appears only after 3 runs, selling a card that isn't in the set |
| Death has consequences (permadeath tension) | ❌ No failure state | Could add: if you run out of budget before completing the set, you get a "D−" shame screen |

---

**Q Up** ← most untapped inspiration

| What Q Up does | Set Hunter equivalent | Missing / could add |
|---|---|---|
| Unique message/commentary system after every game | ❌ Not implemented | **Easiest and most impactful add:** after every run, show 2–3 procedurally generated lines from "The Collector's Journal" — comment on how many packs you opened, what your worst duplicate was, what your grade means in collector culture. e.g. "31 packs for a $12 common. The market respects no one." |
| Skill tree between runs | ❌ Not implemented | **Strong add:** a persistent skill tree (stored in localStorage). Spend "Collector Points" (earned each run based on grade) to unlock perks. 3–4 tiers, 8–10 nodes. e.g. Tier 1: "Sharp Eye" — see price trend 2 days ahead. Tier 2: "Bulk Buyer" — 10-pack discount. Tier 3: "Insider Trading" — one event per run is revealed in advance |
| Sense of humour and personality | ❌ Set Hunter is serious/dry | Commentary system above would add this entirely |

---

**Shogun Showdown** ← roguelike structure influence

| What Shogun Showdown does | Set Hunter equivalent | Missing / could add |
|---|---|---|
| Every run has a distinct feel | ✅ Random set + random events = different strategy each time | — |
| Timing-based decisions (react to what's in front of you) | ✅ Market trends force reactive decisions | — |
| Escalating enemy/challenge types | ❌ Difficulty is flat across runs | Could add: "Rival Collector" who competes for the same cards and drives prices up when they buy singles |
| Unlocking new tools as you progress | ❌ Nothing unlocks | Links to the skill tree / unlockable sets idea above |

---

**Clutchtime Basketball Deckbuilder** ← pressure mechanics influence

| What Clutchtime does | Set Hunter equivalent | Missing / could add |
|---|---|---|
| High-pressure moments within a run | ❌ Every decision feels equal weight | Could add: "Auction" event — a legendary is on auction for exactly 3 days, highest-bid-per-day wins. Creates genuine time pressure. |
| Deckbuilding with purpose | ✅ You're building toward a specific target (the set) | — |
| Satisfying when a plan comes together | ✅ Completing the set is satisfying, especially with a good grade | — |

---

**Blue Prince** ← puzzle/exploration influence

| What Blue Prince does | Set Hunter equivalent | Missing / could add |
|---|---|---|
| Exploration of a space that reveals itself | ❌ All cards are visible from the start | Could add: "Mystery Set" mode — you don't know the full set until you pull a card of each rarity |
| Hidden information drives decisions | ✅ Pack RNG is hidden — you never know what's in the next pack | — |
| Puzzle that rewards memory and pattern recognition | ✅ Market patterns reward attention over multiple days | — |

---

**Ball X Pit** ← least applicable

| What Ball X Pit does | Set Hunter equivalent | Missing / could add |
|---|---|---|
| Physics-based arcade action | ❌ No physics in Set Hunter | — |
| Immediate tactile feedback | Partially — pack opening animation provides this | Could add: pack opening mini-game. Instead of a passive animation, you tap/click at the right moment to "rip" the pack, with timing affecting card quality (rare upgrade on perfect rip) |

---

### 1g. Recommended next features (inspired by the above)

Ranked by impact vs. effort:

| Priority | Feature | Inspired by | Effort |
|---|---|---|---|
| 1 | **Post-run commentary messages** — 2–3 snarky lines from "The Market" reacting to your run stats | Q Up | 1–2 hours |
| 2 | **Collector Perks** — choose 1 of 3 random perks at run start, modifying rules (Balatro's jokers) | Balatro | 3–4 hours |
| 3 | **Persistent skill tree** — spend points earned from runs to unlock passive upgrades | Q Up | 4–6 hours |
| 4 | **Failure state** — if budget hits $0 and no duplicates to sell, show a "Bankrupt" screen instead of just... nothing | Inscryption | 1 hour |
| 5 | **Rival Collector** event — a competitor buys cards too, driving prices up | Shogun Showdown | 2–3 hours |
| 6 | **Auction event** — limited-time window to bid on a legendary | Clutchtime | 3–4 hours |
| 7 | **Mystery Set mode** — cards in the set are hidden until discovered | Blue Prince | 2–3 hours |
| 8 | **Pack mini-game** — click to rip at the right moment for a quality bonus | Ball X Pit | 2 hours |

---

### 1h. Open design questions — honest assessment + options

---

#### Music — how was it made, is the static drone intentional?

**How it works (`sounds.js` → `startAmbient()`):**
Three sine wave oscillators playing at E2 (82.4 Hz), A2 (110 Hz), and E3 (164.8 Hz) — a low power chord. A fourth oscillator (the LFO) runs at 0.12 Hz (~8 second cycle) and gently modulates the volume, creating a slow "breathing" effect. All synthesised via Web Audio API, no files.

**Is the static quality intentional?**  
Partly. The goal was a background that doesn't distract. The breathing LFO adds slight movement, but it's subtle. In practice it sounds like a low hum with a slow pulse.

**Is it good enough for the jam?** Borderline. Judges will notice there's audio, which is more than most jam entries. But it won't impress anyone.

**Options to make it better:**

| Option | Description | Effort |
|---|---|---|
| **State-reactive drone** | Pitch/tempo shifts based on game state: low, calm when budget > $100; tense minor chord when budget < $30; triumphant major when last card is found | 2 hours |
| **Occasional melody** | Every 30–60 seconds, a short 4–8 note melody plays over the drone (synthesised, same style as the victory fanfare) | 1–2 hours |
| **Day-change sting** | A very brief 2-note ascending sting each time the day advances, keeping time feel | 30 min |
| **Event stings** | Each event type has its own short 3-note jingle (Flash Sale = bright ascending, Market Crash = descending, Legendary pull = same as current) | 1–2 hours |
| **Volume control** | Add a mute/volume toggle in the HUD. Currently there is no way to turn off audio. | 30 min |

**Recommended minimum:** Add a mute button + the state-reactive drone (tense when low budget). Both are small changes with high perceived quality improvement.

---

#### Can you only sell duplicates? Can you get stuck?

**Current behaviour (code, `game.js` line 381):**
```js
if (count <= 1) {
  showToast(`Can't sell your only copy of ${name}!`, 'warning');
  return;
}
```
You can only sell a card if you own 2+ copies. The intent was to prevent players accidentally selling a card they need for the set.

**Can you get stuck?** Yes. Scenario: budget = $0, every card is unique (count = 1), cheapest single costs $1. You cannot buy, you cannot sell. The game is frozen. This is a real bug.

**Options:**

| Option | Trade-off | Verdict |
|---|---|---|
| **Allow selling last copy** (with a confirmation warning: "This will remove it from your set progress!") | Gives player full control, but they can accidentally destroy their progress | Good — add a confirm dialog |
| **"Wait a Day" button** | Advances the market and event clock without spending money. Budget stays the same, but prices shift and a new event might give a free pack or price drop. Doesn't fix $0 + no dupes, but gives something to do | **Recommended. Easy to add.** |
| **Daily allowance** | Every day start you receive a small amount ($3–5) regardless of actions. Like a passive income. Completely prevents getting stuck | Changes game balance but solves the problem cleanly |
| **Loan shark event** | A "Pawn Dealer" event offers to buy any card (including uniques) at 20% market price. Activates only when budget < $10. Emergency exit valve | Thematic, limited impact on normal play |
| **Sell at a loss** | Allow selling unique cards at a reduced rate (e.g. 20% instead of 35%) as an "emergency" option, shown separately in the market | Good UX compromise |

**Recommended:** Add a "Pass Day" button + allow selling last copy with a confirm dialog. These together fully eliminate stuck states.

---

#### Why does sell price differ from buy price?

**Current numbers:** Buy = market price. Sell = 35% of market price.

**The real-world justification:**  
This mirrors actual TCG/collectibles markets. A card shop buys at 30–40% of retail because they need margin to resell it. You are selling to a middleman (the market), not directly to another collector.

**The game design justification:**  
If sell = buy price, an arbitrage loop emerges: buy low, sell same day at same price, net zero loss but also zero gain. The spread forces the player to be deliberate — duplicates lose value the moment you open them, making efficient pack decisions matter.

**Is it clear to the player?** Not really. Currently there's no explanation. Players see a $28 card on the market and don't understand why selling their copy earns only $9.

**Options:**

| Option | Description | Effort |
|---|---|---|
| **Show both prices in market** | Add a second column: "Buy: $28 / Sell: $9" — always visible, no confusion | 30 min |
| **Tooltip explaining the spread** | Hover over sell price → "Market dealers pay 35% of retail. The spread is how they make a living." | 30 min |
| **Variable sell rate** | Sell rate starts at 35% but improves with a skill tree perk (see 1g). "Bargain Hunter" perk → 50% sell rate | Needs skill tree first |
| **Negotiation mechanic** | See below | — |

---

#### Negotiation / dynamic selling mechanic — brainstorm

**Option A: Fixed 35% (current) — keep it**  
Simple, clear, works. The issue is just communication (show both prices). Verdict: easiest fix.

**Option B: Post a listing, wait for a buyer**  
List a card at your chosen price. A "buyer" NPC appears after 1–3 days and either accepts, counter-offers, or declines. Accept/decline the counter. Simulates a real secondary market.  
- Pro: creates tension and strategy, feel of a real marketplace  
- Con: slows the game significantly. If you post 5 cards, you're waiting days for buyers to show up  
- Verdict: too slow for a jam game but excellent for a full version

**Option C: Counter-offer window**  
When you click Sell, the market makes an instant random offer between 25–55% of market price. You have one chance to accept or reject (no second chance). Adds a micro-decision to every sale.  
- Pro: easy to implement, adds tension  
- Con: can feel unfair if low rolls  
- Verdict: good medium-term addition

**Option D: Auction**  
Post a card for auction. Over the next 3 days, simulated bids arrive. Final price revealed on day 3. Could be higher or lower than market.  
- Pro: exciting, creates anticipation  
- Con: complex to implement cleanly  
- Verdict: later feature

**Recommended for now:** Keep fixed 35%, just show both prices clearly in the market list. Add counter-offer as the next sell mechanic after the core loop is polished.

---

#### Days — only through actions? What about allowance / passive progress?

**Current behaviour:**  
Days advance only when you open packs (`actionOpenPacks`) or buy a single (`actionBuySingle`). Selling does NOT advance the day (intentional — it's a free action). This means if you only sell all session, prices never change and events never fire.

**Problems this creates:**
1. No passive income → can get stuck (see above)
2. No time pressure → you can take forever optimising without consequence
3. Selling 10 duplicates in a row feels disconnected from the market clock

**Options:**

| Option | Description | Trade-off |
|---|---|---|
| **"Pass Day" button** | Manually advance 1 day: market fluctuates, event rolls, no money spent | Completely solves stuck state. Could be abused (farm events by passing days?) — minor concern |
| **Selling advances a half-day** | Every 2 sells = 1 day advance | Market stays alive during sell sessions, feels more real |
| **Daily allowance ($3/day)** | Auto-credited each time a day passes (from any cause) | Prevents stuck state, changes game balance (easier) |
| **Time limit (soft)** | No hard limit, but after day 30 the market becomes more volatile (±25% instead of ±14%) and events get more extreme | Creates urgency without hard failure |
| **Rent mechanic** | Every 7 days you must pay $5 "storage fee". Fail to pay = cards lost from collection. | Very punishing, interesting for a hard mode |

**Recommended:** Add a "Pass Day" button (1 hour of work). Consider a daily allowance of $2 to guarantee the game never freezes. Skip the time limit for now — it would require rebalancing the whole economy.

---

#### Emojis on cards during pack opening — are they visible?

**Short answer:** They should be, but there's a known reliability issue.

**How it works:**  
The Three.js card flip renders each card face as a canvas texture (`makeCardFrontTex()` in `renderer.js` line 85–88). The emoji is drawn with:
```js
cx.font = '88px serif';
cx.fillText(card.emoji, 128, 155);
```

**Why it might not show:**  
Emoji rendering on HTML Canvas depends on the system's emoji font being resolved at the time `fillText` is called. On some browsers (especially Safari on macOS), emojis in canvas require the `Apple Color Emoji` font to be explicitly in the font stack, or they fall back to a text glyph or empty space. The 3D cards are also small on screen — each card is ~160px wide at the target resolution, making the emoji ~50px, which is visible but not large.

**The multi-pack DOM reveal** (`playQuickReveal()`) uses a plain HTML `div` with `${card.emoji}` directly, so emoji rendering there is always correct (browser handles it natively).

**Options:**

| Option | Description | Effort |
|---|---|---|
| **Fix canvas font stack** | Change to `cx.font = '88px Apple Color Emoji, Segoe UI Emoji, serif'` in `makeCardFrontTex()`. Forces emoji font on all platforms | 5 min |
| **Larger cards in animation** | Reduce to 4 cards per pack reveal but scale each card up 30% — emoji more legible | 30 min |
| **Show emoji + name below canvas** | After animation ends, show a DOM row of card names+emoji above the "Collect" button as a summary | 30 min |
| **Replace canvas emoji with CSS emoji** | Render card fronts as DOM elements (not Three.js textures) positioned over the 3D canvas. Best of both worlds — 3D flip, readable emoji | 2 hours, significant refactor |

**Recommended immediate fix:** Change the font string in `renderer.js` line 85. 5 minutes, likely fixes it everywhere.

---

## 2. What the game is

**Set Hunter** is a single-player roguelike about completing a trading card set on a budget.

Each run:
- You receive **$200** and a randomly chosen card set of **20 unique cards**
- You can **open packs** (random cards, $12 each), **buy singles** on the market (exact card, variable price), or **sell duplicates** (35% of market price)
- The market fluctuates every time you take an action ("day")
- Random events shake up the economy
- Run ends when you own at least 1 copy of all 20 cards
- You are **graded S → D** based on how little money you spent total

The tension: legendaries cost $80–95 on the market and are rare in packs (~12% per pack slot). Duplicates pile up. Selling them funds targeted buys. The question is always: gamble on another pack, or just buy the single?

---

## 3. File structure

```
Cursor_VibeJam/
├── index.html      — HTML shell, layout, loads all scripts
├── style.css       — All styling (dark TCG theme, animations, card rarities)
├── game.js         — ALL game logic: card data, events, state, actions, rendering
├── renderer.js     — Three.js 3D card-flip animation + DOM multi-pack reveal
├── sounds.js       — Web Audio API: ambient drone, SFX (no external files)
├── three.min.js    — Three.js r134, bundled locally (avoids CDN issues)
├── favicon.ico     — Minimal favicon (prevents console 404 noise)
├── vercel.json     — Vercel static deployment config
└── GAME_NOTES.md   — This file
```

**No build step. No npm. No bundler.** Open `index.html` in a browser or serve with `python3 -m http.server`.

---

## 4. Game flow (step by step)

```
Page loads
  └─ Check URL params for ?portal=true
       ├─ YES → auto-start run immediately (skip title screen), show return-portal button
       └─ NO  → show intro screen ("Start Collecting" button)

User clicks Start
  └─ Sounds.init() — starts Web Audio context + ambient drone
  └─ Pick one of 4 card sets at random
  └─ createState() — budget=$200, day=1, empty collection
  └─ fluctuateMarket() × 2 — initial price randomisation
  └─ Render: HUD, Shop, Collection grid, Market list

─── MAIN LOOP (repeats each player action) ───────────────────────────

  Player chooses one of:

  A) Open Pack(s)  [game.js: actionOpenPacks(n)]
     ├─ Calculate cost: packCost × packDiscount × (n - freePacks)
     ├─ If budget insufficient → toast error, return
     ├─ Deduct budget, increment packsOpened
     ├─ generateOnePack() × n  →  5 cards per pack (see §6 for odds)
     ├─ If n=1   → PackRenderer.playAnimation()   (Three.js 3D card flip)
     │             Fallback: DOM reveal if Three.js unavailable
     ├─ If n>1   → PackRenderer.playQuickReveal() (DOM grid, staggered pop-in)
     ├─ On "Collect" click: add cards to G.collection (Map<cardId, count>)
     └─ advanceDay()

  B) Buy Single  [game.js: actionBuySingle(cardId)]
     ├─ If budget < market price → toast error, return
     ├─ Deduct budget, increment singlesBought
     ├─ G.collection.set(cardId, count + 1)
     └─ advanceDay()

  C) Sell Duplicate  [game.js: actionSellSingle(cardId)]
     ├─ If count ≤ 1 → toast error (can't sell last copy)
     ├─ G.collection.set(cardId, count - 1)
     ├─ budget += sellPrice (35% of market price)
     └─ renderAll() — NO day advance (selling is free action)

  advanceDay():
    ├─ G.day++
    ├─ fluctuateMarket()   — prices drift ±14%, anchored to basePrice
    ├─ rollEvent()         — 28% chance of one of 6 events (see §5)
    └─ Re-render HUD, Shop, Market

  After each action:
    └─ checkCompletion()
         └─ If all 20 cards owned → showComplete() after 600ms delay

─── RUN COMPLETE ──────────────────────────────────────────────────────

  showComplete()
    ├─ Calculate grade (S/A/B/C/D) from G.totalSpent
    ├─ Play victory fanfare (sounds.js)
    └─ Show: grade, total spent, days, packs opened, singles bought,
             total earned from selling dupes, net cost

  Player can: "New Run" (resets all state, picks new set)
           or "Vibe Jam Portal" (redirects to vibej.am/portal/2026)
```

---

## 5. All card data

**Location:** `game.js` lines 10–126  
**Format:** plain JS objects inside `CARD_SETS` array

```js
{ id: 'd_fire', name: 'Fire Drake', emoji: '🔥', rarity: 'common', flavor: '...', basePrice: 2 }
```

| Set | Theme | Commons | Uncommons | Rares | Legendaries |
|---|---|---|---|---|---|
| Dragons of the Realm | 🐉 | Fire/Stone/River/Wind/Shadow/Forest/Ice/Sand Drake | Wyvern, Sea Serpent, Frost Wyrm, Lava Drake, Storm Drake, Jungle Serpent | Ancient Dragon, Dragon Queen, Elder Wyrm, Crystal Dragon | World Eater, Primordial Flame |
| Space Explorers | 🚀 | Space Rat, Star Miner, Cargo Hauler, Scout Probe, Station Guard, Fuel Tech, Navigator, Medic Bot | Bounty Hunter, Alien Diplomat, Chief Engineer, Pilot Ace, Hacker, Smuggler | Admiral, Void Walker, Q. Physicist, AI Commander | Galaxy God, Singularity |
| Ancient Forest | 🌳 | Field Mouse, Sparrow, Forest Frog, Giant Mushroom, Hedgehog, Oak Sprite, River Otter, Crow | Forest Wolf, White Stag, Cave Bear, Red-Tail Hawk, Cunning Fox, Wild Boar | Ancient Treant, Forest Unicorn, Phoenix Chick, Owl Sage | World Tree, Forest Spirit |
| Neon City | 🌆 | Street Rat, Delivery Drone, Noodle Vendor, Beat Cop, Graffiti Artist, Taxi Driver, Subway Busker, Med-Tech | The Fixer, Corp Spy, Netrunner, Ripper Doc, Street Samurai, Glitch Witch | Crime Lord, Ghost Operative, AI Overseer, Chrome Angel | Megacorp CEO, THE GLITCH |

**Base prices by rarity:**
- Common: $1–3
- Uncommon: $5–8
- Rare: $20–28
- Legendary: $80–95

Market prices drift from these bases each day.

---

## 6. All events

**Location:** `game.js` lines 128–196  
**Chance per day:** 28% (one event max per day, previous event removed first)

| ID | Icon | Effect | Duration |
|---|---|---|---|
| `flash_sale` | ⚡ | Pack cost −30% | Until next day's event roll |
| `market_crash` | 📉 | All singles prices −35% | Permanent (prices stay until natural drift) |
| `hype_spike` | 📈 | One missing card goes 3× price | Until next day's event roll |
| `lucky_packs` | 🍀 | Legendary drop chance doubled | Until next day's event roll |
| `free_pack` | 🎁 | +1 free pack added to inventory | Permanent (consumed when next pack is opened) |
| `fair` | 🎪 | All Rare & Legendary cards −25% | Permanent (prices stay) |

**Hype Spike** targets a card you don't own yet (if any), making it deliberately painful.

---

## 7. Economy & numbers

**Starting budget:** $200  
**Pack cost:** $12 (before any discount)  
**Sell rate:** 35% of current market price (minimum $1)

### Pack odds (per pack, 5 cards total)

| Slot | Normal | With Lucky Packs event |
|---|---|---|
| Slots 1–3 | 100% Common | 100% Common |
| Slot 4 | 87% Uncommon / 10% Rare / 3% Legendary | 74% Uncommon / 18% Rare / 6% Legendary |
| Slot 5 | 88% Rare / 12% Legendary | 78% Rare / 22% Legendary |

### Expected cost to complete a set (no events, pure packs)
- Commons: need 8 unique from 8, ~7 packs via coupon-collector
- Uncommons: ~9 packs for 6 unique
- Rares: ~12 packs for 4 unique
- **Legendaries: ~25+ packs for both** ← bottleneck
- At 25 packs × $12 = **$300** in packs alone, but duplicate sales offset ~$80–100
- Net: roughly $200–250 to complete purely via packs
- Hybrid strategy (packs + targeted singles) = $130–180 → grades A or S

### Market drift formula (`fluctuateMarket()`)
```
pull  = (basePrice - currentPrice) × 0.10   // gravitates toward base
noise = (random - 0.48) × currentPrice × 0.14
newPrice = max(1, round(currentPrice + pull + noise))
```
Slightly biased upward (0.48 instead of 0.50) so prices tend to creep up over time.

---

## 8. Scoring

**Based entirely on `G.totalSpent` (gross spending, before sell income).**

| Grade | Condition | Meaning |
|---|---|---|
| S | ≤ $120 | Near-perfect efficiency. Almost impossible without lucky pulls + sell timing. |
| A | $121–175 | Expert play. Mostly targeted singles for expensive cards. |
| B | $176–255 | Solid hybrid strategy. |
| C | $256–370 | Heavy pack gambling with some singles. |
| D | > $370 | Opened packs until the money ran out. |

The completion screen also shows: days taken, packs opened, singles bought, and net cost (spent minus earned from sells).

**Scores are NOT saved** between sessions (no localStorage). This is a future improvement.

---

## 9. What is implemented

| Feature | Status | Location |
|---|---|---|
| 4 distinct card sets, 20 cards each | ✅ Done | `game.js` CARD_SETS |
| Random set selection each run | ✅ Done | `game.js` startRun() |
| Pack opening with 5-card RNG | ✅ Done | `game.js` generateOnePack() |
| Three.js 3D card flip animation (single pack) | ✅ Done | `renderer.js` playAnimation() |
| DOM grid quick-reveal (3+ packs) | ✅ Done | `renderer.js` playQuickReveal() |
| Skip button for animation | ✅ Done | renderer.js, skip flag |
| Fallback if Three.js fails | ✅ Done | renderer.js playAnimation() |
| Market with fluctuating prices | ✅ Done | `game.js` fluctuateMarket() |
| Market trend indicators (▲▼—) | ✅ Done | `game.js` renderMarket() |
| Buy singles from market | ✅ Done | `game.js` actionBuySingle() |
| Sell duplicates (keeps last copy) | ✅ Done | `game.js` actionSellSingle() |
| 6 random events | ✅ Done | `game.js` EVENTS + rollEvent() |
| Event banner display | ✅ Done | `game.js` showEventBanner() |
| Collection grid with rarity styling | ✅ Done | `game.js` renderCollection() |
| Rarity progress bars (C/U/R/L) | ✅ Done | `game.js` renderRarityBars() |
| Filter tabs (All / Missing / Dupes) | ✅ Done | `game.js` ACTIVE.filter |
| Market sort (Rarity / Price / Missing first) | ✅ Done | `game.js` ACTIVE.sort |
| Card tooltip on hover | ✅ Done | `game.js` showTooltip() |
| S/A/B/C/D grade on completion | ✅ Done | `game.js` getGrade() |
| Completion screen with stats breakdown | ✅ Done | `game.js` showComplete() |
| Procedural card art (canvas textures) | ✅ Done | `renderer.js` makeCardFrontTex() |
| Pack box 3D art (canvas texture) | ✅ Done | `renderer.js` makePackTex() |
| Card back texture | ✅ Done | `renderer.js` makeCardBackTex() |
| Ambient background drone (Web Audio) | ✅ Done | `sounds.js` startAmbient() |
| Pack rip SFX | ✅ Done | `sounds.js` playPackOpen() |
| Card flip SFX | ✅ Done | `sounds.js` playCardFlip() |
| Legendary reveal chord | ✅ Done | `sounds.js` playLegendary() |
| Coin SFX (buy/sell) | ✅ Done | `sounds.js` playCoin() |
| Error SFX (can't afford) | ✅ Done | `sounds.js` playNegative() |
| Victory fanfare | ✅ Done | `sounds.js` playComplete() |
| Toast notifications | ✅ Done | `game.js` showToast() |
| HUD (budget, spent, progress, day) | ✅ Done | `game.js` renderHUD() |
| Budget flash on buy/sell | ✅ Done | CSS flash-up/flash-down |
| Vibe Jam widget.js (mandatory) | ✅ Done | `index.html` line 8 |
| Vibe Jam Portal exit button | ✅ Done | `game.js` setupPortal() |
| Portal return button if arrived via portal | ✅ Done | `game.js` setupPortal() |
| Auto-start if arriving via portal | ✅ Done | `game.js` setupListeners() |
| Favicon (no console 404 errors) | ✅ Done | `favicon.ico` |
| Deployed to Vercel | ✅ Done | https://pack-rat-game.vercel.app |

---

## 10. What is NOT yet implemented (future work)

These are real improvements worth adding before May 1 deadline, roughly in priority order:

### High priority

| Feature | Why | How to add |
|---|---|---|
| **Local high score / best run** | Players have no reason to replay without it | `localStorage.setItem('setHunterBestRun', JSON.stringify({spent, grade, day}))` in showComplete() |
| **Card count badge in market** | Hard to see quickly what you already own | Add owned count next to buy button in renderMarket() |
| **"Sell all duplicates" button** | Very tedious to sell one at a time | Loop over collection, sell all with count > 1 |
| **Custom domain** | Widget tracks by domain; the current Vercel URL is temporary | Add domain in Vercel project settings → also required for portal tracking |
| **Mobile layout** | Game is 3-column desktop only; breaks on phones | CSS media query, stack panels vertically |

### Medium priority

| Feature | Why | How to add |
|---|---|---|
| **Actual AI-generated card images** | More visual appeal for judges | Generate via Midjourney/DALL-E, save as small WebP, reference in card data as `imageUrl` field, draw in makeCardFrontTex() |
| **Run history (last 5 runs)** | Adds roguelike depth | Store in localStorage as a rolling array |
| **"Pity system"** | Real TCGs guarantee a legendary every N packs | Add counter to state; if packsOpened % 20 === 0, force legendary in slot 5 |
| **Animated legendary reveal** | Currently legendary uses same card flip, should feel more special | Add particle burst + camera shake in renderer.js when rarity === 'legendary' |
| **Market graph** | Show price history of a card over last 10 days | Store price history array per card in state, render sparkline on tooltip |
| **Pack opening sound per rarity** | Currently all flips sound the same (except legendary) | Add separate sounds for rare vs common flip in sounds.js |
| **Set completion percentage on intro** | Show "Dragons: 65%" if you've played before | Pull from localStorage high score |

### Nice to have / polish

| Feature | Why |
|---|---|
| Background music that changes with events | Flash Sale could play upbeat music, Market Crash plays tense music |
| Card shake animation when you already have 5 copies | Comic frustration feedback |
| "New card!" badge on first copy obtained | Visual satisfaction |
| Keyboard shortcuts (Space = open pack, B = buy cheapest missing) | Power user QoL |
| Tutorial overlay on first run | First-time players may not understand sell mechanic |
| Accessibility: ARIA labels, focus management | Good practice |

---

## 11. How to change things

### Add a new card set

In `game.js`, add a new object to the `CARD_SETS` array following this template:

```js
{
  id: 'mythic',          // unique id, no spaces
  name: 'Mythic Beasts', // display name
  theme: '🦁',           // single emoji shown in HUD
  cards: [
    // 8 commons  (basePrice: 1–3)
    // 6 uncommons (basePrice: 5–8)
    // 4 rares     (basePrice: 20–28)
    // 2 legendaries (basePrice: 80–95)
    { id: 'mb_lion', name: 'Lion', emoji: '🦁', rarity: 'common', flavor: 'King of the plains.', basePrice: 2 },
    // ...
  ],
},
```

The game will automatically include it in the random selection pool.

### Change pack cost or starting budget

In `game.js` `createState()`:

```js
budget:   200,   // ← starting money
packCost: 12,    // ← base pack cost (before discount events)
```

### Change event probability

In `game.js` `rollEvent()`:

```js
if (Math.random() > 0.28) return;  // ← 28% chance; increase for more events
```

### Change sell rate

In `game.js`:

```js
function sellPrice(id) { return Math.max(1, Math.round(marketPrice(id) * 0.35)); }
//                                                                           ^^^^
//                                                      change 0.35 to make selling more/less lucrative
```

### Change grade thresholds

In `game.js` `getGrade()`:

```js
function getGrade(spent) {
  if (spent <= 120) return 'S';
  if (spent <= 175) return 'A';
  if (spent <= 255) return 'B';
  if (spent <= 370) return 'C';
  return 'D';
}
```

### Change pack odds

In `game.js` `generateOnePack()`:

```js
const legChance  = G.luckyPacks ? 0.06 : 0.03;   // 3% legendary in uncommon slot
const rareChance = G.luckyPacks ? 0.18 : 0.10;   // 10% rare upgrade in uncommon slot
const legUpgrade = G.luckyPacks ? 0.22 : 0.12;   // 12% legendary in rare slot
```

### Add a new event

In `game.js` `EVENTS` array:

```js
{
  id: 'double_sell',
  icon: '💰',
  title: 'Seller\'s Market!',
  buildDesc: () => 'Sell price doubled today!',
  apply(G)  { G.sellMultiplier = 2.0; },
  remove(G) { G.sellMultiplier = 1.0; },
},
```

Then update `sellPrice()` to read `G.sellMultiplier`.

### Redeploy after changes

```bash
cd /Users/guygirmonsky/Cursor_VibeJam
vercel --prod --yes
```

---

## 12. Vibe Jam submission checklist

- [x] Widget script in HTML: `<script async src="https://vibej.am/2026/widget.js"></script>`
- [x] Game playable without login or signup
- [x] No loading screen (instant load, ~620 KB total)
- [x] New game (created April 2026)
- [x] Portal exit button implemented
- [x] Auto-start on portal arrival (no title screen delay)
- [x] Return portal shown when arriving from another game
- [x] Deployed to public URL
- [ ] **Submit at vibej.am/2026 → Submit Your Game** ← needs to be done manually
- [ ] Add a custom domain for better portal tracking (optional but recommended)

**Submit URL:** `https://set-hunter-game.vercel.app`

---

## 13. Deployment

**Platform:** Vercel (account: `guygir`)  
**Project:** `guygirs-projects/pack-rat-game`  
**Production URL:** `https://pack-rat-game.vercel.app`  
**Dashboard:** `https://vercel.com/guygirs-projects/pack-rat-game`

To redeploy after any code change:

```bash
cd /Users/guygirmonsky/Cursor_VibeJam
vercel --prod --yes
```

To add a custom domain: Vercel dashboard → project → Settings → Domains.

---

*Last updated: April 2026*
