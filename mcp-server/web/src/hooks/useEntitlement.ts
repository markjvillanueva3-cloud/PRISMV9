/**
 * useEntitlement -- supplies the signed-in user's live plan + a `can(feature)`
 * predicate built on the pure entitlement rules (lib/entitlement.ts).
 *
 * The plan comes from GET /billing/status (billingApi.getBillingStatus). It is
 * module-cached so N mounted gates do not each refetch; clearEntitlementCache()
 * after a successful checkout/plan change. A failed load leaves the snapshot
 * null, so can() denies by default (never leak a paid feature on a load error).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { billingApi } from '../api/billing';
import { entitlementFor, type Entitlement, type FeatureKey, type PlanId } from '../data/pricing';
import { canUseFeature, resolvePlan } from '../lib/entitlement';

interface PlanSnapshot {
  plan: PlanId;
  authenticated: boolean;
}

let cached: PlanSnapshot | null = null;
let inflight: Promise<PlanSnapshot> | null = null;

/** Under vitest we skip the module cache so each test starts clean. */
function underTest(): boolean {
  const inWorker = typeof globalThis !== 'undefined' && '__vitest_worker__' in globalThis;
  const inProcess = typeof process !== 'undefined' && Boolean(process.env?.VITEST);
  return inWorker || inProcess;
}

async function loadPlan(force: boolean): Promise<PlanSnapshot> {
  if (!force && cached) return cached;
  if (!force && inflight) return inflight;
  const promise = billingApi
    .getBillingStatus()
    .then((status): PlanSnapshot => {
      const snap: PlanSnapshot = {
        plan: resolvePlan(status.plan),
        authenticated: status.authenticated ?? true,
      };
      if (!underTest()) cached = snap;
      return snap;
    })
    .finally(() => {
      inflight = null;
    });
  inflight = promise;
  return promise;
}

/** Clear the module plan cache (call after a successful checkout / plan change). */
export function clearEntitlementCache(): void {
  cached = null;
  inflight = null;
}

export interface UseEntitlement {
  plan: PlanId | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
  can: (feature: FeatureKey) => boolean;
  entitlement: (feature: FeatureKey) => Entitlement | null;
  refresh: () => void;
}

export function useEntitlement(): UseEntitlement {
  const [snapshot, setSnapshot] = useState<PlanSnapshot | null>(cached);
  const [loading, setLoading] = useState<boolean>(cached === null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const run = useCallback((force: boolean) => {
    setLoading(true);
    setError(null);
    loadPlan(force)
      .then((snap) => {
        if (!mounted.current) return;
        setSnapshot(snap);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!mounted.current) return;
        // Deny-by-default: a failed plan load leaves the snapshot null -> can() = false.
        setError(err instanceof Error ? err.message : 'Could not load your plan');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (cached) {
      setSnapshot(cached);
      setLoading(false);
    } else {
      run(false);
    }
    return () => {
      mounted.current = false;
    };
  }, [run]);

  const can = useCallback(
    (feature: FeatureKey) => (snapshot ? canUseFeature(feature, snapshot.plan) : false),
    [snapshot],
  );
  const entitlement = useCallback(
    (feature: FeatureKey): Entitlement | null =>
      snapshot ? entitlementFor(feature, snapshot.plan) : null,
    [snapshot],
  );
  const refresh = useCallback(() => run(true), [run]);

  return {
    plan: snapshot?.plan ?? null,
    authenticated: snapshot?.authenticated ?? false,
    loading,
    error,
    can,
    entitlement,
    refresh,
  };
}
