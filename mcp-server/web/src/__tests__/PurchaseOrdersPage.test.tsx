// @vitest-environment jsdom
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PurchaseOrdersPage } from '../pages/PurchaseOrdersPage';
import { poAPAging, poApprove, poCreate, poList, poReceive, poSpendByCategory, poThreeWayMatch } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    poList: vi.fn(),
    poCreate: vi.fn(),
    poApprove: vi.fn(),
    poReceive: vi.fn(),
    poAPAging: vi.fn(),
    poThreeWayMatch: vi.fn(),
    poSpendByCategory: vi.fn(),
  };
});

const mockPoList = vi.mocked(poList);
const mockPoCreate = vi.mocked(poCreate);
const mockPoApprove = vi.mocked(poApprove);
const mockPoReceive = vi.mocked(poReceive);
const mockPoAging = vi.mocked(poAPAging);
const mockPoThreeWayMatch = vi.mocked(poThreeWayMatch);
const mockPoSpendByCategory = vi.mocked(poSpendByCategory);
const fetchMock = vi.fn();

function renderPage(initialEntries = ['/purchase-orders']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <PurchaseOrdersPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  mockPoList.mockReset();
  mockPoCreate.mockReset();
  mockPoApprove.mockReset();
  mockPoReceive.mockReset();
  mockPoAging.mockReset();
  mockPoThreeWayMatch.mockReset();
  mockPoSpendByCategory.mockReset();
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
            subcategory: 'purchase_orders_brief',
            confidence: 0.9,
            tier: 'multi_domain',
            domains: ['purchasing', 'inventory'],
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
            domains: ['purchasing', 'inventory', 'finance'],
            complexity: 'high',
            reason: 'Purchase-order flow spans approvals, receiving, aging, and supplier continuity.',
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
          task_id: 'TASK-PO-1',
          tier: 'full_chain',
          status: 'success',
          started_at: '2026-04-15T12:00:00Z',
          completed_at: '2026-04-15T12:00:01Z',
          duration_ms: 1000,
          domain_results: [
            {
              domain: 'purchasing',
              result: {
                summary: 'Approve or receive the oldest supplier commitments before opening new demand.',
              },
            },
          ],
          final_result: {
            summary: 'Approve or receive the oldest supplier commitments before opening new demand.',
          },
          authority_resolution: {
            winning_source: 'mounted',
            confidence: 0.95,
            conflicts_resolved: 0,
          },
          recommendations: [
            'Approve or receive the oldest supplier commitments before opening new demand.',
            'Use AP aging before stacking more orders onto strained suppliers.',
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

describe('PurchaseOrdersPage', () => {
  it('renders orders and approval actions', async () => {
    mockPoList.mockResolvedValue({
      result: {
        orders: [
          { id: 'PO-001', supplier_name: 'MSC', total: 420, created_at: '2026-03-25T00:00:00Z', status: 'pending_approval', line_items: [] },
        ],
      },
      safety: { score: 0.94, warnings: [] },
      meta: { formula_used: 'po-list', uncertainty: 0.06 },
    } as any);
    mockPoApprove.mockResolvedValue({ result: { ok: true } } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Purchase Orders' })).toBeDefined();
      expect(screen.getByText('MSC')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Approve$/i }));

    await waitFor(() => {
      expect(mockPoApprove).toHaveBeenCalledWith({ po_id: 'PO-001', approved_by: 'current-user' });
      expect(screen.getByText('Purchase order PO-001 approved.')).toBeDefined();
    });
  });

  it('keeps the PRISM AI copilot built into the purchase orders desk with persistent memory context', async () => {
    mockPoList.mockResolvedValue({
      result: {
        orders: [
          { id: 'PO-001', supplier_name: 'MSC', total: 420, created_at: '2026-03-25T00:00:00Z', status: 'pending_approval', line_items: [] },
        ],
      },
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Purchase Orders' })).toBeDefined();
      expect(screen.getByText(/PRISM AI copilot/i)).toBeDefined();
      expect(screen.getByText(/Persistent PRISM memory/i)).toBeDefined();
      expect(screen.getByText(/Safety-critical CNC manufacturing control system\./i)).toBeDefined();
      expect(screen.getByText(/Mounted poList route/i)).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Refresh AI brief/i })).toBeDefined();
    await waitFor(() =>
      expect(screen.getAllByText(/Approve or receive the oldest supplier commitments before opening new demand\./i).length).toBeGreaterThan(0),
    );
  });

  it('receives approved orders through the mounted ERP route', async () => {
    mockPoList.mockResolvedValue({
      result: {
        orders: [
          {
            id: 'PO-002',
            supplier_name: 'Harvey Tool',
            total: 840,
            created_at: '2026-03-25T00:00:00Z',
            status: 'approved',
            line_items: [{ description: 'Carbide insert', quantity: 10, unit_price: 84, total: 840, received_qty: 0 }],
          },
        ],
      },
    } as any);
    mockPoReceive.mockResolvedValue({ result: { ok: true } } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Harvey Tool')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Receive' }));

    await waitFor(() => {
      expect(mockPoReceive).toHaveBeenCalledWith({
        po_id: 'PO-002',
        received_by: 'purchase-orders',
        line_items: [{ description: 'Carbide insert', quantity: 10, unit_price: 84, total: 840, received_qty: 0 }],
        packing_slip: 'Received through Purchase Orders desk for Harvey Tool (PO-002).',
      });
      expect(screen.getByText('Purchase order PO-002 marked received.')).toBeDefined();
    });
  });

  it('creates a purchase order and renders AP aging', async () => {
    mockPoList.mockResolvedValue({ result: { orders: [] } } as any);
    mockPoCreate.mockResolvedValue({ result: { id: 'PO-NEW' } } as any);
    mockPoAging.mockResolvedValue({
      result: { current: 1000, days_30: 200, days_60: 100, days_90_plus: 50, total: 1350 },
      safety: { score: 0.93, warnings: [] },
      meta: { formula_used: 'ap-aging', uncertainty: 0.07 },
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.queryByText(/Refreshing purchasing workspace/i)).toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: /New PO/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create PO/i }).hasAttribute('disabled')).toBe(false);
    });
    fireEvent.change(screen.getByLabelText(/Supplier/i), { target: { value: 'MSC' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Carbide Insert' } });
    fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Unit price/i), { target: { value: '42' } });
    fireEvent.click(screen.getByRole('button', { name: /Create PO/i }));

    await waitFor(() => {
      expect(mockPoCreate).toHaveBeenCalled();
      expect(screen.getByText('Purchase order created for MSC.')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /AP Aging/i }));

    await waitFor(() => {
      expect(screen.getByText('$1350.00')).toBeDefined();
    });
  });

  it('renders three-way match and spend analysis', async () => {
    mockPoList.mockResolvedValue({ result: { orders: [] } } as any);
    mockPoThreeWayMatch.mockResolvedValue({
      result: { matched: true, po_id: 'PO-001', variance: 0 },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'three-way-match', uncertainty: 0.05 },
    } as any);
    mockPoSpendByCategory.mockResolvedValue({
      result: { categories: [{ category: 'tooling', total_spend: 4200, po_count: 8, pct: 57.5 }] },
      safety: { score: 0.94, warnings: [] },
      meta: { formula_used: 'spend', uncertainty: 0.06 },
    } as any);

    renderPage();

    fireEvent.click(screen.getAllByRole('button', { name: /3-Way Match/i })[0]);
    fireEvent.change(screen.getByPlaceholderText('PO-001'), { target: { value: 'PO-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify Match/i }));

    await waitFor(() => {
      expect(screen.getByText(/^Match verified$/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Spend Analysis/i }));

    await waitFor(() => {
      expect(screen.getByText('tooling')).toBeDefined();
      expect(screen.getByText('$4,200')).toBeDefined();
    });
  });

  it('routes purchase-order continuity into inventory, messages, quote builder, and capture ops', async () => {
    mockPoList.mockResolvedValue({
      result: {
        orders: [
          { id: 'PO-001', supplier_name: 'MSC', total: 420, created_at: '2026-03-25T00:00:00Z', status: 'pending_approval', line_items: [] },
        ],
      },
    } as any);

    renderPage(['/purchase-orders?source=quote-builder&focusType=packet&focusId=PACK-777&focusPacketId=PACK-777']);

    await waitFor(() => {
      expect(screen.getByText('MSC')).toBeDefined();
    });

    const inventoryLink = screen.getByRole('link', { name: /Open Inventory receiving/i });
    const messagesLink = screen.getByRole('link', { name: /Open Messages follow-up/i });
    const quoteBuilderLink = screen.getByRole('link', { name: /Open Quote Builder/i });
    const captureLink = screen.getByRole('link', { name: /Open Capture Ops/i });

    const inventoryUrl = new URL(inventoryLink.getAttribute('href')!, 'https://prism.local');
    const messagesUrl = new URL(messagesLink.getAttribute('href')!, 'https://prism.local');
    const quoteBuilderUrl = new URL(quoteBuilderLink.getAttribute('href')!, 'https://prism.local');
    const captureUrl = new URL(captureLink.getAttribute('href')!, 'https://prism.local');

    expect(inventoryUrl.pathname).toBe('/inventory');
    expect(inventoryUrl.searchParams.get('originSource')).toBe('quote-builder');
    expect(inventoryUrl.searchParams.get('source')).toBe('purchase-orders');
    expect(inventoryUrl.searchParams.get('focusPacketId')).toBe('PACK-777');
    expect(inventoryUrl.searchParams.get('poId')).toBe('PO-001');
    expect(inventoryUrl.searchParams.get('supplier')).toBe('MSC');

    expect(messagesUrl.pathname).toBe('/messages');
    expect(messagesUrl.searchParams.get('originSource')).toBe('quote-builder');
    expect(messagesUrl.searchParams.get('source')).toBe('purchase-orders');
    expect(messagesUrl.searchParams.get('focusPacketId')).toBe('PACK-777');
    expect(messagesUrl.searchParams.get('recordType')).toBe('PO');
    expect(messagesUrl.searchParams.get('recordId')).toBe('PO-001');

    expect(quoteBuilderUrl.pathname).toBe('/quote-builder');
    expect(quoteBuilderUrl.searchParams.get('originSource')).toBe('quote-builder');
    expect(quoteBuilderUrl.searchParams.get('source')).toBe('purchase-orders');
    expect(quoteBuilderUrl.searchParams.get('focusPacketId')).toBe('PACK-777');
    expect(quoteBuilderUrl.searchParams.get('poId')).toBe('PO-001');
    expect(quoteBuilderUrl.searchParams.get('supplier')).toBe('MSC');

    expect(captureUrl.pathname).toBe('/capture');
    expect(captureUrl.searchParams.get('originSource')).toBe('quote-builder');
    expect(captureUrl.searchParams.get('source')).toBe('purchase-orders');
    expect(captureUrl.searchParams.get('focusPacketId')).toBe('PACK-777');
    expect(captureUrl.searchParams.get('target')).toBe('inventory');
    expect(captureUrl.searchParams.get('job')).toBe('PO-001');
  });
});
