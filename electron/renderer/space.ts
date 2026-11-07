/**
 * Пиксельный космический фон.
 * Рисуем в низком разрешении 320×180, а CSS растягивает его
 * с image-rendering: pixelated — получаются крупные «пиксели».
 */

const W = 320;
const H = 180;

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

  // Статичный слой (градиент, туманности, Млечный путь) рисуем один раз.
  const staticLayer = document.createElement("canvas");
  staticLayer.width = W;
  staticLayer.height = H;
  const staticCtx = staticLayer.getContext("2d");
  if (!staticCtx) return;
  drawStatic(staticCtx);

  const stars = createStars();
  const pulsars = createPulsars();
  const meteors: Meteor[] = [];
  let nextMeteorAt = 1800;

  const frame = (now: number) => {
    ctx.drawImage(staticLayer, 0, 0);
    drawStars(ctx, stars, now);
    drawPulsars(ctx, pulsars, now);
    drawBlackHole(ctx, 270, 14, now);
    updateMeteors(ctx, meteors);

    if (now > nextMeteorAt) {
      meteors.push(spawnMeteor());
      nextMeteorAt = now + 4500 + Math.random() * 5500;
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
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#04050c");
  sky.addColorStop(0.5, "#080a18");
  sky.addColorStop(1, "#02030a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  nebula(ctx, W * 0.2, H * 0.55, 115, "rgba(86, 44, 160, 0.18)");
  nebula(ctx, W * 0.78, H * 0.16, 95, "rgba(20, 110, 160, 0.15)");
  nebula(ctx, W * 0.6, H * 0.9, 120, "rgba(150, 30, 120, 0.12)");

  // Млечный путь — диагональная полоса из мелких точек.
  for (let i = 0; i < 700; i++) {
    const t = Math.random();
    const x = t * W;
    const y = (1 - t) * H * 0.85 + H * 0.08 + gauss() * 12;
    const alpha = 0.04 + Math.random() * 0.1;
    ctx.fillStyle = `rgba(205, 215, 255, ${alpha.toFixed(3)})`;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  // Далёкая звёздная пыль.
  for (let i = 0; i < 220; i++) {
    const alpha = 0.05 + Math.random() * 0.12;
    ctx.fillStyle = `rgba(175, 195, 255, ${alpha.toFixed(3)})`;
    ctx.fillRect(Math.floor(Math.random() * W), Math.floor(Math.random() * H), 1, 1);
  }
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

function createStars(): Star[] {
  const colors = ["#e8f1ff", "#cfe3ff", "#9fd4ff", "#ffe6b0", "#ffc7f0"];
  const stars: Star[] = [];
  for (let i = 0; i < 170; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.8,
      color: colors[Math.floor(Math.random() * colors.length)] as string,
      size: Math.random() < 0.88 ? 1 : 2,
    });
  }
  return stars;
}

function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], now: number) {
  for (const star of stars) {
    const alpha = 0.25 + 0.75 * Math.abs(Math.sin((now / 900) * star.speed + star.phase));
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
    { x: 52, y: 120, phase: 0, color: "#9fd4ff" },
    { x: 142, y: 28, phase: 2.1, color: "#ffc7f0" },
    { x: 96, y: 164, phase: 4.2, color: "#cfe3ff" },
    { x: 212, y: 132, phase: 1.2, color: "#a4ffe4" },
  ];
}

function drawPulsars(
  ctx: CanvasRenderingContext2D,
  pulsars: Pulsar[],
  now: number
) {
  for (const p of pulsars) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 700 + p.phase);
    const beam = 3 + Math.round(pulse * 5);
    const alpha = 0.25 + pulse * 0.6;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;

    // Крестовидный луч — характерный вид пульсара.
    ctx.fillRect(Math.round(p.x) - beam, Math.round(p.y), beam * 2 + 1, 1);
    ctx.fillRect(Math.round(p.x), Math.round(p.y) - beam, 1, beam * 2 + 1);
    ctx.globalAlpha = Math.min(1, alpha + 0.33);
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
  const pulse = 1 + Math.sin(now / 1400) * 0.035;

  const glow = ctx.createRadialGradient(cx, cy, 6, cx, cy, 58 * pulse);
  glow.addColorStop(0, "rgba(255, 190, 110, 0.42)");
  glow.addColorStop(0.45, "rgba(165, 105, 255, 0.26)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 62, cy - 62, 124, 124);

  // Аккреционный диск.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.38);
  ctx.scale(1, 0.34);
  for (let r = 17; r <= 30; r += 4) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle =
      r % 8 === 1 ? "rgba(255, 220, 150, 0.92)" : "rgba(200, 130, 255, 0.75)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  // Горизонт событий.
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(cx, cy, 12 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 235, 185, 0.85)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 13 * pulse, 0, Math.PI * 2);
  ctx.stroke();
}

function spawnMeteor(): Meteor {
  return {
    x: Math.random() * W * 0.7,
    y: -4,
    vx: 2.4 + Math.random() * 1.2,
    vy: 1.4 + Math.random() * 0.8,
  };
}

function updateMeteors(ctx: CanvasRenderingContext2D, meteors: Meteor[]) {
  for (let i = meteors.length - 1; i >= 0; i--) {
    const meteor = meteors[i] as Meteor;
    meteor.x += meteor.vx;
    meteor.y += meteor.vy;

    if (meteor.x > W + 10 || meteor.y > H + 10) {
      meteors.splice(i, 1);
      continue;
    }

    for (let k = 0; k < 6; k++) {
      const alpha = 0.55 * (1 - k / 6);
      ctx.fillStyle = `rgba(200, 230, 255, ${alpha.toFixed(3)})`;
      ctx.fillRect(
        Math.round(meteor.x - meteor.vx * k),
        Math.round(meteor.y - meteor.vy * k),
        1,
        1
      );
    }
  }
}
