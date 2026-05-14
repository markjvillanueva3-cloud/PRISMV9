import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SurfaceCrossLink } from '../components/SurfaceCrossLink';

function renderWithRouter(ui: React.ReactNode, initialPath = '/calculator') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>,
  );
}

describe('SurfaceCrossLink', () => {
  it('renders an anchor element with href, label, note, and trailing arrow', () => {
    const { getByTestId } = renderWithRouter(
      <SurfaceCrossLink
        to="/speed-feed-calc"
        label="Lite SFC"
        note="Quick S/F with smart selectors + PDF export"
      />,
    );
    const link = getByTestId('surface-cross-link') as HTMLAnchorElement;
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/speed-feed-calc');
    expect(link.getAttribute('data-target')).toBe('/speed-feed-calc');
    // label and note are present in the rendered text content in the documented order
    expect(link.textContent).toBe('Lite SFC— Quick S/F with smart selectors + PDF export→');
    // exactly one arrow glyph, exactly the U+2192 RIGHTWARDS ARROW
    const arrowSpans = Array.from(link.querySelectorAll('[aria-hidden="true"]'))
      .filter((el) => el.textContent === '→');
    expect(arrowSpans.length).toBe(1);
  });

  it('combines label and note into aria-label (screen-reader-safe) and title (hover tooltip)', () => {
    const { getByTestId } = renderWithRouter(
      <SurfaceCrossLink to="/ppg-lite" label="Lite PPG" note="3-col editor with AI panel" />,
    );
    const link = getByTestId('surface-cross-link');
    expect(link.getAttribute('aria-label')).toBe('Lite PPG — 3-col editor with AI panel');
    expect(link.getAttribute('title')).toBe('3-col editor with AI panel');
  });

  it.each([
    ['cyan', 'border-cyan-500/40', 'text-cyan-300'],
    ['violet', 'border-violet-500/40', 'text-violet-300'],
    ['emerald', 'border-emerald-500/40', 'text-emerald-300'],
    ['amber', 'border-amber-500/40', 'text-amber-300'],
  ] as const)(
    'maps accent=%s to the matching Tailwind classes (border on root + text on inner)',
    (accent, borderCls, textCls) => {
      const { getByTestId } = renderWithRouter(
        <SurfaceCrossLink to="/x" label="X" note="x" accent={accent} />,
      );
      const link = getByTestId('surface-cross-link');
      expect(link.className.split(/\s+/)).toContain(borderCls);
      // text class must appear on EXACTLY 2 descendant spans: the label span
      // and the trailing arrow span. Note span keeps slate-400 (intentional).
      // Catches the regression where the arrow color is decoupled from accent.
      const matchingSpans = Array.from(link.querySelectorAll('span')).filter((el) =>
        el.className.split(/\s+/).includes(textCls),
      );
      expect(matchingSpans.length).toBe(2);
    },
  );

  it('defaults to cyan accent classes when accent prop is omitted', () => {
    const { getByTestId } = renderWithRouter(
      <SurfaceCrossLink to="/x" label="X" note="x" />,
    );
    const link = getByTestId('surface-cross-link');
    const classes = link.className.split(/\s+/);
    expect(classes).toContain('border-cyan-500/40');
    expect(classes).not.toContain('border-violet-500/40');
    expect(classes).not.toContain('border-emerald-500/40');
    expect(classes).not.toContain('border-amber-500/40');
  });

  it('renders the optional icon as a separate aria-hidden span when provided', () => {
    const { getByTestId } = renderWithRouter(
      <SurfaceCrossLink to="/x" label="Marketing" note="learn more" icon="P" accent="emerald" />,
    );
    const link = getByTestId('surface-cross-link');
    const ariaHidden = link.querySelectorAll('[aria-hidden="true"]');
    // icon + trailing arrow = exactly 2 aria-hidden spans
    expect(ariaHidden.length).toBe(2);
    // first aria-hidden is the icon (textContent === 'P'), last is the arrow
    expect(ariaHidden[0].textContent).toBe('P');
    expect(ariaHidden[1].textContent).toBe('→');
  });

  it('does NOT render the icon span when icon prop is omitted', () => {
    const { getByTestId } = renderWithRouter(
      <SurfaceCrossLink to="/x" label="X" note="x" />,
    );
    const link = getByTestId('surface-cross-link');
    const ariaHidden = link.querySelectorAll('[aria-hidden="true"]');
    // only the trailing arrow is aria-hidden when no icon is supplied
    expect(ariaHidden.length).toBe(1);
    expect(ariaHidden[0].textContent).toBe('→');
  });

  it('appends caller-supplied className alongside the base + accent classes', () => {
    const { getByTestId } = renderWithRouter(
      <SurfaceCrossLink to="/x" label="X" note="x" className="ml-auto custom-test-class" />,
    );
    const link = getByTestId('surface-cross-link');
    const classes = link.className.split(/\s+/);
    expect(classes).toContain('ml-auto');
    expect(classes).toContain('custom-test-class');
    // base classes must still be present — caller cannot accidentally clobber them
    expect(classes).toContain('inline-flex');
    expect(classes).toContain('rounded-md');
    expect(classes).toContain('border-cyan-500/40');
  });

  it('handles empty strings for label and note without throwing — anchor is still navigable', () => {
    const { getByTestId } = renderWithRouter(
      <SurfaceCrossLink to="/edge" label="" note="" />,
    );
    const link = getByTestId('surface-cross-link');
    expect(link.getAttribute('href')).toBe('/edge');
    // aria-label is "<empty> — <empty>" — three chars (space dash space)
    expect(link.getAttribute('aria-label')).toBe(' — ');
    // textContent has no label/note, just the em-dash separator and arrow
    expect(link.textContent).toBe('— →');
  });

  it('renders the empty-string className branch without trailing whitespace from the join filter', () => {
    const { getByTestId } = renderWithRouter(
      <SurfaceCrossLink to="/x" label="X" note="x" />,
    );
    const link = getByTestId('surface-cross-link');
    // className built from filter(Boolean).join(' ') — must not contain double spaces
    expect(link.className).not.toMatch(/\s{2,}/);
    // must not begin or end with whitespace
    expect(link.className).toBe(link.className.trim());
  });

  it('preserves the data-target attribute exactly as the to prop (used by tests / analytics)', () => {
    const cases = ['/speed-feed-calc', '/ppg-lite', '/post-processor', '/calculator', '/ppg'];
    for (const to of cases) {
      const { getByTestId, unmount } = renderWithRouter(
        <SurfaceCrossLink to={to} label="X" note="x" />,
      );
      const link = getByTestId('surface-cross-link');
      expect(link.getAttribute('data-target')).toBe(to);
      expect(link.getAttribute('href')).toBe(to);
      unmount();
    }
  });
});
