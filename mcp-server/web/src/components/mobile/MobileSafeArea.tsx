/**
 * MobileSafeArea -- the single shared primitive for iOS / Android safe-area insets
 * (notch, Dynamic Island, home indicator, Android gesture nav).
 *
 * Per mcp-server/web/CLAUDE.md (Mobile section): NEVER inline env(safe-area-inset-*)
 * per page -- route every safe-area need through this module so the notch/inset rules
 * live in exactly one place. Requires the index.html viewport meta to carry
 * `viewport-fit=cover` (it does); without it the insets resolve to 0 on every device.
 *
 * Two supported usages:
 *   1. Wrap full-bleed content:
 *        <MobileSafeArea edges={['top', 'bottom']}>...</MobileSafeArea>
 *   2. Add inset padding to an existing element (e.g. a fixed bottom action bar that must
 *      clear the home indicator) without a wrapper:
 *        <div style={safeAreaPadding(['bottom'], 12)}> ... </div>
 *
 * The `env(..., 0px)` fallback keeps every value a no-op on desktop / non-notched devices,
 * so applying it is always safe (additive only on hardware that reports an inset).
 */
import { createElement, type CSSProperties, type ElementType, type ReactNode } from 'react';

export type SafeAreaEdge = 'top' | 'bottom' | 'left' | 'right';

const ALL_EDGES: SafeAreaEdge[] = ['top', 'bottom', 'left', 'right'];

/**
 * CSS value for a single safe-area edge inset, optionally plus a fixed extra in px.
 * @example safeAreaInset('top')       // "env(safe-area-inset-top, 0px)"
 * @example safeAreaInset('bottom', 12) // "calc(env(safe-area-inset-bottom, 0px) + 12px)"
 */
export function safeAreaInset(edge: SafeAreaEdge, extraPx = 0): string {
  const base = `env(safe-area-inset-${edge}, 0px)`;
  return extraPx ? `calc(${base} + ${extraPx}px)` : base;
}

/**
 * CSSProperties adding safe-area padding for the given edges (default: all four).
 * `extraPx` is added to every listed edge.
 * @example safeAreaPadding(['bottom'], 12)
 *   // { paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }
 */
export function safeAreaPadding(edges: SafeAreaEdge[] = ALL_EDGES, extraPx = 0): CSSProperties {
  const style: CSSProperties = {};
  if (edges.includes('top')) style.paddingTop = safeAreaInset('top', extraPx);
  if (edges.includes('bottom')) style.paddingBottom = safeAreaInset('bottom', extraPx);
  if (edges.includes('left')) style.paddingLeft = safeAreaInset('left', extraPx);
  if (edges.includes('right')) style.paddingRight = safeAreaInset('right', extraPx);
  return style;
}

interface MobileSafeAreaProps {
  children: ReactNode;
  /** Which edges to inset. Defaults to all four. */
  edges?: SafeAreaEdge[];
  /** Fixed px added on top of each inset (e.g. a bar's own base padding). */
  extraPx?: number;
  className?: string;
  /** Caller style is merged AFTER the safe-area padding, so it can override. */
  style?: CSSProperties;
  /** Element to render. Defaults to a div. */
  as?: ElementType;
  'data-testid'?: string;
}

export function MobileSafeArea({
  children,
  edges = ALL_EDGES,
  extraPx = 0,
  className,
  style,
  as: Tag = 'div',
  'data-testid': testId,
}: MobileSafeAreaProps) {
  // createElement (not <Tag>) avoids the polymorphic-JSX inference where a variable of
  // type ElementType collapses children/style to `never` (TS2745).
  return createElement(
    Tag,
    { className, style: { ...safeAreaPadding(edges, extraPx), ...style }, 'data-testid': testId },
    children,
  );
}
