/**
 * Gera os quatro fundos raster da Dolla (Manhã, Tarde, Noite e Madrugada).
 *
 * Por que existe: a versão anterior desenhava a cena inteira em
 * `react-native-svg` (16 raios de sol, 54 estrelas, 46 raios da explosão,
 * 22 bolhas…). No Android, trocar de tema obrigava o Yoga/Skia a recriar
 * centenas de nós por transição — era o "lag de tema" que a usuária sentiu.
 * Rasterizar a arte uma única vez e trocar duas <Image> com crossfade custa
 * ~2 draws em vez de ~200.
 *
 * Uso:
 *   node scripts/generate-theme-backgrounds.cjs
 *   node scripts/generate-theme-backgrounds.cjs --width=1440 --height=2880
 *
 * Requisitos: Google Chrome (o próprio script acha o executável) — o desenho
 * é vetorial (SVG) e o Chrome é quem rasteriza, então não há dependência nova
 * no `package.json`. Saída: `assets/brand/backgrounds/<cena>.png`, 2160×4320
 * (4K vertical), `viewBox` 400×800 com `preserveAspectRatio="xMidYMid slice"`
 * — exatamente o mesmo recorte que o componente usava.
 *
 * A geometria abaixo é a que vivia em `components/theme-background.tsx`
 * (mesmas sementes do gerador determinístico, mesmas opacidades). Ela é a
 * fonte da arte a partir de agora: se a ilustração mudar, mude aqui e rode o
 * script de novo.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'brand', 'backgrounds');
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 800;

/* ------------------------------------------------------------------ *
 * Paletas (espelho de `themePalettes` em `lib/theme-runtime.ts`)
 * ------------------------------------------------------------------ */

