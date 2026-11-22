// audio.js — every sound is synthesised with WebAudio; there are no audio
// files. The context is created lazily on the first user gesture (a key or
// a click), because browsers will not let a page start audio before one.
//
// Each effect is a short oscillator or noise burst with an envelope. Nothing
// here loops forever: the alarm pulse is re-triggered by the game while the
// thief is seen, and stops the moment the gaze breaks.

export function makeAudio() {
  let ctx = null;
  let master = null;
  let lastPulse = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
    return true;
  }

  // One tone: frequency glide from `from` to `to` over `dur` seconds.
  function tone(from, to, dur, type, gain) {
    if (!ensure()) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // A short burst of filtered noise, for footsteps and coin clinks.
  function noise(dur, cutoff, gain) {
    if (!ensure()) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
  }

  return {
    // Call on any keydown / click so later effects have a live context.
    unlock() {
      ensure();
    },
    step() {
      noise(0.05, 900, 0.12);
    },
    coin() {
      tone(2400, 1800, 0.09, 'sine', 0.35);
      noise(0.06, 5200, 0.25);
    },
    coinLand() {
      noise(0.05, 3400, 0.2);
    },
    pickup() {
      tone(660, 660, 0.08, 'sine', 0.3);
      setTimeout(() => tone(990, 990, 0.12, 'sine', 0.3), 80);
    },
    diamond() {
      // A little rising arpeggio for the prize of the night.
      [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => tone(f, f, 0.16, 'triangle', 0.32), i * 90);
      });
    },
    // A low two-note pulse while the thief is seen; throttled to twice a
    // second so it reads as a heartbeat, not a drone.
    alarmPulse(now) {
      if (now - lastPulse < 0.5) return;
      lastPulse = now;
      tone(196, 147, 0.22, 'sawtooth', 0.16);
    },
    spotted() {
      tone(880, 440, 0.3, 'square', 0.18);
    },
    busted() {
      // A falling minor sting: the night is over.
      [392, 311, 233].forEach((f, i) => {
        setTimeout(() => tone(f, f * 0.94, 0.3, 'sawtooth', 0.22), i * 160);
      });
    },
    getaway() {
      // A rising major fanfare for making it to the van.
      [523, 659, 784, 1047, 1319].forEach((f, i) => {
        setTimeout(() => tone(f, f, 0.22, 'triangle', 0.3), i * 110);
      });
    },
    pause() {
      tone(440, 330, 0.12, 'sine', 0.2);
    },
  };
}
