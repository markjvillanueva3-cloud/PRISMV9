/**
 * SupplierOnboardingEngine — the Phase-1 SUPPLY-SIDE acquisition flow of the PRISM manufacturing
 * networking marketplace (galaxy:business, slot:hotel). It turns a raw supplier self-registration into
 * a verified, ACTIVE {@link SupplierCapabilityProfile}. This is the engine that converts a directory
 * record into ENGAGED supply — the §7-Risk-1 cold-start mitigation.
 *
 * DEDUP / boundary (R8) — distinct from {@link SupplierCapabilityProfileEngine}:
 *   {@link SupplierCapabilityProfileEngine} is the VERIFIED-PROFILE registry: it stores a live shop's
 *   capability profile (machine roster, processes, material groups, tolerance, certs, geography) and
 *   answers the matcher's "can shop X do this job?" via canSatisfy. This engine does NOT re-store any
 *   of that — it tracks the APPLICATION LIFECYCLE (applied → capability_verified → active | rejected |
 *   withdrawn), runs the capability-VERIFICATION GATE, and on approval calls
 *   {@link SupplierCapabilityProfileEngine.registerSupplier} to create the LIVE profile. The draft
 *   capability data lives on the application until approval; the verified profile lives in the
 *   capability registry. Onboarding is the INTAKE + GATE + STATE MACHINE wrapping that registry, not a
 *   second copy of it.
 *
 *   Also distinct from {@link OnboardingEngine} (a progressive-disclosure UX for new PRISM end-users —
 *   nothing to do with marketplace supply) and {@link TenantOnboardingRunbookEngine} (a tenant
 *   KMS/ACL/RBAC provisioning runbook). Neither is the supply-side acquisition funnel.
 *
 * SYMMETRY: mirrors {@link BuyerAccountEngine} verbatim — a pure static-class registry keyed by id
 * (here `applicationId`), Zod-validated `z.input` params, fail-loud THROW on bad input / duplicate /
 * unknown id / illegal transition, never-hard-delete (reject/withdraw FLIP status, never delete),
 * `__resetForTests()`, and the SAME PII discipline: the supplier's raw contact email + phone are
 * stored INTERNALLY but EVERY public return masks them (a***@domain, last-4) — the raw handle never
 * appears in a public record's JSON. The masking helpers are IMPORTED from BuyerAccountEngine so the
 * §8.2 masking widths stay single-sourced (no second mask implementation).
 *
 * DETERMINISM: this is a PURE registry (no fs / network). All business-meaningful timestamps are
 * CALLER-SUPPLIED ISO strings (submittedAt / approvedAt / atTime / verifiedAt) so a test can assert
 * them without a wall-clock dependency. The engine reads NO wall clock into any value a test asserts.
 *
 * INVARIANTS (fail loud — never silent-coerce, never a bogus default):
 *  - applicationId is UNIQUE; a duplicate submitApplication THROWS (would silently overwrite an app).
 *  - submitApplication validates the draft SHAPE (Zod) + a reachable contactEmail; a malformed email
 *    THROWS (a supplier who cannot be contacted is not a valid application).
 *  - verifyCapability is the GATE: it runs completeness ({@link evaluateCompleteness}) + internal
 *    consistency (valid processes/materials/certs/controllers per supplier-capability-schema; every
 *    machine has a positive envelope + a process the supplier lists; bestToleranceMm finite & > 0). On
 *    PASS → status capability_verified + verdict {verified:true,...}. On FAIL → status is UNCHANGED
 *    (or re-verify of a verified app drops it back to applied) + verdict {verified:false, gaps[]} —
 *    it NEVER silently marks an app verified.
 *  - approveOnboarding only from capability_verified (approving an unverified app THROWS); it registers
 *    the live profile + flips to active.
 *  - every status change is checked against {@link isLegalTransition}; an illegal transition THROWS.
 *  - never hard-delete: reject/withdraw FLIP status ([[feedback_never_delete_only_disable]]);
 *    re-approving a rejected/withdrawn app THROWS (terminal).
 *
 * §MAIN-WIRING (post golf-merge, in MAIN where the dispatcher is not stale):
 *  - wire submitApplication/verifyCapability/approveOnboarding/reject/withdraw/getApplication/
 *    listApplications/getOnboardingStatus into businessDispatcher (marketplace supplier-intake
 *    surface) — deferred per the WIRE-EXEMPT note below.
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wiring the stale worktree copy would clobber ~438 main actions on golf-merge. Wire in MAIN post-merge.

import { z } from "zod";
import {
  SupplierCapabilityProfileEngine,
  type SupplierCapabilityProfile,
  type RegisterSupplierInput,
} from "./SupplierCapabilityProfileEngine.js";
import {
  ISO_MATERIAL_GROUPS,
  SUPPLIER_PROCESSES,
  CERTIFICATIONS,
  CONTROLLERS,
  isValidMaterialGroup,
  isValidProcess,
  isValidCertification,
  isValidController,
} from "../data/supplier-capability-schema.js";
import {
  SUPPLIER_ONBOARDING_POLICY_VERSION,
  INITIAL_ONBOARDING_STATUS,
  ONBOARDING_STATUSES,
  isLegalTransition,
  evaluateCompleteness,
  type OnboardingStatus,
} from "../data/supplier-onboarding-policy.js";
// PII masking single-sourced from the buyer side (§8.2 widths live there; do NOT re-implement).
import { maskEmail, maskPhone, isValidEmailShape } from "./BuyerAccountEngine.js";

// ============================================================================
// SCHEMAS — z.input (NOT z.infer) so any optional field stays optional for callers
// ============================================================================

const EnvelopeSchema = z.object({
  x: z.number().finite("envelope x must be finite").positive("envelope x must be > 0"),
  y: z.number().finite("envelope y must be finite").positive("envelope y must be > 0"),
  z: z.number().finite("envelope z must be finite").positive("envelope z must be > 0"),
});

const MachineSchema = z.object({
  machineId: z.string().min(1, "machineId is required"),
  process: z.string().min(1, "machine process is required"),
  axes: z.number().int("axes must be an integer").positive("axes must be > 0"),
  envelopeMm: EnvelopeSchema,
  maxRpm: z.number().finite("maxRpm must be finite").nonnegative("maxRpm must be >= 0"),
  maxTorqueNm: z.number().finite().positive().optional(),
  controller: z.string().min(1, "machine controller is required"),
});

const GeographySchema = z.object({
  region: z.string().min(1, "geography.region is required"),
  state: z.string().min(1, "geography.state is required"),
  zip: z.string().min(1).optional(),
});

/**
 * The capability fields a supplier declares in an application — the SAME shape
 * {@link SupplierCapabilityProfileEngine.registerSupplier} consumes (so approval is a pass-through, not
 * a re-key). `bestToleranceMm` accepts any finite number here (NOT positive-gated at submit): a shop
 * may submit a sloppy draft (e.g. 0 or negative) and the VERIFICATION GATE is what catches it with a
 * gap — submit is intentionally lenient on the values it will later verify, strict only on shape.
 */
