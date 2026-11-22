// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps, and the renderer paints what is there. The game moves between four screens:
// title, play, paused and over. Behind the title the floor goes about its business, so
// the patrols and camera sweeps can be read before the first step is taken.
//
// ?seed=N fixes the night's small variations. ?shot=start|play|busted|getaway (with
// &seed=N) stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_ALARM,
  EVENT_BUSTED,
  EVENT_COIN,
  EVENT_DIAMOND,
  EVENT_ESCAPED,
  EVENT_GRABBED,
  EVENT_SPOTTED,
} from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createSound } from './sound.js';
import { stageShot } from './shots.js';

const BEST_KEY = 'gilded-vault-best';
const MAX_FRAME = 0.25;
const IDLE = { mx: 0, my: 0, sneak: false, grab: false, coin: null };

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const sound = createSound();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best haul then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  // Two paints: the first warms the canvas up, the second is the frame the screenshot
  // takes, so fonts and gradients are settled before the shutter.
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let wasExposed = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    input.takeCoinPoint(); // the click that began the game is not a coin toss
    accumulator = 0;
    wasExposed = false;
    screen = SCREEN_PLAY;
    announce('The heist begins. Lift the Aurora Diamond and get back to the van.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(
      world.state.won
        ? `Clean getaway. Total haul $${world.state.score}.`
        : `Busted. The night ends with $${world.state.score}.`,
    );
  }

  function handleEvents(events) {
    if (events & EVENT_COIN) sound.coin();
    if (events & EVENT_DIAMOND) sound.diamond();
    else if (events & EVENT_GRABBED) sound.grab();
    if (events & EVENT_SPOTTED && !wasExposed) sound.spotted();
    wasExposed = world.state.exposure > 0;
    if (events & EVENT_BUSTED) {
      sound.busted();
      endGame();
    } else if (events & EVENT_ALARM) {
      sound.alarm();
      endGame();
    } else if (events & EVENT_ESCAPED) {
      sound.win();
      endGame();
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) sound.unlock();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function stepOnce() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, IDLE); // the floor patrols behind the title
      if (world.state.over) world.reset(); // a demo night that ends simply starts over
      return;
    }
    const dir = input.direction();
    const events = world.step(STEP, {
      mx: dir.x,
      my: dir.y,
      sneak: input.sneaking(),
      grab: input.grabbing(),
      coin: input.takeCoinPoint(),
    });
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        stepOnce();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Gilded Vault. Press Enter or click to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
