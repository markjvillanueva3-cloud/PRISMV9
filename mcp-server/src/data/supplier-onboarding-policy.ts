/**
 * supplier-onboarding-policy.ts — constants & policy vocabulary for the SUPPLY-SIDE acquisition flow
 * of the PRISM manufacturing networking marketplace (galaxy:business, slot:hotel).
 *
 * This is the SINGLE SOURCE OF TRUTH for the supplier-onboarding model's enumerations + rules:
 *   - the onboarding application lifecycle (applied → capability_verified → active | rejected | withdrawn),
 *   - the legal state transitions of that lifecycle (an adjacency map — never re-derived from prose),
 *   - the set of fields a COMPLETE application must carry before it can be capability-verified,
 *   - the minimum machine count a supplier roster must declare,
 *   - the completeness rule helper that gates {@link SupplierOnboardingEngine.verifyCapability}.
 * {@link SupplierOnboardingEngine} imports these — never inline a status string, a required-field
 * name, the minimum-machine count, or a transition rule.
 *
 * DEDUP / boundary: this module owns the APPLICATION LIFECYCLE vocabulary ONLY. The capability
 * VOCABULARY (ISO 513 material groups, process networks, certs, controllers) lives in
 * {@link supplier-capability-schema.ts} and is NOT re-listed here — onboarding validates a draft
 * against that schema, it does not own it. The verified profile is stored by
 * {@link SupplierCapabilityProfileEngine}; this policy only governs the intake→verify→approve gate.
 *
 * SYMMETRY: mirrors {@link buyer-account-policy.ts}'s shape (version const, frozen status array,
 * Set-backed isValid guard) so the two-sided marketplace's policy modules read identically. Where the
 * buyer side gates on a CREDIT status with no illegal transitions, the supply side runs a true LINEAR
 * state machine (applied → capability_verified → active) with explicit terminal off-ramps — hence the
 * additional {@link ONBOARDING_TRANSITIONS} adjacency map this module carries and the buyer module
 * does not.
 *
 * Citation: 'PRISM marketplace supplier-onboarding gate; capability-verification per
 * SupplierCapabilityProfile contract.'
 *   - The applied → capability_verified → active funnel mirrors the supplier-acquisition flow used by
 *     two-sided manufacturing marketplaces (Xometry/Fictiv/Protolabs/Axhera supplier onboarding): a
 *     shop self-registers (`applied`), the platform runs a capability-verification gate against the
 *     declared machine roster / processes / tolerance (`capability_verified`), and only a verified
 *     shop is published as bookable supply (`active`). `rejected` (platform declines) and `withdrawn`
 *     (supplier opts out) are the two terminal off-ramps — records are flipped, never deleted
 *     ([[feedback_never_delete_only_disable]]). This is the §7-Risk-1 cold-start mitigation: it is
 *     what converts a raw directory record into ENGAGED supply.
 *   - The REQUIRED_APPLICATION_FIELDS set is the minimum a capability-verification gate needs to
 *     resolve "can this shop actually do a job?" against the SupplierCapabilityProfile contract:
 *     identity (companyName), location (geography), at least one process + one machine + one ISO 513
 *     material group, the shop's tightest tolerance (bestToleranceMm), and a reachable contact.
 */

export const SUPPLIER_ONBOARDING_POLICY_VERSION = "1.0.0";

// ============================================================================
// ONBOARDING LIFECYCLE (the application state machine)
// ============================================================================

/**
 * An onboarding application's lifecycle status.
 *   - applied              : self-registered; awaiting the capability-verification gate.
 *   - capability_verified  : passed the gate; ready for an operator approve.
 *   - active               : approved; a LIVE SupplierCapabilityProfile has been registered.
 *   - rejected             : platform declined the application (terminal).
 *   - withdrawn            : supplier opted out of the application (terminal).
 */
export type OnboardingStatus =
  | "applied"
  | "capability_verified"
  | "active"
  | "rejected"
  | "withdrawn";

