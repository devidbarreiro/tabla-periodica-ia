// Vídeo promocional horizontal (1920x1080, 30 fps) generado solo con código.
// Pensado para LinkedIn: se reproduce sin sonido, así que todo el mensaje va en texto.
// Uso: node render.mjs                 → out/promo.mp4
//      node render.mjs --still 2 12 20 → out/still-<segundo>.png (para revisar)
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { CATEGORIES, ELEMENTS, UPDATED } = require("../data.js");

const W = 1920;
const H = 1080;
const FPS = 30;
const URL_TEXT = "devidbarreiro.github.io/tabla-periodica-ia";
const REPO_TEXT = "github.com/devidbarreiro/tabla-periodica-ia";
const AUTHOR = "David Barreiro";
const OUT = join(HERE, "out");
const MARGIN = 120;

// Misma paleta que la web: base zinc neutra y un único acento.
const BG = "#0c0c0e";
const TEXT = "#ededef";
const MUTED = "#8b8b94";
const SURFACE = "#141417";
const LINE = "#27272a";
const ACCENT = "#3fcf8e";

GlobalFonts.registerFromPath(join(HERE, "fonts/geist-sans-latin-700-normal.ttf"), "Sans Bold");
GlobalFonts.registerFromPath(join(HERE, "fonts/geist-sans-latin-500-normal.ttf"), "Sans");
GlobalFonts.registerFromPath(join(HERE, "fonts/geist-mono-latin-500-normal.ttf"), "Mono");

const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const bySymbol = Object.fromEntries(ELEMENTS.map((e) => [e.s, e]));

// ---------- Guion (segundos) ----------
const SCENES = {
  title: [0, 4.2],
  build: [4.2, 9.6],
  regions: [9.6, 17.2],
  cards: [17.2, 31.0],
  known: [31.0, 35.2],
  cta: [35.2, 40.0],
};
const DURATION = SCENES.cta[1];
const REGION_LEN = 1.9;

const REGIONS = [
  { cats: ["fund"], title: "Fundamentos", text: "Lo que no caduca: redes neuronales, gradiente, backpropagation." },
  { cats: ["arq", "train", "inf", "multi"], title: "Cómo se construye", text: "Arquitecturas, entrenamiento, inferencia y multimodal." },
  { cats: ["rag", "prompt", "eval", "safety", "frontier"], title: "Cómo se usa y se controla", text: "RAG, prompting, evaluación, seguridad y lo que viene." },
  { cats: ["models", "agents"], title: "Modelos y agentes", text: "Las dos filas de abajo, como los lantánidos. Lo que más cambia." },
];

const CARDS = [
  { s: "Mcp", c: "El estándar abierto para conectar modelos con herramientas y datos. Hoy lo usa toda la industria." },
  { s: "Sk", c: "Instrucciones y scripts que el agente carga solo cuando la tarea lo pide." },
  { s: "Ce", c: "Ya no basta con el prompt: se diseña todo lo que entra en la ventana de contexto." },
  { s: "Rv", c: "Refuerzo con recompensas verificables. Es el motor de los modelos de razonamiento." },
  {
    models: true,
    rows: [
      ["Gp", "GPT-6 Sol y Luna", "22 sep"],
      ["Cl", "Claude Opus 5.5", "22 sep"],
      ["Gk", "Grok 4.7", "21 sep"],
      ["Gm", "Gemini 3.8 Flash", "2 sep"],
    ],
  },
];
const CARD_LEN = (SCENES.cards[1] - SCENES.cards[0]) / CARDS.length;
const KNOWN_TARGET = 47;

// ---------- Utilidades ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = (t) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgba = (hex, a) => `rgba(${hexToRgb(hex).join(",")},${a})`;
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const local = (t, [start, end]) => ({ p: t - start, len: end - start });
// Opacidad de entrada/salida de un bloque dentro de su ventana.
const envelope = (p, len, fadeIn = 0.5, fadeOut = 0.4) =>
  easeOut(p / fadeIn) * (1 - easeInOut((p - (len - fadeOut)) / fadeOut));

