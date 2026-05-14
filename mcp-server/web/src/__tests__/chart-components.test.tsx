/**
 * Chart Components — Unit tests
 *
 * Tests RadarChart, ProgressRing, BarChart, Sparkline.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';

// Lazy imports
let RadarChart: React.FC<any>;
let ProgressRing: React.FC<any>;
let BarChart: React.FC<any>;
let Sparkline: React.FC<any>;

beforeAll(async () => {
  const radar = await import('../components/charts/RadarChart');
  RadarChart = radar.RadarChart;
  const progress = await import('../components/charts/ProgressRing');
  ProgressRing = progress.ProgressRing;
  const bar = await import('../components/charts/BarChart');
  BarChart = bar.BarChart;
  const spark = await import('../components/charts/Sparkline');
  Sparkline = spark.Sparkline;
});

// ============================================================================
// RadarChart
// ============================================================================
describe('RadarChart', () => {
  const sampleData = [
    { label: 'Speed', value: 80 },
    { label: 'Power', value: 60 },
    { label: 'Accuracy', value: 90 },
    { label: 'Finish', value: 75 },
    { label: 'Life', value: 85 },
  ];

  it('renders an SVG with correct role and aria-label', () => {
    const { container } = render(<RadarChart data={sampleData} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('role')).toBe('img');
    expect(svg!.getAttribute('aria-label')).toBe('Skill radar chart');
  });

  it('renders labels for all data points', () => {
    const { container } = render(<RadarChart data={sampleData} />);
    const texts = container.querySelectorAll('text');
    const labels = Array.from(texts).map(t => t.textContent);
    expect(labels).toContain('Speed');
    expect(labels).toContain('Power');
    expect(labels).toContain('Accuracy');
    expect(labels).toContain('Finish');
    expect(labels).toContain('Life');
  });

  it('renders grid rings (4 polygons for grid)', () => {
    const { container } = render(<RadarChart data={sampleData} />);
    const polygons = container.querySelectorAll('polygon');
    // 4 grid rings
    expect(polygons.length).toBe(4);
  });

  it('renders data polygon as a path element', () => {
    const { container } = render(<RadarChart data={sampleData} />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(1);
  });

  it('renders data point circles', () => {
    const { container } = render(<RadarChart data={sampleData} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(5); // one per data point
  });

  it('returns null if fewer than 3 data points', () => {
    const { container } = render(
      <RadarChart data={[{ label: 'A', value: 50 }, { label: 'B', value: 60 }]} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('respects custom size prop', () => {
    const { container } = render(<RadarChart data={sampleData} size={300} />);
    const svg = container.querySelector('svg');
    expect(svg!.getAttribute('width')).toBe('300');
    expect(svg!.getAttribute('height')).toBe('300');
  });
});

// ============================================================================
// ProgressRing
// ============================================================================
describe('ProgressRing', () => {
  it('renders an SVG with percentage aria-label', () => {
    const { container } = render(<ProgressRing value={75} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('aria-label')).toBe('75%');
  });

  it('displays percentage text', () => {
    render(<ProgressRing value={42} />);
    expect(screen.getByText('42%')).toBeDefined();
  });

  it('renders label when provided', () => {
    render(<ProgressRing value={60} label="Completion" />);
    expect(screen.getByText('Completion')).toBeDefined();
  });

  it('clamps percentage to 100%', () => {
    const { container } = render(<ProgressRing value={150} max={100} />);
    const svg = container.querySelector('svg');
    expect(svg!.getAttribute('aria-label')).toBe('100%');
  });

  it('renders two circle elements (background + progress)', () => {
    const { container } = render(<ProgressRing value={50} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2);
  });

  it('respects custom size prop', () => {
    const { container } = render(<ProgressRing value={50} size={120} />);
    const svg = container.querySelector('svg');
    expect(svg!.getAttribute('width')).toBe('120');
  });
});

// ============================================================================
// BarChart
// ============================================================================
describe('BarChart', () => {
  const sampleData = [
    { label: 'Roughing', value: 45 },
    { label: 'Finishing', value: 30 },
    { label: 'Drilling', value: 15 },
    { label: 'Tapping', value: 10 },
  ];

  it('renders all bar labels', () => {
    render(<BarChart data={sampleData} />);
    expect(screen.getByText('Roughing')).toBeDefined();
    expect(screen.getByText('Finishing')).toBeDefined();
    expect(screen.getByText('Drilling')).toBeDefined();
    expect(screen.getByText('Tapping')).toBeDefined();
  });

  it('renders all bar values', () => {
    render(<BarChart data={sampleData} />);
    expect(screen.getByText('45')).toBeDefined();
    expect(screen.getByText('30')).toBeDefined();
    expect(screen.getByText('15')).toBeDefined();
    expect(screen.getByText('10')).toBeDefined();
  });

  it('renders correct number of bar elements', () => {
    const { container } = render(<BarChart data={sampleData} />);
    // Each bar has a background track and a fill div
    const tracks = container.querySelectorAll('.bg-gray-100');
    expect(tracks.length).toBe(4);
  });

  it('renders with single data point', () => {
    render(<BarChart data={[{ label: 'Solo', value: 100 }]} />);
    expect(screen.getByText('Solo')).toBeDefined();
    expect(screen.getByText('100')).toBeDefined();
  });
});

// ============================================================================
// Sparkline
// ============================================================================
describe('Sparkline', () => {
  it('renders an SVG with correct role and aria-label', () => {
    const { container } = render(<Sparkline data={[10, 20, 15, 25, 30]} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('role')).toBe('img');
    expect(svg!.getAttribute('aria-label')).toBe('Trend line');
  });

  it('renders a polyline element', () => {
    const { container } = render(<Sparkline data={[5, 10, 8, 12]} />);
    const polyline = container.querySelector('polyline');
    expect(polyline).not.toBeNull();
  });

  it('returns null if fewer than 2 data points', () => {
    const { container } = render(<Sparkline data={[5]} />);
    expect(container.innerHTML).toBe('');
  });

  it('respects custom width and height props', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} width={200} height={48} />);
    const svg = container.querySelector('svg');
    expect(svg!.getAttribute('width')).toBe('200');
    expect(svg!.getAttribute('height')).toBe('48');
  });

  it('renders with default size when no props provided', () => {
    const { container } = render(<Sparkline data={[10, 20, 30]} />);
    const svg = container.querySelector('svg');
    expect(svg!.getAttribute('width')).toBe('100');
    expect(svg!.getAttribute('height')).toBe('24');
  });
});
