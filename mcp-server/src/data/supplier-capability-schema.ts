/**
 * supplier-capability-schema.ts — constants & taxonomy for the multi-tenant supplier-capability
 * data model of the PRISM manufacturing networking marketplace (galaxy:business, slot:hotel).
 *
 * This is the SINGLE SOURCE OF TRUTH for the networking platform's capability vocabulary:
 *   - the ISO 513 material groups a shop runs (P/M/K/N/S/H),
 *   - the process networks a shop offers (mill/turn/wedm/grind/swiss/5axis/sinker_edm/waterjet/laser/brake_press),
 *   - the certifications a shop carries (ISO9001/AS9100/ITAR/CMMC_L1/CMMC_L2/NADCAP),
 *   - the controller dialects a shop's machines run.
 * SupplierCapabilityProfileEngine (and downstream RFQMatchScoring) import these — never inline a
 * material group, a process name, a certification code, or a controller string.
 *
 * Citation: ISO 513 material groups; Axhera process networks; AS9100/ITAR/CMMC cert taxonomy.
 *   - ISO 513:2012 "Classification and application of hard cutting materials" defines six workpiece
 *     groups P (steel), M (stainless), K (cast iron), N (non-ferrous), S (superalloy/heat-resistant),
 *     H (hardened). The same six groups are the canonical PRISM material-group axis
 *     (mirrors src/physics/constants.ts kc1.1 keys P/M/K/N/S/H).
 *   - Process networks mirror the eight Axhera process networks (mill / turn / wire-EDM / grind /
 *     swiss / 5-axis / sinker-EDM / waterjet) plus the two obvious manufacturing-marketplace extras
 *     (laser cutting, press-brake forming) common to Xometry/Fictiv/Protolabs supplier rosters.
 *   - Certifications follow the AS9100 (aerospace QMS), ITAR (22 CFR 120-130 export control),
 *     CMMC 2.0 Levels 1-2 (DoD cyber maturity), and NADCAP (special-process aerospace accreditation)
 *     taxonomy layered on the ISO 9001 QMS baseline.
 */

export const SUPPLIER_CAPABILITY_SCHEMA_VERSION = "1.0.0";

// ============================================================================
// ISO 513 MATERIAL GROUPS (the canonical six workpiece groups)
// ============================================================================

/** An ISO 513 workpiece material group letter. */
export type IsoMaterialGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** The six ISO 513 material groups with their canonical names (ISO 513:2012). */
export const ISO_MATERIAL_GROUPS: ReadonlyArray<{ group: IsoMaterialGroup; name: string }> = Object.freeze([
  Object.freeze({ group: "P", name: "Steel" }),
  Object.freeze({ group: "M", name: "Stainless steel" }),
  Object.freeze({ group: "K", name: "Cast iron" }),
  Object.freeze({ group: "N", name: "Non-ferrous (aluminium/copper/brass)" }),
  Object.freeze({ group: "S", name: "Superalloy / heat-resistant (Ni/Co/Ti)" }),
  Object.freeze({ group: "H", name: "Hardened steel (45-65 HRC)" }),
]);

/** The bare set of valid group letters (derived from {@link ISO_MATERIAL_GROUPS} — never re-listed). */
const ISO_MATERIAL_GROUP_SET: ReadonlySet<string> = new Set(ISO_MATERIAL_GROUPS.map((g) => g.group));

/** Is `g` one of the six ISO 513 material groups? */
export function isValidMaterialGroup(g: string): g is IsoMaterialGroup {
  return ISO_MATERIAL_GROUP_SET.has(g);
}

/** Resolve a group letter to its ISO 513 name, or null if unknown. */
export function materialGroupName(g: string): string | null {
  return ISO_MATERIAL_GROUPS.find((x) => x.group === g)?.name ?? null;
}

// ============================================================================
// SUPPLIER PROCESSES (the process networks a shop can offer)
// ============================================================================

/** A manufacturing process a supplier offers (Axhera process networks + marketplace extras). */
export type SupplierProcess =
  | "mill"
  | "turn"
  | "wedm"
  | "grind"
  | "swiss"
  | "5axis"
  | "sinker_edm"
  | "waterjet"
  | "laser"
  | "brake_press";

/** The full process taxonomy (8 Axhera networks + laser + brake_press). */
export const SUPPLIER_PROCESSES: ReadonlyArray<SupplierProcess> = Object.freeze([
  "mill",
  "turn",
  "wedm",
  "grind",
  "swiss",
  "5axis",
  "sinker_edm",
  "waterjet",
  "laser",
  "brake_press",
] as const);

const SUPPLIER_PROCESS_SET: ReadonlySet<string> = new Set(SUPPLIER_PROCESSES);

/** Is `p` a recognized supplier process? */
export function isValidProcess(p: string): p is SupplierProcess {
  return SUPPLIER_PROCESS_SET.has(p);
}

// ============================================================================
// CERTIFICATIONS (the cert/accreditation taxonomy a shop can carry)
// ============================================================================

/** A quality / export-control / cyber / special-process certification a supplier holds. */
export type Certification = "ISO9001" | "AS9100" | "ITAR" | "CMMC_L1" | "CMMC_L2" | "NADCAP";

/** The full certification taxonomy. */
export const CERTIFICATIONS: ReadonlyArray<Certification> = Object.freeze([
  "ISO9001", // ISO 9001 QMS baseline
  "AS9100", // aerospace QMS (superset of ISO 9001)
  "ITAR", // ITAR registered (22 CFR 120-130 export control)
  "CMMC_L1", // CMMC 2.0 Level 1 (Foundational)
  "CMMC_L2", // CMMC 2.0 Level 2 (Advanced)
  "NADCAP", // NADCAP special-process accreditation
] as const);

const CERTIFICATION_SET: ReadonlySet<string> = new Set(CERTIFICATIONS);

/** Is `c` a recognized certification code? */
export function isValidCertification(c: string): c is Certification {
  return CERTIFICATION_SET.has(c);
}

// ============================================================================
// CONTROLLER DIALECTS (a machine's CNC controller family)
// ============================================================================

/**
 * A CNC controller dialect a supplier machine runs. Reuses the same controller vocabulary as
 * {@link ShopMachine.controller} in ShopConfigurationEngine (the single-tenant shape this model
 * generalizes), extended with the EDM-marketplace dialects (sodick / agiecharmilles / makino).
 */
export type Controller =
  | "fanuc"
  | "haas"
  | "okuma"
  | "mazak"
  | "siemens"
  | "dmg_mori"
  | "citizen"
  | "star"
  | "hurco"
  | "mitsubishi"
  | "sodick"
  | "agiecharmilles"
  | "makino"
  | "heidenhain"
  | "other";

/** The full controller-dialect taxonomy. */
export const CONTROLLERS: ReadonlyArray<Controller> = Object.freeze([
  "fanuc",
  "haas",
  "okuma",
  "mazak",
  "siemens",
  "dmg_mori",
  "citizen",
  "star",
  "hurco",
  "mitsubishi",
  "sodick",
  "agiecharmilles",
  "makino",
  "heidenhain",
  "other",
] as const);

const CONTROLLER_SET: ReadonlySet<string> = new Set(CONTROLLERS);

/** Is `c` a recognized controller dialect? */
export function isValidController(c: string): c is Controller {
  return CONTROLLER_SET.has(c);
}