// ---------- Layout de la tabla (coordenadas relativas a su esquina) ----------
const TILE_W = 84;
const TILE_H = 92;
const GAP = 6;
const SPACER = 18;
const STEP = TILE_H + GAP;
const GRID_W = 18 * TILE_W + 17 * GAP;
const GRID_H = 9 * STEP - GAP + SPACER;
const FULL = { s: 1, x: (W - GRID_W) / 2, y: 120 };
const MINI_S = 0.6;
const MINI = { s: MINI_S, x: W - 90 - GRID_W * MINI_S, y: (H - GRID_H * MINI_S) / 2 };
const GAP_AREA = { x: 2 * (TILE_W + GAP), w: 10 * TILE_W + 9 * GAP };

function tileRel(el) {
  const x = (el.col - 1) * (TILE_W + GAP);
  const y = el.row <= 7 ? (el.row - 1) * STEP : 7 * STEP + SPACER + (el.row - 9) * STEP;
  return { x, y };
}

// ---------- Fondo: plano con luz suave, precalculado una vez ----------
const bgCanvas = createCanvas(W, H);
(() => {
  const c = bgCanvas.getContext("2d");
  c.fillStyle = BG;
  c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W * 0.55, H * 0.45, 100, W * 0.55, H * 0.45, W * 0.75);
  g.addColorStop(0, "rgba(255,255,255,0.035)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
})();

// ---------- Primitivas ----------
function setFont(ctx, size, family = "Sans") {
  ctx.font = `${size}px "${family}"`;
}

function text(ctx, str, x, y, opts = {}) {
  const { size = 32, family = "Sans", color = TEXT, align = "left", baseline = "alphabetic" } = opts;
  setFont(ctx, size, family);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(str, x, y);
  return ctx.measureText(str).width;
}

function wrapLines(ctx, str, maxW) {
  return str.split(" ").reduce((lines, word) => {
    const last = lines[lines.length - 1];
    const trial = last ? `${last} ${word}` : word;
    if (ctx.measureText(trial).width <= maxW || !last) return [...lines.slice(0, -1), trial];
    return [...lines, word];
  }, [""]);
}

function paragraph(ctx, str, x, y, maxW, opts = {}) {
  const { size = 34, lineHeight = 1.4, color = MUTED } = opts;
  setFont(ctx, size, "Sans");
  const lines = wrapLines(ctx, str, maxW);
  lines.forEach((line, i) => text(ctx, line, x, y + i * size * lineHeight, { size, color }));
  return lines.length * size * lineHeight;
}

function kicker(ctx, str, x, y, color = ACCENT) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 13, 10, 10);
  text(ctx, str.toUpperCase(), x + 24, y, { size: 22, family: "Mono", color: MUTED });
}

function fitFont(ctx, str, maxW, size, family) {
  let s = size;
  setFont(ctx, s, family);
  while (ctx.measureText(str).width > maxW && s > 6) {
    s -= 1;
    setFont(ctx, s, family);
  }
}

function drawCheck(ctx, x, y, k) {
  ctx.beginPath();
  ctx.moveTo(x - 4 * k, y);
  ctx.lineTo(x - 1 * k, y + 3 * k);
  ctx.lineTo(x + 5 * k, y - 4 * k);
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.8 * k;
  ctx.stroke();
}

function drawTileFrame(ctx, x, y, w, h, color, lift, k) {
  if (lift > 0) {
    ctx.shadowColor = rgba(color, 0.3 * lift);
    ctx.shadowBlur = 24 * k;
    ctx.shadowOffsetY = 12 * k;
  }
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8 * k);
  ctx.fillStyle = SURFACE;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = k * (1 + lift);
  ctx.strokeStyle = lift > 0 ? rgba(color, 0.4 + 0.5 * lift) : LINE;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, 2 * k);
  ctx.restore();
}