const ProfileDraftSchema = z.object({
  tenantId: z.string().min(1).optional(),
  geography: GeographySchema,
  processes: z.array(z.string().min(1)).min(1, "at least one process is required"),
  machines: z.array(MachineSchema).min(1, "at least one machine is required"),
  materialGroups: z.array(z.string().min(1)).min(1, "at least one material group is required"),
  bestToleranceMm: z.number().finite("bestToleranceMm must be finite"),
  certifications: z.array(z.string().min(1)).optional(),
});
export type ProfileDraftInput = z.input<typeof ProfileDraftSchema>;

const SubmitApplicationSchema = z.object({
  applicationId: z.string().min(1, "applicationId is required"),
  supplierId: z.string().min(1, "supplierId is required"),
  /** the company name (also passed through as the registered profile's `name`). */
  companyName: z.string().min(1, "companyName is required"),
  profileDraft: ProfileDraftSchema,
  contactEmail: z.string().min(1, "contactEmail is required"),
  contactPhone: z.string().min(1).optional(),
  /** caller-supplied ISO timestamp (determinism — no wall clock in asserted values). */
  submittedAt: z.string().min(1, "submittedAt (ISO) is required"),
});
export type SubmitApplicationInput = z.input<typeof SubmitApplicationSchema>;

// ============================================================================
// DOMAIN TYPES
// ============================================================================

