/**
 * WEDM SVI Hooks — Phase 0.10 of WEDM AGI Roadmap
 *
 * 2 WEDM-specific SVI coupling hooks:
 *   - wedm-svi-inject: Session-start Ψ injection (logging)
 *   - wedm-svi-milestone-gate: Milestone Ψ-delta gate (blocking)
 *
 * @version 1.0.0
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookBlock,
} from "../engines/HookExecutor.js";
import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

const SVI_SURFACES_PATH = path.resolve(
  process.cwd(),
  "data/state/WEDM_SVI_SURFACES.json"
);

function loadSVISurfaces(): any {
  try {
    if (fs.existsSync(SVI_SURFACES_PATH)) {
      return JSON.parse(fs.readFileSync(SVI_SURFACES_PATH, "utf-8"));
    }
  } catch (err) {
    log.warn("WEDMSVIHooks", `Could not load SVI surfaces: ${err}`);
  }
  return { psi: { current: 0 }, surfaces: {} };
}

function calculateWEDMPsi(surfaces: any): number {
  let psi = 0;
  let totalWeight = 0;
  for (const [, surface] of Object.entries(surfaces.surfaces ?? {})) {
    const s = surface as any;
    const ratio = Math.min((s.current ?? 0) / (s.target || 1), 1.0);
    psi += ratio * (s.psi_weight ?? 0);
    totalWeight += s.psi_weight ?? 0;
  }
  return totalWeight > 0 ? psi / totalWeight : 0;
}

/**
 * Hook: hook_wedm_svi_inject
 * Trigger: SessionStart
 * Injects WEDM Ψ contribution into session brief
 */
const wedmSviInject: HookDefinition = {
  id: "wedm-svi-inject",
  name: "WEDM SVI Contribution Injector",
  description:
    "Injects WEDM Ψ (Psi) contribution into session briefs so Claude is aware of WEDM completeness.",
  phase: "session-start",
  category: "observability",
  mode: "logging",
  priority: "normal",
  enabled: true,
  tags: ["wedm", "svi", "injection", "logging"],
  handler: (ctx: HookContext): HookResult => {
    const surfaces = loadSVISurfaces();
    const psi = calculateWEDMPsi(surfaces);

    const summary = {
      wedm_psi: psi,
      wedm_target: 1.0,
      wedm_gap: 1.0 - psi,
      surfaces_tracked: Object.keys(surfaces.surfaces ?? {}).length,
      lastCalculated: new Date().toISOString(),
    };

    log.info("wedm-svi-inject", `WEDM Ψ=${psi.toFixed(3)} injected into session`);

    return hookSuccess(wedmSviInject, `WEDM Ψ contribution: ${(psi * 100).toFixed(1)}%`, {
      data: summary,
    });
  },
};

/**
 * Hook: hook_wedm_svi_milestone_gate
 * Trigger: PostTool wedm_milestone_complete
 * Blocks WEDM milestone if net-zero Ψ delta
 */
const wedmSviMilestoneGate: HookDefinition = {
  id: "wedm-svi-milestone-gate",
  name: "WEDM SVI Milestone Ψ-Delta Gate",
  description:
    "Blocks WEDM milestone acceptance if Ψ delta is below threshold (default 0.005).",
  phase: "post-tool",
  category: "enforcement",
  mode: "blocking",
  priority: "high",
  enabled: true,
  tags: ["wedm", "svi", "milestone", "gate", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";

    // Only fire on milestone completions
    if (!action.includes("milestone") && !action.includes("phase_complete")) {
      return hookSuccess(wedmSviMilestoneGate, "Not a milestone action", { skipped: true });
    }

    const surfaces = loadSVISurfaces();
    const gate = surfaces.milestoneGate ?? { minPsiDelta: 0.005, blockIfNetZero: true };

    const psiDelta = d.psiDelta ?? d.psi_delta ?? 0;

    if (gate.blockIfNetZero && psiDelta <= 0) {
      log.error("wedm-svi-milestone-gate", `BLOCKED: Net-zero Ψ delta (${psiDelta})`);
      return hookBlock(
        wedmSviMilestoneGate,
        `WEDM milestone blocked: Ψ delta ${psiDelta} at or below zero — no value added`,
        { data: { psiDelta, threshold: gate.minPsiDelta } }
      );
    }

    if (psiDelta < gate.minPsiDelta) {
      log.warn(
        "wedm-svi-milestone-gate",
        `Ψ delta ${psiDelta} below threshold ${gate.minPsiDelta}`
      );
      return hookBlock(
        wedmSviMilestoneGate,
        `WEDM milestone blocked: Ψ delta ${psiDelta} below minimum ${gate.minPsiDelta}`,
        { data: { psiDelta, threshold: gate.minPsiDelta } }
      );
    }

    return hookSuccess(
      wedmSviMilestoneGate,
      `Milestone accepted: Ψ delta ${psiDelta.toFixed(4)}`,
      { data: { psiDelta, threshold: gate.minPsiDelta } }
    );
  },
};

/**
 * All WEDM SVI Hooks (2)
 */
export const wedmSVIHooks: HookDefinition[] = [wedmSviInject, wedmSviMilestoneGate];
