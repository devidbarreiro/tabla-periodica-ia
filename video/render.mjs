// Vídeo promocional horizontal (1920x1080, 30 fps) generado solo con código:
// canvas para cada frame, música sintetizada en audio.mjs y ffmpeg para codificar.
// Uso: node render.mjs            → out/promo.mp4
//      node render.mjs --still 5 20.5   → out/still-<beat>.png (para revisar)
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { BEAT, renderMusic } from "./audio.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { CATEGORIES, ELEMENTS, UPDATED } = require("../data.js");

const W = 1920;
const H = 1080;
const FPS = 30;
const TOTAL_BEATS = 60;
const URL_TEXT = "devidbarreiro.github.io/tabla-periodica-ia";
const OUT = join(HERE, "out");

GlobalFonts.registerFromPath(join(HERE, "fonts/space-grotesk-latin-700-normal.ttf"), "Grotesk Bold");
GlobalFonts.registerFromPath(join(HERE, "fonts/space-grotesk-latin-500-normal.ttf"), "Grotesk");
GlobalFonts.registerFromPath(join(HERE, "fonts/jetbrains-mono-latin-600-normal.ttf"), "Mono");

const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const bySymbol = Object.fromEntries(ELEMENTS.map((e) => [e.s, e]));

// Frases cortas para las tarjetas del vídeo (la web tiene la descripción completa).
const SHOWCASE = [
  { s: "Mcp", c: "El USB-C de la IA: un estándar para conectar modelos con herramientas y datos." },
  { s: "A2a", c: "Agentes de distintos proveedores que se descubren y colaboran entre sí." },
  { s: "Sk", c: "Instrucciones y scripts que el agente carga solo cuando la tarea lo pide." },
  { s: "Sb", c: "El agente delega en agentes hijos con contexto limpio y recibe el resumen." },
  { s: "Vc", c: "Describir lo que quieres y aceptar lo que genera la IA sin leer el código." },
  { s: "Ac", c: "Agentes que leen el repo, editan, pasan tests y abren PRs solos." },
  { s: "Ce", c: "Diseñar todo lo que entra en la ventana de contexto, no solo el prompt." },
  { s: "Rz", c: "Modelos que piensan antes de responder, con presupuesto de razonamiento." },
  { s: "Tc", c: "Escalar el cómputo al responder, no solo al entrenar." },
  { s: "Rv", c: "Refuerzo con recompensas verificables: tests que pasan, cuentas que cuadran." },
  { s: "Gp", c: "GPT-6 Sol y Luna, lanzados el 22 de septiembre de 2026." },
  { s: "Cl", c: "Opus 5.5 (22 sep) y Fable 5.1 (1 sep): lo último de Anthropic." },
];
const FLICKER = ["Tf", "Rg", "Mcp", "Lo", "Pi", "Df", "Cl", "Ag"];

// ---------- Utilidades ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeBack = (t) => {
  const c = 1.9;
  const x = clamp(t) - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
};
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgba = (hex, a) => `rgba(${hexToRgb(hex).join(",")},${a})`;
const isGroove = (beat) => beat >= 8 && beat < 52;
const pulseAt = (beat) => (isGroove(beat) ? Math.exp(-(beat % 1) * 5) : 0);

// ---------- Layout de la tabla ----------
const TILE_W = 84;
const TILE_H = 92;
const GAP = 6;
const SPACER = 18;
const GRID_W = 18 * TILE_W + 17 * GAP;
const GRID_X = (W - GRID_W) / 2;
const GRID_Y = 96;

function tileRect(el) {
  const step = TILE_H + GAP;
  const x = GRID_X + (el.col - 1) * (TILE_W + GAP);
  const y = el.row <= 7
    ? GRID_Y + (el.row - 1) * step
    : GRID_Y + 7 * step + SPACER + (el.row - 9) * step;
  return { x, y, w: TILE_W, h: TILE_H };
}
const GAP_AREA = {
  x: GRID_X + 2 * (TILE_W + GAP),
  y: GRID_Y,
  w: 10 * TILE_W + 9 * GAP,
  h: 3 * TILE_H + 2 * GAP,
};

// ---------- Fondo tipo shader (plasma de baja resolución escalado) ----------
const BG_W = 192;
const BG_H = 108;
const bgCanvas = createCanvas(BG_W, BG_H);
const bgCtx = bgCanvas.getContext("2d");
const bgImage = bgCtx.createImageData(BG_W, BG_H);

