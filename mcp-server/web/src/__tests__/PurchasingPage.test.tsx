// @vitest-environment jsdom
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PurchasingPage } from '../pages/PurchasingPage';
import {
  purchasingManufacturers,
  purchasingRecommend,
  purchasingSearch,
  purchasingSummary,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    purchasingSearch: vi.fn(),
    purchasingRecommend: vi.fn(),
    purchasingManufacturers: vi.fn(),
    purchasingSummary: vi.fn(),
  };
});

const mockPurchasingSearch = vi.mocked(purchasingSearch);
const mockPurchasingRecommend = vi.mocked(purchasingRecommend);
const mockPurchasingManufacturers = vi.mocked(purchasingManufacturers);
const mockPurchasingSummary = vi.mocked(purchasingSummary);
const fetchMock = vi.fn();

function renderPage(initialEntries = ['/purchasing']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <PurchasingPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith('/classify')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            category: 'analysis',
            subcategory: 'purchasing_brief',
            confidence: 0.91,
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
            domains: ['purchasing', 'inventory', 'messages'],
            complexity: 'high',
            reason: 'Sourcing guidance spans supplier selection, market posture, and downstream continuity.',
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
          task_id: 'TASK-PURCHASING-1',
          tier: 'full_chain',
          status: 'success',
          started_at: '2026-04-15T12:00:00Z',
          completed_at: '2026-04-15T12:00:01Z',
          duration_ms: 1000,
          domain_results: [
            {
              domain: 'purchasing',
              result: {
                summary: 'Challenge the supplier field against market posture before committing to a buy.',
              },
            },
          ],
          final_result: {
            summary: 'Challenge the supplier field against market posture before committing to a buy.',
          },
          authority_resolution: {
            winning_source: 'mounted',
            confidence: 0.94,
            conflicts_resolved: 0,
          },
          recommendations: [
            'Challenge the supplier field against market posture before committing to a buy.',
            'Preserve sourcing continuity before handing off to inventory or supplier follow-up.',
          ],
        },
      }),
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  mockPurchasingSearch.mockReset();
  mockPurchasingRecommend.mockReset();
  mockPurchasingManufacturers.mockReset();
  mockPurchasingSummary.mockReset();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('PurchasingPage', () => {
  it('searches suppliers through the mounted purchasing route', async () => {
    mockPurchasingSearch.mockResolvedValue({
      result: {
        suppliers: [
          {
            id: 'SUP-001',
            name: 'Ryerson',
            location: 'Chicago, IL',
            rating: 4.8,
            lead_time_days: 5,
            min_order: '500 lb',
            materials: ['6061-T6', '7075-T6'],
          },
        ],
      },
    } as any);

    renderPage(['/purchasing?material=6061-T6&query=Midwest']);

    expect(screen.getByRole('heading', { name: 'Purchasing' })).toBeDefined();
    expect(screen.getByText('Commercial source posture')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(mockPurchasingSearch).toHaveBeenCalledWith({ material: '6061-T6', query: 'Midwest' });
      expect(screen.getByText('Ryerson')).toBeDefined();
      expect(screen.getByText('Chicago, IL')).toBeDefined();
      expect(screen.getByText('500 lb')).toBeDefined();
      expect(screen.getByText('Mounted purchasingSearch route')).toBeDefined();
    });
  });

  it('loads market summary and supporting manufacturers for the active material', async () => {
    mockPurchasingSummary.mockResolvedValue({
      result: {
        material: '17-4PH',
        market_posture: 'tight',
        average_lead_days: 12,
      },
    } as any);
    mockPurchasingManufacturers.mockResolvedValue({
      result: {
        manufacturers: [
          { name: 'Penn Stainless', specialties: ['17-4PH', '15-5'] },
          { name: 'Ulbrich', specialties: ['17-4PH strip'] },
        ],
      },
    } as any);

    renderPage(['/purchasing?tab=summary&material=17-4PH']);

    fireEvent.click(screen.getByRole('button', { name: 'Load summary' }));

    await waitFor(() => {
      expect(mockPurchasingSummary).toHaveBeenCalledWith();
      expect(mockPurchasingManufacturers).toHaveBeenCalledWith({ material: '17-4PH' });
      expect(screen.getByText('Penn Stainless')).toBeDefined();
      expect(screen.getByText('Ulbrich')).toBeDefined();
      expect(screen.getAllByText(/Market posture/i).length).toBeGreaterThan(0);
      expect(screen.getByText('Mounted purchasingSummary + purchasingManufacturers routes')).toBeDefined();
    });
  });

  it('keeps the PRISM AI copilot built into the purchasing desk and auto-briefs live sourcing context', async () => {
    mockPurchasingRecommend.mockResolvedValue({
      result: {
        recommendations: [
          {
            supplier_id: 'SUP-001',
            supplier_name: 'Ryerson',
            material: '6061-T6',
            score: 96,
            unit_price: 4.32,
            lead_time_days: 5,
            reason: 'Closest stock with reliable mill cert turnaround.',
          },
        ],
      },
    } as any);

    renderPage(['/purchasing?tab=recommend&material=6061-T6&source=quote-builder']);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Purchasing' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Get recommendations' }));

    await waitFor(() => {
      expect(screen.getAllByText('Ryerson').length).toBeGreaterThan(0);
    });
    await waitFor(() => expect(screen.getByText(/PRISM AI copilot/i)).toBeDefined());
    await waitFor(() => expect(screen.getByText(/Autonomous desk brief on/i)).toBeDefined());
    expect(screen.getByRole('button', { name: /Refresh AI brief/i })).toBeDefined();
    await waitFor(() =>
      expect(screen.getAllByText(/Challenge the supplier field against market posture before committing to a buy\./i).length).toBeGreaterThan(0),
    );
  });

  it('preserves commercial origin and sourcing details across inventory, messages, and capture handoffs', async () => {
    mockPurchasingRecommend.mockResolvedValue({
      result: {
        recommendations: [
          {
            supplier_id: 'SUP-001',
            supplier_name: 'Ryerson',
            material: '6061-T6',
            score: 96,
            unit_price: 4.32,
            lead_time_days: 5,
            reason: 'Closest stock with reliable mill cert turnaround.',
          },
        ],
      },
    } as any);

    renderPage([
      '/purchasing?tab=recommend&source=quote-builder&originSource=customers&originType=Customer&originId=CUST-001&originCustomer=Acme%20Aerospace&focusType=packet&focusId=PKT-300&focusPacketId=PKT-300&material=6061-T6',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Get recommendations' }));

    await waitFor(() => {
      expect(screen.getAllByText('Ryerson').length).toBeGreaterThan(0);
      expect(screen.getByText('Closest stock with reliable mill cert turnaround.')).toBeDefined();
    });

    const inventoryLink = screen.getByRole('link', { name: /Open Inventory intake/i });
    const messagesLink = screen.getByRole('link', { name: /Open Messages follow-up/i });
    const captureLink = screen.getByRole('link', { name: /Open Capture Ops/i });

    const inventoryUrl = new URL(inventoryLink.getAttribute('href')!, 'https://prism.local');
    const messagesUrl = new URL(messagesLink.getAttribute('href')!, 'https://prism.local');
    const captureUrl = new URL(captureLink.getAttribute('href')!, 'https://prism.local');

    expect(inventoryUrl.pathname).toBe('/inventory');
    expect(inventoryUrl.searchParams.get('originSource')).toBe('customers');
    expect(inventoryUrl.searchParams.get('source')).toBe('purchasing');
    expect(inventoryUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(inventoryUrl.searchParams.get('material')).toBe('6061-T6');
    expect(inventoryUrl.searchParams.get('supplier')).toBe('Ryerson');
    expect(inventoryUrl.searchParams.get('tab')).toBe('documents');

    expect(messagesUrl.pathname).toBe('/messages');
    expect(messagesUrl.searchParams.get('originSource')).toBe('customers');
    expect(messagesUrl.searchParams.get('source')).toBe('purchasing');
    expect(messagesUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(messagesUrl.searchParams.get('material')).toBe('6061-T6');
    expect(messagesUrl.searchParams.get('supplier')).toBe('Ryerson');
    expect(messagesUrl.searchParams.get('note')).toContain('Ryerson');

    expect(captureUrl.pathname).toBe('/capture');
    expect(captureUrl.searchParams.get('originSource')).toBe('customers');
    expect(captureUrl.searchParams.get('source')).toBe('purchasing');
    expect(captureUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(captureUrl.searchParams.get('target')).toBe('inventory');
    expect(captureUrl.searchParams.get('department')).toBe('Purchasing');
    expect(captureUrl.searchParams.get('material')).toBe('6061-T6');
    expect(captureUrl.searchParams.get('supplier')).toBe('Ryerson');
  });
});
