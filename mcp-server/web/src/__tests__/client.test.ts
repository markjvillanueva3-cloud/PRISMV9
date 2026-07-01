// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adaptQuoteEstimate, costIndexPrior, machineRateEffective, outboundPricePrior, poReceive, quoteHistory, quoteStatusChange, quoteToShipErpAutofeed, quoteToShipErpCommit, quoteWhatIf, setApiKey, unwrapQuotingBody } from '../api/client';
import { ApiError, fetchJson } from '../api/requestCore';

vi.mock('../api/requestCore', () => ({
  ApiError: class extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  },
  fetchJson: vi.fn(),
}));

const mockFetchJson = vi.mocked(fetchJson);

describe('client quote route contracts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setApiKey('');
  });

  it('loads mounted quote history from the quotes route', async () => {
    mockFetchJson.mockResolvedValue({
      ok: true,
      data: {
        quote_id: 'QUO-1933',
        current_status: 'viewed',
        current_revision: 2,
        revisions: [],
        status_history: [],
      },
    } as any);

    const result = await quoteHistory('QUO-1933');

    expect(result.data.quote_id).toBe('QUO-1933');
    expect(mockFetchJson).toHaveBeenCalledWith('/api/v1/quotes/QUO-1933/history', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: undefined,
      fallbackMessage: 'Kienzle data request failed',
    });
  });

  it('posts status changes through the mounted quote status route with the route-owned quote id', async () => {
    mockFetchJson.mockResolvedValue({
      ok: true,
      result: {
        id: 'status-2',
        quote_id: 'QUO-1933',
        to_status: 'rejected',
      },
    } as any);

    await quoteStatusChange({
      quote_id: 'QUO-1933',
      to_status: 'rejected',
      reason: 'Competitor won',
      metadata: {
        source: 'quote-follow-up',
        competitor_name: 'Rival Tool',
      },
    });

    expect(mockFetchJson).toHaveBeenCalledWith('/api/v1/quotes/QUO-1933/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_status: 'rejected',
        reason: 'Competitor won',
        metadata: {
          source: 'quote-follow-up',
          competitor_name: 'Rival Tool',
        },
      }),
      fallbackMessage: 'Kienzle request failed',
    });
  });

  it('posts PO receive payloads through the mounted ERP route', async () => {
    setApiKey('test-key');
    mockFetchJson.mockResolvedValue({ result: {} } as any);

    await poReceive({
      po_id: 'PO-900',
      received_by: 'purchase-orders',
      line_items: [{ description: 'Insert', quantity: 4 }],
      packing_slip: 'Dock 2 slip',
    });

    expect(mockFetchJson).toHaveBeenCalledWith('/api/v1/erp/po-receive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key',
      },
      body: JSON.stringify({
        po_id: 'PO-900',
        received_by: 'purchase-orders',
        line_items: [{ description: 'Insert', quantity: 4 }],
        packing_slip: 'Dock 2 slip',
      }),
      fallbackMessage: 'Kienzle request failed',
    });
  });

  it('posts machine effective-rate lookups with oee_level instead of job_id', async () => {
    setApiKey('test-key');
    mockFetchJson.mockResolvedValue({ result: {} } as any);

    await machineRateEffective({
      machine_id: 'VF2',
      oee_level: 'worldClass',
    });

    expect(mockFetchJson).toHaveBeenCalledWith('/api/v1/erp/machine-rate-effective', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key',
      },
      body: JSON.stringify({
        machine_id: 'VF2',
        oee_level: 'worldClass',
      }),
      fallbackMessage: 'Kienzle request failed',
    });
  });

  // U-WHATIF01: quoteWhatIf posts the base quote payload + scenario deltas to /quote/what-if.
  // PROVEN LIVE CONTRACT (probed :3100 2026-06-23): the /quote/* compat route does NOT return a
  // bare { result: WhatIfRow[] } -- prism_business emits via slimResponse({type:"text",text}) with
  // NO content[] wrapper, so callTool cannot parse it and the FE receives the MCP content envelope
  // { result: { type:"text", text:"<json-array-string>" } }. The page unwraps it with
  // unwrapQuotingBody (the content-envelope-peeling case is regression-locked below). Mocking a
  // bare { result: [array] } here would encode the WRONG contract (the R9 dead-panel trap).
  it('posts what-if scenario deltas through the mounted /quote/what-if route', async () => {
    mockFetchJson.mockResolvedValue({
      ok: true,
      // The real /quote/what-if shape: an MCP content envelope, NOT a bare array.
      result: {
        type: 'text',
        text: JSON.stringify([
          { scenario: 'Scenario 1', unit_price: 12.5, delta_pct: -22.4 },
          { scenario: 'Scenario 2', unit_price: 19.8, delta_pct: 18.6 },
        ]),
      },
    } as any);

    const resp = await quoteWhatIf({
      material: '6061-T6',
      quantity: 100,
      tolerance_mm: 0.05,
      scenarios: [{ quantity: 1000 }, { tolerance_mm: 0.025 }],
    });

    expect(mockFetchJson).toHaveBeenCalledWith('/api/v1/quote/what-if', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        material: '6061-T6',
        quantity: 100,
        tolerance_mm: 0.05,
        scenarios: [{ quantity: 1000 }, { tolerance_mm: 0.025 }],
      }),
      fallbackMessage: 'Kienzle request failed',
    });

    // The page consumes this exact response via unwrapQuotingBody -> the WhatIfRow array.
    const rows = unwrapQuotingBody<Array<{ scenario: string; unit_price: number; delta_pct: number }>>(resp);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows![0].unit_price).toBe(12.5);
    expect(rows![0].delta_pct).toBe(-22.4);
    expect(rows![1].unit_price).toBe(19.8);
  });
});

