import type { PurchaseRecommendation } from '../../features/operating-system/contracts';
import { StatusPill } from '../workspace/WorkspacePrimitives';

function offerTone(scope: 'nationwide' | 'local' | 'manufacturer') {
  if (scope === 'local') return 'emerald' as const;
  if (scope === 'manufacturer') return 'violet' as const;
  return 'sky' as const;
}

const HIGH_CONTRAST_WHITE_TEXT = {
  WebkitTextStroke: '0.28px rgba(2,6,23,0.92)',
  textShadow: '0 1px 2px rgba(2,6,23,0.96), 0 0 1px rgba(2,6,23,0.9)',
} as const;

function vendorTheme(name: string) {
  const key = name.toLowerCase();

  if (key.includes('mcmaster')) {
    return {
      border: 'rgba(110, 180, 86, 0.38)',
      surface: 'linear-gradient(135deg, rgba(33,61,28,0.96) 0%, rgba(14,28,21,0.98) 100%)',
      card: 'rgba(24, 42, 28, 0.92)',
      button: 'linear-gradient(135deg, #4f8a3f 0%, #2f5d28 100%)',
      glow: '0 0 24px rgba(110, 180, 86, 0.28)',
    };
  }
  if (key.includes('grainger')) {
    return {
      border: 'rgba(245, 116, 53, 0.42)',
      surface: 'linear-gradient(135deg, rgba(76,29,13,0.96) 0%, rgba(31,17,12,0.98) 100%)',
      card: 'rgba(53, 24, 17, 0.92)',
      button: 'linear-gradient(135deg, #c84f1d 0%, #8b2f12 100%)',
      glow: '0 0 24px rgba(234, 88, 12, 0.28)',
    };
  }
  if (key.includes('fastenal')) {
    return {
      border: 'rgba(250, 204, 21, 0.36)',
      surface: 'linear-gradient(135deg, rgba(43,54,14,0.96) 0%, rgba(24,24,14,0.98) 100%)',
      card: 'rgba(41, 38, 16, 0.92)',
      button: 'linear-gradient(135deg, #b38a00 0%, #6f5200 100%)',
      glow: '0 0 24px rgba(234, 179, 8, 0.25)',
    };
  }
  if (key.includes('haimer')) {
    return {
      border: 'rgba(239, 68, 68, 0.4)',
      surface: 'linear-gradient(135deg, rgba(70,18,18,0.96) 0%, rgba(25,14,18,0.98) 100%)',
      card: 'rgba(49, 20, 24, 0.92)',
      button: 'linear-gradient(135deg, #c63b3b 0%, #771d1d 100%)',
      glow: '0 0 24px rgba(239, 68, 68, 0.24)',
    };
  }
  if (key.includes('big daishowa') || key.includes('big ') || key.includes('big+')) {
    return {
      border: 'rgba(96, 165, 250, 0.38)',
      surface: 'linear-gradient(135deg, rgba(13,40,72,0.96) 0%, rgba(16,20,32,0.98) 100%)',
      card: 'rgba(16, 33, 54, 0.92)',
      button: 'linear-gradient(135deg, #1f6fb6 0%, #153f73 100%)',
      glow: '0 0 24px rgba(59, 130, 246, 0.24)',
    };
  }
  if (key.includes('sandvik')) {
    return {
      border: 'rgba(250, 204, 21, 0.36)',
      surface: 'linear-gradient(135deg, rgba(48,42,12,0.96) 0%, rgba(20,18,12,0.98) 100%)',
      card: 'rgba(42, 35, 14, 0.92)',
      button: 'linear-gradient(135deg, #b69100 0%, #705c00 100%)',
      glow: '0 0 24px rgba(234, 179, 8, 0.24)',
    };
  }
  if (key.includes('seco')) {
    return {
      border: 'rgba(163, 230, 53, 0.34)',
      surface: 'linear-gradient(135deg, rgba(30,50,14,0.96) 0%, rgba(14,25,17,0.98) 100%)',
      card: 'rgba(28, 43, 18, 0.92)',
      button: 'linear-gradient(135deg, #6b9d16 0%, #44620e 100%)',
      glow: '0 0 24px rgba(132, 204, 22, 0.22)',
    };
  }
  if (key.includes('walter')) {
    return {
      border: 'rgba(251, 191, 36, 0.34)',
      surface: 'linear-gradient(135deg, rgba(66,44,12,0.96) 0%, rgba(24,19,14,0.98) 100%)',
      card: 'rgba(45, 33, 15, 0.92)',
      button: 'linear-gradient(135deg, #d18a13 0%, #8a5a0c 100%)',
      glow: '0 0 24px rgba(245, 158, 11, 0.22)',
    };
  }
  if (key.includes('jergens')) {
    return {
      border: 'rgba(248, 113, 113, 0.36)',
      surface: 'linear-gradient(135deg, rgba(77,19,26,0.96) 0%, rgba(25,13,18,0.98) 100%)',
      card: 'rgba(51, 19, 24, 0.92)',
      button: 'linear-gradient(135deg, #b8344a 0%, #6f1727 100%)',
      glow: '0 0 24px rgba(225, 29, 72, 0.22)',
    };
  }
  if (key.includes('5th axis')) {
    return {
      border: 'rgba(251, 146, 60, 0.36)',
      surface: 'linear-gradient(135deg, rgba(69,31,14,0.96) 0%, rgba(24,15,12,0.98) 100%)',
      card: 'rgba(50, 24, 17, 0.92)',
      button: 'linear-gradient(135deg, #d3681c 0%, #8d3f10 100%)',
      glow: '0 0 24px rgba(249, 115, 22, 0.22)',
    };
  }
  if (key.includes('chick')) {
    return {
      border: 'rgba(248, 113, 113, 0.34)',
      surface: 'linear-gradient(135deg, rgba(66,18,18,0.96) 0%, rgba(22,14,14,0.98) 100%)',
      card: 'rgba(44, 18, 18, 0.92)',
      button: 'linear-gradient(135deg, #b64242 0%, #6c2020 100%)',
      glow: '0 0 24px rgba(239, 68, 68, 0.2)',
    };
  }
  if (key.includes('lang')) {
    return {
      border: 'rgba(147, 197, 253, 0.34)',
      surface: 'linear-gradient(135deg, rgba(17,39,71,0.96) 0%, rgba(14,18,29,0.98) 100%)',
      card: 'rgba(19, 33, 51, 0.92)',
      button: 'linear-gradient(135deg, #2f69a3 0%, #1d3d66 100%)',
      glow: '0 0 24px rgba(96, 165, 250, 0.2)',
    };
  }
  if (key.includes('blaser')) {
    return {
      border: 'rgba(147, 197, 253, 0.34)',
      surface: 'linear-gradient(135deg, rgba(14,36,74,0.96) 0%, rgba(12,17,30,0.98) 100%)',
      card: 'rgba(17, 31, 54, 0.92)',
      button: 'linear-gradient(135deg, #2a73bb 0%, #164472 100%)',
      glow: '0 0 24px rgba(59, 130, 246, 0.2)',
    };
  }
  if (key.includes('qualichem') || key.includes('master fluid') || key.includes('houghton')) {
    return {
      border: 'rgba(45, 212, 191, 0.34)',
      surface: 'linear-gradient(135deg, rgba(12,54,51,0.96) 0%, rgba(12,19,24,0.98) 100%)',
      card: 'rgba(16, 43, 42, 0.92)',
      button: 'linear-gradient(135deg, #14897b 0%, #0f5a51 100%)',
      glow: '0 0 24px rgba(20, 184, 166, 0.2)',
    };
  }
  if (key.includes('ryerson') || key.includes('alro') || key.includes('tw metals') || key.includes('continental steel') || key.includes('precision marshall') || key.includes('diehl') || key.includes('howard precision') || key.includes('online metals')) {
    return {
      border: 'rgba(125, 211, 252, 0.34)',
      surface: 'linear-gradient(135deg, rgba(10,44,67,0.96) 0%, rgba(11,19,32,0.98) 100%)',
      card: 'rgba(16, 34, 52, 0.92)',
      button: 'linear-gradient(135deg, #1f75aa 0%, #154866 100%)',
      glow: '0 0 24px rgba(56, 189, 248, 0.2)',
    };
  }

  return {
    border: 'rgba(103, 232, 249, 0.26)',
    surface: 'linear-gradient(135deg, rgba(12,29,46,0.96) 0%, rgba(11,18,28,0.98) 100%)',
    card: 'rgba(17, 31, 46, 0.92)',
    button: 'linear-gradient(135deg, #0f7c9c 0%, #164863 100%)',
    glow: '0 0 22px rgba(34, 211, 238, 0.18)',
  };
}

