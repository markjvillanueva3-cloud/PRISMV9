// @vitest-environment jsdom
/**
 * WEDM-ERP-MS0 / U-WEDM-ERP09 — WedmJobCard component tests
 *
 * Exercises: default render, status/priority chip styling, pass progress
 * visibility rules, variance tone classification, warning chips,
 * keyboard accessibility, callback invocation, complete-button guards.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WedmJobCard, type WedmJobCardData } from '../components/jobs/WedmJobCard';

afterEach(() => {
  cleanup();
});

function makeJob(overrides: Partial<WedmJobCardData> = {}): WedmJobCardData {
  return {
    job_id: 'WEDM-001',
    part_number: 'P-12345',
    part_name: 'Die cavity insert',
    customer: 'ITW Shakeproof',
    material: 'D2',
    thickness_mm: 25.4,
    priority: 'rush',
    status: 'rough_cutting',
    quantity: 4,
    due_date: '2026-05-15T00:00:00Z',
    machine_id: 'MIT-FA20',
    current_pass: 1,
    total_passes: 4,
    wire_m_estimated: 1800,
    wire_m_actual: 900,
    time_min_estimated: 480,
    time_min_actual: 220,
    break_count: 0,
    safety_warnings: [],
    ...overrides,
  };
}

// ─── Default render ─────────────────────────────────────────────────────────

describe('U-WEDM-ERP09: WedmJobCard default render', () => {
  it('renders the card container with job_id in testid', () => {
    render(<WedmJobCard job={makeJob()} />);
    expect(screen.getByTestId('wedm-job-card-WEDM-001')).toBeTruthy();
  });

  it('renders customer, part name, and part number', () => {
    render(<WedmJobCard job={makeJob()} />);
    expect(screen.getByTestId('wedm-card-customer').textContent).toMatch(/ITW Shakeproof/);
    expect(screen.getByTestId('wedm-card-part').textContent).toMatch(/Die cavity insert/);
  });

  it('falls back to part_number when part_name is null', () => {
    render(<WedmJobCard job={makeJob({ part_name: null })} />);
    expect(screen.getByTestId('wedm-card-part').textContent).toMatch(/P-12345/);
  });

  it('renders material and thickness', () => {
    render(<WedmJobCard job={makeJob()} />);
    expect(screen.getByTestId('wedm-card-material').textContent).toMatch(/D2/);
  });

  it('renders em-dash when material is null', () => {
    render(<WedmJobCard job={makeJob({ material: null })} />);
    expect(screen.getByTestId('wedm-card-material').textContent).toMatch(/—/);
  });
});

// ─── Status and priority chips ──────────────────────────────────────────────

describe('U-WEDM-ERP09: chip labels and status coverage', () => {
  const cases: Array<[WedmJobCardData['status'], string]> = [
    ['scheduled',     /Scheduled/i],
    ['threading',     /Threading/i],
    ['rough_cutting', /Rough cut/i],
    ['skim_cutting',  /Skim pass/i],
    ['qc',            /QC/i],
    ['complete',      /Complete/i],
    ['on_hold',       /On hold/i],
    ['cancelled',     /Cancelled/i],
  ].map(([s, re]) => [s as WedmJobCardData['status'], re as unknown as string]);

  it.each(cases)('renders label for status=%s', (status, re) => {
    render(<WedmJobCard job={makeJob({ status })} />);
    expect(screen.getByTestId('wedm-card-status').textContent).toMatch(re as unknown as RegExp);
  });

  it('renders Emergency priority with red glow class', () => {
    render(<WedmJobCard job={makeJob({ priority: 'emergency' })} />);
    const chip = screen.getByTestId('wedm-card-priority');
    expect(chip.textContent).toMatch(/Emergency/);
    expect(chip.className).toMatch(/kienzle-glow-red/);
  });

  it('falls back to Standard label for unknown priority', () => {
    render(<WedmJobCard job={makeJob({ priority: 'bananas' })} />);
    expect(screen.getByTestId('wedm-card-priority').textContent).toMatch(/Standard/);
  });
});

// ─── Pass progress visibility ───────────────────────────────────────────────

describe('U-WEDM-ERP09: pass progress visibility rules', () => {
  it('shows pass progress bar during rough_cutting', () => {
    render(<WedmJobCard job={makeJob({ status: 'rough_cutting', current_pass: 1, total_passes: 4 })} />);
    expect(screen.getByTestId('wedm-card-pass-progress')).toBeTruthy();
    expect(screen.getByTestId('wedm-card-pass-progress').textContent).toMatch(/1\/4/);
  });

  it('shows pass progress during skim_cutting', () => {
    render(<WedmJobCard job={makeJob({ status: 'skim_cutting', current_pass: 3, total_passes: 4 })} />);
    expect(screen.getByTestId('wedm-card-pass-progress').textContent).toMatch(/3\/4/);
  });

  it('hides pass progress during scheduled (not actively cutting)', () => {
    render(<WedmJobCard job={makeJob({ status: 'scheduled', current_pass: null, total_passes: null })} />);
    expect(screen.queryByTestId('wedm-card-pass-progress')).toBeNull();
  });

  it('hides pass progress when total_passes is null', () => {
    render(<WedmJobCard job={makeJob({ current_pass: 1, total_passes: null })} />);
    expect(screen.queryByTestId('wedm-card-pass-progress')).toBeNull();
  });

  it('progress bar width reflects current/total ratio', () => {
    render(<WedmJobCard job={makeJob({ current_pass: 2, total_passes: 4 })} />);
    const bar = screen.getByTestId('wedm-card-progress-bar') as HTMLDivElement;
    expect(bar.style.width).toBe('50%');
  });
});

// ─── Variance tone classification ───────────────────────────────────────────

describe('U-WEDM-ERP09: variance tone classification', () => {
  it('renders variance pills when estimates + actuals present', () => {
    render(<WedmJobCard job={makeJob()} />);
    expect(screen.getByTestId('wedm-card-variance')).toBeTruthy();
    expect(screen.getByTestId('wedm-card-time-variance')).toBeTruthy();
    expect(screen.getByTestId('wedm-card-wire-variance')).toBeTruthy();
  });

  it('hides variance section entirely when no actuals yet', () => {
    render(<WedmJobCard job={makeJob({
      time_min_actual: null,
      wire_m_actual: null,
    })} />);
    expect(screen.queryByTestId('wedm-card-variance')).toBeNull();
  });

  it('emerald tone for within-5% overage (good)', () => {
    render(<WedmJobCard job={makeJob({
      time_min_actual: 504,   // +5% over 480 estimate
      time_min_estimated: 480,
    })} />);
    const pill = screen.getByTestId('wedm-card-time-variance');
    expect(pill.innerHTML).toMatch(/text-emerald-300/);
  });

  it('amber tone for 6–15% overage (warn)', () => {
    render(<WedmJobCard job={makeJob({
      time_min_actual: 528,   // +10% over 480
      time_min_estimated: 480,
    })} />);
    const pill = screen.getByTestId('wedm-card-time-variance');
    expect(pill.innerHTML).toMatch(/text-amber-300/);
  });

  it('red tone for >15% overage (bad)', () => {
    render(<WedmJobCard job={makeJob({
      time_min_actual: 600,   // +25% over 480
      time_min_estimated: 480,
    })} />);
    const pill = screen.getByTestId('wedm-card-time-variance');
    expect(pill.innerHTML).toMatch(/text-red-300/);
  });

  it('formats wire in meters', () => {
    render(<WedmJobCard job={makeJob({
      wire_m_actual: 950,
      wire_m_estimated: 1800,
    })} />);
    const pill = screen.getByTestId('wedm-card-wire-variance');
    expect(pill.textContent).toMatch(/950m/);
  });
});

// ─── Warning chips ──────────────────────────────────────────────────────────

describe('U-WEDM-ERP09: warning chips', () => {
  it('renders wire break count when > 0', () => {
    render(<WedmJobCard job={makeJob({ break_count: 3 })} />);
    const warnings = screen.getByTestId('wedm-card-warnings');
    expect(warnings.textContent).toMatch(/3 wire breaks/);
  });

  it('renders safety flag chip per warning', () => {
    render(<WedmJobCard job={makeJob({
      safety_warnings: ['Current density exceeded', 'Wire tension low'],
    })} />);
    const warnings = screen.getByTestId('wedm-card-warnings');
    expect(warnings.querySelectorAll('[title]')).toHaveLength(2);
  });

  it('hides warnings section when no breaks or safety flags', () => {
    render(<WedmJobCard job={makeJob({ break_count: 0, safety_warnings: [] })} />);
    expect(screen.queryByTestId('wedm-card-warnings')).toBeNull();
  });
});

// ─── Complete button ────────────────────────────────────────────────────────

describe('U-WEDM-ERP09: complete action button', () => {
  it('shows complete button when job is active and onComplete provided', () => {
    const onComplete = vi.fn();
    render(<WedmJobCard job={makeJob()} onComplete={onComplete} />);
    expect(screen.getByTestId('wedm-card-complete-button')).toBeTruthy();
  });

  it('hides complete button when status is complete', () => {
    const onComplete = vi.fn();
    render(<WedmJobCard job={makeJob({ status: 'complete' })} onComplete={onComplete} />);
    expect(screen.queryByTestId('wedm-card-complete-button')).toBeNull();
  });

  it('hides complete button when status is cancelled', () => {
    const onComplete = vi.fn();
    render(<WedmJobCard job={makeJob({ status: 'cancelled' })} onComplete={onComplete} />);
    expect(screen.queryByTestId('wedm-card-complete-button')).toBeNull();
  });

  it('hides complete button when onComplete prop not provided', () => {
    render(<WedmJobCard job={makeJob()} />);
    expect(screen.queryByTestId('wedm-card-complete-button')).toBeNull();
  });

  it('invokes onComplete with job_id when clicked', () => {
    const onComplete = vi.fn();
    render(<WedmJobCard job={makeJob()} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('wedm-card-complete-button'));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('WEDM-001');
  });

  it('complete button click does NOT bubble to card onView', () => {
    const onView = vi.fn();
    const onComplete = vi.fn();
    render(<WedmJobCard job={makeJob()} onView={onView} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('wedm-card-complete-button'));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onView).not.toHaveBeenCalled();
  });
});

// ─── Card-level onView interaction ──────────────────────────────────────────

describe('U-WEDM-ERP09: card click + keyboard navigation', () => {
  it('invokes onView when card body is clicked', () => {
    const onView = vi.fn();
    render(<WedmJobCard job={makeJob()} onView={onView} />);
    fireEvent.click(screen.getByTestId('wedm-job-card-WEDM-001'));
    expect(onView).toHaveBeenCalledWith('WEDM-001');
  });

  it('sets role=button + tabIndex when onView provided', () => {
    const onView = vi.fn();
    render(<WedmJobCard job={makeJob()} onView={onView} />);
    const card = screen.getByTestId('wedm-job-card-WEDM-001');
    expect(card.getAttribute('role')).toBe('button');
    expect(card.getAttribute('tabindex')).toBe('0');
  });

  it('sets role=article when onView not provided', () => {
    render(<WedmJobCard job={makeJob()} />);
    const card = screen.getByTestId('wedm-job-card-WEDM-001');
    expect(card.getAttribute('role')).toBe('article');
  });

  it('activates onView on Enter key', () => {
    const onView = vi.fn();
    render(<WedmJobCard job={makeJob()} onView={onView} />);
    fireEvent.keyDown(screen.getByTestId('wedm-job-card-WEDM-001'), { key: 'Enter' });
    expect(onView).toHaveBeenCalledWith('WEDM-001');
  });

  it('activates onView on Space key', () => {
    const onView = vi.fn();
    render(<WedmJobCard job={makeJob()} onView={onView} />);
    fireEvent.keyDown(screen.getByTestId('wedm-job-card-WEDM-001'), { key: ' ' });
    expect(onView).toHaveBeenCalledWith('WEDM-001');
  });

  it('does NOT activate onView on arrow keys', () => {
    const onView = vi.fn();
    render(<WedmJobCard job={makeJob()} onView={onView} />);
    fireEvent.keyDown(screen.getByTestId('wedm-job-card-WEDM-001'), { key: 'ArrowDown' });
    expect(onView).not.toHaveBeenCalled();
  });
});

// ─── Non-traditional glow (violet) ──────────────────────────────────────────

describe('U-WEDM-ERP09: visual differentiation', () => {
  it('applies kienzle-glow-violet class to distinguish from milling/turning', () => {
    render(<WedmJobCard job={makeJob()} />);
    const card = screen.getByTestId('wedm-job-card-WEDM-001');
    expect(card.className).toMatch(/kienzle-glow-violet/);
  });

  it('applies compact min-width when compact prop set', () => {
    render(<WedmJobCard job={makeJob()} compact />);
    const card = screen.getByTestId('wedm-job-card-WEDM-001');
    expect(card.className).toMatch(/min-w-\[240px\]/);
  });

  it('applies default min-width when compact not set', () => {
    render(<WedmJobCard job={makeJob()} />);
    const card = screen.getByTestId('wedm-job-card-WEDM-001');
    expect(card.className).toMatch(/min-w-\[280px\]/);
  });
});
