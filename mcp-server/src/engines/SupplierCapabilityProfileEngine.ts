/**
 * SupplierCapabilityProfileEngine — the multi-tenant per-shop CAPABILITY registry that powers the
 * PRISM manufacturing networking marketplace (galaxy:business, slot:hotel). THE keystone Phase-0
 * product of the networking platform.
 *
 * WHAT IT IS / WHY IT'S NET-NEW: today PRISM's capability physics is single-tenant — it knows JM
 * Die's machines only, via {@link ShopConfigurationEngine} (one shop, hard-seeded). The networking
 * marketplace needs MANY shops, isolated from one another. This engine generalizes the single-tenant
 * shop model into a tenant-isolated registry: each supplier owns a capability PROFILE (machine
 * roster, the processes it offers, the ISO 513 material groups it runs, its tightest tolerance, its
 * certifications, and its geography), keyed + isolated by `supplierId`. It is the registry the RFQ
 * matcher queries to answer the marketplace's core question — "can shop X actually do this job?"
 *
 * REUSES (never re-derives):
 *  - {@link ISO_MATERIAL_GROUPS} / {@link SUPPLIER_PROCESSES} / {@link CERTIFICATIONS} /
 *    {@link CONTROLLERS} + their isValid* guards from data/supplier-capability-schema.ts — the
 *    single source of truth for the marketplace's capability vocabulary. No material group, process
 *    name, certification code, or controller dialect is inlined here.
 *  - the machine field names from {@link ShopMachine} (controller / max_rpm / max_torque_nm / work
 *    envelope), generalized to the contract's camelCase + a 3-axis envelope so RFQMatchScoring can
 *    consume one canonical machine shape.
 *
 * MULTI-TENANT ISOLATION: a dedicated {@link MultiTenantEngine} DOES exist in this tree
 * (src/engines/MultiTenantEngine.ts — a stateful, fs-backed tenant lifecycle + Shared-Learning-Bus
 * engine). This pure registry deliberately does NOT couple to it: tenant isolation here is achieved
 * by keying the registry on `supplierId` (and carrying an optional `tenantId` for the eventual
 * tenant-scoped namespace). Binding the registry's namespace/resource-limits/data-deletion to
 * MultiTenantEngine.getTenantContext() is a documented MAIN-WIRING point (see §MAIN-WIRING below) —
 * it would make the engine impure/fs-backed, which conflicts with the pure-registry contract this
 * keystone product is specified against. Isolating by supplierId keeps it deterministic + testable.
 *
 * §MAIN-WIRING (post golf-merge, in MAIN where the dispatcher is not stale):
 *  - wire registerSupplier/getProfile/listSuppliers/canSatisfy into businessDispatcher (marketplace
 *    surface) — deferred per the WIRE-EXEMPT note below.
 *  - optionally namespace the registry per MultiTenantEngine tenant context so two tenants cannot
 *    enumerate each other's suppliers; today `tenantId` is a carried tag + listSuppliers does not
 *    cross-tenant filter (single-process registry).
 *
 * INVARIANTS (fail loud — never silent-coerce, never a bogus default):
 *  - supplierId is UNIQUE; a duplicate registration THROWS (would silently overwrite a shop).
 *  - >=1 process, >=1 machine, >=1 material group; geography.region + geography.state present.
 *  - every materialGroup ∈ ISO 513 groups; every certification ∈ CERTIFICATIONS; every machine's
 *    process ∈ the supplier's declared processes; every machine envelope axis > 0; bestToleranceMm
 *    finite & > 0. Any violation THROWS.
 *  - never hard-delete: deactivateSupplier flips active=false ([[feedback_never_delete_only_disable]]);
 *    reactivateSupplier restores it. listSuppliers is active-only by default.
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wiring the stale worktree copy would clobber ~438 main actions on golf-merge. Wire in MAIN post-merge.

import { z } from "zod";
import {
  ISO_MATERIAL_GROUPS,
  SUPPLIER_PROCESSES,
  CERTIFICATIONS,
  CONTROLLERS,
  SUPPLIER_CAPABILITY_SCHEMA_VERSION,
  isValidMaterialGroup,
  isValidProcess,
  isValidCertification,
  isValidController,
  type IsoMaterialGroup,
  type SupplierProcess,
  type Certification,
  type Controller,
} from "../data/supplier-capability-schema.js";

// ============================================================================
// DOMAIN TYPES (the keystone data shape — RFQMatchScoring consumes these VERBATIM)
// ============================================================================

/** A 3-axis work-envelope volume in millimetres (all axes > 0). */
export interface EnvelopeMm {
  x: number;
  y: number;
  z: number;
}

