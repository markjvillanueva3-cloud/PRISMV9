#!/usr/bin/env node
// tier: T0
/**
 * macro-bulk-emit-guard — MACRO-PROGRAM-PIPELINE-MS0/MS0-U6 SAFETY HOOK.
 *
 * Stop hook (Tier-0, MINIMAL_ALLOWLIST) that BLOCKS session-end if a bulk
 * macro-emit batch ran in the session without a recorded operator approval.
 *
 * Detection: reads `<libraryRoot>/_MACRO_BULK_LOG.md` (append-only history of
 * every batch the engine ran). For each batch entry whose timestamp falls
 * inside a configurable window (default 24h), verifies that
 * `<libraryRoot>/_BATCH_<n>_APPROVED` exists. Any unapproved batch ⇒ BLOCK.
 *
 * The hook scans EVERY library root mentioned in the env list
 * `PRISM_MACRO_BULK_LIBRARY_ROOTS` (semicolon-separated), with a sensible
 * default of `H:/PRISM/JM DIE/_PART LIBRARY`.
 *
 * Knobs:
 *   PRISM_MACRO_BULK_GUARD_DISABLE=1        — turn the hook off entirely
 *   PRISM_MACRO_BULK_GUARD_WINDOW_MS=<n>    — window default 24h (86_400_000)
 *   PRISM_MACRO_BULK_LIBRARY_ROOTS=<roots>  — semicolon-separated roots
 *   PRISM_MACRO_BULK_GUARD_BYPASS=1         — emergency operator bypass
 *                                             (logged to bypass ledger)
 *
 * This hook is in MINIMAL_ALLOWLIST per CLAUDE.md — `PRISM_HOOK_PROFILE`
 * does NOT disable it (only the dedicated DISABLE knob above).
 *
 * Programmatic surface for tests:
 *   `checkBlocking({ libraryRoots, windowMs, now? })` →
 *     `{ blocked: bool, reasons: string[], unapproved: BatchEntry[] }`
 *   `parseBulkLog(content)` → `BatchEntry[]`
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_LIBRARY_ROOTS = ["H:/PRISM/JM DIE/_PART LIBRARY"];
const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const BULK_LOG_FILENAME = "_MACRO_BULK_LOG.md";
const BATCH_APPROVED_FILENAME = (n) => `_BATCH_${n}_APPROVED`;
const BYPASS_LEDGER_PATH = "H:/prism/state/shared/macro-bulk-guard-bypasses.jsonl";

// ============================================================================
// PARSING
// ============================================================================

/**
 * Parse a `_MACRO_BULK_LOG.md` body for batch entries.
 * Engine writes lines like:
 *   `- 2026-05-13T22:00:00.000Z — batch 3: considered=25, emitted=20, …`
 */
export function parseBulkLog(content) {
  if (typeof content !== "string" || content.length === 0) return [];
  const entries = [];
  const lineRe = /^- (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) — batch (\d+):/;
  for (const line of content.split(/\r?\n/)) {
    const m = lineRe.exec(line);
    if (!m) continue;
    const startedAt = m[1];
    const batchNumber = Number(m[2]);
    if (!Number.isInteger(batchNumber)) continue;
    entries.push({ batchNumber, startedAt, line });
  }
  return entries;
}

// ============================================================================
// CORE CHECK (testable)
// ============================================================================

/**
 * @param {{ libraryRoots: string[], windowMs?: number, now?: number }} opts
 * @returns {{ blocked: boolean, reasons: string[], unapproved: Array<{libraryRoot: string, batchNumber: number, startedAt: string}> }}
 */