function drawTile(ctx, el, x, y, w, h, opts = {}) {
  const { alpha = 1, lift = 0, isKnown = false } = opts;
  const color = catById[el.cat].color;
  const k = w / TILE_W;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(0, -lift * 8 * k);
  drawTileFrame(ctx, x, y, w, h, color, lift, k);
  text(ctx, String(el.num), x + 7 * k, y + 8 * k, { size: 11 * k, family: "Mono", color: MUTED, baseline: "top" });
  if (el.hot) {
    ctx.beginPath();
    ctx.arc(x + w - 11 * k, y + 12 * k, 3 * k, 0, Math.PI * 2);
    ctx.fillStyle = ACCENT;
    ctx.fill();
  }
  text(ctx, el.s, x + 7 * k, y + h * 0.5, { size: 31 * k, family: "Sans Bold", color, baseline: "middle" });
  fitFont(ctx, el.n, w - 14 * k, 11 * k, "Sans");
  ctx.fillStyle = MUTED;
  ctx.textBaseline = "bottom";
  ctx.fillText(el.n, x + 7 * k, y + h - 7 * k);
  if (isKnown) drawCheck(ctx, x + w - 14 * k, y + h - 14 * k, k);
  ctx.restore();
}

function drawTable(ctx, tr, optsFor) {
  ctx.save();
  ctx.translate(tr.x, tr.y);
  ctx.scale(tr.s, tr.s);
  ELEMENTS.forEach((el) => {
    const opts = optsFor(el);
    if (opts.alpha <= 0.001) return;
    const { x, y } = tileRel(el);
    drawTile(ctx, el, x, y + (opts.dy ?? 0), TILE_W, TILE_H, opts);
  });
  ctx.restore();
}

// ---------- Estado de la tabla según el momento ----------
function tableTransform(t) {
  const toMini = easeInOut((t - SCENES.cards[0]) / 0.9);
  return { s: lerp(FULL.s, MINI.s, toMini), x: lerp(FULL.x, MINI.x, toMini), y: lerp(FULL.y, MINI.y, toMini) };
}

function buildOpts(el, t) {
  const order = (el.col - 1) / 17 + (el.row - 1) * 0.02;
  const p = clamp((t - SCENES.build[0] - order * 1.6) / 0.7);
  return { alpha: easeOut(p), dy: (1 - easeOut(p)) * 16 };
}

function regionAlpha(idx, el) {
  if (idx < 0) return 1;
  return REGIONS[idx].cats.includes(el.cat) ? 1 : 0.12;
}

function regionOpts(el, t) {
  const { p } = local(t, SCENES.regions);
  const idx = Math.min(REGIONS.length - 1, Math.floor(p / REGION_LEN));
  const blend = easeInOut((p - idx * REGION_LEN) / 0.4);
  const current = lerp(regionAlpha(idx - 1, el), regionAlpha(idx, el), blend);
  const release = easeInOut((p - (REGIONS.length * REGION_LEN - 0.4)) / 0.4);
  return { alpha: lerp(current, 1, release) };
}

function cardOpts(el, t) {
  const { p } = local(t, SCENES.cards);
  const idx = Math.min(CARDS.length - 1, Math.floor(p / CARD_LEN));
  const card = CARDS[idx];
  const targets = card.models ? card.rows.map((r) => r[0]) : [card.s];
  const cp = p - idx * CARD_LEN;
  const on = easeOut((cp - 0.2) / 0.5) * (1 - easeInOut((cp - (CARD_LEN - 0.35)) / 0.35));
  const dimIn = easeInOut((p - 0.6) / 0.6);
  return targets.includes(el.s) ? { alpha: 1, lift: on } : { alpha: lerp(1, 0.22, dimIn) };
}

const KNOWN_ORDER = [...ELEMENTS]
  .sort((a, b) => hash(a.num) - hash(b.num))
  .slice(0, KNOWN_TARGET)
  .map((e) => e.s);

function knownCount(t) {
  const { p } = local(t, SCENES.known);
  return Math.round(easeInOut((p - 0.5) / 2.4) * KNOWN_TARGET);
}

function knownOpts(el, t) {
  const { p } = local(t, SCENES.known);
  const idx = KNOWN_ORDER.indexOf(el.s);
  const isKnown = idx !== -1 && idx < knownCount(t);
  const base = lerp(0.22, 0.35, easeOut(p / 0.5));
  return { alpha: isKnown ? 1 : base, isKnown };
}

