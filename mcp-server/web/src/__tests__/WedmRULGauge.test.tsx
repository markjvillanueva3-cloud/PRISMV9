/**
 * WedmRULGauge tests
 * P2P-FULLSTACK-MS0 / U-P2PFS45
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  WedmRULGauge,
  type WedmRULSnapshot,
  type WedmRULComponent,
  type WedmRULComponentId,
  type WedmRULBand,
} from '../components/wedm/WedmRULGauge';

// ── Fixtures ─────────────────────────────────────────────────────────────

function component(
  id: WedmRULComponentId,
  overrides: Partial<WedmRULComponent> = {},
): WedmRULComponent {
  return {
    component: id,
    state: 20,
    capacity: 100,
    rate_per_hr: 0.5,
    rul_hours: 160,
    band: 'healthy',
    ...overrides,
  };
}

function snapshot(
  overrideBands: Partial<Record<WedmRULComponentId, WedmRULBand>> = {},
  overrideFields: Partial<WedmRULSnapshot> = {},
): WedmRULSnapshot {
  const ids: WedmRULComponentId[] = [
    'guide_wear',
    'wire_erosion',
    'filter_capacity',
    'filter_clogging',
    'wire_fatigue',
  ];
  const components: Partial<Record<WedmRULComponentId, WedmRULComponent>> = {};
  for (const id of ids) {
    components[id] = component(id, { band: overrideBands[id] ?? 'healthy' });
  }
  const bandsList = ids.map((id) => components[id]!.band);
  const worstBand: WedmRULBand = bandsList.includes('imminent')
    ? 'imminent'
    : bandsList.includes('soon')
    ? 'soon'
    : bandsList.includes('planned')
    ? 'planned'
    : 'healthy';
  return {
    components,
    worstComponent: 'guide_wear',
    worstRUL_hours: 160,
    worstBand,
    ...overrideFields,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('WedmRULGauge', () => {
  it('renders null when snapshot is missing', () => {
    const { container } = render(
      <WedmRULGauge snapshot={null as unknown as WedmRULSnapshot} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all 5 component rows in stable order', () => {
    render(<WedmRULGauge snapshot={snapshot()} />);
    const rows = screen.getAllByTestId('rul-component-row');
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.getAttribute('data-component-id'))).toEqual([
      'guide_wear',
      'wire_erosion',
      'filter_capacity',
      'filter_clogging',
      'wire_fatigue',
    ]);
  });

  it('propagates the worst band to the root data-worst-band attribute', () => {
    const { container } = render(
      <WedmRULGauge
        snapshot={snapshot({ wire_erosion: 'imminent', filter_capacity: 'soon' })}
      />,
    );
    const root = container.querySelector('[data-testid="wedm-rul-gauge"]');
    expect(root?.getAttribute('data-worst-band')).toBe('imminent');
  });

  it('shows worst-band pill with uppercased band + hours', () => {
    render(
      <WedmRULGauge
        snapshot={snapshot({}, { worstBand: 'soon', worstRUL_hours: 25 })}
      />,
    );
    expect(screen.getByTestId('rul-worst-band-pill').textContent).toMatch(/SOON.*25\.0 hr/);
  });

  it('renders band counter chips only for bands with non-zero count', () => {
    render(
      <WedmRULGauge
        snapshot={snapshot({
          wire_erosion: 'imminent',
          filter_capacity: 'soon',
          filter_clogging: 'planned',
        })}
      />,
    );
    expect(screen.getByTestId('rul-count-imminent').textContent).toContain('1 imminent');
    expect(screen.getByTestId('rul-count-soon').textContent).toContain('1 soon');
    expect(screen.getByTestId('rul-count-planned').textContent).toContain('1 planned');
    // 2 healthy remaining
    expect(screen.getByTestId('rul-count-healthy').textContent).toContain('2 healthy');
  });

  it('falls back to computed worst band when snapshot.worstBand is stale/absent', () => {
    const { container } = render(
      <WedmRULGauge
        snapshot={
          {
            components: {
              guide_wear: component('guide_wear', { band: 'imminent' }),
            },
            worstComponent: 'guide_wear',
            worstRUL_hours: 2,
            // worstBand intentionally omitted to force fallback path
          } as unknown as WedmRULSnapshot
        }
      />,
    );
    expect(
      container.querySelector('[data-testid="wedm-rul-gauge"]')?.getAttribute('data-worst-band'),
    ).toBe('imminent');
  });

  it('renders bar fill at ~80% for a 20/100 state (healthPct)', () => {
    render(
      <WedmRULGauge
        snapshot={
          {
            components: {
              guide_wear: component('guide_wear', {
                state: 20,
                capacity: 100,
                band: 'healthy',
              }),
            },
            worstComponent: 'guide_wear',
            worstRUL_hours: 160,
            worstBand: 'healthy',
          } as WedmRULSnapshot
        }
      />,
    );
    const fill = screen.getAllByTestId('rul-bar-fill')[0];
    expect(fill.getAttribute('data-fill-pct')).toBe('80');
  });

  it('clamps bar fill to 0% when state exceeds capacity', () => {
    render(
      <WedmRULGauge
        snapshot={
          {
            components: {
              guide_wear: component('guide_wear', {
                state: 150,
                capacity: 100,
                band: 'imminent',
              }),
            },
            worstComponent: 'guide_wear',
            worstRUL_hours: 0,
            worstBand: 'imminent',
          } as WedmRULSnapshot
        }
      />,
    );
    const fill = screen.getAllByTestId('rul-bar-fill')[0];
    expect(fill.getAttribute('data-fill-pct')).toBe('0');
  });

  it('clamps bar fill to 100% for negative state (sanity)', () => {
    render(
      <WedmRULGauge
        snapshot={
          {
            components: {
              guide_wear: component('guide_wear', {
                state: -10,
                capacity: 100,
                band: 'healthy',
              }),
            },
            worstComponent: 'guide_wear',
            worstRUL_hours: 220,
            worstBand: 'healthy',
          } as WedmRULSnapshot
        }
      />,
    );
    const fill = screen.getAllByTestId('rul-bar-fill')[0];
    expect(fill.getAttribute('data-fill-pct')).toBe('100');
  });

  it('formats large RUL as integer hours and sub-hour as minutes', () => {
    render(
      <WedmRULGauge
        snapshot={
          {
            components: {
              guide_wear: component('guide_wear', { rul_hours: 0.5, band: 'imminent' }),
              wire_erosion: component('wire_erosion', { rul_hours: 250, band: 'planned' }),
            },
            worstComponent: 'guide_wear',
            worstRUL_hours: 0.5,
            worstBand: 'imminent',
          } as WedmRULSnapshot
        }
      />,
    );
    const rows = screen.getAllByTestId('rul-component-row');
    expect(rows[0].textContent).toContain('30 min');
    expect(rows[1].textContent).toContain('250 hr');
  });

  it('shows "∞ hr" when rul_hours is Infinity (component not aging)', () => {
    const { container } = render(
      <WedmRULGauge
        snapshot={
          {
            components: {
              guide_wear: component('guide_wear', {
                rul_hours: Number.POSITIVE_INFINITY,
                band: 'healthy',
              }),
            },
            worstComponent: 'guide_wear',
            worstRUL_hours: Number.POSITIVE_INFINITY,
            worstBand: 'healthy',
          } as WedmRULSnapshot
        }
      />,
    );
    expect(container.textContent).toContain('∞ hr');
  });

  it('renders a "not sampled" placeholder for missing components', () => {
    const partialSnap: WedmRULSnapshot = {
      components: {
        guide_wear: component('guide_wear'),
        // wire_erosion deliberately missing
        filter_capacity: component('filter_capacity'),
        filter_clogging: component('filter_clogging'),
        wire_fatigue: component('wire_fatigue'),
      },
      worstComponent: 'guide_wear',
      worstRUL_hours: 160,
      worstBand: 'healthy',
    };
    render(<WedmRULGauge snapshot={partialSnap} />);
    const rows = screen.getAllByTestId('rul-component-row');
    const missingRow = rows.find((r) => r.getAttribute('data-component-id') === 'wire_erosion');
    expect(missingRow?.getAttribute('data-missing')).toBe('true');
    expect(missingRow?.textContent).toContain('not sampled');
  });

  it('fires onOpenDetails when the details button is clicked', () => {
    const fn = vi.fn();
    render(<WedmRULGauge snapshot={snapshot()} onOpenDetails={fn} />);
    fireEvent.click(screen.getByTestId('rul-open-details'));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('has role="region" with label citing worst band + counts', () => {
    render(
      <WedmRULGauge
        snapshot={snapshot(
          { wire_erosion: 'imminent', filter_capacity: 'soon' },
          { worstRUL_hours: 2, worstBand: 'imminent' },
        )}
      />,
    );
    const label = screen.getByRole('region').getAttribute('aria-label') ?? '';
    expect(label).toMatch(/imminent/);
    expect(label).toMatch(/imminent 1/);
    expect(label).toMatch(/soon 1/);
  });

  it('renders sampledAt footer when provided', () => {
    const { container } = render(
      <WedmRULGauge snapshot={snapshot({}, { sampledAt: '2026-04-19T14:30:00Z' })} />,
    );
    expect(container.textContent).toContain('2026-04-19T14:30:00Z');
  });
});