// U-QT04 regression lock: the /quoting generic-dispatch route returns the engine body BARE
// (no { result } wrapper), unlike /quote/* routes. unwrapQuotingBody must handle BOTH shapes --
// reading .result on a bare body was the dead-panel bug (ThreeView/LVP/Outsource silently null).
describe('unwrapQuotingBody (U-QT04 dead-panel fix)', () => {
  it('returns a BARE /quoting body directly (the production shape -- no .result wrapper)', () => {
    // This is exactly what POST /api/v1/quoting returns: res.json(callTool(...)) = bare engine output.
    const bare = { ok: true, headline: 'x', views: [], cost_floor_usd: 100 };
    const r = unwrapQuotingBody<{ ok: boolean; cost_floor_usd: number }>(bare);
    expect(r).not.toBeNull();
    expect(r!.ok).toBe(true);
    expect(r!.cost_floor_usd).toBe(100);
  });

  it('unwraps a { result } wrapper when present (the /quote/* compat shape)', () => {
    const wrapped = { ok: true, result: { ok: true, cost_floor_usd: 250 } };
    const r = unwrapQuotingBody<{ ok: boolean; cost_floor_usd: number }>(wrapped);
    expect(r).not.toBeNull();
    expect(r!.cost_floor_usd).toBe(250); // the INNER result, not the outer envelope
  });

  it('returns null for null / undefined / non-object (never throws into the render path)', () => {
    expect(unwrapQuotingBody(null)).toBeNull();
    expect(unwrapQuotingBody(undefined)).toBeNull();
    expect(unwrapQuotingBody('error string')).toBeNull();
    expect(unwrapQuotingBody(42)).toBeNull();
  });

  it('a bare body whose own field happens to be named result is still returned (no false-unwrap)', () => {
    // Guard: only an OUTER .result is unwrapped. A bare engine body that legitimately lacks .result
    // (the real case) returns itself; we do NOT require .result to exist.
    const bareNoResult = { ok: true, recommendation: 'outsource', savings_usd: 1628.8 };
    const r = unwrapQuotingBody<{ recommendation: string }>(bareNoResult);
    expect(r!.recommendation).toBe('outsource');
  });

  it('peels an MCP { result: { type:"text", text } } content envelope (the /quote/what-if shape)', () => {
    // The 3rd shape: /quote/what-if returns result = an un-parsed MCP content envelope. The data is
    // a JSON STRING inside .result.text -- reading .result alone gives the envelope, not the array.
    const contentEnvelope = {
      ok: true,
      result: { type: 'text', text: JSON.stringify([{ scenario: 'Scenario 1', unit_price: 130, delta_pct: -31.58 }]) },
    };
    const r = unwrapQuotingBody<Array<{ scenario: string; unit_price: number; delta_pct: number }>>(contentEnvelope);
    expect(r).not.toBeNull();
    expect(Array.isArray(r)).toBe(true);
    expect(r![0].unit_price).toBe(130);
    expect(r![0].delta_pct).toBe(-31.58);
  });

  it('returns null on a malformed content payload (never throws into the render path)', () => {
    const broken = { ok: true, result: { type: 'text', text: '{not valid json' } };
    expect(unwrapQuotingBody(broken)).toBeNull();
  });
});

