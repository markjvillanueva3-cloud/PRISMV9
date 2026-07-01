/**
 * ZuluSoulEvolutionAdvisorEngine -- C8 (ZULU fleet, HZD-NEW-06).
 *
 * Outcome-based soul evolution -- ADVISORY ONLY. PRISM slot souls
 * (state/shared/slot-souls/<slot>.md) are static YAML, amended only by manual operator
 * edits, so the fleet's routing table drifts from reality as slots accumulate real
 * expertise. This engine reads C7 AttestationScores (outcome-correlated trust) + the
 * current soul and PROPOSES amendments to the soul's `domain_filter` -- e.g. "slot foxtrot
 * declares `lathe` but has a 0.20 empirical success rate over 25 tasks: propose REMOVING
 * lathe from its domain_filter" or "slot kilo is undeclared in `cam` but proven (24/25):
 * propose ADDING cam".
 *
 * CRITICAL SAFETY -- NEVER auto-amends, NEVER touches refuse_list:
 *   - There is NO apply path in this engine. Every proposal carries
 *     operator_approval_required=true + auto_apply=false and is emitted to a durable
 *     append-only ledger (state/shared/soul-amendment-proposals.jsonl) for operator review.
 *   - The change-type enum is strictly { add_domain | remove_domain | flag_for_review };
 *     it has NO refuse_list / safety-gate mutation. A soul amendment that removed a
 *     refuse_list entry (e.g. "do not touch scrutiny gates") would be a safety violation,
 *     so this engine CANNOT express one.
 *   - Defense-in-depth: isSafeAmendment() additionally DROPS (and records as `refused`) any
 *     proposal whose domain matches a SAFETY_SENSITIVE pattern (safety/scrutiny/refuse/
 *     compliance/gate/physics/security) or that collides with the soul's refuse_list -- so
 *     even a domain-affinity proposal can never nudge a slot off safety coverage.
 *   - Proposals are gated on C7 confidence in {moderate, high} AND sample_n >= minProposalN
 *     (default 20): thin evidence never churns a soul.
 *
 * Pure-core (heavily tested, no IO): proposeAmendments / isSafeAmendment. Durable methods
 * (emit / listProposals) use an APPEND-ONLY JSONL ledger (O_APPEND line append; fail-soft
 * read skips malformed lines, never clobbers). renderForChat() produces the human-readable
 * AGENT_CHAT advisory the CALLER posts -- the engine never auto-writes the shared chat bus.
 *
 * @module engines/ZuluSoulEvolutionAdvisorEngine
 * @unit ZULU/C8-SOUL-EVOLUTION-ADVISOR
 */

import * as fs from "fs";
import * as path from "path";
import type { SlotSoul } from "./SoulFrontmatterReaderEngine.js";
import type { AttestationScore, AttestationConfidence } from "./ZuluCapabilityAttestationEngine.js";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LEDGER_PATH = "H:/prism/state/shared/soul-amendment-proposals.jsonl";
const SLOT_RE = /^[a-z][a-z0-9-]{1,31}$/i;
const DOMAIN_RE = /^[a-z][a-z0-9_-]{1,47}$/i;
// Domains that must NEVER be auto-proposed for add OR removal -- nudging a slot's safety
// coverage is itself a safety event. A superset guard around the (already-safe) enum.
const SAFETY_SENSITIVE = /safety|scrutiny|refuse|complian|gate|physics|security|hard.?block|veto|authority/i;

const DEFAULTS = Object.freeze({
  minProposalN: 20, // C7 sample floor before a soul amendment is even proposed
  addCiLowerThreshold: 0.7, // undeclared competence must be strongly proven to propose adding
});

// ============================================================================
// Types (exported for dispatcher + tests)
// ============================================================================

export type SoulChangeType = "add_domain" | "remove_domain" | "flag_for_review";

export interface SoulAmendmentProposal {
  slot: string;
  change_type: SoulChangeType;
  /** The ONLY mutable field a proposal may target. Never refuse_list. */
  target_field: "domain_filter";
  domain: string;
  rationale: string;
  evidence: {
    empirical_success_rate: number;
    sample_n: number;
    ci_lower: number;
    ci_upper: number;
    confidence: AttestationConfidence;
  };
  confidence: AttestationConfidence;
  /** ALWAYS true -- a human must approve. */
  operator_approval_required: true;
  /** ALWAYS false -- this engine has no apply path. */
  auto_apply: false;
  proposed_at: string;
}

export interface RefusedAmendment {
  slot: string;
  domain: string;
  intended_change: SoulChangeType;
  refused_reason: string;
}

export interface ProposeResult {
  proposals: SoulAmendmentProposal[];
  /** Candidate amendments dropped by the safety guard (audit trail). */
  refused: RefusedAmendment[];
}

