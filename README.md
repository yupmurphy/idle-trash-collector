# Tato Trash Empire

An idle game from **Moonlit Tato**: Tato the raccoon works the alley, and a
pile of plastic bags slowly turns into an empire.

Plain HTML, CSS and JavaScript. No framework, no build step, no runtime
dependencies.

## Play it

```
node serve.js
```

Then open <http://localhost:8140>. `docs/index.html` also runs straight off
disk, but the service worker (offline play) only registers over http.

## How it is put together

```
docs/          the whole game - named "docs" because GitHub Pages publishes
               only from the repository root or a folder with that exact name
  index.html   the page shell
  style.css    all of the look
  js/format.js big numbers: K, M, B, T, AA, AB ... ZZ, AAA
  js/data.js   EVERYTHING tunable - rows, managers, packs, tasks, deals
  js/state.js  the save file and how it loads
  js/engine.js the rules: cycles, assigning, stars, packs, time away
  js/ui.js     the three screens
  js/main.js   sound, the clock, boot
serve.js       a static server with no dependencies
tools/sim.js   plays the game headless and times each rank
```

`ui.js` builds its nodes once and then only rewrites text and bar widths.
Rebuilding the rows fifteen times a second would kill the tap animation and
the scroll position.

## How the game works

### The chain

Only the bag pile turns into plastic. Every row above it brings back
**raccoons for the row below** — a straw raccoon comes home dragging a new bag
raccoon with it.

```
Canisters -> Bottles -> Straws -> Bags -> Plastic
```

That compounding is the engine of the whole thing. Nobody is hand-buying a
hundred thousand raccoons one at a time.

### Rows

A row is a pile of trash with raccoons assigned to it. Every cycle the
assigned raccoons bring back their haul:

```
haul per cycle = raccoons on the pile x value
cycle time     = base / 2^(manager level)
```

| row | brings back | per raccoon, per cycle | cycle by hand | one more raccoon costs | opens at |
| --- | --- | --- | --- | --- | --- |
| 🛍️ Plastic Bags | ♻️ plastic | 5 | 3.0s | 🦝 1 + ♻️ 10 | — |
| 🥤 Plastic Straws | 🛍️ bag raccoons | 8 | 5.0s | 🦝 1 + ♻️ 10 K | 100 raccoons on bags |
| 🍾 Plastic Bottles | 🥤 straw raccoons | 8 | 8.0s | 🦝 1 + ♻️ 1 M | 5,000 raccoons on straws |
| 🧴 Plastic Canisters | 🍾 bottle raccoons | 8 | 10.0s | 🦝 1 + ♻️ 100 M | 100,000 raccoons on bottles |

How many you buy at once is one button under the plastic box, cycling
**x1 -> 10% -> 50% -> MAX**. The two middle steps are fractions of what you
can currently afford, not fixed counts: the same button has to work on a pile
that takes eight raccoons and on one that takes eight million.

A row's threshold is read on the **previous** product, and a row always opens
with one raccoon already on it. Prices are flat — the limit is how fast
raccoons arrive, not an escalating price tag.

The number on the right of a row is what lands when the bar fills, not a rate:
a per-second figure means nothing while you are watching a bar crawl. Once a
cycle drops under `CFG.instantBelow` (0.2s) the bar stops sweeping, reads
**INSTANT**, and the row switches to showing output per second.

### Raccoons

Raccoons are the workforce and the currency: one per assignment, and they do
not come back. They arrive on their own at `CFG.ratoniBase` per second, and
the only way to raise that is the **Scrap Deal** in the Den — every step is a
flat +1/sec, and the price is what climbs (♻️ 500, then x100 each time). The
Den tab lights up when you can afford the next one.

### Managers

Managers are raccoons: Tato, Grumpy, Scary and Fancy, one per row. Hiring one
**automates the row and halves its cycle on the spot**; every level after that
halves it again.

| level | costs | bags go from |
| --- | --- | --- |
| hired (Lv1) | a card out of a pack  | 3.0s -> 1.5s |
| Lv2 | ⭐ 100 + 🃏 10 | 1.5s -> 0.75s |
| Lv3 | ⭐ 200 + 🃏 20 | 0.75s -> 0.38s |
| Lv4 | ⭐ 400 + 🃏 40 | 0.38s -> INSTANT |
| Lv5 | ⭐ 800 + 🃏 80 | ... |

Cards are per manager and come only out of packs. The first card of a
manager hires them instead of sitting in the pile.

### Stars

Nothing on screen promises stars. Every x10 raccoons on a pile — 10, 100,
1,000, 10,000 — drops 1, 2, 4, 8 of them **onto the pile**, and they sit there
glinting until you tap it. The count under each pile fills up towards its next
checkpoint.

### Tasks and packs

Three tasks share one band across the top. While a task is running, its cell
shows where the work happens — the pile to load, the managers page, the
currency the number comes out of — with the wording and a progress bar under
it. Finish it and the **whole cell** turns into the pack you won, captioned
CLICK TO CLAIM. Tear it open and that slot deals the next task, so the loop
never dries up.