/** A single machine on a supplier's roster. */
export interface SupplierMachine {
  machineId: string;
  process: SupplierProcess;
  axes: number;
  envelopeMm: EnvelopeMm;
  maxRpm: number;
  maxTorqueNm?: number;
  controller: Controller;
}

/** Where a supplier is located (for geo ranking by RFQMatchScoring). */
export interface SupplierGeography {
  region: string;
  state: string;
  zip?: string;
}

/** A stored multi-tenant supplier capability profile. */
export interface SupplierCapabilityProfile {
  supplierId: string;
  tenantId?: string;
  name: string;
  active: boolean;
  geography: SupplierGeography;
  /** the process networks this shop offers (>=1). */
  processes: SupplierProcess[];
  /** the machine roster (>=1; each machine's process ∈ `processes`). */
  machines: SupplierMachine[];
  /** the ISO 513 material groups this shop runs (subset of P/M/K/N/S/H, >=1). */
  materialGroups: IsoMaterialGroup[];
  /** the tightest tolerance the shop holds in mm (e.g. 0.0127 for ±0.0005"). finite & > 0. */
  bestToleranceMm: number;
  /** the certifications this shop carries (subset of CERTIFICATIONS; may be empty). */
  certifications: Certification[];
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
}

/** A job requirement an RFQ asks a shop to satisfy. */
export interface CapabilityRequirement {
  process: SupplierProcess;
  materialGroup: IsoMaterialGroup;
  /** the tolerance the job demands in mm (finite & > 0). */
  toleranceMm: number;
  /** the part's bounding box in mm (all axes > 0). */
  partEnvelopeMm: EnvelopeMm;
  /** certifications the buyer requires the shop to hold (may be empty). */
  requiredCerts: Certification[];
}

/** Per-criterion margins from a {@link SupplierCapabilityProfileEngine.canSatisfy} check. */
export interface CapabilityMargins {
  /** requirement.toleranceMm − bestToleranceMm. >= 0 means the shop holds tight enough. */
  toleranceMarginMm: number;
  /** does the part fit inside at least one machine's envelope on all 3 axes? */
  envelopeFits: boolean;
  /** does the shop run the required material group? */
  materialMatch: boolean;
  /** does the shop (and a machine of theirs) offer the required process? */
  processMatch: boolean;
  /** does the shop hold every required certification? */
  certsMatch: boolean;
}

/** The verdict shape returned by {@link SupplierCapabilityProfileEngine.canSatisfy}. */
export interface CapabilityVerdict {
  capable: boolean;
  /** each failed criterion as a human-readable string ([] when capable). */
  gaps: string[];
  margins: CapabilityMargins;
}

// ============================================================================
// SCHEMAS — z.input (NOT z.infer) so any defaulted/optional fields stay optional for callers
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
  maxTorqueNm: z.number().finite("maxTorqueNm must be finite").positive("maxTorqueNm must be > 0").optional(),
  controller: z.string().min(1, "machine controller is required"),
});

const GeographySchema = z.object({
  region: z.string().min(1, "geography.region is required"),
  state: z.string().min(1, "geography.state is required"),
  zip: z.string().min(1).optional(),
});

const RegisterSupplierSchema = z.object({
  supplierId: z.string().min(1, "supplierId is required"),
  tenantId: z.string().min(1).optional(),
  name: z.string().min(1, "name is required"),
  geography: GeographySchema,
  processes: z.array(z.string().min(1)).min(1, "at least one process is required"),
  machines: z.array(MachineSchema).min(1, "at least one machine is required"),
  materialGroups: z.array(z.string().min(1)).min(1, "at least one material group is required"),
  bestToleranceMm: z.number().finite("bestToleranceMm must be finite").positive("bestToleranceMm must be > 0"),
  certifications: z.array(z.string().min(1)).optional(),
});
export type RegisterSupplierInput = z.input<typeof RegisterSupplierSchema>;

