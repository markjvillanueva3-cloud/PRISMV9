#!/usr/bin/env npx ts-node
/**
 * postcompact-restore.ts — U-CTX04 PostCompact Restoration Cascade
 *
 * Reads the precompact dossier and generates restoration context
 * for injection after compaction. Restores mental model, bandit state,
 * SVI trajectory, and active work claims.
 *
 * Usage:
 *   npx ts-node scripts/postcompact-restore.ts [dossier-path]
 *   npx ts-node scripts/postcompact-restore.ts --json
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
} from "../src/schemas/precompactDossierSchema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_DIR = path.resolve(__dirname, "../data/state");
const DEFAULT_DOSSIER = path.join(STATE_DIR, "PRECOMPACT_DOSSIER.json");

interface RestorationContext {
  sessionId: string;
  restoredAt: string;
  mentalModel: MentalModel;
  banditState: BanditState | null;
  sviSummary: string | null;
  activeClaims: string[];
  recoveryHints: string[];
  tokenEstimate: number;
}

function formatMentalModel(model: MentalModel): string {
  const lines: string[] = [];
  lines.push(`OBJECTIVE: ${model.currentObjective}`);
  lines.push(`APPROACH: ${model.approachTaken}`);

  if (model.keyDecisions.length > 0) {
    lines.push(`DECISIONS: ${model.keyDecisions.slice(0, 3).join("; ")}`);
  }
  if (model.blockers.length > 0) {
    lines.push(`BLOCKERS: ${model.blockers.join("; ")}`);
  }
  if (model.nextSteps.length > 0) {
    lines.push(`NEXT: ${model.nextSteps.slice(0, 3).join("; ")}`);
  }

  return lines.join(" | ");
}

function formatBanditState(state: BanditState): string {
  const topArms = state.arms
    .sort((a, b) => b.meanReward - a.meanReward)
    .slice(0, 3)
    .map((a) => `${a.armName}(μ=${a.meanReward.toFixed(2)})`)
    .join(", ");
  return `${state.algorithm} bandit: ${state.totalPulls} pulls, top=[${topArms}]`;
}

function formatSVITrajectory(svi: SVITrajectory): string {
  const gap = svi.targetPsi - svi.currentPsi;
  const direction = svi.velocity > 0 ? "↑" : svi.velocity < 0 ? "↓" : "→";
  const topGaps = svi.targets
    .filter((t) => t.gap > 0.05)
    .slice(0, 3)
    .map((t) => `${t.name}(-${(t.gap * 100).toFixed(0)}%)`)
    .join(", ");
  return `SVI ψ=${svi.currentPsi.toFixed(3)}${direction} target=${svi.targetPsi} gaps=[${topGaps || "none"}]`;
}

function generateRecoveryHints(dossier: PrecompactDossier): string[] {
  const hints: string[] = [];

  // Context usage warning
  if (dossier.contextUsage.percentUsed > 85) {
    hints.push("Context was >85% full — stay token-efficient");
  }

  // Pending todos
  const pendingTodos = dossier.openTodos.filter((t) => t.status === "pending");
  if (pendingTodos.length > 0) {
    hints.push(`${pendingTodos.length} pending TODOs — check before starting new work`);
  }

  // Active claims to avoid collision
  if (dossier.liveClaims.length > 0) {
    hints.push(`Active claims: ${dossier.liveClaims.map((c) => c.track).join(", ")}`);
  }

  // Recent errors
  const errors = dossier.recentToolOutcomes.filter((t) => t.status === "error");
  if (errors.length > 0) {
    hints.push(`${errors.length} recent errors — check before retrying same actions`);
  }

  // Git state
  if (dossier.diffSummary.uncommittedChanges) {
    hints.push(`Uncommitted: ${dossier.diffSummary.filesChanged} files changed`);
  }

  return hints;
}

function restore(dossierPath: string): RestorationContext {
  const raw = fs.readFileSync(dossierPath, "utf-8");
  const parsed = PrecompactDossierSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    throw new Error(`Invalid dossier: ${parsed.error.errors.map((e) => e.message).join(", ")}`);
  }

  const dossier = parsed.data;

  const context: RestorationContext = {
    sessionId: dossier.sessionId,
    restoredAt: new Date().toISOString(),
    mentalModel: dossier.mentalModel,
    banditState: dossier.banditState || null,
    sviSummary: dossier.sviTrajectory ? formatSVITrajectory(dossier.sviTrajectory) : null,
    activeClaims: dossier.liveClaims.map((c) => `${c.track}:${c.milestone || "root"}`),
    recoveryHints: generateRecoveryHints(dossier),
    tokenEstimate: 0,
  };

  // Estimate tokens for the restoration context
  context.tokenEstimate = Math.ceil(JSON.stringify(context).length / 3.5);

  return context;
}

function formatForInjection(context: RestorationContext): string {
  const lines: string[] = [];
  lines.push("## Post-Compaction Restoration");
  lines.push(`Session: ${context.sessionId} | Restored: ${context.restoredAt}`);
  lines.push("");
  lines.push("### Mental Model");
  lines.push(formatMentalModel(context.mentalModel));
  lines.push("");

  if (context.banditState) {
    lines.push("### Bandit State");
    lines.push(formatBanditState(context.banditState));
    lines.push("");
  }

  if (context.sviSummary) {
    lines.push("### SVI Status");
    lines.push(context.sviSummary);
    lines.push("");
  }

  if (context.activeClaims.length > 0) {
    lines.push("### Active Claims");
    lines.push(context.activeClaims.join(", "));
    lines.push("");
  }

  if (context.recoveryHints.length > 0) {
    lines.push("### Recovery Hints");
    for (const hint of context.recoveryHints) {
      lines.push(`- ${hint}`);
    }
  }

  lines.push("");
  lines.push(`[~${context.tokenEstimate} tokens]`);

  return lines.join("\n");
}

function main(): void {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const dossierPath = args.find((a) => !a.startsWith("--")) || DEFAULT_DOSSIER;

  if (!fs.existsSync(dossierPath)) {
    console.error(`Dossier not found: ${dossierPath}`);
    console.error("Run precompact hook first to generate dossier.");
    process.exit(1);
  }

  try {
    const context = restore(dossierPath);

    if (jsonOutput) {
      console.log(JSON.stringify(context, null, 2));
    } else {
      console.log(formatForInjection(context));
    }
  } catch (err) {
    console.error(`Restoration failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main();