/** A single resolved verification criterion from {@link SupplierOnboardingEngine.verifyCapability}. */
export interface CheckedCriterion {
  criterion: string;
  ok: boolean;
  detail: string | null;
}

/** The verdict shape returned by {@link SupplierOnboardingEngine.verifyCapability}. */
export interface CapabilityVerificationVerdict {
  applicationId: string;
  verified: boolean;
  /** every criterion checked (completeness + consistency), in evaluation order. */
  checkedCriteria: CheckedCriterion[];
  /** each FAILED criterion as a human-readable string ([] when verified). Fail-loud transparency. */
  gaps: string[];
  /** the application's status AFTER this verify call. */
  status: OnboardingStatus;
}

/**
 * The INTERNAL stored application — carries the RAW contact handle + the full profile draft. Never
 * sent to a display/log surface; the public/masked shape is {@link OnboardingApplication}.
 */
export interface OnboardingApplicationInternal {
  applicationId: string;
  supplierId: string;
  companyName: string;
  status: OnboardingStatus;
  /** the capability draft (becomes the live profile on approval). */
  profileDraft: ProfileDraftInput;
  /** RAW email (unmasked) — internal contact only. */
  contactEmail: string;
  /** RAW phone (unmasked), or null if none supplied — internal contact only. */
  contactPhone: string | null;
  /** the most recent verification verdict, or null if never verified. */
  lastVerdict: CapabilityVerificationVerdict | null;
  /** set when an app is rejected — the decline reason. */
  rejectionReason: string | null;
  schemaVersion: string;
  submittedAt: string;
  /** caller-supplied ISO of the most recent state transition. */
  updatedAt: string;
}

/**
 * The PUBLIC / display application — contact handle MASKED. Every non-internal method returns this.
 * `contactEmailMasked` / `contactPhoneMasked` carry the redacted handles; the raw `contactEmail` /
 * `contactPhone` keys are ABSENT, so JSON.stringify of this shape can never leak the raw handle.
 */
export interface OnboardingApplication {
  applicationId: string;
  supplierId: string;
  companyName: string;
  status: OnboardingStatus;
  profileDraft: ProfileDraftInput;
  /** masked email, e.g. `a***@shop.com`. */
  contactEmailMasked: string;
  /** masked phone (last 4), e.g. `***0142`, or null if no phone on file. */
  contactPhoneMasked: string | null;
  lastVerdict: CapabilityVerificationVerdict | null;
  rejectionReason: string | null;
  schemaVersion: string;
  submittedAt: string;
  updatedAt: string;
}

/** The result of a successful {@link SupplierOnboardingEngine.approveOnboarding}. */
export interface OnboardingApprovalResult {
  applicationId: string;
  supplierId: string;
  /** the LIVE profile registered in {@link SupplierCapabilityProfileEngine}. */
  profile: SupplierCapabilityProfile;
}

/** Optional filter for {@link SupplierOnboardingEngine.listApplications}. */
export interface OnboardingListFilter {
  status?: OnboardingStatus;
}

// ============================================================================
// ENGINE
// ============================================================================

export class SupplierOnboardingEngine {
  /** applicationId → INTERNAL (raw-contact) application record. Pure registry (no fs/network). */
  private static applications = new Map<string, OnboardingApplicationInternal>();

