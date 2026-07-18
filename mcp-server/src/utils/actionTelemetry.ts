/**
 * Action Telemetry Utility
 * ========================
 * Shared latency logging for all PRISM dispatchers.
 * Appends JSONL entries to ~/.prism/telemetry/action-latency.jsonl.
 * Never throws — telemetry failures are silently swallowed.
 *
 * @version 1.0.0
 */

import { appendFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";

const TELEMETRY_DIR = join(homedir(), ".prism", "telemetry");
const LATENCY_FILE = join(TELEMETRY_DIR, "action-latency.jsonl");

let dirEnsured = false;

/**
 * Log action execution telemetry (latency + success/failure).
 * Safe to call from any dispatcher — never crashes on failure.
 * @param action - The dispatcher action name
 * @param latencyMs - Execution time in milliseconds
 * @param success - Whether the action completed successfully
 * @param dispatcher - Optional dispatcher name for multi-dispatcher tracing
 * @param filePath - Optional JSONL target override (DI for hermetic tests; defaults to ~/.prism/telemetry/action-latency.jsonl)
 */
export function logActionTelemetry(
  action: string,
  latencyMs: number,
  success: boolean,
  dispatcher?: string,
  filePath?: string
): void {
  try {
    const target = filePath ?? LATENCY_FILE;
    if (filePath) {
      mkdirSync(dirname(filePath), { recursive: true });
    } else if (!dirEnsured) {
      mkdirSync(TELEMETRY_DIR, { recursive: true });
      dirEnsured = true;
    }
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      action,
      latency_ms: latencyMs,
      success,
      ...(dispatcher ? { dispatcher } : {})
    }) + "\n";
    appendFileSync(target, entry);
  } catch { /* never crash on telemetry */ }
}
