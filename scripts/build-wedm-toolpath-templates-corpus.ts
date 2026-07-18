/**
 * build-wedm-toolpath-templates-corpus.ts — Phase A2: per-toolpath-type TEMPLATE
 * training corpus ("train for every possibility to generate a wire part";
 * "templates for every type of tool path with variable parameters + cutting
 * conditions"). Per WEDM-PRINT-TO-PROGRAM-PIPELINE-2026-05-31.md §5 Phase A2.
 *
 * Oracle-augmented (like Regimen #3): for every toolpath type in the registry,
 * sweep its variable-parameter schema across the JM FA-10S envelope grid and emit
 * the template the deterministic engines/tables produce. Multipass types get the
 * full E-code/H-offset cascade (self-validated by the Regimen #3 harness); other
 * types get their strategy template with the swept params + cutting conditions.
 *
 *   cd mcp-server && npx tsx ../scripts/build-wedm-toolpath-templates-corpus.ts
 *
 * Pure core: buildTemplatePairs() returns the deduped pair set + validates every
 * emitted cascade against the harness (THROWS on any invalid one — fail-loud, not
 * a runtime print to trust). main() does the file I/O + split + log and is guarded
 * so importing this module for test does NOT run it.
 *
 * No inlined discharge constants (oracle = jm-die-wedm-tech-tables.ts). No template-${...}.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { WEDM_TOOLPATH_TYPES, JM_FA10S_ENVELOPE, validateAgainstEnvelope } from "../mcp-server/src/data/wedm-toolpath-types.js";
import { JM_DIE_ECODE_FAMILIES, selectECodeFamily, getECodeForPass, getShopFeedForPass, getShopOffsetForPass } from "../mcp-server/src/data/jm-die-wedm-tech-tables.js";
import { cannelureFeedStrategy, microFineWireStrategy, FINE_WIRE_DIAMETER_MM } from "../mcp-server/src/data/wedm-build-strategies.js";
import { checkCascade } from "./lib/wedm-cascade-correctness.mjs";

const OUT_DIR = path.resolve(process.cwd(), "data/training/wedm-toolpath-templates");
const SEED = 42;
/** Representative tight cannelure pitch = this multiple of wire-Ø (< 3x => halve-feed fires). */
const REP_CANNELURE_PITCH_WIRE_MULT = 2;
/** Representative in-range nozzle standoff (mm) for a fine-wire template (<= 0.25 gate). */
const REP_MICRO_STANDOFF_MM = 0.2;
const round3 = (x: number) => Math.round(x * 1000) / 1000;

export type TemplatePair = { instruction: string; input: string; output: string; meta: { id: string; toolpath_type: string; kind: string; confidence: number; source: string } };

const MATERIALS = ["D2", "A2", "S7", "M2", "H13", "316", "carbide"];
const THICKNESSES = [10, 25, 50, 80, 120, 180];
const WIRES = JM_FA10S_ENVELOPE.wire_diameters_on_hand_mm; // [0.25, 0.20]

/** Cascade text for a family (taper => H=0), harness-parseable. */
function cascadeText(fam: typeof JM_DIE_ECODE_FAMILIES[number]): string {
  const taper = fam.axes === 4;
  return fam.passes.map((p) => {
    const feed = getShopFeedForPass(fam, p.pass_number);
    const off = taper ? 0 : getShopOffsetForPass(fam, p.pass_number);
    return "Pass " + p.pass_number + " (" + p.type + "): " + getECodeForPass(fam, p.pass_number) + ", " + (feed == null ? "operator-set feed" : feed + " ipm") + ", " + p.h_register + " offset " + off + " in";
  }).join("\n");
}
function expectedFor(fam: typeof JM_DIE_ECODE_FAMILIES[number]) {
  return fam.passes.map((p) => ({ pass_number: p.pass_number, e_code: getECodeForPass(fam, p.pass_number), offset_inches: fam.axes === 4 ? 0 : getShopOffsetForPass(fam, p.pass_number), feed_ipm: getShopFeedForPass(fam, p.pass_number) }));
}

