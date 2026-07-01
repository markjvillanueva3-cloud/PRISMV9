// @vitest-environment jsdom
/**
 * WireEdmCostBreakdownPanel tests — CALC-RESTORE-MS0 / Phase 1A.
 *
 * Covers the backend-wiring pure functions (buildCostInput, mapCostResponse)
 * with reference values + failure/adversarial inputs, plus the panel's
 * live/offline fallback behaviour through a mocked weCostEstimate.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('../api/wireEdm', () => ({
  weCostEstimate: vi.fn(),
}));

import { weCostEstimate } from '../api/wireEdm';
// 2026-05-27 iter19: WeCostEstimateResult was never exported from ../api/wireEdm
// (weCostEstimate returns PrismResponse<unknown>). The fixture's concrete shape
// is the test's own contract — defined locally so any future tightening of the
// real engine output gets caught by a separate compile error, not silenced.
type WeCostEstimateResult = Record<string, unknown>;
import {
  WireEdmCostBreakdownPanel,
  buildCostInput,
  mapCostResponse,
  type CostPanelInputs,
} from '../components/calculator/WireEdmCostBreakdownPanel';

const mockWeCostEstimate = vi.mocked(weCostEstimate);

const INPUTS: CostPanelInputs = {
  material: 'D2',
  thickness_mm: 25,
  profile_length_mm: 200,
  wire_type: 'brass_0.25',
  num_passes: 4,
  machine_rate_usd_hr: 85,
};

/**
 * A valid local CostResult fixture. `mapCostResponse` carries
 * power/labor/dielectric/per_pass over from this; `buildCostInput` reads
 * `machine_time_hrs`. Distinct values so the carry-over is assertable.
 */
function makeLocal() {
  return {
    wire_cost_usd: 11.11,
    wire_length_m: 500,
    wire_weight_kg: 0.175,
    machine_time_hrs: 2.5,
    machine_cost_usd: 212.5,
    power_cost_usd: 1.5,
    consumables_usd: 6.25,
    labor_cost_usd: 17.5,
    dielectric_cost_usd: 1.25,
    total_per_part_usd: 251.11,
    per_pass: [
      { pass: 1, type: 'Rough', time_min: 50, wire_m: 500, wire_cost_usd: 10, machine_cost_usd: 70.8, cumulative_usd: 80.8 },
    ],
    breakdown: [{ category: 'Machine time', amount: 212.5, pct: 84.6 }],
    quantity_breaks: [{ qty: 1, unit_cost: 251.11 }],
  };
}

// Mirrors EDMCostDocumentationEngine.estimateCost() output.
const COST_RESPONSE: WeCostEstimateResult = {
  part_id: 'wedm-job',
  material: 'D2',
  machine_time: {
    setup_hrs: 0.5, cutting_hrs: 1.2, tab_cutting_hrs: 0, threading_hrs: 0.1,
    idle_hrs: 0, total_hrs: 1.8, rate_per_hr: 85, cost: 153,
    breakdown: [{ phase: 'cutting', hrs: 1.2, cost: 102 }],
  },
  wire: {
    wire_type: 'brass', diameter_mm: 0.25, length_m: 720, weight_kg: 0.252,
    cost_per_m: 0.02, cost: 14.4, spools_used: 1, remnant_kg: 4.5, notes: '',
  },
  consumables: {
    filters: 2, guides: 1, nozzles: 1, resin: 0.5, electrodes: 0, flush_fluid: 0.18,
    total: 4.68, detail: [{ item: 'filter', qty: 2, unit_cost: 1, cost: 2 }],
  },
  post_process: { items: [], total: 0 },
  subtotal: 172.08,
  overhead_pct: 15, overhead: 25.81,
  margin_pct: 20, margin: 39.58,
  total_per_part: 237.47,
  quantity_breaks: [
    { qty: 1, setup_amortized: 42.5, cost_per_part: 237.47, total: 237.47 },
    { qty: 10, setup_amortized: 4.25, cost_per_part: 199.22, total: 1992.2 },
  ],
  comparison: [],
  cost_drivers: [
    { category: 'Machine', amount: 153, pct_of_total: 64.4 },
    { category: 'Wire', amount: 14.4, pct_of_total: 6.1 },
    { category: 'Consumables', amount: 4.68, pct_of_total: 2.0 },
    { category: 'Overhead', amount: 25.81, pct_of_total: 10.9 },
    { category: 'Margin', amount: 39.58, pct_of_total: 16.7 },
  ],
};

beforeEach(() => {
  cleanup();
  mockWeCostEstimate.mockReset();
});

