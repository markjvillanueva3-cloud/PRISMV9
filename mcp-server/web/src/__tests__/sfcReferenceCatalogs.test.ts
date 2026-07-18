/**
 * Tests for the SFC reference-catalog fetchers (frontend dependency-root).
 * Mocks global.fetch -- no live server required. Asserts each fetcher hits the
 * correct /api/v1/data path, unwraps the { result } envelope, and surfaces errors.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchCatalog,
  fetchCoatingCatalog,
  fetchInsertCatalog,
  fetchCoolantCatalog,
  fetchCoolantProductCatalog,
  fetchTurningInsertCatalog,
  fetchStockCatalog,
  fetchMaterialCatalog,
  SFC_CATALOG_FETCHERS,
} from '../api/sfcReferenceCatalogs';

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchCatalog', () => {
  it('prefixes /api/v1/data, uses GET, and unwraps the { result } envelope', async () => {
    const fn = mockFetchOnce({ result: { hello: 'world' } });
    const out = await fetchCatalog<{ hello: string }>('/coating/catalog');
    expect(out).toEqual({ hello: 'world' });
    expect(fn).toHaveBeenCalledTimes(1);
    const [url, init] = fn.mock.calls[0];
    expect(url).toBe('/api/v1/data/coating/catalog');
    expect(init).toEqual({ method: 'GET' });
  });

  it('falls back to data, then the raw json, when result is absent', async () => {
    mockFetchOnce({ data: { v: 1 } });
    expect(await fetchCatalog('/x')).toEqual({ v: 1 });
    mockFetchOnce({ v: 2 });
    expect(await fetchCatalog('/x')).toEqual({ v: 2 });
  });

  it('throws with the status on a non-2xx response (caller can fall back)', async () => {
    mockFetchOnce({}, false, 503);
    await expect(fetchCatalog('/coating/catalog')).rejects.toThrow(/503/);
  });
});

describe('per-endpoint fetchers hit the right path + return the typed envelope', () => {
  const cases: { name: string; fn: () => Promise<unknown>; path: string; result: Record<string, unknown> }[] = [
    {
      name: 'coating',
      fn: fetchCoatingCatalog,
      path: '/api/v1/data/coating/catalog',
      result: { options: [{ id: 'tialn', label: 'TiAlN', detail: 'PVD' }], total: 1, source: 'database', liveCount: 1, fallbackCount: 0, note: '', recommendedByMaterial: { steel: ['TiAlN'] } },
    },
    {
      name: 'insert',
      fn: fetchInsertCatalog,
      path: '/api/v1/data/insert/catalog',
      result: { options: [{ id: 'r245', label: 'R245', detail: '' }], total: 1, source: 'database', liveCount: 1, fallbackCount: 0, note: '', manufacturers: ['Sandvik'], materials: ['Steel (P)'] },
    },
    {
      name: 'coolant',
      fn: fetchCoolantCatalog,
      path: '/api/v1/data/coolant/catalog',
      result: { options: [{ id: 'flood', label: 'Flood', detail: '70% cooling' }], total: 1, source: 'database', liveCount: 1, fallbackCount: 0, note: '', recommendedByMaterial: {} },
    },
    {
      name: 'coolant-product',
      fn: fetchCoolantProductCatalog,
      path: '/api/v1/data/coolant-product/catalog',
      result: { options: [{ id: 'bc25', label: 'BC 25', detail: '' }], total: 1, source: 'database', liveCount: 1, fallbackCount: 0, note: '', vendors: ['Blaser'], coolingTypes: ['flood'] },
    },
    {
      name: 'turning-insert',
      fn: fetchTurningInsertCatalog,
      path: '/api/v1/data/turning-insert/catalog',
      result: { options: [{ id: 'cnmg-120408', label: 'CNMG 120408', detail: '' }], total: 1, source: 'database', liveCount: 1, fallbackCount: 0, note: '', shapes: ['Diamond 80'] },
    },
    {
      name: 'stock',
      fn: fetchStockCatalog,
      path: '/api/v1/data/stock/catalog',
      result: { options: [{ id: 'stk-d2', label: 'D2 plate', detail: '' }], total: 1, source: 'database', liveCount: 1, fallbackCount: 0, note: '', forms: ['plate'], isoGroups: ['H'] },
    },
  ];

  for (const c of cases) {
    it(`fetch${c.name} GETs ${c.path} and returns its options`, async () => {
      const fn = mockFetchOnce({ result: c.result });
      const out = (await c.fn()) as { options: { id: string }[]; source: string };
      expect(fn.mock.calls[0][0]).toBe(c.path);
      expect(fn.mock.calls[0][1]).toEqual({ method: 'GET' });
      expect(out.options).toHaveLength(1);
      expect(out.source).toBe('database');
      expect(out.options[0].id).toBe(c.result.options ? (c.result.options as { id: string }[])[0].id : '');
    });
  }
});

describe('SFC_CATALOG_FETCHERS registry', () => {
  it('maps every catalog key to its fetcher', () => {
    expect(Object.keys(SFC_CATALOG_FETCHERS).sort()).toEqual(
      ['coating', 'coolant', 'coolant-product', 'holder', 'insert', 'machine', 'material', 'programming', 'stock', 'turning-insert', 'workholding'].sort(),
    );
    expect(SFC_CATALOG_FETCHERS.coating).toBe(fetchCoatingCatalog);
    expect(SFC_CATALOG_FETCHERS.stock).toBe(fetchStockCatalog);
    expect(SFC_CATALOG_FETCHERS.material).toBe(fetchMaterialCatalog);
  });

  it('a registry fetcher round-trips through the mocked endpoint', async () => {
    const fn = mockFetchOnce({ result: { options: [], total: 0, source: 'curated', liveCount: 0, fallbackCount: 0, note: '', forms: [], isoGroups: [] } });
    const out = (await SFC_CATALOG_FETCHERS.stock()) as { source: string };
    expect(fn.mock.calls[0][0]).toBe('/api/v1/data/stock/catalog');
    expect(out.source).toBe('curated');
  });
});
