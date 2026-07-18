/**
 * toolLifeCurve -- the canonical tool-life curve builder (QX3). Tests the intent
 * (R9): speeds are sampled around the operating point and ALWAYS include the
 * current speed; every point comes from the injected canonical fetcher (never an
 * inlined Taylor formula); the request carries feed/depth/material/tool; one
 * failed/non-plottable point degrades the curve, it does not kill it.
 *
 * fetchLife is dependency-injected (not a mocked SUT) -- the real sampling,
 * allSettled, filtering and mapping logic of buildToolLifeCurve runs.
 */
import { describe, it, expect } from 'vitest';
import {
  isPlottableLife,
  sampleToolLifeSpeeds,
  buildToolLifeCurve,
  type ToolLifeCurveBase,
} from '../lib/toolLifeCurve';
import type { ToolLifeRequest, ToolLifeResult } from '../types/sfc';

const BASE: ToolLifeCurveBase = {
  cuttingSpeed: 200,
  feed: 0.1,
  depth: 2,
  material: '4140',
  tool_material: 'carbide',
};

describe('isPlottableLife', () => {
  it('accepts a finite positive minutes value', () => {
    expect(isPlottableLife(45.5)).toBe(true);
  });
  it('rejects zero, negative, NaN, Infinity, absurd, and non-numbers', () => {
    expect(isPlottableLife(0)).toBe(false);
    expect(isPlottableLife(-5)).toBe(false);
    expect(isPlottableLife(NaN)).toBe(false);
    expect(isPlottableLife(Infinity)).toBe(false);
    expect(isPlottableLife(100001)).toBe(false);
    expect(isPlottableLife('30')).toBe(false);
    expect(isPlottableLife(undefined)).toBe(false);
  });
});

describe('sampleToolLifeSpeeds', () => {
  it('spans [max(20,0.3v) .. 2.5v], is sorted ascending, and includes the current speed', () => {
    const speeds = sampleToolLifeSpeeds(200, 9);
    expect(speeds.length).toBeGreaterThanOrEqual(9);
    expect(speeds[0]).toBe(Math.round(Math.max(20, 200 * 0.3))); // 60
    expect(speeds[speeds.length - 1]).toBe(Math.round(200 * 2.5)); // 500
    expect(speeds.includes(200)).toBe(true); // the exact operating point
    for (let i = 1; i < speeds.length; i++) expect(speeds[i]).toBeGreaterThan(speeds[i - 1]);
  });
  it('floors the low end at 20 m/min for a slow operating point', () => {
    const speeds = sampleToolLifeSpeeds(40, 9);
    expect(speeds[0]).toBe(20); // max(20, 0.3*40=12) -> 20
  });
  it('returns empty for a non-positive speed or a degenerate count', () => {
    expect(sampleToolLifeSpeeds(0)).toEqual([]);
    expect(sampleToolLifeSpeeds(-10)).toEqual([]);
    expect(sampleToolLifeSpeeds(200, 1)).toEqual([]);
  });
});

describe('buildToolLifeCurve (canonical, fetcher-injected)', () => {
  it('queries the canonical fetcher at every sampled speed and maps tool_life_minutes', async () => {
    const seen: ToolLifeRequest[] = [];
    const fetchLife = async (req: ToolLifeRequest): Promise<ToolLifeResult> => {
      seen.push(req);
      return { tool_life_minutes: 60000 / req.cutting_speed, wear_rate: 0.1 };
    };
    const curve = await buildToolLifeCurve(BASE, fetchLife, 9);
    const speeds = sampleToolLifeSpeeds(200, 9);

    expect(curve.length).toBe(speeds.length);
    expect(seen.length).toBe(speeds.length);
    // every request carried the operating feed/depth/material/tool (NOT recomputed in the UI)
    for (const req of seen) {
      expect(req.feed).toBe(0.1);
      expect(req.depth).toBe(2);
      expect(req.material).toBe('4140');
      expect(req.tool_material).toBe('carbide');
    }
    // curve passes through the current operating point with the canonical life (60000/200 = 300)
    expect(curve.find((p) => p.speed === 200)?.life ?? -1).toBe(300);
    // ascending by speed
    for (let i = 1; i < curve.length; i++) expect(curve[i].speed).toBeGreaterThan(curve[i - 1].speed);
  });

  it('drops a point whose fetch rejects (degrade, do not kill the curve)', async () => {
    const fetchLife = async (req: ToolLifeRequest): Promise<ToolLifeResult> => {
      if (req.cutting_speed === 200) throw new Error('engine 500 at this speed');
      return { tool_life_minutes: 50, wear_rate: 0.1 };
    };
    const curve = await buildToolLifeCurve(BASE, fetchLife, 9);
    const speeds = sampleToolLifeSpeeds(200, 9);
    expect(curve.length).toBe(speeds.length - 1); // the 200 point is gone, the rest remain
    expect(curve.some((p) => p.speed === 200)).toBe(false);
  });

  it('filters a non-plottable (zero) life value but keeps the valid points', async () => {
    const fetchLife = async (req: ToolLifeRequest): Promise<ToolLifeResult> => ({
      tool_life_minutes: req.cutting_speed === 200 ? 0 : 50,
      wear_rate: 0.1,
    });
    const curve = await buildToolLifeCurve(BASE, fetchLife, 9);
    expect(curve.some((p) => p.speed === 200)).toBe(false);
    expect(curve.every((p) => p.life === 50)).toBe(true);
    expect(curve.length).toBeGreaterThan(0);
  });

  it('forwards the AbortSignal to the fetcher (so the caller can cancel the batch)', async () => {
    const controller = new AbortController();
    let received: AbortSignal | undefined;
    await buildToolLifeCurve(
      BASE,
      async (_req, signal) => {
        received = signal;
        return { tool_life_minutes: 50, wear_rate: 0.1 };
      },
      9,
      controller.signal,
    );
    expect(received).toBe(controller.signal);
  });

  it('returns empty + makes NO fetch calls for a non-positive operating speed', async () => {
    let calls = 0;
    const fetchLife = async (): Promise<ToolLifeResult> => {
      calls += 1;
      return { tool_life_minutes: 50, wear_rate: 0.1 };
    };
    const curve = await buildToolLifeCurve({ ...BASE, cuttingSpeed: 0 }, fetchLife, 9);
    expect(curve).toEqual([]);
    expect(calls).toBe(0);
  });
});
