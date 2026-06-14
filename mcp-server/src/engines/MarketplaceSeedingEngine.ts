/**
 * MarketplaceSeedingEngine.ts — the directory-LEAD funnel that seeds the PRISM networking marketplace's
 * supply side from charlie's vendor corpus (galaxy:business, slot:hotel). It is the stage UPSTREAM of
 * {@link SupplierOnboardingEngine}: it turns thin {@link SupplierCapabilityHint}s (lifted by
 * VendorCatalogImportEngine from the 199-vendor directory) into tracked LEADS, then bridges a lead into a
 * full onboarding APPLICATION once a shop supplies the fields the directory could not give us.
 *
 *   directory hint → seedFromHints → LEAD (invited) → [markContacted] → convertToApplication →
 *       SupplierOnboarding application → verify → approve → live matchable supplier
 *
 * WHY A LEAD STAGE (R8 — distinct from the two registries it sits beside):
 *   - A {@link SupplierCapabilityHint} is INTENTIONALLY THIN — name, processes, certs, region, source —
 *     with NO machine roster, material groups, tolerance, or geography.state. Auto-registering it as a
 *     {@link SupplierCapabilityProfileEngine} profile would create a supplier that matches NO RFQ (the
 *     matcher hard-filters on material/envelope/tolerance) and would pollute the registry. So we do NOT
 *     register directory records; we hold them as LEADS until a shop completes the gap.
 *   - {@link SupplierOnboardingEngine} starts at submitApplication with a COMPLETE profile draft. A lead
 *     is the pre-application prospect; convertToApplication is the single bridge into onboarding, merging
 *     what the directory knew (processes/certs/region/name) with what the shop now supplies
 *     (geography.state, machines, materialGroups, bestToleranceMm, contactEmail).
 *
 * PII: a lead carries NO contact handle (the directory hint has none). The contactEmail/Phone arrive only
 * at convertToApplication, from the shop, and are handed straight to SupplierOnboardingEngine which masks
 * them in every public return — this engine never stores or echoes a raw contact handle.
 *
 * DETERMINISM + FAIL-LOUD (R12): a PURE registry (no fs/network). All timestamps are CALLER-SUPPLIED ISO
 * strings. Bad input, duplicate seeding, unknown lead, and illegal transitions THROW; seeding a supplierId
 * that is already a lead or already a live registered supplier is SKIPPED (surfaced in `skipped[]`, never
 * a silent overwrite). NEVER hard-deletes ([[feedback_never_delete_only_disable]]) — decline FLIPS status.
 */

import { z } from "zod";
import type { SupplierCapabilityHint } from "./VendorCatalogImportEngine.js";
import { SupplierCapabilityProfileEngine } from "./SupplierCapabilityProfileEngine.js";
import {
  SupplierOnboardingEngine,
  type OnboardingApplication,
  type ProfileDraftInput,
} from "./SupplierOnboardingEngine.js";
import type { SupplierProcess, Certification } from "../data/supplier-capability-schema.js";
import {
  MARKETPLACE_SEEDING_POLICY_VERSION,
  LEAD_STATUSES,
  INITIAL_LEAD_STATUS,
  isLegalLeadTransition,
  type LeadStatus,
} from "../data/marketplace-seeding-policy.js";

// ============================================================================
// SCHEMAS — z.input so optional fields stay optional for callers
// ============================================================================

/** The directory-hint shape this engine seeds from (a structural subset of SupplierCapabilityHint). */
const HintSchema = z.object({
  supplierId: z.string().min(1, "hint.supplierId is required"),
  name: z.string().min(1, "hint.name is required"),
  website: z.string().nullable().optional(),
  processes: z.array(z.string().min(1)).min(1, "hint.processes must have at least one process"),
  certifications: z.array(z.string().min(1)).default([]),
  region: z.string().min(1, "hint.region is required"),
  sourceTag: z.string().min(1, "hint.sourceTag is required"),
});

const SeedFromHintsSchema = z.object({
  hints: z.array(HintSchema),
  seededAt: z.string().min(1, "seededAt (ISO) is required"),
});
export type SeedFromHintsInput = z.input<typeof SeedFromHintsSchema>;

