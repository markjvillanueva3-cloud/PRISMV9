/**
 * CAMPostSelectorUIEngine — Post-Processor Selector UI Feed (U-CAM100)
 * =====================================================================
 *
 * PHASE-7: Surfaces JM Die's machine/controller/post-processor matrix
 * into each of the four CAM plugin adapters so a user can pick the
 * correct post-processor from inside the CAM UI without leaving it.
 *
 * Data source:   src/data/jm-die-profile.ts JM_DIE_CONTROLLER_MAP
 * Machine slots: 15 production machines across lathes, mills, EDMs
 *                (7 Okuma lathes, 5 mills, 2 sinker EDMs, 1 wire EDM)
 *                + 6 support machines (not in the controller map)
 *
 * Per-target encoding:
 *   - hypermill     → XML selector list (one <machine> element per entry)
 *   - fusion360     → JSON dropdown items (id, label, postId, family)
 *   - inventor_hsm  → JSON tree grouped by controller_family
 *   - mastercam     → Pipe-delimited flat table
 *   - generic       → Plain JSON array
 *
 * Recommendation layer:
 *   recommendForMachine() picks the PRISM-enhanced post when available,
 *   falling back to the vendor-stock post. When no post is declared on a
 *   machine (e.g. VMC-05 Roku-Roku has no post yet) the recommendation
 *   carries `post_processor: null` and `status: "no_post_available"`.
 *
 * @module engines/CAMPostSelectorUIEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM100
 */

import { z } from "zod";
import {
  JM_DIE_CONTROLLER_MAP,
  type MachineControllerPair,
} from "../data/jm-die-profile.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const PostSelectorTargetSchema = z.enum([
  "hypermill",
  "fusion360",
  "inventor_hsm",
  "mastercam",
  "generic",
]);
export type PostSelectorTarget = z.infer<typeof PostSelectorTargetSchema>;

export const ControllerFamilySchema = z.enum([
  "okuma",
  "hurco",
  "haas",
  "fanuc",
  "mitsubishi",
  "siemens",
  "heidenhain",
]);
export type ControllerFamily = z.infer<typeof ControllerFamilySchema>;

export const MachineCategorySchema = z.enum([
  "lathe",
  "mill",
  "sinker_edm",
  "wire_edm",
  "other",
]);
export type MachineCategory = z.infer<typeof MachineCategorySchema>;

export const MachineSelectorEntrySchema = z.object({
  machine_id: z.string(),
  machine_name: z.string(),
  category: MachineCategorySchema,
  controller_family: z.string(),
  controller_model: z.string(),
  post_processor: z.string().nullable(),
  post_label: z.string(),
});
export type MachineSelectorEntry = z.infer<typeof MachineSelectorEntrySchema>;

export const RecommendationStatusSchema = z.enum([
  "prism_enhanced",
  "vendor_stock",
  "no_post_available",
  "unknown_machine",
]);
export type RecommendationStatus = z.infer<typeof RecommendationStatusSchema>;

export const PostRecommendationSchema = z.object({
  machine_id: z.string(),
  status: RecommendationStatusSchema,
  post_processor: z.string().nullable(),
  controller_family: z.string().nullable(),
  controller_model: z.string().nullable(),
  reason: z.string().nullable(),
});
export type PostRecommendation = z.infer<typeof PostRecommendationSchema>;

export const SelectorPayloadSchema = z.object({
  target: PostSelectorTargetSchema,
  operation_id: z.string(),
  entry_count: z.number().int().nonnegative(),
  payload: z.string(),
});
export type SelectorPayload = z.infer<typeof SelectorPayloadSchema>;

export const SelectorFilterSchema = z
  .object({
    category: MachineCategorySchema.optional(),
    controller_family: z.string().optional(),
    machine_id: z.string().optional(),
    has_post: z.boolean().optional(),
  })
  .default({});
export type SelectorFilter = z.infer<typeof SelectorFilterSchema>;

