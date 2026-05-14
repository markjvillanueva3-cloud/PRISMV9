import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * SurfaceCrossLink — a thin banner that points users from one Calculator/PPG
 * surface to a sibling surface with a different audience.
 *
 * The PRISM web app has five distinct Calculator + PPG surfaces (see
 * `pages/README.md` for the catalog) that look like duplicates but each have
 * a different feature surface and audience. This banner lets a user on the
 * full Calculator Studio discover the focused "lite" SFC variant, and vice
 * versa — same for the full PPG vs the lite PPG editor — and lets the
 * marketing landing page CTA into the live products.
 *
 * Codex protection rule (`web/CLAUDE.md`): the sibling surfaces are not
 * duplicates and must not be deleted. This banner is the canonical way to
 * surface them to each other's users.
 *
 * Design language: matches the Calculator Studio dark theme — `prism-glow-*`
 * border + `bg-[rgba(2,6,23,0.78)]`. Falls back gracefully on pages that
 * don't yet adopt the Studio CSS (the banner is still readable on a light
 * Tailwind background).
 */
export interface SurfaceCrossLinkProps {
  /** Route path to navigate to (e.g. "/speed-feed-calc"). */
  to: string;
  /** Short label rendered as the CTA — usually the destination's product name. */
  label: string;
  /** One-sentence reason to follow the link (the destination's value prop). */
  note: string;
  /** Visual accent — defaults to cyan; use violet for PPG-side, emerald for marketing. */
  accent?: 'cyan' | 'violet' | 'emerald' | 'amber';
  /** Optional leading icon (emoji or single character). */
  icon?: ReactNode;
  /** Optional className appended to the root for layout tweaks. */
  className?: string;
}

const ACCENT_BORDER: Record<NonNullable<SurfaceCrossLinkProps['accent']>, string> = {
  cyan: 'border-cyan-500/40 hover:border-cyan-400/70 hover:shadow-[0_0_12px_rgba(34,211,238,0.25)]',
  violet: 'border-violet-500/40 hover:border-violet-400/70 hover:shadow-[0_0_12px_rgba(167,139,250,0.25)]',
  emerald: 'border-emerald-500/40 hover:border-emerald-400/70 hover:shadow-[0_0_12px_rgba(52,211,153,0.25)]',
  amber: 'border-amber-500/40 hover:border-amber-400/70 hover:shadow-[0_0_12px_rgba(251,191,36,0.25)]',
};

const ACCENT_TEXT: Record<NonNullable<SurfaceCrossLinkProps['accent']>, string> = {
  cyan: 'text-cyan-300',
  violet: 'text-violet-300',
  emerald: 'text-emerald-300',
  amber: 'text-amber-300',
};

export function SurfaceCrossLink({
  to,
  label,
  note,
  accent = 'cyan',
  icon,
  className,
}: SurfaceCrossLinkProps) {
  const borderCls = ACCENT_BORDER[accent];
  const textCls = ACCENT_TEXT[accent];

  return (
    <Link
      to={to}
      data-testid="surface-cross-link"
      data-target={to}
      className={[
        'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs',
        'transition-all duration-150',
        // Match Calculator Studio dark theme (per web/CLAUDE.md). The hosts that
        // currently render this on a light Tailwind background (PpgPage's
        // bg-slate-50/40 header) will show the dark glass chip intentionally —
        // the chip is a cross-link CTA, not body content; the visual contrast
        // against a light surface is desired.
        'bg-[rgba(2,6,23,0.78)]',
        borderCls,
        // filter(Boolean) below drops the empty className branch; load-bearing
        // for the no-double-whitespace test invariant.
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={note}
      aria-label={`${label} — ${note}`}
    >
      {icon != null && <span aria-hidden className="text-sm leading-none">{icon}</span>}
      <span className={`font-medium ${textCls}`}>{label}</span>
      <span className="text-slate-400">— {note}</span>
      <span aria-hidden className={`ml-1 ${textCls}`}>→</span>
    </Link>
  );
}

export default SurfaceCrossLink;
