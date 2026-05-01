// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';
import { normalizeCalculatorSpeedFeedResult } from '../utils/calculatorSpeedFeedContract';

let CalculatorPageInner: React.FC;

type Matcher = RegExp | string;
type RequestLog = { url: string; body: Record<string, unknown> | undefined };

function rx(matcher: Matcher) {
  return typeof matcher === 'string' ? new RegExp(matcher, 'i') : matcher;
}

function textOf(node: Element) {
  return (node.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function parseBody(body: BodyInit | null | undefined) {
  if (typeof body !== 'string') return undefined;
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function okJson(payload: unknown) {
  return Promise.resolve({ ok: true, json: async () => payload } as Response);
}

function installFetchMock(handlers: {
  speedFeed?: (body: Record<string, unknown>) => unknown;
  wedm?: (body: Record<string, unknown>) => unknown;
}) {
  const requests: RequestLog[] = [];
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const body = parseBody(init?.body);
    requests.push({ url, body });
    if (url.includes('/api/v1/speed-feed/orchestrate')) return okJson(handlers.speedFeed?.(body ?? {}) ?? { result: {} });
    if (url.includes('/api/v1/edm/calculator-solve')) return okJson(handlers.wedm?.(body ?? {}) ?? { result: {} });
    return Promise.reject(new Error('calculator workflow fallback'));
  }));
  return requests;
}

