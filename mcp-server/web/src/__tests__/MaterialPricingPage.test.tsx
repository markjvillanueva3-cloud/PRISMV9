// @vitest-environment jsdom
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MaterialPricingPage } from '../pages/MaterialPricingPage';
import { materialPriceCompare, materialPriceLookup, materialSurcharge } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    materialPriceLookup: vi.fn(),
    materialPriceCompare: vi.fn(),
    materialSurcharge: vi.fn(),
  };
});

const mockMaterialPriceLookup = vi.mocked(materialPriceLookup);
const mockMaterialPriceCompare = vi.mocked(materialPriceCompare);
const mockMaterialSurcharge = vi.mocked(materialSurcharge);
const fetchMock = vi.fn();

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/material-pricing']}>
      <MaterialPricingPage />
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
            subcategory: 'material_pricing_brief',
            confidence: 0.92,
            tier: 'multi_domain',
            domains: ['pricing', 'purchasing'],
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
            domains: ['pricing', 'purchasing', 'quoting'],
            complexity: 'high',
            reason: 'Pricing guidance spans lookup, comparison posture, surcharge volatility, and quote impact.',
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
          task_id: 'TASK-MATERIAL-1',
          tier: 'full_chain',
          status: 'success',
          started_at: '2026-04-15T12:00:00Z',
          completed_at: '2026-04-15T12:00:01Z',
          duration_ms: 1000,
          domain_results: [
            {
              domain: 'pricing',
              result: {
                summary: 'Challenge surcharge volatility before locking the quote.',
              },
            },
          ],
          final_result: {
            summary: 'Challenge surcharge volatility before locking the quote.',
          },
          authority_resolution: {
            winning_source: 'mounted',
            confidence: 0.95,
            conflicts_resolved: 0,
          },
          recommendations: [
            'Challenge surcharge volatility before locking the quote.',
            'Compare alternate alloys before committing the buyer to the current material path.',
          ],
        },
      }),
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  mockMaterialPriceLookup.mockReset();
  mockMaterialPriceCompare.mockReset();
  mockMaterialSurcharge.mockReset();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('MaterialPricingPage', () => {
  it('looks up material pricing through the mounted route', async () => {
    mockMaterialPriceLookup.mockResolvedValue({
      result: {
        material: '6061-T6',
        form: 'bar',
        base_price_kg: 4.1,
        adjusted_price_kg: 4.8,
        region: 'us_midwest',
        surcharges: [{ type: 'aluminum', amount: 0.35 }],
        total_per_kg: 5.15,
      },
    } as any);

    renderPage();

    expect(screen.getByRole('heading', { name: 'Material Pricing' })).toBeDefined();
    fireEvent.click(screen.getAllByRole('button', { name: 'Lookup price' })[0]);

    await waitFor(() => {
      expect(mockMaterialPriceLookup).toHaveBeenCalledWith({
        material: '6061-T6',
        form: 'bar',
        region: 'us_midwest',
      });
      expect(screen.getAllByText(/\$5\.15\/kg/i).length).toBeGreaterThan(0);
      expect(screen.getByText('Mounted materialPriceLookup route')).toBeDefined();
    });
  });

  it('keeps the PRISM AI copilot built into the material pricing desk and auto-briefs live pricing context', async () => {
    mockMaterialPriceCompare.mockResolvedValue({
      result: {
        comparisons: [
          { material: '6061-T6', total_per_kg: 5.15, rank: 1 },
          { material: '7075-T6', total_per_kg: 6.42, rank: 2 },
          { material: '304 Stainless', total_per_kg: 7.25, rank: 3 },
        ],
      },
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Material Pricing' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Compare Materials' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compare' }));

    await waitFor(() => {
      expect(screen.getAllByText('6061-T6').length).toBeGreaterThan(0);
      expect(screen.getAllByText('7075-T6').length).toBeGreaterThan(0);
    });
    await waitFor(() => expect(screen.getByText(/PRISM AI copilot/i)).toBeDefined());
    await waitFor(() => expect(screen.getByText(/Autonomous desk brief on/i)).toBeDefined());
    expect(screen.getByRole('button', { name: /Refresh AI brief/i })).toBeDefined();
    await waitFor(() =>
      expect(screen.getAllByText(/Challenge surcharge volatility before locking the quote\./i).length).toBeGreaterThan(0),
    );
  });

  it('loads surcharge posture through the mounted route', async () => {
    mockMaterialSurcharge.mockResolvedValue({
      result: {
        material: '6061-T6',
        surcharge_per_kg: 0.35,
        trend: 'rising',
      },
    } as any);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Surcharges' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

    await waitFor(() => {
      expect(mockMaterialSurcharge).toHaveBeenCalledWith({ material: '6061-T6' });
      expect(screen.getByText(/"trend": "rising"/i)).toBeDefined();
      expect(screen.getByText('Mounted materialSurcharge route')).toBeDefined();
    });
  });
});
