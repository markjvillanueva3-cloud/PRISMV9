// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sfTriCompare } from '../api/speedfeed';
import type { TriCompareInput, TriCompareResult } from '../types/speedfeed';

// Exercises the REAL sfTriCompare envelope-unwrap (the page test mocks the already-unwrapped
// api, so this is the only coverage of the { result: { success, result } } -> TriCompareResult
// transform and the success:false / non-ok error paths). Stubs global fetch, not the module.

const INPUT: TriCompareInput = {
  material: { iso_group: 'P', name: 'AISI 4140' },
  tooling: { tool_diameter_mm: 10, flutes: 4, tool_material: 'carbide' },
  toolpath: { operation: 'milling', cut_type: 'roughing' },
  optimization_mode: 'prism_optimized',
};

const RESULT: TriCompareResult = {
  canonical_input: {
    iso_group: 'P',
    tool_material: 'carbide',
    operation: 'milling',
    cut_type: 'roughing',
    tool_diameter_mm: 10,
    flutes: 4,
    mode: 'prism_optimized',
  },
  systems: [
    {
      system: 'prism',
      available: true,
      axes: { vc_mpm: 180, fz_mm: 0.08, rpm: 5730, feed_mmmin: 1833, mrr_cm3min: 73 },
      source_note: 'Kienzle NineAxisOrchestrator (prism_optimized)',
    },
  ],
  consensus: null,
  prism_vs_consensus: null,
  pairwise: [],
  baseline_detail: null,
  warnings: [],
};

function stubFetch(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn(async () => ({
    ok,
    status,
    statusText: 'Internal Server Error',
    json: async () => body,
  }));
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
  return fetchMock;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sfTriCompare -- envelope unwrap', () => {
  it('POSTs to /api/v1/speed-feed/tri-compare and unwraps { result: { success, result } } to a clean TriCompareResult', async () => {
    const fetchMock = stubFetch({ result: { success: true, result: RESULT } });

    const out = await sfTriCompare(INPUT);

    // the double-wrapped backend envelope is fully unwrapped to the engine result
    expect(out).toEqual(RESULT);
    expect(out.systems[0].system).toBe('prism');
    expect(out.systems[0].axes?.vc_mpm).toBe(180);

    // it hit the new route with a POST carrying the JSON-serialized input
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/speed-feed/tri-compare');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string).tooling.tool_diameter_mm).toBe(10);
  });

  it('throws the engine error message when the envelope reports success:false (no fabricated result)', async () => {
    stubFetch({ result: { success: false, error: 'no literature baseline for this combination' } });
    await expect(sfTriCompare(INPUT)).rejects.toThrow('no literature baseline for this combination');
  });

  it('throws a default message when success:true but the result payload is missing (defensive)', async () => {
    stubFetch({ result: { success: true } });
    await expect(sfTriCompare(INPUT)).rejects.toThrow(/Vendor comparison failed/);
  });

  it('throws on a non-ok HTTP response (network / 500), surfacing the server error', async () => {
    stubFetch({ error: 'speed-feed bridge unavailable' }, false, 500);
    await expect(sfTriCompare(INPUT)).rejects.toThrow('speed-feed bridge unavailable');
  });
});