A **Simple Pack** rolls 40-60 ⭐ and 6-12 🃏 spread across the managers whose
rows are open. Some tasks also guarantee a specific manager, which is how you
meet each new raccoon right as their row unlocks.

### Time away

Piles with a manager keep working while the game is closed, up to
`CFG.offlineHours`. A pile you were tapping by hand sits exactly as you left
it. Progress is saved to `localStorage` every few seconds.

## What to tune, and where

Everything lives in `docs/js/data.js`.

| value | what it does |
| --- | --- |
| `TIERS[].value` | units one raccoon brings back per cycle |
| `TIERS[].cycleBase` | seconds for one collection, by hand |
| `TIERS[].cost` | flat price of one more raccoon on that row |
| `TIERS[].unlockAt` | raccoons needed on the row above |
| `CFG.instantBelow` | when a cycle stops being drawn and reads INSTANT |
| `CFG.ratoniBase` | raccoons per second before any deal |
| `CFG.offlineHours` | how much time away is paid out |
| `starThreshold` / `starReward` | the silent star checkpoints |
| `starsForLevel` / `cardsForLevel` | what a manager level costs |
| `PACKS` | what each kind of pack rolls |
| `MISSIONS` | the task ladder and which packs grant which manager |
| `MISSIONS[].type` | `plastic` `assign` `collect` `stars` `manager` `unlock` |
| `TRADES` | the Den deals |
| `LEVELS.taskScalePerLevel` | how fast plastic targets grow per level |
| `LEVELS.assignScalePerLevel` | how fast raccoon targets grow per level |
| `LEVELS.slotsBase` / `slotsPerLevel` | packs needed to fill the rank bar |

A new row is an entry in `TIERS`, a manager for it in `MANAGERS`, and a task
with `grant: '<manager id>'` in `MISSIONS`. The screens build themselves from
those tables.

`MISSIONS` can only be as long as `slotsMax + extraTasks`; anything past that
index is never dealt. Appending a task means raising `slotsMax` too.

## How long a level takes

Do not tune difficulty by eye. A mission target is a number of plastic or
raccoons, and how long that takes depends on the whole compounding chain
underneath it — so the only way to know is to play it.

```
node tools/sim.js 6
```

That runs the real `data.js` and `engine.js` headless, plays them with a fixed
policy, and prints what each rank actually took against what it is aiming for.
`--tasks` adds every task and its gap, which is how you find the one task a
level is really waiting on. `--scale=` and `--assign=` override the two
difficulty dials for a single run, so a pair can be swept without editing
anything.

The times are only as honest as the policy at the top of the file: it taps
everything, always spends on the deepest row it can afford, and upgrades a
manager the moment it can. A real player is slower than this, not faster.

### The shape of the curve, and its ceiling

**A level is only ever as long as its deepest required task.** Every row below
the deepest open one is refilled for free by the row above it, so a target on a
shallow row stops costing anything the moment the chain is running.

That puts a hard ceiling on what tuning can do here. Zone 1 has four rows, so
it has about four difficulty rungs — and they are not evenly spaced. Whatever
the dials are set to, ranks 1 to 5 all finish in roughly eight to nine minutes;
then the scaling finally outruns the engine and rank 6 jumps to hours. A smooth
10 / 30 / 45 / 60 minute curve cannot be cut out of four rows.

So the ladder is tuned for **what each rank opens** rather than how long it
lasts, which is a thing four rows can actually express:

| rank | what it is about |
| --- | --- |
| 1 | bags, and the first straws |
| 2 | straws, deeper — the bottle pile stays shut |
| 3 | **the bottles open**, and you get your first hundred |
| 4 | bottles get deep |
| 5 | **the canisters open** |

Both straw targets before rank 3 stay under the bottle row's 5 K unlock even
after two rounds of scaling, so opening that pile really is an event rather
than something that already happened three tasks earlier.

Getting the *lengths* right needs more rungs, which means more rows — a second
zone, not a bigger multiplier.

## Art

Two sources, and they do not mix.

The six manager portraits are drawn images in `docs/art/`, one PNG per
manager, named after its id. Everything else - the round trash icons, the nav
icons, the packs, and the whole card around the portrait - is inline SVG
built in `docs/js/art.js` and `docs/js/cards.js`. Nothing is loaded from a
CDN and there is still no build step.

A portrait comes off a character sheet: all six generated in one image, so
they read as one hand, then cut apart by `tools/cut-sheet.ps1`. The script
labels connected shapes, gives each character the props nearest to it, and
floods the background away from the crop border inward - which is what keeps
the eye whites, since they are enclosed by the outline, while dropping the
soft contact shadow, which is not.

Names and effect lines are SVG text over the image, never baked into it, so
they stay sharp at any size and can be reworded without new art.

## Roadmap

- onboarding for the first few taps
- managers that multiply what a raccoon brings back, not just the speed
- zone 2 with its own currency, sharing the same raccoons
- a prestige pass: start the zone over, managers keep their levels
- art for the trash rows, to match the manager portraits
- Android packaging with Capacitor, the way Wobbly Raccoon does it