function ctaOpts(el, t) {
  const { p } = local(t, SCENES.cta);
  const isKnown = KNOWN_ORDER.includes(el.s);
  return { alpha: lerp(isKnown ? 1 : 0.35, 0.16, easeInOut(p / 0.8)), isKnown };
}

function drawTableLayer(ctx, t) {
  if (t < SCENES.build[0]) return;
  const tr = tableTransform(t);
  if (t < SCENES.regions[0]) drawTable(ctx, tr, (el) => buildOpts(el, t));
  else if (t < SCENES.cards[0]) drawTable(ctx, tr, (el) => regionOpts(el, t));
  else if (t < SCENES.known[0]) drawTable(ctx, tr, (el) => cardOpts(el, t));
  else if (t < SCENES.cta[0]) drawTable(ctx, tr, (el) => knownOpts(el, t));
  else drawTable(ctx, tr, (el) => ctaOpts(el, t));
}

// ---------- Escenas de texto ----------
function sceneTitle(ctx, t) {
  const { p, len } = local(t, SCENES.title);
  const out = 1 - easeInOut((p - (len - 0.5)) / 0.5);
  const step = (d) => easeOut((p - d) / 0.7) * out;
  const rise = (d) => (1 - easeOut((p - d) / 0.8)) * 24;
  ctx.save();
  ctx.globalAlpha = step(0);
  kicker(ctx, `Glosario visual · ${UPDATED}`, MARGIN, 380 + rise(0));
  ctx.globalAlpha = step(0.15);
  text(ctx, "La tabla periódica", MARGIN - 4, 500 + rise(0.15), { size: 104, family: "Sans Bold" });
  text(ctx, "de la IA.", MARGIN - 4, 612 + rise(0.15), { size: 104, family: "Sans Bold", color: MUTED });
  ctx.globalAlpha = step(0.4);
  paragraph(ctx, "120 términos para entender de qué habla todo el mundo.", MARGIN, 700 + rise(0.4), 760, { size: 36 });
  ctx.restore();
  drawTitleArt(ctx, p, out);
}

function drawTitleArt(ctx, p, out) {
  const tiles = [
    { s: "Ia", x: 1150, y: 190, d: 0.2 },
    { s: "Mcp", x: 1470, y: 330, d: 0.35 },
    { s: "Agi", x: 1190, y: 530, d: 0.5 },
  ];
  tiles.forEach((tile, i) => {
    const q = easeOut((p - tile.d) / 0.9);
    const drift = Math.sin(p * 0.9 + i * 1.7) * 6;
    drawTile(ctx, bySymbol[tile.s], tile.x, tile.y + (1 - q) * 40 + drift, 250, 275, {
      alpha: q * out,
      lift: i === 1 ? 0.6 : 0,
    });
  });
}

function gapTextX() {
  return FULL.x + GAP_AREA.x + 36;
}

function sceneBuild(ctx, t) {
  const { p, len } = local(t, SCENES.build);
  const a = envelope(p - 2.0, len - 2.0, 0.6, 0.4);
  const x = gapTextX();
  ctx.save();
  ctx.globalAlpha = a;
  kicker(ctx, "120 términos · 12 familias", x, FULL.y + 92);
  text(ctx, "Cada término, en su sitio.", x, FULL.y + 168, { size: 60, family: "Sans Bold" });
  text(ctx, "Ordenados como la tabla de Mendeléyev.", x, FULL.y + 222, { size: 30, color: MUTED });
  ctx.restore();
}

function sceneRegions(ctx, t) {
  const { p } = local(t, SCENES.regions);
  const idx = Math.min(REGIONS.length - 1, Math.floor(p / REGION_LEN));
  const region = REGIONS[idx];
  const rp = p - idx * REGION_LEN;
  const x = gapTextX();
  ctx.save();
  ctx.globalAlpha = envelope(rp, REGION_LEN, 0.35, 0.3);
  kicker(ctx, `${String(idx + 1).padStart(2, "0")} / 04`, x, FULL.y + 92, catById[region.cats[0]].color);
  text(ctx, region.title, x, FULL.y + 168 + (1 - easeOut(rp / 0.4)) * 12, { size: 60, family: "Sans Bold" });
  paragraph(ctx, region.text, x, FULL.y + 222, GAP_AREA.w - 72, { size: 30 });
  ctx.restore();
}

