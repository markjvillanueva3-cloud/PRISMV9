// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VendorCatalogPage } from '../pages/VendorCatalogPage';
import { vendorCatalogQuery, vendorComputeScorecard, vendorRank } from '../api/vendorNetwork';
import { BusinessDispatchError } from '../api/businessDispatch';

vi.mock('../api/vendorNetwork', async () => {
  const actual = await vi.importActual<typeof import('../api/vendorNetwork')>('../api/vendorNetwork');
  return {
    ...actual,
    vendorCatalogQuery: vi.fn(),
    vendorRank: vi.fn(),
    vendorComputeScorecard: vi.fn(),
  };
});

const mockQuery = vi.mocked(vendorCatalogQuery);
const mockRank = vi.mocked(vendorRank);
const mockScorecard = vi.mocked(vendorComputeScorecard);

const CORPUS = [
  { name: 'Niagara Cutter', vendor_type: 'tool-maker', categories: ['end-mills'], regions: ['US'], verified: true, website: 'https://niagara.test', source_tag: 'R20' },
  { name: 'Guhring', vendor_type: 'tool-maker', categories: ['drills', 'reamers'], regions: ['US', 'DE'], verified: false },
];

beforeEach(() => {
  cleanup();
  mockQuery.mockReset();
  mockRank.mockReset();
  mockScorecard.mockReset();
  mockQuery.mockResolvedValue(CORPUS as any);
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/vendor-catalog']}>
      <VendorCatalogPage />
    </MemoryRouter>,
  );
}

describe('VendorCatalogPage — catalog browse', () => {
  it("loads charlie's corpus on mount (unfiltered) and renders vendor names", async () => {
    renderPage();
    const niagara = await screen.findByText('Niagara Cutter');
    expect(niagara.textContent).toBe('Niagara Cutter');
    expect((await screen.findByText('Guhring')).textContent).toBe('Guhring');
    // mount fetch is the unfiltered corpus
    expect(mockQuery).toHaveBeenCalledWith({});
    // only the verified vendor shows the (emerald) Verified badge
    expect(screen.getAllByText('Verified')).toHaveLength(1);
    // count line reflects the corpus size
    expect(screen.getByText(/vendors?$/i).textContent).toMatch(/^2 vendors$/i);
  });

  it('sends the typed filter (category + verified-only) on Search', async () => {
    renderPage();
    await screen.findByText('Guhring');

    fireEvent.change(screen.getByPlaceholderText('Category (e.g. drills)'), { target: { value: 'drills' } });
    fireEvent.click(screen.getByLabelText(/Verified only/i));
    fireEvent.click(screen.getByRole('button', { name: /Search catalog/i }));

    await waitFor(() => {
      expect(mockQuery).toHaveBeenLastCalledWith({ category: 'drills', verifiedOnly: true });
    });
  });

  it('renders a Create-PO cross-link that carries the vendor name + source into purchasing', async () => {
    renderPage();
    await screen.findByText('Niagara Cutter');

    const links = screen.getAllByRole('link', { name: /Create PO/i });
    const href = links[0].getAttribute('href') ?? '';
    const url = new URL(href, 'https://kienzle.local');
    expect(url.pathname).toBe('/purchase-orders');
    expect(url.searchParams.get('vendor')).toBe('Niagara Cutter');
    expect(url.searchParams.get('source')).toBe('vendor-catalog');
  });

  it('shows an empty-state message when the filter matches nothing', async () => {
    mockQuery.mockResolvedValue([] as any);
    renderPage();
    const empty = await screen.findByText(/No vendors match this filter/i);
    expect(empty.textContent).toMatch(/No vendors match this filter/i);
  });

  it('surfaces a catalog-query rejection and the retry button re-invokes the query', async () => {
    mockQuery.mockReset();
    mockQuery.mockRejectedValueOnce(new BusinessDispatchError(503, 'corpus load failed'));
    mockQuery.mockResolvedValue(CORPUS as any); // retry succeeds
    renderPage();

    // mount fetch failed → an actionable error alert renders (R12, not a blank screen)
    const alert = await screen.findByRole('alert');
    expect(mockQuery).toHaveBeenCalledTimes(1);

    // clicking retry re-invokes the query with the current (empty) filter, and the corpus renders
    fireEvent.click(within(alert).getByRole('button'));
    expect((await screen.findByText('Niagara Cutter')).textContent).toBe('Niagara Cutter');
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});

describe('VendorCatalogPage — performance', () => {
  it('ranks vendors and renders the leaderboard with score + tier', async () => {
    mockRank.mockResolvedValue([
      { vendor_id: 'V-001', composite_score: 0.91, tier: 'preferred' },
      { vendor_id: 'V-002', composite_score: 0.64, tier: 'approved' },
    ] as any);
    renderPage();
    await screen.findByText('Guhring');

    fireEvent.click(screen.getByRole('button', { name: /^Performance$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Rank vendors/i }));

    expect((await screen.findByText('V-001')).textContent).toBe('V-001');
    expect(screen.getByText('91%').textContent).toBe('91%');
    expect(screen.getByText('preferred').textContent).toBe('preferred');
    expect(mockRank).toHaveBeenCalledWith({});
  });

  it('computes a scorecard for a vendor id and shows the composite score', async () => {
    mockScorecard.mockResolvedValue({
      vendor_id: 'V-001',
      evaluation_window_days: 180,
      po_count: 7,
      on_time_delivery: 0.86,
      quality_acceptance: 0.99,
      responsiveness: 0.75,
      price_competitiveness: 0.61,
      composite_score: 0.82,
      tier: 'preferred',
      rationale: ['7 POs over 180d'],
      computed_at: '2026-05-31T00:00:00.000Z',
    } as any);
    renderPage();
    await screen.findByText('Guhring');

    fireEvent.click(screen.getByRole('button', { name: /^Performance$/i }));
    fireEvent.change(screen.getByPlaceholderText('Vendor ID'), { target: { value: 'V-001' } });
    fireEvent.click(screen.getByRole('button', { name: /^Compute$/i }));

    expect((await screen.findByText('82%')).textContent).toBe('82%');
    expect(mockScorecard).toHaveBeenCalledWith({ vendor_id: 'V-001' });
    expect(screen.getByText('7 / 180d').textContent).toBe('7 / 180d');
  });

  it('surfaces a BusinessDispatchError from the scorecard lookup (never swallows it)', async () => {
    mockScorecard.mockRejectedValue(new BusinessDispatchError(400, 'needs at least 3 POs for a stable scorecard'));
    renderPage();
    await screen.findByText('Guhring');

    fireEvent.click(screen.getByRole('button', { name: /^Performance$/i }));
    fireEvent.change(screen.getByPlaceholderText('Vendor ID'), { target: { value: 'V-NEW' } });
    fireEvent.click(screen.getByRole('button', { name: /^Compute$/i }));

    const err = await screen.findByText(/needs at least 3 POs/i);
    expect(err.textContent).toMatch(/needs at least 3 POs/i);
  });

  it('surfaces a ranking rejection (never a silently-empty leaderboard) and retry re-invokes', async () => {
    mockRank.mockRejectedValue(new BusinessDispatchError(500, 'ranking unavailable'));
    renderPage();
    await screen.findByText('Guhring');

    fireEvent.click(screen.getByRole('button', { name: /^Performance$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Rank vendors/i }));

    const alert = await screen.findByRole('alert');
    fireEvent.click(within(alert).getByRole('button'));
    await waitFor(() => expect(mockRank).toHaveBeenCalledTimes(2));
  });
});
