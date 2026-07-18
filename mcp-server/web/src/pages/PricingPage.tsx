import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PLAN_ORDER,
  PLAN_TIERS,
  ONE_TIME_PRODUCTS,
  ENTITLEMENT_MATRIX,
  FEATURE_LABELS,
  FEATURE_NOT_YET_LIVE,
  matrixCellToken,
  formatPrice,
  type PlanId,
  type FeatureKey,
} from '../data/pricing';
import { resolveCheckout, isSelfServeCheckout } from '../lib/checkout';

/**
 * Public pricing page (no auth). Renders the canonical pricing registry
 * (src/data/pricing.ts == state/shared/specs/PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md).
 *
 * Subscription CTAs start a Stripe checkout (createCheckout). One-time products
 * route to the product surface where the purchase completes (single-post:
 * /post-processor; SFC perpetual: gated on U-COMM-08 license keys -> labelled).
 *
 * Design: PRISM dark, monospace numerics, token-referenced classes, 44pt taps,
 * tier cards = the mobile view; the comparison matrix is md+ only.
 */

const CYCLE_LABEL: Record<'monthly' | 'annual', string> = {
  monthly: 'Monthly',
  annual: 'Annual (2 months free)',
};

const ONE_TIME_ORDER = ['sfc_perpetual', 'post_perpetual', 'post_bundle_5', 'post_bundle_all'];

// Inline marks keep the file ASCII-clean (ascii-guard) while still showing icons.
function CellMark({ token }: { token: string }) {
  if (token === 'Included') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-label="Included" role="img" className="text-emerald-400">
        <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (token === '-') {
    return <span className="text-slate-600" aria-label="Not included">&ndash;</span>;
  }
  if (token === 'Soon') {
    // A plan WOULD include this feature, but it is not-yet-live: show the same
    // "coming soon" pill as the feature label so the cell never reads as live.
    return (
      <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-300" aria-label="Coming soon">
        Soon
      </span>
    );
  }
  return <span className="font-mono text-xs text-amber-300">{token}</span>;
}