function drawBackground(ctx, t, energy) {
  const d = bgImage.data;
  for (let y = 0; y < BG_H; y++) {
    for (let x = 0; x < BG_W; x++) {
      const u = x / BG_W;
      const v = y / BG_H;
      const a = Math.sin(u * 6 + t * 0.6) + Math.sin(v * 5 - t * 0.4) + Math.sin((u + v) * 4 + t * 0.3);
      const b = Math.sin(Math.hypot(u - 0.5 - Math.sin(t * 0.2) * 0.3, v - 0.5) * 12 - t * 1.4);
      const k = (a / 3 + b) * 0.25 + 0.5;
      const vig = 1 - Math.hypot(u - 0.5, (v - 0.5) * 0.9) * 1.2;
      const lum = clamp(vig) * (0.55 + energy * 0.6);
      const i = (y * BG_W + x) * 4;
      d[i] = 10 + lum * (40 * k + 30 * (1 - k));
      d[i + 1] = 12 + lum * (18 * k + 38 * (1 - k));
      d[i + 2] = 22 + lum * (70 * k + 60 * (1 - k));
      d[i + 3] = 255;
    }
  }
  bgCtx.putImageData(bgImage, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bgCanvas, 0, 0, W, H);
}

// ---------- Primitivas ----------
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function star(ctx, cx, cy, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function fitText(ctx, text, maxW, size, font) {
  let s = size;
  ctx.font = `${s}px "${font}"`;
  while (ctx.measureText(text).width > maxW && s > 6) {
    s -= 1;
    ctx.font = `${s}px "${font}"`;
  }
  return s;
}

function drawTile(ctx, el, rect, opts = {}) {
  const { alpha = 1, glow = 0, scale = 1 } = opts;
  const color = catById[el.cat].color;
  const { x, y, w, h } = rect;
  const k = w / TILE_W;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(scale, scale);
  ctx.translate(-w / 2, -h / 2);
  if (glow > 0) {
    ctx.shadowColor = rgba(color, 0.9 * glow);
    ctx.shadowBlur = 40 * glow * k;
  }
  roundRect(ctx, 0, 0, w, h, 8 * k);
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, rgba(color, 0.3 + glow * 0.2));
  grad.addColorStop(1, rgba(color, 0.08));
  ctx.fillStyle = "#11141d";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = (1 + glow * 1.5) * k;
  ctx.strokeStyle = rgba(color, 0.45 + glow * 0.55);
  ctx.stroke();

  ctx.fillStyle = "#8a93a8";
  ctx.font = `${11 * k}px "Mono"`;
  ctx.textBaseline = "top";
  ctx.fillText(String(el.num), 7 * k, 7 * k);
  if (el.hot) star(ctx, w - 12 * k, 13 * k, 6 * k, "#ffd43b");

  ctx.fillStyle = color;
  ctx.font = `${32 * k}px "Grotesk Bold"`;
  ctx.textBaseline = "middle";
  ctx.fillText(el.s, 7 * k, h * 0.5);

  ctx.fillStyle = "rgba(238,241,248,0.85)";
  fitText(ctx, el.n, w - 12 * k, 11 * k, "Grotesk");
  ctx.textBaseline = "bottom";
  ctx.fillText(el.n, 7 * k, h - 7 * k);
  ctx.restore();
}

function drawTable(ctx, beat, tileOpts) {
  ELEMENTS.forEach((el) => drawTile(ctx, el, tileRect(el), tileOpts(el)));
  drawSeriesLabels(ctx, 1);
}

function drawSeriesLabels(ctx, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha * 0.8;
  ctx.fillStyle = "#8a93a8";
  ctx.font = `15px "Mono"`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  [["Modelos frontera", 9], ["Serie agéntica", 10]].forEach(([text, row]) => {
    const r = tileRect({ row, col: 3 });
    ctx.fillText(text, r.x - 18, r.y + TILE_H / 2);
  });
  ctx.restore();
}

const ACCENT = "#4dabf7";

function accentText(ctx, text, x, y, size, align = "center") {
  ctx.font = `${size}px "Grotesk Bold"`;
  ctx.textAlign = align;
  ctx.fillStyle = ACCENT;
  ctx.fillText(text, x, y);
}

