// controls.js — keyboard and mouse state, nothing else.
//
// The game reads this module once a frame; it never listens to the DOM
// itself. Keys are tracked by their `code` so WASD and arrows work on any
// layout, and a mouse click is translated into canvas pixels here, because
// the canvas is shown scaled by CSS.

import { VIEW_W, VIEW_H } from './tuning.js';

export function makeControls() {
  const keys = new Set();
  const state = {
    keys,
    // Last click, in canvas pixels, plus a flag the game consumes once.
    clickX: 0,
    clickY: 0,
    clicked: false,
    // Any key the game should treat as "pressed this frame".
    pressed: new Set(),
  };

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    state.pressed.add(event.code);
    // The game owns these keys; keep the page from scrolling or quitting.
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  // The canvas is drawn at 1280x800 but shown scaled by CSS, so translate
  // the click from screen pixels into canvas pixels.
  let canvasEl = null;

  function onMouseDown(event) {
    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      state.clickX = ((event.clientX - rect.left) / rect.width) * VIEW_W;
      state.clickY = ((event.clientY - rect.top) / rect.height) * VIEW_H;
    } else {
      state.clickX = event.offsetX;
      state.clickY = event.offsetY;
    }
    state.clicked = true;
  }

  function onBlur() {
    keys.clear();
  }

  return {
    state,
    attach(canvas) {
      canvasEl = canvas;
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', onBlur);
      canvas.addEventListener('mousedown', onMouseDown);
    },
    detach(canvas) {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('mousedown', onMouseDown);
    },
    // Normalised movement vector from WASD / arrows, length 0 or 1.
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    tiptoe() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    lifting() {
      return keys.has('KeyE');
    },
    // True once for a key pressed since the last frame; the game clears the
    // set at the end of each update so a tap never fires twice.
    wasPressed(code) {
      return state.pressed.has(code);
    },
    endFrame() {
      state.pressed.clear();
      state.clicked = false;
    },
  };
}
