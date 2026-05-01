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
  it('renders the title and description', () => {
    wrap(<StockOptimizerPage />);
    expect(screen.getByText('Stock Size Optimizer')).toBeDefined();
    expect(screen.getByText('Find optimal bar/plate stock to minimize waste and cost.')).toBeDefined();
  });

  it('shows Optimizer and Stock Catalog tabs', () => {
    wrap(<StockOptimizerPage />);
    expect(screen.getByText('Optimizer')).toBeDefined();
    expect(screen.getByText('Stock Catalog')).toBeDefined();
  });

  it('displays 5 input fields on the optimizer tab', () => {
    wrap(<StockOptimizerPage />);
    expect(screen.getByText('Material')).toBeDefined();
    expect(screen.getByText('Length (mm)')).toBeDefined();
    expect(screen.getByText('Width (mm)')).toBeDefined();
    expect(screen.getByText('Height (mm)')).toBeDefined();
    expect(screen.getByText('Quantity')).toBeDefined();
  });

  it('has a Find Optimal Stock button', () => {
    wrap(<StockOptimizerPage />);
    expect(screen.getByText('Find Optimal Stock')).toBeDefined();
  });

  it('switches to catalog tab and shows Load Catalog button', () => {
    wrap(<StockOptimizerPage />);
    fireEvent.click(screen.getByText('Stock Catalog'));
    expect(screen.getByText('Load Catalog')).toBeDefined();
  });
});

// ============================================================================
// MaterialPricingPage
// ============================================================================
describe('MaterialPricingPage', () => {
  it('renders the title and description', () => {
    wrap(<MaterialPricingPage />);
    expect(screen.getByText('Material Pricing')).toBeDefined();
    expect(screen.getByText('Market-adjusted material prices, surcharges, and cost comparison.')).toBeDefined();
  });

  it('shows all 3 tabs', () => {
    wrap(<MaterialPricingPage />);
    expect(screen.getByText('Price Lookup')).toBeDefined();
    expect(screen.getByText('Compare Materials')).toBeDefined();
    expect(screen.getByText('Surcharges')).toBeDefined();
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

  it('switches to Compare Materials tab and shows compare form', () => {
    wrap(<MaterialPricingPage />);
    fireEvent.click(screen.getByText('Compare Materials'));
    expect(screen.getByText('Materials (comma-separated)')).toBeDefined();
  });

  it('switches to Surcharges tab and shows surcharge lookup', () => {
    wrap(<MaterialPricingPage />);
    fireEvent.click(screen.getByText('Surcharges'));
    expect(screen.getByText('Material Surcharge Lookup')).toBeDefined();
  });
});

// ============================================================================
// SchedulingPage
// ============================================================================
describe('SchedulingPage', () => {
  it('renders the title and description', () => {
    wrap(<SchedulingPage />);
    expect(screen.getByText('Scheduling')).toBeDefined();
    expect(screen.getByText(/Job shop, single machine/)).toBeDefined();
  });

  it('shows all 4 scheduling tabs', () => {
    wrap(<SchedulingPage />);
    expect(screen.getByText('Job Shop')).toBeDefined();
    expect(screen.getByText('Single Machine')).toBeDefined();
    expect(screen.getByText("Johnson's Rule")).toBeDefined();
    expect(screen.getByText('CPM Network')).toBeDefined();
  });

  it('shows Run Job Shop Schedule button on default tab', () => {
    wrap(<SchedulingPage />);
    expect(screen.getByText('Run Job Shop Schedule')).toBeDefined();
  });

  it('switches to Single Machine tab and shows WSPT button', () => {
    wrap(<SchedulingPage />);
    fireEvent.click(screen.getByText('Single Machine'));
    expect(screen.getByText('Single Machine Scheduling')).toBeDefined();
    expect(screen.getByText('Run WSPT Schedule')).toBeDefined();
  });

  it('switches to Johnsons Rule tab and shows algorithm button', () => {
    wrap(<SchedulingPage />);
    fireEvent.click(screen.getByText("Johnson's Rule"));
    expect(screen.getByText("Johnson's Rule (2-Machine Flow Shop)")).toBeDefined();
    expect(screen.getByText("Run Johnson's Algorithm")).toBeDefined();
  });

  it('switches to CPM Network tab and shows CPM button', () => {
    wrap(<SchedulingPage />);
    fireEvent.click(screen.getByText('CPM Network'));
    expect(screen.getByText('Critical Path Method (CPM)')).toBeDefined();
    expect(screen.getByText('Run CPM Analysis')).toBeDefined();
  });
});

// ============================================================================
// BatchPlanningPage
// ============================================================================
describe('BatchPlanningPage', () => {
  it('renders the title and description', () => {
    wrap(<BatchPlanningPage />);
    expect(screen.getByText('Batch Planning')).toBeDefined();
    expect(screen.getByText('Group jobs by material/setup and optimize production sequence.')).toBeDefined();
  });

  it('shows Group Jobs and Sequence tabs', () => {
    wrap(<BatchPlanningPage />);
    expect(screen.getByText('Group Jobs')).toBeDefined();
    expect(screen.getByText('Sequence')).toBeDefined();
  });

  it('displays job IDs input with default value', () => {
    wrap(<BatchPlanningPage />);
    expect(screen.getByText('Job IDs (comma-separated)')).toBeDefined();
    const input = screen.getByDisplayValue('J-001, J-002, J-003, J-004');
    expect(input).toBeDefined();
  });

  it('shows Group button on default tab', () => {
    wrap(<BatchPlanningPage />);
    expect(screen.getByText('Group')).toBeDefined();
  });

  it('switches to Sequence tab and shows Optimize Sequence button', () => {
    wrap(<BatchPlanningPage />);
    fireEvent.click(screen.getByText('Sequence'));
    expect(screen.getByText('Optimize Sequence')).toBeDefined();
  });
});