  /**
   * Submit a new supplier application. Validates the draft SHAPE (Zod) + a reachable contactEmail, and
   * creates a record at status {@link INITIAL_ONBOARDING_STATUS} (`applied`). It does NOT yet verify
   * capability (that is {@link verifyCapability}) and does NOT register a profile.
   *
   * The RAW contact handle is stored internally; the RETURNED record is MASKED.
   *
   * @param input the application (applicationId/supplierId/companyName/profileDraft/contactEmail +
   *              optional contactPhone, plus a caller-supplied ISO submittedAt).
   * @returns the stored {@link OnboardingApplication} (MASKED, status `applied`).
   * @throws on duplicate applicationId, malformed contactEmail, or bad shape.
   */
  static submitApplication(input: SubmitApplicationInput): OnboardingApplication {
    const p = SubmitApplicationSchema.parse(input); // throws on missing/empty fields / bad draft shape

    if (SupplierOnboardingEngine.applications.has(p.applicationId)) {
      throw new Error(
        `SupplierOnboardingEngine.submitApplication: duplicate applicationId '${p.applicationId}' — ` +
          `ids must be unique (a duplicate would silently overwrite an existing application).`,
      );
    }
    if (!isValidEmailShape(p.contactEmail)) {
      throw new Error(
        `SupplierOnboardingEngine.submitApplication: malformed contactEmail '${p.contactEmail}' for ` +
          `application '${p.applicationId}' — must be a local@domain.tld shape (a supplier who cannot ` +
          `be contacted is not a valid application).`,
      );
    }

    const record: OnboardingApplicationInternal = {
      applicationId: p.applicationId,
      supplierId: p.supplierId,
      companyName: p.companyName,
      status: INITIAL_ONBOARDING_STATUS,
      profileDraft: p.profileDraft,
      contactEmail: p.contactEmail,
      contactPhone: p.contactPhone ?? null,
      lastVerdict: null,
      rejectionReason: null,
      schemaVersion: SUPPLIER_ONBOARDING_POLICY_VERSION,
      submittedAt: p.submittedAt,
      updatedAt: p.submittedAt,
    };
    SupplierOnboardingEngine.applications.set(record.applicationId, record);
    return SupplierOnboardingEngine.#toPublic(record);
  }