/** Mutable fields for {@link SupplierCapabilityProfileEngine.updateProfile} (all optional). */
const UpdateProfileSchema = z
  .object({
    name: z.string().min(1).optional(),
    geography: GeographySchema.optional(),
    processes: z.array(z.string().min(1)).min(1).optional(),
    machines: z.array(MachineSchema).min(1).optional(),
    materialGroups: z.array(z.string().min(1)).min(1).optional(),
    bestToleranceMm: z.number().finite().positive().optional(),
    certifications: z.array(z.string().min(1)).optional(),
  })
  .strict();
export type UpdateProfileInput = z.input<typeof UpdateProfileSchema>;

const RequirementSchema = z.object({
  process: z.string().min(1, "requirement.process is required"),
  materialGroup: z.string().min(1, "requirement.materialGroup is required"),
  toleranceMm: z.number().finite("requirement.toleranceMm must be finite").positive("requirement.toleranceMm must be > 0"),
  partEnvelopeMm: EnvelopeSchema,
  requiredCerts: z.array(z.string().min(1)).optional(),
});
export type CapabilityRequirementInput = z.input<typeof RequirementSchema>;

// ============================================================================
// FILTERS
// ============================================================================

export interface SupplierListFilter {
  process?: SupplierProcess;
  materialGroup?: IsoMaterialGroup;
  cert?: Certification;
  region?: string;
  includeInactive?: boolean;
}

// ============================================================================
// ENGINE
// ============================================================================

export class SupplierCapabilityProfileEngine {
  /** supplierId → stored capability profile. Tenant-isolated registry (no fs/network — pure). */
  private static suppliers = new Map<string, SupplierCapabilityProfile>();

  /**
   * Register a new supplier with a fully validated capability profile.
   *
   * Validation (fail loud — every violation THROWS):
   *  - supplierId is UNIQUE (a duplicate would silently overwrite a shop's profile).
   *  - geography.region + geography.state present; >=1 process; >=1 machine; >=1 material group;
   *    bestToleranceMm finite & > 0.
   *  - every process ∈ {@link SUPPLIER_PROCESSES}; every materialGroup ∈ ISO 513 groups; every
   *    certification ∈ {@link CERTIFICATIONS}.
   *  - every machine's controller ∈ {@link CONTROLLERS}, its envelope axes all > 0, and its
   *    `process` ∈ this supplier's declared `processes` (a machine cannot run a process the shop
   *    does not advertise — that would be an un-bookable capability).
   *
   * @param input the supplier profile to register.
   * @returns the stored {@link SupplierCapabilityProfile} (active=true).
   * @throws on duplicate id, unknown process/material-group/cert/controller, a machine running an
   *         undeclared process, a non-positive envelope/tolerance, or any bad shape.
   */
  static registerSupplier(input: RegisterSupplierInput): SupplierCapabilityProfile {
    const p = RegisterSupplierSchema.parse(input); // throws on missing/empty/non-finite/non-positive

    if (SupplierCapabilityProfileEngine.suppliers.has(p.supplierId)) {
      throw new Error(
        `SupplierCapabilityProfileEngine.registerSupplier: duplicate supplierId '${p.supplierId}' — ` +
          `ids must be unique (a duplicate would silently overwrite an existing supplier profile).`,
      );
    }

    const processes = SupplierCapabilityProfileEngine.#validateProcesses(p.processes, p.supplierId);
    const processSet = new Set<SupplierProcess>(processes);
    const materialGroups = SupplierCapabilityProfileEngine.#validateMaterialGroups(p.materialGroups, p.supplierId);
    const certifications = SupplierCapabilityProfileEngine.#validateCerts(p.certifications ?? [], p.supplierId);
    const machines = SupplierCapabilityProfileEngine.#validateMachines(p.machines, processSet, p.supplierId);

    const now = new Date().toISOString();
    const profile: SupplierCapabilityProfile = {
      supplierId: p.supplierId,
      ...(p.tenantId !== undefined ? { tenantId: p.tenantId } : {}),
      name: p.name,
      active: true,
      geography: { region: p.geography.region, state: p.geography.state, ...(p.geography.zip !== undefined ? { zip: p.geography.zip } : {}) },
      processes,
      machines,
      materialGroups,
      bestToleranceMm: p.bestToleranceMm,
      certifications,
      schemaVersion: SUPPLIER_CAPABILITY_SCHEMA_VERSION,
      createdAt: now,
      updatedAt: now,
    };
    SupplierCapabilityProfileEngine.suppliers.set(profile.supplierId, profile);
    return profile;
  }

