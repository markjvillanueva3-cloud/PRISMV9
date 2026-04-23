/**
 * PostCompactRestorationEngine — U-CTX04 PostCompact Restoration Cascade
 *
 * Restores session context after compaction by reading the precompact dossier
 * and reconstructing mental model, bandit posteriors, SVI trajectory, and
 * active work claims.
 *
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  PrecompactDossierSchema,
  type PrecompactDossier,
  type MentalModel,
  type BanditState,
  type SVITrajectory,
  type LiveClaim,
  type ToolOutcome,
} from "../schemas/precompactDossierSchema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RestorationResult {
  success: boolean;
  sessionId: string;
  restoredAt: string;
  mentalModel: MentalModel | null;
  banditState: BanditState | null;
  sviTrajectory: SVITrajectory | null;
  activeClaims: LiveClaim[];
  recoveryHints: string[];
  tokenEstimate: number;
  errors: string[];
}

export interface CompactRestorationSummary {
  objective: string;
  approach: string;
  nextSteps: string[];
  blockers: string[];
  sviPsi: number | null;
  banditTopArm: string | null;
  claims: string[];
  hints: string[];
}

export class PostCompactRestorationEngine {
  private readonly stateDir: string;
  private readonly dossierPath: string;

  constructor(stateDir?: string) {
    this.stateDir = stateDir || path.resolve(__dirname, "../../data/state");
    this.dossierPath = path.join(this.stateDir, "PRECOMPACT_DOSSIER.json");
  }

  hasDossier(): boolean {
    return fs.existsSync(this.dossierPath);
  }

  getDossierAge(): number {
    if (!this.hasDossier()) return Infinity;
    const stat = fs.statSync(this.dossierPath);
    return Date.now() - stat.mtimeMs;
  }

  loadDossier(): PrecompactDossier | null {
    if (!this.hasDossier()) return null;

    try {
      const raw = fs.readFileSync(this.dossierPath, "utf-8");
      const parsed = PrecompactDossierSchema.safeParse(JSON.parse(raw));
      if (parsed.success) {
        return parsed.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  restore(): RestorationResult {
    const result: RestorationResult = {
      success: false,
      sessionId: "",
      restoredAt: new Date().toISOString(),
      mentalModel: null,
      banditState: null,
      sviTrajectory: null,
      activeClaims: [],
      recoveryHints: [],
      tokenEstimate: 0,
      errors: [],
    };

    const dossier = this.loadDossier();
    if (!dossier) {
      result.errors.push("No valid precompact dossier found");
      return result;
    }

    // Check dossier age (10 minutes max)
    const ageMs = this.getDossierAge();
    if (ageMs > 10 * 60 * 1000) {
      result.errors.push(`Dossier too old (${Math.round(ageMs / 60000)}min)`);
      return result;
    }

    result.sessionId = dossier.sessionId;
    result.mentalModel = dossier.mentalModel;
    result.banditState = dossier.banditState || null;
    result.sviTrajectory = dossier.sviTrajectory || null;
    result.activeClaims = dossier.liveClaims;

    // Generate recovery hints
    result.recoveryHints = this.generateRecoveryHints(dossier);

    // Estimate tokens
    result.tokenEstimate = Math.ceil(JSON.stringify(result).length / 3.5);
    result.success = true;

    return result;
  }

  getSummary(): CompactRestorationSummary {
    const dossier = this.loadDossier();

    if (!dossier) {
      return {
        objective: "No dossier available",
        approach: "",
        nextSteps: [],
        blockers: [],
        sviPsi: null,
        banditTopArm: null,
        claims: [],
        hints: ["Run /precompact before compaction to preserve context"],
      };
    }

    return {
      objective: dossier.mentalModel.currentObjective,
      approach: dossier.mentalModel.approachTaken,
      nextSteps: dossier.mentalModel.nextSteps.slice(0, 3),
      blockers: dossier.mentalModel.blockers,
      sviPsi: dossier.sviTrajectory?.currentPsi || null,
      banditTopArm: dossier.banditState?.topArm || null,
      claims: dossier.liveClaims.map((c) => `${c.track}:${c.milestone || "root"}`),
      hints: this.generateRecoveryHints(dossier),
    };
  }

  formatForInjection(): string {
    const summary = this.getSummary();
    const lines: string[] = [];

    lines.push("## Post-Compaction Context");
    lines.push(`OBJECTIVE: ${summary.objective}`);
    if (summary.approach) {
      lines.push(`APPROACH: ${summary.approach}`);
    }

    if (summary.nextSteps.length > 0) {
      lines.push(`NEXT: ${summary.nextSteps.join("; ")}`);
    }

    if (summary.blockers.length > 0) {
      lines.push(`BLOCKERS: ${summary.blockers.join("; ")}`);
    }

    if (summary.sviPsi !== null) {
      lines.push(`SVI: ψ=${summary.sviPsi.toFixed(3)}`);
    }

    if (summary.banditTopArm) {
      lines.push(`BANDIT: top=${summary.banditTopArm}`);
    }

    if (summary.claims.length > 0) {
      lines.push(`CLAIMS: ${summary.claims.join(", ")}`);
    }

    if (summary.hints.length > 0) {
      lines.push("");
      lines.push("HINTS:");
      for (const hint of summary.hints) {
        lines.push(`- ${hint}`);
      }
    }

    return lines.join("\n");
  }

  private generateRecoveryHints(dossier: PrecompactDossier): string[] {
    const hints: string[] = [];

    // Context usage warning
    if (dossier.contextUsage.percentUsed > 85) {
      hints.push("Context was >85% — stay token-efficient");
    }

    // Pending todos
    const pendingTodos = dossier.openTodos.filter((t) => t.status === "pending");
    if (pendingTodos.length > 0) {
      hints.push(`${pendingTodos.length} pending TODOs`);
    }

    // Blocked todos
    const blockedTodos = dossier.openTodos.filter((t) => t.status === "blocked");
    if (blockedTodos.length > 0) {
      hints.push(`${blockedTodos.length} blocked TODOs — resolve blockers`);
    }

    // Recent errors
    const recentErrors = dossier.recentToolOutcomes.filter(
      (t) => t.status === "error"
    );
    if (recentErrors.length > 0) {
      hints.push(`${recentErrors.length} recent errors`);
    }

    // Uncommitted changes
    if (dossier.diffSummary.uncommittedChanges) {
      hints.push(`${dossier.diffSummary.filesChanged} uncommitted files`);
    }

    // SVI gap warning
    if (dossier.sviTrajectory) {
      const gap = dossier.sviTrajectory.targetPsi - dossier.sviTrajectory.currentPsi;
      if (gap > 0.1) {
        const topGap = dossier.sviTrajectory.targets
          .filter((t) => t.gap > 0.05)
          .sort((a, b) => b.gap - a.gap)[0];
        if (topGap) {
          hints.push(`SVI gap: ${topGap.name} needs ${(topGap.gap * 100).toFixed(0)}%`);
        }
      }
    }

    return hints;
  }

  clearDossier(): void {
    if (this.hasDossier()) {
      fs.unlinkSync(this.dossierPath);
    }
  }
}

export const postCompactRestorationEngine = new PostCompactRestorationEngine();