/** The full onboarding-status taxonomy (the only legal status values). */
export const ONBOARDING_STATUSES: ReadonlyArray<OnboardingStatus> = Object.freeze([
  "applied",
  "capability_verified",
  "active",
  "rejected",
  "withdrawn",
] as const);

const ONBOARDING_STATUS_SET: ReadonlySet<string> = new Set(ONBOARDING_STATUSES);

/** Is `s` a recognized onboarding status? */
export function isValidOnboardingStatus(s: string): s is OnboardingStatus {
  return ONBOARDING_STATUS_SET.has(s);
}

/** The status a freshly-submitted application carries. */
export const INITIAL_ONBOARDING_STATUS: OnboardingStatus = "applied";

/**
 * The legal state-transition adjacency map (fail loud on anything not listed here):
 *   applied              → capability_verified | rejected | withdrawn
 *   capability_verified  → active | applied (failed re-verify drops back) | rejected | withdrawn
 *   active               → (terminal — a live profile; deactivation lives in SupplierCapabilityProfileEngine)
 *   rejected             → (terminal)
 *   withdrawn            → (terminal)
 *
 * `capability_verified → applied` is the documented re-verify-failed back-edge: if a verified
 * application is re-verified after a draft edit and now FAILS, it drops back to `applied` rather than
 * silently staying verified (fail-loud). Note verifyCapability NEVER advances on failure — it leaves
 * the status where it is and returns gaps; this back-edge only governs an explicit re-verify of an
 * already-verified record.
 */
export const ONBOARDING_TRANSITIONS: Readonly<Record<OnboardingStatus, ReadonlyArray<OnboardingStatus>>> =
  Object.freeze({
    applied: Object.freeze(["capability_verified", "rejected", "withdrawn"]) as ReadonlyArray<OnboardingStatus>,
    capability_verified: Object.freeze(["active", "applied", "rejected", "withdrawn"]) as ReadonlyArray<OnboardingStatus>,
    active: Object.freeze([]) as ReadonlyArray<OnboardingStatus>,
    rejected: Object.freeze([]) as ReadonlyArray<OnboardingStatus>,
    withdrawn: Object.freeze([]) as ReadonlyArray<OnboardingStatus>,
  });

/** The terminal statuses (no outbound transition). Derived from the adjacency map — never re-listed. */
export const TERMINAL_ONBOARDING_STATUSES: ReadonlyArray<OnboardingStatus> = Object.freeze(
  ONBOARDING_STATUSES.filter((s) => ONBOARDING_TRANSITIONS[s].length === 0),
);

/** Is the transition `from → to` legal per {@link ONBOARDING_TRANSITIONS}? */
export function isLegalTransition(from: OnboardingStatus, to: OnboardingStatus): boolean {
  return ONBOARDING_TRANSITIONS[from]?.includes(to) ?? false;
}

// ============================================================================
// APPLICATION COMPLETENESS (the capability-verification gate's required-field set)
// ============================================================================

/**
 * The fields a COMPLETE application must carry before {@link SupplierOnboardingEngine.verifyCapability}
 * can pass it. These are the minimum a capability-verification gate needs to resolve "can this shop do
 * a job?" against the {@link SupplierCapabilityProfile} contract. Each name is a key the gate asserts
 * is present + non-empty on the profile draft (machines/processes/materialGroups assert length >= the
 * relevant minimum; bestToleranceMm asserts finite & > 0; contact asserts a reachable email).
 */
export const REQUIRED_APPLICATION_FIELDS: ReadonlyArray<string> = Object.freeze([
  "companyName",
  "geography",
  "processes",
  "machines",
  "materialGroups",
  "bestToleranceMm",
  "contact",
] as const);

/**
 * The minimum number of machines a supplier roster must declare to be capability-verifiable. A shop
 * with zero machines is a directory record, not bookable supply; >=1 is the floor (a machine each
 * carrying a positive envelope + a process the supplier lists is asserted by the gate).
 */