  /**
   * The capability-VERIFICATION GATE. Runs completeness ({@link evaluateCompleteness}) + internal
   * consistency against {@link ../data/supplier-capability-schema.js}:
   *   - every declared process ∈ {@link SUPPLIER_PROCESSES};
   *   - every materialGroup ∈ the six ISO 513 groups;
   *   - every certification (if any) ∈ {@link CERTIFICATIONS};
   *   - every machine's controller ∈ {@link CONTROLLERS}, its envelope axes all finite & > 0, and its
   *     `process` ∈ the supplier's declared processes (an un-bookable machine fails the gate);
   *   - bestToleranceMm finite & > 0.
   *
   * On PASS → the application advances to `capability_verified` and a {verified:true} verdict is
   * returned + stored. On FAIL → the status is UNCHANGED when it was `applied`; when re-verifying an
   * already `capability_verified` app that now FAILS, it drops BACK to `applied` (fail-loud — a stale
   * verified flag is never left standing). A {verified:false, gaps[]} verdict is returned + stored.
   *
   * Callable only from `applied` or `capability_verified` (re-verify). Calling it on active / rejected
   * / withdrawn THROWS (a terminal/active app is not re-verifiable).
   *
   * @param applicationId the application to verify.
   * @param atTime OPTIONAL caller-supplied ISO timestamp for the status change (determinism). When
   *               omitted the record's `updatedAt` is left at its prior value on a status change to
   *               keep the engine wall-clock-free in asserted values; pass it to stamp the transition.
   * @returns the {@link CapabilityVerificationVerdict}.
   * @throws if the application is unknown, or its status is not `applied`/`capability_verified`.
   */
  static verifyCapability(applicationId: string, atTime?: string): CapabilityVerificationVerdict {
    const app = SupplierOnboardingEngine.#mustGet(applicationId, "verifyCapability");

    if (app.status !== "applied" && app.status !== "capability_verified") {
      throw new Error(
        `SupplierOnboardingEngine.verifyCapability: application '${applicationId}' is '${app.status}' — ` +
          `only an 'applied' or 'capability_verified' (re-verify) application can be verified.`,
      );
    }

    const checkedCriteria = SupplierOnboardingEngine.#runChecks(app);
    const gaps = checkedCriteria.filter((c) => !c.ok).map((c) => `${c.criterion}: ${c.detail}`);
    const verified = gaps.length === 0;

    let nextStatus: OnboardingStatus;
    if (verified) {
      nextStatus = "capability_verified";
    } else if (app.status === "capability_verified") {
      // re-verify of a verified app that now fails → drop back to applied (documented back-edge).
      nextStatus = "applied";
    } else {
      nextStatus = "applied"; // unchanged
    }

    // Guard the transition through the state machine when it actually changes the status.
    if (nextStatus !== app.status && !isLegalTransition(app.status, nextStatus)) {
      throw new Error(
        `SupplierOnboardingEngine.verifyCapability: illegal transition '${app.status}' → '${nextStatus}' ` +
          `for application '${applicationId}'.`,
      );
    }

    const verdict: CapabilityVerificationVerdict = {
      applicationId,
      verified,
      checkedCriteria,
      gaps,
      status: nextStatus,
    };

    app.lastVerdict = verdict;
    if (nextStatus !== app.status) {
      app.status = nextStatus;
      if (atTime !== undefined) app.updatedAt = SupplierOnboardingEngine.#requireIso(atTime, "verifyCapability");
    }
    return verdict;
  }

  /**
   * Approve a verified application: register the LIVE profile in
   * {@link SupplierCapabilityProfileEngine} and flip the application to `active`. Callable ONLY from
   * `capability_verified` — approving an `applied` (unverified) / terminal / already-active app THROWS
   * (the gate must have passed first).
   *
   * @param applicationId the application to approve.
   * @param approvedAt caller-supplied ISO timestamp of the approval (determinism).
   * @returns { applicationId, supplierId, profile } where `profile` is the registered live profile.
   * @throws if the application is unknown, not `capability_verified`, the transition is illegal, or
   *          registerSupplier rejects the draft (e.g. duplicate supplierId already in the registry).
   */
  static approveOnboarding(applicationId: string, approvedAt: string): OnboardingApprovalResult {
    const app = SupplierOnboardingEngine.#mustGet(applicationId, "approveOnboarding");
    const at = SupplierOnboardingEngine.#requireIso(approvedAt, "approveOnboarding");

    if (app.status !== "capability_verified") {
      throw new Error(
        `SupplierOnboardingEngine.approveOnboarding: application '${applicationId}' is '${app.status}' — ` +
          `only a 'capability_verified' application can be approved (run verifyCapability first).`,
      );
    }
    if (!isLegalTransition(app.status, "active")) {
      throw new Error(
        `SupplierOnboardingEngine.approveOnboarding: illegal transition '${app.status}' → 'active' for ` +
          `application '${applicationId}'.`,
      );
    }

    // Register the LIVE profile. SupplierCapabilityProfileEngine owns storage + re-validates the draft;
    // any rejection (duplicate supplierId, an enum that slipped past our gate) THROWS here (fail loud)
    // and the application status is left at capability_verified (the approval did NOT happen).
    const registerInput: RegisterSupplierInput = {
      supplierId: app.supplierId,
      name: app.companyName,
      geography: app.profileDraft.geography,
      processes: app.profileDraft.processes,
      machines: app.profileDraft.machines,
      materialGroups: app.profileDraft.materialGroups,
      bestToleranceMm: app.profileDraft.bestToleranceMm,
      ...(app.profileDraft.tenantId !== undefined ? { tenantId: app.profileDraft.tenantId } : {}),
      ...(app.profileDraft.certifications !== undefined ? { certifications: app.profileDraft.certifications } : {}),
    };
    const profile = SupplierCapabilityProfileEngine.registerSupplier(registerInput);

    app.status = "active";
    app.updatedAt = at;
    return { applicationId, supplierId: app.supplierId, profile };
  }

