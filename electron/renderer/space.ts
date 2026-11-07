/**
 * Пиксельный космический фон.
 * Рисуем в низком разрешении 480×270, а CSS растягивает его
 * с image-rendering: pixelated — получаются крупные «пиксели».
 *
 * Сцена: фиолетовая галактика, яркая чёрная дыра справа,
 * планета с кольцами, силуэт города на горизонте,
 * пульсары, падающие звёзды.
 */

const W = 480;
const H = 270;

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

const canvas = document.getElementById("space") as HTMLCanvasElement | null;
if (canvas) init(canvas);

function init(target: HTMLCanvasElement) {
  const ctx = target.getContext("2d");
  if (!ctx) return;

  target.width = W;
  target.height = H;
  ctx.imageSmoothingEnabled = false;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Статичный слой (небо, галактика, планета, город) рисуем один раз.
  const staticLayer = document.createElement("canvas");
  staticLayer.width = W;
  staticLayer.height = H;
  const staticCtx = staticLayer.getContext("2d");
  if (!staticCtx) return;
  drawStatic(staticCtx);

  const stars = createStars();
  const pulsars = createPulsars();
  const meteors: Meteor[] = [];
  let nextMeteorAt = 1200;

  const frame = (now: number) => {
    ctx.drawImage(staticLayer, 0, 0);
    drawStars(ctx, stars, now);
    drawPulsars(ctx, pulsars, now);
    drawBlackHole(ctx, 410, 28, now);
    updateMeteors(ctx, meteors);

    if (now > nextMeteorAt) {
      meteors.push(spawnMeteor());
      nextMeteorAt = now + 3200 + Math.random() * 4800;
    }
  };

  if (reduced) {
    frame(0);
    return;
  }

  let last = 0;
  const loop = (now: number) => {
    requestAnimationFrame(loop);
    // ~15 кадров в секунду — так анимация выглядит «пиксельно».
    if (now - last < 66) return;
    last = now;
    frame(now);
  };
  requestAnimationFrame(loop);
}

function drawStatic(ctx: CanvasRenderingContext2D) {
  // Небо: тёмный верх, фиолетовое свечение у горизонта.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#04020b");
  sky.addColorStop(0.28, "#12052b");
  sky.addColorStop(0.52, "#240848");
  sky.addColorStop(0.7, "#3d0c63");
  sky.addColorStop(0.8, "#61207f");
  sky.addColorStop(0.86, "#26093d");
  sky.addColorStop(1, "#07020f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  nebula(ctx, W * 0.3, H * 0.36, 190, "rgba(140, 55, 235, 0.36)");
  nebula(ctx, W * 0.68, H * 0.18, 150, "rgba(75, 30, 165, 0.36)");
  nebula(ctx, W * 0.86, H * 0.72, 170, "rgba(190, 60, 220, 0.24)");
  nebula(ctx, W * 0.12, H * 0.74, 170, "rgba(52, 25, 145, 0.3)");
  nebula(ctx, W * 0.5, H * 0.55, 240, "rgba(110, 32, 190, 0.18)");
  nebula(ctx, W * 0.6, H * 0.08, 140, "rgba(220, 80, 220, 0.14)");

  // Галактика-спираль.
  drawGalaxy(ctx, 160, 96, -0.42);

  // Далёкая звёздная пыль.
  for (let i = 0; i < 420; i++) {
    const alpha = 0.05 + Math.random() * 0.16;
    ctx.fillStyle = `rgba(200, 180, 255, ${alpha.toFixed(3)})`;
    ctx.fillRect(
      Math.floor(Math.random() * W),
      Math.floor(Math.random() * H),
      1,
      1
    );
  }

  // Планета с кольцами внизу справа.
  drawPlanet(ctx, 314, 250, 22);
  // Маленькая планета справа сверху.
  drawPlanet(ctx, 448, 14, 9);

  // Силуэт города на горизонте.
  drawCity(ctx);
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
  rotation: number
) {
  // Ядро.
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 62);
  core.addColorStop(0, "rgba(255, 245, 255, 0.7)");
  core.addColorStop(0.3, "rgba(210, 160, 255, 0.4)");
  core.addColorStop(1, "rgba(120, 50, 210, 0)");
  ctx.fillStyle = core;
  ctx.fillRect(cx - 70, cy - 70, 140, 140);

  const colors = ["#f6eeff", "#d8bcff", "#b48cff", "#ff9df0", "#9f7bff"];
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
  radius: number
) {
  // Кольцо (рисуем до планеты, чтобы оно уходило за неё).
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.32);
  ctx.scale(1, 0.34);
  ctx.strokeStyle = "rgba(190, 130, 255, 0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 210, 255, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Тело планеты.
  const body = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  body.addColorStop(0, "#7a4fc4");
  body.addColorStop(0.5, "#3c2068");
  body.addColorStop(1, "#160a2c");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Тёмные полосы.
  ctx.fillStyle = "rgba(10, 4, 24, 0.4)";
  for (const [offset, height] of [
    [-7, 3],
    [1, 4],
    [10, 3],
  ] as const) {
    const half = Math.sqrt(Math.max(0, radius * radius - (offset + height) ** 2));
    ctx.fillRect(cx - half, cy + offset, half * 2, height);
  }

  // Блик.
  ctx.fillStyle = "rgba(200, 160, 255, 0.5)";
  ctx.beginPath();
  ctx.arc(cx - radius * 0.35, cy - radius * 0.35, Math.max(2, radius * 0.2), 0, Math.PI * 2);
  ctx.fill();
}

