/**
 * Compute which post-processor controllers a user already owns, from their
 * perpetual licenses (GET /billing/licenses) + plan. Mirrors the backend's
 * per-controller ownership check (LicenseStore.hasPostLicense: active +
 * post_perpetual + scope === controllerId):
 *   - each active post_perpetual license => the single controller in its scope;
 *   - enterprise plan => ALL controllers owned.
 * FORWARD-DEP: the post_bundle_all branch is wired but DORMANT -- the backend
 * does not mint bundle licenses yet (deferred BE-side; LicenseStore mints only
 * sfc_perpetual / post_perpetual). When BE bundle issuance lands it must emit
 * product "post_bundle_all" for this to light up. Until then allOwned comes
 * only from the enterprise plan.
 * Pure + testable -- the store page renders "Owned" instead of "Buy" off this.
 */
import type { LicenseSummary } from '../api/billing';

export interface PostOwnership {
  /** Every controller is owned (enterprise plan or an all-controllers bundle). */
  allOwned: boolean;
  /** Controller ids owned via a single-controller perpetual license. */
  owned: ReadonlySet<string>;
}

export function computePostOwnership(
  licenses: readonly LicenseSummary[],
  plan: string | null,
): PostOwnership {
  const active = licenses.filter((l) => l.status === 'active');
  const allOwned =
    plan === 'enterprise' || active.some((l) => l.product === 'post_bundle_all');
  const owned = new Set<string>();
  for (const license of active) {
    if (license.product === 'post_perpetual' && license.scope) {
      owned.add(license.scope);
    }
  }
  return { allOwned, owned };
}

/** Is a specific controller owned (per-controller license or an all-owned grant)? */
export function ownsController(ownership: PostOwnership, controllerId: string): boolean {
  return ownership.allOwned || ownership.owned.has(controllerId);
}
