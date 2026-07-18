/**
 * reactive-chains-boot.ts -- the canonical (and previously MISSING) boot site for
 * the EventBus reactive-chain subsystem. (BACKEND-COMPLETION / U-REACTIVE-CHAINS-BOOT)
 *
 * THE GAP (verified 2026-06-18, slot:zulu). Two modules register EventBus reactive
 * chains + action handlers as a MODULE-LOAD SIDE EFFECT (top-level
 * `eventBus.registerReactiveChain(...)` / `eventBus.registerAction(...)`):
 *   - `reactiveChainBootstrap.ts`  -- 9 chains (job_failure_forensics, ERP job_to_invoice, ...)
 *   - `cycleSchedulingBridge.ts`   -- 3 chains + 4 actions (INTEG-MS3 CycleTime->Capacity->Scheduling)
 * But NOTHING imports either module at runtime (0 importers across the server; `index.ts`
 * loads engines via explicit `await import(...)` and never names these). So the chains
 * never register in production -- the subsystem is built + tested but DORMANT. This module
 * is the missing boot site that `index.ts` calls once after EventBus init.
 *
 * GATED DEFAULT-OFF (deliberate). Several chains AUTO-FIRE consequential downstream
 * actions -- notably `job.completed -> invoice.created`. Whether the off-state was an
 * oversight or intentional could not be determined from the code, so activation is
 * OPT-IN via `PRISM_REACTIVE_CHAINS_ENABLE=1`. With the flag unset this is a strict
 * no-op (preserves the exact pre-existing behavior -- nothing registers, nothing fires).
 * Flipping it on is an operator/owner (bravo/business) decision; see
 * `state/shared/specs/BACKEND-COMPLETION-TRIAGE-2026-06-18.md`.
 *
 * Fail-soft: a registration module that throws on import is recorded in `failed[]` and
 * does not abort the others or the server boot.
 */

import { log } from "../utils/Logger.js";

export const REACTIVE_CHAINS_ENV = "PRISM_REACTIVE_CHAINS_ENABLE";

/**
 * Registration modules whose import triggers EventBus chain/action registration.
 * Order is independent -- each registers on its own EventBus singleton at load.
 * NodeNext: `.js` suffix on the relative specifier (sibling files in engines/).
 */
export const REGISTRATION_MODULES = [
  "./reactiveChainBootstrap.js",
  "./cycleSchedulingBridge.js",
] as const;

/** True only when the subsystem is explicitly enabled (exact "1"). Pure -- no IO. */
export function reactiveChainsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[REACTIVE_CHAINS_ENV] === "1";
}

export interface ReactiveChainsBootResult {
  enabled: boolean;
  loaded: string[];
  failed: Array<{ module: string; error: string }>;
  reason?: string;
}

/**
 * Boot the reactive-chain subsystem. When enabled, side-effect-imports each
 * registration module so its chains/actions register on the EventBus. When
 * disabled (default), returns a no-op result WITHOUT importing anything.
 *
 * @param env       process env (injectable for tests).
 * @param importer  dynamic import fn (injectable for tests -- defaults to native `import`).
 * @returns a result describing which modules loaded / failed / whether it was enabled.
 */
export async function bootReactiveChains({
  env = process.env,
  importer = (m: string): Promise<unknown> => import(m),
}: {
  env?: NodeJS.ProcessEnv;
  importer?: (moduleSpecifier: string) => Promise<unknown>;
} = {}): Promise<ReactiveChainsBootResult> {
  if (!reactiveChainsEnabled(env)) {
    return { enabled: false, loaded: [], failed: [], reason: `${REACTIVE_CHAINS_ENV} != "1" (default-off)` };
  }

  const loaded: string[] = [];
  const failed: Array<{ module: string; error: string }> = [];

  // Sequential + per-module try/catch: a one-time boot of a fixed, tiny module set
  // where each import must fail-soft independently (Promise.all would reject the batch).
  for (const moduleSpecifier of REGISTRATION_MODULES) {
    try {
      await importer(moduleSpecifier);
      loaded.push(moduleSpecifier);
    } catch (e) {
      failed.push({ module: moduleSpecifier, error: String((e as Error)?.message ?? e) });
    }
  }

  log.info(
    `[reactive-chains-boot] ENABLED -- registered ${loaded.length}/${REGISTRATION_MODULES.length} module(s)` +
      (failed.length ? `, ${failed.length} failed: ${failed.map((f) => f.module).join(", ")}` : ""),
  );
  return { enabled: true, loaded, failed };
}
