/**
 * WireEdmStudioGuardEngine — canonical-template maintenance gate for the
 * 13-file / 6,545 LOC Wire EDM Studio wizard stack identified as R5's
 * "cleanest vertical" in the MS-P7.5-FE-GAPS milestone envelope.
 *
 * Loads the frozen snapshot (WEDM_STUDIO_WIZARD_SNAPSHOT.json) and validates
 * the current filesystem against it via four complementary checks:
 *
 *   1. File existence — every protected_files[path] must exist on disk
 *   2. Content hash   — SHA256(file) must match protected_files[path].sha256
 *   3. Wizard schema  — 6 steps, exact sequence, exact IDs
 *   4. API surface    — context + pipeline exports must remain
 *
 * Intentional drift is permitted ONLY if the snapshotVersion is bumped and
 * the rationale field explains the change; otherwise the guard reports
 * violations and the companion hook (.claude/hooks/wedm-studio-drift-watch.mjs)
 * blocks the commit.
 *
 * Milestone: MS-P7.5-FE-GAPS / U-P7.5-FE-01
 * Canonical snapshot: mcp-server/data/state/WEDM_STUDIO_WIZARD_SNAPSHOT.json
 *
 * @module engines/WireEdmStudioGuardEngine
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// ============================================================================
// TYPES
// ============================================================================

export interface ProtectedFileRecord {
  loc: number;
  sha256: string;
  role: string;
}

export interface WizardStepRecord {
  order: number;
  component: string;
  purpose: string;
}

export interface WedmStudioSnapshot {
  schemaVersion: number;
  snapshotVersion: string;
  recorded: string;
  milestone: string;
  unit: string;
  rationale: string;
  wizard_schema: {
    total_steps: number;
    step_sequence: readonly string[];
    step_ids: Record<string, WizardStepRecord>;
    forward_navigation: readonly string[];
    backward_navigation: readonly string[];
  };
  wedm_studio_context: {
    file: string;
    provider_export: string;
    hook_exports: readonly string[];
    public_types: readonly string[];
    required_navigation_surface: Record<string, string>;
    required_data_surface: Record<string, string>;
  };
  use_wedm_pipeline: {
    file: string;
    exports: readonly string[];
  };
  wizard_shell: { file: string; exported_props_interface: string };
  profile_canvas: { file: string; responsibility: string };
  protected_files: Record<string, ProtectedFileRecord>;
  total_protected_loc: number;
  drift_policy: Record<string, string>;
}

export type ViolationSeverity = "error" | "warning";

export interface Violation {
  severity: ViolationSeverity;
  check: string;
  file?: string;
  expected?: string;
  actual?: string;
  message: string;
}

export interface ValidateResult {
  ok: boolean;
  snapshotVersion: string;
  filesChecked: number;
  filesOk: number;
  violations: Violation[];
  drift: Array<{ file: string; expectedSha: string; actualSha: string }>;
}

export interface WireEdmStudioGuardOptions {
  /** Repo root (directory that contains mcp-server/). Defaults to process.cwd(). */
  repoRoot?: string;
  /** Path to snapshot JSON (relative to repoRoot). */
  snapshotPath?: string;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_SNAPSHOT_PATH = "mcp-server/data/state/WEDM_STUDIO_WIZARD_SNAPSHOT.json";

const EXPECTED_WIZARD_STEPS = ["import", "review", "wcs", "toolpath", "optimize", "program"] as const;
const EXPECTED_CONTEXT_HOOKS = ["useWedmNavigation", "useWedmData"] as const;
const EXPECTED_PIPELINE_EXPORTS = [
  "useWedmStep",
  "useParseGeometry",
  "useValidateGeometry",
  "useSelection",
  "useMultipass",
  "useGcode",
  "useQuickGenerate",
] as const;

// ============================================================================
// ENGINE
// ============================================================================

export class WireEdmStudioGuardEngine {
  private readonly repoRoot: string;
  private readonly snapshotPath: string;

  constructor(opts: WireEdmStudioGuardOptions = {}) {
    this.repoRoot = opts.repoRoot ?? process.cwd();
    this.snapshotPath = opts.snapshotPath ?? DEFAULT_SNAPSHOT_PATH;
  }

  /**
   * Load and return the snapshot JSON.
   * Throws if the file is missing or malformed — the snapshot is the source of
   * truth, so a missing snapshot is fatal (callers should handle).
   */
  loadSnapshot(): WedmStudioSnapshot {
    const full = resolve(this.repoRoot, this.snapshotPath);
    if (!existsSync(full)) {
      throw new Error(`WireEdmStudioGuardEngine: snapshot not found at ${full}`);
    }
    const raw = readFileSync(full, "utf8");
    const parsed = JSON.parse(raw) as WedmStudioSnapshot;
    if (parsed.schemaVersion !== 1) {
      throw new Error(
        `WireEdmStudioGuardEngine: unsupported snapshot schemaVersion ${parsed.schemaVersion} (expected 1)`,
      );
    }
    return parsed;
  }