export const SelectorDashboardSchema = z.object({
  total_machines: z.number().int().nonnegative(),
  machines_with_post: z.number().int().nonnegative(),
  machines_missing_post: z.number().int().nonnegative(),
  per_category: z.record(MachineCategorySchema, z.number()),
  per_controller_family: z.record(z.string(), z.number()),
  prism_enhanced_post_count: z.number().int().nonnegative(),
  vendor_stock_post_count: z.number().int().nonnegative(),
});
export type SelectorDashboard = z.infer<typeof SelectorDashboardSchema>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function categorize(machine_id: string): MachineCategory {
  if (machine_id.startsWith("LTH")) return "lathe";
  if (machine_id.startsWith("VMC") || machine_id.startsWith("HMC")) return "mill";
  if (machine_id.startsWith("WEDM")) return "wire_edm";
  if (machine_id.startsWith("EDM")) return "sinker_edm";
  return "other";
}

function defaultLabel(m: MachineControllerPair): string {
  return `${m.machine_name} · ${m.controller_family}/${m.controller_model}`;
}

function isPrismEnhanced(post: string | undefined): boolean {
  if (!post) return false;
  return /PRISM|Ai-?Enhanced/i.test(post);
}

function toSelectorEntry(m: MachineControllerPair): MachineSelectorEntry {
  return {
    machine_id: m.machine_id,
    machine_name: m.machine_name,
    category: categorize(m.machine_id),
    controller_family: m.controller_family,
    controller_model: m.controller_model,
    post_processor: m.post_processor ?? null,
    post_label: defaultLabel(m),
  };
}

function applyFilter(
  entries: MachineSelectorEntry[],
  filter: SelectorFilter,
): MachineSelectorEntry[] {
  return entries.filter(e => {
    if (filter.category && e.category !== filter.category) return false;
    if (
      filter.controller_family &&
      e.controller_family !== filter.controller_family
    )
      return false;
    if (filter.machine_id && e.machine_id !== filter.machine_id) return false;
    if (filter.has_post === true && e.post_processor === null) return false;
    if (filter.has_post === false && e.post_processor !== null) return false;
    return true;
  });
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function encodeHyperMill(entries: MachineSelectorEntry[], operation_id: string): string {
  const items = entries
    .map(
      e =>
        `  <machine id="${xmlEscape(e.machine_id)}" ` +
        `name="${xmlEscape(e.machine_name)}" ` +
        `family="${xmlEscape(e.controller_family)}" ` +
        `controller="${xmlEscape(e.controller_model)}" ` +
        `post="${xmlEscape(e.post_processor ?? "")}" />`,
    )
    .join("\n");
  return `<postSelector op="${xmlEscape(operation_id)}">\n${items}\n</postSelector>`;
}

function encodeFusion(entries: MachineSelectorEntry[], operation_id: string): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "cam.postSelector",
    params: {
      operationId: operation_id,
      items: entries.map(e => ({
        id: e.machine_id,
        label: e.post_label,
        postId: e.post_processor,
        family: e.controller_family,
        category: e.category,
      })),
    },
  });
}

function encodeInventor(entries: MachineSelectorEntry[], operation_id: string): string {
  const tree: Record<string, MachineSelectorEntry[]> = {};
  for (const e of entries) {
    if (!tree[e.controller_family]) tree[e.controller_family] = [];
    tree[e.controller_family].push(e);
  }
  return JSON.stringify({
    type: "hsm.postSelector",
    operationId: operation_id,
    groups: Object.entries(tree).map(([family, items]) => ({
      family,
      count: items.length,
      items: items.map(i => ({
        machineId: i.machine_id,
        machineName: i.machine_name,
        post: i.post_processor,
      })),
    })),
  });
}

function encodeMastercam(entries: MachineSelectorEntry[], operation_id: string): string {
  const rows = entries
    .map(
      e =>
        `${e.machine_id}|${e.machine_name}|${e.controller_family}|` +
        `${e.controller_model}|${e.post_processor ?? ""}`,
    )
    .join("\n");
  return `POST|${operation_id}|${entries.length}\n${rows}`;
}

