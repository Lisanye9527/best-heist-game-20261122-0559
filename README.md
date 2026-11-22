# The Gilded Vault — a tiny heist

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Lisanye9527/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Lisanye9527/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

An original top-down stealth heist game for desktop browsers, built for the
[make.fun](https://make.fun/bounty/best-heist-game-20261122-0559) "best heist game" bounty.
One thief, one diamond, every eye in the house.

## The job

Cross the bank floor unseen, lift the **Aurora Diamond** from the vault at the top of the
floor, and get back to the getaway van at the south doors. Guards patrol with vision cones
and cameras sweep theirs; desks, pillars, planters and display cases are cover — break a
gaze and the **alarm meter** drains, let it fill (or let a guard lay a hand on you) and the
night is over. Side loot — cash, gold bars, paintings — is optional greed, priced into the
final score alongside ghost and time bonuses.

## Controls

- **WASD / arrow keys** — move
- **Shift** — tiptoe: slower, but the alarm fills at half rate while you are seen
- **E (hold)** — lift the loot you are standing beside
- **Mouse click** — toss a coin decoy: guards nearby leave their rounds to look at it
  (you carry three)
- **P / Esc** — pause · **Enter** — begin / play again

Three ways in: the grand hall straight up the middle, the west offices and records room,
or the east gallery and security office (which has its own door into the vault).

## Running it

The game is plain static files under `game/` — no build step, no network requests. Serve
the folder with any static server, e.g. from this repository:

```
node serve.ts          # then open http://localhost:8080
```

## Layout

- `game/index.html` — the page
- `game/src/config.js` — every tunable number: speeds, cones, the alarm, scoring, colours
- `game/src/levels.js` — the floor plan (drawn as text), patrols, cameras, loot
- `game/src/vision.js` — cone and line-of-sight geometry
- `game/src/world.js` — the simulation: movement, guard AI, cameras, alarm, loot, decoys
- `game/src/render.js` — all drawing, including the HUD and the title/end screens
- `game/src/input.js` — keyboard and mouse
- `game/src/sound.js` — WebAudio-synthesised effects (no audio files)
- `game/src/shots.js` — the deterministic screenshot scenes (`?shot=play&seed=7`, …)
- `game/src/main.js` — boot and the game loop
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output and
  writes `dossier.json` with the vendored make.fun library
- `serve.ts` — a tiny static server for local play (`node serve.ts`)
- `shots.json` — which `?shot=` scene each screenshot was staged from, all at seed 7
- `screenshots/` — four screenshots of the game itself; `1-play.jpg` is the cover

## License

MIT — see `LICENSE`.
