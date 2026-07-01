/**
 * Tool-life curve builder (QX3 -- de-inline Taylor physics from the UI).
 *
 * The SFC "Charts" tab used to draw the tool-life curve from a TAYLOR {n,C} Record
 * inlined in the component + a client-side `Math.pow(C/v, 1/n)`. That violates the
 * quebec rule "never inline physics/safety constants in components" AND risked a
 * curve that diverged from the canonical engine. This helper instead samples N
 * cutting speeds and asks the CANONICAL backend (sfcApi.toolLife -> prism_calc:
 * tool_life) for each point -- the UI renders engine output, never recomputes it.
 *
 * Pure + fetcher-injected so it is unit-testable without a network. Uses
 * allSettled so one failed point degrades to a shorter curve rather than killing
 * the whole chart (R12: partial-but-honest beats fabricated).
 */
import type { ToolLifeRequest, ToolLifeResult } from '../types/sfc';

export interface ToolLifeCurvePoint {
  speed: number;
  life: number;
}

export interface ToolLifeCurveBase {
  cuttingSpeed: number;
  feed: number;
  depth: number;
  material?: string;
  tool_material?: string;
}

/** A finite, positive, plottable tool-life value (minutes). Guards NaN/Inf/absurd. */
export function isPlottableLife(life: unknown): life is number {
  return typeof life === 'number' && Number.isFinite(life) && life > 0 && life < 100000;
}

/**
 * Sample speeds around the operating point: [max(20, 0.3v) .. 2.5v], `count`
 * evenly-spaced points, with the exact current speed always included so the
 * curve passes through it (and the page can read the canonical "current" life).
 */
export function sampleToolLifeSpeeds(cuttingSpeed: number, count = 9): number[] {
  if (!(cuttingSpeed > 0) || count < 2) return [];
  const minV = Math.max(20, cuttingSpeed * 0.3);
  const maxV = cuttingSpeed * 2.5;
  if (!(maxV > minV)) return [];
  const step = (maxV - minV) / (count - 1);
  const speeds: number[] = [];
  for (let i = 0; i < count; i++) speeds.push(Math.round(minV + step * i));
  const current = Math.round(cuttingSpeed);
  if (!speeds.includes(current)) speeds.push(current);
  // de-dup + sort ascending so the line chart renders left-to-right.
  return Array.from(new Set(speeds)).sort((a, b) => a - b);
}

/**
 * Build the canonical tool-life curve by querying `fetchLife` at each sampled
 * speed (same feed/depth/material/tool). `fetchLife` is the injected canonical
 * source (in the app: `(req) => sfcApi.toolLife(req).then(w => w.result)`).
 */
export async function buildToolLifeCurve(
  base: ToolLifeCurveBase,
  fetchLife: (req: ToolLifeRequest, signal?: AbortSignal) => Promise<ToolLifeResult>,
  count = 9,
  signal?: AbortSignal,
): Promise<ToolLifeCurvePoint[]> {
  const speeds = sampleToolLifeSpeeds(base.cuttingSpeed, count);
  if (speeds.length === 0) return [];

  // signal lets the caller abort the whole batch (e.g. inputs changed) -- aborted
  // requests reject, allSettled drops them, and the stale curve is discarded.
  const settled = await Promise.allSettled(
    speeds.map((speed) =>
      fetchLife(
        {
          cutting_speed: speed,
          feed: base.feed,
          depth: base.depth,
          material: base.material,
          tool_material: base.tool_material,
        },
        signal,
      ),
    ),
  );

  const points: ToolLifeCurvePoint[] = [];
  settled.forEach((outcome, i) => {
    if (outcome.status === 'fulfilled' && isPlottableLife(outcome.value?.tool_life_minutes)) {
      points.push({ speed: speeds[i], life: Math.round(outcome.value.tool_life_minutes * 10) / 10 });
    }
  });
  return points;
}
