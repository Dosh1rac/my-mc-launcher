/**
 * Пиксельный космический фон.
 * Рисуем в низком разрешении 480×270, а CSS растягивает его
 * с image-rendering: pixelated — получаются крупные «пиксели».
 *
 * Сцена: фиолетовая галактика, яркая чёрная дыра справа,
 * планета с кольцами, силуэт города на горизонте,
 * пульсары, падающие звёзды. Палитра зависит от темы.
 */

const W = 480;
const H = 270;

type Theme = "dark" | "light" | "pink";

type Star = {
  x: number;
  y: number;
  phase: number;
  speed: number;
  color: string;
  size: number;
};

type Meteor = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
};

type Pulsar = {
  x: number;
  y: number;
  phase: number;
  color: string;
};

interface Palette {
  sky: Array<[number, string]>;
  nebulae: Array<[number, number, number, string]>;
  galaxyCore: [string, string, string];
  galaxyColors: string[];
  dustRgb: string;
  dustAlpha: [number, number];
  starColors: string[];
  planetBody: [string, string, string];
  planetBands: string;
  planetRing: string;
  planetRing2: string;
  planetHighlight: string;
  cityBackA: string;
  cityBackB: string;
  cityEdge: string;
  windowA: string;
  windowB: string;
  cityFront: string;
  ground: string;
  bhGlow: [string, string, string];
  diskInner: [number, number, number];
  diskOuter: [number, number, number];
  eventRim: string;
  meteorColors: string[];
  pulsarColors: string[];
}