function drawCity(ctx: CanvasRenderingContext2D) {
  const baseY = H - 16;

  // Тёмная земля.
  ctx.fillStyle = "#08030f";
  ctx.fillRect(0, baseY + 6, W, H - baseY - 6);

  // Дальние небоскрёбы.
  let x = -6;
  while (x < W) {
    const width = 7 + Math.floor(Math.random() * 14);
    const height = 10 + Math.floor(Math.random() * 34);
    const top = baseY - height;

    ctx.fillStyle = Math.random() < 0.5 ? "#0d0520" : "#120629";
    ctx.fillRect(x, top, width, height + 18);

    // Фиолетовый контровой свет по краю.
    ctx.fillStyle = "rgba(168, 92, 255, 0.28)";
    ctx.fillRect(x, top, width, 1);

    // Окна.
    if (height > 16) {
      for (let wy = top + 4; wy < baseY - 2; wy += 5) {
        for (let wx = x + 2; wx < x + width - 2; wx += 4) {
          if (Math.random() < 0.18) {
            ctx.fillStyle =
              Math.random() < 0.5
                ? "rgba(255, 170, 255, 0.75)"
                : "rgba(120, 220, 255, 0.7)";
            ctx.fillRect(wx, wy, 1, 1);
          }
        }
      }
    }

    x += width + 2 + Math.floor(Math.random() * 4);
  }

  // Передний план — почти чёрные зубцы.
  ctx.fillStyle = "#05010b";
  x = -4;
  while (x < W) {
    const width = 14 + Math.floor(Math.random() * 26);
    const height = 4 + Math.floor(Math.random() * 15);
    ctx.fillRect(x, H - height, width, height);
    x += width + 1;
  }
}

function createStars(): Star[] {
  const colors = ["#f6f1ff", "#d8c8ff", "#b48cff", "#ffd9f6", "#9fd4ff"];
  const stars: Star[] = [];
  for (let i = 0; i < 180; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.7,
      color: colors[Math.floor(Math.random() * colors.length)] as string,
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

function createPulsars(): Pulsar[] {
  return [
    { x: 78, y: 62, phase: 0, color: "#c9a7ff" },
    { x: 214, y: 26, phase: 2.1, color: "#ffc7f0" },
    { x: 340, y: 176, phase: 4.2, color: "#9fd4ff" },
    { x: 62, y: 168, phase: 1.2, color: "#a4ffe4" },
  ];
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
  now: number
) {
  const pulse = 1 + Math.sin(now / 1400) * 0.03;

  // Внешнее свечение.
  const glow = ctx.createRadialGradient(cx, cy, 8, cx, cy, 86 * pulse);
  glow.addColorStop(0, "rgba(255, 225, 255, 0.5)");
  glow.addColorStop(0.3, "rgba(205, 130, 255, 0.32)");
  glow.addColorStop(0.65, "rgba(120, 60, 220, 0.16)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 90, cy - 90, 180, 180);

  // Аккреционный диск: яркий внутри, фиолетовый снаружи.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.36);
  ctx.scale(1, 0.4);

  // Полупрозрачная заливка диска, чтобы кольца не выглядели полосами.
  ctx.fillStyle = "rgba(205, 140, 255, 0.2)";
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, Math.PI * 2);
  ctx.fill();

  for (let r = 17; r <= 44; r += 3) {
    const t = (r - 17) / 27;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${255 - Math.round(t * 70)}, ${
      240 - Math.round(t * 110)
    }, 255, ${(0.95 - t * 0.55).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Внутреннее белое кольцо.
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

  ctx.strokeStyle = "rgba(255, 235, 255, 0.9)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 15 * pulse, 0, Math.PI * 2);
  ctx.stroke();
}

function spawnMeteor(): Meteor {
  const colors = ["#e8dcff", "#ffb8f4", "#b48cff", "#9fd4ff"];
  return {
    x: Math.random() * W * 0.75,
    y: -4,
    vx: 3.4 + Math.random() * 1.6,
    vy: 1.8 + Math.random() * 1,
    color: colors[Math.floor(Math.random() * colors.length)] as string,
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
