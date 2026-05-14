/**
 * WedmMaterialThicknessChart tests
 * P2P-FULLSTACK-MS0 / U-P2PFS52
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  WedmMaterialThicknessChart,
  interpolateSpeed,
} from '../components/wedm/WedmMaterialThicknessChart';

const D2_CURVE = [
  { thickness_mm: 5, cut_speed_mm_min: 5.8 },
  { thickness_mm: 10, cut_speed_mm_min: 4.2 },
  { thickness_mm: 20, cut_speed_mm_min: 2.9 },
  { thickness_mm: 40, cut_speed_mm_min: 1.7 },
  { thickness_mm: 80, cut_speed_mm_min: 0.9 },
];

// ── interpolateSpeed (pure) ──────────────────────────────────────────────

describe('interpolateSpeed', () => {
  it('returns endpoint values exactly when thickness lands on a sample', () => {
    expect(interpolateSpeed(D2_CURVE, 10)).toBeCloseTo(4.2, 6);
    expect(interpolateSpeed(D2_CURVE, 80)).toBeCloseTo(0.9, 6);
  });

  it('linearly interpolates between flanking samples', () => {
    // Halfway between 10 mm (4.2) and 20 mm (2.9) → (4.2+2.9)/2 = 3.55
    expect(interpolateSpeed(D2_CURVE, 15)).toBeCloseTo(3.55, 3);
  });

  it('returns null for thickness outside the sampled range', () => {
    expect(interpolateSpeed(D2_CURVE, 0)).toBeNull();
    expect(interpolateSpeed(D2_CURVE, 200)).toBeNull();
  });

  it('returns null on NaN or too-few samples', () => {
    expect(interpolateSpeed(D2_CURVE, Number.NaN)).toBeNull();
    expect(interpolateSpeed([D2_CURVE[0]], 10)).toBeNull();
  });
});

// ── Component ────────────────────────────────────────────────────────────

describe('WedmMaterialThicknessChart', () => {
  it('renders an empty placeholder for missing or <2-sample curves', () => {
    render(<WedmMaterialThicknessChart curve={null} />);
    expect(screen.getByTestId('wedm-thickness-chart-empty')).toBeInTheDocument();
  });

  it('renders a circle per clean sample (sorted by thickness)', () => {
    render(<WedmMaterialThicknessChart curve={D2_CURVE} material="D2" />);
    const circles = screen.getAllByTestId('thickness-chart-point');
    expect(circles).toHaveLength(D2_CURVE.length);
    const xs = circles.map((c) => Number(c.getAttribute('data-point-x')));
    // Ensure ascending — component sorts input internally.
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
  });

  it('filters out non-finite / negative samples', () => {
    const dirty = [
      ...D2_CURVE,
      { thickness_mm: Number.NaN, cut_speed_mm_min: 5 },
      { thickness_mm: -10, cut_speed_mm_min: 5 },
      { thickness_mm: 50, cut_speed_mm_min: Number.NaN },
    ];
    render(<WedmMaterialThicknessChart curve={dirty} material="D2" />);
    expect(screen.getAllByTestId('thickness-chart-point')).toHaveLength(
      D2_CURVE.length,
    );
  });

  it('renders an SVG path for the curve', () => {
    const { container } = render(
      <WedmMaterialThicknessChart curve={D2_CURVE} material="D2" />,
    );
    const path = container.querySelector('[data-testid="thickness-chart-path"]');
    expect(path).not.toBeNull();
    expect(path!.getAttribute('d')).toMatch(/^M[\d.]+,[\d.]+ L/);
  });

  it('paints a job-point overlay when thickness is in range', () => {
    render(
      <WedmMaterialThicknessChart
        curve={D2_CURVE}
        material="D2"
        jobPoint={{ thickness_mm: 15 }}
      />,
    );
    expect(screen.getByTestId('thickness-chart-job-point')).toBeInTheDocument();
    const dot = screen.getByTestId('thickness-chart-job-dot');
    // 15 mm is halfway between 10 and 20 → interpolated speed 3.55 mm/min
    expect(Number(dot.getAttribute('data-job-speed'))).toBeCloseTo(3.55, 3);
  });

  it('does not paint job-point overlay when thickness is out of range', () => {
    render(
      <WedmMaterialThicknessChart
        curve={D2_CURVE}
        material="D2"
        jobPoint={{ thickness_mm: 500 }}
      />,
    );
    expect(screen.queryByTestId('thickness-chart-job-point')).not.toBeInTheDocument();
  });

  it('prefers explicit jobPoint.cut_speed_mm_min over interpolated value', () => {
    render(
      <WedmMaterialThicknessChart
        curve={D2_CURVE}
        material="D2"
        jobPoint={{ thickness_mm: 15, cut_speed_mm_min: 2.5 }}
      />,
    );
    const dot = screen.getByTestId('thickness-chart-job-dot');
    expect(Number(dot.getAttribute('data-job-speed'))).toBeCloseTo(2.5, 6);
  });

  it('uses jobPoint.label when supplied', () => {
    render(
      <WedmMaterialThicknessChart
        curve={D2_CURVE}
        material="D2"
        jobPoint={{ thickness_mm: 15, label: 'Current job' }}
      />,
    );
    expect(screen.getByTestId('thickness-chart-job-label').textContent).toBe(
      'Current job',
    );
  });

  it('renders 4 ticks on each axis', () => {
    render(<WedmMaterialThicknessChart curve={D2_CURVE} material="D2" />);
    expect(screen.getAllByTestId('thickness-chart-x-tick')).toHaveLength(4);
    expect(screen.getAllByTestId('thickness-chart-y-tick')).toHaveLength(4);
  });

  it('ARIA label cites material, sample count, thickness range', () => {
    render(<WedmMaterialThicknessChart curve={D2_CURVE} material="D2" />);
    const label = screen.getByRole('region').getAttribute('aria-label') ?? '';
    expect(label).toContain('D2');
    expect(label).toContain('5 samples');
    expect(label).toMatch(/5.+80 mm/);
  });

  it('exposes sample count + material on root data attrs', () => {
    render(<WedmMaterialThicknessChart curve={D2_CURVE} material="D2" />);
    const root = screen.getByTestId('wedm-thickness-chart');
    expect(root.getAttribute('data-material')).toBe('D2');
    expect(root.getAttribute('data-sample-count')).toBe(String(D2_CURVE.length));
  });
});
