// @vitest-environment jsdom
/**
 * LatheCalcPanels.test.tsx -- U-LW-CALCPANEL-TESTS (slot:whiskey, MISC-045)
 * ============================================================================
 * Value-level tests for the three previously-UNTESTED U-CALC10-15 panels:
 * LatheGroovingPanel, LatheHardTurningPanel, LatheToolLifePanel. Each is
 * fetch-driven against prism_turning actions, so coverage pins BOTH sides of
 * the wire: the REQUEST CONTRACT (action name + params carry the form state)
 * and the RENDER CONTRACT (formatting/branching of the response).
 *
 * ToolLifePanel reference math (its inline Taylor FALLBACK, P defaults):
 *   T = (300/200)^(1/0.25) = 1.5^4 = 5.0625 -> "5.1 min"
 *   parts/edge = floor(5.0625 / (120/60)) = 2 | edges = ceil(100/2) = 50
 *   cost/part = (12/4)/2 = 1.5 -> "$1.5" | inserts = ceil(50/4) = 13
 * S-group blowup guard (speed 200 >> C 120): T = 0.6^(1/0.15) ~ 0.033 min ->
 *   parts/edge 0, Math.max(...,1) guards -> edges 100, cost $3, 25 inserts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LatheGroovingPanel } from '../components/calculator/LatheGroovingPanel';
import { LatheHardTurningPanel } from '../components/calculator/LatheHardTurningPanel';
import { LatheToolLifePanel } from '../components/calculator/LatheToolLifePanel';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
});

const okResponse = (result: unknown) => ({ ok: true, json: async () => ({ result }) });
const sentBody = (call = 0) => JSON.parse(fetchMock.mock.calls[call][1].body as string);

const GROOVE_RESULT = {
  type: 'rectangular', strategy: 'plunge_grooving', tool_geometry: 'GTN-3 full-width insert',
  n_passes: 1, coolant: 'flood_hp', gcode_cycle: 'G75', feed_mm_rev: 0.08,
  blade_stress: { deflection_um: 42.4, stress_mpa: 180, chatter_risk: false, l_over_t: 3.2, safe: true },
  warnings: ['verify chip evacuation on ID grooves'], notes: [],
};

const PARTING_RESULT = {
  blade_width_mm: 3,
  feed_profile: [
    { diameter_mm: 50, feed_mm_rev: 0.12, rpm: 1200, note: 'entry' },
    { diameter_mm: 10, feed_mm_rev: 0.05, rpm: 3000, note: 'center slowdown' },
  ],
  catcher_timing: { activate_diameter_mm: 8, m_code_advance: 'M77', m_code_retract: 'M78' },
  blade_stress: { deflection_um: 30, stress_mpa: 150, safe: true, chatter_risk: false },
  coolant: 'flood_hp', warnings: [],
};

const HARD_TURNING_RESULT = {
  recommended_process: 'hard_turning', confidence: 0.87,
  reasoning: ['CBN economic above 55 HRC at this lot size'],
  grinding_comparison: {
    hard_turning: { Ra_um: 0.35, cycle_time_s: 95, cost_per_part: 4.2, cpk: 1.67 },
    grinding: { Ra_um: 0.2, cycle_time_s: 240, cost_per_part: 6.8, cpk: 1.9 },
    recommendation: 'Hard turning meets spec at 38% lower cost', confidence_pct: 87, savings_pct: 34.5,
  },
  warnings: [],
};

describe('LatheGroovingPanel', () => {
  it('REQUEST CONTRACT: default groove calculate posts turning_groove_classify with the full form state', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(GROOVE_RESULT));
    render(<LatheGroovingPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));
    await screen.findByText('Groove Analysis');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/turning/calculate');
    expect(sentBody()).toEqual({
      action: 'turning_groove_classify',
      params: { type: 'rectangular', location: 'od', width_mm: 3, depth_mm: 5, diameter_mm: 50, iso_group: 'P', blade_width_mm: 3, controller: 'fanuc' },
    });
  });

  it('RENDER CONTRACT: strategy de-underscored, deflection toFixed(0)+SAFE, L/t toFixed(1)+OK, warning shown', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(GROOVE_RESULT));
    render(<LatheGroovingPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));
    expect(await screen.findByText('plunge grooving')).toBeDefined();
    expect(screen.getByText('42um SAFE')).toBeDefined(); // 42.4 -> toFixed(0)
    expect(screen.getByText('L/t=3.2 OK')).toBeDefined();
    expect(screen.getByText('0.08 mm/rev')).toBeDefined();
    expect(screen.getByText('G75')).toBeDefined();
    expect(screen.getByText('verify chip evacuation on ID grooves')).toBeDefined();
  });

  it('FAILURE BRANCH: unsafe blade stress + chatter risk render HIGH and RISK', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({
      ...GROOVE_RESULT,
      blade_stress: { deflection_um: 187.6, stress_mpa: 460, chatter_risk: true, l_over_t: 6.8, safe: false },
    }));
    render(<LatheGroovingPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));
    expect(await screen.findByText('188um HIGH')).toBeDefined(); // 187.6 -> toFixed(0) rounds up
    expect(screen.getByText('L/t=6.8 RISK')).toBeDefined();
  });

  it('PART-OFF MODE: posts turning_partoff_optimize and renders feed profile + catcher timing', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(PARTING_RESULT));
    render(<LatheGroovingPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Part-off' }));
    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));
    await screen.findByText('Part-Off Analysis');
    expect(sentBody()).toEqual({
      action: 'turning_partoff_optimize',
      params: { part_diameter_mm: 50, iso_group: 'P', controller: 'fanuc', has_part_catcher: false, blade_width_mm: 3 },
    });
    expect(screen.getByText('dia 10')).toBeDefined(); // center-slowdown profile entry
    expect(screen.getByText('0.05')).toBeDefined();
    expect(screen.getByText(/M77 at dia 8mm/)).toBeDefined();
  });

  it('ADVERSARIAL: non-ok HTTP response renders NO analysis section (graceful null)', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    render(<LatheGroovingPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Groove Analysis')).toBeNull();
    expect(screen.queryByText('Part-Off Analysis')).toBeNull();
  });
});

describe('LatheHardTurningPanel', () => {
  it('REQUEST CONTRACT: default analyze posts turning_hard_turning_analyze; bore keys OMITTED when boreId=0', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(HARD_TURNING_RESULT));
    render(<LatheHardTurningPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));
    await screen.findByText('HARD TURNING RECOMMENDED');
    expect(sentBody()).toEqual({
      action: 'turning_hard_turning_analyze',
      params: {
        workpiece: { hardness_hrc: 60, od_mm: 50, has_interrupted_cut: false },
        requirements: { target_Ra_um: 0.4, tolerance_mm: 0.01 },
      },
    });
    const wp = sentBody().params.workpiece;
    expect('bore_id_mm' in wp).toBe(false); // conditional spread must not leak zero-bore keys
  });

  it('RENDER CONTRACT: recommendation banner + confidence percent formatting', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(HARD_TURNING_RESULT));
    render(<LatheHardTurningPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));
    expect(await screen.findByText('HARD TURNING RECOMMENDED')).toBeDefined();
    expect(screen.getByText('Confidence: 87%')).toBeDefined(); // 0.87*100 -> toFixed(0)
    expect(screen.getByText('CBN economic above 55 HRC at this lot size')).toBeDefined();
  });

  it('GRINDING COMPARISON table: cycle toFixed(1), cost toFixed(2), cpk toFixed(2), savings toFixed(1)%', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(HARD_TURNING_RESULT));
    render(<LatheHardTurningPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));
    await screen.findByText('Hard Turning vs Grinding Comparison');
    expect(screen.getByText('95.0')).toBeDefined();   // HT cycle_time_s
    expect(screen.getByText('240.0')).toBeDefined();  // grind cycle_time_s
    expect(screen.getByText('4.20')).toBeDefined();   // HT cost_per_part
    expect(screen.getByText('6.80')).toBeDefined();   // grind cost_per_part
    expect(screen.getByText('1.67')).toBeDefined();   // HT cpk
    expect(screen.getByText('Savings: 34.5%')).toBeDefined();
  });

  it('ADVERSARIAL: fetch network error renders no recommendation (catch -> null)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    render(<LatheHardTurningPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/RECOMMENDED/)).toBeNull();
  });
});

describe('LatheToolLifePanel', () => {
  it('TAYLOR FALLBACK reference math (P defaults, API down): 5.1 min, 2 parts/edge, $1.5, 50 edges / 13 inserts', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) }); // forces the inline fallback
    render(<LatheToolLifePanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Estimate Life' }));
    expect(await screen.findByText('5.1 min')).toBeDefined(); // (300/200)^(1/0.25) = 5.0625
    expect(screen.getByText('2')).toBeDefined();              // floor(5.0625/2)
    expect(screen.getByText('$1.5')).toBeDefined();           // (12/4)/2
    expect(screen.getByText('50 (13 inserts)')).toBeDefined();// ceil(100/2), ceil(50/4)
    expect(screen.getByText('Taylor life: T = (300/200)^(1/0.25) = 5.1 min')).toBeDefined();
    expect(screen.getByText('2 parts per edge at 120s cycle time')).toBeDefined();
    expect(screen.getByText('Batch of 100 needs 50 edges (13 inserts)')).toBeDefined();
  });

  it('BLOWUP GUARD (S group, speed 200 >> C 120): parts/edge 0 but Math.max guards cost/edges finite', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    render(<LatheToolLifePanel />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'S' } });
    fireEvent.click(screen.getByRole('button', { name: 'Estimate Life' }));
    // T = (120/200)^(1/0.15) ~ 0.033 min -> tool life renders "0 min", parts/edge 0
    expect(await screen.findByText('0 min')).toBeDefined();
    expect(screen.getByText('$3')).toBeDefined();               // (12/4)/max(0,1)
    expect(screen.getByText('100 (25 inserts)')).toBeDefined(); // ceil(100/max(0,1)), ceil(100/4)
  });

  it('SERVER PATH: an ok response renders server values verbatim (fallback NOT engaged)', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({
      tool_life_minutes: 22.4, parts_per_edge: 11, cost_per_part: 0.273,
      edges_per_batch: 10, wear_rate_um_per_min: 13.39,
      recommendations: ['server-side Taylor with live wear calibration'],
    }));
    render(<LatheToolLifePanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Estimate Life' }));
    expect(await screen.findByText('22.4 min')).toBeDefined();
    expect(screen.getByText('11')).toBeDefined();
    expect(screen.getByText('$0.273')).toBeDefined();
    expect(screen.getByText('10 (3 inserts)')).toBeDefined(); // ceil(10/4)
    expect(screen.getByText('server-side Taylor with live wear calibration')).toBeDefined();
    expect(screen.queryByText(/Taylor life: T =/)).toBeNull(); // fallback recs absent
  });

  it('REQUEST CONTRACT: posts turning_predict_insert_life with all 8 form fields', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    render(<LatheToolLifePanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Estimate Life' }));
    await screen.findByText('5.1 min');
    expect(sentBody()).toEqual({
      action: 'turning_predict_insert_life',
      params: {
        cutting_speed_m_min: 200, feed_mm_rev: 0.25, depth_of_cut_mm: 2,
        iso_group: 'P', cycle_time_s: 120, batch_size: 100,
        insert_cost: 12, edges_per_insert: 4,
      },
    });
  });
});
