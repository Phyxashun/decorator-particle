/**
 * UI controls wiring
 * Connects sidebar buttons, toggles, sliders and stats bar
 * to application state callbacks.
 */

export interface ControlState {
  showQt: boolean;
  showRadius: boolean;
  showLinks: boolean;
  spawnCount: number;
  spawnSpeed: number;
}

export interface ControlCallbacks {
  onModeChange: (mode: string) => void;
  onClear: () => void;
  onFill: () => void;
}

/** Wire up all sidebar controls and return a reactive state object. */
export function initControls(callbacks: ControlCallbacks): ControlState {
  const state: ControlState = {
    showQt: false,
    showRadius: false,
    showLinks: true,
    spawnCount: 12,
    spawnSpeed: 1.0,
  };

  // ── Mode buttons ──────────────────────────────────────────────
  document.querySelectorAll<HTMLButtonElement>('.mode-btn[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn[data-mode]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const mode = btn.dataset.mode!;
      document.getElementById('mode-hint')!.textContent = modeHintText(mode);
      callbacks.onModeChange(mode);
    });
  });

  // ── Toggles ───────────────────────────────────────────────────
  setupToggle('tog-qt', (v) => {
    state.showQt = v;
  });
  setupToggle('tog-radius', (v) => {
    state.showRadius = v;
  });
  setupToggle('tog-links', (v) => {
    state.showLinks = v;
  });

  // ── Sliders ───────────────────────────────────────────────────
  const slCount = document.getElementById('sl-count') as HTMLInputElement;
  const slSpeed = document.getElementById('sl-speed') as HTMLInputElement;

  slCount.addEventListener('input', () => {
    state.spawnCount = Number(slCount.value);
    document.getElementById('lbl-count')!.textContent = String(state.spawnCount);
  });
  slSpeed.addEventListener('input', () => {
    state.spawnSpeed = Number(slSpeed.value);
    document.getElementById('lbl-speed')!.textContent = state.spawnSpeed.toFixed(1) + '×';
  });

  // ── Clear / Fill ──────────────────────────────────────────────
  document.getElementById('clearBtn')!.addEventListener('click', callbacks.onClear);
  document.getElementById('fillBtn')!.addEventListener('click', callbacks.onFill);

  return state;
}

/** Push live stats into the navbar each frame. */
export function updateStats(count: number, fps: number, qtNodes: number, avgNeighbors: number): void {
  document.getElementById('st-count')!.textContent = String(count);
  document.getElementById('st-fps')!.textContent = String(fps);
  document.getElementById('st-qt')!.textContent = String(qtNodes);
  document.getElementById('st-nb')!.textContent = String(avgNeighbors);
}

// ── Helpers ──────────────────────────────────────────────────

function setupToggle(id: string, cb: (on: boolean) => void): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', () => {
    el.classList.toggle('is-on');
    cb(el.classList.contains('is-on'));
  });
}

const MODE_HINT: Record<string, string> = {
  flock: 'FlockParticle',
  constellation: 'ConstellationParticle',
  repulsor: 'RepulsorParticle',
  orbital: 'OrbitalParticle',
};

function modeHintText(mode: string): string {
  return MODE_HINT[mode] ?? mode;
}