const PALETTES: Record<Theme, Palette> = {
  dark: {
    sky: [
      [0, "#04020b"],
      [0.28, "#12052b"],
      [0.52, "#240848"],
      [0.7, "#3d0c63"],
      [0.8, "#61207f"],
      [0.86, "#26093d"],
      [1, "#07020f"],
    ],
    nebulae: [
      [W * 0.3, H * 0.36, 190, "rgba(140, 55, 235, 0.36)"],
      [W * 0.68, H * 0.18, 150, "rgba(75, 30, 165, 0.36)"],
      [W * 0.86, H * 0.72, 170, "rgba(190, 60, 220, 0.24)"],
      [W * 0.12, H * 0.74, 170, "rgba(52, 25, 145, 0.3)"],
      [W * 0.5, H * 0.55, 240, "rgba(110, 32, 190, 0.18)"],
      [W * 0.6, H * 0.08, 140, "rgba(220, 80, 220, 0.14)"],
    ],
    galaxyCore: [
      "rgba(255, 245, 255, 0.7)",
      "rgba(210, 160, 255, 0.4)",
      "rgba(120, 50, 210, 0)",
    ],
    galaxyColors: ["#f6eeff", "#d8bcff", "#b48cff", "#ff9df0", "#9f7bff"],
    dustRgb: "200, 180, 255",
    dustAlpha: [0.05, 0.16],
    starColors: ["#f6f1ff", "#d8c8ff", "#b48cff", "#ffd9f6", "#9fd4ff"],
    planetBody: ["#7a4fc4", "#3c2068", "#160a2c"],
    planetBands: "rgba(10, 4, 24, 0.4)",
    planetRing: "rgba(190, 130, 255, 0.55)",
    planetRing2: "rgba(255, 210, 255, 0.3)",
    planetHighlight: "rgba(200, 160, 255, 0.5)",
    cityBackA: "#0d0520",
    cityBackB: "#120629",
    cityEdge: "rgba(168, 92, 255, 0.28)",
    windowA: "rgba(255, 170, 255, 0.75)",
    windowB: "rgba(120, 220, 255, 0.7)",
    cityFront: "#05010b",
    ground: "#08030f",
    bhGlow: [
      "rgba(255, 225, 255, 0.5)",
      "rgba(205, 130, 255, 0.32)",
      "rgba(120, 60, 220, 0)",
    ],
    diskInner: [255, 240, 255],
    diskOuter: [185, 130, 255],
    eventRim: "rgba(255, 235, 255, 0.9)",
    meteorColors: ["#e8dcff", "#ffb8f4", "#b48cff", "#9fd4ff"],
    pulsarColors: ["#c9a7ff", "#ffc7f0", "#9fd4ff", "#a4ffe4"],
  },

  light: {
    sky: [
      [0, "#fdfbff"],
      [0.28, "#f4ecff"],
      [0.52, "#eadcff"],
      [0.7, "#ffd9ec"],
      [0.8, "#ffc3e2"],
      [0.86, "#f7dcff"],
      [1, "#fff8fd"],
    ],
    nebulae: [
      [W * 0.3, H * 0.36, 190, "rgba(195, 150, 255, 0.26)"],
      [W * 0.68, H * 0.18, 150, "rgba(175, 150, 255, 0.22)"],
      [W * 0.86, H * 0.72, 170, "rgba(255, 150, 215, 0.22)"],
      [W * 0.12, H * 0.74, 170, "rgba(150, 190, 255, 0.2)"],
      [W * 0.5, H * 0.55, 240, "rgba(215, 170, 255, 0.14)"],
      [W * 0.6, H * 0.08, 140, "rgba(255, 160, 220, 0.14)"],
    ],
    galaxyCore: [
      "rgba(255, 255, 255, 0.95)",
      "rgba(220, 180, 255, 0.5)",
      "rgba(190, 150, 255, 0)",
    ],
    galaxyColors: ["#b07cff", "#ff8fd8", "#9a7bff", "#ffffff", "#d9b8ff"],
    dustRgb: "150, 120, 200",
    dustAlpha: [0.04, 0.13],
    starColors: ["#8b6bc4", "#c06bb0", "#7a8ccc", "#b88ad6"],
    planetBody: ["#e8d9ff", "#b991ea", "#7e5bb5"],
    planetBands: "rgba(110, 70, 160, 0.16)",
    planetRing: "rgba(160, 110, 220, 0.5)",
    planetRing2: "rgba(255, 255, 255, 0.75)",
    planetHighlight: "rgba(255, 255, 255, 0.85)",
    cityBackA: "#dcc9f2",
    cityBackB: "#d0b9e9",
    cityEdge: "rgba(140, 90, 210, 0.45)",
    windowA: "rgba(255, 170, 220, 0.9)",
    windowB: "rgba(140, 130, 255, 0.85)",
    cityFront: "#c8aee6",
    ground: "#ddc9f1",
    bhGlow: [
      "rgba(255, 255, 255, 0.65)",
      "rgba(220, 140, 255, 0.3)",
      "rgba(180, 120, 255, 0)",
    ],
    diskInner: [255, 170, 240],
    diskOuter: [140, 80, 220],
    eventRim: "rgba(255, 255, 255, 0.9)",
    meteorColors: ["#a855f7", "#ec4899", "#7c3aed", "#6366f1"],
    pulsarColors: ["#a855f7", "#ec4899", "#6366f1", "#0ea5e9"],
  },

  pink: {
    sky: [
      [0, "#fff7fc"],
      [0.28, "#ffe9f6"],
      [0.52, "#ffd4ec"],
      [0.7, "#ffb6dc"],
      [0.8, "#ff9fd0"],
      [0.86, "#ffd0e8"],
      [1, "#fff4fa"],
    ],
    nebulae: [
      [W * 0.3, H * 0.36, 190, "rgba(255, 140, 205, 0.28)"],
      [W * 0.68, H * 0.18, 150, "rgba(230, 110, 190, 0.24)"],
      [W * 0.86, H * 0.72, 170, "rgba(255, 120, 170, 0.22)"],
      [W * 0.12, H * 0.74, 170, "rgba(220, 140, 255, 0.22)"],
      [W * 0.5, H * 0.55, 240, "rgba(255, 150, 200, 0.14)"],
      [W * 0.6, H * 0.08, 140, "rgba(255, 120, 200, 0.16)"],
    ],
    galaxyCore: [
      "rgba(255, 255, 255, 0.95)",
      "rgba(255, 175, 220, 0.5)",
      "rgba(240, 120, 190, 0)",
    ],
    galaxyColors: ["#ff7ac8", "#ff4fa8", "#e879f9", "#ffffff", "#ffb3dd"],
    dustRgb: "220, 120, 180",
    dustAlpha: [0.04, 0.14],
    starColors: ["#c026a0", "#e05a9e", "#a855f7", "#d17bb0"],
    planetBody: ["#ffe0ef", "#ee9cc4", "#b04a7d"],
    planetBands: "rgba(150, 30, 90, 0.14)",
    planetRing: "rgba(230, 90, 160, 0.5)",
    planetRing2: "rgba(255, 255, 255, 0.8)",
    planetHighlight: "rgba(255, 255, 255, 0.9)",
    cityBackA: "#f2bcd8",
    cityBackB: "#eaaacb",
    cityEdge: "rgba(219, 39, 119, 0.4)",
    windowA: "rgba(255, 230, 240, 0.95)",
    windowB: "rgba(255, 150, 210, 0.8)",
    cityFront: "#e096bd",
    ground: "#f4c8df",
    bhGlow: [
      "rgba(255, 255, 255, 0.7)",
      "rgba(255, 120, 200, 0.34)",
      "rgba(200, 70, 160, 0)",
    ],
    diskInner: [255, 200, 240],
    diskOuter: [210, 60, 150],
    eventRim: "rgba(255, 240, 250, 0.95)",
    meteorColors: ["#ff9ad5", "#ff5fa8", "#d946ef", "#f472b6"],
    pulsarColors: ["#ff5fa8", "#d946ef", "#fb7185", "#a855f7"],
  },
};

