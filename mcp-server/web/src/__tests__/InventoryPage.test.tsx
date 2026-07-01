// @vitest-environment jsdom
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
const fetchMock = vi.fn();

beforeEach(() => {
  cleanup();
  mockInventoryEOQ.mockReset();
  mockInventoryABC.mockReset();
  mockInventorySafetyStock.mockReset();
  mockInventoryToolOptimize.mockReset();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith('/session/memory/recall')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            success: true,
            categories: ['identity', 'roadmap'],
            memory: {
              identity: {
                purpose: {
                  value: 'Safety-critical CNC manufacturing control system.',
                },
              },
              roadmap: {
                current_phase: {
                  value: 'Finish the active backend and frontend delivery tranche before opening a new expansion pass.',
                },
              },
            },
          },
        }),
      } as Response;
    }

    if (url.endsWith('/session/health')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            health_status: 'GREEN',
            advisory: 'Healthy. Continue normally.',
            estimated_tokens: 50000,
          },
        }),
      } as Response;
    }

    if (url.endsWith('/classify')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            category: 'analysis',
            subcategory: 'inventory_brief',
            confidence: 0.91,
            tier: 'multi_domain',
            domains: ['inventory', 'operations'],
          },
        }),
      } as Response;
    }

    if (url.endsWith('/route')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            tier: 'full_chain',
            domains: ['inventory', 'operations', 'purchasing'],
            complexity: 'high',
            reason: 'Inventory posture spans receiving, tooling custody, and replenishment policy.',
            estimated_steps: 3,
          },
        }),
      } as Response;
    }

    return {
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          task_id: 'TASK-INVTRY-1',
          tier: 'full_chain',
          status: 'success',
          started_at: '2026-04-15T12:00:00Z',
          completed_at: '2026-04-15T12:00:01Z',
          duration_ms: 1000,
          domain_results: [
            {
              domain: 'inventory',
              result: {
                summary: 'Clear the receiving queue before adding more tooling demand into the crib.',
              },
            },
          ],
          final_result: {
            summary: 'Clear the receiving queue before adding more tooling demand into the crib.',
          },
          authority_resolution: {
            winning_source: 'mounted',
            confidence: 0.95,
            conflicts_resolved: 0,
          },
          recommendations: [
            'Clear the receiving queue before adding more tooling demand into the crib.',
            'Use the live usage pulses to decide whether tooling should be indexed, replaced, or re-ordered next.',
          ],
        },
      }),
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
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
    expect(screen.getAllByText(/Inventory should behave like a live custody system/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Documents/i })).toBeDefined();
  });

  it('keeps the Kienzle AI copilot built into the inventory desk with persistent memory context', async () => {
    renderPage('/inventory');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Inventory Optimization' })).toBeDefined();
      expect(screen.getByText(/Kienzle AI copilot/i)).toBeDefined();
      expect(screen.getByText(/Persistent Kienzle memory/i)).toBeDefined();
      expect(screen.getByText(/Safety-critical CNC manufacturing control system\./i)).toBeDefined();
      expect(screen.getByText(/Mounted inventoryOperations workspace/i)).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Refresh AI brief/i })).toBeDefined();
    await waitFor(() =>
      expect(screen.getAllByText(/Clear the receiving queue before adding more tooling demand into the crib\./i).length).toBeGreaterThan(0),
    );
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
    expect(screen.getAllByText(/Customers & CRM/i).length).toBeGreaterThan(0);
  });

  it('links the receiving lane into Capture Ops, Shop Floor, and Messages with inventory context', async () => {
    renderPage('/inventory?tab=receiving&source=quote-builder&toolId=CNMG432-KC5010');

    expect((await screen.findAllByText('PO-4821')).length).toBeGreaterThan(0);

    const captureLink = screen.getByRole('link', { name: /Open Capture Ops/i });
    const shopFloorLink = screen.getByRole('link', { name: /Open Shop Floor follow-up/i });
    const messagesLink = screen.getByRole('link', { name: /Open Messages follow-up/i });

    const captureUrl = new URL(captureLink.getAttribute('href')!, 'https://kienzle.local');
    const shopFloorUrl = new URL(shopFloorLink.getAttribute('href')!, 'https://kienzle.local');
    const messagesUrl = new URL(messagesLink.getAttribute('href')!, 'https://kienzle.local');

    expect(captureUrl.pathname).toBe('/capture');
    expect(captureUrl.searchParams.get('originSource')).toBe('quote-builder');
    expect(captureUrl.searchParams.get('source')).toBe('inventory-desk');
    expect(captureUrl.searchParams.get('target')).toBe('inventory');
    expect(captureUrl.searchParams.get('focusType')).toBe('inventory');
    expect(captureUrl.searchParams.get('focusId')).toBe('PO-4821');
    expect(captureUrl.searchParams.get('job')).toBe('PO-4821');
    expect(captureUrl.searchParams.get('department')).toBe('Tool crib');
    expect(captureUrl.searchParams.get('machine')).toBe('Haas VF-2SS');

    expect(shopFloorUrl.pathname).toBe('/shop-clock');
    expect(shopFloorUrl.searchParams.get('originSource')).toBe('quote-builder');
    expect(shopFloorUrl.searchParams.get('source')).toBe('inventory-desk');
    expect(shopFloorUrl.searchParams.get('focusType')).toBe('inventory');
    expect(shopFloorUrl.searchParams.get('focusId')).toBe('PO-4821');
    expect(shopFloorUrl.searchParams.get('job')).toBe('PO-4821');
    expect(shopFloorUrl.searchParams.get('department')).toBe('Tool crib');
    expect(shopFloorUrl.searchParams.get('operation')).toBe('Receiving handoff');
    expect(shopFloorUrl.searchParams.get('machine')).toBe('Haas VF-2SS');

    expect(messagesUrl.pathname).toBe('/messages');
    expect(messagesUrl.searchParams.get('originSource')).toBe('quote-builder');
    expect(messagesUrl.searchParams.get('source')).toBe('inventory-desk');
    expect(messagesUrl.searchParams.get('focusType')).toBe('inventory');
    expect(messagesUrl.searchParams.get('focusId')).toBe('PO-4821');
    expect(messagesUrl.searchParams.get('note')).toContain('PO-4821');
  });

  it('preserves commercial origin while resetting execution focus for downstream inventory follow-up', async () => {
    renderPage('/inventory?tab=toolopt&source=quote-builder&toolId=ALU-VELOCITY&originSource=customers&originType=Customer&originId=CUST-001&originCustomer=Acme%20Aerospace&focusType=quote&focusId=quote-6061-milled-production&focusQuoteId=quote-6061-milled-production&focusPacketId=pkt-123');

    expect(await screen.findByDisplayValue('ALU-VELOCITY')).toBeDefined();

    const captureLink = screen.getByRole('link', { name: /Open Capture Ops/i });
    const shopFloorLink = screen.getByRole('link', { name: /Open Shop Floor follow-up/i });
    const messagesLink = screen.getByRole('link', { name: /Open Messages follow-up/i });
    const captureUrl = new URL(captureLink.getAttribute('href')!, 'https://kienzle.local');
    const shopFloorUrl = new URL(shopFloorLink.getAttribute('href')!, 'https://kienzle.local');
    const messagesUrl = new URL(messagesLink.getAttribute('href')!, 'https://kienzle.local');

    expect(captureUrl.pathname).toBe('/capture');
    expect(captureUrl.searchParams.get('originSource')).toBe('customers');
    expect(captureUrl.searchParams.get('originType')).toBe('Customer');
    expect(captureUrl.searchParams.get('originId')).toBe('CUST-001');
    expect(captureUrl.searchParams.get('originCustomer')).toBe('Acme Aerospace');
    expect(captureUrl.searchParams.get('source')).toBe('inventory-desk');
    expect(captureUrl.searchParams.get('focusType')).toBe('tooling');
    expect(captureUrl.searchParams.get('focusId')).toBe('ALU-VELOCITY');
    expect(captureUrl.searchParams.get('focusPacketId')).toBeNull();
    expect(captureUrl.searchParams.get('job')).toBe('ALU-VELOCITY');
    expect(captureUrl.searchParams.get('target')).toBe('inventory');

    expect(shopFloorUrl.pathname).toBe('/shop-clock');
    expect(shopFloorUrl.searchParams.get('originSource')).toBe('customers');
    expect(shopFloorUrl.searchParams.get('source')).toBe('inventory-desk');
    expect(shopFloorUrl.searchParams.get('focusType')).toBe('tooling');
    expect(shopFloorUrl.searchParams.get('focusId')).toBe('ALU-VELOCITY');
    expect(shopFloorUrl.searchParams.get('focusPacketId')).toBeNull();
    expect(shopFloorUrl.searchParams.get('job')).toBe('ALU-VELOCITY');
    expect(shopFloorUrl.searchParams.get('operation')).toBe('Tooling update');

    expect(messagesUrl.pathname).toBe('/messages');
    expect(messagesUrl.searchParams.get('source')).toBe('inventory-desk');
    expect(messagesUrl.searchParams.get('originSource')).toBe('customers');
    expect(messagesUrl.searchParams.get('focusType')).toBe('tooling');
    expect(messagesUrl.searchParams.get('focusId')).toBe('ALU-VELOCITY');
    expect(messagesUrl.searchParams.get('focusPacketId')).toBeNull();
    expect(messagesUrl.searchParams.get('note')).toContain('ALU-VELOCITY');
  });
});
