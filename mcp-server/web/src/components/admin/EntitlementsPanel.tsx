import { useCallback, useState } from "react";
import { Card, Button, Spinner, Badge } from "../ui";
import { useAdminEntitlements, useAdminSetEntitlement } from "../../hooks/useAdmin";
import { ENFORCEABLE_FEATURES } from "../../types/admin";

/**
 * Per-seat entitlement administration (Q6, FE for U-COMM-05).
 *
 * A shop admin sees each user's effective plan + per-feature overrides and can
 * REVOKE a feature below the plan ceiling (toggle off) or restore it (toggle on).
 * Only ENFORCEABLE_FEATURES are offered -- the backend 400s any other key, so the
 * UI can never present a revoke that would silently no-op.
 *
 * State model (fixes Q6 scrutiny arm-C P1s):
 *  - A successful toggle merges the backend's authoritative override map for that
 *    user into a local `patches` overlay rather than triggering a destructive full
 *    refetch. `useGetCall.execute` nulls `data` on entry, so a refetch would tear
 *    the whole grid down mid-flight -- and a refetch that then failed would wipe a
 *    mutation that actually succeeded. The overlay keeps the grid stable and shows
 *    the server-confirmed result. "Load Entitlements" clears the overlay (a fresh
 *    authoritative list supersedes it).
 *  - All toggle buttons are disabled while any one mutation is in flight. The shared
 *    useApiCall AbortController aborts an earlier in-flight write when a second fires;
 *    serializing avoids that silent lost-update entirely.
 */
export default function EntitlementsPanel() {
  const list = useAdminEntitlements();
  const setOne = useAdminSetEntitlement();
  // featureKey being mutated, keyed "userId::feature", for per-cell busy state
  const [busyKey, setBusyKey] = useState<string | null>(null);
  // local overlay of server-confirmed override maps, keyed by userId, applied on
  // top of list.data so a successful toggle never needs a destructive refetch
  const [patches, setPatches] = useState<Record<string, Record<string, boolean>>>({});

  const toggle = useCallback(
    async (userId: string, feature: string, currentlyDenied: boolean) => {
      setBusyKey(`${userId}::${feature}`);
      // currentlyDenied -> grant (true); currently allowed -> revoke (false)
      const result = await setOne.execute({ userId, feature, granted: currentlyDenied });
      setBusyKey(null);
      // On success the backend returns the user's full authoritative override map;
      // merge it into the local overlay instead of refetching the whole grid.
      if (result) {
        setPatches((prev) => ({ ...prev, [userId]: result.overrides }));
      }
    },
    [setOne],
  );

  const reload = useCallback(async () => {
    setPatches({}); // a fresh authoritative list supersedes the local overlay
    await list.execute();
  }, [list]);

  const anyBusy = busyKey !== null;

  return (
    <div>
      <div className="mb-4">
        <Button onClick={reload}>Load Entitlements</Button>
      </div>

      {list.loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}
      {list.error && <p className="text-sm text-red-600 dark:text-red-400">{list.error}</p>}
      {setOne.error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{setOne.error}</p>}

      {list.data && list.data.users.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-500">
          No users with a subscription or override yet.
        </p>
      )}

      {list.data && list.data.users.length > 0 && (
        <Card title={`Per-seat entitlements (${list.data.count} users)`}>
          <p className="mb-3 text-xs text-slate-500">
            Toggle a feature off to revoke it for that user (within their plan).
            Only enforceable features are shown.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">User</th>
                  <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Plan</th>
                  {ENFORCEABLE_FEATURES.map((f) => (
                    <th key={f.key} className="px-2 py-2 text-center text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.data.users.map((u) => {
                  // local overlay (server-confirmed) wins over the loaded row
                  const effOverrides = patches[u.userId] ?? u.overrides;
                  return (
                    <tr key={u.userId} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">{u.userId}</td>
                      <td className="px-3 py-2">
                        <Badge color={u.effectivePlan === "free" ? "slate" : "blue"}>{u.effectivePlan}</Badge>
                        {u.effectivePlan !== u.plan && (
                          <span className="ml-1 text-[10px] text-amber-500" title={`subscription plan ${u.plan}, status ${u.status}`}>
                            ({u.plan}/{u.status})
                          </span>
                        )}
                      </td>
                      {ENFORCEABLE_FEATURES.map((f) => {
                        const denied = effOverrides[f.key] === false;
                        const cellKey = `${u.userId}::${f.key}`;
                        const busy = busyKey === cellKey;
                        return (
                          <td key={f.key} className="px-2 py-2 text-center">
                            <button
                              type="button"
                              disabled={anyBusy}
                              aria-pressed={!denied}
                              aria-label={`${f.label} for ${u.userId}: ${denied ? "revoked" : "allowed"}`}
                              onClick={() => toggle(u.userId, f.key, denied)}
                              title={denied ? "Revoked -- click to restore" : "Allowed -- click to revoke"}
                              className={`h-7 w-7 rounded text-xs font-semibold transition-colors disabled:opacity-50 ${
                                denied
                                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                  : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                              }`}
                            >
                              {busy ? "..." : denied ? "off" : "on"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
