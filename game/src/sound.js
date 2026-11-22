// Sound, synthesised live with WebAudio: a coin's clink, the soft chime of lifted loot, a
// low sting for the diamond, and the two endings. No audio files, nothing to load; the
// context is only opened after the player's first key or click, as browsers require.

export function createSound() {
  let ctx = null;

  function open() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      return true;
    } catch {
      return false;
    }
  }

  // One shared envelope for every effect: a quick attack, then an exponential fall, so
  // nothing clicks at the start or rings after it ends. Gains stay low — these are
  // pings and stings over the game, not a soundtrack.
  function tone(freq, at, dur, type, gain, slideTo) {
    if (!ctx) return;
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    unlock() {
      open();
    },
    coin() {
      if (!open()) return;
      tone(2093, 0, 0.09, 'square', 0.05);
      tone(1568, 0.05, 0.14, 'square', 0.04);
    },
    grab() {
      if (!open()) return;
      tone(880, 0, 0.1, 'sine', 0.07);
      tone(1318, 0.07, 0.16, 'sine', 0.06);
    },
    diamond() {
      if (!open()) return;
      tone(523, 0, 0.3, 'triangle', 0.09);
      tone(784, 0.08, 0.3, 'triangle', 0.08);
      tone(1046, 0.16, 0.42, 'triangle', 0.08);
    },
    spotted() {
      if (!open()) return;
      tone(1174, 0, 0.07, 'square', 0.03);
    },
    busted() {
      if (!open()) return;
      tone(392, 0, 0.5, 'sawtooth', 0.08, 196);
      tone(311, 0.12, 0.6, 'sawtooth', 0.07, 155);
    },
    alarm() {
      if (!open()) return;
      for (let i = 0; i < 3; i += 1) {
        tone(988, i * 0.34, 0.16, 'square', 0.05);
        tone(988, i * 0.34 + 0.17, 0.16, 'square', 0.05);
      }
    },
    win() {
      if (!open()) return;
      tone(523, 0, 0.22, 'triangle', 0.08);
      tone(659, 0.12, 0.22, 'triangle', 0.08);
      tone(784, 0.24, 0.22, 'triangle', 0.08);
      tone(1046, 0.36, 0.5, 'triangle', 0.09);
    },
  };
}
