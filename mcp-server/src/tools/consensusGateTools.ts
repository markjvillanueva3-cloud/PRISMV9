/**
 * consensusGateTools.ts — `prism_safety:consensus_gate` action handler.
 *
 * Round-trip surface for the PRISMConsensusGateEngine. The dispatcher action
 * accepts JSON, so providers cannot cross the wire as instances. The panel is
 * registered once per process via `setConsensusPanel()` and resolved by the
 * handler on every call. Production registration lands in P4-U05 (manufacturing
 * personas + persona-weighted voting); P4-U02 ships the wiring + arbitration
 * substrate so the dispatcher action can actually fire.
 *
 * Non-unanimous decisions persist a `consensus-dissent` event to
 * `state/shared/AGENT_CONFLICT_ARBITRATION.json` via the same lock-protected
 * append used by the P5 arbitration log. This is the "dissent records on
 * non-unanimous decisions" exit condition for P4-U02.
 *
 * P4-U02, INTEL-OLLAMA-OBSIDIAN-MS1.
 */

import {
  PRISMConsensusGateEngine,
  prismConsensusGateEngine,
  type QuorumProvider,
  type QuorumResult,
} from "../engines/PRISMConsensusGateEngine.js";
import { appendArbitrationEvent } from "../utils/arbitrationWriter.js";

// ─────────────────────────────────────────────────────────────────
// Pluggable panel registry
// ─────────────────────────────────────────────────────────────────

/**
 * Process-wide consensus panel. Production wiring (P4-U05) replaces this with
 * the 5 manufacturing-persona provider implementations. Tests inject a
 * deterministic panel before calling `handleConsensusGate`.
 *
 * Use `setConsensusPanel(null)` in test cleanup to restore the unset state.
 */
let activePanel: QuorumProvider[] | null = null;

export function setConsensusPanel(panel: QuorumProvider[] | null): void {
  if (panel === null) {
    activePanel = null;
    return;
  }
  if (!Array.isArray(panel) || panel.length === 0) {
    throw new Error("setConsensusPanel: panel must be a non-empty array");
  }
  activePanel = panel;
}

export function getConsensusPanel(): QuorumProvider[] | null {
  return activePanel;
}

// ─────────────────────────────────────────────────────────────────
// Engine binding
// ─────────────────────────────────────────────────────────────────

let activeEngine: PRISMConsensusGateEngine = prismConsensusGateEngine;

/** Test-only — replace the engine instance (e.g., to use a custom timeout). */
export function setConsensusEngine(engine: PRISMConsensusGateEngine): void {
  activeEngine = engine;
}

export function resetConsensusEngine(): void {
  activeEngine = prismConsensusGateEngine;
}

// ─────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────

export interface ConsensusGateContext {
  sessionId?: string;
  commitHash?: string;
  files?: string[];
  note?: string;
}

export interface ConsensusGateParams {
  /** The text/diff/code to put up for quorum review. */
  input: string;
  /**
   * Optional context for the arbitration log entry — propagates to the
   * persisted event so we can correlate dissent with the originating commit
   * / file / chat session.
   */
  context?: ConsensusGateContext;
}

export interface ConsensusGateActionResult extends QuorumResult {
  arbitrationLogged: boolean;
}

const NON_UNANIMOUS_EVENT_KIND = "consensus-dissent";

export async function handleConsensusGate(
  params: ConsensusGateParams
): Promise<ConsensusGateActionResult> {
  if (!params || typeof params !== "object") {
    throw new Error("consensus_gate: params must be an object");
  }
  if (typeof params.input !== "string" || params.input.length === 0) {
    throw new Error("consensus_gate: input must be a non-empty string");
  }
  const panel = activePanel;
  if (!panel) {
    throw new Error(
      "consensus_gate: no panel registered — call setConsensusPanel() (production: P4-U05 personas)"
    );
  }

  const result = await activeEngine.vote(params.input, panel);

  let arbitrationLogged = false;
  // Persist on any non-unanimous outcome (REFUSED, FAIL, CONDITIONAL, or PASS
  // with dissent). PASS with empty dissent and empty flagsSurfaced is the only
  // case that does not log — clean unanimous reviews stay quiet.
  const dirty =
    result.decision === "REFUSED" ||
    result.dissent.length > 0 ||
    result.flagsSurfaced.length > 0 ||
    result.decision !== "PASS";
  if (dirty) {
    try {
      await appendArbitrationEvent({
        kind: NON_UNANIMOUS_EVENT_KIND,
        sessionId: params.context?.sessionId,
        details: {
          decision: result.decision,
          reason: result.reason,
          votes: result.votes,
          validProviders: result.validProviders,
          totalProviders: result.totalProviders,
          partialQuorum: result.partialQuorum,
          cloudPresent: result.cloudPresent,
          flagsSurfaced: result.flagsSurfaced,
          dissentCount: result.dissent.length,
          cacheKey: result.cacheKey,
          cacheHit: result.cacheHit,
          providers: result.results.map((r) => ({
            id: r.providerId,
            kind: r.kind,
            valid: r.valid,
            decision: r.verdict?.decision,
            error: r.error,
          })),
          context: params.context ?? null,
        },
      });
      arbitrationLogged = true;
    } catch (err) {
      // Logging must NEVER mask a quorum decision. Persist the failure as a
      // structured warning on the result rather than throwing.
      const message = err instanceof Error ? err.message : String(err);
      result.flagsSurfaced.push(`arbitration-write-failed: ${message}`);
    }
  }

  return { ...result, arbitrationLogged };
}
