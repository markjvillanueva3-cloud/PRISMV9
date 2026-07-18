/**
 * CheckoutOutcomePage -- the post-Stripe-redirect landing for checkout success
 * and cancel, for BOTH subscription and one-time post-processor purchases.
 *
 * Stripe redirect targets (StripeBillingEngine):
 *   subscription success -> /billing/success?session_id=...
 *   subscription cancel  -> /billing/cancel
 *   post success         -> /post-processor/success
 *   post cancel          -> /post-processor   (the store page; no outcome route)
 *
 * Before this page existed, every one of those landed on a 404 AFTER the user
 * paid -- the worst possible launch UX. On success we clear the module
 * entitlement cache so the next gate read reflects the just-purchased access.
 */
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui';
import { clearEntitlementCache } from '../components/entitlement';

type Outcome = 'success' | 'cancel';
type CheckoutContext = 'subscription' | 'post';

export interface CheckoutOutcomePageProps {
  outcome: Outcome;
  context: CheckoutContext;
}

interface OutcomeCopy {
  tone: 'emerald' | 'slate';
  heading: string;
  body: string;
  primary: { label: string; to: string };
  secondary?: { label: string; to: string };
}

function copyFor(outcome: Outcome, context: CheckoutContext): OutcomeCopy {
  if (outcome === 'success') {
    return context === 'subscription'
      ? {
          tone: 'emerald',
          heading: 'Subscription Active',
          body: 'Your Kienzle plan is now active. Access may take a moment to propagate to every feature.',
          primary: { label: 'Open Kienzle', to: '/dashboard' },
          secondary: { label: 'Manage Subscription', to: '/subscription' },
        }
      : {
          tone: 'emerald',
          heading: 'Purchase Complete',
          body: 'Your post-processor license is ready. Generate controller-ready posts now.',
          primary: { label: 'Open The Post Store', to: '/post-processor-store' },
          secondary: { label: 'Go To Kienzle', to: '/dashboard' },
        };
  }
  // cancel
  return context === 'subscription'
    ? {
        tone: 'slate',
        heading: 'Checkout Canceled',
        body: 'No charge was made. You can choose a plan whenever you are ready.',
        primary: { label: 'View Plans', to: '/pricing' },
        secondary: { label: 'Back To Kienzle', to: '/dashboard' },
      }
    : {
        tone: 'slate',
        heading: 'Checkout Canceled',
        body: 'No charge was made. Your post-processor was not purchased.',
        primary: { label: 'Back To The Post Store', to: '/post-processor-store' },
        secondary: { label: 'Go To Kienzle', to: '/dashboard' },
      };
}

const TONE_RING: Record<OutcomeCopy['tone'], string> = {
  emerald: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  slate: 'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
};

export default function CheckoutOutcomePage({ outcome, context }: CheckoutOutcomePageProps) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const copy = copyFor(outcome, context);
  const secondary = copy.secondary;

  // On a successful checkout the plan/license just changed server-side; clear
  // the module entitlement cache so the next FeatureGate read sees the new plan.
  useEffect(() => {
    if (outcome === 'success') clearEntitlementCache();
  }, [outcome]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-full border ${TONE_RING[copy.tone]}`}>
        {outcome === 'success' ? (
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{copy.heading}</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{copy.body}</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button variant="primary" onClick={() => navigate(copy.primary.to)} className="h-11 md:h-auto">
          {copy.primary.label}
        </Button>
        {secondary && (
          <Button variant="secondary" onClick={() => navigate(secondary.to)} className="h-11 md:h-auto">
            {secondary.label}
          </Button>
        )}
      </div>

      {sessionId && (
        <p className="mt-6 font-mono text-[10px] text-slate-400">Ref: {sessionId}</p>
      )}
    </div>
  );
}