  /**
   * Reject an application (platform declines). Flips status → `rejected` (TERMINAL); NEVER deletes the
   * record ([[feedback_never_delete_only_disable]]). Re-approving / re-verifying a rejected app THROWS
   * (the state machine has no outbound edge from `rejected`).
   *
   * @param applicationId the application to reject.
   * @param reason the human-readable decline reason (required, non-empty — fail loud, no silent reject).
   * @param atTime caller-supplied ISO timestamp of the rejection.
   * @returns the updated MASKED {@link OnboardingApplication} (status `rejected`).
   * @throws if the application is unknown, the reason is empty, or `current → rejected` is illegal
   *          (the app is already terminal/active).
   */
  static rejectOnboarding(applicationId: string, reason: string, atTime: string): OnboardingApplication {
    const app = SupplierOnboardingEngine.#mustGet(applicationId, "rejectOnboarding");
    const at = SupplierOnboardingEngine.#requireIso(atTime, "rejectOnboarding");
    if (typeof reason !== "string" || reason.trim().length === 0) {
      throw new Error(
        `SupplierOnboardingEngine.rejectOnboarding: a non-empty reason is required for application ` +
          `'${applicationId}' (a silent reject hides why supply was declined).`,
      );
    }
    SupplierOnboardingEngine.#assertTransition(app, "rejected", "rejectOnboarding");
    app.status = "rejected";
    app.rejectionReason = reason;
    app.updatedAt = at;
    return SupplierOnboardingEngine.#toPublic(app);
  }

  /**
   * Withdraw an application (supplier opts out). Flips status → `withdrawn` (TERMINAL); NEVER deletes
   * the record. Re-approving / re-verifying a withdrawn app THROWS (no outbound edge from `withdrawn`).
   *
   * @param applicationId the application to withdraw.
   * @param atTime caller-supplied ISO timestamp of the withdrawal.
   * @returns the updated MASKED {@link OnboardingApplication} (status `withdrawn`).
   * @throws if the application is unknown or `current → withdrawn` is illegal (already terminal/active).
   */
  static withdrawApplication(applicationId: string, atTime: string): OnboardingApplication {
    const app = SupplierOnboardingEngine.#mustGet(applicationId, "withdrawApplication");
    const at = SupplierOnboardingEngine.#requireIso(atTime, "withdrawApplication");
    SupplierOnboardingEngine.#assertTransition(app, "withdrawn", "withdrawApplication");
    app.status = "withdrawn";
    app.updatedAt = at;
    return SupplierOnboardingEngine.#toPublic(app);
  }

  /**
   * Fetch a stored application by id — MASKED (display/log-safe). The raw contact handle never appears.
   * @param applicationId the application id.
   * @returns the masked {@link OnboardingApplication}, or null if no application has that id.
   */
  static getApplication(applicationId: string): OnboardingApplication | null {
    const app = SupplierOnboardingEngine.applications.get(applicationId);
    return app ? SupplierOnboardingEngine.#toPublic(app) : null;
  }

