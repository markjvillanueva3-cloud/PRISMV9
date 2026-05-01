// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InventoryPage } from '../pages/InventoryPage';
import { inventoryABC, inventoryEOQ, inventorySafetyStock, inventoryToolOptimize } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    inventoryEOQ: vi.fn(),
    inventoryABC: vi.fn(),
    inventorySafetyStock: vi.fn(),
    inventoryToolOptimize: vi.fn(),
  };
});

const mockInventoryEOQ = vi.mocked(inventoryEOQ);
const mockInventoryABC = vi.mocked(inventoryABC);
const mockInventorySafetyStock = vi.mocked(inventorySafetyStock);
const mockInventoryToolOptimize = vi.mocked(inventoryToolOptimize);

beforeEach(() => {
  cleanup();
  mockInventoryEOQ.mockReset();
  mockInventoryABC.mockReset();
  mockInventorySafetyStock.mockReset();
  mockInventoryToolOptimize.mockReset();
});

function renderPage(initialEntry = '/inventory') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <InventoryPage />
    </MemoryRouter>,
  );
}

describe('InventoryPage', () => {
  it('renders the inventory workspace', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Inventory Optimization' })).toBeDefined();
    expect(screen.getByText('Inventory convergence')).toBeDefined();
    expect(screen.getByText(/Inventory intake: Live \+ fallback/i)).toBeDefined();
    expect(await screen.findByText('Convergence brief')).toBeDefined();
    expect(screen.getByText(/Inventory should behave like a live custody system/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Documents/i })).toBeDefined();
  });

  it('shows document population and live checkout controls', async () => {
    renderPage();

    expect((await screen.findAllByText('Purchase order / receiving')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Checkout Issue inserts/i }));

    expect((await screen.findAllByRole('button', { name: /Indexed insert/i })).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CNMG432 KC5010 insert pack/i).length).toBeGreaterThan(0);
  });

  it('renders the EOQ action from the analysis lane', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /EOQ Balance order frequency/i }));
    expect(screen.getByRole('button', { name: /Calculate EOQ/i })).toBeDefined();
  });

  it('renders EOQ output and ABC results', async () => {
    mockInventoryEOQ.mockResolvedValue({
      result: {
        eoq: 245,
        orders_per_year: 4.1,
        annual_order_cost: 205,
        total_cost: 680,
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'eoq', uncertainty: 0.05 },
    } as any);
    mockInventoryABC.mockResolvedValue({
      result: {
        summary: [
          { class: 'A', count: 2, value_pct: 81.2 },
          { class: 'B', count: 1, value_pct: 12.5 },
          { class: 'C', count: 2, value_pct: 6.3 },
        ],
        items: [
          { id: 'ITEM-001', name: 'Carbide Inserts', class: 'A', annual_value: 6000, cumulative_pct: 60 },
        ],
      },
      safety: { score: 0.94, warnings: [] },
      meta: { formula_used: 'abc', uncertainty: 0.06 },
    } as any);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /EOQ Balance order frequency/i }));
    fireEvent.click(screen.getByRole('button', { name: /Calculate EOQ/i }));

    await waitFor(() => {
      expect(screen.getByText('245')).toBeDefined();
      expect(screen.getByText('$680.00')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /ABC/i }));
    fireEvent.click(screen.getByRole('button', { name: /Run ABC Analysis/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Class A/i).length).toBeGreaterThan(0);
      expect(screen.getByText('Carbide Inserts')).toBeDefined();
    });
  });

  it('renders safety stock and tool optimization outputs', async () => {
    mockInventorySafetyStock.mockResolvedValue({
      result: {
        safety_stock: 48,
        reorder_point: 520,
        service_level: 0.95,
        avg_inventory: 170,
      },
      safety: { score: 0.93, warnings: [] },
      meta: { formula_used: 'safety-stock', uncertainty: 0.07 },
    } as any);
    mockInventoryToolOptimize.mockResolvedValue({
      result: { tool_id: 'TOOL-001', optimal_regrinds: 2, annual_savings: 1850 },
      safety: { score: 0.92, warnings: [] },
      meta: { formula_used: 'tool-opt', uncertainty: 0.08 },
    } as any);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Safety Stock/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Calculate$/i }));

    await waitFor(() => {
      expect(screen.getByText('48')).toBeDefined();
      expect(screen.getByText('520')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Tool Optimize/i }));
    fireEvent.change(screen.getByPlaceholderText('TOOL-001'), { target: { value: 'TOOL-001' } });
    fireEvent.click(screen.getByRole('button', { name: /^Optimize$/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/TOOL-001/).length).toBeGreaterThan(0);
      expect(screen.getByText(/annual_savings/i)).toBeDefined();
    });
  });

  it('honors quote-builder deep links into the inventory lanes', async () => {
    renderPage('/inventory?tab=toolopt&source=quote-builder&toolId=ALU-VELOCITY');

    expect(screen.getByText(/Quote Builder opened Inventory with calibration context/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Tool Optimize/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^Optimize$/i })).toBeDefined();
    expect(await screen.findByDisplayValue('ALU-VELOCITY')).toBeDefined();
  });

  it('preserves quote-builder calibration context when inventory opens on the receiving lane', async () => {
    renderPage('/inventory?tab=receiving&source=quote-builder&toolId=CNMG432-KC5010');

    expect(screen.getByText(/Quote Builder opened Inventory with calibration context/i)).toBeDefined();
    expect(
      screen.getAllByText((_, element) =>
        element?.textContent?.includes(
          'supplier documents, tooling economics, and inventory ownership back to the original quote assumptions',
        ) ?? false,
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('Receiving queue')).toBeDefined();
    expect(screen.getAllByText('Receiving').length).toBeGreaterThan(0);
  });

  it('shows launcher context and separate upstream provenance when commercial context is present', async () => {
    renderPage('/inventory?tab=documents&source=quote-builder&originSource=customers&originType=Customer&originId=CUST-001&originCustomer=Acme%20Aerospace&focusType=quote&focusId=quote-6061-milled-production&focusQuoteId=quote-6061-milled-production&focusPacketId=pkt-123');

    expect(screen.getByText(/Quote Builder opened Inventory with calibration context/i)).toBeDefined();
    expect(screen.getByText(/Upstream commercial origin:/i)).toBeDefined();
    expect(screen.getByText(/Customers & CRM/i)).toBeDefined();
  });

  it('links the receiving lane into Capture Ops, Shop Floor, and Messages with inventory context', () => {
    renderPage('/inventory?tab=receiving&source=quote-builder&toolId=CNMG432-KC5010');

    const captureLink = screen.getByRole('link', { name: /Open Capture Ops/i });
    const shopFloorLink = screen.getByRole('link', { name: /Open Shop Floor follow-up/i });
    const messagesLink = screen.getByRole('link', { name: /Open Messages follow-up/i });

    expect(decodeURIComponent(captureLink.getAttribute('href') ?? '')).toContain('/capture?');
    expect(decodeURIComponent(captureLink.getAttribute('href') ?? '')).toContain('source=inventory-desk');
    expect(decodeURIComponent(captureLink.getAttribute('href') ?? '')).toContain('target=inventory');

    expect(decodeURIComponent(shopFloorLink.getAttribute('href') ?? '')).toContain('/shop-clock?');
    expect(decodeURIComponent(shopFloorLink.getAttribute('href') ?? '')).toContain('source=inventory-desk');
    expect(shopFloorLink.getAttribute('href') ?? '').toContain('operation=Receiving+handoff');

    expect(decodeURIComponent(messagesLink.getAttribute('href') ?? '')).toContain('/messages?');
    expect(decodeURIComponent(messagesLink.getAttribute('href') ?? '')).toContain('source=inventory-desk');
    expect(decodeURIComponent(messagesLink.getAttribute('href') ?? '')).toContain('originSource=quote-builder');
  });

  it('preserves commercial origin while resetting execution focus for downstream inventory follow-up', () => {
    renderPage('/inventory?tab=toolopt&source=quote-builder&toolId=ALU-VELOCITY&originSource=customers&originType=Customer&originId=CUST-001&originCustomer=Acme%20Aerospace&focusType=quote&focusId=quote-6061-milled-production&focusQuoteId=quote-6061-milled-production&focusPacketId=pkt-123');

    const captureLink = screen.getByRole('link', { name: /Open Capture Ops/i });
    const shopFloorLink = screen.getByRole('link', { name: /Open Shop Floor follow-up/i });
    const messagesLink = screen.getByRole('link', { name: /Open Messages follow-up/i });
    const captureHref = decodeURIComponent(captureLink.getAttribute('href') ?? '');
    const shopFloorHref = decodeURIComponent(shopFloorLink.getAttribute('href') ?? '');
    const messagesHref = decodeURIComponent(messagesLink.getAttribute('href') ?? '');

    expect(captureHref).toContain('originSource=customers');
    expect(captureHref).toContain('originType=Customer');
    expect(captureHref).toContain('originId=CUST-001');
    expect(captureHref).toContain('focusType=tooling');
    expect(captureHref).toContain('focusId=ALU-VELOCITY');
    expect(shopFloorHref).toContain('originSource=customers');
    expect(shopFloorHref).toContain('focusType=tooling');
    expect(shopFloorHref).toContain('focusId=ALU-VELOCITY');
    expect(messagesHref).toContain('source=inventory-desk');
    expect(messagesHref).toContain('originSource=customers');
    expect(messagesHref).toContain('focusType=tooling');
    expect(messagesHref).toContain('focusId=ALU-VELOCITY');
  });
});
