/**
 * WorkspacePrimitives — FLEET-IOS-REDESIGN U2 regression lock (slot:hotel, 2026-06-09).
 *
 * These primitives back 106 pages, so the tests assert the BEHAVIORAL contracts
 * the iOS upgrade fixed — each is written to FAIL if the specific bug returns
 * (R9 intent, not presence): the ActionButton ghost-tone no-op (it used to fall
 * through to cyan), the missing TabButton aria-pressed, the >=44pt tap target,
 * focus-visible rings, the Select chevron hook, and the ResultCard shapes that
 * replace raw <pre>{JSON} dumps. Happy + failure + adversarial cases.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ActionButton,
  TabButton,
  Select,
  Input,
  ResultCard,
  Stepper,
  SummaryTile,
} from '../components/workspace/WorkspacePrimitives';

describe('ActionButton — fill variants + the ghost-tone fix', () => {
  it('default (solid, accent-driven) renders a filled accent button with accent-fg text', () => {
    render(<ActionButton>Run</ActionButton>);
    const btn = screen.getByRole('button', { name: 'Run' });
    // U3c: the primary tone is accent-driven -- bg-accent reads --accent-rgb and
    // text-accent-fg is the AA-compliant fg; the old hardcoded cyan is gone.
    expect(btn.className).toContain('bg-accent');
    expect(btn.className).toContain('text-accent-fg');
    expect(btn.className).not.toContain('bg-cyan-300');
  });

  it('default tone outline variant is accent-driven (accent text + border, transparent)', () => {
    render(<ActionButton variant="outline">Edit</ActionButton>);
    const btn = screen.getByRole('button', { name: 'Edit' });
    expect(btn.className).toContain('bg-transparent');
    expect(btn.className).toContain('text-accent');
    expect(btn.className).toContain('border-accent/40');
  });

  it('tone="ghost" renders a GHOST button (transparent), NOT the old cyan fall-through', () => {
    render(<ActionButton tone="ghost">Secondary</ActionButton>);
    const btn = screen.getByRole('button', { name: 'Secondary' });
    // The bug being locked out: tone="ghost" used to hit `palette[tone] ?? palette.cyan`
    // and render a solid cyan button. It must now be transparent.
    expect(btn.className).toContain('bg-transparent');
    expect(btn.className).not.toContain('bg-cyan-300');
  });

  it('variant="outline" renders a bordered, transparent button with accent text', () => {
    render(<ActionButton variant="outline" tone="emerald">Edit</ActionButton>);
    const btn = screen.getByRole('button', { name: 'Edit' });
    expect(btn.className).toContain('bg-transparent');
    expect(btn.className).toContain('border-emerald-300/40');
    expect(btn.className).toContain('text-emerald-100');
    expect(btn.className).not.toContain('bg-emerald-300 ');
  });

  it('every size meets the 44pt (--tap-min) iOS tap target', () => {
    const { rerender } = render(<ActionButton size="sm">S</ActionButton>);
    expect(screen.getByRole('button').className).toContain('min-h-11');
    rerender(<ActionButton size="md">M</ActionButton>);
    expect(screen.getByRole('button').className).toContain('min-h-11');
    rerender(<ActionButton size="lg">L</ActionButton>);
    expect(screen.getByRole('button').className).toContain('min-h-[3.25rem]');
  });

  it('carries a focus-visible ring (a11y floor)', () => {
    render(<ActionButton>Focus</ActionButton>);
    expect(screen.getByRole('button').className).toContain('focus-visible:ring-2');
  });

  it('loading disables the button and sets aria-busy', () => {
    const onClick = vi.fn();
    render(<ActionButton loading onClick={onClick}>Save</ActionButton>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(0);
  });

  it('fires onClick when enabled', () => {
    const onClick = vi.fn();
    render(<ActionButton onClick={onClick}>Go</ActionButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('adversarial: an unknown tone falls back to the accent-driven solid (never renders unstyled)', () => {
    // @ts-expect-error — exercising the defensive `?? TONE_STYLES.cyan` fallback.
    render(<ActionButton tone="plaid">X</ActionButton>);
    expect(screen.getByRole('button').className).toContain('bg-accent');
  });
});

describe('ActionButton — haptics on press (FLEET-IOS-REDESIGN U3b)', () => {
  // navigator.vibrate is the web fallback path useHaptics takes when no Capacitor
  // shell is present (jsdom has neither window.Capacitor nor a real vibrator).
  type MutableNavigator = { vibrate?: unknown };
  const nav = navigator as unknown as MutableNavigator;

  afterEach(() => {
    delete nav.vibrate;
  });

  it('fires a light haptic (navigator.vibrate 8ms) AND the onClick handler on press', () => {
    const vibrate = vi.fn();
    nav.vibrate = vibrate;
    const onClick = vi.fn();
    render(<ActionButton onClick={onClick}>Tap</ActionButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Tap' }));
    // 'light' impact maps to an 8ms vibrate (useHaptics IMPACT_MS.light).
    expect(vibrate).toHaveBeenCalledWith(8);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does NOT buzz a button with no onClick (a no-op press must not haptic)', () => {
    const vibrate = vi.fn();
    nav.vibrate = vibrate;
    render(<ActionButton>Idle</ActionButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }));
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('a loading button neither fires onClick nor buzzes (disabled press is inert)', () => {
    const vibrate = vi.fn();
    nav.vibrate = vibrate;
    const onClick = vi.fn();
    render(<ActionButton loading onClick={onClick}>Saving</ActionButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Saving' }));
    expect(onClick).not.toHaveBeenCalled();
    expect(vibrate).not.toHaveBeenCalled();
  });
});

describe('TabButton — aria-pressed reflects state (the DESIGN.md a11y gap)', () => {
  it('active tab is aria-pressed=true, inactive is false', () => {
    const { rerender } = render(<TabButton active onClick={() => {}}>Tab</TabButton>);
    expect(screen.getByRole('button', { name: 'Tab' })).toHaveAttribute('aria-pressed', 'true');
    rerender(<TabButton active={false} onClick={() => {}}>Tab</TabButton>);
    expect(screen.getByRole('button', { name: 'Tab' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('fires onClick', () => {
    const onClick = vi.fn();
    render(<TabButton active={false} onClick={onClick}>T</TabButton>);
    fireEvent.click(screen.getByRole('button', { name: 'T' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('U3d: active tab chrome is accent-driven (border/bg/ring follow the accent token)', () => {
    render(<TabButton active onClick={() => {}}>Tab</TabButton>);
    const btn = screen.getByRole('button', { name: 'Tab' });
    expect(btn.className).toContain('bg-accent');
    expect(btn.className).toContain('border-accent');
    expect(btn.className).toContain('ring-accent');
    expect(btn.className).not.toContain('bg-cyan-300');
  });
});

describe('Select / Input — chevron + 44pt + focus ring', () => {
  it('Select carries the ios-select chevron hook and a 44pt min height', () => {
    render(
      <Select aria-label="pick">
        <option value="a">A</option>
      </Select>,
    );
    const sel = screen.getByRole('combobox', { name: 'pick' });
    expect(sel.className).toContain('ios-select');
    expect(sel.className).toContain('min-h-11');
  });

  it('Input carries a focus ring and a 44pt min height; caller className still wins (appended last)', () => {
    render(<Input aria-label="qty" className="w-32" />);
    const input = screen.getByRole('textbox', { name: 'qty' });
    expect(input.className).toContain('focus:ring-2');
    expect(input.className).toContain('focus:ring-accent');
    expect(input.className).toContain('min-h-11');
    expect(input.className).toContain('w-32');
  });
});

describe('ResultCard — replaces raw <pre>{JSON} dumps', () => {
  it('an object renders an iOS key/value list', () => {
    render(<ResultCard data={{ rpm: 1200, feed: '18 ipm' }} />);
    expect(screen.getByText('rpm')).toBeInTheDocument();
    expect(screen.getByText('1200')).toBeInTheDocument();
    expect(screen.getByText('feed')).toBeInTheDocument();
    expect(screen.getByText('18 ipm')).toBeInTheDocument();
  });

  it('a null value in an object renders the "--" placeholder, never the string "null"', () => {
    render(<ResultCard data={{ note: null }} />);
    expect(screen.getByText('--')).toBeInTheDocument();
    expect(screen.queryByText('null')).toBeNull();
  });

  it('an empty object renders an explicit empty state', () => {
    render(<ResultCard data={{}} />);
    expect(screen.getByText('No data.')).toBeInTheDocument();
  });

  it('adversarial: an array falls back to a monospace block (not key/value rows)', () => {
    const { container } = render(<ResultCard data={[1, 2, 3]} />);
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toContain('1');
  });

  it('adversarial: top-level null renders "--" in a pre, never crashes', () => {
    const { container } = render(<ResultCard data={null} />);
    expect(container.querySelector('pre')?.textContent).toBe('--');
  });
});

describe('Stepper — lifecycle states + a11y', () => {
  it('renders every label and marks the active step with aria-current="step"', () => {
    render(<Stepper steps={['Draft', 'Review', 'Posted']} current={1} />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Posted')).toBeInTheDocument();
    const active = screen.getByText('Review').closest('li');
    expect(active).toHaveAttribute('aria-current', 'step');
  });

  it('U3d: the active step dot is accent-driven (bg-accent); done steps stay emerald', () => {
    const { container } = render(<Stepper steps={['A', 'B', 'C']} current={1} />);
    // active = index 1 -> bg-accent; done = index 0 -> bg-emerald-300 (semantic, unchanged).
    expect(container.innerHTML).toContain('bg-accent');
    expect(container.innerHTML).toContain('bg-emerald-300');
    expect(container.innerHTML).not.toContain('bg-cyan-300');
  });

  it('completed steps render a check glyph (svg), one per done step', () => {
    const { container } = render(<Stepper steps={['A', 'B', 'C']} current={2} />);
    // current=2 => steps 0 and 1 are done => 2 check svgs.
    expect(container.querySelectorAll('svg').length).toBe(2);
  });

  it('adversarial: current beyond the last index does not crash and marks all done', () => {
    const { container } = render(<Stepper steps={['A', 'B']} current={9} />);
    expect(container.querySelectorAll('svg').length).toBe(2);
  });

  it('adversarial: a negative current marks all steps todo (no done, no active)', () => {
    const { container } = render(<Stepper steps={['A', 'B']} current={-1} />);
    expect(container.querySelectorAll('svg').length).toBe(0);
    expect(container.querySelector('[aria-current="step"]')).toBeNull();
  });
});

describe('SummaryTile — emphasis hierarchy variant', () => {
  it('emphasis="high" enlarges the value; normal keeps the default size', () => {
    const { rerender, container } = render(<SummaryTile label="Revenue" value="$1.2M" emphasis="high" />);
    expect(container.querySelector('.text-3xl')).not.toBeNull();
    rerender(<SummaryTile label="Revenue" value="$1.2M" />);
    expect(container.querySelector('.text-3xl')).toBeNull();
    expect(container.querySelector('.text-2xl')).not.toBeNull();
  });
});