const PALETTES = {
  manha: {
    accent: '#FFB259',
    accentAlt: '#FF8A5B',
    deep: '#7C5A82',
    glow: '#FFE6A8',
    sky: ['#A7C0EE', '#FFD3A0', '#EDA37E'],
    soft: '#FFF6E9',
  },
  tarde: {
    accent: '#4FD3F0',
    accentAlt: '#1E88C7',
    deep: '#0F3A66',
    glow: '#BFF3FF',
    sky: ['#DFF6FF', '#BFEAFA', '#8FD3EE'],
    soft: '#E8FBFF',
  },
  noite: {
    accent: '#FF7A5C',
    accentAlt: '#9B4DCA',
    deep: '#150A1F',
    glow: '#FFC46B',
    sky: ['#1B1023', '#4A1E52', '#C24E5A'],
    soft: '#FFE6C7',
  },
  madrugada: {
    accent: '#00E5FF',
    accentAlt: '#E34BFF',
    deep: '#0A0718',
    glow: '#7DF9FF',
    sky: ['#080A12', '#170933', '#2B0F52'],
    soft: '#F4F7FF',
  },
};

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Gerador determinístico: a cena não pode "tremer" entre execuções. */
function seeded(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const round = value => Math.round(value * 100) / 100;

/* ------------------------------------------------------------------ *
 * Geometria (idêntica à do componente vetorial)
 * ------------------------------------------------------------------ */

const SUN_RAYS = Array.from({ length: 16 }, (_, index) => {
  const angle = (-160 + index * 13.4) * (Math.PI / 180);
  const length = 130 + (index % 3) * 58;
  return {
    length,
    opacity: 0.22 + (index % 4) * 0.07,
    width: index % 4 === 0 ? 2.6 : 1.4,
    x2: 200 + Math.cos(angle) * length,
    y2: 268 + Math.sin(angle) * length,
  };
});

const STARS = (() => {
  const random = seeded(20261021);
  return Array.from({ length: 54 }, () => ({
    opacity: 0.3 + random() * 0.6,
    r: 0.6 + random() * 1.5,
    x: Math.round(random() * CANVAS_WIDTH * 10) / 10,
    y: Math.round(random() * 560 * 10) / 10,
  }));
})();

const BURST_RAYS = (() => {
  const random = seeded(48271);
  return Array.from({ length: 46 }, (_, index) => {
    const angle = (index / 46) * Math.PI * 2 + random() * 0.08;
    const length = 70 + random() * 260;
    return {
      cyan: index % 3 !== 0,
      opacity: 0.16 + random() * 0.5,
      width: 0.8 + random() * 2,
      x1: 286,
      x2: 286 + Math.cos(angle) * length,
      y1: 262,
      y2: 262 + Math.sin(angle) * length,
    };
  });
})();

const BUBBLES = (() => {
  const random = seeded(7919);
  return Array.from({ length: 22 }, () => ({
    opacity: 0.25 + random() * 0.5,
    r: 2 + random() * 9,
    x: 10 + random() * 380,
    y: 360 + random() * 400,
  }));
})();

const SPARKS = [
  { o: 0.8, r: 9, x: 74, y: 170 },
  { o: 0.55, r: 6, x: 330, y: 120 },
  { o: 0.7, r: 7, x: 250, y: 420 },
  { o: 0.45, r: 5, x: 120, y: 90 },
  { o: 0.6, r: 6, x: 356, y: 330 },
];

/* ------------------------------------------------------------------ *
 * Cenas
 * ------------------------------------------------------------------ */

function sparkle({ color, opacity, r, x, y }) {
  const d = `M${round(x)} ${round(y - r)} Q${round(x)} ${round(y)} ${round(x + r)} ${round(y)} Q${round(x)} ${round(y)} ${round(x)} ${round(y + r)} Q${round(x)} ${round(y)} ${round(x - r)} ${round(y)} Q${round(x)} ${round(y)} ${round(x)} ${round(y - r)} Z`;
  return `<path d="${d}" fill="${color}" opacity="${round(opacity)}"/>`;
}

function sky(spec) {
  const stops = spec.sky
    .map((color, index) => `<stop offset="${[0, 0.52, 1][index]}" stop-color="${color}"/>`)
    .join('');
  return `<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>
  <radialGradient id="sun">
    <stop offset="0" stop-color="${hexToRgba(spec.glow, 0.95)}"/>
    <stop offset="0.45" stop-color="${hexToRgba(spec.glow, 0.34)}"/>
    <stop offset="1" stop-color="${hexToRgba(spec.glow, 0)}"/>
  </radialGradient>
  <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${spec.accent}"/>
    <stop offset="1" stop-color="${spec.accentAlt}"/>
  </linearGradient>
</defs>
<rect x="0" y="0" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="url(#sky)"/>`;
}

function manha(spec) {
  const rays = SUN_RAYS.map(
    ray =>
      `<line x1="200" y1="268" x2="${round(ray.x2)}" y2="${round(ray.y2)}" stroke="url(#beam)" stroke-width="${ray.width}" stroke-linecap="round" opacity="${round(ray.opacity)}"/>`,
  ).join('');
  const sparkles = SPARKS.slice(0, 4)
    .map(spark => sparkle({ color: spec.soft, opacity: spark.o * 0.8, r: spark.r, x: spark.x, y: spark.y - 70 }))
    .join('');
  const glints = Array.from({ length: 9 }, (_, index) => {
    const width = 150 - index * 9;
    return `<rect x="${125 + index * 5}" y="${604 + index * 22}" width="${width}" height="2.4" rx="1.2" fill="${spec.glow}" opacity="${round(0.45 - index * 0.035)}"/>`;
  }).join('');
  return `${sky(spec)}
<circle cx="200" cy="268" r="150" fill="url(#sun)"/>
<circle cx="200" cy="268" r="46" fill="${hexToRgba(spec.soft, 0.96)}"/>
${rays}
<path d="M18 214 q26 -16 54 -6 q22 -16 48 -2 q24 -10 44 4 l0 9 l-146 0 z" fill="${spec.soft}" opacity="0.4"/>
<path d="M268 168 q22 -12 44 -4 q18 -12 40 0 q20 -6 36 6 l0 8 l-120 0 z" fill="${spec.soft}" opacity="0.28"/>
${sparkles}
<path d="M0 512 L66 462 L124 502 L196 438 L262 496 L330 452 L400 500 L400 800 L0 800 Z" fill="${spec.accentAlt}" opacity="0.32"/>
<path d="M0 556 L86 514 L152 548 L232 494 L306 544 L400 510 L400 800 L0 800 Z" fill="${spec.deep}" opacity="0.55"/>
<rect x="0" y="570" width="${CANVAS_WIDTH}" height="230" fill="${spec.deep}" opacity="0.55"/>
${glints}`;
}

function tarde(spec) {
  const bubbles = BUBBLES.map(
    (bubble, index) =>
      `<circle cx="${round(bubble.x)}" cy="${round(bubble.y)}" r="${round(bubble.r)}" fill="none" stroke="${index % 2 === 0 ? spec.glow : spec.soft}" stroke-width="1" opacity="${round(bubble.opacity)}"/>`,
  ).join('');
  const sparkles = SPARKS.slice(0, 3)
    .map(spark => sparkle({ color: spec.soft, opacity: spark.o * 0.7, r: spark.r, x: spark.x + 20, y: spark.y }))
    .join('');
  const waves = [
    { d: 'M0 430 C 60 396, 118 470, 186 438 C 250 408, 306 462, 400 418', color: spec.accent, opacity: 0.26 },
    { d: 'M0 492 C 74 452, 132 528, 206 492 C 272 460, 330 520, 400 476', color: spec.accentAlt, opacity: 0.38 },
    { d: 'M0 566 C 82 522, 140 600, 214 562 C 286 526, 340 590, 400 548', color: spec.deep, opacity: 0.62 },
    { d: 'M0 654 C 88 606, 152 686, 232 646 C 302 610, 350 668, 400 630', color: spec.deep, opacity: 0.82 },
  ];
  const bands = waves
    .map(wave => `<path d="${wave.d} L400 800 L0 800 Z" fill="${wave.color}" opacity="${wave.opacity}"/>`)
    .join('');
  return `${sky(spec)}
${bubbles}
${sparkles}
${bands}
<path d="${waves[0].d}" fill="none" stroke="url(#beam)" stroke-width="1.6" opacity="0.5"/>
<path d="${waves[1].d}" fill="none" stroke="${spec.glow}" stroke-width="1.2" opacity="0.4"/>`;
}

function noite(spec) {
  const stars = STARS.map(
    (star, index) =>
      `<circle cx="${round(star.x)}" cy="${round(star.y)}" r="${round(star.r)}" fill="${index % 7 === 0 ? spec.glow : spec.soft}" opacity="${round(star.opacity)}"/>`,
  ).join('');
  const sparkles = SPARKS.map(spark =>
    sparkle({ color: spec.soft, opacity: spark.o * 0.6, r: spark.r * 0.8, x: spark.x, y: spark.y + 40 }),
  ).join('');
  const reflections = Array.from({ length: 6 }, (_, index) => {
    const width = 72 - index * 8;
    return `<rect x="${164 + index * 4}" y="${664 + index * 18}" width="${width}" height="1.8" rx="0.9" fill="${spec.glow}" opacity="${round(0.3 - index * 0.035)}"/>`;
  }).join('');
  return `${sky(spec)}
<ellipse cx="200" cy="600" rx="210" ry="150" fill="url(#sun)"/>
<circle cx="200" cy="596" r="26" fill="${hexToRgba(spec.glow, 0.9)}"/>
${stars}
${sparkles}
<path d="M-10 190 q26 -34 66 -24 q16 -30 52 -22 q30 6 34 32 q30 0 34 26 l0 14 l-186 0 z" fill="${spec.accentAlt}" opacity="0.35"/>
<path d="M214 246 q22 -28 56 -20 q14 -24 44 -16 q26 6 30 26 q26 2 30 22 l0 12 l-160 0 z" fill="${spec.accentAlt}" opacity="0.26"/>
<path d="M40 330 q30 -28 70 -18 q18 -24 50 -14 q28 8 30 30 q26 4 28 22 l0 12 l-178 0 z" fill="${spec.deep}" opacity="0.5"/>
<path d="M-20 430 q30 -30 74 -20 q18 -26 52 -16 q30 8 32 32 q28 4 30 24 l0 12 l-188 0 z" fill="${spec.accentAlt}" opacity="0.22"/>
<path d="M0 640 L400 640 L400 800 L0 800 Z" fill="${spec.deep}" opacity="0.9"/>
<path d="M0 640 C 70 626, 130 656, 200 640 C 270 624, 330 652, 400 636" fill="none" stroke="url(#beam)" stroke-width="1.4" opacity="0.35"/>
${reflections}`;
}

function madrugada(spec) {
  const burst = BURST_RAYS.map(
    ray =>
      `<line x1="${ray.x1}" y1="${ray.y1}" x2="${round(ray.x2)}" y2="${round(ray.y2)}" stroke="${ray.cyan ? spec.accent : spec.accentAlt}" stroke-width="${round(ray.width)}" stroke-linecap="round" opacity="${round(ray.opacity)}"/>`,
  ).join('');
  const stars = STARS.map(
    (star, index) =>
      `<circle cx="${round(star.x)}" cy="${round((star.y + 120) % 700)}" r="${round(star.r)}" fill="${index % 5 === 0 ? spec.glow : spec.soft}" opacity="${round(star.opacity * 0.85)}"/>`,
  ).join('');
  const sparkles = [
    { o: 0.9, r: 16, x: 64, y: 96 },
    { o: 0.75, r: 11, x: 342, y: 140 },
    { o: 0.6, r: 8, x: 118, y: 460 },
    { o: 0.7, r: 6, x: 316, y: 606 },
  ]
    .map(spark => sparkle({ color: spec.soft, opacity: spark.o, r: spark.r, x: spark.x, y: spark.y }))
    .join('');
  return `${sky(spec)}
<ellipse cx="112" cy="214" rx="128" ry="86" fill="${spec.accentAlt}" opacity="0.16"/>
<ellipse cx="322" cy="520" rx="150" ry="110" fill="${spec.accent}" opacity="0.12"/>
<ellipse cx="286" cy="262" rx="54" ry="54" fill="${spec.soft}" opacity="0.14"/>
<circle cx="286" cy="262" r="6" fill="${spec.soft}" opacity="0.9"/>
${burst}
${stars}
${sparkles}`;
}

const SCENES = { manha, tarde, noite, madrugada };

/* ------------------------------------------------------------------ *
 * Rasterização (Chrome headless)
 * ------------------------------------------------------------------ */

function cliOption(name, fallback) {
  const match = process.argv.find(argument => argument.startsWith(`--${name}=`));
  return match ? Number(match.split('=')[1]) : fallback;
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  const found = candidates.find(candidate => fs.existsSync(candidate));
  if (!found) throw new Error('Chrome não encontrado. Defina CHROME_PATH ou instale o Google Chrome.');
  return found;
}

/** `IHDR` do PNG: largura/altura nos bytes 16-23. Confere o que o Chrome salvou. */
function pngSize(file) {
  const buffer = fs.readFileSync(file);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error(`${file} não é um PNG válido`);
  return { height: buffer.readUInt32BE(20), width: buffer.readUInt32BE(16) };
}

function htmlFor(scene, spec) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">${SCENES[scene](spec)}</svg>`;
  return `<!doctype html>
<html><head><meta charset="utf-8"/><style>
html,body{margin:0;padding:0;width:100%;height:100%;background:${spec.sky[2]};overflow:hidden}
svg{display:block;width:100%;height:100%}
</style></head><body>${svg}</body></html>`;
}

