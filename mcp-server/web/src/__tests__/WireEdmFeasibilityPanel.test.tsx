// @vitest-environment jsdom
/**
 * WireEdmFeasibilityPanel tests — CALC-RESTORE-MS0 / Phase 1A.
 *
 * Covers the backend-wiring pure functions (buildFeasibilityInput,
 * mapFeasibilityResponse) with reference values + failure/adversarial inputs,
 * plus the panel's live/offline fallback behaviour through a mocked weFeasibility.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('../api/wireEdm', () => ({
  weFeasibility: vi.fn(),
}));

import { weFeasibility, type WeFeasibilityResult } from '../api/wireEdm';
import {
  WireEdmFeasibilityPanel,
  buildFeasibilityInput,
  mapFeasibilityResponse,
  type FeasibilityPanelInputs,
} from '../components/calculator/WireEdmFeasibilityPanel';

const mockWeFeasibility = vi.mocked(weFeasibility);

const INPUTS: FeasibilityPanelInputs = {
  material: 'D2',
  thickness_mm: 25,
  tolerance_mm: 0.01,
  min_corner_radius_mm: 0.3,
  taper_deg: 0,
  is_through: true,
  wire_dia_mm: 0.25,
};

// Mirrors EDMFeasibilityEngine.assess() output for a clean go.
const FEASIBLE_RESPONSE: WeFeasibilityResult = {
  overall_feasible: true,
  conductivity: { feasible: true, resistivity: 55, classification: 'EASY', note: 'Excellent EDM machinability' },
  geometry: [
    { feature: 'profile', feasible: true, issues: [], min_corner_ok: true, min_slot_ok: true, through_feature_ok: true },
  ],
  tolerance_achievability: {
    achievable: true, best_achievable_mm: 0.005, passes_needed: 3,
    factors: ['4-pass skim strategy'], model: 'wire-offset-cascade',
  },
  taper_feasibility: [
    { feature: 'profile', requested_angle_deg: 0, max_angle_deg: 30, feasible: true, effective_taper_height_mm: 0, issues: [] },
  ],
  wire_access: { feasible: true, issues: [] },
  time_estimate: { total_hours: 1.5, setup_hours: 0.5, cutting_hours: 1.0, cutting_speed_mm2_min: 2.0, profile_area_mm2: 5000 },
  blockers: [],
  warnings: [],
  recommendations: [],
};

// Non-conductive material + over-spec taper + sub-minimum corner = hard no-go.
const INFEASIBLE_RESPONSE: WeFeasibilityResult = {
  overall_feasible: false,
  conductivity: { feasible: false, resistivity: 1e10, classification: 'NOT_FEASIBLE', note: 'Non-conductive — not feasible' },
  geometry: [
    { feature: 'cavity', feasible: false, issues: ['Min corner radius 0.05mm below achievable 0.145mm'], min_corner_ok: false, min_slot_ok: true, through_feature_ok: false },
  ],
  tolerance_achievability: {
    achievable: false, best_achievable_mm: 0.005, passes_needed: 5,
    factors: ['Requested tolerance below wire capability'], model: 'wire-offset-cascade',
  },
  taper_feasibility: [
    { feature: 'cavity', requested_angle_deg: 20, max_angle_deg: 15, feasible: false, effective_taper_height_mm: 45, issues: ['20° taper exceeds UV travel'] },
  ],
  wire_access: { feasible: false, issues: ['No machine envelope specified'] },
  time_estimate: { total_hours: 0, setup_hours: 0, cutting_hours: 0, cutting_speed_mm2_min: 0, profile_area_mm2: 0 },
  blockers: ['Material is non-conductive — wire EDM not possible'],
  warnings: ['Steep taper — accuracy decreases above 15°'],
  recommendations: ['Use finer wire (0.10mm)'],
};

beforeEach(() => {
  cleanup();
  mockWeFeasibility.mockReset();
});

describe('buildFeasibilityInput', () => {
  it('adapts flat panel state into the EDMFeasibilityEngine input shape', () => {
    const built = buildFeasibilityInput(INPUTS);
    expect(built.material).toBe('D2');
    expect(built.features).toHaveLength(1);
    expect(built.features[0].is_through).toBe(true);
    expect(built.features[0].profile_length_mm).toBe(200); // NOMINAL_PROFILE_LENGTH_MM
    expect(built.features[0].min_corner_radius_mm).toBe(0.3);
    expect(built.features[0].taper_angle_deg).toBe(0);
    expect(built.features[0].tolerance_mm).toBe(0.01);
    expect(built.workpiece.thickness_mm).toBe(25);
    expect(built.workpiece.height_mm).toBe(25); // height tracks thickness
    expect(built.workpiece.length_mm).toBe(100); // NOMINAL_WORKPIECE_MM
    expect(built.machine?.uv_travel_mm).toBe(120); // NOMINAL_MACHINE_UV_TRAVEL_MM
    expect(built.wire_diameter_mm).toBe(0.25);
  });

  it('passes through three spanning materials unchanged', () => {
    for (const material of ['D2', 'aluminum', 'ceramic']) {
      expect(buildFeasibilityInput({ ...INPUTS, material }).material).toBe(material);
    }
  });

  it('carries blind-cavity + steep-taper inputs through to features', () => {
    const built = buildFeasibilityInput({ ...INPUTS, is_through: false, taper_deg: 22, wire_dia_mm: 0.1 });
    expect(built.features[0].is_through).toBe(false);
    expect(built.features[0].taper_angle_deg).toBe(22);
    expect(built.wire_diameter_mm).toBe(0.1);
  });
});

describe('mapFeasibilityResponse — happy path', () => {
  it('folds a feasible engine result into the panel display shape', () => {
    const mapped = mapFeasibilityResponse(FEASIBLE_RESPONSE, INPUTS);
    expect(mapped?.overall_feasible).toBe(true);
    expect(mapped?.conductivity.resistivity_uohm_cm).toBe(55);
    expect(mapped?.conductivity.classification).toBe('EASY');
    expect(mapped?.tolerance.achievable).toBe(true);
    expect(mapped?.tolerance.passes_needed).toBe(3);
    expect(mapped?.tolerance.note).toBe('4-pass skim strategy');
    expect(mapped?.corner_radius.feasible).toBe(true);
    // Live path mirrors the engine's min-corner math: wire radius + SPARK_GAP_MM (0.015).
    expect(mapped?.corner_radius.min_achievable_mm).toBeCloseTo(0.25 / 2 + 0.015, 6);
    expect(mapped?.through_cut.feasible).toBe(true);
    expect(mapped?.taper.feasible).toBe(true);
    expect(mapped?.taper.max_angle_deg).toBe(30);
    expect(mapped?.blockers).toEqual([]);
  });

  it('folds an infeasible engine result, aggregating per-feature flags to a no-go', () => {
    const mapped = mapFeasibilityResponse(INFEASIBLE_RESPONSE, { ...INPUTS, material: 'ceramic', taper_deg: 20 });
    expect(mapped?.overall_feasible).toBe(false);
    expect(mapped?.conductivity.feasible).toBe(false);
    expect(mapped?.corner_radius.feasible).toBe(false);
    expect(mapped?.corner_radius.note).toMatch(/corner radius/i);
    expect(mapped?.through_cut.feasible).toBe(false);
    expect(mapped?.taper.feasible).toBe(false);
    // uv_travel is computed from the requested taper (tan(20°)·thickness/2 ≈ 4.55),
    // NOT lifted from the engine's effective_taper_height_mm fixture value (45) —
    // effective_taper_height_mm is a workpiece height, not a UV-axis travel.
    expect(mapped?.taper.uv_travel_needed_mm).toBeCloseTo(Math.tan((20 * Math.PI) / 180) * (25 / 2), 2);
    expect(mapped?.taper.uv_travel_needed_mm).not.toBe(45);
    expect(mapped?.blockers).toEqual(['Material is non-conductive — wire EDM not possible']);
    expect(mapped?.recommendations).toEqual(['Use finer wire (0.10mm)']);
  });

  it('marks corner radius infeasible when ANY geometry feature fails min_corner_ok', () => {
    const mixed: WeFeasibilityResult = {
      ...FEASIBLE_RESPONSE,
      geometry: [
        { feature: 'a', feasible: true, issues: [], min_corner_ok: true, min_slot_ok: true, through_feature_ok: true },
        { feature: 'b', feasible: false, issues: ['tight corner'], min_corner_ok: false, min_slot_ok: true, through_feature_ok: true },
      ],
    };
    const mapped = mapFeasibilityResponse(mixed, INPUTS);
    expect(mapped?.corner_radius.feasible).toBe(false);
    expect(mapped?.through_cut.feasible).toBe(true);
  });
});

describe('mapFeasibilityResponse — failure modes return null (caller falls back to offline math)', () => {
  it('returns null for null / non-object input', () => {
    expect(mapFeasibilityResponse(null, INPUTS)).toBeNull();
    expect(mapFeasibilityResponse(undefined, INPUTS)).toBeNull();
    expect(mapFeasibilityResponse('not-an-object', INPUTS)).toBeNull();
    expect(mapFeasibilityResponse(42, INPUTS)).toBeNull();
  });

  it('returns null when conductivity block is missing', () => {
    const { conductivity, ...rest } = FEASIBLE_RESPONSE;
    void conductivity;
    expect(mapFeasibilityResponse(rest, INPUTS)).toBeNull();
  });

  it('returns null when geometry is an empty array', () => {
    expect(mapFeasibilityResponse({ ...FEASIBLE_RESPONSE, geometry: [] }, INPUTS)).toBeNull();
  });

  it('returns null when geometry is not an array', () => {
    expect(mapFeasibilityResponse({ ...FEASIBLE_RESPONSE, geometry: 'oops' }, INPUTS)).toBeNull();
  });

  it('returns null when blockers/warnings are not arrays', () => {
    expect(mapFeasibilityResponse({ ...FEASIBLE_RESPONSE, blockers: 'none' }, INPUTS)).toBeNull();
    expect(mapFeasibilityResponse({ ...FEASIBLE_RESPONSE, warnings: null }, INPUTS)).toBeNull();
  });

  it('returns null when overall_feasible is not a boolean', () => {
    expect(mapFeasibilityResponse({ ...FEASIBLE_RESPONSE, overall_feasible: 'yes' }, INPUTS)).toBeNull();
  });
});

describe('mapFeasibilityResponse — adversarial inputs do not throw', () => {
  it('coerces a NaN resistivity to 0 rather than propagating NaN', () => {
    const mapped = mapFeasibilityResponse(
      { ...FEASIBLE_RESPONSE, conductivity: { ...FEASIBLE_RESPONSE.conductivity, resistivity: NaN } },
      INPUTS,
    );
    expect(mapped?.conductivity.resistivity_uohm_cm).toBe(0);
  });

  it('survives geometry features whose issues field is missing', () => {
    const noIssues = {
      ...FEASIBLE_RESPONSE,
      geometry: [{ feature: 'profile', feasible: true, min_corner_ok: true, min_slot_ok: true, through_feature_ok: true }],
    };
    const mapped = mapFeasibilityResponse(noIssues, INPUTS);
    expect(mapped?.corner_radius.note).toContain('OK');
  });

  it('falls back to the model name when tolerance factors are absent', () => {
    const noFactors = {
      ...FEASIBLE_RESPONSE,
      tolerance_achievability: { ...FEASIBLE_RESPONSE.tolerance_achievability, factors: [] },
    };
    const mapped = mapFeasibilityResponse(noFactors, INPUTS);
    expect(mapped?.tolerance.note).toBe('wire-offset-cascade');
  });

  it('survives an empty taper_feasibility array (no taper features)', () => {
    const mapped = mapFeasibilityResponse({ ...FEASIBLE_RESPONSE, taper_feasibility: [] }, INPUTS);
    expect(mapped?.taper.feasible).toBe(true);
    expect(mapped?.taper.max_angle_deg).toBe(0);
  });
});

describe('WireEdmFeasibilityPanel — live/offline wiring', () => {
  it('renders the offline estimate and an OFFLINE badge when the backend rejects', async () => {
    mockWeFeasibility.mockRejectedValue(new Error('network down'));
    render(<WireEdmFeasibilityPanel />);
    fireEvent.click(screen.getByRole('button', { name: /check/i }));
    const badge = await screen.findByText('OFFLINE EST.');
    expect(badge.className).toContain('text-zinc-400'); // offline styling
    // D2 is conductive + through-cut default => offline estimate is a GO
    expect(screen.getByText('FEASIBLE').textContent).toBe('FEASIBLE');
    expect(screen.getByText('GO').textContent).toBe('GO');
    expect(mockWeFeasibility).toHaveBeenCalledTimes(1);
    expect(mockWeFeasibility).toHaveBeenCalledWith(
      expect.objectContaining({ material: 'D2', wire_diameter_mm: 0.25 }),
    );
  });

  it('renders the live result and a LIVE badge when the backend responds', async () => {
    mockWeFeasibility.mockResolvedValue({ result: INFEASIBLE_RESPONSE } as never);
    render(<WireEdmFeasibilityPanel />);
    fireEvent.click(screen.getByRole('button', { name: /check/i }));
    const badge = await screen.findByText('LIVE');
    expect(badge.className).toContain('text-emerald-300'); // live styling
    // INFEASIBLE_RESPONSE.overall_feasible === false => verdict is a no-go
    expect(screen.getByText('NOT FEASIBLE').textContent).toBe('NOT FEASIBLE');
    expect(screen.getByText('NO-GO').textContent).toBe('NO-GO');
    // blocker from the engine response is surfaced verbatim
    expect(screen.getByText('Material is non-conductive — wire EDM not possible').textContent)
      .toContain('non-conductive');
  });

  it('falls back to offline when the backend returns a malformed payload', async () => {
    mockWeFeasibility.mockResolvedValue({ result: { overall_feasible: 'maybe' } } as never);
    render(<WireEdmFeasibilityPanel />);
    fireEvent.click(screen.getByRole('button', { name: /check/i }));
    const badge = await screen.findByText('OFFLINE EST.');
    expect(badge.className).toContain('text-zinc-400');
    expect(mockWeFeasibility).toHaveBeenCalledTimes(1);
  });
});