function wrapLines(ctx, text, maxW) {
  const words = text.split(" ");
  return words.reduce((lines, word) => {
    const last = lines[lines.length - 1];
    const trial = last ? `${last} ${word}` : word;
    if (ctx.measureText(trial).width <= maxW || !last) return [...lines.slice(0, -1), trial];
    return [...lines, word];
  }, [""]);
}

function punch(beat, at, dur = 0.35) {
  const p = clamp((beat - at) / dur);
  return { alpha: easeOut(p * 1.5), scale: lerp(1.25, 1, easeOut(p)) };
}

function centerText(ctx, text, y, size, beat, at, opts = {}) {
  if (beat < at) return;
  const { alpha, scale } = punch(beat, at);
  ctx.save();
  ctx.globalAlpha = alpha * (opts.alpha ?? 1);
  ctx.translate(W / 2, y);
  ctx.scale(scale, scale);
  ctx.textBaseline = "middle";
  if (opts.accent) accentText(ctx, text, 0, 0, size);
  else {
    ctx.font = `${size}px "${opts.font ?? "Grotesk Bold"}"`;
    ctx.textAlign = "center";
    ctx.fillStyle = opts.color ?? "#eef1f8";
    ctx.fillText(text, 0, 0);
  }
  ctx.restore();
}

// ---------- Escenas ----------
function sceneHook(ctx, beat) {
  const textFade = 1 - clamp((beat - 4) / 0.4);
  if (textFade > 0) {
    const lift = easeInOut(clamp((beat - 2) / 0.5)) * 70;
    centerText(ctx, "120 términos de IA.", H / 2 - lift, 140, beat, 0, { alpha: textFade });
    centerText(ctx, "¿Cuántos conoces de verdad?", H / 2 + 90, 86, beat, 2, { accent: true, alpha: textFade });
  }
  if (beat < 4) return;
  const idx = Math.min(FLICKER.length - 1, Math.floor((beat - 4) * 2));
  const el = bySymbol[FLICKER[idx]];
  const local = ((beat - 4) * 2) % 1;
  const grow = 1 + (beat - 4) * 0.06;
  const shake = beat > 7 ? (hash(Math.floor(beat * 30)) - 0.5) * 14 : 0;
  const size = { w: 336 * grow, h: 368 * grow };
  const rect = { x: W / 2 - size.w / 2 + shake, y: H / 2 - size.h / 2 - 20, ...size };
  drawTile(ctx, el, rect, { glow: 1 - local * 0.6, scale: lerp(1.08, 1, easeOut(local * 3)) });
  ctx.save();
  ctx.fillStyle = "#eef1f8";
  ctx.font = `34px "Grotesk"`;
  ctx.textAlign = "center";
  ctx.fillText(catById[el.cat].name, W / 2, rect.y + rect.h + 60);
  ctx.restore();
}

function sceneBuild(ctx, beat) {
  drawTable(ctx, beat, (el) => {
    const delay = 8 + ((el.num - 1) / (ELEMENTS.length - 1)) * 4;
    const p = clamp((beat - delay) / 1.1);
    if (p <= 0) return { alpha: 0 };
    return { alpha: easeOut(p * 2), scale: easeBack(p), glow: (1 - p) * 0.8 + pulseAt(beat) * 0.15 };
  });
  drawGapTitle(ctx, beat);
}

function drawGapTitle(ctx, beat) {
  const { x, y, w, h } = GAP_AREA;
  const cx = x + w / 2;
  if (beat >= 9 && beat < 12) {
    const out = 1 - clamp((beat - 11.6) / 0.4);
    ctx.save();
    ctx.globalAlpha = out;
    centerTextAt(ctx, "Como la tabla periódica.", cx, y + h / 2, 70, beat, 9);
    ctx.restore();
  }
  if (beat >= 12) {
    const { alpha, scale } = punch(beat, 12);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, y + h / 2 - 20);
    ctx.scale(scale, scale);
    ctx.textBaseline = "middle";
    const size = 72;
    ctx.font = `${size}px "Grotesk Bold"`;
    const head = "Tabla Periódica ";
    const headW = ctx.measureText(head).width;
    const tailW = ctx.measureText("de la IA").width;
    const startX = -(headW + tailW) / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = "#eef1f8";
    ctx.fillText(head, startX, 0);
    accentText(ctx, "de la IA", startX + headW, 0, size, "left");
    ctx.font = `24px "Mono"`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#8a93a8";
    ctx.fillText(`120 términos · 12 familias · actualizada a ${UPDATED}`, 0, 76);
    ctx.restore();
  }
}