// QUOTING-ERP-AUTOFEED (3-of-3 arm C P0 dead-panel): /quote/erp-autofeed +
// /erp-commit return the prism_business slimResponse {type,text} envelope
// VERBATIM (res.json(await callTool(...))). callTool cannot peel a slimResponse
// (no content[] wrapper), so the FE receives the BARE {type:"text", text:"<json>"}
// -- NOT a {ok,data} DataResponse. The client MUST unwrapQuotingBody (parse the
// .text) and surface the payload in .data, else the ERP panel is permanently
// DEAD (reads resp.data -> undefined). These tests mock the PRODUCTION wire shape.
describe('quoteToShipErpAutofeed / quoteToShipErpCommit (ERP-autofeed envelope unwrap)', () => {
  it('unwraps the production {type,text} slimResponse envelope into .data (NOT a dead panel)', async () => {
    const payload = { job_id: 'JOB-1', cad_cam: { entitled: false, program_paths: [] }, gaps: [] };
    // PRODUCTION wire: the route forwards the BARE slimResponse envelope.
    mockFetchJson.mockResolvedValue({ type: 'text', text: JSON.stringify(payload) } as any);
    const r = await quoteToShipErpAutofeed({ job_id: 'JOB-1' });
    expect(r.data).not.toBeNull();
    expect(r.data!.job_id).toBe('JOB-1'); // would be undefined if it read .data off the bare envelope
    expect(r.data!.cad_cam.entitled).toBe(false);
  });

  it('commit: unwraps the envelope into .data so the write result renders', async () => {
    const result = { job_id: 'JOB-1', authorized: true, writes: [{ step: 'job', status: 'written', ref: 'JOB-2024-1001', detail: '' }], dry_run: false, summary: 'ok' };
    mockFetchJson.mockResolvedValue({ type: 'text', text: JSON.stringify(result) } as any);
    const r = await quoteToShipErpCommit({ job_id: 'JOB-1', actor_role: 'manager' });
    expect(r.data).not.toBeNull();
    expect(r.data!.authorized).toBe(true);
    expect(r.data!.writes[0].ref).toBe('JOB-2024-1001');
  });

  it('a malformed envelope yields data:null (graceful empty, never throws into the render path)', async () => {
    mockFetchJson.mockResolvedValue({ type: 'text', text: '{not json' } as any);
    const r = await quoteToShipErpAutofeed({ job_id: 'JOB-1' });
    expect(r.data).toBeNull();
  });
});