export function PurchaseRecommendationModal({
  recommendation,
  onClose,
}: {
  recommendation: PurchaseRecommendation | null;
  onClose: () => void;
}) {
  if (!recommendation) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#020508]/82 px-4 py-6 backdrop-blur-sm md:py-10"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${recommendation.title} purchase options`}
        className="max-h-[calc(100vh-3rem)] w-full max-w-4xl overflow-hidden rounded-[30px] border border-white/10 bg-[#050b10]/98 shadow-[0_32px_120px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-cyan-500/10 px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/72">
                {recommendation.category}
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-50">{recommendation.title}</div>
              <div className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{recommendation.detail}</div>
            </div>
            <button
              type="button"
              aria-label="Close purchase options"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Estimated price</div>
              <div className="mt-2 text-lg font-semibold text-slate-50">{recommendation.estimatedPrice}</div>
            </div>
            <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">ROI strength</div>
              <div className="mt-2 text-lg font-semibold text-slate-50">{recommendation.roiStrength}</div>
            </div>
            <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Payback</div>
              <div className="mt-2 text-lg font-semibold text-slate-50">{recommendation.payback}</div>
            </div>
          </div>
        </div>

        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto px-5 py-5">
          <div className="rounded-[22px] border border-cyan-300/12 bg-cyan-300/[0.05] px-4 py-4 text-sm leading-6 text-slate-300">
            <span className="font-semibold text-cyan-100">Why now:</span> {recommendation.whyNow}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {recommendation.distributors.map((offer) => {
              const theme = vendorTheme(offer.name);
              return (
              <div
                key={offer.id}
                className="rounded-[22px] border px-4 py-4"
                style={{
                  borderColor: theme.border,
                  background: theme.surface,
                  boxShadow: theme.glow,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-100" style={HIGH_CONTRAST_WHITE_TEXT}>{offer.name}</div>
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {offer.locationLabel}
                    </div>
                  </div>
                  <StatusPill label={offer.scope} tone={offerTone(offer.scope)} />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div
                    className="rounded-[18px] border px-3 py-3"
                    style={{ borderColor: theme.border, backgroundColor: theme.card }}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Price posture</div>
                    <div className="mt-2 text-sm font-semibold text-slate-100" style={HIGH_CONTRAST_WHITE_TEXT}>{offer.priceLabel}</div>
                  </div>
                  <div
                    className="rounded-[18px] border px-3 py-3"
                    style={{ borderColor: theme.border, backgroundColor: theme.card }}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Delivery</div>
                    <div className="mt-2 text-sm font-semibold text-slate-100" style={HIGH_CONTRAST_WHITE_TEXT}>{offer.etaLabel}</div>
                  </div>
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-400">{offer.note}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={offer.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-2xl px-4 py-2 text-sm font-semibold text-white transition"
                    style={{
                      background: theme.button,
                      border: `1px solid ${theme.border}`,
                      boxShadow: theme.glow,
                      ...HIGH_CONTRAST_WHITE_TEXT,
                    }}
                  >
                    Buy from {offer.name}
                  </a>
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>
    </div>
  );
}
