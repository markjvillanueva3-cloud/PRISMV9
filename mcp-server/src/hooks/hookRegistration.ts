/**
 * PRISM Hook Registration Bridge
 * ================================
 * 
 * Registers all 112 domain hooks with the HookExecutor at startup.
 * This bridges the gap between hook definitions (hooks/*.ts) and
 * the execution engine (engines/HookExecutor.ts).
 * 
 * Without this bridge, domain hooks exist as dead code — defined
 * but never registered, never executed, never protecting anything.
 * 
 * @version 1.0.0
 * @date 2026-02-08
 */

import { hookExecutor } from "../engines/HookExecutor.js";
import { allHooks } from "./index.js";
import { log } from "../utils/Logger.js";

let registered = false;

/**
 * Register all domain hooks with the HookExecutor.
 * Safe to call multiple times — only registers once.
 */
export function registerDomainHooks(): { registered: number; skipped: number; errors: string[] } {
  if (registered) {
    return { registered: 0, skipped: allHooks.length, errors: [] };
  }

  const errors: string[] = [];
  let count = 0;

  for (const hook of allHooks) {
    try {
      hookExecutor.register(hook);
      count++;
    } catch (e: any) {
      errors.push(`Failed to register hook ${hook.id}: ${e.message}`);
      log.warn(`[hookRegistration] Failed to register hook ${hook.id}: ${e.message}`);
    }
  }

  registered = true;
  log.info(`[hookRegistration] Registered ${count}/${allHooks.length} domain hooks with HookExecutor`);
  
  if (errors.length > 0) {
    log.warn(`[hookRegistration] ${errors.length} hooks failed to register`);
  }

  return { registered: count, skipped: 0, errors };
}
