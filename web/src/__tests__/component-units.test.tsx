/**
 * Component Units — Unit tests
 *
 * Tests CommandPalette, SafetyBadge, FormulaCard, ErrorState, LoadingState.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Lazy imports
let CommandPalette: React.FC<any>;
let SafetyBadge: React.FC<any>;
let FormulaCard: React.FC<any>;
let LoadingState: React.FC<any>;
let ErrorState: React.FC<any>;

beforeAll(async () => {
  const cmd = await import('../components/CommandPalette');
  CommandPalette = cmd.CommandPalette;
  const safety = await import('../components/SafetyBadge');
  SafetyBadge = safety.SafetyBadge;
  const formula = await import('../components/FormulaCard');
  FormulaCard = formula.FormulaCard;
  const loading = await import('../components/LoadingState');
  LoadingState = loading.LoadingState;
  ErrorState = loading.ErrorState;
});

// ============================================================================
// CommandPalette
// ============================================================================
describe('CommandPalette', () => {
  const sampleItems = [
    { id: '1', title: 'Dashboard', subtitle: 'Main overview', category: 'page' as const, action: vi.fn(), keywords: ['home'] },
    { id: '2', title: 'Calculator', subtitle: 'Formula calculator', category: 'page' as const, action: vi.fn(), keywords: ['calc'] },
    { id: '3', title: '6061-T6 Aluminum', subtitle: 'ISO N', category: 'material' as const, action: vi.fn() },
    { id: '4', title: 'Haas VF-2', subtitle: '3-axis VMC', category: 'machine' as const, action: vi.fn() },
  ];

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <CommandPalette items={sampleItems} isOpen={false} onClose={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders search input and items when open', () => {
    render(<CommandPalette items={sampleItems} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText('Search pages, materials, machines, tools...')).toBeDefined();
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Calculator')).toBeDefined();
  });

  it('filters items based on query', () => {
    render(<CommandPalette items={sampleItems} isOpen={true} onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText('Search pages, materials, machines, tools...');
    fireEvent.change(input, { target: { value: 'dash' } });
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.queryByText('Haas VF-2')).toBeNull();
  });

  it('shows no results message for unmatched query', () => {
    render(<CommandPalette items={sampleItems} isOpen={true} onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText('Search pages, materials, machines, tools...');
    fireEvent.change(input, { target: { value: 'xyznonexistent' } });
    expect(screen.getByText(/No results for/)).toBeDefined();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <CommandPalette items={sampleItems} isOpen={true} onClose={onClose} />
    );
    // Click the backdrop (outermost fixed div)
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('executes item action and closes on Enter', () => {
    const onClose = vi.fn();
    const actionFn = vi.fn();
    const items = [{ id: '1', title: 'Test Item', category: 'page' as const, action: actionFn }];
    render(<CommandPalette items={items} isOpen={true} onClose={onClose} />);
    const input = screen.getByPlaceholderText('Search pages, materials, machines, tools...');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(actionFn).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays category badges', () => {
    render(<CommandPalette items={sampleItems} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getAllByText('page').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('material')).toBeDefined();
    expect(screen.getByText('machine')).toBeDefined();
  });

  it('shows keyboard shortcut hints in footer', () => {
    render(<CommandPalette items={sampleItems} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Navigate')).toBeDefined();
    expect(screen.getByText('Open')).toBeDefined();
    expect(screen.getByText('Close')).toBeDefined();
  });
});

// ============================================================================
// SafetyBadge
// ============================================================================
describe('SafetyBadge', () => {
  it('renders pass level for score >= 0.85', () => {
    render(<SafetyBadge score={0.92} />);
    const badge = screen.getByRole('status');
    expect(badge.textContent).toContain('92%');
    expect(badge.getAttribute('aria-label')).toContain('pass');
  });

  it('renders warn level for score 0.70-0.84', () => {
    render(<SafetyBadge score={0.75} />);
    const badge = screen.getByRole('status');
    expect(badge.textContent).toContain('75%');
    expect(badge.getAttribute('aria-label')).toContain('warn');
  });

  it('renders fail level for score < 0.70', () => {
    render(<SafetyBadge score={0.55} />);
    const badge = screen.getByRole('status');
    expect(badge.textContent).toContain('55%');
    expect(badge.getAttribute('aria-label')).toContain('fail');
  });

  it('hides percentage when showScore is false', () => {
    render(<SafetyBadge score={0.90} showScore={false} />);
    const badge = screen.getByRole('status');
    // Should have the shape indicator but not the numeric score text
    expect(badge.textContent).not.toContain('90%');
  });
});

// ============================================================================
// FormulaCard
// ============================================================================
describe('FormulaCard', () => {
  const testFormula = {
    id: 'F-TEST-001',
    name: 'Spindle RPM',
    description: 'Calculate spindle speed from cutting speed and tool diameter.',
    equation: 'n = (Vc x 1000) / (pi x D)',
    equationSymbols: 'n = (Vc * 1000) / (pi * D)',
    inputs: [
      { name: 'Vc', label: 'Cutting Speed', unit: 'm/min', min: 1, max: 1000, step: 1, defaultValue: 200 },
      { name: 'D', label: 'Tool Diameter', unit: 'mm', min: 0.1, max: 500, step: 0.1, defaultValue: 25 },
    ],
    outputName: 'Spindle Speed',
    outputUnit: 'RPM',
    compute: (v: Record<string, number>) => (v.Vc * 1000) / (Math.PI * v.D),
  };

  it('renders formula name and description', () => {
    render(<FormulaCard formula={testFormula} />);
    expect(screen.getByText('Spindle RPM')).toBeDefined();
    expect(screen.getByText('Calculate spindle speed from cutting speed and tool diameter.')).toBeDefined();
  });

  it('renders equation display', () => {
    render(<FormulaCard formula={testFormula} />);
    expect(screen.getByLabelText('Formula: n = (Vc x 1000) / (pi x D)')).toBeDefined();
  });

  it('renders input fields with default values', () => {
    render(<FormulaCard formula={testFormula} />);
    const vcInput = screen.getByLabelText(/Cutting Speed/) as HTMLInputElement;
    expect(vcInput.value).toBe('200');
    const dInput = screen.getByLabelText(/Tool Diameter/) as HTMLInputElement;
    expect(dInput.value).toBe('25');
  });

  it('computes result from default values', () => {
    render(<FormulaCard formula={testFormula} />);
    // (200 * 1000) / (pi * 25) = 200000 / 78.54 = 2546.48
    expect(screen.getByText('Spindle Speed')).toBeDefined();
    expect(screen.getByText('RPM')).toBeDefined();
    // result > 100 so .toFixed(0) = 2546
    expect(screen.getByText('2546')).toBeDefined();
  });

  it('shows validation error for out-of-range input', () => {
    render(<FormulaCard formula={testFormula} />);
    const vcInput = screen.getByLabelText(/Cutting Speed/) as HTMLInputElement;
    fireEvent.change(vcInput, { target: { value: '0' } });
    expect(screen.getByText('Min 1')).toBeDefined();
  });
});

// ============================================================================
// LoadingState
// ============================================================================
describe('LoadingState', () => {
  it('renders with default label', () => {
    render(<LoadingState />);
    expect(screen.getByText('Loading...')).toBeDefined();
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('renders with custom label', () => {
    render(<LoadingState label="Generating report..." />);
    expect(screen.getByText('Generating report...')).toBeDefined();
  });

  it('has status role for accessibility', () => {
    render(<LoadingState />);
    const el = screen.getByRole('status');
    expect(el).toBeDefined();
  });
});

// ============================================================================
// ErrorState
// ============================================================================
describe('ErrorState', () => {
  it('renders error message', () => {
    render(<ErrorState message="Connection failed" />);
    expect(screen.getByText('Data unavailable')).toBeDefined();
    expect(screen.getByText('Connection failed')).toBeDefined();
  });

  it('has alert role for accessibility', () => {
    render(<ErrorState message="Test error" />);
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('shows Retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Fail" onRetry={onRetry} />);
    const btn = screen.getByText('Retry');
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides Retry button when onRetry is not provided', () => {
    render(<ErrorState message="Fail" />);
    expect(screen.queryByText('Retry')).toBeNull();
  });
});
