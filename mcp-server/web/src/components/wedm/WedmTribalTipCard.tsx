/**
 * WedmTribalTipCard — P2P-FULLSTACK-MS0/U-P2PFS49
 *
 * Presentational card for a top-ranked tribal-knowledge tip returned by
 * the `wedm_tribal_query` action. Renders:
 *
 *   - Tip title + body (body truncation optional via `maxBodyLines`)
 *   - Confidence badge   (0–1, mapped to 4 tiers: low/medium/high/expert)
 *   - Match-score pill   (from the ScoredTip wrapper, when present)
 *   - Category + tag chips
 *   - Source attribution + created-at
 *   - Matched-keywords/tags (why was this tip selected?)
 *   - Optional "Helpful?" feedback buttons (thumbs-up/down → onFeedback)
 *   - Optional "More tips" affordance (onOpenMore)
 *
 * Shape mirrors WEDMTribalRuntimeEngine.ScoredTip. Works with either a
 * bare TribalTip (no match metadata) or a ScoredTip (ranked result).
 */

// ============================================================================
// TYPES (mirror WEDMTribalRuntimeEngine)
// ============================================================================

export interface WedmTribalTip {
  id: string;
  title: string;
  body: string;
  category: string;
  tags: readonly string[];
  operation_types?: readonly string[];
  /** 0–1. */
  confidence: number;
  source: string;
  created_at?: string;
  usage_count?: number;
}

export interface WedmScoredTribalTip {
  tip: WedmTribalTip;
  /** Selection score assigned by the tribal runtime (higher = better match). */
  score: number;
  matchedKeywords: string[];
  matchedTags: string[];
}

export type WedmTribalFeedback = 'helpful' | 'not_helpful';

export type WedmTribalConfidenceTier = 'low' | 'medium' | 'high' | 'expert';

// ============================================================================
// COMPONENT
// ============================================================================

export interface WedmTribalTipCardProps {
  /** Scored tip (with match metadata) — preferred shape. */
  scored?: WedmScoredTribalTip | null;
  /** Bare tip — use when match metadata is not available. */
  tip?: WedmTribalTip | null;
  /** Clamp body to N lines (default: 5; pass 0 to disable clamp). */
  maxBodyLines?: number;
  /** Optional callback when operator marks tip helpful/not helpful. */
  onFeedback?: (tipId: string, feedback: WedmTribalFeedback) => void;
  /** Optional callback to open a "more tips like this" panel. */
  onOpenMore?: () => void;
  /** Compact variant — hides body & source attribution, keeps title+confidence. */
  compact?: boolean;
}

