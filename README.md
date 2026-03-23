# Particle System — QuadTree + @Decorator

git p:

- **@Decorator pattern** — particle characteristics (color, size, lifetime, gravity, flocking, etc.) are composed onto a base class at definition time rather than wrapped around instances at runtime. This bakes behavior into the prototype chain and produces measurably faster dispatch than the GoF wrapper equivalent.
- **QuadTree spatial indexing** — a region QuadTree is rebuilt each frame and passed into every particle's `update()` call, turning O(n²) neighbor searches (required by flocking, repulsion, attraction, and link-drawing) into O(n log n).

---

## Features

| Mode                      | Decorators                                      | Behavior                                         |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| **FlockParticle**         | `@WithFlocking` `@WithWrap` `@WithSpeedLimit`   | Reynolds boids — separation, alignment, cohesion |
| **ConstellationParticle** | `@WithAttraction` `@WithLinkDraw` `@WithDrag`   | Drifting nodes connected by proximity lines      |
| **RepulsorParticle**      | `@WithRepulsion` `@WithDrag` `@WithBounce`      | Mutual repulsion → crystalline equilibrium       |
| **OrbitalParticle**       | `@WithRepulsion` `@WithAttraction` `@WithTrail` | Balanced forces → natural orbit distance         |

A live QuadTree minimap in the right panel shows the tree subdividing in real time as particle density changes.

---

## Tech stack

| Tool                                         | Role                                      |
| -------------------------------------------- | ----------------------------------------- |
| [Bun](https://bun.sh)                        | Package manager + runtime                 |
| [Vite](https://vitejs.dev)                   | Dev server + bundler                      |
| [TypeScript](https://www.typescriptlang.org) | Language (`experimentalDecorators: true`) |
| [Bulma](https://bulma.io)                    | CSS framework (dark-themed)               |

---

## Installation

### Prerequisites

Install Bun if you haven't already:

```bash
curl -fsSL https://bun.sh/install | bash
```

### Setup

```bash
# 1. Clone or copy the project folder
cd particle-system

# 2. Install dependencies with Bun
bun install

# 3. Start the dev server
bun run dev
```

Vite will open `http://localhost:5173` automatically.

### Build for production

```bash
bun run build
```

Output lands in `dist/`. Preview the production build:

```bash
bun run preview
```

---

## Project structure

```
particle-system/
├── index.html                   # Entry point — Bulma layout, canvas, sidebar
├── package.json
├── tsconfig.json                # experimentalDecorators: true
├── vite.config.ts
└── src/
    ├── main.ts                  # App entry: render loop, input, minimap
    ├── styles/
    │   └── app.css              # Bulma import + dark theme overrides
    ├── core/
    │   ├── Vector2D.ts          # Immutable 2D vector with add/sub/scale/limit
    │   ├── Particle.ts          # Base class — position, velocity, acceleration only
    │   └── ParticleSystem.ts    # Owns the QuadTree; rebuilds it each frame
    ├── quadtree/
    │   ├── Rect.ts              # AABB stored as center + half-extents
    │   └── QuadTree.ts          # Region QuadTree with in-place clear()
    ├── decorators/
    │   ├── base.ts              # WithSize, WithColor, WithLifetime, WithFade, WithShrink, WithGlow
    │   ├── motion.ts            # WithGravity, WithTrail, WithBounce, WithWrap, WithSpeedLimit, WithDrag, WithRotation
    │   └── spatial.ts           # WithRepulsion, WithAttraction, WithFlocking, WithLinkDraw
    ├── particles/
    │   └── index.ts             # Four particle class factories (flock, constellation, repulsor, orbital)
    └── ui/
        ├── controls.ts          # Sidebar toggles, sliders, mode buttons, stats bar
        └── stack.ts             # Decorator stack renderer for the right panel
```

---

## Architecture notes

### Why `update(dt, qt?)` instead of a global

The QuadTree reference is passed as a parameter down the entire `super()` chain rather than accessed as a module-level singleton. This keeps each decorator self-contained and testable in isolation — a decorator can be moved to a different project without any import changes.

### `_state` bag

Because `@decorators` compose through prototype chains (not object wrappers), decorator layers have no way to hold direct references to each other. Cross-decorator state (`age`, `maxAge`, `queryBuffer`, `qt`, etc.) flows through a per-instance `_state` plain object on the base `Particle`. It trades some type-safety for clean decorator syntax.

### `_state.queryBuffer`

Allocated once in `WithSize`'s constructor, reused every frame by resetting `buf.length = 0`. This keeps the spatial decorator hot path allocation-free — critical when hundreds of particles query the tree every frame.

### QuadTree `clear()` vs. `new QuadTree()`

`clear()` resets the tree in-place rather than discarding and reallocating. This reuses internal `QtPoint[]` arrays across frames, which meaningfully reduces GC pressure at high particle counts.

---

## Adding a new decorator

1. Create a factory function in `src/decorators/base.ts`, `motion.ts`, or `spatial.ts`:

```typescript
// src/decorators/motion.ts
export function WithPulse(frequency = 2) {
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      render(ctx: CanvasRenderingContext2D): void {
        const t     = (this._state.age as number ?? 0)
        const scale = 1 + 0.3 * Math.sin(t * frequency * Math.PI * 2)
        ctx.save()
        ctx.translate(this.position.x, this.position.y)
        ctx.scale(scale, scale)
        ctx.translate(-this.position.x, -this.position.y)
        super.render(ctx)
        ctx.restore()
      }
    }
}
```

2. Add it to a particle factory in `src/particles/index.ts`:

```typescript
export function makePulsingFlockClass(bounds: Bounds) {
  return applyDecorators([
    WithWrap(bounds),
    WithSpeedLimit(200),
    WithFlocking(90, 28, { sep: 2.0, align: 1.2, coh: 1.0 }, 280, 200),
    WithPulse(3),          // ← new decorator
    WithGlow('rgba(80,200,255,0.5)', 6),
    WithColor(80, 200, 255),
    WithSize(3),
  ], Particle)
}
```

3. Register it in `src/ui/stack.ts` (MODES map) and `src/main.ts` (classes map + PERCEPTION_RADIUS).