export interface ProposeOpts {
  now?: string;
  minProposalN?: number;
  addCiLowerThreshold?: number;
}

// ============================================================================
// Engine
// ============================================================================

class ZuluSoulEvolutionAdvisorEngine {
  private static instance: ZuluSoulEvolutionAdvisorEngine;
  private readonly ledgerPath: string;

  private constructor(ledgerPath?: string) {
    this.ledgerPath = ledgerPath || process.env.PRISM_ZULU_SOUL_PROPOSALS_PATH || DEFAULT_LEDGER_PATH;
  }

  static getInstance(): ZuluSoulEvolutionAdvisorEngine {
    if (!ZuluSoulEvolutionAdvisorEngine.instance) {
      ZuluSoulEvolutionAdvisorEngine.instance = new ZuluSoulEvolutionAdvisorEngine();
    }
    return ZuluSoulEvolutionAdvisorEngine.instance;
  }

  /** Isolated instance bound to a specific ledger path. Tests only. */
  static __forTests(ledgerPath: string): ZuluSoulEvolutionAdvisorEngine {
    return new ZuluSoulEvolutionAdvisorEngine(ledgerPath);
  }

  getLedgerPath(): string {
    return this.ledgerPath;
  }

  // --------------------------------------------------------------------------
  // PURE CORE (no IO)
  // --------------------------------------------------------------------------

  /**
   * Safety guard. A candidate amendment is SAFE only when its domain is a well-formed,
   * non-safety-sensitive token that does NOT collide with the soul's refuse_list. Pure.
   * Returns the refusal reason string, or null when safe.
   */
  static isSafeAmendment(domain: string, soul: SlotSoul | null): string | null {
    if (typeof domain !== "string" || !DOMAIN_RE.test(domain)) return `malformed domain: ${JSON.stringify(domain)}`;
    if (SAFETY_SENSITIVE.test(domain)) return `safety-sensitive domain refused: ${domain}`;
    const refuses = soul && Array.isArray(soul.refuse_list) ? soul.refuse_list : [];
    for (const r of refuses) {
      if (typeof r === "string" && r.toLowerCase().includes(domain.toLowerCase())) {
        return `domain collides with a refuse_list entry: ${r}`;
      }
    }
    return null;
  }

  /**
   * Propose soul amendments for one slot from its C7 AttestationScores + current soul. Pure.
   *
   * - over_claim (declared + empirically discredited, sufficient n, confidence>=moderate)
   *   -> remove_domain proposal.
   * - undeclared but strongly proven (ci_lower >= addCiLowerThreshold, confidence>=moderate)
   *   -> add_domain proposal.
   * Every candidate passes through isSafeAmendment(); failures land in `refused`.
   */
  static proposeAmendments(
    slot: string,
    scores: ReadonlyArray<AttestationScore>,
    soul: SlotSoul | null,
    opts: ProposeOpts = {},
  ): ProposeResult {
    const proposals: SoulAmendmentProposal[] = [];
    const refused: RefusedAmendment[] = [];
    const minN = opts.minProposalN ?? DEFAULTS.minProposalN;
    const addThreshold = opts.addCiLowerThreshold ?? DEFAULTS.addCiLowerThreshold;
    const proposedAt = typeof opts.now === "string" ? opts.now : new Date().toISOString();
    const rows = Array.isArray(scores) ? scores : [];

    for (const s of rows) {
      if (!s || s.slot !== slot) continue;
      const sufficient = s.sample_n >= minN && (s.confidence === "moderate" || s.confidence === "high");
      if (!sufficient) continue;

      let changeType: SoulChangeType | null = null;
      let rationale = "";
      if (s.declared_affinity && s.over_claim) {
        changeType = "remove_domain";
        rationale = `Declares "${s.domain}" but empirical success is ${(s.empirical_success_rate * 100).toFixed(0)}% `
          + `(${s.successes}/${s.sample_n}, 95% CI lower ${s.ci_lower.toFixed(2)} < 0.50). Over-claim: propose removing from domain_filter.`;
      } else if (!s.declared_affinity && s.ci_lower >= addThreshold) {
        changeType = "add_domain";
        rationale = `Undeclared in "${s.domain}" but proven: ${(s.empirical_success_rate * 100).toFixed(0)}% `
          + `(${s.successes}/${s.sample_n}, 95% CI lower ${s.ci_lower.toFixed(2)} >= ${addThreshold.toFixed(2)}). Propose adding to domain_filter.`;
      }
      if (!changeType) continue;

      const refusedReason = ZuluSoulEvolutionAdvisorEngine.isSafeAmendment(s.domain, soul);
      if (refusedReason) {
        refused.push({ slot, domain: s.domain, intended_change: changeType, refused_reason: refusedReason });
        continue;
      }

      proposals.push({
        slot,
        change_type: changeType,
        target_field: "domain_filter",
        domain: s.domain,
        rationale,
        evidence: {
          empirical_success_rate: s.empirical_success_rate,
          sample_n: s.sample_n,
          ci_lower: s.ci_lower,
          ci_upper: s.ci_upper,
          confidence: s.confidence,
        },
        confidence: s.confidence,
        operator_approval_required: true,
        auto_apply: false,
        proposed_at: proposedAt,
      });
    }
    return { proposals, refused };
  }