  /**
   * List applications (MASKED), optionally filtered by status. Sorted by applicationId.
   * @param filter.status include only applications in this status.
   * @returns the matching masked {@link OnboardingApplication}s, sorted by applicationId.
   * @throws if `filter.status` is not a recognized onboarding status (fail loud — a typo'd filter
   *          that silently returns [] would mask a caller bug).
   */
  static listApplications(filter: OnboardingListFilter = {}): OnboardingApplication[] {
    if (filter.status !== undefined && !ONBOARDING_STATUSES.includes(filter.status)) {
      throw new Error(
        `SupplierOnboardingEngine.listApplications: unknown status filter '${filter.status}' — ` +
          `must be one of ${ONBOARDING_STATUSES.join("/")}.`,
      );
    }
    const all = [...SupplierOnboardingEngine.applications.values()];
    const filtered = filter.status ? all.filter((a) => a.status === filter.status) : all;
    return filtered
      .sort((a, b) => a.applicationId.localeCompare(b.applicationId))
      .map((a) => SupplierOnboardingEngine.#toPublic(a));
  }

  /**
   * Get just the onboarding STATUS of an application (the lightweight lifecycle probe).
   * @param applicationId the application id.
   * @returns the current {@link OnboardingStatus}.
   * @throws if the application is unknown (fail loud — never report a status for a phantom id).
   */
  static getOnboardingStatus(applicationId: string): OnboardingStatus {
    return SupplierOnboardingEngine.#mustGet(applicationId, "getOnboardingStatus").status;
  }

  // --------------------------------------------------------------------------
  // INTERNALS
  // --------------------------------------------------------------------------

  /** Fetch an application or THROW (fail loud — never operate on a missing application). */
  static #mustGet(applicationId: string, method: string): OnboardingApplicationInternal {
    const a = SupplierOnboardingEngine.applications.get(applicationId);
    if (!a) throw new Error(`SupplierOnboardingEngine.${method}: unknown applicationId '${applicationId}'.`);
    return a;
  }

