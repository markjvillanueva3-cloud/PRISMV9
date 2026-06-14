/**
 * ZuluFleetGovernorEngine — HZD-02 (HZP-DASH-MS0)
 *
 * Pure-core authority gate. Given a (slot, soul, task_text) tuple, returns
 * { authorized, reason } based on the slot's hermes_role / domain_filter /
 * refuse_list. The dashboard control server consults this BEFORE any
 * state-changing operation (assign / veto / promote-refuse). Keeps the
 * authority logic deterministic, testable, and free of side effects.
 *
 * Authority rules:
 *   1. Refuse-list hit (task_text matches any refuse rule, substring-ci) → REJECT.
 *   2. Domain filter set + task_text matches → ACCEPT (positive authority).
 *   3. Domain filter set + task_text does NOT match → REJECT (out of role).
 *   4. No domain_filter on the soul → ACCEPT only if soul.hermes_role is
 *      explicitly "fleet-orchestrator" / "generalist"; else REJECT (a slot
 *      with no domain filter and no orchestrator role has no authority).
 *
 * R12 fail-CLOSED: a malformed regex in domain_filter does NOT fall through to
 * the orchestrator rule (4) — that would grant authority to any orchestrator-
 * roled slot despite the author's clear intent to gate via domain match. Instead
 * it REJECTS with reason `domain-filter-malformed:<pattern>` so the audit log
 * captures the YAML defect (hardened 2026-05-25 by scrutiny arm B). Never throws
 * on input — invalid inputs surface as authorized=false with a structured reason.
 */
import { z } from "zod";
import type { SlotSoul } from "./SoulFrontmatterReaderEngine.js";

export const AuthorityCheckRequestSchema = z.object({
  slot: z.string().min(1),
  task_text: z.string().min(1),
  operation: z.enum(["assign", "veto", "promote-refuse", "adopt-doctrine", "escalate", "bus-send"]),
});
export type AuthorityCheckRequest = z.infer<typeof AuthorityCheckRequestSchema>;

export interface AuthorityVerdict {
  authorized: boolean;
  reason: string;
  matched_refuse?: string;
  matched_domain?: boolean;
  hermes_role?: string;
}

const ORCHESTRATOR_ROLES = new Set([
  "fleet-orchestrator",
  "generalist",
  "hermes-router",
  "zulu-orchestrator",
]);

function safeRegex(src: string): RegExp | null {
  try { return new RegExp(src, "i"); } catch { return null; }
}

function matchesAnyRefuse(taskText: string, refuses: readonly string[]): string | null {
  const lower = taskText.toLowerCase();
  for (const r of refuses) {
    const needle = String(r || "").toLowerCase().trim();
    if (needle && lower.includes(needle)) return r;
  }
  return null;
}

export class ZuluFleetGovernorEngine {
  /**
   * Check whether `slot` is authorized to perform `operation` on `task_text`
   * given its soul. Bus-send + adopt-doctrine + escalate are always allowed
   * (informational ops); assign/veto/promote-refuse are domain-gated.
   */
  static checkAuthority(reqRaw: AuthorityCheckRequest, soul: SlotSoul | null): AuthorityVerdict {
    const req = AuthorityCheckRequestSchema.parse(reqRaw);

    // Informational operations bypass domain gating (still subject to refuse rules).
    const informational = req.operation === "bus-send" || req.operation === "adopt-doctrine" || req.operation === "escalate";

    if (!soul) {
      return informational
        ? { authorized: true, reason: "informational-op-no-soul-required" }
        : { authorized: false, reason: `no-soul-resolved-for-slot:${req.slot}` };
    }

    // Rule 1 — refuse-list hit kills everything.
    const refuseHit = matchesAnyRefuse(req.task_text, soul.refuse_list || []);
    if (refuseHit) {
      return {
        authorized: false,
        reason: `refuse-rule-veto:${refuseHit}`,
        matched_refuse: refuseHit,
        hermes_role: soul.hermes_role,
      };
    }

    if (informational) {
      return { authorized: true, reason: "informational-op-cleared", hermes_role: soul.hermes_role };
    }

    // Rules 2-3 — domain authority.
    const dfRaw = soul.domain_filter || "";
    const df = dfRaw.trim();
    if (df) {
      const re = safeRegex(df);
      // P1 fix (2026-05-25 scrutiny arm B): bad regex must NOT silently fall through
      // to the orchestrator rule. A YAML typo in domain_filter would otherwise grant
      // authority to any orchestrator-roled slot despite the author's clear intent
      // to gate via domain match. Fail-closed: malformed filter → REJECT with reason
      // naming the malformed pattern so the audit log captures the YAML defect.
      if (!re) {
        return {
          authorized: false,
          reason: `domain-filter-malformed:${df}`,
          matched_domain: false,
          hermes_role: soul.hermes_role,
        };
      }
      if (re.test(req.task_text)) {
        return { authorized: true, reason: `domain-match:${df}`, matched_domain: true, hermes_role: soul.hermes_role };
      }
    }

    // Rule 4 — no domain filter (or no match) → only orchestrator roles cleared.
    if (ORCHESTRATOR_ROLES.has(String(soul.hermes_role || "").toLowerCase())) {
      return { authorized: true, reason: `orchestrator-role:${soul.hermes_role}`, hermes_role: soul.hermes_role };
    }

    return {
      authorized: false,
      reason: df ? `domain-mismatch:${df}` : "no-domain-filter-and-not-orchestrator",
      matched_domain: false,
      hermes_role: soul.hermes_role,
    };
  }

  static renderVerdict(v: AuthorityVerdict): string {
    const tag = v.authorized ? "[AUTH OK]" : "[AUTH DENY]";
    const role = v.hermes_role ? ` role=${v.hermes_role}` : "";
    return `${tag} ${v.reason}${role}`;
  }
}