describe('buildCostInput', () => {
  it('adapts flat panel state into the /cost route param shape', () => {
    const built = buildCostInput(INPUTS, makeLocal());
    expect(built.material).toBe('D2');
    expect(built.wire_type).toBe('brass');
    expect(built.wire_diameter_mm).toBe(0.25);
    expect(built.machine_rate_per_hr).toBe(85);
    // cutting_hrs is the local model's machine-time estimate — the panel owns
    // the time model, the engine prices it.
    expect(built.cutting_hrs).toBe(2.5);
    expect(built.setup_hrs).toBe(0.5); // SETUP_HOURS
    expect(built.num_profiles).toBe(1);
    expect(built.quantity).toBe(1);
    expect(built.thickness_mm).toBe(25);
    expect(built.profile_length_mm).toBe(200);
  });

  it('maps all three spanning wire families to the backend WireType enum', () => {
    expect(buildCostInput({ ...INPUTS, wire_type: 'brass_0.25' }, makeLocal()).wire_type).toBe('brass');
    expect(buildCostInput({ ...INPUTS, wire_type: 'coated_0.20' }, makeLocal()).wire_type).toBe('coated');
    expect(buildCostInput({ ...INPUTS, wire_type: 'moly_0.18' }, makeLocal()).wire_type).toBe('molybdenum');
  });

  it('parses the diameter out of each wire key', () => {
    expect(buildCostInput({ ...INPUTS, wire_type: 'brass_0.10' }, makeLocal()).wire_diameter_mm).toBe(0.1);
    expect(buildCostInput({ ...INPUTS, wire_type: 'coated_0.20' }, makeLocal()).wire_diameter_mm).toBe(0.2);
    expect(buildCostInput({ ...INPUTS, wire_type: 'moly_0.18' }, makeLocal()).wire_diameter_mm).toBe(0.18);
  });

  it('falls back to brass / 0.25mm for an unrecognized wire key', () => {
    const built = buildCostInput({ ...INPUTS, wire_type: 'unobtanium_xx' }, makeLocal());
    expect(built.wire_type).toBe('brass');
    expect(built.wire_diameter_mm).toBe(0.25);
  });
});

describe('mapCostResponse — happy path', () => {
  it('folds an engine CostEstimate into the panel display shape', () => {
    const mapped = mapCostResponse(COST_RESPONSE, makeLocal());
    expect(mapped).not.toBeNull();
    expect(mapped?.total_per_part_usd).toBe(237.47);
    expect(mapped?.machine_time_hrs).toBe(1.8);
    expect(mapped?.machine_cost_usd).toBe(153);
    expect(mapped?.wire_cost_usd).toBe(14.4);
    expect(mapped?.wire_length_m).toBe(720);
    expect(mapped?.wire_weight_kg).toBe(0.252);
    expect(mapped?.consumables_usd).toBe(4.68);
  });

  it('sources the breakdown from engine cost_drivers', () => {
    const mapped = mapCostResponse(COST_RESPONSE, makeLocal());
    expect(mapped?.breakdown).toHaveLength(5);
    expect(mapped?.breakdown[0]).toEqual({ category: 'Machine', amount: 153, pct: 64.4 });
    expect(mapped?.breakdown[3]).toEqual({ category: 'Overhead', amount: 25.81, pct: 10.9 });
  });

  it('maps quantity_breaks cost_per_part onto the panel unit_cost field', () => {
    const mapped = mapCostResponse(COST_RESPONSE, makeLocal());
    expect(mapped?.quantity_breaks).toEqual([
      { qty: 1, unit_cost: 237.47 },
      { qty: 10, unit_cost: 199.22 },
    ]);
  });

  it('carries power/labor/dielectric/per_pass over from the local estimate (engine does not model them as lines)', () => {
    const local = makeLocal();
    const mapped = mapCostResponse(COST_RESPONSE, local);
    expect(mapped?.power_cost_usd).toBe(local.power_cost_usd);
    expect(mapped?.labor_cost_usd).toBe(local.labor_cost_usd);
    expect(mapped?.dielectric_cost_usd).toBe(local.dielectric_cost_usd);
    expect(mapped?.per_pass).toBe(local.per_pass);
  });
});