/** Render the variable cutting-condition block for a type (param schema instance). */
function paramBlock(typeId: string, params: Record<string, unknown>): string {
  const t = WEDM_TOOLPATH_TYPES.find((x) => x.id === typeId);
  if (!t) return JSON.stringify(params);
  const lines = t.params.map((p) => p.name + ": " + (params[p.name] != null ? String(params[p.name]) : "(default)") + (p.unit ? " " + p.unit : ""));
  return lines.join("; ");
}

/**
 * Pure core — build the deduped template pair set for the whole registry.
 * Every emitted multipass cascade is re-checked against the harness; an invalid
 * one THROWS (fail-loud) so the corpus can never silently ship a bad cascade.
 * Returns the unique pairs + the count of cascades validated.
 */
export function buildTemplatePairs(): { pairs: TemplatePair[]; cascadesValidated: number } {
  const out: TemplatePair[] = [];
  let cascadesValidated = 0;

  for (const t of WEDM_TOOLPATH_TYPES) {
    const isMultipass = t.e_code_family !== "";
    for (const material of MATERIALS) {
      for (const thickness_mm of THICKNESSES) {
        for (const wire of WIRES) {
          const taper = t.id === "taper_uv";
          const job = { material, thickness_mm, wire_diameter_mm: wire, taper_angle_deg: taper ? 2 : 0 };
          const feas = validateAgainstEnvelope(t.id, job);
          if (!feas.feasible) continue; // only in-envelope templates

          if (isMultipass) {
            const fam = selectECodeFamily({ material, thickness_mm, taper_angle_deg: taper ? 2 : undefined }) ?? JM_DIE_ECODE_FAMILIES.find((f) => f.id === t.e_code_family);
            if (!fam) continue;
            const text = cascadeText(fam);
            // self-validate the emitted cascade against the harness + oracle.
            const chk = checkCascade(text, { taper: fam.axes === 4, expected: expectedFor(fam) });
            if (!chk.valid) { throw new Error("[templates] FATAL: " + t.id + "/" + material + " cascade invalid: " + JSON.stringify(chk.violations)); }
            cascadesValidated += 1;
            // A3: cannelure is multipass — enrich the rough pass with the real
            // halve-feed derate (computed at a representative tight pitch).
            let stratNote = "";
            if (t.id === "closely_spaced_cannelure") {
              const pitch = round3(REP_CANNELURE_PITCH_WIRE_MULT * wire);
              const can = cannelureFeedStrategy({ base_feed_mm_min: getShopFeedForPass(fam, 1), feature_pitch_mm: pitch, wire_diameter_mm: wire });
              (job as Record<string, unknown>).feature_pitch_mm = pitch;       // so paramBlock renders the swept value, not "(default)"
              (job as Record<string, unknown>).feed_derate = can.feed_derate_used;
              stratNote = "\nCannelure strategy: " + can.reason + (can.derated_feed_mm_min != null ? " -> rough feed " + can.derated_feed_mm_min + " ipm" : " (operator-set rough feed -> halve at machine)") + ".";
            }
            const cutCond = paramBlock(t.id, job);
            out.push({
              instruction: "Generate the " + t.label + " toolpath template for the JM FA-10S. Emit the full pass schedule (strictly-decreasing H-offset cascade" + (taper ? ", H=0 taper" : "") + ").",
              input: material + ", " + thickness_mm + " mm" + (taper ? ", 2 deg taper" : "") + ", " + wire + " mm wire. Cutting conditions — " + cutCond,
              output: "Toolpath type: " + t.id + " (family " + fam.id + ").\n" + text + stratNote,
              meta: { id: "tpl:" + t.id + ":" + material + ":" + thickness_mm + ":" + wire, toolpath_type: t.id, kind: "template_multipass", confidence: 0.92, source: "wedm-toolpath-types + jm-die-wedm-tech-tables" + (t.id === "closely_spaced_cannelure" ? " + wedm-build-strategies(cannelure)" : "") },
            });
          } else {
            // Non-cascade strategy template (corner/start-hole/etc.) — emit the
            // strategy structure + the variable params/cutting conditions.
            let output = "Toolpath type: " + t.id + ". Owning engine: " + t.owning_engine + ". Variable params — " + paramBlock(t.id, job) + ". Feasibility: " + t.feasibility + ". Provenance: " + t.provenance + ".";
            let src = "wedm-toolpath-types registry";
            // A3: micro/fine-wire emits the REAL computed derate + standoff gate.
            // The ideal fine wire is 0.10 mm (NOT on JM spools) — a deliberate
            // closed-loop inventory linkage, surfaced in the template itself.
            if (t.id === "micro_fine_wire") {
              const micro = microFineWireStrategy({ base_feed_mm_min: null, wire_diameter_mm: FINE_WIRE_DIAMETER_MM, standoff_mm: REP_MICRO_STANDOFF_MM });
              output = "Toolpath type: micro_fine_wire. Owning engine: " + t.owning_engine + ". Fine wire " + FINE_WIRE_DIAMETER_MM + " mm, standoff " + REP_MICRO_STANDOFF_MM + " mm, feed/power derate x" + micro.power_derate_used + ". " + micro.reason + ". NOTE: " + FINE_WIRE_DIAMETER_MM + " mm wire is NOT on the JM FA-10S spool set (0.25/0.20) — the inventory gate requires a PO before this program can run. Provenance: " + t.provenance + ".";
              src = "wedm-toolpath-types + wedm-build-strategies(micro)";
            }
            out.push({
              instruction: "Generate the " + t.label + " strategy template for the JM FA-10S. State the variable parameters + cutting conditions + the feasibility constraints.",
              input: material + ", " + thickness_mm + " mm, " + wire + " mm wire.",
              output,
              meta: { id: "tpl:" + t.id + ":" + material + ":" + thickness_mm + ":" + wire, toolpath_type: t.id, kind: "template_strategy", confidence: 0.9, source: src },
            });
          }
        }
      }
    }
  }

  // dedup identical (material grid can repeat for non-cascade types).
  const seen = new Set<string>();
  const uniq = out.filter((p) => (seen.has(p.meta.id) ? false : (seen.add(p.meta.id), true)));
  return { pairs: uniq, cascadesValidated };
}

