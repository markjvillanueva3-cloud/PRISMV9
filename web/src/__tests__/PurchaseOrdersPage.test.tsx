// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PurchaseOrdersPage } from '../pages/PurchaseOrdersPage';
import { poAPAging, poApprove, poCreate, poList, poSpendByCategory, poThreeWayMatch } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    poList: vi.fn(),
    poCreate: vi.fn(),
    poApprove: vi.fn(),
    poAPAging: vi.fn(),
    poThreeWayMatch: vi.fn(),
    poSpendByCategory: vi.fn(),
  };
});

const mockPoList = vi.mocked(poList);
const mockPoCreate = vi.mocked(poCreate);
const mockPoApprove = vi.mocked(poApprove);
const mockPoAging = vi.mocked(poAPAging);
const mockPoThreeWayMatch = vi.mocked(poThreeWayMatch);
const mockPoSpendByCategory = vi.mocked(poSpendByCategory);

beforeEach(() => {
  cleanup();
  mockPoList.mockReset();
  mockPoCreate.mockReset();
  mockPoApprove.mockReset();
  mockPoAging.mockReset();
  mockPoThreeWayMatch.mockReset();
  mockPoSpendByCategory.mockReset();
});

describe('PurchaseOrdersPage', () => {
  it('renders orders and approval actions', async () => {
    mockPoList.mockResolvedValue({
      result: {
        orders: [
          { id: 'PO-001', supplier_name: 'MSC', total: 420, created_at: '2026-03-25T00:00:00Z', status: 'pending_approval' },
        ],
      },
      safety: { score: 0.94, warnings: [] },
      meta: { formula_used: 'po-list', uncertainty: 0.06 },
    } as any);
    mockPoApprove.mockResolvedValue({ result: { ok: true } } as any);

    render(
      <MemoryRouter>
        <PurchaseOrdersPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Purchase Orders' })).toBeDefined();
      expect(screen.getByText('MSC')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Approve/i }));

    await waitFor(() => {
      expect(mockPoApprove).toHaveBeenCalledWith({ po_id: 'PO-001', approved_by: 'current-user' });
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

    render(
      <MemoryRouter>
        <PurchaseOrdersPage />
      </MemoryRouter>,
    );

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

    render(
      <MemoryRouter>
        <PurchaseOrdersPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /3-Way Match/i })[0]);
    fireEvent.change(screen.getByPlaceholderText('PO-001'), { target: { value: 'PO-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify Match/i }));

    await waitFor(() => {
      expect(screen.getByText(/Match verified/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Spend Analysis/i }));

    await waitFor(() => {
      expect(screen.getByText('tooling')).toBeDefined();
      expect(screen.getByText('$4,200')).toBeDefined();
    });
  });

  it('routes purchase-order continuity into inventory, messages, and capture ops', async () => {
    mockPoList.mockResolvedValue({
      result: {
        orders: [
          { id: 'PO-001', supplier_name: 'MSC', total: 420, created_at: '2026-03-25T00:00:00Z', status: 'pending_approval' },
        ],
      },
    } as any);

    render(
      <MemoryRouter>
        <PurchaseOrdersPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('MSC')).toBeDefined();
    });

    const inventoryLink = screen.getAllByRole('link', { name: /Open Inventory receiving/i })[0];
    const messagesLink = screen.getAllByRole('link', { name: /Open Messages follow-up/i })[0];
    const captureLink = screen.getAllByRole('link', { name: /Open Capture Ops/i })[0];

    expect(inventoryLink.getAttribute('href')).toContain('/inventory?');
    expect(inventoryLink.getAttribute('href')).toContain('source=purchase-orders');
    expect(inventoryLink.getAttribute('href')).toContain('poId=PO-001');
    expect(inventoryLink.getAttribute('href')).toContain('supplier=MSC');

    expect(messagesLink.getAttribute('href')).toContain('/messages?');
    expect(messagesLink.getAttribute('href')).toContain('source=purchase-orders');
    expect(messagesLink.getAttribute('href')).toContain('recordType=PO');
    expect(messagesLink.getAttribute('href')).toContain('recordId=PO-001');

    expect(captureLink.getAttribute('href')).toContain('/capture?');
    expect(captureLink.getAttribute('href')).toContain('source=purchase-orders');
    expect(captureLink.getAttribute('href')).toContain('target=inventory');
    expect(captureLink.getAttribute('href')).toContain('job=PO-001');
  });
});
