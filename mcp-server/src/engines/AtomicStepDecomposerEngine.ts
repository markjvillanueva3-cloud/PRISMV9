/**
 * AtomicStepDecomposerEngine — U-FORE-02 (PSAU-FORESIGHT)
 * ========================================================
 *
 * Helper for BuildPlannerEngine: converts a raw roadmap unit description
 * into a list of atomic build steps. Each step is self-contained, has a
 * typed kind, prerequisites, and an estimated token budget.
 *
 * The decomposer recognises eight canonical step kinds:
 *   read_schema · write_engine · write_schema · wire_dispatcher
 *   write_test · register_hook · regenerate_manifest · commit
 *
 * It infers steps from the unit's files_created / files_modified fields
 * plus keyword hints in the description. Callers (BuildPlannerEngine)
 * wire the prerequisite DAG on top.
 */

export type StepKind =
  | "read_schema"
  | "write_engine"
  | "write_schema"
  | "wire_dispatcher"
  | "write_test"
  | "register_hook"
  | "regenerate_manifest"
  | "commit";

export interface UnitSpec {
  id: string;
  title?: string;
  description?: string;
  files_created?: string[];
  files_modified?: string[];
  depends_on?: string[];
}

export interface AtomicStep {
  id: string;
  kind: StepKind;
  summary: string;
  targetFile?: string;
  /** Estimated Claude output tokens (rough; used for budgeting). */
  estTokens: number;
  /** Estimated wall-clock seconds. */
  estDurationSec: number;
  /** Risk 0-1; higher → larger blast radius or safety-critical. */
  risk: number;
  /** Rollback strategy stub. */
  rollback: string;
}

/** Default token estimates per step kind (measured empirically). */
export const DEFAULT_TOKEN_ESTIMATES: Record<StepKind, number> = {
  read_schema: 800,
  write_engine: 4000,
  write_schema: 1500,
  wire_dispatcher: 1200,
  write_test: 3000,
  register_hook: 500,
  regenerate_manifest: 300,
  commit: 200,
};

export const DEFAULT_DURATION_SEC: Record<StepKind, number> = {
  read_schema: 5,
  write_engine: 40,
  write_schema: 15,
  wire_dispatcher: 15,
  write_test: 30,
  register_hook: 8,
  regenerate_manifest: 5,
  commit: 6,
};

export const DEFAULT_RISK: Record<StepKind, number> = {
  read_schema: 0.05,
  write_engine: 0.4,
  write_schema: 0.3,
  wire_dispatcher: 0.5,  // dispatcher changes can break many consumers
  write_test: 0.1,
  register_hook: 0.2,
  regenerate_manifest: 0.05,
  commit: 0.1,
};

export class AtomicStepDecomposerEngine {
  readonly name = "AtomicStepDecomposerEngine";

  /**
   * Turn a unit spec into a flat list of atomic steps in a canonical order.
   * Dependencies are added later by BuildPlannerEngine.
   *
   * @param unit Roadmap unit description
   * @returns Array of atomic steps ready for DAG construction
   * @throws Error if unit.id is missing or unit is not an object
   */
  decompose(unit: UnitSpec): AtomicStep[] {
    if (!unit || typeof unit !== "object") {
      throw new Error("AtomicStepDecomposerEngine.decompose: unit must be an object");
    }
    if (typeof unit.id !== "string" || unit.id.trim() === "") {
      throw new Error("AtomicStepDecomposerEngine.decompose: unit.id required");
    }

    const steps: AtomicStep[] = [];
    const created = unit.files_created ?? [];
    const modified = unit.files_modified ?? [];
    const desc = (unit.description || "").toLowerCase();
    const normalize = (p: string) => p.replace(/\\/g, "/");

    // 1. Read any mentioned schema(s) that are INPUTS (not created).
    for (const f of modified) {
      const n = normalize(f);
      if (/schema/i.test(n) && !created.includes(f)) {
        steps.push(this.makeStep("read_schema", `Read input schema ${this.basename(n)}`, n));
      }
    }

    // 2. Write engines + schemas + tests + hooks from files_created.
    for (const f of created) {
      const n = normalize(f);
      if (/Engine\.ts$/.test(n)) {
        steps.push(this.makeStep("write_engine", `Write engine ${this.basename(n)}`, n));
      } else if (/schemas?\/.*\.ts$/i.test(n)) {
        steps.push(this.makeStep("write_schema", `Write schema ${this.basename(n)}`, n));
      } else if (/\.test\.ts$/.test(n) || /__tests__/.test(n)) {
        steps.push(this.makeStep("write_test", `Write tests ${this.basename(n)}`, n));
      } else if (/\.claude\/.*\.mjs$|scripts\/hooks\/.*\.mjs$/i.test(n)) {
        steps.push(this.makeStep("register_hook", `Create hook ${this.basename(n)}`, n));
      }
    }

    // 3. Dispatcher wiring — either explicit in description or implied by
    // the presence of an engine paired with "dispatcher" in description.
    const hasEngine = steps.some((s) => s.kind === "write_engine");
    if (hasEngine && /dispatcher|wire|MCP|dispatch/i.test(desc)) {
      steps.push(
        this.makeStep(
          "wire_dispatcher",
          "Wire engine to MCP dispatcher (action enum + schema + lazy import)"
        )
      );
    }

    // 4. Hook registration if settings.json is in files_modified.
    if (modified.some((f) => /settings\.json$/i.test(f))) {
      steps.push(
        this.makeStep("register_hook", "Register hook in Claude Code settings.json")
      );
    }

    // 5. Manifest regen if any new engine was created.
    if (hasEngine) {
      steps.push(
        this.makeStep(
          "regenerate_manifest",
          "Regenerate self-awareness manifest to expose new engine"
        )
      );
    }

    // 6. Final commit step.
    steps.push(
      this.makeStep("commit", `Commit: ${unit.id}: ${unit.title || "unit delivered"}`)
    );

    return steps;
  }

  // ─── private ──────────────────────────────────────────────────────

  private makeStep(
    kind: StepKind,
    summary: string,
    targetFile?: string
  ): AtomicStep {
    return {
      id: `${kind}:${Math.random().toString(36).slice(2, 10)}`,
      kind,
      summary,
      targetFile,
      estTokens: DEFAULT_TOKEN_ESTIMATES[kind],
      estDurationSec: DEFAULT_DURATION_SEC[kind],
      risk: DEFAULT_RISK[kind],
      rollback: this.rollbackFor(kind, targetFile),
    };
  }

  private rollbackFor(kind: StepKind, target?: string): string {
    switch (kind) {
      case "read_schema":
        return "No-op — read-only step";
      case "write_engine":
      case "write_schema":
      case "write_test":
        return target ? `git restore --source=HEAD ${target} (or rm if untracked)` : "git restore touched files";
      case "wire_dispatcher":
        return "git diff && git restore the dispatcher file";
      case "register_hook":
        return target ? `Remove hook entry for ${this.basename(target)} from settings.json` : "Revert settings.json edit";
      case "regenerate_manifest":
        return "Re-run generate-self-awareness-manifest after revert";
      case "commit":
        return "git reset --soft HEAD~1 (preserves working tree)";
    }
  }

  private basename(p: string): string {
    const i = p.lastIndexOf("/");
    return i >= 0 ? p.slice(i + 1) : p;
  }
}

export const atomicStepDecomposerEngine = new AtomicStepDecomposerEngine();

/** Back-compat alias: callers (CounterfactualBuildSimulatorEngine, RollbackPlannerEngine) historically imported `BuildStep`. */
export type BuildStep = AtomicStep;