  /** Human-readable AGENT_CHAT advisory block. The CALLER posts it -- engine never writes the bus. */
  static renderForChat(proposals: ReadonlyArray<SoulAmendmentProposal>): string {
    if (!Array.isArray(proposals) || proposals.length === 0) return "[soul-evolution] no amendment proposals.";
    const lines = ["[soul-evolution] ADVISORY -- operator approval required (NEVER auto-applied):"];
    for (const p of proposals) {
      lines.push(`  - ${p.slot}: ${p.change_type} "${p.domain}" (domain_filter) -- ${p.rationale}`);
    }
    return lines.join("\n");
  }

  // --------------------------------------------------------------------------
  // Durable API -- APPEND-ONLY ledger (no apply path)
  // --------------------------------------------------------------------------

  /**
   * Propose for a slot from C7 AttestationScores supplied by the caller. The C7->C8
   * composition lives at the dispatcher (it awaits ZuluCapabilityAttestationEngine.attestAll
   * and passes `scores` here) so this engine stays ESM-pure and decoupled -- it never
   * imports C7 at runtime. Thin convenience over proposeAmendments().
   */
  proposeForSlot(
    slot: string,
    opts: ProposeOpts & { soul?: SlotSoul | null; scores?: ReadonlyArray<AttestationScore> } = {},
  ): ProposeResult {
    const scores = Array.isArray(opts.scores) ? opts.scores : [];
    return ZuluSoulEvolutionAdvisorEngine.proposeAmendments(slot, scores, opts.soul ?? null, opts);
  }

  /** Append proposals to the durable append-only ledger. Returns count written. */
  emit(proposals: ReadonlyArray<SoulAmendmentProposal>, opts: { now?: string } = {}): { ok: boolean; written: number; reason?: string } {
    const rows = Array.isArray(proposals) ? proposals.filter((p) => this.isValidProposal(p)) : [];
    if (rows.length === 0) return { ok: true, written: 0 };
    const emittedAt = typeof opts.now === "string" ? opts.now : new Date().toISOString();
    try {
      fs.mkdirSync(path.dirname(this.ledgerPath), { recursive: true });
      // O_APPEND line-append -- the right primitive for an append-only ledger (atomic per
      // line across writers; never read-modify-write, so no lost-update / clobber).
      const payload = rows.map((p) => JSON.stringify({ ...p, emitted_at: emittedAt })).join("\n") + "\n";
      fs.appendFileSync(this.ledgerPath, payload, { encoding: "utf8", flag: "a" });
      return { ok: true, written: rows.length };
    } catch (e) {
      return { ok: false, written: 0, reason: `ledger append failed: ${(e as Error)?.message}` };
    }
  }

  /** Read the proposals ledger (fail-soft: skips malformed lines, never clobbers). */
  listProposals(opts: { slot?: string } = {}): { ok: boolean; count: number; proposals: Array<SoulAmendmentProposal & { emitted_at?: string }> } {
    if (!fs.existsSync(this.ledgerPath)) return { ok: true, count: 0, proposals: [] };
    let raw: string;
    try {
      raw = fs.readFileSync(this.ledgerPath, "utf8");
    } catch {
      return { ok: true, count: 0, proposals: [] };
    }
    const out: Array<SoulAmendmentProposal & { emitted_at?: string }> = [];
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const p = JSON.parse(line) as SoulAmendmentProposal & { emitted_at?: string };
        if (this.isValidProposal(p) && (!opts.slot || p.slot === opts.slot)) out.push(p);
      } catch {
        /* skip malformed line (fail-soft) */
      }
    }
    return { ok: true, count: out.length, proposals: out };
  }

  private isValidProposal(p: unknown): p is SoulAmendmentProposal {
    if (typeof p !== "object" || p === null) return false;
    const x = p as Partial<SoulAmendmentProposal>;
    return typeof x.slot === "string" && SLOT_RE.test(x.slot)
      && (x.change_type === "add_domain" || x.change_type === "remove_domain" || x.change_type === "flag_for_review")
      && x.target_field === "domain_filter"
      && typeof x.domain === "string"
      && x.operator_approval_required === true
      && x.auto_apply === false;
  }
}

export { ZuluSoulEvolutionAdvisorEngine };
export const zuluSoulEvolutionAdvisorEngine = ZuluSoulEvolutionAdvisorEngine.getInstance();
