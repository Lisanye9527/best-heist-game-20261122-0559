// Keyboard and mouse, read as one input state the world can consume: a move direction
// (WASD or the arrow keys), tiptoe (Shift), work on the loot (E or Space held), toss a coin
// decoy (mouse click, which names the floor point it lands on), and the one-shot actions
// confirm (Enter, Space or click) and pause (P or Escape).

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const KEY_DIRECTION = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let coinPoint = null; // the floor point of the latest click, in stage pixels
  let pointer = null;

  function stagePoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    // Arrow keys and Space would scroll the page: keep them for the game instead.
    // Space doubles as grab and confirm, so it is never held down by accident here.
    if (KEY_DIRECTION[event.code] || event.code === 'Space') event.preventDefault();
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('pointermove', (event) => {
    pointer = stagePoint(event);
  });
  canvas.addEventListener('pointerdown', (event) => {
    coinPoint = stagePoint(event);
    pointer = coinPoint;
    actions |= ACTION_CONFIRM;
  });

  return {
    /** The move direction as a unit vector (diagonals normalised), or (0, 0) standing still. */
    direction() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const d = KEY_DIRECTION[code];
        if (d) {
          x += d[0];
          y += d[1];
        }
      }
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    sneaking() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    grabbing() {
      return held.has('KeyE') || held.has('Space');
    },
    /** The click point waiting to become a coin toss, if any; taking it clears it. */
    takeCoinPoint() {
      const point = coinPoint;
      coinPoint = null;
      return point;
    },
    pointer() {
      return pointer;
    },
    /** One-shot actions since the last call; taking them clears them. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
