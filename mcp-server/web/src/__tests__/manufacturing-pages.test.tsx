/**
 * Manufacturing Pages — Unit tests
 *
 * Tests StockOptimizerPage, MaterialPricingPage, SchedulingPage, BatchPlanningPage.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock API client
vi.mock('../api/client', () => ({
  stockSizeOptimize: vi.fn(),
  stockSizeCatalog: vi.fn(),
  materialPriceLookup: vi.fn(),
  materialPriceCompare: vi.fn(),
  materialSurcharge: vi.fn(),
  schedulingJobShop: vi.fn(),
  schedulingSingleMachine: vi.fn(),
  schedulingJohnsons: vi.fn(),
  schedulingCPM: vi.fn(),
  batchGroup: vi.fn(),
  batchSequence: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

// Mock LoadingState/ErrorState
vi.mock('../components/LoadingState', () => ({
  LoadingState: ({ label }: { label?: string }) => (
    <div role="status">{label ?? 'Loading...'}</div>
  ),
  ErrorState: ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
    <div role="alert">
      <p>{message}</p>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

// Lazy imports
let StockOptimizerPage: React.FC;
let MaterialPricingPage: React.FC;
let SchedulingPage: React.FC;
let BatchPlanningPage: React.FC;

beforeAll(async () => {
  const stock = await import('../pages/StockOptimizerPage');
  StockOptimizerPage = stock.StockOptimizerPage;
  const pricing = await import('../pages/MaterialPricingPage');
  MaterialPricingPage = pricing.MaterialPricingPage;
  const sched = await import('../pages/SchedulingPage');
  SchedulingPage = sched.SchedulingPage;
  const batch = await import('../pages/BatchPlanningPage');
  BatchPlanningPage = batch.BatchPlanningPage;
});

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

// ============================================================================
// StockOptimizerPage
// ============================================================================
describe('StockOptimizerPage', () => {
  it('renders the title and description', async () => {
    wrap(<StockOptimizerPage />);
    expect(await screen.findByRole('heading', { name: 'Stock Size Optimizer' })).toBeDefined();
    expect(screen.getByText(/Choose bar, plate, and stock posture/i)).toBeDefined();
  });

  it('shows Optimizer and Stock Catalog tabs', async () => {
    wrap(<StockOptimizerPage />);
    expect(await screen.findByRole('button', { name: 'Optimizer' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Stock Catalog' })).toBeDefined();
  });

  it('displays 5 input fields on the optimizer tab', () => {
    wrap(<StockOptimizerPage />);
    expect(screen.getByText('Material')).toBeDefined();
    expect(screen.getByText('Length (mm)')).toBeDefined();
    expect(screen.getByText('Width (mm)')).toBeDefined();
    expect(screen.getByText('Height (mm)')).toBeDefined();
    expect(screen.getByText('Quantity')).toBeDefined();
  });

  it('has a Find Optimal Stock button', async () => {
    wrap(<StockOptimizerPage />);
    expect((await screen.findAllByRole('button', { name: 'Find optimal stock' })).length).toBeGreaterThan(0);
  });

  it('switches to catalog tab and shows Load Catalog button', async () => {
    wrap(<StockOptimizerPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Stock Catalog' }));
    expect(screen.getAllByRole('button', { name: 'Load catalog' }).length).toBeGreaterThan(0);
  });
});

// ============================================================================
// MaterialPricingPage
// ============================================================================
describe('MaterialPricingPage', () => {
  it('renders the title and description', async () => {
    wrap(<MaterialPricingPage />);
    expect(await screen.findByRole('heading', { name: 'Material Pricing' })).toBeDefined();
    expect(screen.getByText(/Keep base price, surcharges, regional posture/i)).toBeDefined();
  });

  it('shows all 3 tabs', async () => {
    wrap(<MaterialPricingPage />);
    expect(await screen.findByRole('button', { name: 'Price Lookup' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Compare Materials' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Surcharges' })).toBeDefined();
  });

  it('displays lookup form with Material, Form, and Region fields', () => {
    wrap(<MaterialPricingPage />);
    // Price Lookup is default tab
    const labels = screen.getAllByText('Material');
    expect(labels.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Form')).toBeDefined();
    expect(screen.getByText('Region')).toBeDefined();
  });

  it('has form select with Bar, Plate, Sheet, Tube options on lookup tab', () => {
    wrap(<MaterialPricingPage />);
    const formSelect = screen.getByText('Form').closest('div')!.querySelector('select') as HTMLSelectElement;
    const options = Array.from(formSelect.options).map(o => o.text);
    expect(options).toEqual(['Bar', 'Plate', 'Sheet', 'Tube']);
  });

  it('switches to Compare Materials tab and shows compare form', async () => {
    wrap(<MaterialPricingPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Compare Materials' }));
    expect(screen.getByText('Materials')).toBeDefined();
    expect(screen.getByText('Compare inputs')).toBeDefined();
  });

  it('switches to Surcharges tab and shows surcharge lookup', async () => {
    wrap(<MaterialPricingPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Surcharges' }));
    expect(screen.getByText('Surcharge lookup')).toBeDefined();
  });
});

// ============================================================================
// SchedulingPage
// ============================================================================
describe('SchedulingPage', () => {
  it('renders the title and description', async () => {
    wrap(<SchedulingPage />);
    expect(await screen.findByRole('heading', { name: 'Scheduling' })).toBeDefined();
    expect(screen.getByText(/Keep solver output, release posture, and planner exceptions/i)).toBeDefined();
  });

  it('shows all 4 scheduling tabs', async () => {
    wrap(<SchedulingPage />);
    expect(await screen.findByRole('button', { name: /^Job Shop\b/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^Single Machine\b/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^Johnson's Rule\b/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^CPM\b/i })).toBeDefined();
  });

  it('shows Run Job Shop Schedule button on default tab', async () => {
    wrap(<SchedulingPage />);
    expect(await screen.findByText('Run Job Shop Schedule')).toBeDefined();
  });

  it('switches to Single Machine tab and shows WSPT button', async () => {
    wrap(<SchedulingPage />);
    fireEvent.click(await screen.findByRole('button', { name: /^Single Machine\b/i }));
    expect(screen.getAllByText('Single Machine').length).toBeGreaterThan(0);
    expect(screen.getByText('Run WSPT Schedule')).toBeDefined();
  });

  it('switches to Johnsons Rule tab and shows algorithm button', async () => {
    wrap(<SchedulingPage />);
    fireEvent.click(await screen.findByRole('button', { name: /^Johnson's Rule\b/i }));
    expect(screen.getAllByText("Johnson's Rule").length).toBeGreaterThan(0);
    expect(screen.getByText("Run Johnson's Algorithm")).toBeDefined();
  });

  it('switches to CPM Network tab and shows CPM button', async () => {
    wrap(<SchedulingPage />);
    fireEvent.click(await screen.findByRole('button', { name: /^CPM\b/i }));
    expect(screen.getAllByText('CPM').length).toBeGreaterThan(0);
    expect(screen.getByText('Run CPM Analysis')).toBeDefined();
  });
});

// ============================================================================
// BatchPlanningPage
// ============================================================================
describe('BatchPlanningPage', () => {
  it('renders the title and description', async () => {
    wrap(<BatchPlanningPage />);
    expect(await screen.findByRole('heading', { name: 'Batch Planning' })).toBeDefined();
    expect(screen.getByText(/Group jobs by shared setup, read the resulting sequence posture/i)).toBeDefined();
  });

  it('shows Group Jobs and Sequence tabs', async () => {
    wrap(<BatchPlanningPage />);
    expect((await screen.findAllByRole('button', { name: 'Group Jobs' })).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Sequence' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Setup Matrix' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Batch Capacity' }).length).toBeGreaterThan(0);
  });

  it('displays job IDs input with default value', async () => {
    wrap(<BatchPlanningPage />);
    expect(await screen.findByText('Job IDs')).toBeDefined();
    const input = screen.getByDisplayValue('J-001, J-002, J-003, J-004');
    expect(input).toBeDefined();
  });

  it('shows Group button on default tab', async () => {
    wrap(<BatchPlanningPage />);
    expect((await screen.findAllByRole('button', { name: 'Group jobs' })).length).toBeGreaterThan(0);
  });

  it('switches to Sequence tab and shows Optimize Sequence button', async () => {
    wrap(<BatchPlanningPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Sequence' }));
    expect(screen.getAllByText('Sequence').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Sequence' }).length).toBeGreaterThan(0);
  });
});