function encodeGeneric(entries: MachineSelectorEntry[], operation_id: string): string {
  return JSON.stringify({
    type: "post_selector",
    operation_id,
    items: entries,
  });
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CAMPostSelectorUIEngine {
  /** Return the raw selector entries (optionally filtered). */
  static listMachines(filter: SelectorFilter = {}): MachineSelectorEntry[] {
    const f = SelectorFilterSchema.parse(filter);
    const entries = JM_DIE_CONTROLLER_MAP.map(toSelectorEntry);
    return applyFilter(entries, f);
  }

  /** Look up a single machine by id. */
  static getMachine(machine_id: string): MachineSelectorEntry | null {
    const hit = JM_DIE_CONTROLLER_MAP.find(m => m.machine_id === machine_id);
    return hit ? toSelectorEntry(hit) : null;
  }

  /** Recommend a post for a machine. */
  static recommendForMachine(machine_id: string): PostRecommendation {
    const hit = JM_DIE_CONTROLLER_MAP.find(m => m.machine_id === machine_id);
    if (!hit) {
      return {
        machine_id,
        status: "unknown_machine",
        post_processor: null,
        controller_family: null,
        controller_model: null,
        reason: "machine_id not present in JM_DIE_CONTROLLER_MAP",
      };
    }
    if (!hit.post_processor) {
      return {
        machine_id,
        status: "no_post_available",
        post_processor: null,
        controller_family: hit.controller_family,
        controller_model: hit.controller_model,
        reason: "machine has no registered post-processor",
      };
    }
    const status: RecommendationStatus = isPrismEnhanced(hit.post_processor)
      ? "prism_enhanced"
      : "vendor_stock";
    return {
      machine_id,
      status,
      post_processor: hit.post_processor,
      controller_family: hit.controller_family,
      controller_model: hit.controller_model,
      reason: null,
    };
  }

  /** Encode the filtered selector list for a specific CAM target. */
  static encodeForTarget(
    target: PostSelectorTarget,
    operation_id: string,
    filter: SelectorFilter = {},
  ): SelectorPayload {
    PostSelectorTargetSchema.parse(target);
    if (operation_id.length === 0) {
      throw new Error("operation_id must be non-empty");
    }
    const entries = this.listMachines(filter);
    let payload: string;
    switch (target) {
      case "hypermill":
        payload = encodeHyperMill(entries, operation_id);
        break;
      case "fusion360":
        payload = encodeFusion(entries, operation_id);
        break;
      case "inventor_hsm":
        payload = encodeInventor(entries, operation_id);
        break;
      case "mastercam":
        payload = encodeMastercam(entries, operation_id);
        break;
      case "generic":
      default:
        payload = encodeGeneric(entries, operation_id);
    }
    return {
      target,
      operation_id,
      entry_count: entries.length,
      payload,
    };
  }

  /** List all distinct controller families present in the map. */
  static controllerFamilies(): string[] {
    const set = new Set<string>();
    for (const m of JM_DIE_CONTROLLER_MAP) set.add(m.controller_family);
    return Array.from(set).sort();
  }

  /** List all distinct machine categories present. */
  static categories(): MachineCategory[] {
    const set = new Set<MachineCategory>();
    for (const m of JM_DIE_CONTROLLER_MAP) set.add(categorize(m.machine_id));
    return Array.from(set);
  }

  /** Aggregate dashboard for the whole map. */
  static dashboard(): SelectorDashboard {
    const entries = this.listMachines();
    const per_category: Record<MachineCategory, number> = {
      lathe: 0,
      mill: 0,
      sinker_edm: 0,
      wire_edm: 0,
      other: 0,
    };
    const per_controller_family: Record<string, number> = {};
    let withPost = 0;
    let prism = 0;
    let vendor = 0;
    for (const e of entries) {
      per_category[e.category] += 1;
      per_controller_family[e.controller_family] =
        (per_controller_family[e.controller_family] ?? 0) + 1;
      if (e.post_processor !== null) {
        withPost += 1;
        if (isPrismEnhanced(e.post_processor)) prism += 1;
        else vendor += 1;
      }
    }
    return {
      total_machines: entries.length,
      machines_with_post: withPost,
      machines_missing_post: entries.length - withPost,
      per_category,
      per_controller_family,
      prism_enhanced_post_count: prism,
      vendor_stock_post_count: vendor,
    };
  }

  static supportedTargets(): PostSelectorTarget[] {
    return ["hypermill", "fusion360", "inventor_hsm", "mastercam", "generic"];
  }
}

export const camPostSelectorUIEngine = CAMPostSelectorUIEngine;
