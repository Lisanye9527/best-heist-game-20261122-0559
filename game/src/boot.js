// boot.js — entry point: creates the world, owns the loop, owns the keys
// that change screens. Everything else is a module this file wires together.
//
// Flow: title -> Enter -> playing -> (P/Esc) paused -> (P/Esc) playing ->
// busted | win -> Enter -> playing again. A `?shot=` query freezes the
// world in a staged scene for screenshots instead of starting the loop's
// simulation.

import { VIEW_W, VIEW_H } from './tuning.js';
import { makeWorld, step, startNight } from './simulation.js';
import { makeControls } from './controls.js';
import { makeAudio } from './audio.js';
import { drawWorld } from './painter.js';
import { stageShot } from './scenes.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const world = makeWorld();
const controls = makeControls();
controls.attach(canvas);
const audio = makeAudio();

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const frozen = shot !== null && shot !== '';
if (frozen) {
  stageShot(world, shot);
}

// Unlock audio on the first gesture, whatever it is.
window.addEventListener('keydown', () => audio.unlock(), { once: true });
canvas.addEventListener('mousedown', () => audio.unlock(), { once: true });

function handleScreenKeys() {
  if (controls.wasPressed('Enter')) {
    audio.unlock();
    if (world.state === 'title' || world.state === 'busted' || world.state === 'win') {
      startNight(world);
    }
  }
  if (controls.wasPressed('KeyP') || controls.wasPressed('Escape')) {
    if (world.state === 'playing') {
      world.state = 'paused';
      audio.pause();
    } else if (world.state === 'paused') {
      world.state = 'playing';
    }
  }
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!frozen) {
    handleScreenKeys();
    step(world, controls, dt, audio);
    controls.endFrame();
  }
  drawWorld(ctx, world);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