  /**
   * Fetch a stored supplier profile by id.
   * @param supplierId the supplier id.
   * @returns the {@link SupplierCapabilityProfile}, or null if none has that id.
   */
  static getProfile(supplierId: string): SupplierCapabilityProfile | null {
    return SupplierCapabilityProfileEngine.suppliers.get(supplierId) ?? null;
  }

  /**
   * List supplier profiles, optionally filtered. Active-only by default, sorted by supplierId.
   *
   * @param filter.process include only suppliers that offer this process.
   * @param filter.materialGroup include only suppliers that run this material group.
   * @param filter.cert include only suppliers that hold this certification.
   * @param filter.region include only suppliers in this geography.region (case-insensitive).
   * @param filter.includeInactive include deactivated suppliers (default false → active only).
   * @returns the matching profiles, sorted by supplierId.
   */
  static listSuppliers(filter: SupplierListFilter = {}): SupplierCapabilityProfile[] {
    const all = [...SupplierCapabilityProfileEngine.suppliers.values()];
    const region = filter.region?.toLowerCase();
    const filtered = all.filter((s) => {
      if (!filter.includeInactive && !s.active) return false;
      if (filter.process && !s.processes.includes(filter.process)) return false;
      if (filter.materialGroup && !s.materialGroups.includes(filter.materialGroup)) return false;
      if (filter.cert && !s.certifications.includes(filter.cert)) return false;
      if (region && s.geography.region.toLowerCase() !== region) return false;
      return true;
    });
    return filtered.sort((a, b) => a.supplierId.localeCompare(b.supplierId));
  }

  /**
   * Update mutable fields of an existing supplier profile. Re-validates any field supplied with the
   * SAME rules as registration (unknown process/material/cert/controller, machine running an
   * undeclared process, non-positive envelope/tolerance all THROW). supplierId / tenantId / active /
   * createdAt / schemaVersion are immutable here (use deactivate/reactivate for `active`).
   *
   * When BOTH processes and machines are patched they are validated against each other; when only
   * machines are patched they are validated against the EXISTING declared processes (and vice-versa)
   * — a patch can never leave a machine running an undeclared process.
   *
   * @param supplierId the supplier to update.
   * @param patch the fields to change.
   * @returns the updated {@link SupplierCapabilityProfile}.
   * @throws if the supplier is unknown, the patch is empty, or any field fails validation.
   */
  static updateProfile(supplierId: string, patch: UpdateProfileInput): SupplierCapabilityProfile {
    const current = SupplierCapabilityProfileEngine.#mustGet(supplierId, "updateProfile");
    const c = UpdateProfileSchema.parse(patch); // throws on unknown keys / bad shape

    if (Object.keys(c).length === 0) {
      throw new Error(
        `SupplierCapabilityProfileEngine.updateProfile: empty patch for '${supplierId}' — ` +
          `supply at least one mutable field (a no-op update is a surfaced error, not a silent skip).`,
      );
    }

    const nextProcesses = c.processes
      ? SupplierCapabilityProfileEngine.#validateProcesses(c.processes, supplierId)
      : current.processes;
    const processSet = new Set<SupplierProcess>(nextProcesses);
    const nextMachines = c.machines
      ? SupplierCapabilityProfileEngine.#validateMachines(c.machines, processSet, supplierId)
      : // re-check existing machines against (possibly new) process set so a process patch cannot
        // orphan a machine's process.
        SupplierCapabilityProfileEngine.#assertMachinesAgainstProcesses(current.machines, processSet, supplierId);
    const nextMaterialGroups = c.materialGroups
      ? SupplierCapabilityProfileEngine.#validateMaterialGroups(c.materialGroups, supplierId)
      : current.materialGroups;
    const nextCerts = c.certifications
      ? SupplierCapabilityProfileEngine.#validateCerts(c.certifications, supplierId)
      : current.certifications;
    const nextGeography = c.geography
      ? { region: c.geography.region, state: c.geography.state, ...(c.geography.zip !== undefined ? { zip: c.geography.zip } : {}) }
      : current.geography;

    const updated: SupplierCapabilityProfile = {
      ...current,
      name: c.name ?? current.name,
      geography: nextGeography,
      processes: nextProcesses,
      machines: nextMachines,
      materialGroups: nextMaterialGroups,
      bestToleranceMm: c.bestToleranceMm ?? current.bestToleranceMm,
      certifications: nextCerts,
      updatedAt: new Date().toISOString(),
    };
    SupplierCapabilityProfileEngine.suppliers.set(supplierId, updated);
    return updated;
  }

