// Música sintetizada 100% en código: kick, clap, hats, bajo, pad supersaw, arpegio y riser.
// Devuelve un WAV estéreo de 16 bits alineado con el timeline del vídeo.
import { writeFileSync } from "node:fs";

export const BPM = 120;
export const BEAT = 60 / BPM;
const SR = 44100;
const TAU = Math.PI * 2;

// La menor: Am – F – C – G, un compás por acorde.
const PROGRESSION = [
  { root: 55.0, notes: [220.0, 261.63, 329.63] },
  { root: 43.65, notes: [174.61, 220.0, 261.63] },
  { root: 65.41, notes: [261.63, 329.63, 392.0] },
  { root: 49.0, notes: [196.0, 246.94, 293.66] },
];

// Secciones en beats (coinciden con render.mjs).
export const SECTIONS = { hook: [0, 8], build: [8, 16], showcase: [16, 40], sweep: [40, 52], outro: [52, 60] };

const chordAt = (beat) => PROGRESSION[Math.floor(beat / 4) % PROGRESSION.length];
const inSection = (beat, name) => beat >= SECTIONS[name][0] && beat < SECTIONS[name][1];
const isGroove = (beat) => beat >= 8 && beat < 52;

// Ruido determinista (xorshift) para que cada render suene igual.
function makeNoise(seed = 1234567) {
  let x = seed;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return ((x >>> 0) / 4294967295) * 2 - 1;
  };
}
const noise = makeNoise();

function addSample(buf, i, l, r = l) {
  if (i < 0 || i >= buf.left.length) return;
  buf.left[i] += l;
  buf.right[i] += r;
}

function kick(buf, t, gain = 1) {
  const len = Math.floor(0.45 * SR);
  const start = Math.floor(t * SR);
  let phase = 0;
  for (let n = 0; n < len; n++) {
    const s = n / SR;
    const freq = 45 + 110 * Math.exp(-s * 28);
    phase += (TAU * freq) / SR;
    const env = Math.exp(-s * 7);
    const click = n < 60 ? noise() * 0.3 * (1 - n / 60) : 0;
    addSample(buf, start + n, (Math.sin(phase) * env + click) * 0.9 * gain);
  }
}

function clap(buf, t, gain = 1) {
  const len = Math.floor(0.25 * SR);
  const start = Math.floor(t * SR);
  let prev = 0;
  for (let n = 0; n < len; n++) {
    const s = n / SR;
    const bursts = s < 0.03 ? 0.6 + 0.4 * Math.sin(s * 900) : 1;
    const raw = noise();
    const hp = raw - prev;
    prev = raw;
    const env = Math.exp(-s * 18) * bursts;
    addSample(buf, start + n, hp * env * 0.28 * gain, hp * env * 0.24 * gain);
  }
}

function hat(buf, t, open = false, gain = 1) {
  const len = Math.floor((open ? 0.18 : 0.05) * SR);
  const start = Math.floor(t * SR);
  let prev = 0;
  for (let n = 0; n < len; n++) {
    const raw = noise();
    const hp = raw - prev;
    prev = raw;
    const env = Math.exp(-(n / SR) * (open ? 22 : 70));
    addSample(buf, start + n, hp * env * 0.09 * gain, hp * env * 0.11 * gain);
  }
}

function bassNote(buf, t, freq, dur) {
  const len = Math.floor(dur * SR);
  const start = Math.floor(t * SR);
  let lp = 0;
  for (let n = 0; n < len; n++) {
    const s = n / SR;
    const saw = 2 * ((s * freq) % 1) - 1;
    const cutoff = 0.05 + 0.12 * Math.exp(-s * 12);
    lp += cutoff * (saw - lp);
    const env = Math.min(1, n / 200) * Math.exp(-s * 3);
    const sub = Math.sin(TAU * freq * s) * 0.5;
    addSample(buf, start + n, (lp * 0.5 + sub) * env * 0.42);
  }
}

function padChord(buf, t, notes, dur, brightness) {
  const len = Math.floor(dur * SR);
  const start = Math.floor(t * SR);
  const detunes = [-0.012, 0, 0.011];
  const lpState = [0, 0];
  for (let n = 0; n < len; n++) {
    const s = n / SR;
    let l = 0;
    let r = 0;
    notes.forEach((f, ni) => {
      detunes.forEach((d, di) => {
        const saw = 2 * ((s * f * (1 + d) + ni * 0.13 + di * 0.37) % 1) - 1;
        if (di === 0) l += saw; else if (di === 2) r += saw; else { l += saw * 0.5; r += saw * 0.5; }
      });
    });
    lpState[0] += brightness * (l - lpState[0]);
    lpState[1] += brightness * (r - lpState[1]);
    const env = Math.min(1, s / 0.08) * Math.min(1, (dur - s) / 0.1);
    addSample(buf, start + n, lpState[0] * env * 0.05, lpState[1] * env * 0.05);
  }
}

function pluck(buf, t, freq, pan) {
  const len = Math.floor(0.22 * SR);
  const start = Math.floor(t * SR);
  let lp = 0;
  for (let n = 0; n < len; n++) {
    const s = n / SR;
    const sq = Math.sin(TAU * freq * s) > 0 ? 1 : -1;
    lp += (0.08 + 0.3 * Math.exp(-s * 30)) * (sq - lp);
    const env = Math.exp(-s * 16);
    addSample(buf, start + n, lp * env * 0.06 * (1 - pan), lp * env * 0.06 * (1 + pan));
  }
}

