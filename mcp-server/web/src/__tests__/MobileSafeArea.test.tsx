/**
 * MobileSafeArea.test.tsx -- the shared iOS/Android safe-area primitive.
 *
 * R9: the load-bearing assertions are exact CSS values from the PURE helpers
 * (safeAreaInset / safeAreaPadding) -- these are the behavior, and they need no DOM.
 * jsdom's CSS engine rejects `calc(env(...))` as a <length>, so the component test
 * asserts composition (children, `as` tag, caller-style merge), not the dropped value.
 *
 * Coverage: bare env vs calc+extra; single/all/subset edges; extraPx fan-out;
 * adversarial empty edges; component children + polymorphic `as` + style merge order.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileSafeArea, safeAreaInset, safeAreaPadding } from '../components/mobile/MobileSafeArea';

describe('safeAreaInset', () => {
  it('returns the bare env() inset when no extra is given', () => {
    expect(safeAreaInset('top')).toBe('env(safe-area-inset-top, 0px)');
    expect(safeAreaInset('left')).toBe('env(safe-area-inset-left, 0px)');
  });
  it('wraps in calc() with a px extra (the home-indicator clearance case)', () => {
    expect(safeAreaInset('bottom', 12)).toBe('calc(env(safe-area-inset-bottom, 0px) + 12px)');
    expect(safeAreaInset('right', 8)).toBe('calc(env(safe-area-inset-right, 0px) + 8px)');
  });
  it('treats extraPx=0 as the bare env() (no pointless calc)', () => {
    expect(safeAreaInset('top', 0)).toBe('env(safe-area-inset-top, 0px)');
  });
});

describe('safeAreaPadding', () => {
  it('maps a single edge to ONLY its padding property (the AcademyHub bar case)', () => {
    expect(safeAreaPadding(['bottom'], 12)).toEqual({
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
    });
  });
  it('defaults to all four edges with bare env()', () => {
    expect(safeAreaPadding()).toEqual({
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      paddingLeft: 'env(safe-area-inset-left, 0px)',
      paddingRight: 'env(safe-area-inset-right, 0px)',
    });
  });
  it('includes ONLY the requested edges (left+right), never the others', () => {
    const s = safeAreaPadding(['left', 'right']);
    expect(s).toEqual({
      paddingLeft: 'env(safe-area-inset-left, 0px)',
      paddingRight: 'env(safe-area-inset-right, 0px)',
    });
    expect('paddingTop' in s).toBe(false);
    expect('paddingBottom' in s).toBe(false);
  });
  it('applies extraPx to EVERY listed edge', () => {
    expect(safeAreaPadding(['top', 'bottom'], 10)).toEqual({
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
    });
  });
  it('adversarial: empty edges -> empty style (injects no padding at all)', () => {
    expect(safeAreaPadding([])).toEqual({});
  });
});

describe('MobileSafeArea component', () => {
  it('renders its children', () => {
    render(<MobileSafeArea data-testid="sa">inside</MobileSafeArea>);
    expect(screen.getByTestId('sa').textContent).toBe('inside');
  });
  it('renders the element named by `as` (polymorphic)', () => {
    render(<MobileSafeArea as="section" data-testid="sa">x</MobileSafeArea>);
    expect(screen.getByTestId('sa').tagName).toBe('SECTION');
  });
  it('renders a div by default', () => {
    render(<MobileSafeArea data-testid="sa">x</MobileSafeArea>);
    expect(screen.getByTestId('sa').tagName).toBe('DIV');
  });
  it('merges caller style AFTER the safe-area padding (caller can override)', () => {
    render(
      <MobileSafeArea edges={['bottom']} style={{ background: 'rgb(255, 0, 0)' }} data-testid="sa">
        x
      </MobileSafeArea>,
    );
    // The caller style flows through -> proves the merged style object is applied.
    // (jsdom drops the calc(env()) padding; its value is asserted in the helper tests.)
    expect(screen.getByTestId('sa').getAttribute('style')).toContain('background');
  });
  it('passes through className', () => {
    render(<MobileSafeArea className="pad-x" data-testid="sa">x</MobileSafeArea>);
    expect(screen.getByTestId('sa').className).toContain('pad-x');
  });
  it('caller style WINS on a conflicting key (merge order: caller spread last)', () => {
    // safe-area sets paddingBottom (dropped by jsdom), caller overrides with a valid px
    // value jsdom keeps -> proves the documented override precedence, not just co-existence.
    render(
      <MobileSafeArea edges={['bottom']} style={{ paddingBottom: '99px' }} data-testid="sa">
        x
      </MobileSafeArea>,
    );
    expect((screen.getByTestId('sa') as HTMLElement).style.paddingBottom).toBe('99px');
  });
});