/** The fields a SHOP supplies to complete a lead into a full onboarding application. */
const CompletionSchema = z.object({
  /** geography.state (a lead carries only region). */
  state: z.string().min(1, "completion.state is required"),
  zip: z.string().min(1).optional(),
  machines: z
    .array(
      z.object({
        machineId: z.string().min(1, "machine machineId is required"),
        process: z.string().min(1, "machine process is required"),
        axes: z.number().int().positive("machine axes must be > 0"),
        envelopeMm: z.object({
          x: z.number().finite().positive("envelope x must be > 0"),
          y: z.number().finite().positive("envelope y must be > 0"),
          z: z.number().finite().positive("envelope z must be > 0"),
        }),
        maxRpm: z.number().finite().nonnegative("maxRpm must be >= 0"),
        maxTorqueNm: z.number().finite().positive().optional(),
        controller: z.string().min(1, "machine controller is required"),
      }),
    )
    .min(1, "completion.machines must have at least one machine"),
  materialGroups: z.array(z.string().min(1)).min(1, "completion.materialGroups must have at least one group"),
  bestToleranceMm: z.number().finite("completion.bestToleranceMm must be finite"),
  contactEmail: z.string().min(1, "completion.contactEmail is required"),
  contactPhone: z.string().min(1).optional(),
  tenantId: z.string().min(1).optional(),
  /** override the lead's directory name (defaults to the lead.name). */
  companyName: z.string().min(1).optional(),
  /** override the lead's directory-derived processes (defaults to the lead.processes). */
  processes: z.array(z.string().min(1)).min(1).optional(),
  /** override the lead's directory-derived certs (defaults to the lead.certifications). */
  certifications: z.array(z.string().min(1)).optional(),
});

const ConvertSchema = z.object({
  supplierId: z.string().min(1, "supplierId is required"),
  applicationId: z.string().min(1, "applicationId is required"),
  completion: CompletionSchema,
  submittedAt: z.string().min(1, "submittedAt (ISO) is required"),
});
export type ConvertToApplicationInput = z.input<typeof ConvertSchema>;

// ============================================================================
// DOMAIN TYPES
// ============================================================================

/** A tracked directory prospect. Carries only directory-known fields — NO PII, NOT a live profile. */
export interface MarketplaceLead {
  supplierId: string;
  name: string;
  website: string | null;
  processes: SupplierProcess[];
  certifications: Certification[];
  region: string;
  sourceTag: string;
  status: LeadStatus;
  /** set when status → applied: the SupplierOnboarding applicationId this lead became. */
  applicationId: string | null;
  /** set when status → declined: the decline reason. */
  declineReason: string | null;
  seededAt: string;
  updatedAt: string;
  schemaVersion: string;
}

/** Why a hint was not seeded as a new lead. */
export type SeedSkipReason = "already-a-lead" | "already-registered";

export interface SeedSkip {
  supplierId: string;
  reason: SeedSkipReason;
}

export interface SeedResult {
  seeded: MarketplaceLead[];
  skipped: SeedSkip[];
  summary: {
    hintsIn: number;
    seeded: number;
    skippedExistingLead: number;
    skippedAlreadyRegistered: number;
  };
  schemaVersion: string;
}

export interface LeadListFilter {
  status?: LeadStatus;
  region?: string;
  process?: SupplierProcess;
}

/** The result of bridging a lead into an onboarding application. */
export interface ConvertResult {
  lead: MarketplaceLead;
  /** the MASKED onboarding application created by SupplierOnboardingEngine (status `applied`). */
  application: OnboardingApplication;
}

// ============================================================================
// ENGINE
// ============================================================================

export class MarketplaceSeedingEngine {
  /** supplierId → lead record. Pure registry (no fs/network). */
  private static leads = new Map<string, MarketplaceLead>();

