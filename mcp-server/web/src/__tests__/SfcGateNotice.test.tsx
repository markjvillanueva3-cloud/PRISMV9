import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SfcGateNotice from '../components/sfc/SfcGateNotice';

function renderNotice(code: string | null, message?: string | null) {
  return render(
    <MemoryRouter>
      <SfcGateNotice code={code} message={message} />
    </MemoryRouter>,
  );
}

describe('SfcGateNotice (403 disambiguation)', () => {
  it('TIER_LIMIT -> daily-cap notice WITH an upgrade CTA', () => {
    renderNotice('TIER_LIMIT', 'Speed/feed limit reached (10/day). Upgrade to Starter or higher.');
    expect(screen.getByRole('status').textContent).toContain('Daily free limit reached');
    // renders the backend message as the body
    expect(screen.getByRole('status').textContent).toContain('10/day');
    expect(screen.getByRole('button', { name: /View Plans/i }).textContent).toContain('View Plans');
  });

  it('a bare 403 (null code) defaults to the daily-cap upgrade path', () => {
    renderNotice(null);
    expect(screen.getByRole('status').textContent).toContain('Daily free limit reached');
    expect(screen.getByRole('button', { name: /View Plans/i }).textContent).toContain('View Plans');
  });

  it('ENTITLEMENT_REVOKED -> admin-revoke notice with NO upgrade CTA (paying does not restore it)', () => {
    renderNotice('ENTITLEMENT_REVOKED', 'Access to speed_feed has been disabled for your account by your administrator.');
    expect(screen.getByRole('status').textContent).toContain('administrator');
    // an upgrade CTA would be misleading for a revoke -- there must be none
    expect(screen.queryByRole('button', { name: /View Plans/i })).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('disabled');
  });

  it('falls back to default copy when the backend message is absent', () => {
    renderNotice('ENTITLEMENT_REVOKED', null);
    expect(screen.getByRole('status').textContent).toContain('Contact your shop administrator');
  });
});