// U-WHATIF01 estimate-flow fix: QuoteEstimatorEngine.estimate() returns a NESTED QuoteEstimateResult
// (costs.*/pricing.*) but the page renders a FLAT QuoteEstimate. adaptQuoteEstimate maps nested->flat;
// reading .result raw gave undefined for every field -> formatCurrency(undefined) crashed the tab.
// Reference values mirror the LIVE :3100 estimate probed 2026-06-23 (6061-T6, qty 100, medium, 0.05mm).
describe('adaptQuoteEstimate (estimate-flow fix)', () => {
  // A representative NESTED engine output (the real /quote/estimate shape, trimmed to consumed fields).
  const nested = {
    quote_id: 'QE26-00005',
    quantity: 100,
    costs: {
      material: { raw_cost: 4835.6, scrap_pct: 12, cert_cost: 0, total: 4835.6 },
      machining: { cycle_time_min: 15, machine_cost: 2266.67, tool_change_cost: 0, total: 2266.67 },
      setup: { total: 59.58 },
      tooling: { total: 455 },
      overhead: { rate_pct: 18, total: 1413.05 },
      total_cost: 9263.3,
    },
    pricing: { unit_price: 130, total_price: 13000, margin_pct: 28.74, below_margin_floor: false, margin_floor_pct: 20 },
    confidence_score: 50,
    price_breaks: [
      { qty: 1, unit_price: 135, total: 135, lead_days: 7 },
      { qty: 10, unit_price: 42.8, total: 428, lead_days: 10 },
      { qty: 100, unit_price: 39.7, total: 3970, lead_days: 14 },
    ],
  };

  it('maps the nested engine shape to the flat QuoteEstimate the page renders (live reference values)', () => {
    const flat = adaptQuoteEstimate(nested)!;
    expect(flat.material_cost).toBe(4835.6); // <- costs.material.total
    expect(flat.machining_cost).toBe(2266.67); // <- costs.machining.total
    expect(flat.setup_cost).toBe(59.58); // <- costs.setup.total
    expect(flat.tooling_cost).toBe(455); // <- costs.tooling.total
    expect(flat.overhead).toBe(1413.05); // <- costs.overhead.total
    expect(flat.total).toBe(13000); // <- pricing.total_price
    expect(flat.unit_price).toBe(130); // <- pricing.unit_price
    expect(flat.cycle_time_min).toBe(15); // <- costs.machining.cycle_time_min
  });

  it('derives margin $ as price - cost, and normalizes confidence_score (0-100) to a 0-1 fraction', () => {
    const flat = adaptQuoteEstimate(nested)!;
    // margin = total_price 13000 - total_cost 9263.3 = 3736.7
    expect(flat.margin).toBeCloseTo(3736.7, 4);
    // confidence_score 50 -> 0.5 (the page multiplies by 100 for display and compares < 0.82)
    expect(flat.confidence).toBeCloseTo(0.5, 6);
  });

  it('maps price breaks to {quantity, unit_price, savings_pct} vs the smallest-qty baseline', () => {
    const flat = adaptQuoteEstimate(nested)!;
    expect(flat.price_breaks).toHaveLength(3);
    expect(flat.price_breaks![0]).toEqual({ quantity: 1, unit_price: 135, savings_pct: 0 });
    // qty 10 @ 42.8 vs baseline 135 -> (135-42.8)/135 = 68.296...%
    expect(flat.price_breaks![1].quantity).toBe(10);
    expect(flat.price_breaks![1].savings_pct).toBeCloseTo(68.296, 2);
  });

  it('passes the margin-floor gate through (below_margin_floor + floor %) so the alert can render', () => {
    const flat = adaptQuoteEstimate(nested)!;
    expect(flat.pricing?.margin_pct).toBe(28.74);
    expect(flat.pricing?.below_margin_floor).toBe(false);
    expect(flat.pricing?.margin_floor_pct).toBe(20);
  });

  it('FAILURE: returns null for null / undefined / non-object (the panel hides, never crashes)', () => {
    expect(adaptQuoteEstimate(null)).toBeNull();
    expect(adaptQuoteEstimate(undefined)).toBeNull();
    expect(adaptQuoteEstimate('error string')).toBeNull();
    expect(adaptQuoteEstimate(42)).toBeNull();
  });

  it('FAILURE: returns null when the load-bearing nested groups are missing (a flat/partial body)', () => {
    // A body lacking costs/pricing is not a recognizable estimate -> null (never a half-populated quote).
    expect(adaptQuoteEstimate({ ok: true, total: 13000 })).toBeNull();
    expect(adaptQuoteEstimate({ costs: { material: { total: 100 } } })).toBeNull(); // no pricing
    expect(adaptQuoteEstimate({ pricing: { unit_price: 130 } })).toBeNull(); // no costs
  });

  it('FAILURE: coerces non-finite / missing cost fields to 0 (no NaN reaches formatCurrency)', () => {
    const dirty = {
      costs: { material: { total: NaN }, machining: { cycle_time_min: Infinity }, total_cost: 100 },
      pricing: { unit_price: 130, total_price: 13000 },
      confidence_score: 50,
    };
    const flat = adaptQuoteEstimate(dirty)!;
    expect(flat.material_cost).toBe(0); // NaN -> 0
    expect(flat.cycle_time_min).toBe(0); // Infinity -> 0
    expect(Number.isFinite(flat.total)).toBe(true);
    expect(Number.isFinite(flat.margin)).toBe(true);
  });

  it('ADVERSARIAL: an empty price_breaks array yields no breaks (page checks estimate.price_breaks?.length)', () => {
    const flat = adaptQuoteEstimate({ ...nested, price_breaks: [] })!;
    // The page guards with `estimate.price_breaks?.length` -- prove that guard is falsy (no row renders).
    expect(flat.price_breaks?.length ?? 0).toBe(0);
    expect(flat.total).toBe(13000); // the rest of the estimate is still mapped
  });

  it('ADVERSARIAL: a zero-baseline price break never divides by zero (savings_pct clamps to 0)', () => {
    const flat = adaptQuoteEstimate({
      ...nested,
      price_breaks: [{ qty: 1, unit_price: 0 }, { qty: 10, unit_price: 50 }],
    })!;
    expect(flat.price_breaks![0].savings_pct).toBe(0);
    expect(flat.price_breaks![1].savings_pct).toBe(0); // baseline 0 -> no division, clamps to 0
  });
});

