/**
 * Checkout-intent resolver (QX9 follow-up) -- the revenue-critical plan-selection
 * logic, extracted from PricingPage so it is unit-testable without a DOM render.
 *
 * It returns the side-effect to perform (a redirect href, or an error message)
 * rather than performing it, so the component stays a thin applier:
 *   - free       -> the free Speed/Feed Calculator (no checkout, no login wall)
 *   - enterprise -> sales mailto (no self-serve checkout for the top tier)
 *   - paid       -> a Stripe checkout-session URL via billingApi.createCheckout
 *
 * `createCheckout` is injectable so tests drive the success / no-url / throw paths
 * without a network. Defaults to the real billing client.
 */
import { billingApi, type PostPurchaseType } from '../api/billing';
import { ONE_TIME_PRODUCTS, formatPrice } from '../data/pricing';

export const ENTERPRISE_MAILTO = 'mailto:sales@prism.tools?subject=Kienzle%20Enterprise';

export type CheckoutOutcome =
  | { kind: 'redirect'; href: string }
  | { kind: 'error'; message: string };

export async function resolveCheckout(
  plan: string,
  createCheckout: (plan: string) => Promise<{ url?: string }> = billingApi.createCheckout,
): Promise<CheckoutOutcome> {
  if (plan === 'free') return { kind: 'redirect', href: '/speed-feed-calc' };
  if (plan === 'enterprise') return { kind: 'redirect', href: ENTERPRISE_MAILTO };

  try {
    const { url } = await createCheckout(plan);
    if (url) return { kind: 'redirect', href: url };
    return { kind: 'error', message: 'Checkout could not be started. Please try again.' };
  } catch (e) {
    return { kind: 'error', message: (e as Error).message || 'Checkout failed. Please try again.' };
  }
}

/**
 * Single post-processor controller purchase (monthly / annual / permanent). Same
 * outcome contract as resolveCheckout -- returns the redirect href or an error
 * message so PostProcessorStorePage stays a thin applier. purchasePost is
 * injectable so tests drive success / no-url / throw without a network.
 */
export async function resolvePostPurchase(
  controllerId: string,
  type: PostPurchaseType,
  purchasePost: (
    controllerId: string,
    type: PostPurchaseType,
  ) => Promise<{ url?: string }> = billingApi.purchasePost,
): Promise<CheckoutOutcome> {
  try {
    const { url } = await purchasePost(controllerId, type);
    if (url) return { kind: 'redirect', href: url };
    return { kind: 'error', message: 'Checkout could not be started. Please try again.' };
  } catch (e) {
    return { kind: 'error', message: (e as Error).message || 'Purchase failed. Please try again.' };
  }
}

/**
 * Opens the Stripe billing portal (upgrade / downgrade / cancel / update payment).
 * Same outcome contract; createPortal is injectable for tests. The portal needs a
 * Stripe customerId (a user who completed >=1 checkout) -- if none exists yet the
 * backend returns no url, surfaced as an actionable "not available yet" note.
 */
export async function resolveBillingPortal(
  createPortal: () => Promise<{ url?: string }> = billingApi.createPortal,
): Promise<CheckoutOutcome> {
  try {
    const { url } = await createPortal();
    if (url) return { kind: 'redirect', href: url };
    return { kind: 'error', message: 'Billing portal is not available yet.' };
  } catch (e) {
    return { kind: 'error', message: (e as Error).message || 'Billing portal is not available yet.' };
  }
}

/** A paid (self-serve checkout) plan -- not free, not enterprise. Drives the busy state. */
export function isSelfServeCheckout(plan: string): boolean {
  return plan !== 'free' && plan !== 'enterprise';
}

export type PostBundleId = 'post_bundle_5' | 'post_bundle_all';

/**
 * Post-processor BUNDLES (post_bundle_5 / post_bundle_all) are priced products but
 * are NOT yet wired to self-serve Stripe -- the backend mints only a single
 * post_perpetual, so a self-serve bundle click would MIS-CHARGE the single-post
 * price ($199) instead of the bundle price ($799 / $2499). Until backend bundle
 * checkout lands (echo/papa), route bundle interest to sales at the CORRECT price
 * (mirrors the enterprise contact-sales pattern). Returns the mailto href.
 */
export function bundleSalesMailto(bundleId: PostBundleId): string {
  const product = ONE_TIME_PRODUCTS[bundleId];
  const subject = encodeURIComponent(`Kienzle Post-Processor Bundle: ${product.name}`);
  const body = encodeURIComponent(
    `I would like to purchase the ${product.name} (${formatPrice(product.priceUsd)}). Please send a secure checkout link.`,
  );
  return `mailto:sales@prism.tools?subject=${subject}&body=${body}`;
}
