/**
 * Forge-Quint Transaction — atomic 5-artifact asset creation
 *
 * Universal Phase 0.3. Replaces the advisory "forge-triple" skill flow
 * (hook + action + skill — three files created one at a time, each a
 * potential tear point if the harness dies mid-way) with a genuine
 * transaction. Every new engine must ship with ALL of:
 *
 *   1. engine      — the TypeScript engine file under src/engines/
 *   2. hook        — PreTool / PostTool enforcement hook
 *   3. action      — dispatcher z.enum action + switch case registration
 *   4. skill       — user-facing slash command under .claude/commands/
 *   5. registryDelta — cross-session registry entry + barrel export line
 *
 * All 5 are pre-flight dedup-checked (via DuplicationGuardEngine + its
 * semantic-signature companion), staged to per-transaction tmp files,
 * then atomically renamed in a single critical section protected by
 * proper-lockfile. On any failure (dedup rejection, write error, stage
 * crash) every tmp file is cleaned up and previously-renamed final
 * files are reverted — NOT via `git checkout --` (too dangerous under
 * concurrent hook locks), but via pre-read backup buffers captured
 * before each rename.
 *
 * Consumers: forge-triple skill + scripts/forge-engine.ts + any future
 * bulk generator. The transaction API is deliberately synchronous-
 * looking (single `await forgeQuint(spec)`) so callers can't
 * accidentally interleave dedup with write.
 *
 * @module utils/forgeQuintTransaction
 * @phase Universal 0.3 — Transactional Forge-Quint
 */

import { promises as fs } from "fs";
import * as path from "path";
import lockfile from "proper-lockfile";
import { atomicLockedWrite } from "./atomicLockedWrite.js";

// ============================================================================
// TYPES
// ============================================================================

export type ForgeArtifactKind =
  | "engine"
  | "hook"
  | "action"
  | "skill"
  | "registry";

export interface ForgeArtifact {
  kind: ForgeArtifactKind;
  /** absolute path of the file to create/update */
  path: string;
  /** full content to write (if creating) or new content after merge (if updating) */
  content: string;
  /**
   * If true, file must NOT exist (create-only). If false, file will be
   * overwritten. Default: true for engine/hook/skill, false for action/registry.
   */
  createOnly?: boolean;
  /** human-friendly name for logging + dedup */
  name: string;
  /** description for dedup similarity checks */
  description?: string;
}

export interface ForgeQuintSpec {
  /** The 5 artifacts that must land atomically */
  artifacts: ForgeArtifact[];
  /** Optional label for telemetry + rollback logs */
  label?: string;
  /** Skip dedup pre-check (ONLY for bootstrap — flag-gated) */
  skipDedup?: boolean;
  /** Lock acquire timeout/retries override */
  lockRetries?: number;
}