function sceneCards(ctx, t) {
  const { p, len } = local(t, SCENES.cards);
  const idx = Math.min(CARDS.length - 1, Math.floor(p / CARD_LEN));
  const delay = idx === 0 ? 0.6 : 0;
  const cp = p - idx * CARD_LEN;
  ctx.save();
  ctx.globalAlpha = envelope(cp - delay, CARD_LEN - delay, 0.5, 0.35);
  ctx.translate(0, (1 - easeOut((cp - delay) / 0.6)) * 20);
  if (CARDS[idx].models) drawModelsCard(ctx, CARDS[idx], cp - delay);
  else drawTermCard(ctx, CARDS[idx]);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = envelope(p - 0.6, len - 0.6, 0.5, 0.35);
  const counter = `${String(idx + 1).padStart(2, "0")} / ${String(CARDS.length).padStart(2, "0")}`;
  text(ctx, counter, MARGIN, 220, { size: 22, family: "Mono", color: MUTED });
  ctx.restore();
}

function drawTermCard(ctx, card) {
  const el = bySymbol[card.s];
  const cat = catById[el.cat];
  const top = 300;
  kicker(ctx, `Novedad · ${cat.name}`, MARGIN, top, cat.color);
  drawTile(ctx, el, MARGIN, top + 40, 150, 165);
  const tx = MARGIN + 190;
  fitFont(ctx, el.n, 500, 60, "Sans Bold");
  ctx.fillStyle = TEXT;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(el.n, tx, top + 130);
  text(ctx, String(el.y ?? ""), tx, top + 180, { size: 26, family: "Mono", color: MUTED });
  paragraph(ctx, card.c, MARGIN, top + 300, 680, { size: 36, color: TEXT });
}

function drawModelsCard(ctx, card, cp) {
  const top = 300;
  kicker(ctx, `Modelos · actualizada a ${UPDATED}`, MARGIN, top, catById.models.color);
  text(ctx, "Lo último, ya dentro.", MARGIN, top + 100, { size: 64, family: "Sans Bold" });
  card.rows.forEach(([sym, name, date], i) => {
    const y = top + 210 + i * 80;
    ctx.save();
    ctx.globalAlpha *= easeOut((cp - 0.3 - i * 0.15) / 0.5);
    ctx.fillStyle = LINE;
    ctx.fillRect(MARGIN, y - 50, 720, 1);
    text(ctx, sym, MARGIN, y, { size: 30, family: "Sans Bold", color: catById.models.color });
    text(ctx, name, MARGIN + 80, y, { size: 34, color: TEXT });
    text(ctx, date, MARGIN + 720, y, { size: 26, family: "Mono", color: MUTED, align: "right" });
    ctx.restore();
  });
}

function sceneKnown(ctx, t) {
  const { p, len } = local(t, SCENES.known);
  const top = 330;
  ctx.save();
  ctx.globalAlpha = envelope(p, len, 0.5, 0.4);
  kicker(ctx, "Pruébala", MARGIN, top);
  text(ctx, "Marca lo que ya dominas.", MARGIN, top + 100, { size: 64, family: "Sans Bold" });
  paragraph(ctx, "La tabla lleva la cuenta por ti.", MARGIN, top + 160, 720, { size: 34 });
  const count = knownCount(t);
  const labelW = text(ctx, "Conoces ", MARGIN, top + 330, { size: 40, family: "Mono", color: MUTED });
  const countW = text(ctx, String(count), MARGIN + labelW, top + 330, { size: 40, family: "Mono", color: TEXT });
  text(ctx, "/120", MARGIN + labelW + countW, top + 330, { size: 40, family: "Mono", color: MUTED });
  ctx.fillStyle = LINE;
  ctx.fillRect(MARGIN, top + 362, 720, 4);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(MARGIN, top + 362, 720 * (count / 120), 4);
  ctx.restore();
}