function riser(buf, from, to) {
  const start = Math.floor(from * SR);
  const len = Math.floor((to - from) * SR);
  let lp = 0;
  let phase = 0;
  for (let n = 0; n < len; n++) {
    const p = n / len;
    lp += (0.02 + p * 0.6) * (noise() - lp);
    phase += (TAU * (200 + 1400 * p * p)) / SR;
    const v = (lp * 0.25 + Math.sin(phase) * 0.05) * p * p;
    addSample(buf, start + n, v, v);
  }
}

function impact(buf, t) {
  kick(buf, t, 1.3);
  const len = Math.floor(2.2 * SR);
  const start = Math.floor(t * SR);
  let lp = 0;
  for (let n = 0; n < len; n++) {
    lp += 0.35 * (noise() - lp);
    const env = Math.exp(-(n / SR) * 2.2);
    addSample(buf, start + n, lp * env * 0.3, noise() * env * 0.1 + lp * env * 0.2);
  }
}

// Ganancia del sidechain: el pad y el bajo "respiran" con cada kick.
function applySidechain(buf, totalBeats) {
  for (let i = 0; i < buf.left.length; i++) {
    const beatPos = i / SR / BEAT;
    if (!isGroove(beatPos) || beatPos >= totalBeats) continue;
    const since = (beatPos % 1) * BEAT;
    const duck = 1 - 0.6 * Math.exp(-since / 0.09);
    buf.padL[i] *= duck;
    buf.padR[i] *= duck;
  }
}

function scheduleDrums(buf, totalBeats) {
  for (let b = 0; b < totalBeats; b++) {
    const t = b * BEAT;
    if (isGroove(b)) {
      kick(buf, t);
      if (b % 2 === 1) clap(buf, t);
      hat(buf, t + BEAT / 2, true);
    }
    if (inSection(b, "hook") && b >= 2) hat(buf, t + BEAT / 2, false, 0.8);
    if (isGroove(b) || (inSection(b, "hook") && b >= 4)) {
      [0.25, 0.75].forEach((off) => hat(buf, t + off * BEAT, false, 0.7));
    }
    // Redoble de caja en el último compás del hook.
    if (b >= 6 && b < 8) {
      const hits = b === 6 ? 4 : 8;
      for (let k = 0; k < hits; k++) clap(buf, t + (k / hits) * BEAT, 0.4 + (b - 6) * 0.3 + k * 0.04);
    }
    if (inSection(b, "outro") && b < 58 && b % 2 === 0) kick(buf, t, 0.7);
  }
}

function scheduleMelodic(buf, totalBeats) {
  const pad = { left: buf.padL, right: buf.padR };
  for (let bar = 0; bar < totalBeats / 4; bar++) {
    const b = bar * 4;
    const chord = chordAt(b);
    const brightness = b < 8 ? 0.03 + b * 0.008 : b < 52 ? 0.12 : 0.06;
    padChord(pad, b * BEAT, chord.notes, (b >= 56 ? 4 : 4) * BEAT, brightness);
    if (!isGroove(b)) continue;
    for (let e = 0; e < 8; e++) {
      if (e % 2 === 1) bassNote(pad, (b + e / 2) * BEAT, chord.root * 2, BEAT * 0.45);
    }
    if (b >= 16) {
      for (let s = 0; s < 16; s++) {
        const note = chord.notes[[0, 1, 2, 1][s % 4]] * (s % 8 < 4 ? 2 : 4);
        pluck(buf, (b + s / 4) * BEAT, note, Math.sin(s) * 0.5);
      }
    }
  }
}

function toWav(buf) {
  const frames = buf.left.length;
  const out = Buffer.alloc(44 + frames * 4);
  out.write("RIFF", 0); out.writeUInt32LE(36 + frames * 4, 4); out.write("WAVE", 8);
  out.write("fmt ", 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
  out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
  out.write("data", 36); out.writeUInt32LE(frames * 4, 40);
  let peak = 0;
  for (let i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(buf.left[i]), Math.abs(buf.right[i]));
  const norm = peak > 0 ? 1 / Math.tanh(peak) : 1;
  for (let i = 0; i < frames; i++) {
    const fade = Math.min(1, (frames - i) / (SR * 1.5));
    out.writeInt16LE(Math.round(Math.tanh(buf.left[i]) * norm * 0.89 * fade * 32767), 44 + i * 4);
    out.writeInt16LE(Math.round(Math.tanh(buf.right[i]) * norm * 0.89 * fade * 32767), 46 + i * 4);
  }
  return out;
}

export function renderMusic(path, totalBeats) {
  const frames = Math.ceil(totalBeats * BEAT * SR) + SR;
  const buf = {
    left: new Float32Array(frames), right: new Float32Array(frames),
    padL: new Float32Array(frames), padR: new Float32Array(frames),
  };
  scheduleDrums(buf, totalBeats);
  scheduleMelodic(buf, totalBeats);
  riser(buf, 4 * BEAT, 8 * BEAT);
  riser(buf, 50 * BEAT, 52 * BEAT);
  impact(buf, 8 * BEAT);
  impact(buf, 52 * BEAT);
  applySidechain(buf, totalBeats);
  for (let i = 0; i < frames; i++) {
    buf.left[i] += buf.padL[i];
    buf.right[i] += buf.padR[i];
  }
  writeFileSync(path, toWav(buf));
}
