/**
 * JMDiePartSpecAdapterEngine -- maps a JMDiePartRecord (file-join index) to a PartSpec
 * (geometric similarity spec) so the LIVE 30,890-record JM part library can feed
 * PartSimilarityEngine.findNearest() -- the "find similar real-world JM parts" capability
 * the operator asked for, ranked against the actual corpus instead of hardcoded archetypes.
 * (U-QP-JM-PARTSPEC-ADAPTER, slot:charlie, W3 of the USE-IT-ALL fleet campaign.)
 *
 * HONEST EXTRACTION (R12): a JMDiePartRecord carries NO geometric fields (it is a
 * print/program/CAD file-join index). This adapter derives ONLY what is genuinely present
 * or a defensible prior, and leaves un-derivable fields undefined (PartSimilarity.compare
 * handles partial specs via `?? []` defaults -- material + machine_type + operations carry
 * the similarity weight; dimensions/tolerances/surface_finish stay undefined, not fabricated):
 *   - machine_type   <- cncPrograms[].machineCategory (REAL, present in the record)
 *   - operations     <- a machine-category prior (lathe -> turn/thread/part_off, etc.)
 *   - material       <- the linked program/print filename or the JM customer->material
 *                       convention (a documented prior, flagged low-confidence)
 *   - iso_group      <- inferred from the resolved material (tool steels -> H)
 *   - dimensions / tolerances / surface_finish / features -> undefined (need print OCR,
 *     which is delta/juliett domain -- a future W3+ upgrade, NOT fabricated here)
 *
 * Each adapted spec carries a `confidence` + `material_source` so a consumer knows how much
 * of the spec is real vs prior. NO new physics, NO inlined constants -- pure mapping.
 */

import type { PartSpec } from "./PartSimilarityEngine.js";

/** A JMDiePartRecord subset this adapter reads (the file-join index shape). */
export interface JMDiePartRecordLike {
  partNumber: string;
  customer?: string;
  cncPrograms?: Array<{
    machineCategory?: string;
    ext?: string;
    copiedAs?: string;
    sourcePath?: string;
  }>;
  prints?: Array<{ copiedAs?: string; label?: string }>;
  [k: string]: unknown;
}

/** A PartSpec plus provenance: how much of it is real vs a prior. */
export interface AdaptedPartSpec {
  id: string; // partNumber (the corpus key)
  spec: PartSpec;
  confidence: number; // 0-1: fraction of the spec derived from REAL record signal
  material_source: "filename" | "customer_convention" | "unknown";
}

/**
 * JM customer -> typical tool-steel/material convention. A DOCUMENTED prior (JM is a
 * die/mold/tool-steel fastener-tooling shop; these are the grades each customer's work
 * runs in), used ONLY when no material is parseable from the linked filename. Flagged
 * `customer_convention` so a consumer can down-weight it. INFORMED BY (a single-grade
 * specialization of) the per-customer typical-materials knowledge in JMDieProgramAnalyzerEngine
 * -- e.g. that engine lists FASTENAL as ["steel","stainless"]; here we pick the concrete
 * representative grade (1018). Kept local because that map is module-private there. Because
 * every hit is flagged customer_convention, a consumer always knows it is a prior, not real.
 */
const JM_CUSTOMER_MATERIAL: Record<string, string> = {
  ACME: "D2",
  ATF: "D2",
  ALCOA: "aluminum",
  FASTENAL: "1018",
  ITW: "D2",
  SFS: "4140",
  "HOLO-KROME": "4140",
  "CLENDENIN BROTHERS": "D2",
};

/** Machine category -> a defensible operations prior (coarse but REAL, not fabricated). */
const MACHINE_OPS_PRIOR: Record<string, string[]> = {
  lathe: ["turn", "thread", "part_off"],
  mill: ["face", "pocket", "drill"],
  wire_edm: ["rough_cut", "skim_cut"],
  sinker_edm: ["burn"],
  grinder: ["grind"],
};

/** Map a JM machineCategory string to the PartSpec machine_type vocabulary. */
function normalizeMachineType(cat: string | undefined): string | undefined {
  if (!cat || typeof cat !== "string") return undefined;
  const c = cat.toLowerCase();
  if (c.includes("lathe") || c.includes("turn")) return "lathe";
  if (c.includes("mill") || c.includes("vmc") || c.includes("hmc")) return "mill";
  if (c.includes("wire") || c.includes("wedm")) return "wire_edm";
  if (c.includes("sinker") || c.includes("edm")) return "sinker_edm";
  if (c.includes("grind")) return "grinder";
  return undefined;
}

