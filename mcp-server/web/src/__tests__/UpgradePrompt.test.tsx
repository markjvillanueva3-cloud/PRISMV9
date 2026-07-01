/**
 * UpgradePrompt -- the conversion-critical component every gated free user sees
 * after QX7/QX8. Tests the buy-funnel intent (R9), not mere presence:
 *   - a PAID feature names the cheapest unlocking tier + its price + routes to /pricing;
 *   - an ADD-ON feature is labelled as such (not bundled-in);
 *   - a NOT-YET-LIVE feature shows "coming soon" with NO upgrade CTA (paying cannot
 *     unlock an unlaunched wave -- a CTA there would be a dead-end / false promise);
 *   - compact mode drops the price line but keeps the CTA;
 *   - clicking "View Plans" actually navigates to /pricing (the funnel entry).
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { UpgradePrompt } from '../components/entitlement/UpgradePrompt';
import type { FeatureKey } from '../data/pricing';

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function renderPrompt(feature: FeatureKey, opts?: { currentPlan?: string; compact?: boolean }) {
  return render(
    <MemoryRouter initialEntries={['/gated']}>
      <Routes>
        <Route
          path="/gated"
          element={
            <>
              <UpgradePrompt feature={feature} currentPlan={opts?.currentPlan} compact={opts?.compact} />
              <LocationProbe />
            </>
          }
        />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('UpgradePrompt (conversion / buy-funnel intent)', () => {
  it('a PAID feature names the cheapest unlocking tier + its monthly price', () => {
    // wizard.mill: free/starter false, pro true -> requiredPlanFor = Pro ($79/mo).
    renderPrompt('wizard.mill', { currentPlan: 'free' });
    const status = screen.getByRole('status').textContent ?? '';
    expect(status).toContain('Milling Wizard requires the Pro plan');
    expect(status).toContain('$79/mo');
    expect(status).toContain('You are on the free plan');
    // not an add-on at Pro -> no add-on label
    expect(status).not.toContain('add-on');
  });

  it('an ADD-ON feature is labelled "available as an add-on"', () => {
    // post.generate: starter = 'addon' -> requiredPlanFor = Starter, isAddonAt(Starter)=true.
    renderPrompt('post.generate', { currentPlan: 'free' });
    const status = screen.getByRole('status').textContent ?? '';
    expect(status).toContain('requires the Starter plan');
    expect(status).toContain('available as an add-on');
    expect(status).toContain('$29/mo');
  });

  it('a NOT-YET-LIVE feature shows coming-soon with NO upgrade CTA', () => {
    // quoting is FEATURE_NOT_YET_LIVE -> coming soon, no View Plans button.
    renderPrompt('quoting');
    const status = screen.getByRole('status').textContent ?? '';
    expect(status).toContain('Quoting (Wave 2)');
    expect(status).toContain('coming soon');
    expect(status).toContain('Included when Quoting launches (Wave 2)');
    expect(screen.queryByRole('button', { name: /View Plans/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Manage Plan/i })).toBeNull();
  });

  it('compact mode drops the price line but keeps the CTA', () => {
    renderPrompt('wizard.mill', { currentPlan: 'free', compact: true });
    const status = screen.getByRole('status').textContent ?? '';
    expect(status).toContain('Milling Wizard requires the Pro plan');
    // the explanatory "Unlock it from ... $/mo" line is hidden in compact mode
    expect(status).not.toContain('$79/mo');
    expect(status).not.toContain('Unlock it from');
    // CTA still present so a compact placement is still actionable
    expect(screen.getByRole('button', { name: /View Plans/i }).textContent).toContain('View Plans');
  });

  it('clicking "View Plans" navigates to /pricing (the funnel entry)', () => {
    renderPrompt('wizard.mill', { currentPlan: 'free' });
    expect(screen.getByTestId('loc').textContent).toBe('/gated');
    fireEvent.click(screen.getByRole('button', { name: /View Plans/i }));
    expect(screen.getByTestId('loc').textContent).toBe('/pricing');
  });

  it('clicking "Manage Plan" navigates to /subscription', () => {
    renderPrompt('wizard.mill', { currentPlan: 'free' });
    fireEvent.click(screen.getByRole('button', { name: /Manage Plan/i }));
    expect(screen.getByTestId('loc').textContent).toBe('/subscription');
  });
});
