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
  js/data.js   EVERYTHING tunable - rows, managers, chests, tasks, deals
  js/state.js  the save file and how it loads
  js/engine.js the rules: cycles, assigning, stars, chests, time away
  js/ui.js     the three screens
  js/main.js   sound, the clock, boot
serve.js       a static server with no dependencies
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
| hired (Lv1) | a card out of a chest | 3.0s -> 1.5s |
| Lv2 | ⭐ 100 + 🃏 10 | 1.5s -> 0.75s |
| Lv3 | ⭐ 200 + 🃏 20 | 0.75s -> 0.38s |
| Lv4 | ⭐ 400 + 🃏 40 | 0.38s -> INSTANT |
| Lv5 | ⭐ 800 + 🃏 80 | ... |

Cards are per manager and come only out of chests. The first card of a
manager hires them instead of sitting in the pile.

### Stars

Nothing on screen promises stars. Every x10 raccoons on a pile — 10, 100,
1,000, 10,000 — drops 1, 2, 4, 8 of them **onto the pile**, and they sit there
glinting until you tap it. The count under each pile fills up towards its next
checkpoint.

### Tasks and chests

Three tasks share one band across the top, each with its own chest. Finish one
and its chest starts shaking; open it and that slot deals the next task, so
the loop never dries up.

A **Simple Chest** rolls 40-60 ⭐ and 6-12 🃏 spread across the managers whose
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
| `CHESTS` | what each kind of chest rolls |
| `MISSIONS` | the task ladder and which chests grant which manager |
| `TRADES` | the Den deals |

A new row is an entry in `TIERS`, a manager for it in `MANAGERS`, and a task
with `grant: '<manager id>'` in `MISSIONS`. The screens build themselves from
those tables.

## Roadmap

- onboarding for the first few taps
- managers that multiply what a raccoon brings back, not just the speed
- zone 2 with its own currency, sharing the same raccoons
- a prestige pass: start the zone over, managers keep their levels
- real art instead of emoji
- Android packaging with Capacitor, the way Wobbly Raccoon does it