function centerTextAt(ctx, text, x, y, size, beat, at) {
  const { alpha, scale } = punch(beat, at);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.textBaseline = "middle";
  accentText(ctx, text, 0, 0, size);
  ctx.restore();
}

function sceneShowcase(ctx, beat) {
  const idx = Math.min(SHOWCASE.length - 1, Math.floor((beat - 16) / 2));
  const item = SHOWCASE[idx];
  const el = bySymbol[item.s];
  const local = (beat - 16 - idx * 2) / 2;
  drawTable(ctx, beat, (e) => (e.s === el.s ? { alpha: 1, glow: 1, scale: 1.12 } : { alpha: 0.16 }));
  ctx.fillStyle = "rgba(8,10,16,0.62)";
  ctx.fillRect(0, 0, W, H);
  // Resaltado en la tabla, visible a través del velo.
  drawTile(ctx, el, tileRect(el), { glow: 1, scale: 1.15 + pulseAt(beat) * 0.08 });
  drawShowcaseCard(ctx, el, item, local, beat, idx);
}

function drawShowcaseCard(ctx, el, item, local, beat, idx) {
  const color = catById[el.cat].color;
  const inP = easeOut(local * 4);
  const outP = clamp((local - 0.9) * 10);
  const alpha = inP * (1 - outP);
  const slide = (1 - inP) * 90 - outP * 60;
  const cardY = 360;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#8a93a8";
  ctx.font = `24px "Mono"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const label = idx < 10 ? "LO NUEVO · 2025-2026" : "MODELOS · SEPTIEMBRE 2026";
  ctx.fillText(`${label}   ${String(idx + 1).padStart(2, "0")}/${SHOWCASE.length}`, 200, cardY - 40);

  const big = { x: 200 + slide * 0.5, y: cardY, w: 300, h: 330 };
  drawTile(ctx, el, big, { glow: 0.9 + pulseAt(beat) * 0.3, scale: lerp(1.15, 1, easeOut(local * 5)) });

  const tx = 580 + slide;
  ctx.fillStyle = color;
  ctx.font = `26px "Mono"`;
  ctx.fillText(catById[el.cat].name.toUpperCase(), tx, cardY + 40);
  ctx.fillStyle = "#eef1f8";
  fitText(ctx, el.n, 1140, 96, "Grotesk Bold");
  ctx.fillText(el.n, tx, cardY + 135);
  ctx.fillStyle = "#8a93a8";
  ctx.font = `28px "Mono"`;
  ctx.fillText([el.org, el.y].filter(Boolean).join(" · "), tx, cardY + 185);
  ctx.fillStyle = "rgba(238,241,248,0.92)";
  ctx.font = `42px "Grotesk"`;
  wrapLines(ctx, item.c, 1140).forEach((line, i) => ctx.fillText(line, tx, cardY + 260 + i * 54));
  ctx.restore();
}

function sceneSweep(ctx, beat) {
  const idx = Math.min(CATEGORIES.length - 1, Math.floor(beat - 40));
  const cat = CATEGORIES[idx];
  const local = beat - 40 - idx;
  drawTable(ctx, beat, (el) =>
    el.cat === cat.id
      ? { alpha: 1, glow: 0.7 * (1 - local) + 0.2, scale: 1 + 0.12 * Math.exp(-local * 5) }
      : { alpha: 0.1 }
  );
  const count = ELEMENTS.filter((e) => e.cat === cat.id).length;
  const { x, y, w, h } = GAP_AREA;
  const { alpha, scale } = punch(beat, 40 + idx, 0.25);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(scale, scale);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = cat.color;
  fitText(ctx, cat.name, w - 40, 84, "Grotesk Bold");
  ctx.fillText(cat.name, 0, -18);
  ctx.fillStyle = "#8a93a8";
  ctx.font = `26px "Mono"`;
  ctx.fillText(`${String(idx + 1).padStart(2, "0")}/12 · ${count} términos`, 0, 56);
  ctx.restore();
}

function sceneOutro(ctx, beat) {
  const fade = 1 - clamp((beat - 52) / 1);
  drawTable(ctx, beat, () => ({ alpha: 0.1 + 0.9 * fade * fade }));
  ctx.fillStyle = `rgba(8,10,16,${0.55 * (1 - fade)})`;
  ctx.fillRect(0, 0, W, H);
  centerText(ctx, "Gratis. Open source.", H / 2 - 150, 110, beat, 52.5);
  if (beat >= 54) {
    const { alpha, scale } = punch(beat, 54);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, H / 2 + 10);
    ctx.scale(scale, scale);
    ctx.font = `46px "Mono"`;
    const tw = ctx.measureText(URL_TEXT).width;
    roundRect(ctx, -tw / 2 - 36, -46, tw + 72, 92, 46);
    ctx.fillStyle = "rgba(77,171,247,0.14)";
    ctx.fill();
    ctx.strokeStyle = "#4dabf7";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#eef1f8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(URL_TEXT, 0, 2);
    ctx.restore();
  }
  centerText(ctx, `Actualizada a ${UPDATED}`, H / 2 + 130, 36, beat, 55, { font: "Grotesk", color: "#8a93a8" });
  centerText(ctx, "Guárdala. Compártela.", H / 2 + 240, 64, beat, 56, { accent: true });
}

function drawFlash(ctx, beat) {
  const pre = beat >= 7.5 && beat < 8 ? ((beat - 7.5) / 0.5) ** 3 : 0;
  const post = beat >= 8 ? Math.exp(-(beat - 8) * 3) : 0;
  const post2 = beat >= 52 ? Math.exp(-(beat - 52) * 4) * 0.7 : 0;
  const a = Math.max(pre, post, post2);
  if (a < 0.01) return;
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.fillRect(0, 0, W, H);
}

function drawEndFade(ctx, beat) {
  const a = clamp((beat - 58.5) / 1.5);
  if (a <= 0) return;
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.fillRect(0, 0, W, H);
}

export function drawFrame(ctx, beat) {
  const t = beat * BEAT;
  const energy = pulseAt(beat) * 0.8 + (beat < 8 ? beat / 16 : 0.4);
  drawBackground(ctx, t, energy);
  const zoom = 1 + pulseAt(beat) * 0.006;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H / 2);
  if (beat < 8) sceneHook(ctx, beat);
  else if (beat < 16) sceneBuild(ctx, beat);
  else if (beat < 40) sceneShowcase(ctx, beat);
  else if (beat < 52) sceneSweep(ctx, beat);
  else sceneOutro(ctx, beat);
  ctx.restore();
  drawFlash(ctx, beat);
  drawEndFade(ctx, beat);
}

// ---------- Salida ----------
function renderStills(beats) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  beats.forEach((b) => {
    drawFrame(ctx, b);
    const file = join(OUT, `still-${b}.png`);
    writeFileSync(file, canvas.toBuffer("image/png"));
    console.info(`→ ${file}`);
  });
}

function writeFrame(stream, buf) {
  return stream.write(buf) ? Promise.resolve() : new Promise((res) => stream.once("drain", res));
}

async function renderVideo() {
  const wav = join(OUT, "music.wav");
  renderMusic(wav, TOTAL_BEATS);
  const mp4 = join(OUT, "promo.mp4");
  const ffmpeg = spawn("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", String(FPS), "-i", "pipe:0",
    "-i", wav,
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", mp4,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => {
    ffmpeg.on("error", rej);
    ffmpeg.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg salió con código ${code}`))));
  });

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const totalFrames = Math.round(TOTAL_BEATS * BEAT * FPS);
  for (let f = 0; f < totalFrames; f++) {
    drawFrame(ctx, f / FPS / BEAT);
    const { data } = ctx.getImageData(0, 0, W, H);
    await writeFrame(ffmpeg.stdin, Buffer.from(data.buffer, data.byteOffset, data.byteLength));
    if (f % 90 === 0) process.stdout.write(`frame ${f}/${totalFrames}\n`);
  }
  ffmpeg.stdin.end();
  await done;
  console.info(`→ ${mp4}`);
}

mkdirSync(OUT, { recursive: true });
const stillIdx = process.argv.indexOf("--still");
if (stillIdx !== -1) renderStills(process.argv.slice(stillIdx + 1).map(Number));
else renderVideo().catch((err) => {
  console.error(err);
  process.exit(1);
});
