import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheckoutOutcomePage from '../pages/CheckoutOutcomePage';

const h = vi.hoisted(() => ({ clearEntitlementCache: vi.fn() }));
vi.mock('../components/entitlement', () => ({ clearEntitlementCache: h.clearEntitlementCache }));

function renderAt(
  url: string,
  outcome: 'success' | 'cancel',
  context: 'subscription' | 'post',
) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <CheckoutOutcomePage outcome={outcome} context={context} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  h.clearEntitlementCache.mockReset();
});

describe('CheckoutOutcomePage', () => {
  it('subscription success: confirms, clears the entitlement cache, shows the session ref', () => {
    renderAt('/billing/success?session_id=cs_test_123', 'success', 'subscription');
    expect(screen.getByRole('heading').textContent).toBe('Subscription Active');
    expect(h.clearEntitlementCache).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Open Kienzle/i }).textContent ?? '').toContain('Open Kienzle');
    expect(screen.getByText(/^Ref:/).textContent ?? '').toContain('cs_test_123');
  });

  it('post success: post-specific copy + clears the cache', () => {
    renderAt('/post-processor/success', 'success', 'post');
    expect(screen.getByRole('heading').textContent).toBe('Purchase Complete');
    expect(screen.getByRole('button', { name: /Open The Post Store/i }).textContent ?? '').toContain('Post Store');
    expect(h.clearEntitlementCache).toHaveBeenCalledTimes(1);
  });

  it('subscription cancel: no charge messaging, does NOT clear the cache', () => {
    renderAt('/billing/cancel', 'cancel', 'subscription');
    expect(screen.getByRole('heading').textContent).toBe('Checkout Canceled');
    expect(screen.getByText(/No charge was made/i).textContent ?? '').toContain('No charge');
    expect(h.clearEntitlementCache).toHaveBeenCalledTimes(0);
    expect(screen.getByRole('button', { name: /View Plans/i }).textContent ?? '').toContain('View Plans');
  });

  it('post cancel: routes back to the post store, no cache clear', () => {
    renderAt('/post-processor', 'cancel', 'post');
    expect(screen.getByRole('heading').textContent).toBe('Checkout Canceled');
    expect(screen.getByRole('button', { name: /Back To The Post Store/i }).textContent ?? '').toContain('Post Store');
    expect(h.clearEntitlementCache).toHaveBeenCalledTimes(0);
  });

  it('omits the session ref line when there is no session_id', () => {
    renderAt('/billing/success', 'success', 'subscription');
    expect(screen.queryByText(/^Ref:/)).toBeNull();
    expect(h.clearEntitlementCache).toHaveBeenCalledTimes(1);
  });
});