  /**
   * Run the full validation suite against the current filesystem.
   * Does not mutate anything — pure read + compute + report.
   */
  validateSnapshot(): ValidateResult {
    const snapshot = this.loadSnapshot();
    const violations: Violation[] = [];
    const drift: Array<{ file: string; expectedSha: string; actualSha: string }> = [];

    const protectedFiles = Object.entries(snapshot.protected_files);
    let filesOk = 0;

    for (const [rel, record] of protectedFiles) {
      const full = resolve(this.repoRoot, rel);
      if (!existsSync(full)) {
        violations.push({
          severity: "error",
          check: "file_existence",
          file: rel,
          message: `Protected file deleted — ${record.role} (${record.loc} LOC). Snapshot-version bump required.`,
        });
        continue;
      }

      const actualSha = this.hashFile(full);
      if (actualSha !== record.sha256) {
        drift.push({ file: rel, expectedSha: record.sha256, actualSha });
        violations.push({
          severity: "error",
          check: "content_hash",
          file: rel,
          expected: record.sha256.slice(0, 12),
          actual: actualSha.slice(0, 12),
          message: `Content changed (${record.role}). Bump snapshotVersion and update the rationale field to record this drift.`,
        });
        continue;
      }

      filesOk += 1;
    }

    // Structural invariants — wizard step count + sequence.
    const sequence = snapshot.wizard_schema.step_sequence;
    if (snapshot.wizard_schema.total_steps !== 6) {
      violations.push({
        severity: "error",
        check: "wizard_step_count",
        expected: "6",
        actual: String(snapshot.wizard_schema.total_steps),
        message:
          "Wizard must stay at 6 steps (import → review → wcs → toolpath → optimize → program). Extending is a major architectural change — bump schemaVersion, not just snapshotVersion.",
      });
    }
    if (sequence.length !== EXPECTED_WIZARD_STEPS.length ||
        !EXPECTED_WIZARD_STEPS.every((s, i) => sequence[i] === s)) {
      violations.push({
        severity: "error",
        check: "wizard_step_sequence",
        expected: EXPECTED_WIZARD_STEPS.join(", "),
        actual: sequence.join(", "),
        message: "Step sequence drifted from canonical order.",
      });
    }

    // Context API surface — required hooks must be listed in snapshot.
    for (const hook of EXPECTED_CONTEXT_HOOKS) {
      if (!snapshot.wedm_studio_context.hook_exports.includes(hook)) {
        violations.push({
          severity: "error",
          check: "context_api_surface",
          expected: hook,
          message: `Required context hook missing from snapshot: ${hook}`,
        });
      }
    }

    // Pipeline API surface — all 7 exports must be listed.
    for (const exp of EXPECTED_PIPELINE_EXPORTS) {
      if (!snapshot.use_wedm_pipeline.exports.includes(exp)) {
        violations.push({
          severity: "error",
          check: "pipeline_api_surface",
          expected: exp,
          message: `Required pipeline export missing from snapshot: ${exp}`,
        });
      }
    }

    return {
      ok: violations.length === 0,
      snapshotVersion: snapshot.snapshotVersion,
      filesChecked: protectedFiles.length,
      filesOk,
      violations,
      drift,
    };
  }

  /**
   * Check whether a given set of changed paths would affect any protected file
   * without a snapshot-version bump. Used by the pre-commit hook to short-circuit
   * on unrelated edits.
   */
  hasProtectedOverlap(changedPaths: readonly string[]): {
    overlap: boolean;
    touchedProtected: string[];
    touchedSnapshot: boolean;
  } {
    const snapshot = this.loadSnapshot();
    const normalized = changedPaths.map((p) => p.replace(/\\/g, "/"));
    const touchedProtected = Object.keys(snapshot.protected_files).filter((rel) =>
      normalized.some((changed) => changed.endsWith(rel)),
    );
    const touchedSnapshot = normalized.some((p) => p.endsWith(this.snapshotPath));
    return {
      overlap: touchedProtected.length > 0,
      touchedProtected,
      touchedSnapshot,
    };
  }

  /**
   * Format a human-readable report for terminal / PR comment output.
   */
  formatReport(result: ValidateResult): string {
    const lines: string[] = [];
    lines.push(`WireEdmStudio snapshot v${result.snapshotVersion}`);
    lines.push(`files checked: ${result.filesChecked}  ok: ${result.filesOk}  drift: ${result.drift.length}`);
    if (result.ok) {
      lines.push("status: PASS — no drift");
      return lines.join("\n");
    }
    lines.push(`status: FAIL — ${result.violations.length} violation(s)`);
    for (const v of result.violations) {
      const prefix = v.severity === "error" ? "✗" : "!";
      const file = v.file ? ` [${v.file}]` : "";
      lines.push(`  ${prefix} ${v.check}${file}: ${v.message}`);
    }
    return lines.join("\n");
  }

  // --------------------------------------------------------------------
  // internal
  // --------------------------------------------------------------------

  private hashFile(fullPath: string): string {
    const content = readFileSync(fullPath);
    return createHash("sha256").update(content).digest("hex");
  }
}

// ============================================================================
// SINGLETON (consistent with other guard engines)
// ============================================================================

export const wireEdmStudioGuardEngine = new WireEdmStudioGuardEngine();

// Default export for hook convenience.
export default wireEdmStudioGuardEngine;

// Re-export for tests + external callers.
export { DEFAULT_SNAPSHOT_PATH };
export const canonicalWizardSteps = EXPECTED_WIZARD_STEPS;
export const canonicalContextHooks = EXPECTED_CONTEXT_HOOKS;
export const canonicalPipelineExports = EXPECTED_PIPELINE_EXPORTS;