function currentTheme(): Theme {
  const theme = document.documentElement.dataset.theme;
  return theme === "light" || theme === "pink" ? theme : "dark";
}

const canvas = document.getElementById("space") as HTMLCanvasElement | null;
if (canvas) init(canvas);

function init(target: HTMLCanvasElement) {
  const ctx = target.getContext("2d");
  if (!ctx) return;

  target.width = W;
  target.height = H;
  ctx.imageSmoothingEnabled = false;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let palette = PALETTES[currentTheme()];

  // Статичный слой (небо, галактика, планета, город) рисуем один раз.
  const staticLayer = document.createElement("canvas");
  staticLayer.width = W;
  staticLayer.height = H;
  const staticCtx = staticLayer.getContext("2d");
  if (!staticCtx) return;
  drawStatic(staticCtx, palette);

  let stars = createStars(palette);
  let pulsars = createPulsars(palette);
  const meteors: Meteor[] = [];
  let nextMeteorAt = 1200;

  const frame = (now: number) => {
    ctx.drawImage(staticLayer, 0, 0);
    drawStars(ctx, stars, now);
    drawPulsars(ctx, pulsars, now);
    drawBlackHole(ctx, 410, 28, now, palette);
    updateMeteors(ctx, meteors);

    if (now > nextMeteorAt) {
      meteors.push(spawnMeteor(palette));
      nextMeteorAt = now + 3200 + Math.random() * 4800;
    }
  };

  if (!reduced) {
    let last = 0;
    const loop = (now: number) => {
      requestAnimationFrame(loop);
      if (document.hidden) return;
      // ~15 кадров в секунду — так анимация выглядит «пиксельно».
      if (now - last < 66) return;
      last = now;
      frame(now);
    };
    requestAnimationFrame(loop);
  } else {
    frame(0);
  }

  // Перерисовываем сцену при смене темы.
  const observer = new MutationObserver(() => {
    palette = PALETTES[currentTheme()];
    drawStatic(staticCtx, palette);
    stars = createStars(palette);
    pulsars = createPulsars(palette);
    frame(performance.now());
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
}

function drawStatic(ctx: CanvasRenderingContext2D, palette: Palette) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  for (const [stop, color] of palette.sky) sky.addColorStop(stop, color);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  for (const [x, y, radius, color] of palette.nebulae) {
    nebula(ctx, x, y, radius, color);
  }

  // Галактика-спираль.
  drawGalaxy(ctx, 160, 96, -0.42, palette);

  // Далёкая звёздная пыль.
  for (let i = 0; i < 420; i++) {
    const alpha =
      palette.dustAlpha[0] +
      Math.random() * (palette.dustAlpha[1] - palette.dustAlpha[0]);
    ctx.fillStyle = `rgba(${palette.dustRgb}, ${alpha.toFixed(3)})`;
    ctx.fillRect(
      Math.floor(Math.random() * W),
      Math.floor(Math.random() * H),
      1,
      1
    );
  }

  // Планета с кольцами внизу справа.
  drawPlanet(ctx, 314, 250, 22, palette);
  // Маленькая планета справа сверху.
  drawPlanet(ctx, 448, 14, 9, palette);

  // Силуэт города на горизонте.
  drawCity(ctx, palette);
}

function nebula(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function gauss() {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

function drawGalaxy(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rotation: number,
  palette: Palette
) {
  // Ядро.
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 62);
  core.addColorStop(0, palette.galaxyCore[0]);
  core.addColorStop(0.3, palette.galaxyCore[1]);
  core.addColorStop(1, palette.galaxyCore[2]);
  ctx.fillStyle = core;
  ctx.fillRect(cx - 70, cy - 70, 140, 140);

  const colors = palette.galaxyColors;
  const arms = 3;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  for (let arm = 0; arm < arms; arm++) {
    for (let i = 0; i < 300; i++) {
      const t = i / 300;
      const angle = arm * ((Math.PI * 2) / arms) + t * 5.2;
      const radius = 12 + t * 176;
      const spread = 1.5 + t * 10;
      const x = Math.cos(angle) * radius + gauss() * spread;
      const y = (Math.sin(angle) * radius + gauss() * spread) * 0.38;

      const alpha = (0.2 + Math.random() * 0.55) * (1 - t * 0.4);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)] as string;

      const size = Math.random() < 0.8 ? 1 : 2;
      ctx.fillRect(Math.round(x), Math.round(y), size, size);
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawPlanet(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  palette: Palette
) {
  // Кольцо (рисуем до планеты, чтобы оно уходило за неё).
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.32);
  ctx.scale(1, 0.34);
  ctx.strokeStyle = palette.planetRing;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = palette.planetRing2;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Тело планеты.
  const body = ctx.createLinearGradient(
    cx - radius,
    cy - radius,
    cx + radius,
    cy + radius
  );
  body.addColorStop(0, palette.planetBody[0]);
  body.addColorStop(0.5, palette.planetBody[1]);
  body.addColorStop(1, palette.planetBody[2]);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Тёмные полосы.
  ctx.fillStyle = palette.planetBands;
  for (const [offset, height] of [
    [-7, 3],
    [1, 4],
    [10, 3],
  ] as const) {
    const half = Math.sqrt(
      Math.max(0, radius * radius - (offset + height) ** 2)
    );
    ctx.fillRect(cx - half, cy + offset, half * 2, height);
  }

  // Блик.
  ctx.fillStyle = palette.planetHighlight;
  ctx.beginPath();
  ctx.arc(
    cx - radius * 0.35,
    cy - radius * 0.35,
    Math.max(2, radius * 0.2),
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function drawCity(ctx: CanvasRenderingContext2D, palette: Palette) {
  const baseY = H - 16;

  // Земля.
  ctx.fillStyle = palette.ground;
  ctx.fillRect(0, baseY + 6, W, H - baseY - 6);

  // Дальние небоскрёбы.
  let x = -6;
  while (x < W) {
    const width = 7 + Math.floor(Math.random() * 14);
    const height = 10 + Math.floor(Math.random() * 34);
    const top = baseY - height;

    ctx.fillStyle = Math.random() < 0.5 ? palette.cityBackA : palette.cityBackB;
    ctx.fillRect(x, top, width, height + 18);

    // Контровой свет по краю.
    ctx.fillStyle = palette.cityEdge;
    ctx.fillRect(x, top, width, 1);

    // Окна.
    if (height > 16) {
      for (let wy = top + 4; wy < baseY - 2; wy += 5) {
        for (let wx = x + 2; wx < x + width - 2; wx += 4) {
          if (Math.random() < 0.18) {
            ctx.fillStyle =
              Math.random() < 0.5 ? palette.windowA : palette.windowB;
            ctx.fillRect(wx, wy, 1, 1);
          }
        }
      }
    }

    x += width + 2 + Math.floor(Math.random() * 4);
  }

  // Передний план — зубцы.
  ctx.fillStyle = palette.cityFront;
  x = -4;
  while (x < W) {
    const width = 14 + Math.floor(Math.random() * 26);
    const height = 4 + Math.floor(Math.random() * 15);
    ctx.fillRect(x, H - height, width, height);
    x += width + 1;
  }
}

function createStars(palette: Palette): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < 180; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.7,
      color: palette.starColors[
        Math.floor(Math.random() * palette.starColors.length)
      ] as string,
      size: Math.random() < 0.88 ? 1 : 2,
    });
  }
  return stars;
}

