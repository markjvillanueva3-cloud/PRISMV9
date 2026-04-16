// @vitest-environment jsdom
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VendorScorecardPage from '../pages/VendorScorecardPage';
import { vendorList } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    vendorList: vi.fn(),
  };
});

const mockVendorList = vi.mocked(vendorList);
const fetchMock = vi.fn();

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/vendor-scorecard']}>
      <VendorScorecardPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  mockVendorList.mockReset();
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
            subcategory: 'vendor_scorecard_brief',
            confidence: 0.91,
            tier: 'multi_domain',
            domains: ['purchasing', 'quality'],
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
            domains: ['purchasing', 'quality', 'operations'],
            complexity: 'high',
            reason: 'Supplier ranking needs delivery, NCR, and sourcing continuity interpretation.',
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
          task_id: 'TASK-VENDOR-1',
          tier: 'full_chain',
          status: 'success',
          started_at: '2026-04-15T12:00:00Z',
          completed_at: '2026-04-15T12:00:01Z',
          duration_ms: 1000,
          domain_results: [
            {
              domain: 'purchasing',
              result: {
                summary: 'Audit Midwest Metals before the next time-sensitive release.',
              },
            },
          ],
          final_result: {
            summary: 'Audit Midwest Metals before the next time-sensitive release.',
          },
          authority_resolution: {
            winning_source: 'mounted',
            confidence: 0.94,
            conflicts_resolved: 0,
          },
          recommendations: [
            'Audit Midwest Metals before the next time-sensitive release.',
            'Preserve Apex Alloys as the preferred supplier for schedule-sensitive buys.',
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

describe('VendorScorecardPage', () => {
  it('loads supplier scorecard posture through the mounted route', async () => {
    mockVendorList.mockResolvedValue({
      result: [
        {
          vendor_id: 'VEN-1',
          name: 'Apex Alloys',
          quality_score: 94,
          delivery_score: 92,
          price_score: 81,
          composite_score: 90,
          total_orders: 48,
          ncr_count: 1,
          on_time_pct: 97,
          avg_lead_days: 10,
        },
        {
          vendor_id: 'VEN-2',
          name: 'Midwest Metals',
          quality_score: 71,
          delivery_score: 67,
          price_score: 73,
          composite_score: 70,
          total_orders: 36,
          ncr_count: 4,
          on_time_pct: 84,
          avg_lead_days: 18,
        },
      ],
    } as any);

    renderPage();

    await waitFor(() => {
      expect(mockVendorList).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('heading', { name: 'Vendor Scorecard' })).toBeDefined();
      expect(screen.getByText('Apex Alloys')).toBeDefined();
      expect(screen.getByText('Mounted vendorList route')).toBeDefined();
    });
  });

  it('keeps the PRISM AI copilot built into the vendor scorecard desk and auto-briefs live vendor posture', async () => {
    mockVendorList.mockResolvedValue({
      result: [
        {
          vendor_id: 'VEN-1',
          name: 'Apex Alloys',
          quality_score: 94,
          delivery_score: 92,
          price_score: 81,
          composite_score: 90,
          total_orders: 48,
          ncr_count: 1,
          on_time_pct: 97,
          avg_lead_days: 10,
        },
        {
          vendor_id: 'VEN-2',
          name: 'Midwest Metals',
          quality_score: 71,
          delivery_score: 67,
          price_score: 73,
          composite_score: 70,
          total_orders: 36,
          ncr_count: 4,
          on_time_pct: 84,
          avg_lead_days: 18,
        },
      ],
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Vendor Scorecard' })).toBeDefined();
      expect(screen.getByText(/PRISM AI copilot/i)).toBeDefined();
      expect(screen.getByText(/Autonomous desk brief on/i)).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Refresh AI brief/i })).toBeDefined();
    await waitFor(() =>
      expect(screen.getAllByText(/Audit Midwest Metals before the next time-sensitive release\./i).length).toBeGreaterThan(0),
    );
  });
});