  /**
   * Deactivate a supplier. NEVER hard-deletes — flips active=false so the profile (machines, certs,
   * geography, history) is preserved ([[feedback_never_delete_only_disable]]). listSuppliers excludes
   * it by default; getProfile still returns it.
   *
   * @param supplierId the supplier to deactivate.
   * @returns the updated profile (active=false).
   * @throws if the supplier is unknown.
   */
  static deactivateSupplier(supplierId: string): SupplierCapabilityProfile {
    const s = SupplierCapabilityProfileEngine.#mustGet(supplierId, "deactivateSupplier");
    s.active = false;
    s.updatedAt = new Date().toISOString();
    return s;
  }

  /**
   * Reactivate a previously-deactivated supplier (restore to the marketplace).
   * @param supplierId the supplier to reactivate.
   * @returns the updated profile (active=true).
   * @throws if the supplier is unknown.
   */
  static reactivateSupplier(supplierId: string): SupplierCapabilityProfile {
    const s = SupplierCapabilityProfileEngine.#mustGet(supplierId, "reactivateSupplier");
    s.active = true;
    s.updatedAt = new Date().toISOString();
    return s;
  }

  /**
   * Can a supplier satisfy an RFQ requirement, by its DECLARED capability? This is the data check the
   * RFQ matcher calls FIRST — it is PURE (no physics force calc; that is RFQMatchScoring's stamp).
   *
   * `capable` ⇔ ALL of:
   *  - processMatch  : the supplier offers `process` AND owns a machine whose `process` === it.
   *  - materialMatch : the supplier runs `materialGroup`.
   *  - envelopeFits  : the part fits inside at least ONE process-matching machine's envelope on all
   *                    3 axes (a machine that does not run the requested process cannot host the part).
   *  - tolerance     : toleranceMarginMm = requirement.toleranceMm − bestToleranceMm >= 0 (the shop's
   *                    tightest tolerance is at least as tight as the job demands — a SMALLER mm value
   *                    is tighter, so the shop is capable when its best value <= the requirement's).
   *  - certsMatch    : every requiredCert is held by the supplier (subset check; empty list ⇒ true).
   *
   * A deactivated supplier is reported capable=false with an explicit gap (it cannot be matched while
   * inactive), so the matcher never silently routes an RFQ to a paused shop.
   *
   * @param supplierId the supplier to check.
   * @param requirement the job requirement (process / materialGroup / toleranceMm / partEnvelopeMm /
   *                     requiredCerts).
   * @returns a {@link CapabilityVerdict}: { capable, gaps[], margins }.
   * @throws if the supplier is unknown, or the requirement has a bad shape / unknown enum value.
   */
  static canSatisfy(supplierId: string, requirement: CapabilityRequirementInput): CapabilityVerdict {
    const s = SupplierCapabilityProfileEngine.#mustGet(supplierId, "canSatisfy");
    const r = RequirementSchema.parse(requirement); // throws on bad shape / non-positive tolerance/envelope

    // requirement enum values must be recognized — a typo'd process/material/cert is a caller bug, not
    // a "no match" (fail loud so the matcher never silently scores an impossible requirement as a miss).
    if (!isValidProcess(r.process)) {
      throw new Error(
        `SupplierCapabilityProfileEngine.canSatisfy: unknown requirement process '${r.process}' — ` +
          `must be one of ${SUPPLIER_PROCESSES.join("/")}.`,
      );
    }
    if (!isValidMaterialGroup(r.materialGroup)) {
      throw new Error(
        `SupplierCapabilityProfileEngine.canSatisfy: unknown requirement materialGroup '${r.materialGroup}' — ` +
          `must be one of ${ISO_MATERIAL_GROUPS.map((g) => g.group).join("/")}.`,
      );
    }
    const requiredCerts = SupplierCapabilityProfileEngine.#validateCerts(r.requiredCerts ?? [], supplierId);

    const process = r.process as SupplierProcess;
    const materialGroup = r.materialGroup as IsoMaterialGroup;

    const gaps: string[] = [];

    // inactive guard — an inactive shop is never a match (explicit, never silent).
    if (!s.active) {
      gaps.push(`supplier '${supplierId}' is inactive (deactivated suppliers cannot be matched)`);
    }

    const processMatch = s.processes.includes(process);
    if (!processMatch) {
      gaps.push(`process '${process}' not offered (offers: ${s.processes.join("/")})`);
    }

    const materialMatch = s.materialGroups.includes(materialGroup);
    if (!materialMatch) {
      gaps.push(`material group '${materialGroup}' not run (runs: ${s.materialGroups.join("/")})`);
    }

    // envelopeFits: a process-matching machine that contains the part on all 3 axes. If the process
    // is not offered at all there is no eligible machine, so the envelope cannot fit.
    const eligibleMachines = s.machines.filter((m) => m.process === process);
    const envelopeFits =
      eligibleMachines.length > 0 &&
      eligibleMachines.some(
        (m) =>
          r.partEnvelopeMm.x <= m.envelopeMm.x &&
          r.partEnvelopeMm.y <= m.envelopeMm.y &&
          r.partEnvelopeMm.z <= m.envelopeMm.z,
      );
    if (!envelopeFits) {
      const part = `${r.partEnvelopeMm.x}x${r.partEnvelopeMm.y}x${r.partEnvelopeMm.z}mm`;
      gaps.push(
        eligibleMachines.length === 0
          ? `no '${process}' machine available to host part ${part}`
          : `part ${part} exceeds every '${process}' machine envelope`,
      );
    }

    const toleranceMarginMm = r.toleranceMm - s.bestToleranceMm;
    const toleranceOk = toleranceMarginMm >= 0;
    if (!toleranceOk) {
      gaps.push(
        `tolerance too tight: job needs ${r.toleranceMm}mm, shop holds ${s.bestToleranceMm}mm ` +
          `(margin ${toleranceMarginMm.toFixed(6)}mm)`,
      );
    }

    const heldCerts = new Set<Certification>(s.certifications);
    const missingCerts = requiredCerts.filter((c) => !heldCerts.has(c));
    const certsMatch = missingCerts.length === 0;
    if (!certsMatch) {
      gaps.push(`missing certifications: ${missingCerts.join("/")} (holds: ${s.certifications.join("/") || "none"})`);
    }

    const capable = s.active && processMatch && materialMatch && envelopeFits && toleranceOk && certsMatch;

    return {
      capable,
      gaps,
      margins: { toleranceMarginMm, envelopeFits, materialMatch, processMatch, certsMatch },
    };
  }