function sceneCta(ctx, t) {
  const { p } = local(t, SCENES.cta);
  const step = (d) => easeOut((p - d) / 0.6);
  const top = 330;
  ctx.save();
  ctx.globalAlpha = step(0.2);
  kicker(ctx, "Gratis · open source · MIT", MARGIN, top);
  ctx.globalAlpha = step(0.35);
  text(ctx, "Explórala en tu navegador.", MARGIN, top + 100, { size: 72, family: "Sans Bold" });
  ctx.globalAlpha = step(0.6);
  setFont(ctx, 40, "Mono");
  const urlW = ctx.measureText(URL_TEXT).width;
  ctx.beginPath();
  ctx.roundRect(MARGIN, top + 160, urlW + 64, 84, 12);
  ctx.fillStyle = SURFACE;
  ctx.fill();
  ctx.strokeStyle = rgba(ACCENT, 0.6);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, URL_TEXT, MARGIN + 32, top + 214, { size: 40, family: "Mono", color: TEXT });
  ctx.globalAlpha = step(0.85);
  text(ctx, `Código: ${REPO_TEXT}`, MARGIN, top + 320, { size: 28, color: MUTED });
  text(ctx, AUTHOR, MARGIN, top + 370, { size: 28, color: MUTED });
  ctx.restore();
}

// Cabecera discreta y barra de progreso: el marco típico de un vídeo de LinkedIn.
function drawChrome(ctx, t) {
  const a = easeOut((t - SCENES.build[0]) / 0.6) * (1 - easeOut((t - SCENES.cta[0]) / 0.5));
  if (a > 0) {
    ctx.save();
    ctx.globalAlpha = a;
    text(ctx, "Tabla Periódica de la IA", MARGIN, 72, { size: 22, family: "Mono", color: MUTED });
    text(ctx, AUTHOR, W - MARGIN, 72, { size: 22, family: "Mono", color: MUTED, align: "right" });
    ctx.restore();
  }
  ctx.fillStyle = LINE;
  ctx.fillRect(0, H - 4, W, 4);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, H - 4, W * (t / DURATION), 4);
}

function drawFrame(ctx, t) {
  ctx.drawImage(bgCanvas, 0, 0);
  drawTableLayer(ctx, t);
  if (t < SCENES.title[1]) sceneTitle(ctx, t);
  else if (t < SCENES.regions[0]) sceneBuild(ctx, t);
  else if (t < SCENES.cards[0]) sceneRegions(ctx, t);
  else if (t < SCENES.known[0]) sceneCards(ctx, t);
  else if (t < SCENES.cta[0]) sceneKnown(ctx, t);
  else sceneCta(ctx, t);
  drawChrome(ctx, t);
  const fadeOut = clamp((t - (DURATION - 0.6)) / 0.6);
  if (fadeOut > 0) {
    ctx.fillStyle = rgba(BG, fadeOut);
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------- Salida ----------
function renderStills(times) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  times.forEach((t) => {
    drawFrame(ctx, t);
    const file = join(OUT, `still-${t}.png`);
    writeFileSync(file, canvas.toBuffer("image/png"));
    console.info(`→ ${file}`);
  });
}

function writeFrame(stream, buf) {
  return stream.write(buf) ? Promise.resolve() : new Promise((res) => stream.once("drain", res));
}

async function renderVideo() {
  const mp4 = join(OUT, "promo.mp4");
  const ffmpeg = spawn("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", String(FPS), "-i", "pipe:0",
    "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", mp4,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => {
    ffmpeg.on("error", rej);
    ffmpeg.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg salió con código ${code}`))));
  });

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const totalFrames = Math.round(DURATION * FPS);
  for (let f = 0; f < totalFrames; f++) {
    drawFrame(ctx, f / FPS);
    const { data } = ctx.getImageData(0, 0, W, H);
    await writeFrame(ffmpeg.stdin, Buffer.from(data.buffer, data.byteOffset, data.byteLength));
    if (f % 150 === 0) process.stdout.write(`frame ${f}/${totalFrames}\n`);
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
