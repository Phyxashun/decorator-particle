/** Renders the decorator stack listing in the right panel. */

export type StackEntry = [name: string, args: string];

export interface ModeInfo {
  className: string;
  stack: StackEntry[];
  perfNote: string;
  primary: string;
}

export const MODES: Record<string, ModeInfo> = {
  spark: {
    className: 'SparkParticle',
    primary: '@WithGravity · @WithTrail · @WithShrink',
    stack: [
      ['WithFade', ''],
      ['WithShrink', ''],
      ['WithGravity', '0, 420'],
      ['WithTrail', '16, "rgba(255,160,40,0.18)"'],
      ['WithGlow', '"orange", 9'],
      ['WithColor', '255, 160, 40'],
      ['WithLifetime', '0.8'],
      ['WithSize', '2.5'],
    ],
    perfNote:
      '<b>@WithShrink</b> scales to zero over the lifetime ratio. <b>@WithTrail</b> samples position history each update — no QuadTree needed.',
  },

  bubble: {
    className: 'BubbleParticle',
    primary: '@WithGlow · @WithSize (large)',
    stack: [
      ['WithFade', ''],
      ['WithGlow', '"rgba(100,200,255,1)", 22'],
      ['WithColor', '80, 180, 255, 0.65'],
      ['WithLifetime', '3.5'],
      ['WithSize', '16'],
    ],
    perfNote:
      '<b>@WithGlow</b> sets canvas shadowBlur. Large <b>@WithSize</b> paired with low opacity creates the translucent sphere look.',
  },

  confetti: {
    className: 'ConfettiParticle',
    primary: '@WithRotation · @WithGravity',
    stack: [
      ['WithFade', ''],
      ['WithRotation', 'spin  // random ±2.5π'],
      ['WithGravity', '0, 220'],
      ['WithColor', 'r, g, b  // random per instance'],
      ['WithLifetime', '2.0'],
      ['WithSize', '5'],
    ],
    perfNote:
      '<b>@WithRotation</b> accumulates _state.angle each frame and replaces the circle render with a rotated square. Each instance picks a random color via its factory.',
  },

  snow: {
    className: 'SnowParticle',
    primary: '@WithDrag · @WithGravity',
    stack: [
      ['WithFade', ''],
      ['WithDrag', '0.94'],
      ['WithGravity', '0, 45'],
      ['WithColor', '220, 235, 255, 0.9'],
      ['WithLifetime', '6'],
      ['WithSize', '3'],
    ],
    perfNote:
      '<b>@WithDrag</b> applies velocity *= coef^(dt×60) each frame — frame-rate independent damping. Low gravity (45) + drag (0.94) produces realistic flutter.',
  },

  bouncer: {
    className: 'BouncerParticle',
    primary: '@WithBounce · @WithRotation',
    stack: [
      ['WithSpeedLimit', '280'],
      ['WithBounce', 'bounds, 0.85'],
      ['WithRotation', 'spin  // random ±1.5π'],
      ['WithGlow', '"rgba(255,210,80,0.6)", 14'],
      ['WithColor', '255, 210, 80'],
      ['WithSize', '6'],
    ],
    perfNote:
      '<b>@WithBounce</b> clamps position to boundary and negates the velocity component scaled by restitution (0.85 = 15% energy loss per bounce). No lifetime — bounces forever.',
  },

  flock: {
    className: 'FlockParticle',
    primary: '@WithFlocking · @WithWrap',
    stack: [
      ['WithWrap', 'bounds'],
      ['WithSpeedLimit', '200'],
      ['WithFlocking', '90, 28, { sep:2.0, align:1.2, coh:1.0 }'],
      ['WithGlow', '"rgba(80,200,255,.5)", 6'],
      ['WithColor', '80, 200, 255'],
      ['WithSize', '3'],
    ],
    perfNote:
      'QuadTree cuts flock neighbor checks from <b>O(n²)</b> → <b>O(n log n)</b>. At 400 particles: ~160k → ~3.6k comparisons per frame.',
  },

  constellation: {
    className: 'ConstellationParticle',
    primary: '@WithLinkDraw · @WithAttraction',
    stack: [
      ['WithFade', ''],
      ['WithLinkDraw', '110, "rgba(140,185,255,1)", 0.6'],
      ['WithWrap', 'bounds'],
      ['WithSpeedLimit', '80'],
      ['WithDrag', '0.97'],
      ['WithAttraction', '110, 30, 15'],
      ['WithColor', '200, 220, 255, 0.9'],
      ['WithLifetime', '14'],
      ['WithSize', '2'],
    ],
    perfNote:
      '<b>@WithLinkDraw</b> queries _state.qt during render(). Without the QuadTree, link drawing would be O(n²) per render frame.',
  },

  repulsor: {
    className: 'RepulsorParticle',
    primary: '@WithRepulsion',
    stack: [
      ['WithBounce', 'bounds, 0.6'],
      ['WithSpeedLimit', '300'],
      ['WithDrag', '0.95'],
      ['WithRepulsion', '55, 350'],
      ['WithGlow', '"rgba(255,100,180,.6)", 10'],
      ['WithColor', '255, 100, 180'],
      ['WithSize', '4'],
    ],
    perfNote:
      'Repulsion queries only within radius=55px. Dense clusters auto-settle to equilibrium. <b>@WithDrag</b> prevents energy runaway.',
  },

  orbital: {
    className: 'OrbitalParticle',
    primary: '@WithAttraction + @WithRepulsion',
    stack: [
      ['WithBounce', 'bounds, 0.5'],
      ['WithSpeedLimit', '250'],
      ['WithDrag', '0.96'],
      ['WithRepulsion', '40, 600'],
      ['WithAttraction', '140, 20, 10'],
      ['WithTrail', '10, "rgba(120,255,180,.1)"'],
      ['WithGlow', '"rgba(120,255,180,.5)", 8'],
      ['WithColor', '120, 255, 180'],
      ['WithSize', '3'],
    ],
    perfNote:
      'Attraction + Repulsion → natural equilibrium distance (~70px). The QuadTree makes it feasible to run <b>both</b> spatial queries every frame.',
  },
};

export function renderDecoratorStack(mode: string): void {
  const info = MODES[mode];
  if (!info) return;

  const el = document.getElementById('dec-stack');
  if (!el) return;

  let html = '';
  for (const [fn, args] of info.stack) {
    html +=
      `<div>` +
      `<span class="dec-at">@</span>` +
      `<span class="dec-name">${fn}</span>` +
      `<span class="dec-paren">(</span>` +
      `<span class="dec-args">${args}</span>` +
      `<span class="dec-paren">)</span>` +
      `</div>`;
  }
  html +=
    `<div class="dec-class">` +
    `<span class="dec-kw">class </span>` +
    `${info.className} ` +
    `<span class="dec-ext">extends Particle</span> {}` +
    `</div>`;

  el.innerHTML = html;

  const perfEl = document.getElementById('perf-note');
  if (perfEl) perfEl.innerHTML = info.perfNote;
}