// U-MKTPRICE01: outboundPricePrior + costIndexPrior hit ADMIN-GATED typed verbs. The typed verb
// forwards req.body DIRECTLY (no { action, params } wrapper), returns the bare engine output, and a
// non-admin session yields a 401/403 ApiError -> the fns return null (page shows auth-required). A
// genuine network/5xx error is re-thrown (R12). These tests mock fetchJson at the REAL contract:
// resolve the bare engine body, or reject with ApiError(status).
describe('outboundPricePrior + costIndexPrior (U-MKTPRICE01 admin-gated priors)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setApiKey('admin-token');
  });

  // A representative real PricePriorResult (bare engine output, populated distributions).
  const pricePrior = {
    ok: true,
    path: 'state/shared/quoting/jm-sold-orders.json',
    minConfidence: 'high',
    ordersProcessed: 42,
    recordsAvailable: 60,
    includedOrders: 42,
    advisoryOnly: true,
    caveat: 'OCR-noisy market prior',
    byConfidence: { high: 42, medium: 10, low: 5, none: 3 },
    confirmedExtRevenue: 128000,
    unitPrice: { n: 42, min: 1, minMassFrac: 0.05, p5: 2, p10: 3, p25: 5, median: 12, p75: 25, p90: 48, p95: 60, max: 120, mean: 18 },
    extPrice: null,
    orderTotal: { n: 42, min: 100, minMassFrac: 0, p5: 150, p10: 200, p25: 400, median: 900, p75: 1800, p90: 3200, p95: 4100, max: 8000, mean: 1300 },
  };

  // A representative real CostIndexPriorResult (all-categories, bare engine output).
  const costIndex = {
    ok: true,
    totals: { records: 5120, grossSpend: 9870000, creditTotal: 120000, netSpend: 9750000, vendorCount: 87 },
    categories: {
      'bar stock': { category: 'bar stock', count: 1800, spend: 4200000, vendorCount: 22, unitCost: { min: 1.2, median: 4.5, max: 38, n: 1800 } },
      'tooling': { category: 'tooling', count: 900, spend: 1500000, vendorCount: 31, unitCost: null },
    },
    path: 'state/shared/quoting/jm-vendor-cost-index.json',
  };

  it('HAPPY: outboundPricePrior POSTs to the typed verb with params as the body and returns the bare PricePriorResult', async () => {
    mockFetchJson.mockResolvedValue(pricePrior as any);
    const r = await outboundPricePrior({ minConfidence: 'high' });
    expect(r).not.toBeNull();
    expect(r!.ok).toBe(true);
    expect(r!.includedOrders).toBe(42);
    expect(r!.unitPrice!.median).toBe(12);
    // params go DIRECTLY as the body (no { action, params } wrapper) -> the admin-gated typed verb.
    expect(mockFetchJson).toHaveBeenCalledWith('/api/v1/quoting/outbound-price-prior', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-token' },
      body: JSON.stringify({ minConfidence: 'high' }),
      fallbackMessage: 'Kienzle request failed',
    });
  });

  it('HAPPY: costIndexPrior POSTs to the typed verb and returns the bare CostIndexPriorResult', async () => {
    mockFetchJson.mockResolvedValue(costIndex as any);
    const r = await costIndexPrior({});
    expect(r).not.toBeNull();
    expect(r!.ok).toBe(true);
    expect(r!.totals.netSpend).toBe(9750000);
    expect(r!.categories!['bar stock'].spend).toBe(4200000);
    expect(mockFetchJson).toHaveBeenCalledWith('/api/v1/quoting/cost-index-prior', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-token' },
      body: JSON.stringify({}),
      fallbackMessage: 'Kienzle request failed',
    });
  });

  it('FAILURE: a 401 (not authenticated) yields null -> the page renders an auth-required state, never throws', async () => {
    mockFetchJson.mockRejectedValue(new ApiError(401, 'Authentication required'));
    expect(await outboundPricePrior()).toBeNull();
    expect(await costIndexPrior()).toBeNull();
  });

  it('FAILURE: a 403 (authenticated, wrong role) yields null (admin-gate rejection)', async () => {
    mockFetchJson.mockRejectedValue(new ApiError(403, 'Insufficient role'));
    expect(await outboundPricePrior({ minConfidence: 'medium' })).toBeNull();
    expect(await costIndexPrior({ category: 'tooling' })).toBeNull();
  });

  it('FAILURE: ok:false / null distributions unwrap faithfully (no crash on a fail-soft empty prior)', async () => {
    const empty = { ...pricePrior, ok: false, includedOrders: 0, unitPrice: null, extPrice: null, orderTotal: null, path: null, caveat: null };
    mockFetchJson.mockResolvedValue(empty as any);
    const r = await outboundPricePrior();
    expect(r).not.toBeNull();
    expect(r!.ok).toBe(false);
    expect(r!.unitPrice).toBeNull();
    expect(r!.path).toBeNull(); // the fail-soft emptyResult path -- proves the nullable contract holds
  });

  it('FAILURE: empty categories map unwraps to an empty object (no top-categories rows)', async () => {
    mockFetchJson.mockResolvedValue({ ...costIndex, categories: {} } as any);
    const r = await costIndexPrior();
    expect(r).not.toBeNull();
    expect(Object.keys(r!.categories!)).toHaveLength(0);
  });

  it('ADVERSARIAL: a non-auth error (500 / network) is RE-THROWN, never silently nulled (R12 fail-loud)', async () => {
    mockFetchJson.mockRejectedValue(new ApiError(500, 'internal error'));
    await expect(outboundPricePrior()).rejects.toThrow();
    await expect(costIndexPrior()).rejects.toThrow();
    // A generic (non-ApiError) error is also re-thrown -- only 401/403 ApiError maps to null.
    mockFetchJson.mockRejectedValue(new Error('socket hang up'));
    await expect(costIndexPrior()).rejects.toThrow('socket hang up');
  });

  it('ADVERSARIAL: NaN/Infinity in a distribution field survive the unwrap (engine, not client, is responsible for sane values)', async () => {
    const dirty = { ...pricePrior, unitPrice: { ...pricePrior.unitPrice, median: NaN, max: Infinity, minMassFrac: 0.9 } };
    mockFetchJson.mockResolvedValue(dirty as any);
    const r = await outboundPricePrior();
    expect(r).not.toBeNull();
    // The client fn does not sanitize -- it returns the bare body. The PAGE formats with a finite guard
    // (usd() -> '--' for non-finite), and minMassFrac 0.9 (>0.25) drives the floor-spike warning.
    expect(Number.isNaN(r!.unitPrice!.median)).toBe(true);
    expect(r!.unitPrice!.minMassFrac).toBe(0.9);
  });

  it('ADVERSARIAL: a malformed (non-object) body yields null via unwrapQuotingBody (never throws into the page)', async () => {
    mockFetchJson.mockResolvedValue('not an object' as any);
    expect(await outboundPricePrior()).toBeNull();
    expect(await costIndexPrior()).toBeNull();
  });
});
