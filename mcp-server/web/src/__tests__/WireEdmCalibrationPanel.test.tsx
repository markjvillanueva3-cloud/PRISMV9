// @vitest-environment jsdom
/**
 * WireEdmCalibrationPanel tests — WEDM-CAL-MS4 / U-CAL19
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  WireEdmCalibrationPanel,
  type WireEdmCalibrationReport,
  type CalibrationHistoryPoint,
} from '../components/wedm/WireEdmCalibrationPanel';

const PERFECT_REPORT: WireEdmCalibrationReport = {
  reference_filename: 'REF.NC',
  generated_filename: 'GEN.NC',
  overall_match: 1.0,
  overall_grade: 'excellent',
  production_ready: true,
  summary: 'REF.NC vs GEN.NC: match=100.0% (excellent). 0 critical, 0 major, 0 minor, 9 match.',
  deviations: [
    { parameter: 'dialect', reference: 'mitsubishi', generated: 'mitsubishi', match: 1, severity: 'match' },
    { parameter: 'pass_count', reference: 4, generated: 4, match: 1, severity: 'match', deviation_pct: 0 },
    { parameter: 'offset_cascade', reference: '[0.01000, 0.00750]', generated: '[0.01000, 0.00750]', match: 1, severity: 'match', deviation_pct: 0 },
  ],
};

const DRIFTED_REPORT: WireEdmCalibrationReport = {
  reference_filename: 'ITW.NC',
  generated_filename: 'PRISM.NC',
  overall_match: 0.62,
  overall_grade: 'poor',
  production_ready: false,
  summary: 'ITW.NC vs PRISM.NC: match=62.0% (poor). 1 critical, 2 major, 1 minor, 5 match.',
  deviations: [
    { parameter: 'dialect', reference: 'mitsubishi', generated: 'mitsubishi', match: 1, severity: 'match' },
    { parameter: 'pass_count', reference: 4, generated: 5, match: 0.6, severity: 'major', deviation_pct: 25 },
    { parameter: 'e_code_family', reference: 'E122', generated: 'E128', match: 0, severity: 'critical', note: 'family mismatch' },
    { parameter: 'feed_cascade', reference: '[0.10, 0.12]', generated: '[0.06, 0.08]', match: 0.55, severity: 'major', deviation_pct: -40 },
    { parameter: 'safety_block', reference: '5/5 terminators', generated: '4/5 terminators', match: 0.8, severity: 'minor', note: 'missing 1 terminator' },
  ],
};

const HISTORY: CalibrationHistoryPoint[] = [
  { timestamp: '2026-04-01T00:00:00Z', overall_match: 0.55 },
  { timestamp: '2026-04-05T00:00:00Z', overall_match: 0.62 },
  { timestamp: '2026-04-10T00:00:00Z', overall_match: 0.78 },
  { timestamp: '2026-04-15T00:00:00Z', overall_match: 0.89 },
];

beforeEach(() => {
  cleanup();
});

describe('WireEdmCalibrationPanel', () => {
  it('renders empty state when report is null', () => {
    render(<WireEdmCalibrationPanel report={null} />);
    expect(screen.getByTestId('calibration-panel-empty')).toBeTruthy();
    expect(screen.queryByTestId('calibration-panel')).toBeNull();
  });

  it('renders loading state when isLoading is true', () => {
    render(<WireEdmCalibrationPanel report={null} isLoading />);
    expect(screen.getByTestId('calibration-panel-loading')).toBeTruthy();
  });

  it('renders hero gauge with overall match percentage and grade', () => {
    render(<WireEdmCalibrationPanel report={PERFECT_REPORT} />);
    expect(screen.getByTestId('overall-match').textContent).toBe('100.0%');
    expect(screen.getByTestId('overall-grade').textContent?.toLowerCase()).toBe('excellent');
  });

  it('shows PRODUCTION READY chip when report.production_ready is true', () => {
    render(<WireEdmCalibrationPanel report={PERFECT_REPORT} />);
    const chip = screen.getByTestId('production-ready-chip');
    expect(chip.textContent).toContain('PRODUCTION READY');
  });

  it('shows NOT READY chip when report.production_ready is false', () => {
    render(<WireEdmCalibrationPanel report={DRIFTED_REPORT} />);
    const chip = screen.getByTestId('production-ready-chip');
    expect(chip.textContent).toContain('NOT READY');
  });

  it('renders one deviation row per parameter', () => {
    render(<WireEdmCalibrationPanel report={DRIFTED_REPORT} />);
    for (const d of DRIFTED_REPORT.deviations) {
      expect(screen.getByTestId(`deviation-row-${d.parameter}`)).toBeTruthy();
    }
  });

  it('renders severity chips matching each deviation severity', () => {
    render(<WireEdmCalibrationPanel report={DRIFTED_REPORT} />);
    expect(screen.getAllByTestId('severity-chip-match').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('severity-chip-major').length).toBe(2);
    expect(screen.getAllByTestId('severity-chip-critical').length).toBe(1);
    expect(screen.getAllByTestId('severity-chip-minor').length).toBe(1);
  });

  it('displays deviation_pct with ± sign and units', () => {
    render(<WireEdmCalibrationPanel report={DRIFTED_REPORT} />);
    const row = screen.getByTestId('deviation-row-feed_cascade');
    expect(row.textContent).toMatch(/-40\.0%/);
  });

  it('displays notes when present', () => {
    render(<WireEdmCalibrationPanel report={DRIFTED_REPORT} />);
    expect(screen.getByText(/family mismatch/)).toBeTruthy();
    expect(screen.getByText(/missing 1 terminator/)).toBeTruthy();
  });

  it('renders calibration-history sparkline when history provided', () => {
    render(<WireEdmCalibrationPanel report={PERFECT_REPORT} history={HISTORY} />);
    expect(screen.getByTestId('history-polyline')).toBeTruthy();
    expect(screen.getByTestId('history-trend').textContent).toMatch(/▲/);
  });

  it('omits history sparkline when history is empty', () => {
    render(<WireEdmCalibrationPanel report={PERFECT_REPORT} history={[]} />);
    expect(screen.queryByTestId('history-polyline')).toBeNull();
  });

  it('calls onCalibrate when Calibrate button clicked', () => {
    const handler = vi.fn();
    render(<WireEdmCalibrationPanel report={DRIFTED_REPORT} onCalibrate={handler} />);
    fireEvent.click(screen.getByTestId('calibrate-button'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('disables Calibrate button when calibrateDisabled=true', () => {
    const handler = vi.fn();
    render(
      <WireEdmCalibrationPanel
        report={DRIFTED_REPORT}
        onCalibrate={handler}
        calibrateDisabled
      />,
    );
    const btn = screen.getByTestId('calibrate-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('calls onRecompare when Re-compare button clicked', () => {
    const handler = vi.fn();
    render(<WireEdmCalibrationPanel report={PERFECT_REPORT} onRecompare={handler} />);
    fireEvent.click(screen.getByTestId('recompare-button'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not render action buttons when handlers omitted', () => {
    render(<WireEdmCalibrationPanel report={PERFECT_REPORT} />);
    expect(screen.queryByTestId('calibrate-button')).toBeNull();
    expect(screen.queryByTestId('recompare-button')).toBeNull();
  });

  it('displays summary text from report', () => {
    render(<WireEdmCalibrationPanel report={DRIFTED_REPORT} />);
    expect(screen.getByText(DRIFTED_REPORT.summary)).toBeTruthy();
  });

  it('shows reference → generated filename trace', () => {
    render(<WireEdmCalibrationPanel report={DRIFTED_REPORT} />);
    // Both the hero trace and the summary contain the filenames; at least one must render.
    const matches = screen.getAllByText(/ITW\.NC.*PRISM\.NC/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('match-bar-fill width corresponds to match fraction (visual proxy)', () => {
    render(<WireEdmCalibrationPanel report={PERFECT_REPORT} />);
    const fills = screen.getAllByTestId('match-bar-fill');
    // Hero bar + per-parameter bars (1 + 3 = 4)
    expect(fills.length).toBe(4);
    // Hero bar is first
    const heroWidth = (fills[0] as HTMLElement).style.width;
    expect(heroWidth).toBe('100%');
  });
});