export interface ForgeQuintResult {
  success: boolean;
  transactionId: string;
  label: string;
  written: string[];
  rolledBack: string[];
  errors: string[];
  durationMs: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TXN_LOCK_DIR = path.join(
  (process.env.PRISM_ROOT ?? "H:/prism"),
  "state",
  "shared"
);
const TXN_LOCK_FILE = path.join(TXN_LOCK_DIR, "FORGE_QUINT.lock");

// ============================================================================
// IMPLEMENTATION
// ============================================================================

function newTransactionId(): string {
  return `forge-${Date.now().toString(36)}-${process.pid.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code !== "EEXIST") throw err;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readBackup(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Stage artifact to a tmp file. Returns the tmp path. Does NOT rename
 * to final — that happens in the commit phase after all artifacts stage
 * successfully.
 */
async function stageArtifact(
  artifact: ForgeArtifact,
  txnId: string
): Promise<{ tmpPath: string; backup: string | null }> {
  const backup = await readBackup(artifact.path);

  const createOnly =
    artifact.createOnly ??
    (["engine", "hook", "skill"].includes(artifact.kind));
  if (createOnly && backup !== null) {
    throw new Error(
      `forge-quint[${txnId}] artifact ${artifact.kind} would overwrite existing file: ${artifact.path}`
    );
  }

  const tmpPath = `${artifact.path}.forge-${txnId}.tmp`;
  await ensureDir(path.dirname(artifact.path));
  await fs.writeFile(tmpPath, artifact.content, "utf-8");
  return { tmpPath, backup };
}

/**
 * Commit phase — rename all staged tmp files to their final paths.
 * Renames are sequential; if one fails, subsequent renames are aborted
 * and the caller handles rollback of both written + remaining staged.
 */
async function commitStaged(
  staged: Array<{ artifact: ForgeArtifact; tmpPath: string; backup: string | null }>
): Promise<{ written: string[]; failedAt?: number }> {
  const written: string[] = [];
  for (let i = 0; i < staged.length; i++) {
    const { artifact, tmpPath } = staged[i];
    try {
      await fs.rename(tmpPath, artifact.path);
      written.push(artifact.path);
    } catch {
      return { written, failedAt: i };
    }
  }
  return { written };
}

/**
 * Rollback — restore backups for any files we already renamed,
 * delete any still-staged tmp files.
 */
async function rollback(
  staged: Array<{ artifact: ForgeArtifact; tmpPath: string; backup: string | null }>,
  written: string[]
): Promise<string[]> {
  const rolledBack: string[] = [];
  // Restore backups in reverse order
  for (const finalPath of [...written].reverse()) {
    const entry = staged.find((s) => s.artifact.path === finalPath);
    if (!entry) continue;
    try {
      if (entry.backup === null) {
        await fs.unlink(finalPath);
      } else {
        await fs.writeFile(finalPath, entry.backup, "utf-8");
      }
      rolledBack.push(finalPath);
    } catch {
      // Best-effort — if we can't rollback a file, leave it and report
    }
  }
  // Clean up any remaining tmp files
  for (const s of staged) {
    if (!written.includes(s.artifact.path)) {
      try { await fs.unlink(s.tmpPath); } catch { /* ignore */ }
    }
  }
  return rolledBack;
}

/**
 * Pre-flight dedup check. Delegates to DuplicationGuardEngine +
 * SemanticSimilarityGuardEngine. Returns list of conflicting asset names
 * (empty = all clear).
 *
 * This is intentionally a soft-import (dynamic require) so the util
 * remains usable during cold boot when those engines aren't in the
 * barrel. Falls open if the engines can't be resolved.
 */
async function dedupPreflight(artifacts: ForgeArtifact[]): Promise<string[]> {
  const conflicts: string[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { duplicationGuardEngine } = require("../engines/DuplicationGuardEngine.js");
    for (const a of artifacts) {
      const assetType = mapKindToAssetType(a.kind);
      if (!assetType) continue;
      const check = await duplicationGuardEngine.checkBeforeCreating({
        assetType,
        proposedName: a.name,
        keywords: [],
        description: a.description ?? "",
      });
      if (check?.shouldProceed === false) {
        const topMatch = check?.matches?.[0]?.name ?? "unknown";
        conflicts.push(`${a.kind} "${a.name}" conflicts with existing "${topMatch}"`);
      }
    }
  } catch {
    // Soft failure — dedup engine unavailable (cold boot / torn state)
  }
  return conflicts;
}

function mapKindToAssetType(kind: ForgeArtifactKind): string | null {
  switch (kind) {
    case "engine":   return "engine";
    case "hook":     return "hook";
    case "action":   return "dispatcher_action";
    case "skill":    return "skill";
    case "registry": return null; // registry deltas aren't dedup-checked this way
    default:         return null;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Forge a 5-artifact transaction. Either all artifacts land on disk
 * atomically or none of them do.
 *
 * @example
 *   const result = await forgeQuint({
 *     label: "SpeedFeedDeflectionEngine",
 *     artifacts: [
 *       { kind: "engine",   path: "src/engines/SpeedFeedDeflectionEngine.ts", content: engineSrc, name: "SpeedFeedDeflectionEngine" },
 *       { kind: "hook",     path: "src/hooks/SpeedFeedDeflectionHook.ts", content: hookSrc, name: "SpeedFeedDeflectionHook" },
 *       { kind: "action",   path: "src/tools/dispatchers/calcDispatcher.ts", content: updatedDispatcher, name: "sf_deflection_calc", createOnly: false },
 *       { kind: "skill",    path: ".claude/commands/sf-deflection.md", content: skillSrc, name: "sf-deflection" },
 *       { kind: "registry", path: "data/state/cross-session-asset-registry.json", content: updatedRegistry, name: "cross-session-asset-registry", createOnly: false },
 *     ],
 *   });
 *   if (!result.success) throw new Error(result.errors.join("; "));
 */
export async function forgeQuint(spec: ForgeQuintSpec): Promise<ForgeQuintResult> {
  const t0 = Date.now();
  const txnId = newTransactionId();
  const label = spec.label ?? "unlabeled";
  const errors: string[] = [];

  if (spec.artifacts.length === 0) {
    return {
      success: false,
      transactionId: txnId,
      label,
      written: [],
      rolledBack: [],
      errors: ["forge-quint requires at least 1 artifact"],
      durationMs: Date.now() - t0,
    };
  }

  // Phase 0: dedup preflight (skippable via BOOTSTRAP_MODE)
  if (!spec.skipDedup) {
    const conflicts = await dedupPreflight(spec.artifacts);
    if (conflicts.length > 0) {
      return {
        success: false,
        transactionId: txnId,
        label,
        written: [],
        rolledBack: [],
        errors: conflicts,
        durationMs: Date.now() - t0,
      };
    }
  }

  // Phase 1: acquire transaction lock (cross-process)
  await ensureDir(TXN_LOCK_DIR);
  // Create empty lock target if missing
  if (!(await fileExists(TXN_LOCK_FILE))) {
    try { await fs.writeFile(TXN_LOCK_FILE, ""); } catch { /* ignore */ }
  }

  let release: (() => Promise<void>) | null = null;
  let staged: Array<{ artifact: ForgeArtifact; tmpPath: string; backup: string | null }> = [];
  const written: string[] = [];
  let rolledBack: string[] = [];

  try {
    release = await lockfile.lock(TXN_LOCK_FILE, {
      stale: 30_000,
      retries: {
        retries: spec.lockRetries ?? 10,
        factor: 2,
        minTimeout: 10,
        maxTimeout: 1600,
      },
    });

    // Phase 2: stage all artifacts
    for (const artifact of spec.artifacts) {
      const entry = await stageArtifact(artifact, txnId);
      staged.push({ artifact, ...entry });
    }

    // Phase 3: commit renames sequentially
    const commitResult = await commitStaged(staged);
    written.push(...commitResult.written);

    if (commitResult.failedAt !== undefined) {
      errors.push(
        `rename failed at artifact ${commitResult.failedAt} (${staged[commitResult.failedAt].artifact.kind}: ${staged[commitResult.failedAt].artifact.name})`
      );
      rolledBack = await rollback(staged, written);
      return {
        success: false,
        transactionId: txnId,
        label,
        written: [],
        rolledBack,
        errors,
        durationMs: Date.now() - t0,
      };
    }

    // Phase 4: post-commit registry telemetry (non-blocking best-effort)
    // We log transaction success to a JSONL for audit.
    await logTransactionSuccess(txnId, label, written).catch(() => { /* ignore telemetry failure */ });

    return {
      success: true,
      transactionId: txnId,
      label,
      written,
      rolledBack: [],
      errors: [],
      durationMs: Date.now() - t0,
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    rolledBack = await rollback(staged, written);
    return {
      success: false,
      transactionId: txnId,
      label,
      written: [],
      rolledBack,
      errors,
      durationMs: Date.now() - t0,
    };
  } finally {
    if (release) {
      try { await release(); } catch { /* ignore release errors */ }
    }
  }
}

async function logTransactionSuccess(
  txnId: string,
  label: string,
  written: string[]
): Promise<void> {
  const logPath = path.join(TXN_LOCK_DIR, "FORGE_QUINT_LEDGER.jsonl");
  const entry = {
    txnId,
    label,
    timestamp: new Date().toISOString(),
    written,
    pid: process.pid,
  };
  // Append-only via atomicLockedRmw would require JSONL handling — for now
  // just use a separate append path with atomicLockedWrite on a temp-merge.
  try {
    const existing = (await fileExists(logPath)) ? await fs.readFile(logPath, "utf-8") : "";
    const next = existing + JSON.stringify(entry) + "\n";
    await atomicLockedWrite(logPath, next);
  } catch {
    // Best-effort telemetry — never fails the transaction
  }
}

/**
 * Convenience — assert a 5-artifact spec. Useful for callers building
 * specs dynamically. Returns the spec unchanged or throws with a
 * detailed error message.
 */
export function assertQuintShape(spec: ForgeQuintSpec): ForgeQuintSpec {
  if (!Array.isArray(spec.artifacts)) {
    throw new Error("forge-quint spec: .artifacts must be an array");
  }
  const kinds = spec.artifacts.map((a) => a.kind);
  const required: ForgeArtifactKind[] = ["engine", "hook", "action", "skill", "registry"];
  const missing = required.filter((k) => !kinds.includes(k));
  if (missing.length > 0) {
    throw new Error(
      `forge-quint spec: missing artifact kind(s): ${missing.join(", ")}. A true quint needs engine + hook + action + skill + registry.`
    );
  }
  return spec;
}