  /** Validate a caller-supplied ISO timestamp is a non-empty string. THROWS otherwise (fail loud). */
  static #requireIso(value: string, method: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(
        `SupplierOnboardingEngine.${method}: a non-empty ISO timestamp is required (got '${String(value)}').`,
      );
    }
    return value;
  }

  /** Assert `app.status → next` is a legal transition; THROW otherwise. */
  static #assertTransition(app: OnboardingApplicationInternal, next: OnboardingStatus, method: string): void {
    if (!isLegalTransition(app.status, next)) {
      throw new Error(
        `SupplierOnboardingEngine.${method}: illegal transition '${app.status}' → '${next}' for ` +
          `application '${app.applicationId}' (legal targets from '${app.status}' are governed by the ` +
          `onboarding state machine).`,
      );
    }
  }

  /**
   * Run the full verification check-set against an application's draft: completeness (presence +
   * cardinality + tolerance positivity) then internal consistency (enum validity + machine coupling).
   * PURE — returns every criterion (passed and failed) so the verdict surfaces all gaps at once.
   */
  static #runChecks(app: OnboardingApplicationInternal): CheckedCriterion[] {
    const draft = app.profileDraft;
    const out: CheckedCriterion[] = [];

    // 1) STRUCTURAL COMPLETENESS — presence + cardinality + tolerance positivity.
    for (const c of evaluateCompleteness({
      companyName: app.companyName,
      geography: draft.geography,
      processes: draft.processes,
      machines: draft.machines,
      materialGroups: draft.materialGroups,
      bestToleranceMm: draft.bestToleranceMm,
      contactEmail: app.contactEmail,
    })) {
      out.push({ criterion: `completeness.${c.field}`, ok: c.ok, detail: c.detail });
    }

    // 2) PROCESS VALIDITY — every declared process ∈ SUPPLIER_PROCESSES.
    const processes = Array.isArray(draft.processes) ? draft.processes : [];
    const badProcesses = processes.filter((p) => !isValidProcess(p));
    out.push({
      criterion: "consistency.processes",
      ok: badProcesses.length === 0,
      detail:
        badProcesses.length === 0
          ? null
          : `unknown process(es) [${badProcesses.join(", ")}] — must be one of ${SUPPLIER_PROCESSES.join("/")}`,
    });

    // 3) MATERIAL-GROUP VALIDITY — every group ∈ the six ISO 513 groups.
    const groups = Array.isArray(draft.materialGroups) ? draft.materialGroups : [];
    const badGroups = groups.filter((g) => !isValidMaterialGroup(g));
    out.push({
      criterion: "consistency.materialGroups",
      ok: badGroups.length === 0,
      detail:
        badGroups.length === 0
          ? null
          : `unknown material group(s) [${badGroups.join(", ")}] — must be one of ` +
            `${ISO_MATERIAL_GROUPS.map((x) => x.group).join("/")}`,
    });

    // 4) CERTIFICATION VALIDITY — every declared cert ∈ CERTIFICATIONS (empty list ⇒ ok).
    const certs = Array.isArray(draft.certifications) ? draft.certifications : [];
    const badCerts = certs.filter((c) => !isValidCertification(c));
    out.push({
      criterion: "consistency.certifications",
      ok: badCerts.length === 0,
      detail:
        badCerts.length === 0
          ? null
          : `unknown certification(s) [${badCerts.join(", ")}] — must be one of ${CERTIFICATIONS.join("/")}`,
    });

    // 5) MACHINE CONSISTENCY — controller valid, envelope axes positive, process valid AND declared.
    const machines = Array.isArray(draft.machines) ? draft.machines : [];
    const declaredProcesses = new Set(processes);
    const machineGaps: string[] = [];
    for (const m of machines) {
      const id = typeof m?.machineId === "string" && m.machineId.length > 0 ? m.machineId : "<unnamed>";
      if (!isValidController(String(m?.controller))) {
        machineGaps.push(`machine '${id}' unknown controller '${String(m?.controller)}'`);
      }
      const env = m?.envelopeMm ?? {};
      const axesOk =
        typeof env.x === "number" && Number.isFinite(env.x) && env.x > 0 &&
        typeof env.y === "number" && Number.isFinite(env.y) && env.y > 0 &&
        typeof env.z === "number" && Number.isFinite(env.z) && env.z > 0;
      if (!axesOk) {
        machineGaps.push(`machine '${id}' envelope must be finite & > 0 on all 3 axes`);
      }
      if (!isValidProcess(String(m?.process))) {
        machineGaps.push(`machine '${id}' unknown process '${String(m?.process)}'`);
      } else if (!declaredProcesses.has(String(m?.process))) {
        machineGaps.push(
          `machine '${id}' runs process '${String(m?.process)}' not in declared processes ` +
            `[${processes.join(", ")}]`,
        );
      }
    }
    out.push({
      criterion: "consistency.machines",
      ok: machineGaps.length === 0,
      detail: machineGaps.length === 0 ? null : machineGaps.join("; "),
    });

    return out;
  }

  /**
   * Project an INTERNAL (raw-contact) record to its PUBLIC / display shape with the contact handle
   * masked. The raw `contactEmail` / `contactPhone` keys are NOT carried over — only the masked forms
   * — so JSON.stringify of the returned object can never leak the raw handle. The profileDraft is
   * defensively deep-copied so callers cannot mutate the registry through the returned record.
   */
  static #toPublic(app: OnboardingApplicationInternal): OnboardingApplication {
    return {
      applicationId: app.applicationId,
      supplierId: app.supplierId,
      companyName: app.companyName,
      status: app.status,
      profileDraft: structuredClone(app.profileDraft),
      contactEmailMasked: maskEmail(app.contactEmail),
      contactPhoneMasked: app.contactPhone !== null ? maskPhone(app.contactPhone) : null,
      lastVerdict: app.lastVerdict ? structuredClone(app.lastVerdict) : null,
      rejectionReason: app.rejectionReason,
      schemaVersion: app.schemaVersion,
      submittedAt: app.submittedAt,
      updatedAt: app.updatedAt,
    };
  }

  /** TEST-ONLY: clear the registry. */
  static __resetForTests(): void {
    SupplierOnboardingEngine.applications.clear();
  }
}

export const supplierOnboardingEngine = SupplierOnboardingEngine;
