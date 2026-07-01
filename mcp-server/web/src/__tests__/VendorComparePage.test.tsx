// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VendorComparePage from '../pages/VendorComparePage';
import { speedFeedApi } from '../api/speedfeed';
import type { TriCompareResult } from '../types/speedfeed';

// The page calls useSpeedFeedTriCompare -> speedFeedApi.triCompare (the unwrapped api
// client that returns a clean TriCompareResult). Mock that one method.
vi.mock('../api/speedfeed', async () => {
  const actual = await vi.importActual<typeof import('../api/speedfeed')>('../api/speedfeed');
  return {
    ...actual,
    speedFeedApi: { ...actual.speedFeedApi, triCompare: vi.fn() },
  };
});

const mockTriCompare = vi.mocked(speedFeedApi.triCompare);

// A realistic result: PRISM + literature baseline available, HSMAdvisor + G-Wizard NOT
// installed (the common case on any box without those apps) -> available:false with a reason.
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
    {
      system: 'baseline',
      available: true,
      axes: { vc_mpm: 165, fz_mm: 0.075, rpm: 5250, feed_mmmin: 1575, mrr_cm3min: 63 },
      source_note: 'AISI 4140 -- median of 2 source(s)',
    },
    {
      system: 'hsmadvisor',
      available: false,
      axes: null,
      unavailable_reason: 'no live Cut open in HSMAdvisor',
      source_note: 'HSMAdvisor live Cut',
    },
    {
      system: 'gwizard',
      available: false,
      axes: null,
      unavailable_reason: 'G-Wizard tool crib not found',
      source_note: 'G-Wizard tool crib',
    },
  ],
  consensus: { vc_mpm: 165, fz_mm: 0.075, rpm: 5250, feed_mmmin: 1575 },
  prism_vs_consensus: {
    per_axis: [
      // Verdicts are engine-faithful to VERDICT_BAND=0.1: |delta_pct| <= 0.10 -> aligned,
      // > 0.10 -> prism_higher/lower. So vc/fz/rpm (all < 10%) are aligned; feed (16.4%) is higher.
      { axis: 'vc', prism: 180, consensus: 165, delta_abs: 15, delta_pct: 0.0909, verdict: 'aligned', agreement: 0.818 },
      { axis: 'fz', prism: 0.08, consensus: 0.075, delta_abs: 0.005, delta_pct: 0.0667, verdict: 'aligned', agreement: 0.867 },
      { axis: 'rpm', prism: 5730, consensus: 5250, delta_abs: 480, delta_pct: 0.0914, verdict: 'aligned', agreement: 0.817 },
      { axis: 'feed', prism: 1833, consensus: 1575, delta_abs: 258, delta_pct: 0.1638, verdict: 'prism_higher', agreement: 0.672 },
    ],
    overall_agreement: 0.79,
    external_systems_used: 1,
    verdict_summary: 'Kienzle vs 1-system consensus: aligned on vc/fz/rpm, more aggressive on feed (agreement 79%).',
  },
  pairwise: [{ vs: 'baseline', agreement: 0.79 }],
  baseline_detail: {
    baseline_found: true,
    baseline_key: 'P|carbide|milling|roughing',
    per_source: [
      { source: 'cnccookbook', citation: 'CNCCookbook G-Wizard published', vc_variance_pct: 9.1, fz_variance_pct: 6.7, notes: '' },
      { source: 'sandvik', citation: 'Sandvik Coromant', vc_variance_pct: 4.2, fz_variance_pct: 3.1, notes: '' },
    ],
  },
  warnings: ['hsmadvisor: no live cut open in HSMAdvisor'],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/vendor-compare']}>
      <VendorComparePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  mockTriCompare.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('VendorComparePage', () => {
  it('renders an empty state and does not call the backend before a comparison is run', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Compare Vendors' })).toBeEnabled();
    expect(screen.getByText(/Set the cut on the left and run a comparison/i)).toBeInTheDocument();
    // empty state -> the systems table is absent and no request fired
    expect(screen.queryByText('Literature Baseline')).not.toBeInTheDocument();
    expect(mockTriCompare).not.toHaveBeenCalled();
  });

  it('assembles a nested TriCompareInput from the form and renders each available system value', async () => {
    mockTriCompare.mockResolvedValue(RESULT);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Compare Vendors' }));

    await waitFor(() => expect(mockTriCompare).toHaveBeenCalledTimes(1));
    const arg = mockTriCompare.mock.calls[0][0];
    expect(arg.material.iso_group).toBe('P');
    expect(arg.material.name).toBe('AISI 4140');
    expect(arg.tooling.tool_diameter_mm).toBe(10);
    expect(arg.tooling.flutes).toBe(4);
    expect(arg.tooling.tool_material).toBe('carbide');
    expect(arg.toolpath?.operation).toBe('milling');
    expect(arg.toolpath?.cut_type).toBe('roughing');
    expect(arg.optimization_mode).toBe('prism_optimized');

    // PRISM + Literature Baseline render with their exact computed values.
    const prismRow = (await screen.findByText('Kienzle')).closest('tr') as HTMLElement;
    expect(prismRow).toHaveTextContent('180.0'); // Vc m/min
    expect(prismRow).toHaveTextContent('0.0800'); // fz mm/tooth
    expect(prismRow).toHaveTextContent('5730'); // rpm
    const baseRow = screen.getByText('Literature Baseline').closest('tr') as HTMLElement;
    expect(baseRow).toHaveTextContent('165.0');
    expect(baseRow).toHaveTextContent('63.00'); // mrr cm3/min
  });

  it('renders unavailable vendors with their honest reason, never a fabricated number', async () => {
    mockTriCompare.mockResolvedValue(RESULT);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Compare Vendors' }));

    const hsmRow = (await screen.findByText('HSMAdvisor')).closest('tr') as HTMLElement;
    expect(hsmRow).toHaveTextContent('Not available: no live Cut open in HSMAdvisor');
    // no numeric axis value leaked into an unavailable row
    expect(hsmRow).not.toHaveTextContent('180.0');
    const gwRow = screen.getByText('G-Wizard').closest('tr') as HTMLElement;
    expect(gwRow).toHaveTextContent('G-Wizard tool crib not found');
  });

  it('renders the Kienzle-vs-consensus verdict summary and per-axis verdict badges', async () => {
    mockTriCompare.mockResolvedValue(RESULT);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Compare Vendors' }));

    expect(await screen.findByText(/Kienzle vs 1-system consensus/i)).toHaveTextContent(
      'aligned on vc/fz/rpm, more aggressive on feed',
    );
    // "Agreement 79%" appears in both the badge and (lowercased) the summary -- assert it renders.
    expect(screen.getAllByText(/Agreement 79%/i).length).toBeGreaterThanOrEqual(1);
    // distinct verdicts both render with the correct label, color-mapped category, and signed delta:
    // vc is within the +/-10% band -> Aligned; feed exceeds it -> PRISM higher.
    expect(screen.getByText(/Cutting speed \(Vc\): Aligned \(\+9\.1%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Feed rate: Kienzle higher \(\+16\.4%\)/i)).toBeInTheDocument();
  });

  it('renders the per-vendor published deltas (Kienzle vs each reference source)', async () => {
    mockTriCompare.mockResolvedValue(RESULT);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Compare Vendors' }));

    const cncRow = (await screen.findByText('cnccookbook')).closest('tr') as HTMLElement;
    expect(cncRow).toHaveTextContent('CNCCookbook G-Wizard published');
    expect(cncRow).toHaveTextContent('+9.1%'); // vc variance
    expect(cncRow).toHaveTextContent('+6.7%'); // fz variance
  });

  it('surfaces an error state on failure and renders no systems table (no fabricated result)', async () => {
    mockTriCompare.mockRejectedValue(new Error('Vendor comparison failed'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Compare Vendors' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Vendor comparison failed');
    expect(screen.getByText('Comparison failed')).toBeInTheDocument();
    expect(screen.queryByText('Literature Baseline')).not.toBeInTheDocument();
  });

  it('renders a Kienzle-only message when no external system is available (consensus null)', async () => {
    mockTriCompare.mockResolvedValue({
      ...RESULT,
      systems: [RESULT.systems[0]],
      consensus: null,
      prism_vs_consensus: null,
      baseline_detail: null,
      pairwise: [],
      warnings: ['No external system available -- consensus + Kienzle verdict omitted (Kienzle-only result).'],
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Compare Vendors' }));

    // The verdict card shows the PRISM-only message (unique to the verdict card, distinct
    // from the warnings list which also mentions "No external system available").
    expect(
      await screen.findByText(/Open a matching cut in HSMAdvisor or load a G-Wizard crib/i),
    ).toBeInTheDocument();
    // PRISM still renders its row; no per-axis verdict badges exist without consensus
    expect(screen.getByText('Kienzle')).toBeInTheDocument();
    expect(screen.queryByText(/Kienzle higher/i)).not.toBeInTheDocument();
  });
});