export function WedmTribalTipCard({
  scored,
  tip: bareTip,
  maxBodyLines = 5,
  onFeedback,
  onOpenMore,
  compact = false,
}: WedmTribalTipCardProps) {
  const tip = scored?.tip ?? bareTip;
  if (!tip) {
    return (
      <div
        className="rounded-2xl border border-slate-700/40 bg-slate-900/30 px-4 py-3 text-[11px] text-slate-500"
        role="region"
        aria-label="No tribal tip available"
        data-testid="wedm-tribal-tip-empty"
      >
        No tribal tip found for this context.
      </div>
    );
  }

  const conf = clamp01(tip.confidence);
  const tier = confidenceTier(conf);
  const tone = TIER_TONES[tier];

  return (
    <div
      className={`rounded-2xl border ${tone.border} ${tone.bg} px-4 py-3`}
      role="region"
      aria-label={`Tribal tip: ${tip.title} (confidence ${(conf * 100).toFixed(0)}%, ${tip.category})`}
      data-testid="wedm-tribal-tip-card"
      data-tip-id={tip.id}
      data-confidence-tier={tier}
      data-has-match-metadata={scored ? 'true' : 'false'}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Tribal tip
            <span className={`ml-2 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase text-white ${tone.badge}`}
              data-testid="tribal-category-chip"
            >
              {tip.category}
            </span>
          </div>
          <div className="mt-0.5 text-[13px] font-semibold text-slate-200" data-testid="tribal-tip-title">
            {tip.title}
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded-full ${tone.badge} px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white`}
            data-testid="tribal-confidence-pill"
            data-confidence-pct={Math.round(conf * 100)}
          >
            {tier} · {(conf * 100).toFixed(0)}%
          </span>
          {scored && (
            <span
              className="rounded-full bg-slate-700/70 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-slate-200"
              data-testid="tribal-match-score-pill"
            >
              Match {scored.score.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {!compact && (
        <div
          className="rounded-lg border border-slate-700/40 bg-slate-900/40 p-2 text-[12px] leading-[1.45] text-slate-200"
          style={maxBodyLines > 0 ? clampLinesStyle(maxBodyLines) : undefined}
          data-testid="tribal-tip-body"
        >
          {tip.body}
        </div>
      )}

      {/* Tags row */}
      {tip.tags && tip.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1" data-testid="tribal-tag-row">
          {tip.tags.map((t) => {
            const matched = scored?.matchedTags.includes(t) ?? false;
            return (
              <span
                key={t}
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                  matched
                    ? 'bg-cyan-600 text-white ring-1 ring-cyan-300/60'
                    : 'bg-slate-800 text-slate-400'
                }`}
                data-testid={`tribal-tag-${t}`}
                data-matched={matched ? 'true' : 'false'}
              >
                {t}
              </span>
            );
          })}
        </div>
      )}

      {/* Matched-keyword trace (why this tip was selected) */}
      {scored && scored.matchedKeywords.length > 0 && (
        <div
          className="mt-1.5 text-[10px] uppercase tracking-widest text-slate-500"
          data-testid="tribal-matched-keywords"
        >
          Matched keywords:{' '}
          <span className="font-mono normal-case text-cyan-300">
            {scored.matchedKeywords.join(', ')}
          </span>
        </div>
      )}

      {/* Source attribution + feedback controls */}
      {!compact && (
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-widest text-slate-500">
          <div data-testid="tribal-source-attribution">
            Source:{' '}
            <span className="font-mono normal-case text-slate-300">{tip.source}</span>
            {tip.created_at && (
              <>
                {' '}&middot;{' '}
                <span className="normal-case text-slate-400" data-testid="tribal-created-at">
                  {tip.created_at}
                </span>
              </>
            )}
            {typeof tip.usage_count === 'number' && tip.usage_count > 0 && (
              <>
                {' '}&middot; used{' '}
                <span className="font-mono normal-case text-slate-300">{tip.usage_count}×</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {onFeedback && (
              <>
                <button
                  type="button"
                  onClick={() => onFeedback(tip.id, 'helpful')}
                  className="rounded border border-emerald-600/40 bg-emerald-950/20 px-1.5 py-0.5 text-[10px] normal-case text-emerald-300 hover:bg-emerald-900/40"
                  data-testid="tribal-helpful"
                >
                  👍 helpful
                </button>
                <button
                  type="button"
                  onClick={() => onFeedback(tip.id, 'not_helpful')}
                  className="rounded border border-rose-600/40 bg-rose-950/20 px-1.5 py-0.5 text-[10px] normal-case text-rose-300 hover:bg-rose-900/40"
                  data-testid="tribal-not-helpful"
                >
                  👎 not
                </button>
              </>
            )}
            {onOpenMore && (
              <button
                type="button"
                onClick={onOpenMore}
                className="rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[10px] normal-case text-slate-300 hover:bg-slate-700"
                data-testid="tribal-open-more"
              >
                More&nbsp;&rarr;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function confidenceTier(conf: number): WedmTribalConfidenceTier {
  const c = clamp01(conf);
  if (c >= 0.9) return 'expert';
  if (c >= 0.7) return 'high';
  if (c >= 0.4) return 'medium';
  return 'low';
}

const TIER_TONES: Record<
  WedmTribalConfidenceTier,
  { border: string; bg: string; badge: string }
> = {
  expert: {
    border: 'border-emerald-500/50',
    bg: 'bg-emerald-950/25',
    badge: 'bg-emerald-500',
  },
  high: {
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-950/20',
    badge: 'bg-cyan-500',
  },
  medium: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/20',
    badge: 'bg-amber-500',
  },
  low: {
    border: 'border-slate-700/40',
    bg: 'bg-slate-900/30',
    badge: 'bg-slate-500',
  },
};

function clampLinesStyle(n: number): React.CSSProperties {
  return {
    display: '-webkit-box',
    WebkitLineClamp: n,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  };
}