export const MIN_MACHINES = 1;

/** The minimum number of processes a complete application must declare. */
export const MIN_PROCESSES = 1;

/** The minimum number of ISO 513 material groups a complete application must declare. */
export const MIN_MATERIAL_GROUPS = 1;

/**
 * A single resolved completeness criterion from {@link evaluateCompleteness}. `field` is one of
 * {@link REQUIRED_APPLICATION_FIELDS}; `ok` is whether it is satisfied; `detail` is a human-readable
 * gap string when `!ok` (fail-loud transparency), or null when satisfied.
 */
export interface CompletenessCriterion {
  field: string;
  ok: boolean;
  detail: string | null;
}

/** The shape the gate evaluates completeness against (the verifiable slice of a profile draft). */
export interface CompletenessSubject {
  companyName?: unknown;
  geography?: { region?: unknown; state?: unknown } | unknown;
  processes?: unknown;
  machines?: unknown;
  materialGroups?: unknown;
  bestToleranceMm?: unknown;
  /** contact reachability — a non-empty email satisfies the `contact` field. */
  contactEmail?: unknown;
}

function isNonEmptyString(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function arrayLen(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

/**
 * Evaluate the structural completeness of an application against {@link REQUIRED_APPLICATION_FIELDS}.
 * PURE — no enum-validity check here (that is the engine's job against supplier-capability-schema);
 * this resolves only PRESENCE + minimum-cardinality + tolerance-positivity. Returns one
 * {@link CompletenessCriterion} per required field, in {@link REQUIRED_APPLICATION_FIELDS} order, so a
 * caller can surface every gap at once (never just the first).
 */
export function evaluateCompleteness(subject: CompletenessSubject): CompletenessCriterion[] {
  const geo = (subject.geography ?? {}) as { region?: unknown; state?: unknown };
  const tol = subject.bestToleranceMm;
  const tolOk = typeof tol === "number" && Number.isFinite(tol) && tol > 0;
  return [
    {
      field: "companyName",
      ok: isNonEmptyString(subject.companyName),
      detail: isNonEmptyString(subject.companyName) ? null : "companyName is missing or empty",
    },
    {
      field: "geography",
      ok: isNonEmptyString(geo.region) && isNonEmptyString(geo.state),
      detail:
        isNonEmptyString(geo.region) && isNonEmptyString(geo.state)
          ? null
          : "geography.region and geography.state are both required",
    },
    {
      field: "processes",
      ok: arrayLen(subject.processes) >= MIN_PROCESSES,
      detail:
        arrayLen(subject.processes) >= MIN_PROCESSES
          ? null
          : `at least ${MIN_PROCESSES} process required (declared ${arrayLen(subject.processes)})`,
    },
    {
      field: "machines",
      ok: arrayLen(subject.machines) >= MIN_MACHINES,
      detail:
        arrayLen(subject.machines) >= MIN_MACHINES
          ? null
          : `at least ${MIN_MACHINES} machine required (declared ${arrayLen(subject.machines)})`,
    },
    {
      field: "materialGroups",
      ok: arrayLen(subject.materialGroups) >= MIN_MATERIAL_GROUPS,
      detail:
        arrayLen(subject.materialGroups) >= MIN_MATERIAL_GROUPS
          ? null
          : `at least ${MIN_MATERIAL_GROUPS} material group required (declared ${arrayLen(subject.materialGroups)})`,
    },
    {
      field: "bestToleranceMm",
      ok: tolOk,
      detail: tolOk ? null : `bestToleranceMm must be a finite number > 0 (got ${String(tol)})`,
    },
    {
      field: "contact",
      ok: isNonEmptyString(subject.contactEmail),
      detail: isNonEmptyString(subject.contactEmail) ? null : "a reachable contactEmail is required",
    },
  ];
}