async function renderCalculator() {
  render(
    <OperatingSystemProvider services={fixtureOperatingSystemServices}>
      <MemoryRouter initialEntries={['/calculator']}>
        <Routes>
          <Route path="/calculator" element={<CalculatorPageInner />} />
        </Routes>
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
  await screen.findByText(/Ultimate Machining Tool/i);
}

function clickModeButton(label: string) {
  const button = screen.getAllByRole('button').find((node) => {
    const accessibleName = node.getAttribute('aria-label');
    return rx(label).test(accessibleName ?? '') || rx(label).test(textOf(node));
  });
  if (!button) throw new Error(`Missing mode button: ${label}`);
  fireEvent.click(button);
}

async function chooseOption(name: Matcher, option: Matcher) {
  const select = screen.getByRole('combobox', { name: rx(name) }) as HTMLSelectElement;
  let match: HTMLOptionElement | undefined;
  let labels: string[] = [];
  await waitFor(() => {
    const options = within(select).getAllByRole('option') as HTMLOptionElement[];
    labels = options.map((candidate) => textOf(candidate));
    match = options.find((candidate) => rx(option).test(textOf(candidate)));
    expect(
      match,
      `Missing option ${String(option)} for ${String(name)}. Options: ${labels.join(' | ')}`,
    ).toBeDefined();
  });
  fireEvent.change(select, { target: { value: match!.value } });
}

async function chooseFirst(name: Matcher, preferred: Matcher[] = []) {
  const select = screen.getByRole('combobox', { name: rx(name) }) as HTMLSelectElement;
  let match: HTMLOptionElement | undefined;
  await waitFor(() => {
    const options = within(select).getAllByRole('option') as HTMLOptionElement[];
    match =
      options.find((candidate) => preferred.some((matcher) => rx(matcher).test(textOf(candidate))))
      ?? options.find((candidate) => candidate.value !== '' && !/no saved setup yet/i.test(textOf(candidate)))
      ?? options[0];
    expect(match).toBeDefined();
  });
  fireEvent.change(select, { target: { value: match!.value } });
}

function setNumber(name: Matcher, value: number) {
  const input = screen
    .getAllByLabelText(rx(name))
    .find((candidate): candidate is HTMLInputElement => candidate instanceof HTMLInputElement && candidate.type !== 'range');
  if (!input) throw new Error(`Missing numeric input: ${String(name)}`);
  fireEvent.change(input, { target: { value: String(value) } });
  fireEvent.blur(input);
}

function setSlider(name: Matcher, value: number) {
  const slider = screen
    .getAllByLabelText(rx(name))
    .find((candidate): candidate is HTMLInputElement => candidate instanceof HTMLInputElement && candidate.type === 'range');
  if (!slider) throw new Error(`Missing slider: ${String(name)}`);
  fireEvent.change(slider, { target: { value: String(value) } });
}

function metricValue(label: string) {
  const card = screen
    .getAllByText(label)
    .map((node) => node.parentElement)
    .find((candidate) => candidate?.className.includes('border-cyan-400/12'));
  if (!card?.children[1]) throw new Error(`Missing metric: ${label}`);
  return card.children[1].textContent?.trim();
}

function formatMetric(value: number | undefined, decimals = 1) {
  if (value == null || !Number.isFinite(value)) return 'Unavailable';
  return value < 0.01 ? value.toExponential(2) : value.toFixed(decimals);
}

async function saveSnapshot(machineRegex: RegExp) {
  fireEvent.click(screen.getByRole('button', { name: /save current setup to my shop/i }));
  const select = screen.getByRole('combobox', { name: /my shop setup snapshot/i });
  await waitFor(() => {
    expect(within(select).getAllByRole('option').some((option) => machineRegex.test(textOf(option)))).toBe(true);
  });
}

beforeAll(async () => {
  const mod = await import('../pages/CalculatorPage');
  CalculatorPageInner = mod.CalculatorPage;
}, 30000);

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('calculator workflow fallback')));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CalculatorPage machinist workflow solves', () => {
  it.each([
    {
      name: '3-axis steel roughing',
      configure: async () => {
        await chooseOption(/machine type/i, /3-axis vertical/i);
        await chooseOption(/manufacturer/i, /mazak/i);
        await chooseOption(/machine model/i, /vcn-530c/i);
        await chooseOption(/^controller$/i, /smoothg/i);
        await chooseOption(/spindle package/i, /12,000 rpm cat40/i);
        await chooseOption(/material group/i, /steel/i);
        await chooseOption(/material subcategory/i, /alloy steel/i);
        await chooseOption(/specific material/i, /4140 PH/i);
        await chooseOption(/stock source/i, /remnant/i);
        fireEvent.click(screen.getByRole('button', { name: /stock shape plate/i }));
        setNumber(/^Length$/i, 160); setNumber(/^Width$/i, 90); setNumber(/^Height$/i, 38);
        await chooseOption(/programming package select/i, /fusion 360/i);
        await chooseOption(/cam license tier/i, /advanced 3d seat/i);
        await chooseOption(/toolpath type select/i, /roughing/i);
        await chooseOption(/exact toolpath select/i, /2d adaptive clearing/i);
        await chooseFirst(/setup source/i, [/shop crib/i]);
        await chooseFirst(/holder brand/i, [/haimer/i]);
        await chooseFirst(/holder type/i, [/hydraulic/i]);
        await chooseFirst(/holder size or interface/i, [/cat40/i]);
        await chooseOption(/holder package|compatible tool holder/i, /hydraulic roughing package/i);
        await chooseOption(/holder style/i, /hydraulic/i);
        await chooseOption(/tool construction/i, /solid/i);
        await chooseFirst(/tool brand/i, [/all tool brands/i]);
        await chooseFirst(/tool type/i, [/variable helix/i, /square endmill/i]);
        await chooseFirst(/tool size/i, [/0\.5 in|10-13 mm/i]);
        await chooseFirst(/tool family/i, [/rougher/i, /variable-flute/i]);
        await chooseOption(/workholding category/i, /fixture systems/i);
        await chooseFirst(/workholding brand/i, [/chick/i]);
        await chooseOption(/saved workholding preset/i, /chick one-lok/i);
        await chooseFirst(/stability posture/i, [/aggressive.*rigid/i]);
        await chooseOption(/fixture family/i, /fixture plate/i);
        await chooseFirst(/entry style/i, [/helix.*ramp/i]);
        await chooseOption(/finish target/i, /high removal/i);
        fireEvent.click(screen.getByRole('button', { name: /finish target mode manual/i }));
        setSlider(/desired ra finish/i, 3.2);
        setNumber(/tool diameter/i, 12.7); setNumber(/flutes \/ stations/i, 5); setNumber(/^DOC$/i, 18); setNumber(/WOC \/ engagement/i, 1.2);
        setNumber(/tool extension from holder/i, 38); setNumber(/LOC \/ flute length/i, 26);
        await chooseOption(/coolant strategy/i, /through-spindle/i);
      },
      snapshot: /VCN-530C/i,
      response: { result: { spindle_rpm: 6120, cutting_speed_mpm: 244.6, feed_rate_mmmin: 1836, feed_per_tooth_mm: 0.06, tangential_force_N: 2200, mrr_cm3min: 53.4, tool_life_min: 34, overall_confidence: 0.87, resolved_tool: { corner_radius_mm: 0.5 }, resolved_machine: { name: 'Mazak VCN-530C' }, resolved_cam_strategy: { strategy_name: '2D Adaptive Clearing' } } },
      expectRequest: { machine_name: 'Mazak VCN-530C', material: '4140 PH / Prehard', machine_type: 'vertical_mill', operation: 'milling', cam_strategy: '2D Adaptive Clearing', tool_diameter_mm: 12.7, doc_mm: 18, woc_mm: 1.2, coolant_type: 'through_tool' },
      confidence: /87% confidence/i,
    },
    {
      name: '5-axis aluminum swarf finishing',
      configure: async () => {
        await chooseOption(/machine type/i, /5-axis vertical/i);
        await chooseOption(/manufacturer/i, /okuma/i);
        await chooseOption(/machine model/i, /m460v-5ax/i);
        await chooseOption(/^controller$/i, /osp-p300ma-h/i);
        await chooseOption(/spindle package/i, /15,000 rpm cat 40 big\+/i);
        await chooseOption(/material group/i, /aluminum/i);
        await chooseOption(/material subcategory/i, /7xxx/i);
        await chooseOption(/specific material/i, /7075-T6 Aluminum/i);
        await chooseOption(/stock source/i, /purchased/i);
        fireEvent.click(screen.getByRole('button', { name: /stock shape plate/i }));
        setNumber(/^Length$/i, 220); setNumber(/^Width$/i, 140); setNumber(/^Height$/i, 36);
        await chooseOption(/programming package select/i, /fusion 360/i);
        await chooseOption(/cam license tier/i, /multiaxis seat/i);
        await chooseOption(/toolpath type select/i, /multi-axis finishing/i);
        await chooseOption(/exact toolpath select/i, /^swarf$/i);
        await chooseFirst(/holder brand/i, [/haimer/i]);
        await chooseFirst(/holder type/i, [/shrink/i]);
        await chooseFirst(/holder size or interface/i, [/cat40|big\+/i]);
        await chooseFirst(/holder package|compatible tool holder/i, [/shrink|big\+/i]);
        await chooseOption(/holder style/i, /shrink-fit/i);
        await chooseOption(/tool construction/i, /solid/i);
        await chooseOption(/tool type/i, /ball/i);
        await chooseFirst(/tool size/i, [/0\.5 in|10-13 mm/i]);
        await chooseOption(/tool family/i, /ball nose finisher/i);
        await chooseFirst(/saved workholding preset/i, [/rotary|trunnion|trt/i]);
        await chooseOption(/stability posture/i, /production stable/i);
        await chooseOption(/fixture family/i, /rotary|trunnion/i);
        await chooseOption(/entry style/i, /balanced/i);
        await chooseOption(/finish target/i, /tight finish/i);
        fireEvent.click(screen.getByRole('button', { name: /finish target mode manual/i }));
        setSlider(/desired ra finish/i, 0.8);
        setNumber(/tool diameter/i, 12.7); setNumber(/flutes \/ stations/i, 4); setNumber(/^DOC$/i, 0.8); setNumber(/WOC \/ engagement/i, 1.27);
        setNumber(/tool extension from holder/i, 46); setNumber(/LOC \/ flute length/i, 24);
        await chooseFirst(/coolant strategy/i, [/through-spindle|through-air|flood/i]);
      },
      snapshot: /M460V-5AX/i,
      response: { result: { spindle_rpm: 12000, cutting_speed_mpm: 479.1, feed_rate_mmmin: 2400, feed_per_tooth_mm: 0.05, power_kw: 5.8, torque_nm: 4.6, mrr_cm3min: 22.8, tool_life_min: 118, surface_finish_Ra_um: 0.82, overall_confidence: 0.91, resolved_tool: { corner_radius_mm: 6.35 }, resolved_machine: { name: 'Okuma GENOS M460V-5AX' }, resolved_cam_strategy: { strategy_name: 'Swarf' } } },
      expectRequest: { machine_name: 'Okuma GENOS M460V-5AX', material: '7075-T6 Aluminum', machine_type: '5axis', cam_strategy: 'Swarf', tool_diameter_mm: 12.7 },
      confidence: /91% confidence/i,
    },
    {
      name: 'conventional VTL stainless rough turning',
      mode: 'Lathe',
      configure: async () => {
        await chooseOption(/manufacturer/i, /dn solutions/i);
        await chooseOption(/machine model/i, /puma v8300/i);
        await chooseOption(/^controller$/i, /fanuc i plus/i);
        await chooseOption(/spindle package/i, /heavy-duty chuck spindle/i);
        await chooseOption(/material group/i, /stainless/i);
        await chooseOption(/material subcategory/i, /austenitic/i);
        await chooseOption(/specific material/i, /303 Stainless/i);
        await chooseOption(/stock source/i, /shop rack/i);
        fireEvent.click(screen.getByRole('button', { name: /stock shape round/i }));
        setNumber(/^Diameter$/i, 210); setNumber(/^Length$/i, 160); setNumber(/^Projection$/i, 95);
        await chooseOption(/programming package select/i, /mastercam/i);
        await chooseOption(/cam license tier/i, /turning core/i);
        await chooseOption(/toolpath type select/i, /rough turning/i);
        await chooseOption(/exact toolpath select/i, /lathe rough/i);
        await chooseFirst(/holder type/i, [/turning/i]);
        await chooseFirst(/holder size or interface/i, [/vdi/i]);
        await chooseOption(/holder package|compatible tool holder/i, /VDI turning package/i);
        await chooseFirst(/holder style/i, [/rigid turning/i, /turret standard/i]);
        await chooseOption(/tool construction/i, /indexable/i);
        await chooseOption(/tool type/i, /roughing insert/i);
        await chooseOption(/tool family/i, /CNMG 80/i);
        await chooseFirst(/insert package/i, [/recommended|steel/i]);
        await chooseFirst(/saved workholding preset/i, [/3-jaw|vtl|collet/i]);
        await chooseOption(/entry style/i, /safe approach/i);
        await chooseOption(/finish target/i, /high removal/i);
        fireEvent.click(screen.getByRole('button', { name: /finish target mode manual/i }));
        setSlider(/desired ra finish/i, 2.5);
        setNumber(/tool diameter/i, 25); setNumber(/flutes \/ stations/i, 1); setNumber(/^DOC$/i, 2.8); setNumber(/WOC \/ engagement/i, 0.65);
        await chooseOption(/coolant strategy/i, /flood/i);
      },
      snapshot: /PUMA V8300/i,
      response: { result: { spindle_rpm: 980, cutting_speed_mpm: 205.3, feed_rate_mmmin: 274.4, feed_per_tooth_mm: 0.28, power_kw: 11.8, torque_nm: 115.0, mrr_cm3min: 69.5, tool_life_min: 18, surface_finish_Ra_um: 2.2, overall_confidence: 0.84, resolved_tool: { corner_radius_mm: 0.8 }, resolved_machine: { name: 'DN Solutions PUMA V8300' }, resolved_cam_strategy: { strategy_name: 'Lathe Rough' } } },
      expectRequest: { machine_name: 'DN Solutions PUMA V8300', material: '303 Stainless', machine_type: 'lathe', operation: 'turning', cam_strategy: 'Lathe Rough' },
      confidence: /84% confidence/i,
    },
    {
      name: 'swiss synchronized turning on 303 stainless',
      mode: 'Lathe',
      configure: async () => {
        await chooseOption(/machine from catalog/i, /cincom l20/i);
        await chooseOption(/^controller$/i, /cincom .* meldas/i);
        await chooseOption(/spindle package/i, /10,000 rpm swiss spindle set/i);
        await chooseOption(/material group/i, /stainless/i);
        await chooseOption(/material subcategory/i, /austenitic/i);
        await chooseOption(/specific material/i, /303 Stainless/i);
        await chooseOption(/stock source/i, /shop rack/i);
        fireEvent.click(screen.getByRole('button', { name: /stock shape round/i }));
        setNumber(/^Diameter$/i, 12); setNumber(/^Length$/i, 180); setNumber(/^Projection$/i, 120);
        await chooseOption(/programming package select/i, /esprit/i);
        await chooseOption(/cam license tier/i, /swiss .* sync seat/i);
        await chooseOption(/toolpath type select/i, /swiss .* synchronized turning/i);
        await chooseOption(/exact toolpath select/i, /swiss sync/i);
        await chooseFirst(/holder type/i, [/turning/i, /gang/i]);
        await chooseFirst(/holder size or interface/i, [/citizen|gang|vdi/i]);
        await chooseFirst(/holder package|compatible tool holder/i, [/citizen|swiss/i]);
        await chooseFirst(/holder style/i, [/rigid turning/i, /turret standard/i]);
        await chooseOption(/tool construction/i, /indexable/i);
        await chooseOption(/tool type/i, /roughing insert/i);
        await chooseOption(/tool family/i, /CNMG 80/i);
        await chooseFirst(/insert package/i, [/recommended|stainless/i]);
        await chooseOption(/workholding category/i, /support systems/i);
        await chooseOption(/workholding brand/i, /citizen/i);
        await chooseOption(/saved workholding preset/i, /guide-bushing support/i);
        await chooseFirst(/stability posture/i, [/swiss support/i]);
        await chooseOption(/entry style/i, /safe approach/i);
        await chooseOption(/finish target/i, /general/i);
        fireEvent.click(screen.getByRole('button', { name: /finish target mode manual/i }));
        setSlider(/desired ra finish/i, 2.4);
        setNumber(/tool diameter/i, 6); setNumber(/flutes \/ stations/i, 1); setNumber(/^DOC$/i, 0.45); setNumber(/WOC \/ engagement/i, 0.12);
        await chooseOption(/coolant strategy/i, /flood/i);
      },
      snapshot: /CINCOM L20/i,
      response: { result: { spindle_rpm: 6800, cutting_speed_mpm: 256.4, feed_rate_mmmin: 816, feed_per_tooth_mm: 0.12, power_kw: 3.2, torque_nm: 4.5, mrr_cm3min: 8.4, tool_life_min: 28, surface_finish_Ra_um: 2.3, overall_confidence: 0.82, resolved_tool: { corner_radius_mm: 0.8 }, resolved_machine: { name: 'Citizen Cincom L20' }, resolved_cam_strategy: { strategy_name: 'Swiss Sync' } } },
      expectRequest: { machine_name: 'Citizen Cincom L20', material: '303 Stainless', machine_type: 'lathe', operation: 'turning', cam_strategy: 'Swiss Sync', coolant_type: 'flood' },
      confidence: /82% confidence/i,
    },
    {
      name: 'live-tool mill-turn on Inconel',
      mode: 'Lathe',
      configure: async () => {
        await chooseOption(/machine from catalog/i, /multus u3000/i);
        await chooseOption(/material group/i, /nickel \/ cobalt superalloy/i);
        await chooseOption(/material subcategory/i, /nickel base/i);
        await chooseOption(/specific material/i, /Inconel 718/i);
        fireEvent.click(screen.getByRole('button', { name: /stock shape round/i }));
        setNumber(/^Diameter$/i, 76); setNumber(/^Length$/i, 140); setNumber(/^Projection$/i, 52);
        await chooseOption(/programming package select/i, /esprit/i);
        await chooseOption(/cam license tier/i, /live-tooling seat/i);
        await chooseOption(/toolpath type select/i, /live-tool milling/i);
        await chooseOption(/exact toolpath select/i, /mill-turn live milling/i);
        await chooseFirst(/holder type/i, [/live|milling head/i]);
        await chooseFirst(/holder size or interface/i, [/capto|bmt|hsk-t/i]);
        await chooseFirst(/holder package|compatible tool holder/i, [/live-tool|capto|bmt/i]);
        await chooseOption(/holder style/i, /live tooling/i);
        await chooseOption(/tool construction/i, /solid/i);
        await chooseFirst(/tool type/i, [/live tool endmill/i, /endmill/i]);
        await chooseFirst(/tool family/i, [/live tool end mill/i]);
        await chooseFirst(/saved workholding preset/i, [/collet|subspindle|chuck/i]);
        await chooseFirst(/stability posture/i, [/index.?ready/i]);
        await chooseOption(/entry style/i, /balanced/i);
        await chooseOption(/finish target/i, /general/i);
        fireEvent.click(screen.getByRole('button', { name: /finish target mode manual/i }));
        setSlider(/desired ra finish/i, 1.6);
        setNumber(/tool diameter/i, 9.525); setNumber(/flutes \/ stations/i, 4); setNumber(/^DOC$/i, 2.1); setNumber(/WOC \/ engagement/i, 0.8);
        await chooseOption(/coolant strategy/i, /through-spindle/i);
      },
      snapshot: /MULTUS U3000/i,
      response: { result: { spindle_rpm: 3200, cutting_speed_mpm: 95.8, feed_rate_mmmin: 320, feed_per_tooth_mm: 0.025, power_kw: 5.9, torque_nm: 17.6, mrr_cm3min: 12.4, tool_life_min: 9, surface_finish_Ra_um: 1.6, overall_confidence: 0.78, resolved_tool: { corner_radius_mm: 0.2 }, resolved_machine: { name: 'Okuma MULTUS U3000' }, resolved_cam_strategy: { strategy_name: 'Mill-Turn Live Milling' } } },
      expectRequest: { machine_name: 'Okuma MULTUS U3000', material: 'Inconel 718', machine_type: 'lathe', cam_strategy: 'Mill-Turn Live Milling', coolant_type: 'through_tool' },
      confidence: /78% confidence/i,
    },
  ])('solves $name through the full page workflow', async ({ mode, configure, snapshot, response, expectRequest, confidence }) => {
    const requests = installFetchMock({ speedFeed: () => response });
    await renderCalculator();
    fireEvent.click(screen.getByRole('button', { name: /unit system metric/i }));
    if (mode) clickModeButton(mode);
    await configure();
    await saveSnapshot(snapshot);
    fireEvent.click(screen.getByRole('button', { name: /run prism calculation/i }));
    const normalized = normalizeCalculatorSpeedFeedResult(response);
    await waitFor(() => expect(metricValue('RPM')).toBe(formatMetric(normalized.rpm)), { timeout: 4000 });
    expect(metricValue('Cutting speed')).toBe(formatMetric(normalized.cuttingSpeed, 1));
    expect(metricValue('Feed rate')).toBe(formatMetric(normalized.feedRate, 1));
    expect(metricValue('Power')).toBe(formatMetric(normalized.powerKw, 1));
    expect(metricValue('Surface finish')).toBe(formatMetric(normalized.ra, 2));
    expect(screen.getByText(confidence)).toBeDefined();
    expect(requests.find((entry) => entry.url.includes('/api/v1/speed-feed/orchestrate'))?.body).toMatchObject(expectRequest);
  }, 45000);

  it('solves a wire EDM skim ladder through the full page workflow', async () => {
    const response = { result: { first_cut_speed_mm_min: 6.8, skim_speeds: [12.4, 16.8, 21.5], wire_tension_N: 13.2, flushing_pressure_bar: 2.0, power_pct: 62, total_time_min: 97, total_wire_m: 285, safety_score: 0.88, estimated_cost: { machine_usd: 121.4, wire_usd: 28.5, consumables_usd: 9.2, post_process_usd: 16, total_usd: 175.1, breakdown: [{ category: 'machine', amount: 121.4, pct_of_total: 69.3 }] }, wire_break_risk: { probability: 0.07, severity: 'medium', factors: ['tool steel thickness'], mitigations: ['keep flushing stable'] }, corner_compensation: [{ overtravel_mm: 0.05, dwell_s: 0.3, angle_deg: 90 }], surface_integrity: { recast_um: 1.1, haz_um: 8, residual_stress_MPa: 35, fatigue_reduction_pct: 4, spec_compliance: [{ standard: 'AMS 2628', pass: true, violations: [] }] }, recommendations: ['Keep skim ladder and slug-control active.'], passes: [{ type: 'rough', offset_mm: 0.18, energy_pct: 100, speed_mm_min: 6.8, time_min: 42.1, wire_m: 122.4, predicted_Ra_um: 2.4, predicted_recast_um: 16, t_on_us: 0.8, t_off_us: 12.5, peak_current_A: 15, servo_voltage_V: 42, wire_speed_m_min: 12, power_pct: 62 }, { type: 'skim', offset_mm: 0.06, energy_pct: 28, speed_mm_min: 12.4, time_min: 22.9, wire_m: 68.3, predicted_Ra_um: 0.92, predicted_recast_um: 5.2, t_on_us: 0.5, t_off_us: 14, peak_current_A: 8, servo_voltage_V: 38, wire_speed_m_min: 13, power_pct: 28 }, { type: 'skim', offset_mm: 0.02, energy_pct: 16, speed_mm_min: 16.8, time_min: 17.7, wire_m: 52.9, predicted_Ra_um: 0.56, predicted_recast_um: 2.4, t_on_us: 0.35, t_off_us: 16, peak_current_A: 5, servo_voltage_V: 36, wire_speed_m_min: 13, power_pct: 16 }, { type: 'skim', offset_mm: 0.005, energy_pct: 10, speed_mm_min: 21.5, time_min: 14.3, wire_m: 41.4, predicted_Ra_um: 0.38, predicted_recast_um: 1.1, t_on_us: 0.25, t_off_us: 18, peak_current_A: 3, servo_voltage_V: 34, wire_speed_m_min: 14, power_pct: 10 }] } };
    const requests = installFetchMock({ wedm: () => response });
    await renderCalculator();
    fireEvent.click(screen.getByRole('button', { name: /unit system metric/i }));
    clickModeButton('Wire EDM');
    await chooseOption(/machine from catalog/i, /c600ib/i);
    await chooseOption(/material group/i, /tool steel/i);
    await chooseFirst(/material subcategory/i, [/cold work/i, /general tool steel/i]);
    await chooseOption(/specific material/i, /D2 Tool Steel/i);
    fireEvent.click(screen.getByRole('button', { name: /stock shape plate/i }));
    setNumber(/^Length$/i, 125); setNumber(/^Width$/i, 75); setNumber(/^Height$/i, 40);
    await chooseOption(/programming package select/i, /mastercam wire/i);
    await chooseOption(/cam license tier/i, /full wire seat/i);
    await chooseOption(/toolpath type select/i, /skim \/ finish passes/i);
    await chooseOption(/exact toolpath select/i, /skim passes/i);
    await chooseOption(/holder style/i, /taper package/i);
    await chooseOption(/tool family/i, /0\.25 mm brass wire/i);
    await chooseOption(/stability posture/i, /detail control/i);
    await chooseOption(/fixture family/i, /wire \/ edm fixture/i);
    await chooseOption(/entry style/i, /finish skim/i);
    await chooseOption(/finish target/i, /tight finish/i);
    fireEvent.click(screen.getByRole('button', { name: /finish target mode manual/i }));
    setSlider(/desired ra finish/i, 0.4);
    setNumber(/tool diameter/i, 0.25); setNumber(/flutes \/ stations/i, 1); setNumber(/^DOC$/i, 40); setNumber(/WOC \/ engagement/i, 0.25);
    await chooseOption(/coolant strategy/i, /dielectric/i);
    await saveSnapshot(/C600iB/i);
    fireEvent.click(screen.getByRole('button', { name: /run prism calculation/i }));
    await waitFor(() => expect(metricValue('First cut speed')).toBe(formatMetric(6.8, 1)), { timeout: 5000 });
    expect(metricValue('Total time')).toBe(formatMetric(97, 1));
    expect(metricValue('Wire used')).toBe(formatMetric(285, 1));
    expect(metricValue('Power')).toBe(formatMetric(62, 0));
    expect(metricValue('Surface finish')).toBe(formatMetric(0.38, 2));
    expect(metricValue('Safety score')).toBe(formatMetric(88, 0));
    expect(screen.getByText(/88% confidence/i)).toBeDefined();
    expect(requests.find((entry) => entry.url.includes('/api/v1/edm/calculator-solve'))?.body).toMatchObject({ material: 'd2', thickness_mm: 40, target_Ra_um: 0.4, wire_type: 'zinc_coated', wire_diameter_mm: 0.25, cut_type: 'skim_only', machine_id: 'fanuc-c600ib', optimization_goal: 'surface_finish', is_submerged: true, workholding_type: 'wire-fixture' });
  }, 30000);
});