/** Deterministic per-type 80/10/10 split (seeded LCG; stratified by toolpath type). */
export function splitByType(uniq: TemplatePair[], seed = SEED): { train: TemplatePair[]; val: TemplatePair[]; test: TemplatePair[] } {
  let s = seed >>> 0;
  const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
  const byType: Record<string, TemplatePair[]> = {};
  for (const p of uniq) (byType[p.meta.toolpath_type] ??= []).push(p);
  const train: TemplatePair[] = [], val: TemplatePair[] = [], test: TemplatePair[] = [];
  for (const arr of Object.values(byType)) {
    const sh = arr.map((p) => ({ p, r: rng() })).sort((a, b) => a.r - b.r).map((x) => x.p);
    for (let i = 0; i < sh.length; i++) { const r = i / Math.max(1, sh.length); if (r < 0.8) train.push(sh[i]); else if (r < 0.9) val.push(sh[i]); else test.push(sh[i]); }
  }
  return { train, val, test };
}

function main(): void {
  const { pairs: uniq, cascadesValidated } = buildTemplatePairs();
  if (uniq.length === 0) { console.error("[templates] FATAL: 0 pairs."); process.exit(2); }
  const { train, val, test } = splitByType(uniq, SEED);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const write = (n: string, rows: TemplatePair[]) => fs.writeFileSync(path.join(OUT_DIR, n), rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), "utf8");
  write("wedm_toolpath_templates_train.jsonl", train);
  write("wedm_toolpath_templates_val.jsonl", val);
  write("wedm_toolpath_templates_test.jsonl", test);

  const byTypeCount: Record<string, number> = {};
  for (const p of uniq) byTypeCount[p.meta.toolpath_type] = (byTypeCount[p.meta.toolpath_type] ?? 0) + 1;
  console.log("=== WEDM TOOLPATH-TEMPLATE CORPUS (Phase A2) ===");
  console.log(JSON.stringify({ total: uniq.length, types_covered: Object.keys(byTypeCount).length, cascades_self_validated: cascadesValidated, by_type: byTypeCount, split: { train: train.length, val: val.length, test: test.length } }, null, 2));
  console.log("[templates] OK — " + uniq.length + " template pairs across " + Object.keys(byTypeCount).length + " toolpath types; " + cascadesValidated + " cascades self-validated.");
}

// Only run when invoked directly (npx tsx ...), not when imported by the test.
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
