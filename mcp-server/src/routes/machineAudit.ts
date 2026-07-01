/**
 * Machine Data Audit route -- MCAT-MS0 U-MCAT19 backend (slot:romeo 2026-06-18, FE<->BE contract gap).
 *
 * The web SPA `web/src/pages/MachineDataAuditPage.tsx` does `GET /api/machine-audit` expecting
 * `{ machines: MachineAuditRecord[], summary: AuditSummary }`; with no backend route it 404'd and fell
 * back to randomly-generated MOCK data. This route serves the REAL JM fleet's data-completeness audit --
 * the dashboard's actual purpose is to surface WHICH machine fields are missing, so reporting genuine
 * (partial) completeness is the honest, correct behavior, not a misleading approximation.
 *
 * Wiring (romeo's lane -- glue between two EXISTING engines, no new engine):
 *   ShopConfigurationEngine.getMachines() (real 21 JM machines, FLAT ShopMachine shape)
 *     -> toCanonical() restructures the real values into the NESTED CanonicalMachinePackage paths that
 *        MachineDataAuditEngine.auditMachineFields() navigates (e.g. max_rpm -> spindle.max_rpm).
 *        This MOVES real values; it never invents data -- genuinely-absent fields stay absent and are
 *        honestly audited as missing.
 *     -> auditMachineFields() + calculateCompleteness() (real audit) -> reshape to the SPA contract.
 *
 * HONEST-GAP disclosure (R12): `backfilled_fields` is always `[]` (this route performs NO backfilling) and
 * `confidence_overall` is a presence-based proxy (= completeness_score) until the MCAT hardening
 * (backfill provenance) + quality (confidence) engines are integrated -- that integration is foxtrot's
 * machine-domain build (see state/shared/specs/FRONTEND-BACKEND-CONTRACT-2026-06-18.md). Both are labeled,
 * not fabricated.
 */
import { Router } from "express";
import { shopConfigurationEngine, type ShopMachine } from "../engines/ShopConfigurationEngine.js";
import { MachineDataAuditEngine } from "../engines/MachineDataAuditEngine.js";

/** Restructure a flat ShopMachine into the nested shape the audit engine navigates. ONLY real values are
 *  copied; a field absent on the ShopMachine is left undefined so the audit honestly counts it missing. */
function toCanonical(m: ShopMachine): Record<string, unknown> {
  const tokens = (m.name || "").trim().split(/\s+/);
  const c: Record<string, unknown> = {
    id: m.id,
    manufacturer: tokens[0] || undefined,          // JM naming convention: first token is the maker
    model: tokens.slice(1).join(" ") || m.name || undefined,
    machine_type: m.type,
  };
  const spindle: Record<string, unknown> = {};
  if (m.max_rpm != null) spindle.max_rpm = m.max_rpm;
  if (m.max_power_kw != null) spindle.power_continuous_kw = m.max_power_kw;
  if (m.max_torque_nm != null) spindle.torque_max_nm = m.max_torque_nm;
  if (m.spindle_taper) spindle.taper = m.spindle_taper;
  if (Object.keys(spindle).length) c.spindle = spindle;

  const envelope: Record<string, unknown> = {};
  if (m.work_envelope?.x_mm != null) envelope.x_travel_mm = m.work_envelope.x_mm;
  if (m.work_envelope?.y_mm != null) envelope.y_travel_mm = m.work_envelope.y_mm;
  if (m.work_envelope?.z_mm != null) envelope.z_travel_mm = m.work_envelope.z_mm;
  if (Object.keys(envelope).length) c.envelope = envelope;

  if (m.controller) c.controller = { family: m.controller };
  if (m.coolant_types?.length) c.coolant = { type: m.coolant_types[0] };
  return c;
}

// Completeness is measured against the fields PRISM ACTUALLY TRACKS per machine (the universally-applicable,
// speed/feed-relevant attributes the flat ShopMachine schema carries), NOT the full 54-field canonical ideal.
// Auditing against all 54 would floor every JM machine at ~12% with all categories permanently red (it
// includes ~21 fields ShopMachine cannot carry: tool_changer.*, physical, capabilities, spindle.bearing_type,
// etc.) -- that reads as "audit broken", misleading the operator (scrutiny arm-B P1, 2026-06-18). These are
// the type-agnostic core fields (mill-only spindle.taper / envelope.y are NOT required so lathes are judged
// fairly). The full-canonical-spec view + per-type field criteria are a foxtrot machine-domain extension
// (FRONTEND-BACKEND-CONTRACT-2026-06-18.md). All field keys are real AUDIT_FIELDS entries.
const REQUIRED_MAPPABLE: Record<string, string[]> = {
  identity: ["id", "manufacturer", "model", "machine_type"],
  spindle: ["spindle.max_rpm", "spindle.power_continuous_kw", "spindle.torque_max_nm"],
  controller: ["controller.family"],
  envelope: ["envelope.x_travel_mm", "envelope.z_travel_mm"],
  coolant: ["coolant.type"],
};

/** A category is "complete" iff every TRACKED field for it (REQUIRED_MAPPABLE) is present on this machine. */
function categoryComplete(fields: Record<string, boolean>, category: string): boolean {
  const req = REQUIRED_MAPPABLE[category] || [];
  return req.length > 0 && req.every((f) => fields[f] === true);
}

/** Completeness = fraction of the tracked fields (all REQUIRED_MAPPABLE categories) present on this machine. */
function trackedCompleteness(fields: Record<string, boolean>): number {
  const all = Object.values(REQUIRED_MAPPABLE).flat();
  const present = all.filter((f) => fields[f] === true).length;
  return all.length ? present / all.length : 0;
}

export function createMachineAuditRouter(): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const machines = shopConfigurationEngine.getMachines();
    const records = machines.map((m) => {
      const canonical = toCanonical(m);
      const fields = MachineDataAuditEngine.auditMachineFields(canonical);
      const completeness = trackedCompleteness(fields);
      return {
        id: m.id,
        manufacturer: (canonical.manufacturer as string) || "Unknown",
        model: (canonical.model as string) || m.name,
        type: m.type,
        spindle_complete: categoryComplete(fields, "spindle"),
        controller_complete: categoryComplete(fields, "controller"),
        envelope_complete: categoryComplete(fields, "envelope"),
        coolant_complete: categoryComplete(fields, "coolant"),
        backfilled_fields: [] as string[],            // HONEST: this route performs no backfilling
        completeness_score: Math.round(completeness * 100) / 100,
        confidence_overall: Math.round(completeness * 100) / 100, // presence proxy until MCAT quality-scoring
      };
    });

    const n = records.length || 1;
    const sum = (pred: (r: typeof records[number]) => boolean) => records.filter(pred).length;
    const summary = {
      total_machines: records.length,
      spindle_complete: sum((r) => r.spindle_complete),
      controller_complete: sum((r) => r.controller_complete),
      envelope_complete: sum((r) => r.envelope_complete),
      coolant_complete: sum((r) => r.coolant_complete),
      backfilled_count: 0,
      avg_completeness: Math.round((records.reduce((a, r) => a + r.completeness_score, 0) / n) * 100) / 100,
      avg_confidence: Math.round((records.reduce((a, r) => a + r.confidence_overall, 0) / n) * 100) / 100,
    };

    res.json({ machines: records, summary });
  });

  return router;
}