export function checkBlocking(opts) {
  const libraryRoots = Array.isArray(opts?.libraryRoots) && opts.libraryRoots.length > 0
    ? opts.libraryRoots
    : DEFAULT_LIBRARY_ROOTS;
  const windowMs = typeof opts?.windowMs === "number" && opts.windowMs > 0
    ? opts.windowMs
    : DEFAULT_WINDOW_MS;
  const now = typeof opts?.now === "number" ? opts.now : Date.now();
  const cutoff = now - windowMs;

  const unapproved = [];
  const reasons = [];

  for (const root of libraryRoots) {
    const logPath = path.join(root, BULK_LOG_FILENAME);
    if (!fs.existsSync(logPath)) continue;
    let content;
    try {
      content = fs.readFileSync(logPath, "utf-8");
    } catch (err) {
      // Cannot read the log — surface as a reason but don't crash.
      reasons.push(`could not read ${logPath}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    const entries = parseBulkLog(content);
    for (const entry of entries) {
      const startedMs = Date.parse(entry.startedAt);
      if (Number.isNaN(startedMs)) continue;
      if (startedMs < cutoff) continue; // outside window — operator-history, not session
      const markerPath = path.join(root, BATCH_APPROVED_FILENAME(entry.batchNumber));
      if (fs.existsSync(markerPath)) continue;
      unapproved.push({ libraryRoot: root, batchNumber: entry.batchNumber, startedAt: entry.startedAt });
    }
  }

  if (unapproved.length > 0) {
    for (const u of unapproved) {
      reasons.push(
        `Batch ${u.batchNumber} at ${u.libraryRoot} ran at ${u.startedAt} ` +
          `with NO _BATCH_${u.batchNumber}_APPROVED marker. Operator review pending.`,
      );
    }
  }

  return { blocked: unapproved.length > 0, reasons, unapproved };
}

// ============================================================================
// HOOK ENTRY (Stop)
// ============================================================================

function recordBypass(payload) {
  try {
    const dir = path.dirname(BYPASS_LEDGER_PATH);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(BYPASS_LEDGER_PATH, JSON.stringify(payload) + "\n", "utf-8");
  } catch {
    // best-effort
  }
}

function resolveLibraryRoots() {
  const envRoots = process.env.PRISM_MACRO_BULK_LIBRARY_ROOTS;
  if (typeof envRoots === "string" && envRoots.trim().length > 0) {
    return envRoots.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
  }
  return DEFAULT_LIBRARY_ROOTS;
}

async function main() {
  // Disabled?
  if (process.env.PRISM_MACRO_BULK_GUARD_DISABLE === "1") {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }

  // Emergency bypass?
  if (process.env.PRISM_MACRO_BULK_GUARD_BYPASS === "1") {
    recordBypass({ at: new Date().toISOString(), reason: "PRISM_MACRO_BULK_GUARD_BYPASS=1" });
    process.stdout.write(JSON.stringify({
      continue: true,
      systemMessage: "[macro-bulk-emit-guard] BYPASSED via PRISM_MACRO_BULK_GUARD_BYPASS=1 — recorded to bypass ledger",
    }) + "\n");
    return;
  }

  // Drain stdin (Stop hooks receive {hook_event_name, session_id, …}).
  // We don't actually need its content; the check is filesystem-based.
  try {
    for await (const _chunk of process.stdin) { /* drain */ }
  } catch {
    // best-effort drain
  }

  const windowMs = (() => {
    const v = process.env.PRISM_MACRO_BULK_GUARD_WINDOW_MS;
    if (typeof v === "string" && v.trim().length > 0) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return DEFAULT_WINDOW_MS;
  })();

  const result = checkBlocking({
    libraryRoots: resolveLibraryRoots(),
    windowMs,
  });

  if (result.blocked) {
    const lines = [
      "[macro-bulk-emit-guard] BLOCK — unapproved macro bulk-emit batch(es) in window.",
      ...result.reasons.map((r) => `  • ${r}`),
      "",
      "Resolve via ONE of:",
      "  1. Approve each batch: macroBulkEmitOrchestratorEngine.approveBatch({batchNumber, libraryRoot, approvedBy})",
      "  2. Touch the marker file: <libraryRoot>/_BATCH_<n>_APPROVED",
      "  3. Set env MACRO_PROGRAM_PIPELINE_BATCH_APPROVED=<n>",
      "  4. Emergency only: PRISM_MACRO_BULK_GUARD_BYPASS=1 (logged to bypass ledger)",
    ];
    // Stop-hook block format: decision="block" + reason on stderr.
    process.stderr.write(lines.join("\n") + "\n");
    process.stdout.write(JSON.stringify({ decision: "block", reason: lines.join("\n") }) + "\n");
    process.exit(2); // non-zero → hook framework treats as block
  }

  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
}

// Run if invoked directly (not when imported by tests).
const isDirectInvoke = (() => {
  try {
    const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
    const fileUrl = import.meta.url;
    const fileFromUrl = fileUrl.startsWith("file://") ? path.resolve(decodeURIComponent(fileUrl.slice(7).replace(/^\/+([a-zA-Z]:)/, "$1"))) : "";
    return argv1 === fileFromUrl;
  } catch {
    return false;
  }
})();

if (isDirectInvoke) {
  main().catch((err) => {
    process.stderr.write(`[macro-bulk-emit-guard] uncaught: ${err?.stack ?? err}\n`);
    process.exit(1);
  });
}
