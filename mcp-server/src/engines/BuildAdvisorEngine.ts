/**
 * BuildAdvisorEngine — U-FORE-04 (PSAU-FORESIGHT)
 * ================================================
 *
 * Composes per-build guidance tailored to the current developer experience
 * level (from UserModelEngine + NewCoderModeEngine). Rather than the same
 * boilerplate every session, the advisor emits a brief that matches the
 * user's current profile:
 *   - new:   verbose step-by-step with rollback, caveats, review checklist
 *   - intermediate: concise checklist, rollback required
 *   - expert: minimal nudge, only warns on severity-4+ items
 *
 * Integrates with GapPredictorEngine (U-FORE-03) and
 * ChangeImpactRadiusEngine (U-FORE-01) when their reports are provided.
 */

import {
  newCoderModeEngine,
  type NewCoderModeEngine,
  type ModeProfile,
} from "./NewCoderModeEngine.js";
import type { GapReport } from "./GapPredictorEngine.js";

export interface BuildAdviceInput {
  unitId: string;
  title?: string;
  filesTouched?: string[];
  riskLevel?: "low" | "medium" | "high" | "critical";
  estTokens?: number;
  gapReport?: GapReport;
  rollbackPlan?: string;
}

export interface BuildAdvice {
  unitId: string;
  profile: ModeProfile;
  sections: {
    intro: string;
    checklist: string[];
    rollback?: string;
    warnings: string[];
    debriefPromise?: string;
  };
  requiresRollbackPlan: boolean;
  blockers: string[];
  emitAt: number;
}

export class BuildAdvisorEngine {
  readonly name = "BuildAdvisorEngine";

  constructor(private readonly mode: NewCoderModeEngine = newCoderModeEngine) {}

  /**
   * Generate tailored advice for a planned build.
   *
   * @param input  Unit metadata + optional gap/impact reports.
   * @returns  Advice object with sections appropriate for the mode.
   */
  adviseFor(input: BuildAdviceInput): BuildAdvice {
    this.assertInput(input);
    const profile = this.mode.currentProfile();
    const blockers: string[] = [];

    if (profile.requireRollbackPlan && !input.rollbackPlan) {
      blockers.push(
        `${profile.experience} mode requires an explicit rollback plan before build. Provide rollbackPlan.`
      );
    }

    const gapFindings = input.gapReport?.findings ?? [];
    const surfaced = gapFindings.filter((f) =>
      this.mode.shouldSurface(f.severity)
    );

    const warnings: string[] = [];
    for (const f of surfaced) {
      warnings.push(`[sev ${f.severity}] ${f.patternId}: ${f.fix}`);
    }

    if (input.riskLevel === "high" || input.riskLevel === "critical") {
      warnings.push(
        `Change-impact is ${input.riskLevel}. Confirm tests cover direct dependents before committing.`
      );
    }

    const intro = this.renderIntro(profile, input);
    const checklist = this.renderChecklist(profile, input);
    const rollback = input.rollbackPlan
      ? `Rollback: ${input.rollbackPlan}`
      : profile.requireRollbackPlan
        ? "Rollback plan REQUIRED before build — describe the inverse steps."
        : undefined;
    const debriefPromise = profile.requireDebrief
      ? "After completion, you will receive a plain-language debrief covering what changed, why, and what to watch for."
      : undefined;

    return {
      unitId: input.unitId,
      profile,
      sections: { intro, checklist, rollback, warnings, debriefPromise },
      requiresRollbackPlan: profile.requireRollbackPlan,
      blockers,
      emitAt: Date.now(),
    };
  }

  /**
   * Return true iff the advisor considers the build safe to start.
   * (Blockers, not warnings, gate this.)
   */
  isSafeToStart(advice: BuildAdvice): boolean {
    return advice.blockers.length === 0;
  }

  private renderIntro(profile: ModeProfile, input: BuildAdviceInput): string {
    const title = input.title ? `: ${input.title}` : "";
    switch (profile.experience) {
      case "new":
        return (
          `Starting unit ${input.unitId}${title}. New-coder mode is on, so every step gets ` +
          `a short explanation. If anything looks wrong, stop and ask before committing.`
        );
      case "intermediate":
        return `Unit ${input.unitId}${title}. Rollback plan required. Key checkpoints listed below.`;
      case "expert":
        return `Unit ${input.unitId}${title}. Minimal brief.`;
      case "unknown":
      default:
        return (
          `Unit ${input.unitId}${title}. Developer level not set — using cautious defaults. ` +
          `Run userModelEngine.setExperience('...') to personalize.`
        );
    }
  }

  private renderChecklist(profile: ModeProfile, input: BuildAdviceInput): string[] {
    const base: string[] = [];
    if (profile.experience !== "expert") {
      base.push(
        `Confirm the files you will touch: ${
          input.filesTouched?.length ? input.filesTouched.join(", ") : "(none listed)"
        }`
      );
    }
    base.push("Write tests first, or in the same commit — never stub-then-test-later.");
    base.push("Use physics/constants for Kienzle/Taylor — no inline numbers.");
    if (profile.experience === "new" || profile.experience === "intermediate") {
      base.push("After build: run affected tests and tsc --noEmit before committing.");
    }
    if (profile.experience === "new") {
      base.push(
        "Read every hook advisory carefully — if something seems blocked, the hook message explains why."
      );
    }
    return base;
  }

  private assertInput(input: unknown): asserts input is BuildAdviceInput {
    if (!input || typeof input !== "object") {
      throw new Error("BuildAdvisorEngine.adviseFor: input must be an object");
    }
    const rec = input as Partial<BuildAdviceInput>;
    if (typeof rec.unitId !== "string" || rec.unitId.trim() === "") {
      throw new Error("BuildAdvisorEngine.adviseFor: input.unitId required");
    }
  }
}

export const buildAdvisorEngine = new BuildAdvisorEngine();
