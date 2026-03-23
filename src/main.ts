/* eslint-disable @typescript-eslint/no-explicit-any */
import './styles/style.css';

import Vector2D from './core/Vector2D';
import ParticleSystem from './core/ParticleSystem';
import {
  makeSparkClass,
  makeBubbleClass,
  makeConfettiClass,
  makeSnowClass,
  makeBounceClass,
  makeFlockClass,
  makeConstellationClass,
  makeRepulsorClass,
  makeOrbitalClass,
} from './particles/index';
import { initControls, updateStats, type ControlState } from './ui/controls';
import { renderDecoratorStack } from './ui/stack';
import Rect from './quadtree/Rect';

// ── Canvas setup ─────────────────────────────────────────────

const canvas = document.getElementById('c') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const qtCanvas = document.getElementById('qt-canvas') as HTMLCanvasElement;
const qtCtx = qtCanvas.getContext('2d')!;

type Bounds = { width: number; height: number };
let bounds: Bounds = { width: 0, height: 0 };
let system!: ParticleSystem;
let classes!: ReturnType<typeof buildClasses>;

function buildClasses(b: Bounds) {
  return {
    // Static classes (no runtime bounds needed)
    spark: makeSparkClass(),
    bubble: makeBubbleClass(),
    snow: makeSnowClass(),
    // Dynamic classes (need bounds for bounce/wrap)
    bouncer: makeBounceClass(b),
    flock: makeFlockClass(b),
    constellation: makeConstellationClass(b),
    repulsor: makeRepulsorClass(b),
    orbital: makeOrbitalClass(b),
  };
}

function resize(): void {
  const wrap = canvas.parentElement!;
  canvas.width = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
  bounds = { width: canvas.width, height: canvas.height };
  classes = buildClasses(bounds);
  if (system) system.resize(bounds);
  else system = new ParticleSystem(bounds);
  qtCanvas.width = qtCanvas.offsetWidth * devicePixelRatio;
  qtCanvas.height = qtCanvas.offsetHeight * devicePixelRatio;
}

window.addEventListener('resize', resize);
resize();

// ── State ─────────────────────────────────────────────────────

let currentMode = 'spark';

// ── UI wiring ─────────────────────────────────────────────────

const controls: ControlState = initControls({
  onModeChange(mode) {
    currentMode = mode;
    renderDecoratorStack(mode);
  },
  onClear() {
    system.clear();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  },
  onFill() {
    for (let i = 0; i < 200; i++) {
      spawnAt(rand(20, bounds.width - 20), rand(20, bounds.height - 20));
    }
  },
});

renderDecoratorStack('spark');

// ── Spawn ─────────────────────────────────────────────────────

function spawnAt(x: number, y: number): void {
  const angle = Math.random() * Math.PI * 2;
  const speed = rand(60, 160) * controls.spawnSpeed;

  // Sparks fire upward
  const vx = currentMode === 'spark' ? Math.cos(angle) * speed : Math.cos(angle) * speed;
  const vy = currentMode === 'spark' ? Math.sin(angle) * speed - 80 : Math.sin(angle) * speed;

  // Confetti needs a fresh class per instance (random color)
  const Cls = currentMode === 'confetti' ? makeConfettiClass() : classes[currentMode as keyof typeof classes];

  if (Cls) system.add(new Cls(new Vector2D(x, y), new Vector2D(vx, vy)));
}

// ── Input ─────────────────────────────────────────────────────

let mouseDown = false;

function getPos(e: MouseEvent | TouchEvent): [number, number] {
  const r = canvas.getBoundingClientRect();
  const s = 'touches' in e ? e.touches[0] : e;
  return [s.clientX - r.left, s.clientY - r.top];
}

canvas.addEventListener('mousedown', (e) => {
  mouseDown = true;
  const [x, y] = getPos(e);
  for (let i = 0; i < controls.spawnCount; i++) spawnAt(x + rand(-10, 10), y + rand(-10, 10));
});
canvas.addEventListener('mouseup', () => {
  mouseDown = false;
});
canvas.addEventListener('mousemove', (e) => {
  if (!mouseDown) return;
  const [x, y] = getPos(e);
  for (let i = 0; i < Math.ceil(controls.spawnCount / 4); i++) spawnAt(x + rand(-8, 8), y + rand(-8, 8));
});
canvas.addEventListener(
  'touchstart',
  (e) => {
    e.preventDefault();
    const [x, y] = getPos(e);
    for (let i = 0; i < controls.spawnCount; i++) spawnAt(x + rand(-10, 10), y + rand(-10, 10));
  },
  { passive: false }
);
canvas.addEventListener(
  'touchmove',
  (e) => {
    e.preventDefault();
    const [x, y] = getPos(e);
    for (let i = 0; i < Math.ceil(controls.spawnCount / 4); i++) spawnAt(x + rand(-8, 8), y + rand(-8, 8));
  },
  { passive: false }
);

// ── Render loop ───────────────────────────────────────────────

const PERCEPTION_RADIUS: Record<string, number> = {
  flock: 90,
  constellation: 110,
  repulsor: 55,
  orbital: 140,
  spark: 0,
  bubble: 0,
  confetti: 0,
  snow: 0,
  bouncer: 0,
};

let lastTime = performance.now();
let qtTick = 0;
const fpsArr: number[] = [];

function loop(now: number): void {
  requestAnimationFrame(loop);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  fpsArr.push(1 / dt);
  if (fpsArr.length > 30) fpsArr.shift();
  const fps = Math.round(fpsArr.reduce((a, b) => a + b, 0) / fpsArr.length);

  // Main canvas — motion blur trail
  ctx.fillStyle = 'rgba(3,5,13,0.2)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  system.update(dt);
  system.render(ctx, controls.showQt);

  // Perception radius debug ring
  if (controls.showRadius && system.all.length > 0) {
    const r = PERCEPTION_RADIUS[currentMode] ?? 80;
    if (r > 0) {
      const p = system.all[0];
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Stats
  let avgNeighbors = 0;
  const r = PERCEPTION_RADIUS[currentMode] ?? 0;
  if (r > 0 && system.all.length > 0) {
    const sample = system.all[Math.floor(Math.random() * system.all.length)];
    const buf: any[] = [];
    system.quadTree.query(Rect.circle(sample.position.x, sample.position.y, r), buf);
    avgNeighbors = buf.length;
  }
  updateStats(system.count, fps, system.quadTree.countNodes(), avgNeighbors);

  // QuadTree minimap (every 3 frames)
  if (++qtTick % 3 === 0) {
    const w = qtCanvas.width;
    const h = qtCanvas.height;
    const sx = w / (bounds.width || 1);
    const sy = h / (bounds.height || 1);
    qtCtx.clearRect(0, 0, w, h);
    qtCtx.save();
    qtCtx.scale(sx, sy);
    system.quadTree.draw(qtCtx);
    qtCtx.fillStyle = 'rgba(56,200,168,0.7)';
    for (const p of system.all) {
      qtCtx.beginPath();
      qtCtx.arc(p.position.x, p.position.y, 1.5, 0, Math.PI * 2);
      qtCtx.fill();
    }
    qtCtx.restore();
  }
}

requestAnimationFrame(loop);

// ── Utils ─────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
