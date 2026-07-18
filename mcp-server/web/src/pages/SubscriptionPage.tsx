import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { billingApi, type BillingStatusResult } from '../api/billing';
import { resolveBillingPortal } from '../lib/checkout';
import { PLAN_TIERS, type PlanId } from '../data/pricing';

/**
 * Subscription management (protected). Shows the user's current plan from
 * getBillingStatus() and opens the Stripe billing portal to upgrade/cancel.
 *
 * KNOWN BACKEND GAP (handoff -> papa, U-COMM-02b): POST /portal requires a Stripe
 * customerId, but GET /status does not return one. Until the backend resolves the
 * customer from the authenticated session, "Manage billing" surfaces the backend
 * error honestly rather than pretending it worked (R12).
 */
export default function SubscriptionPage() {
  const [status, setStatus] = useState<BillingStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const s = await billingApi.getBillingStatus();
        if (!cancelled) setStatus(s);
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Could not load subscription status.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onManage = useCallback(async () => {
    if (!status) return;
    setPortalBusy(true);
    setPortalError(null);
    try {
      // U-COMM-02b: the backend resolves the Stripe customerId from the session.
      // Portal logic + error mapping live in the tested resolveBillingPortal helper.
      const outcome = await resolveBillingPortal();
      if (outcome.kind === 'redirect') window.location.href = outcome.href;
      else setPortalError(outcome.message);
    } finally {
      setPortalBusy(false);
    }
  }, [status]);

  const planId = (status?.plan ?? 'free') as PlanId;
  const tier = PLAN_TIERS[planId] ?? PLAN_TIERS.free;

  return (
    <div className="min-h-screen bg-[#0f1014] text-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-mono text-2xl font-bold text-slate-100">Your subscription</h1>

        {loading && (
          <div className="mt-6 animate-pulse rounded-xl border border-white/10 bg-[rgba(2,6,23,0.6)] p-6">
            <div className="h-5 w-32 rounded bg-white/10" />
            <div className="mt-3 h-8 w-24 rounded bg-white/10" />
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && status && (
          <>
            <section className="mt-6 rounded-xl border border-white/10 bg-[rgba(2,6,23,0.78)] p-6">
              <p className="text-xs uppercase tracking-wide text-slate-500">Current plan</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-semibold text-slate-100">{tier.name}</span>
                <span className="font-mono text-sm text-slate-400">
                  {tier.monthlyUsd === 0 ? 'Free' : `$${tier.monthlyUsd}/mo`}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{tier.tagline}</p>
              <p className="mt-3 text-xs text-slate-500">
                Role: <span className="text-slate-300">{status.role}</span>
              </p>
            </section>

            {portalError && (
              <div role="alert" className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {portalError}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/pricing"
                className="flex h-11 items-center justify-center rounded-lg bg-cyan-500 px-5 text-sm font-semibold text-slate-900 transition-colors hover:bg-cyan-400"
              >
                {planId === 'free' ? 'Choose a plan' : 'Change plan'}
              </Link>
              {planId !== 'free' && (
                <button
                  type="button"
                  onClick={onManage}
                  disabled={portalBusy}
                  className="flex h-11 items-center justify-center rounded-lg border border-white/15 px-5 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/5 disabled:opacity-60"
                >
                  {portalBusy ? 'Opening...' : 'Manage billing & payment'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