  // --------------------------------------------------------------------------
  // INTERNALS
  // --------------------------------------------------------------------------

  /** Fetch a supplier or THROW (fail loud — never operate on a missing supplier). */
  static #mustGet(supplierId: string, method: string): SupplierCapabilityProfile {
    const s = SupplierCapabilityProfileEngine.suppliers.get(supplierId);
    if (!s) throw new Error(`SupplierCapabilityProfileEngine.${method}: unknown supplierId '${supplierId}'.`);
    return s;
  }

  /** Validate + narrow a process list against {@link SUPPLIER_PROCESSES}. Dedupes; THROWS on unknown. */
  static #validateProcesses(processes: string[], supplierId: string): SupplierProcess[] {
    const out: SupplierProcess[] = [];
    const seen = new Set<string>();
    for (const proc of processes) {
      if (!isValidProcess(proc)) {
        throw new Error(
          `SupplierCapabilityProfileEngine: supplier '${supplierId}' declares unknown process '${proc}' — ` +
            `must be one of ${SUPPLIER_PROCESSES.join("/")}.`,
        );
      }
      if (!seen.has(proc)) {
        seen.add(proc);
        out.push(proc);
      }
    }
    return out;
  }

  /** Validate + narrow a material-group list against ISO 513 groups. Dedupes; THROWS on unknown. */
  static #validateMaterialGroups(groups: string[], supplierId: string): IsoMaterialGroup[] {
    const out: IsoMaterialGroup[] = [];
    const seen = new Set<string>();
    for (const g of groups) {
      if (!isValidMaterialGroup(g)) {
        throw new Error(
          `SupplierCapabilityProfileEngine: supplier '${supplierId}' declares unknown material group '${g}' — ` +
            `must be one of the six ISO 513 groups ${ISO_MATERIAL_GROUPS.map((x) => x.group).join("/")}.`,
        );
      }
      if (!seen.has(g)) {
        seen.add(g);
        out.push(g);
      }
    }
    return out;
  }

  /** Validate + narrow a certification list against {@link CERTIFICATIONS}. Dedupes; THROWS on unknown. */
  static #validateCerts(certs: string[], supplierId: string): Certification[] {
    const out: Certification[] = [];
    const seen = new Set<string>();
    for (const c of certs) {
      if (!isValidCertification(c)) {
        throw new Error(
          `SupplierCapabilityProfileEngine: supplier '${supplierId}' declares unknown certification '${c}' — ` +
            `must be one of ${CERTIFICATIONS.join("/")}.`,
        );
      }
      if (!seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
    return out;
  }

  /**
   * Validate a machine roster: each machine's controller ∈ {@link CONTROLLERS}, its declared process
   * is a recognized process AND ∈ the supplier's declared process set, and its envelope axes are all
   * positive (the EnvelopeSchema already enforced > 0, this re-asserts process coupling). Returns the
   * machines narrowed to typed {@link SupplierMachine}s.
   */
  static #validateMachines(
    machines: z.infer<typeof MachineSchema>[],
    processSet: ReadonlySet<SupplierProcess>,
    supplierId: string,
  ): SupplierMachine[] {
    const out: SupplierMachine[] = [];
    for (const m of machines) {
      if (!isValidController(m.controller)) {
        throw new Error(
          `SupplierCapabilityProfileEngine: supplier '${supplierId}' machine '${m.machineId}' has unknown ` +
            `controller '${m.controller}' — must be one of ${CONTROLLERS.join("/")}.`,
        );
      }
      if (!isValidProcess(m.process)) {
        throw new Error(
          `SupplierCapabilityProfileEngine: supplier '${supplierId}' machine '${m.machineId}' declares unknown ` +
            `process '${m.process}' — must be one of ${SUPPLIER_PROCESSES.join("/")}.`,
        );
      }
      if (!processSet.has(m.process as SupplierProcess)) {
        throw new Error(
          `SupplierCapabilityProfileEngine: supplier '${supplierId}' machine '${m.machineId}' runs process ` +
            `'${m.process}' which is not in the supplier's declared processes (${[...processSet].join("/")}) — ` +
            `a machine cannot offer a capability the shop does not advertise.`,
        );
      }
      out.push({
        machineId: m.machineId,
        process: m.process as SupplierProcess,
        axes: m.axes,
        envelopeMm: { x: m.envelopeMm.x, y: m.envelopeMm.y, z: m.envelopeMm.z },
        maxRpm: m.maxRpm,
        ...(m.maxTorqueNm !== undefined ? { maxTorqueNm: m.maxTorqueNm } : {}),
        controller: m.controller as Controller,
      });
    }
    return out;
  }

  /**
   * Re-assert an EXISTING machine roster against a (possibly newly-patched) process set — used by
   * updateProfile when processes change but machines do not, so a process patch can never orphan a
   * machine's process. Returns the roster unchanged on success; THROWS otherwise.
   */
  static #assertMachinesAgainstProcesses(
    machines: SupplierMachine[],
    processSet: ReadonlySet<SupplierProcess>,
    supplierId: string,
  ): SupplierMachine[] {
    for (const m of machines) {
      if (!processSet.has(m.process)) {
        throw new Error(
          `SupplierCapabilityProfileEngine.updateProfile: supplier '${supplierId}' machine '${m.machineId}' runs ` +
            `process '${m.process}', which the patched process list (${[...processSet].join("/")}) no longer ` +
            `declares — patch the machines too, or keep '${m.process}' in processes.`,
        );
      }
    }
    return machines;
  }

  /** TEST-ONLY: clear the registry. */
  static __resetForTests(): void {
    SupplierCapabilityProfileEngine.suppliers.clear();
  }
}

export const supplierCapabilityProfileEngine = SupplierCapabilityProfileEngine;
