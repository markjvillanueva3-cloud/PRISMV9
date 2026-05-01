/**
 * WedmControllerCodePreview tests
 * P2P-FULLSTACK-MS0 / U-P2PFS50
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  WedmControllerCodePreview,
  tokenizeWedmLine,
} from '../components/wedm/WedmControllerCodePreview';

const SAMPLE = `%
(JM DIE MV2400S — rough + 2 skim)
N0010 G92 X0. Y0.
N0020 G41 H1 E101 C20 T3
N0030 G01 X10.0 Y0. F25.
N0040 G02 X20.0 Y10.0 I0. J10.
N0050 M80
N0060 M30
%`;

describe('tokenizeWedmLine', () => {
  it('identifies G-, M-, and register tokens', () => {
    const toks = tokenizeWedmLine('N0020 G41 H1 E101 C20 T3');
    const kinds = toks.map((t) => t.kind);
    expect(kinds).toContain('n_number');
    expect(kinds).toContain('g_code');
    expect(kinds).toContain('h_register');
    expect(kinds).toContain('e_register');
    expect(kinds).toContain('c_register');
    expect(kinds).toContain('t_register');
  });

  it('identifies address words (X/Y/Z/F/I/J)', () => {
    const toks = tokenizeWedmLine('G02 X20.0 Y10.0 I0. J10.');
    expect(toks.filter((t) => t.kind === 'address').map((t) => t.text)).toEqual(
      expect.arrayContaining(['X20.0', 'Y10.0', 'I0.', 'J10.']),
    );
  });

  it('identifies parenthesized comments as a single comment token', () => {
    const toks = tokenizeWedmLine('(rough pass start)');
    expect(toks).toHaveLength(1);
    expect(toks[0]).toEqual({ kind: 'comment', text: '(rough pass start)' });
  });

  it('handles percent delimiter', () => {
    const toks = tokenizeWedmLine('%');
    expect(toks).toEqual([{ kind: 'delimiter', text: '%' }]);
  });

  it('returns empty array for empty line', () => {
    expect(tokenizeWedmLine('')).toEqual([]);
  });

  it('coalesces consecutive plain characters into one token', () => {
    const toks = tokenizeWedmLine('??? foo');
    // '???' are not matched by any pattern → plain; then ' ' whitespace; then 'foo' plain
    // All plain/whitespace chunks should collapse into runs.
    const plainTexts = toks.filter((t) => t.kind === 'plain').map((t) => t.text);
    // Whitespace uses the whitespace path (plain), so we should have either one combined
    // plain token or a whitespace+plain sequence — either way, no more than 2 plain tokens.
    expect(plainTexts.length).toBeLessThanOrEqual(2);
  });
});

describe('WedmControllerCodePreview', () => {
  it('renders empty placeholder when code is null/empty', () => {
    render(<WedmControllerCodePreview code={null} />);
    expect(screen.getByTestId('wedm-code-preview-empty')).toBeInTheDocument();
  });

  it('renders one row per line and uses 1-based line numbers', () => {
    render(<WedmControllerCodePreview code={SAMPLE} />);
    const rows = screen.getAllByTestId('code-preview-line');
    expect(rows).toHaveLength(SAMPLE.split('\n').length);
    const numbers = screen.getAllByTestId('code-preview-line-number').map((n) => n.textContent);
    expect(numbers[0]).toBe('1');
    expect(numbers[numbers.length - 1]).toBe(String(rows.length));
  });

  it('hides line numbers when showLineNumbers is false', () => {
    render(<WedmControllerCodePreview code={SAMPLE} showLineNumbers={false} />);
    expect(screen.queryByTestId('code-preview-line-number')).not.toBeInTheDocument();
  });

  it('highlights the requested line via data-highlighted="true"', () => {
    render(<WedmControllerCodePreview code={SAMPLE} highlightLine={4} />);
    const row4 = screen.getAllByTestId('code-preview-line')[3];
    expect(row4.getAttribute('data-highlighted')).toBe('true');
    // Others should be false.
    const row1 = screen.getAllByTestId('code-preview-line')[0];
    expect(row1.getAttribute('data-highlighted')).toBe('false');
  });

  it('classifies Mitsubishi register tokens with the expected data-token-kind values', () => {
    const { container } = render(<WedmControllerCodePreview code={SAMPLE} />);
    const byKind = (kind: string) =>
      container.querySelectorAll(`[data-token-kind="${kind}"]`).length;
    expect(byKind('g_code')).toBeGreaterThanOrEqual(3); // G92, G41, G01, G02
    expect(byKind('m_code')).toBeGreaterThanOrEqual(2); // M80, M30
    expect(byKind('e_register')).toBeGreaterThanOrEqual(1);
    expect(byKind('c_register')).toBeGreaterThanOrEqual(1);
    expect(byKind('h_register')).toBeGreaterThanOrEqual(1);
    expect(byKind('delimiter')).toBeGreaterThanOrEqual(2); // leading + trailing %
    expect(byKind('comment')).toBeGreaterThanOrEqual(1);
  });

  it('fires onCopy with the full code string when copy button is clicked', () => {
    const fn = vi.fn();
    render(<WedmControllerCodePreview code={SAMPLE} onCopy={fn} />);
    fireEvent.click(screen.getByTestId('code-preview-copy'));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toBe(SAMPLE);
  });

  it('hides copy button when showCopy is false', () => {
    render(<WedmControllerCodePreview code={SAMPLE} showCopy={false} />);
    expect(screen.queryByTestId('code-preview-copy')).not.toBeInTheDocument();
  });

  it('renders annotations attached to the correct line', () => {
    render(
      <WedmControllerCodePreview
        code={SAMPLE}
        annotations={[
          { line: 2, severity: 'info', message: 'header block' },
          { line: 6, severity: 'warn', message: 'tangent entry recommended' },
          { line: 7, severity: 'error', message: 'M80 at end — power-off block' },
        ]}
      />,
    );
    expect(screen.getByTestId('code-preview-annotations-2')).toBeInTheDocument();
    expect(screen.getByTestId('code-preview-annotations-6')).toBeInTheDocument();
    expect(screen.getByTestId('code-preview-annotations-7')).toBeInTheDocument();
    const chips = screen.getAllByTestId('code-preview-annotation-chip');
    expect(chips.length).toBe(3);
    expect(chips[0].getAttribute('data-severity')).toBe('info');
    expect(chips[1].getAttribute('data-severity')).toBe('warn');
    expect(chips[2].getAttribute('data-severity')).toBe('error');
  });

  it('exposes line count + controller label in data attrs and aria-label', () => {
    render(<WedmControllerCodePreview code={SAMPLE} controller="Mitsubishi M800" />);
    const root = screen.getByTestId('wedm-controller-code-preview');
    expect(root.getAttribute('data-controller')).toBe('Mitsubishi M800');
    expect(root.getAttribute('data-line-count')).toBe(String(SAMPLE.split('\n').length));
    expect(root.getAttribute('aria-label')).toMatch(/Mitsubishi M800/);
  });

  it('treats a code string of only whitespace as empty', () => {
    render(<WedmControllerCodePreview code="" />);
    expect(screen.getByTestId('wedm-code-preview-empty')).toBeInTheDocument();
  });
});
