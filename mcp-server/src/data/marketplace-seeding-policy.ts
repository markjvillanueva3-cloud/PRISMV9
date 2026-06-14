/**
 * marketplace-seeding-policy.ts — lead-funnel state machine for MarketplaceSeedingEngine (galaxy:business,
 * slot:hotel; PRISM networking-marketplace supply-side cold-start). Holds the lead lifecycle states + the
 * legal-transition table so the engine never inlines a status string or a transition rule.
 *
 * THE FUNNEL (upstream of SupplierOnboardingEngine): the marketplace ingests charlie's 199-vendor
 * directory corpus, lifts the machining job-shops into thin {@link SupplierCapabilityHint}s, and seeds a
 * LEAD per shop here. A lead is a DIRECTORY PROSPECT — it carries only what the directory knew (name,
 * processes, certs, region) and is intentionally NOT a SupplierCapabilityProfile (it lacks the machine
 * roster, material groups, tolerance, and geography.state a real profile needs). The shop closes that gap
 * by COMPLETING the lead into a full SupplierOnboarding application; only after onboarding's verification
 * gate does it become a live, matchable supplier. So:
 *
 *   directory hint → LEAD (invited) → [contacted] → APPLICATION (SupplierOnboarding) → verified → active
 *
 * This is the §7-Risk-1 cold-start mitigation's intake stage: we never auto-register a thin directory
 * record as a live supplier (a profile with no material/envelope/tolerance matches no RFQ and would
 * pollute the matcher); we route it through the funnel so a human shop fills the gap.
 */

export const MARKETPLACE_SEEDING_POLICY_VERSION = "1.0.0";

/** Lead lifecycle states. `applied`/`declined` are TERMINAL in this engine (onboarding owns it after). */
export const LEAD_STATUSES = ["invited", "contacted", "applied", "declined"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** A freshly seeded directory lead starts here. */
export const INITIAL_LEAD_STATUS: LeadStatus = "invited";

/**
 * Legal lead transitions. A lead may be CONTACTED (outreach logged) or go straight to APPLIED (the shop
 * completed the profile) or DECLINED (shop opted out / platform dropped). `applied` and `declined` are
 * terminal — once a lead has become a SupplierOnboarding application (applied) or been declined, the lead
 * engine has no further edge (the onboarding state machine takes over from `applied`).
 */
const LEAD_TRANSITIONS: Readonly<Record<LeadStatus, ReadonlyArray<LeadStatus>>> = Object.freeze({
  invited: Object.freeze(["contacted", "applied", "declined"] as LeadStatus[]),
  contacted: Object.freeze(["applied", "declined"] as LeadStatus[]),
  applied: Object.freeze([] as LeadStatus[]),
  declined: Object.freeze([] as LeadStatus[]),
});

/** Is `from → to` a legal lead transition? */
export function isLegalLeadTransition(from: LeadStatus, to: LeadStatus): boolean {
  return LEAD_TRANSITIONS[from]?.includes(to) ?? false;
}