function rasterize({ chrome, height, htmlDir, width }) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dolla-bg-'));
  const files = [];
  for (const scene of Object.keys(SCENES)) {
    const html = path.join(htmlDir, `${scene}.html`);
    const png = path.join(OUT_DIR, `${scene}.png`);
    fs.writeFileSync(html, htmlFor(scene, PALETTES[scene]), 'utf8');
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--force-device-scale-factor=1',
      `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`,
      '--virtual-time-budget=2000',
      `--screenshot=${png}`,
      `file:///${html.replace(/\\/g, '/').replace(/^\//, '')}`,
    ];
    execFileSync(chrome, args, { stdio: 'ignore' });
    if (!fs.existsSync(png)) throw new Error(`Chrome não gerou ${png}`);
    const size = pngSize(png);
    files.push({ bytes: fs.statSync(png).size, scene, ...size });
  }
  fs.rmSync(profile, { force: true, recursive: true });
  return files;
}

function main() {
  const width = cliOption('width', 2160);
  const height = cliOption('height', 4320);
  const chrome = findChrome();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const htmlDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dolla-bg-html-'));
  try {
    const files = rasterize({ chrome, height, htmlDir, width });
    for (const file of files) {
      const kb = Math.round(file.bytes / 1024);
      console.log(`${file.scene}.png  ${file.width}x${file.height}  ${kb} KB`);
    }
  } finally {
    fs.rmSync(htmlDir, { force: true, recursive: true });
  }
}

main();