export default function PricingPage() {
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('annual');
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubscribe = useCallback(async (plan: PlanId) => {
    setError(null);
    // Checkout logic lives in the tested resolveCheckout() helper; the page is a
    // thin applier of its outcome (redirect href | error message). Busy state is
    // only meaningful for a self-serve (paid) checkout that hits the network.
    const selfServe = isSelfServeCheckout(plan);
    if (selfServe) setBusyPlan(plan);
    try {
      const outcome = await resolveCheckout(plan);
      if (outcome.kind === 'redirect') window.location.href = outcome.href;
      else setError(outcome.message);
    } finally {
      if (selfServe) setBusyPlan(null);
    }
  }, []);

  const featureKeys = Object.keys(ENTITLEMENT_MATRIX) as FeatureKey[];

  return (
    <div className="min-h-screen bg-[#0f1014] text-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 md:text-3xl [font-family:var(--font-display)]">
            Kienzle Pricing
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Manufacturing intelligence for CNC shops. Subscribe monthly or annually, or buy the
            Speed/Feed Calculator and a single post-processor outright.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {/* Cycle toggle */}
        <div className="mb-8 inline-flex rounded-lg border border-white/10 bg-[rgba(2,6,23,0.6)] p-1">
          {(['monthly', 'annual'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={`h-11 rounded-md px-4 text-sm font-medium transition-colors md:h-9 ${
                cycle === c ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {CYCLE_LABEL[c]}
            </button>
          ))}
        </div>

        {/* Tier cards (also the mobile comparison view) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PLAN_ORDER.map((id) => {
            const t = PLAN_TIERS[id];
            const price = cycle === 'monthly' ? t.monthlyUsd : t.annualUsd;
            const suffix = price === 0 ? '' : cycle === 'monthly' ? '/mo' : '/yr';
            return (
              <section
                key={id}
                className={`flex flex-col rounded-xl border bg-[rgba(2,6,23,0.78)] p-5 ${
                  t.featured ? 'border-cyan-400/50 prism-glow-cyan' : 'border-white/10'
                }`}
              >
                {t.featured && (
                  <span className="mb-2 inline-block w-fit rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-200">
                    Most popular
                  </span>
                )}
                <h2 className="text-lg font-semibold text-slate-100">{t.name}</h2>
                <p className="mt-1 min-h-[2.5rem] text-xs text-slate-400">{t.tagline}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-bold text-slate-100">{formatPrice(price)}</span>
                  <span className="text-sm text-slate-500">{suffix}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onSubscribe(id)}
                  disabled={busyPlan === id}
                  className={`mt-4 h-11 rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-60 ${
                    t.featured
                      ? 'bg-cyan-500 text-slate-900 hover:bg-cyan-400'
                      : 'border border-white/15 text-slate-100 hover:bg-white/5'
                  }`}
                >
                  {busyPlan === id
                    ? 'Starting...'
                    : id === 'free'
                      ? 'Start free'
                      : id === 'enterprise'
                        ? 'Contact sales'
                        : 'Subscribe'}
                </button>
                <ul className="mt-4 space-y-2 text-xs text-slate-300">
                  {t.highlights.map((h) => (
                    <li key={h} className="flex gap-2">
                      <span className="mt-0.5 text-emerald-400">+</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        {/* One-time / perpetual */}
        <h2 className="mb-4 mt-12 font-mono text-xl font-bold text-slate-100">Buy it once</h2>
        <p className="mb-4 max-w-2xl text-sm text-slate-400">
          Prefer a perpetual license? The Speed/Feed Calculator and a single post-processor are
          available as one-time purchases. One-time buyers get account credit toward a subscription
          if they upgrade.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ONE_TIME_ORDER.map((key) => {
            const p = ONE_TIME_PRODUCTS[key];
            if (!p) return null;
            const isPost = key.startsWith('post');
            return (
              <section key={key} className="flex flex-col rounded-xl border border-white/10 bg-[rgba(2,6,23,0.78)] p-5">
                <h3 className="text-sm font-semibold text-slate-100">{p.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-bold text-slate-100">{formatPrice(p.priceUsd)}</span>
                  {p.unit && <span className="text-xs text-slate-500">{p.unit}</span>}
                </div>
                {p.updatesUsd != null && (
                  <p className="mt-1 text-[11px] text-slate-500">+{formatPrice(p.updatesUsd)}/yr updates after year 1</p>
                )}
                <p className="mt-2 flex-1 text-xs text-slate-400">{p.notes}</p>
                {isPost ? (
                  <Link
                    to="/post-processor"
                    className="mt-4 flex h-11 items-center justify-center rounded-lg border border-white/15 px-4 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/5"
                  >
                    Choose a controller
                  </Link>
                ) : (
                  <span className="mt-4 flex h-11 items-center justify-center rounded-lg border border-white/10 px-4 text-xs font-medium text-slate-500">
                    Perpetual license at launch
                  </span>
                )}
              </section>
            );
          })}
        </div>

        {/* Feature comparison matrix (md+; cards above are the mobile view) */}
        <h2 className="mb-4 mt-12 font-mono text-xl font-bold text-slate-100">Compare every feature</h2>
        <p className="mb-4 text-xs text-slate-500">
          A shop admin can grant or revoke any feature per user within a plan&apos;s ceiling.
        </p>
        <div className="hidden overflow-hidden rounded-xl border border-white/10 md:block">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[rgba(2,6,23,0.9)]">
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Feature</th>
                {PLAN_ORDER.map((id) => (
                  <th key={id} className="px-3 py-3 text-center font-semibold text-slate-300">
                    {PLAN_TIERS[id].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureKeys.map((fk, i) => (
                <tr key={fk} className={i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}>
                  <td className="px-4 py-2.5 text-left text-slate-300">
                    {FEATURE_LABELS[fk]}
                    {FEATURE_NOT_YET_LIVE[fk] && (
                      <span className="ml-2 rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-300">
                        {FEATURE_NOT_YET_LIVE[fk]}
                      </span>
                    )}
                  </td>
                  {PLAN_ORDER.map((id) => (
                    <td key={id} className="px-3 py-2.5 text-center">
                      <span className="inline-flex justify-center">
                        <CellMark token={matrixCellToken(fk, id)} />
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-8 text-center text-xs text-slate-600">
          Questions about a plan?{' '}
          <a href="mailto:sales@prism.tools" className="text-cyan-400 hover:underline">
            Talk to us
          </a>
          .
        </p>
      </div>
    </div>
  );
}