describe('mapCostResponse — failure modes return null (caller falls back to offline math)', () => {
  it('returns null for null / undefined / non-object / primitive input', () => {
    expect(mapCostResponse(null, makeLocal())).toBeNull();
    expect(mapCostResponse(undefined, makeLocal())).toBeNull();
    expect(mapCostResponse('not-an-object', makeLocal())).toBeNull();
    expect(mapCostResponse(42, makeLocal())).toBeNull();
  });

  it('returns null when total_per_part is missing or the wrong type', () => {
    const { total_per_part, ...rest } = COST_RESPONSE;
    void total_per_part;
    expect(mapCostResponse(rest, makeLocal())).toBeNull();
    expect(mapCostResponse({ ...COST_RESPONSE, total_per_part: 'lots' }, makeLocal())).toBeNull();
  });

  it('returns null when machine_time / wire / consumables blocks are missing', () => {
    expect(mapCostResponse({ ...COST_RESPONSE, machine_time: undefined }, makeLocal())).toBeNull();
    expect(mapCostResponse({ ...COST_RESPONSE, wire: undefined }, makeLocal())).toBeNull();
    expect(mapCostResponse({ ...COST_RESPONSE, consumables: undefined }, makeLocal())).toBeNull();
  });

  it('returns null when cost_drivers / quantity_breaks are not arrays', () => {
    expect(mapCostResponse({ ...COST_RESPONSE, cost_drivers: 'none' }, makeLocal())).toBeNull();
    expect(mapCostResponse({ ...COST_RESPONSE, quantity_breaks: null }, makeLocal())).toBeNull();
  });

  it('returns null for a dispatcher error envelope (HTTP 200 + {success:false,error})', () => {
    // When the dispatcher rejects, callTool returns this shape at HTTP 200 —
    // it has no total_per_part, so the guard rejects it and the panel falls back.
    expect(mapCostResponse({ success: false, error: 'Invalid params for wedm_estimate_cost' }, makeLocal())).toBeNull();
    expect(mapCostResponse({ error: 'Tool prism_edm not found' }, makeLocal())).toBeNull();
  });
});

describe('mapCostResponse — adversarial inputs do not throw', () => {
  it('coerces NaN cost_driver amounts to 0 rather than propagating NaN', () => {
    const withNaN = {
      ...COST_RESPONSE,
      cost_drivers: [{ category: 'Machine', amount: NaN, pct_of_total: NaN }],
    };
    const mapped = mapCostResponse(withNaN, makeLocal());
    expect(mapped?.breakdown[0].amount).toBe(0);
    expect(mapped?.breakdown[0].pct).toBe(0);
  });

  it('coerces NaN quantity_break cost_per_part to 0', () => {
    const withNaN = {
      ...COST_RESPONSE,
      quantity_breaks: [{ qty: NaN, setup_amortized: 0, cost_per_part: NaN, total: 0 }],
    };
    const mapped = mapCostResponse(withNaN, makeLocal());
    expect(mapped?.quantity_breaks[0]).toEqual({ qty: 1, unit_cost: 0 });
  });

  it('maps cleanly with empty cost_drivers and quantity_breaks arrays', () => {
    const empty = { ...COST_RESPONSE, cost_drivers: [], quantity_breaks: [] };
    const mapped = mapCostResponse(empty, makeLocal());
    expect(mapped).not.toBeNull();
    expect(mapped?.breakdown).toEqual([]);
    expect(mapped?.quantity_breaks).toEqual([]);
  });
});

describe('WireEdmCostBreakdownPanel — live/offline wiring', () => {
  it('renders the offline estimate and an OFFLINE badge when the backend rejects', async () => {
    mockWeCostEstimate.mockRejectedValue(new Error('network down'));
    render(<WireEdmCostBreakdownPanel />);
    fireEvent.click(screen.getByRole('button', { name: /estimate/i }));
    const badge = await screen.findByText('OFFLINE EST.');
    expect(badge.className).toContain('text-zinc-400'); // offline styling
    expect(mockWeCostEstimate).toHaveBeenCalledTimes(1);
    // the local model's cutting-hours estimate is what gets sent as cutting_hrs
    expect(mockWeCostEstimate).toHaveBeenCalledWith(
      expect.objectContaining({ material: 'D2', wire_type: 'brass', wire_diameter_mm: 0.25 }),
    );
  });

  it('renders the live engine total and a LIVE badge when the backend responds', async () => {
    mockWeCostEstimate.mockResolvedValue({ result: COST_RESPONSE } as never);
    render(<WireEdmCostBreakdownPanel />);
    fireEvent.click(screen.getByRole('button', { name: /estimate/i }));
    const badge = await screen.findByText('LIVE');
    expect(badge.className).toContain('text-emerald-300'); // live styling
    // Hero shows the engine's total_per_part (237.47), pinned to the hero element
    // by its selector (the qty=1 price row also renders $237.47). getByText throws
    // if absent, so the .textContent equality is the real assertion.
    expect(screen.getByText('$237.47', { selector: 'div.text-2xl' }).textContent).toBe('$237.47');
    // Breakdown rows are engine cost_drivers — 'Overhead' ($25.81, 11%) is a driver
    // the local model never emits, proving the breakdown is engine-sourced.
    expect(screen.getByText('Overhead').textContent).toBe('Overhead');
    expect(screen.getByText('$25.81 (11%)').textContent).toBe('$25.81 (11%)');
  });

  it('falls back to offline when the backend returns a malformed payload', async () => {
    mockWeCostEstimate.mockResolvedValue({ result: { total_per_part: 'lots' } } as never);
    render(<WireEdmCostBreakdownPanel />);
    fireEvent.click(screen.getByRole('button', { name: /estimate/i }));
    const badge = await screen.findByText('OFFLINE EST.');
    expect(badge.className).toContain('text-zinc-400');
    expect(mockWeCostEstimate).toHaveBeenCalledTimes(1);
  });
});