  /**
   * Seed leads from directory capability hints. A hint whose supplierId is ALREADY a lead, or already a
   * live registered supplier ({@link SupplierCapabilityProfileEngine.getProfile}), is SKIPPED (surfaced in
   * `skipped[]` with the reason — never a silent overwrite). New hints become `invited` leads.
   *
   * @param input `{ hints, seededAt (ISO) }`.
   * @returns `{ seeded, skipped, summary }` — the new leads, the skips with reasons, and counts.
   * @throws on a malformed hint (Zod, with index) or an empty seededAt.
   */
  static seedFromHints(input: SeedFromHintsInput): SeedResult {
    const p = SeedFromHintsSchema.parse(input);
    const seeded: MarketplaceLead[] = [];
    const skipped: SeedSkip[] = [];

    // Each hint is already deep-validated by SeedFromHintsSchema (z.array(HintSchema)); a malformed hint
    // throws there with its array index in the issue path. Here we only dedup + seed.
    p.hints.forEach((d) => {
      if (MarketplaceSeedingEngine.leads.has(d.supplierId)) {
        skipped.push({ supplierId: d.supplierId, reason: "already-a-lead" });
        return;
      }
      if (SupplierCapabilityProfileEngine.getProfile(d.supplierId) !== null) {
        skipped.push({ supplierId: d.supplierId, reason: "already-registered" });
        return;
      }
      const lead: MarketplaceLead = {
        supplierId: d.supplierId,
        name: d.name,
        website: d.website ?? null,
        processes: d.processes as SupplierProcess[],
        certifications: (d.certifications ?? []) as Certification[],
        region: d.region,
        sourceTag: d.sourceTag,
        status: INITIAL_LEAD_STATUS,
        applicationId: null,
        declineReason: null,
        seededAt: p.seededAt,
        updatedAt: p.seededAt,
        schemaVersion: MARKETPLACE_SEEDING_POLICY_VERSION,
      };
      MarketplaceSeedingEngine.leads.set(lead.supplierId, lead);
      seeded.push(MarketplaceSeedingEngine.#snapshot(lead));
    });

    return {
      seeded,
      skipped,
      summary: {
        hintsIn: p.hints.length,
        seeded: seeded.length,
        skippedExistingLead: skipped.filter((s) => s.reason === "already-a-lead").length,
        skippedAlreadyRegistered: skipped.filter((s) => s.reason === "already-registered").length,
      },
      schemaVersion: MARKETPLACE_SEEDING_POLICY_VERSION,
    };
  }

  /**
   * Log outreach to a lead: `invited` → `contacted`. (A no-op-status convenience for the funnel; the
   * lead is unchanged in every field but status + updatedAt.)
   * @throws if the lead is unknown or `current → contacted` is illegal (already applied/declined).
   */
  static markContacted(supplierId: string, atISO: string): MarketplaceLead {
    const lead = MarketplaceSeedingEngine.#mustGet(supplierId, "markContacted");
    const at = MarketplaceSeedingEngine.#requireIso(atISO, "markContacted");
    MarketplaceSeedingEngine.#assertTransition(lead, "contacted", "markContacted");
    lead.status = "contacted";
    lead.updatedAt = at;
    return MarketplaceSeedingEngine.#snapshot(lead);
  }

  /**
   * Bridge a lead into a full {@link SupplierOnboardingEngine} application. Merges the directory-known
   * fields (region/name + directory processes/certs unless overridden) with the shop-supplied completion
   * (geography.state, machines, materialGroups, bestToleranceMm, contactEmail). On success the lead flips
   * to `applied` and records the applicationId; the onboarding application is now the system of record.
   *
   * Order matters (fail-loud, no partial state): submitApplication is called FIRST — if it throws
   * (duplicate applicationId, malformed email, bad draft shape) the lead's status is left UNCHANGED.
   *
   * @returns `{ lead (now `applied`), application (MASKED onboarding record) }`.
   * @throws if the lead is unknown, `current → applied` is illegal, or submitApplication rejects.
   */
  static convertToApplication(input: ConvertToApplicationInput): ConvertResult {
    const p = ConvertSchema.parse(input);
    const lead = MarketplaceSeedingEngine.#mustGet(p.supplierId, "convertToApplication");
    MarketplaceSeedingEngine.#assertTransition(lead, "applied", "convertToApplication");

    const c = p.completion;
    // Merge directory-known fields (region/processes/certs from the lead) with shop-supplied completion;
    // the shop may override processes/certs, else the directory values carry through.
    const resolvedCerts = c.certifications ?? lead.certifications;
    const profileDraft: ProfileDraftInput = {
      geography: { region: lead.region, state: c.state, ...(c.zip !== undefined ? { zip: c.zip } : {}) },
      processes: c.processes ?? lead.processes,
      machines: c.machines,
      materialGroups: c.materialGroups,
      bestToleranceMm: c.bestToleranceMm,
      ...(c.tenantId !== undefined ? { tenantId: c.tenantId } : {}),
      ...(resolvedCerts.length > 0 ? { certifications: resolvedCerts } : {}),
    };

    // submitApplication validates + may throw — call it BEFORE mutating the lead (no partial state).
    const application = SupplierOnboardingEngine.submitApplication({
      applicationId: p.applicationId,
      supplierId: lead.supplierId,
      companyName: c.companyName ?? lead.name,
      profileDraft,
      contactEmail: c.contactEmail,
      ...(c.contactPhone !== undefined ? { contactPhone: c.contactPhone } : {}),
      submittedAt: p.submittedAt,
    });

    lead.status = "applied";
    lead.applicationId = p.applicationId;
    lead.updatedAt = p.submittedAt;
    return { lead: MarketplaceSeedingEngine.#snapshot(lead), application };
  }

  /**
   * Decline a lead (shop opted out / platform dropped it): `invited`/`contacted` → `declined` (TERMINAL).
   * NEVER deletes the record ([[feedback_never_delete_only_disable]]).
   * @throws if the lead is unknown, the reason is empty, or `current → declined` is illegal (already
   *          applied/declined).
   */
  static declineLead(supplierId: string, reason: string, atISO: string): MarketplaceLead {
    const lead = MarketplaceSeedingEngine.#mustGet(supplierId, "declineLead");
    const at = MarketplaceSeedingEngine.#requireIso(atISO, "declineLead");
    if (typeof reason !== "string" || reason.trim().length === 0) {
      throw new Error(
        `MarketplaceSeedingEngine.declineLead: a non-empty reason is required for lead '${supplierId}' ` +
          `(a silent decline hides why a prospect was dropped).`,
      );
    }
    MarketplaceSeedingEngine.#assertTransition(lead, "declined", "declineLead");
    lead.status = "declined";
    lead.declineReason = reason;
    lead.updatedAt = at;
    return MarketplaceSeedingEngine.#snapshot(lead);
  }

  /** Fetch a lead by supplierId, or null if none. */
  static getLead(supplierId: string): MarketplaceLead | null {
    const lead = MarketplaceSeedingEngine.leads.get(supplierId);
    return lead ? MarketplaceSeedingEngine.#snapshot(lead) : null;
  }

  /**
   * List leads (optionally filtered by status / region / offered process), sorted by supplierId.
   * @throws if `filter.status` is not a recognized lead status (fail loud — a typo'd filter silently
   *          returning [] would mask a caller bug).
   */
  static listLeads(filter: LeadListFilter = {}): MarketplaceLead[] {
    if (filter.status !== undefined && !LEAD_STATUSES.includes(filter.status)) {
      throw new Error(
        `MarketplaceSeedingEngine.listLeads: unknown status filter '${filter.status}' — must be one of ` +
          `${LEAD_STATUSES.join("/")}.`,
      );
    }
    const region = filter.region?.toLowerCase();
    return [...MarketplaceSeedingEngine.leads.values()]
      .filter((l) => (filter.status ? l.status === filter.status : true))
      .filter((l) => (region ? l.region.toLowerCase() === region : true))
      .filter((l) => (filter.process ? l.processes.includes(filter.process) : true))
      .sort((a, b) => a.supplierId.localeCompare(b.supplierId))
      .map((l) => MarketplaceSeedingEngine.#snapshot(l));
  }

  // --------------------------------------------------------------------------
  // INTERNALS
  // --------------------------------------------------------------------------

  static #mustGet(supplierId: string, method: string): MarketplaceLead {
    const l = MarketplaceSeedingEngine.leads.get(supplierId);
    if (!l) throw new Error(`MarketplaceSeedingEngine.${method}: unknown lead supplierId '${supplierId}'.`);
    return l;
  }

  static #requireIso(value: string, method: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(
        `MarketplaceSeedingEngine.${method}: a non-empty ISO timestamp is required (got '${String(value)}').`,
      );
    }
    return value;
  }

  static #assertTransition(lead: MarketplaceLead, next: LeadStatus, method: string): void {
    if (!isLegalLeadTransition(lead.status, next)) {
      throw new Error(
        `MarketplaceSeedingEngine.${method}: illegal lead transition '${lead.status}' → '${next}' for ` +
          `'${lead.supplierId}' (legal targets are governed by the seeding state machine).`,
      );
    }
  }

  /** Defensive deep copy so callers cannot mutate the registry through a returned lead. */
  static #snapshot(lead: MarketplaceLead): MarketplaceLead {
    return structuredClone(lead);
  }

  /** TEST-ONLY: clear the registry. */
  static __resetForTests(): void {
    MarketplaceSeedingEngine.leads.clear();
  }
}

export const marketplaceSeedingEngine = MarketplaceSeedingEngine;
