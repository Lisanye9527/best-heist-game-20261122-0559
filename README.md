# The Gilded Vault

An original top-down stealth heist game for desktop browsers, built for the
[make.fun](https://make.fun/bounty/best-heist-game-20261122-0559) "best heist
game" bounty. One thief, one diamond, and every eye in the house watching.

## The job

Slip across the bank floor unseen, lift the **Aurora Diamond** out of the
vault at the top of the floor, and walk it back down to the getaway van at
the south doors. Guards patrol with vision cones and cameras sweep theirs;
desks, pillars, planters and display cases are the only things between you
and a filled alarm meter. Let the meter fill — or let a guard lay a hand on
you — and the night ends busted. Cash, gold bars and paintings along the way
are optional greed, and they count: so do a ghost bonus for staying unseen
and a time bonus for a fast getaway.

## Controls

- **WASD / arrow keys** — move
- **Shift** — tiptoe: slower, but the alarm fills at half rate while you are seen
- **E (hold)** — lift the loot you are standing beside
- **Mouse click** — toss a coin decoy (you carry three); nearby guards leave
  their rounds to investigate where it lands
- **P / Esc** — pause · **Enter** — begin / play again

Three ways in: the grand hall straight up the middle, the west offices and
records room, or the east gallery and security office — the office corridor
has its own door into the vault, and its own camera watching it.

## Running it

Plain static files under `game/` — no build step, no network requests.
Serve the folder with any static server, for example from this repository:

```
node serve.ts          # then open http://localhost:8080
```

## Layout

- `game/index.html` — the page
- `game/src/tuning.js` — every tunable number: speeds, cones, alarm, scoring, palette
- `game/src/bank.js` — the floor plan: walls, cover, loot spots, patrols, cameras, the van
- `game/src/sight.js` — vision cones, line of sight, turning
- `game/src/controls.js` — keyboard and mouse state
- `game/src/audio.js` — WebAudio-synthesised effects (no audio files)
- `game/src/simulation.js` — the world: movement, guard AI, cameras, alarm, loot, coins
- `game/src/painter.js` — all drawing: floor, cones, people, HUD, title and end screens
- `game/src/scenes.js` — the staged screenshot scenes (`?shot=play`, `?shot=busted`, …)
- `game/src/boot.js` — boot and the game loop
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the
  output and writes `dossier.json` with the vendored make.fun library
- `serve.ts` — a tiny static server for local play (`node serve.ts`)
- `shots.json` — which `?shot=` scene each screenshot was staged from
- `screenshots/` — four screenshots of the game itself; `1-play.jpg` is the cover

## License

MIT — see `LICENSE`.
