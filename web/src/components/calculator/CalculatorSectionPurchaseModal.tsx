import type { PurchaseRecommendation } from '../../features/operating-system/contracts';
import type {
  CalculatorSectionCommerceHighlight,
  CalculatorSectionCommerceRecord,
} from '../../utils/calculatorPurchaseRecommendations';

const HIGH_CONTRAST_WHITE_TEXT = {
  WebkitTextStroke: '0.28px rgba(2,6,23,0.92)',
  textShadow: '0 1px 2px rgba(2,6,23,0.96), 0 0 1px rgba(2,6,23,0.9)',
} as const;

export interface CalculatorSectionPurchaseModalView {
  title: string;
  eyebrow: string;
  summary: string;
  sourceLabel: string;
  recommendations: PurchaseRecommendation[];
  highlights: CalculatorSectionCommerceHighlight[];
  relatedRecords?: CalculatorSectionCommerceRecord[];
  notes?: string[];
}

export function CalculatorSectionPurchaseModal({
  view,
  onClose,
  onInspectRecommendation,
}: {
  view: CalculatorSectionPurchaseModalView | null;
  onClose: () => void;
  onInspectRecommendation: (recommendation: PurchaseRecommendation) => void;
}) {
  if (!view) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#010407] px-4 py-6 md:py-10"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${view.title} buy options`}
        className="max-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-[#041019] shadow-[0_32px_120px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-cyan-500/12 bg-[linear-gradient(135deg,#071726_0%,#081a2c_45%,#0c2438_100%)] px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-100">
                  {view.eyebrow}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                  {view.sourceLabel}
                </span>
              </div>
              <div className="mt-3 text-2xl font-semibold text-slate-50" style={HIGH_CONTRAST_WHITE_TEXT}>{view.title}</div>
              <div className="mt-3 text-sm leading-6 text-slate-300">{view.summary}</div>
            </div>
            <button
              type="button"
              aria-label="Close section buy options"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-15rem)] overflow-y-auto px-5 py-5">
          <div className="grid gap-3 lg:grid-cols-3">
            {view.highlights.map((highlight) => (
              <div key={highlight.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{highlight.label}</div>
                <div className="mt-2 text-lg font-semibold text-slate-50" style={HIGH_CONTRAST_WHITE_TEXT}>{highlight.value}</div>
                <div className="mt-2 text-sm leading-6 text-slate-400">{highlight.detail}</div>
              </div>
            ))}
          </div>

          {view.relatedRecords?.length ? (
            <div className="mt-5 rounded-[24px] border border-white/8 bg-black/15 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Database-backed context</div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {view.relatedRecords.map((record) => (
                  <div key={record.id} className="rounded-[18px] border border-white/8 bg-slate-950/45 px-3 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-100" style={HIGH_CONTRAST_WHITE_TEXT}>{record.label}</div>
                      {record.badge ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                          {record.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-400">{record.detail}</div>
                    {record.note ? <div className="mt-2 text-xs leading-5 text-slate-500">{record.note}</div> : null}
                    {record.priceLabel ? <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">{record.priceLabel}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {view.notes?.length ? (
            <div className="mt-5 rounded-[24px] border border-cyan-300/12 bg-cyan-300/[0.05] px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/70">How to read the ranking</div>
              <div className="mt-3 grid gap-2">
                {view.notes.map((note) => (
                  <div key={note} className="text-sm leading-6 text-slate-300">
                    {note}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {view.recommendations.map((recommendation) => (
              <div key={recommendation.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full border border-cyan-300/24 bg-cyan-300/[0.10] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100">
                    {recommendation.category}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                    {recommendation.distributors.length} sources
                  </span>
                </div>
                <div className="mt-3 text-lg font-semibold text-slate-50" style={HIGH_CONTRAST_WHITE_TEXT}>{recommendation.title}</div>
                <div className="mt-3 text-sm leading-6 text-slate-300">{recommendation.detail}</div>
                <div className="mt-4 grid gap-2">
                  <div className="rounded-[18px] border border-white/8 bg-slate-950/45 px-3 py-3 text-sm text-slate-200">
                    <span className="font-semibold text-slate-50">Estimated price:</span> {recommendation.estimatedPrice}
                  </div>
                  <div className="rounded-[18px] border border-white/8 bg-slate-950/45 px-3 py-3 text-sm text-slate-200">
                    <span className="font-semibold text-slate-50">ROI:</span> {recommendation.roiStrength}
                  </div>
                  <div className="rounded-[18px] border border-white/8 bg-slate-950/45 px-3 py-3 text-sm text-slate-200">
                    <span className="font-semibold text-slate-50">Payback:</span> {recommendation.payback}
                  </div>
                </div>
                <div className="mt-4 text-sm leading-6 text-slate-400">
                  <span className="font-semibold text-cyan-100">Why now:</span> {recommendation.whyNow}
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    aria-label={`View vendors for ${recommendation.title}`}
                    onClick={() => onInspectRecommendation(recommendation)}
                    className="inline-flex rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                  >
                    View vendors
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