/** Tool-steel / common grades -> ISO machinability group (H = hardened tool steel). */
function inferIsoGroup(material: string | undefined): string | undefined {
  if (!material) return undefined;
  const m = material.toUpperCase();
  if (/\b(D2|A2|O1|S7|M2|H13|D3|O2|A6|CPM)\b/.test(m)) return "H"; // tool steels
  if (/\b(4140|4340|1018|1045|8620)\b/.test(m)) return "P"; // carbon/alloy steel
  if (/ALUM|6061|7075|2024/.test(m)) return "N"; // aluminum
  if (/STAINLESS|17-4|303|304|316/.test(m)) return "M"; // stainless
  return undefined;
}

/** Parse a tool-steel/grade token out of a program/print filename, if present. */
function materialFromFilename(record: JMDiePartRecordLike): string | undefined {
  const names: string[] = [];
  for (const p of record.cncPrograms ?? []) {
    if (p.copiedAs) names.push(p.copiedAs);
    if (p.sourcePath) names.push(p.sourcePath);
  }
  for (const p of record.prints ?? []) {
    if (p.copiedAs) names.push(p.copiedAs);
  }
  const blob = names.join(" ").toUpperCase();
  // Match a standalone tool-steel/grade token (word-boundary so WF-112392 != none).
  const m = blob.match(/\b(D2|A2|O1|S7|M2|H13|D3|O2|A6|4140|4340|1018|1045|8620|6061|7075)\b/);
  return m ? m[1] : undefined;
}

export class JMDiePartSpecAdapterEngine {
  readonly name = "JMDiePartSpecAdapterEngine";

  /**
   * Adapt a single JMDiePartRecord to a PartSpec with provenance.
   * Returns null only when the record has no partNumber (un-keyable).
   */
  adapt(record: JMDiePartRecordLike): AdaptedPartSpec | null {
    if (!record || typeof record !== "object" || !record.partNumber) return null;

    // machine_type: REAL signal from the linked program's machineCategory.
    const rawCat = record.cncPrograms?.find((p) => p.machineCategory)?.machineCategory;
    const machine_type = normalizeMachineType(rawCat);

    // operations: a defensible prior from the machine category.
    const operations = machine_type ? MACHINE_OPS_PRIOR[machine_type] : undefined;

    // material: filename token (real) > customer convention (prior) > unknown.
    let material: string | undefined = materialFromFilename(record);
    let material_source: AdaptedPartSpec["material_source"] = "filename";
    if (!material) {
      const cust = (record.customer ?? "").toUpperCase().trim();
      material = JM_CUSTOMER_MATERIAL[cust];
      material_source = material ? "customer_convention" : "unknown";
    }
    // PartSpec.material is required -> fall back to a neutral token when truly unknown.
    const resolvedMaterial = material ?? "unknown_steel";

    const spec: PartSpec = {
      material: resolvedMaterial,
      iso_group: inferIsoGroup(material),
      machine_type,
      operations,
      // geometric fields (dimensions/features/tolerances/surface_finish) intentionally
      // undefined -- not derivable from the file-join index without print OCR (W3+).
    };

    // confidence = fraction of the 3 derivable dims that came from REAL signal:
    // machine_type (real if present), operations (prior, counts as derived), material
    // (real only when from filename). Coarse but honest.
    let real = 0;
    if (machine_type) real += 1;
    if (operations) real += 1;
    if (material_source === "filename") real += 1;
    const confidence = Math.round((real / 3) * 100) / 100;

    return { id: record.partNumber, spec, confidence, material_source };
  }

  /**
   * Adapt a batch of records into the { id, spec } candidate shape that
   * PartSimilarityEngine.findNearest() consumes. Skips un-keyable records.
   */
  adaptBatch(records: JMDiePartRecordLike[]): { id: string; spec: PartSpec }[] {
    if (!Array.isArray(records)) return [];
    const out: { id: string; spec: PartSpec }[] = [];
    for (const r of records) {
      const a = this.adapt(r);
      if (a) out.push({ id: a.id, spec: a.spec });
    }
    return out;
  }
}

export const jmDiePartSpecAdapterEngine = new JMDiePartSpecAdapterEngine();