function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], now: number) {
  for (const star of stars) {
    const alpha =
      0.2 + 0.8 * Math.abs(Math.sin((now / 900) * star.speed + star.phase));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = star.color;
    const x = Math.round(star.x);
    const y = Math.round(star.y);
    ctx.fillRect(x, y, star.size, star.size);
    if (star.size === 2) ctx.fillRect(x + 1, y + 1, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function createPulsars(palette: Palette): Pulsar[] {
  const positions = [
    [78, 62, 0],
    [214, 26, 2.1],
    [340, 176, 4.2],
    [62, 168, 1.2],
  ] as const;

  return positions.map(([x, y, phase], index) => ({
    x,
    y,
    phase,
    color: palette.pulsarColors[index % palette.pulsarColors.length] as string,
  }));
}

function drawPulsars(
  ctx: CanvasRenderingContext2D,
  pulsars: Pulsar[],
  now: number
) {
  for (const p of pulsars) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 700 + p.phase);
    const beam = 3 + Math.round(pulse * 6);
    const alpha = 0.2 + pulse * 0.65;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;

    // Крестовидный луч — характерный вид пульсара.
    ctx.fillRect(Math.round(p.x) - beam, Math.round(p.y), beam * 2 + 1, 1);
    ctx.fillRect(Math.round(p.x), Math.round(p.y) - beam, 1, beam * 2 + 1);
    ctx.globalAlpha = Math.min(1, alpha + 0.3);
    ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawBlackHole(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  now: number,
  palette: Palette
) {
  const pulse = 1 + Math.sin(now / 1400) * 0.03;

  // Внешнее свечение.
  const glow = ctx.createRadialGradient(cx, cy, 8, cx, cy, 86 * pulse);
  glow.addColorStop(0, palette.bhGlow[0]);
  glow.addColorStop(0.3, palette.bhGlow[1]);
  glow.addColorStop(1, palette.bhGlow[2]);
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 90, cy - 90, 180, 180);

  // Аккреционный диск.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.36);
  ctx.scale(1, 0.4);

  const [ri, gi, bi] = palette.diskInner;
  const [ro, go, bo] = palette.diskOuter;

  // Полупрозрачная заливка, чтобы кольца не выглядели полосами.
  ctx.fillStyle = `rgba(${ro}, ${go}, ${bo}, 0.2)`;
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, Math.PI * 2);
  ctx.fill();

  for (let r = 17; r <= 44; r += 3) {
    const t = (r - 17) / 27;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(
      ${Math.round(ri + (ro - ri) * t)},
      ${Math.round(gi + (go - gi) * t)},
      ${Math.round(bi + (bo - bi) * t)},
      ${(0.95 - t * 0.5).toFixed(3)}
    )`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Внутреннее яркое кольцо.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  // Горизонт событий.
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(cx, cy, 14 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = palette.eventRim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 15 * pulse, 0, Math.PI * 2);
  ctx.stroke();
}

function spawnMeteor(palette: Palette): Meteor {
  return {
    x: Math.random() * W * 0.75,
    y: -4,
    vx: 3.4 + Math.random() * 1.6,
    vy: 1.8 + Math.random() * 1,
    color: palette.meteorColors[
      Math.floor(Math.random() * palette.meteorColors.length)
    ] as string,
  };
}

function updateMeteors(ctx: CanvasRenderingContext2D, meteors: Meteor[]) {
  for (let i = meteors.length - 1; i >= 0; i--) {
    const meteor = meteors[i] as Meteor;
    meteor.x += meteor.vx;
    meteor.y += meteor.vy;

    if (meteor.x > W + 12 || meteor.y > H + 12) {
      meteors.splice(i, 1);
      continue;
    }

    for (let k = 0; k < 10; k++) {
      const alpha = 0.7 * (1 - k / 10);
      ctx.fillStyle = meteor.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(
        Math.round(meteor.x - meteor.vx * k),
        Math.round(meteor.y - meteor.vy * k),
        k < 2 ? 2 : 1,
        k < 2 ? 2 : 1
      );
    }
    ctx.globalAlpha = 1;
  }
}
