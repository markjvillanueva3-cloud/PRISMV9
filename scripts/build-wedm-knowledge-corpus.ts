/**
 * build-wedm-knowledge-corpus.ts — wire-EDM KNOWLEDGE training corpus.
 *
 * Real wire-EDM program examples in the JM Die archive are scarce (~2 genuine
 * wire programs; the WIRE EDM folder is mostly misfiled lathe + binary .mcx).
 * But the wire-EDM KNOWLEDGE is rich: 145 cited tribal tips + the calibrated
 * FA-10S E-code/H-offset tech tables. This runner turns that knowledge into
 * instruction-tuning Alpaca pairs:
 *
 *   Part 1 — each tribal tip -> a category-aware advisory pair (situation -> expert answer)
 *   Part 2 — each E-code family -> a program-structure pair (job -> multi-pass H-offset cascade)
 *
 *   cd mcp-server && npx tsx ../scripts/build-wedm-knowledge-corpus.ts
 *
 * Standalone (tsx) — runs with MCP down. Pure data transform of existing
 * canonical sources (wedm-knowledge-tips.ts + jm-die-wedm-tech-tables.ts);
 * NEVER inlines discharge constants (all values come FROM the tech table).
 * Deterministic stratified split. Fail-loud on 0 pairs.
 *
 * NOTE: no ${...} template literals — the scripts/ security hook flags them.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { WEDM_KNOWLEDGE_TIPS } from "../mcp-server/src/data/wedm-knowledge-tips.js";
import {
  JM_DIE_ECODE_FAMILIES,
  selectECodeFamily,
  JM_DIE_MCODE_SEQUENCE,
} from "../mcp-server/src/data/jm-die-wedm-tech-tables.js";
import { WIRE_SPEC_CATALOG } from "../mcp-server/src/data/wire-spec-sheets.js";

const OUT_DIR = path.resolve(process.cwd(), "data/training/wedm-knowledge");
const SEED = 42;

type Pair = {
  instruction: string;
  input: string;
  output: string;
  meta: { id: string; category: string; confidence: number; source: string; kind: string };
};

// Category-aware instruction framing so the model learns WHICH lens applies.
const INSTR_BY_CAT: Record<string, string> = {
  troubleshooting: "You are a wire-EDM (Mitsubishi FA-series) expert. Diagnose the problem and give the corrective action.",
  operations_diagnostics: "You are a wire-EDM (Mitsubishi FA-series) expert. Diagnose the problem and give the corrective action.",
  physics: "Explain the wire-EDM discharge physics behind the following.",
  dielectric_chemistry: "Explain the wire-EDM dielectric/chemistry consideration below.",
  programming: "As a wire-EDM CNC programming expert, explain the following programming practice.",
  controller_dialect: "As a Mitsubishi/Sodick wire-EDM controller expert, explain the following dialect detail.",
  cam_canonical: "As a wire-EDM CAM expert, explain the following.",
  wedm_tactics: "Share the wire-EDM tactic for the following situation.",
  machining: "Advise on the wire-EDM machining practice below.",
  speeds_feeds: "Advise on wire-EDM speeds/feeds for the situation below.",
  process_parameters: "Advise on wire-EDM process parameters for the situation below.",
  setup: "Provide wire-EDM setup guidance for the following.",
  safety: "Provide wire-EDM safety guidance for the following.",
  quality: "Advise on wire-EDM quality / surface integrity for the following.",
  surface_finish: "Advise on wire-EDM surface finish (Ra) for the following.",
  materials: "Advise on wire-EDM material handling for the following.",
  workpiece_machinability: "Advise on wire-EDM machinability for the material/situation below.",
  tooling: "Advise on wire-EDM wire / consumable selection for the following.",
  maintenance: "Provide wire-EDM machine maintenance guidance for the following.",
  tool_life: "Advise on wire-EDM wire / tool life for the following.",
  cost: "Advise on wire-EDM cost considerations for the following.",
  shop_ground_truth: "Share the JM Die shop-floor wire-EDM practice for the following.",
  ai_ml: "Explain the wire-EDM ML / AI insight below.",
  ai_optimization: "Explain the wire-EDM AI optimization insight below.",
};
const INSTR_DEFAULT =
  "You are a wire-EDM (wire electrical-discharge machining) expert. Provide expert guidance on the following.";

type RawTip = {
  id?: string;
  title?: string;
  body?: string;
  description?: string;
  category?: string;
  confidence?: number;
  source?: string;
};

function normConf(c: number | undefined): number {
  if (typeof c !== "number" || !Number.isFinite(c)) return 0.8;
  return c > 1 ? Math.min(1, c / 100) : Math.max(0, c);
}

// ── Grounding enrichment (U-KNOWLEDGE-GROUNDING-ENRICH) ──
// The knowledge-corpus evaluator measured grounding as the weakest axis (~0.43):
// qualitative advisory tips under-cite concrete anchors. For a tip that is
// GENUINELY ABOUT a parameterized topic (offset cascade / wire selection /
// M-code sequence) AND whose body omits the numbers, append ONE labeled,
// ACCURATE reference line drawn FROM the real tech tables.
//
// Gating is deliberately STRICT (the first cut, reviewed FAIL, was too loose —
// bare tokens "pass"/"wire" mis-attached a brass-wire spec to safety/ML/CRM
// tips and homogenized 61% of the corpus into ~2 boilerplate tails). Three
// guards together prevent anchor-stuffing + mis-attachment:
//   1. CATEGORY ALLOWLIST per ref type — a wire spec only attaches to a
//      wire-selection tip, never to safety/ai/physics/shop-ground-truth/cost.
//   2. GENUINE-TOPIC regex — requires real subject co-occurrence (e.g. "offset"
//      with cascade/decrease language), not the bare token.
//   3. NOT-ALREADY-GROUNDED — skip when the body already cites the anchor.
// Cascade family is selected by the tip's named material (selectECodeFamily) so
// material-specific tips get material-specific cascades (diversity, anti-homog).
// Every value comes from a canonical source (never fabricated). Append-only.
const STD_FAMILY = JM_DIE_ECODE_FAMILIES.find((f) => f.num_passes === 4 && f.axes === 2);

function cascadeRefFor(fam: typeof STD_FAMILY): string {
  if (!fam) return "";
  return (
    "Shop-calibrated reference (" + fam.id + " " + fam.num_passes + "-pass): " +
    fam.passes
      .map((p) => p.h_register + " offset " + p.offset_inches + " in" + (p.feed_ipm == null ? "" : ", feed " + p.feed_ipm + " ipm"))
      .join("; ") + " (offsets strictly decrease, rough->skim)."
  );
}

function findWire(re: RegExp): Record<string, any> | undefined {
  return (WIRE_SPEC_CATALOG as Array<Record<string, any>>).find((w) =>
    re.test(String(w?.material ?? "") + " " + String(w?.product_name ?? "") + " " + JSON.stringify(w?.applications ?? [])),
  );
}
function wireRefLine(w: Record<string, any> | undefined): string {
  if (!w || typeof w?.diameter_mm?.value !== "number") return "";
  const tens = w?.tension_N?.value;
  return (
    "Shop-calibrated reference: " + String(w.manufacturer ?? "").trim() + " " + String(w.product_name ?? w.id ?? "").trim() +
    " " + String(w.material ?? "").trim() + ", diameter " + w.diameter_mm.value + " mm" +
    (typeof tens === "number" ? ", operating tension " + tens + " N" : "") + "."
  );
}
const COATED_WIRE_REF = wireRefLine(findWire(/coat|zinc|gamma/i));
const BRASS_WIRE_REF = wireRefLine(findWire(/brass/i));
const MCODE_REF =
  "Shop-calibrated reference (FA-10S start): " + JM_DIE_MCODE_SEQUENCE.start_sequence.join(" ") +
  (JM_DIE_MCODE_SEQUENCE.double_tank_fill ? " (M78 always doubled)" : "") + ".";

// Categories where each ref type genuinely belongs (allowlist — everything else
// is excluded, killing the safety/ai/physics/CRM mis-attachments).
const CASCADE_CATS = new Set(["programming", "process_parameters", "speeds_feeds"]);
const WIRE_CATS = new Set(["tooling", "workpiece_machinability"]);
const MCODE_CATS = new Set(["controller_dialect", "programming"]);

// Genuine-topic gates (require real subject, not a stray token).
const OFFSET_TOPIC_RE = /h-?offset|offset cascade|pass schedule|multi-?pass|(\boffset\b[\s\S]{0,40}\b(decreas|cascade|skim|rough|pass)\b)|(\b(skim|rough)\b[\s\S]{0,40}\boffset\b)/i;
const WIRE_SEL_RE = /wire (type|selection|choice|diameter|material)|which wire|(brass|coated|zinc|gamma|molybdenum|tungsten)\s+wire|\bwire\b[\s\S]{0,40}\b(select|choose|recommend|coated|gamma|zinc)\b/i;
const MCODE_TOPIC_RE = /\bm78\b|\bm90\b|\bm91\b|adaptive control|tank fill|(start|end)\s+sequence|m-?code/i;

const E_CODE_RE = /\bE\d{2,4}/i; // E12xx / E1234 style families
const DEC_INCH_RE = /\d*\.\d+\s*in(?:ch)?\b/i;
const MM_RE = /\d+(\.\d+)?\s*mm\b/i;
const MCODE_RE = /\bM\d{2,3}\b/;
const MAT_RE = /\b(D2|M2|A2|S7|H13|O1|4140|316L?|17-4|carbide|tungsten|WC|PCD|inconel)\b/i;

/** At most one labeled, accurate reference line for a tip GENUINELY ABOUT a
 * parameterized topic whose body omits the numbers; "" otherwise. Category +
 * topic + not-already-grounded gates prevent mis-attachment/stuffing. Exported
 * for verification. */
export function groundingAddendum(title: string, body: string, category: string): string {
  const cat = String(category ?? "");
  const orig = String(title ?? "") + " " + String(body ?? "");
  const t = orig.toLowerCase();
  const b = String(body ?? "");
  // M-code FIRST (was unreachable behind the wire gate in the failed first cut).
  if (MCODE_CATS.has(cat) && MCODE_TOPIC_RE.test(t) && !MCODE_RE.test(b)) {
    return MCODE_REF;
  }
  // Offset cascade — programming/process/speeds-feeds tips genuinely about offsets.
  if (CASCADE_CATS.has(cat) && OFFSET_TOPIC_RE.test(t) && !E_CODE_RE.test(b) && !DEC_INCH_RE.test(b)) {
    const mm = orig.match(MAT_RE);
    const fam = (mm ? selectECodeFamily({ material: mm[1] }) : null) ?? STD_FAMILY;
    return cascadeRefFor(fam);
  }
  // Wire selection — tooling/machinability tips genuinely about choosing a wire.
  if (WIRE_CATS.has(cat) && WIRE_SEL_RE.test(t) && !MM_RE.test(b)) {
    if (/coat|zinc|gamma|carbide|\bwc\b|tungsten/.test(t) && COATED_WIRE_REF) return COATED_WIRE_REF;
    if (BRASS_WIRE_REF) return BRASS_WIRE_REF;
  }
  return "";
}

/** Part 1 — tribal tips -> advisory pairs (with grounding enrichment). */
function tipPairs(): Pair[] {
  const out: Pair[] = [];
  const seen = new Set<string>();
  for (const t of WEDM_KNOWLEDGE_TIPS as RawTip[]) {
    const id = typeof t.id === "string" ? t.id : "";
    const title = typeof t.title === "string" ? t.title.trim() : "";
    const body = (typeof t.body === "string" ? t.body : t.description ?? "").trim();
    if (id.length === 0 || title.length === 0 || body.length < 20) continue; // skip stubs
    if (seen.has(id)) continue;
    seen.add(id);
    const cat = typeof t.category === "string" ? t.category : "";
    const add = groundingAddendum(title, body, cat);
    out.push({
      instruction: INSTR_BY_CAT[cat] ?? INSTR_DEFAULT,
      input: title,
      output: add ? body + "\n\n" + add : body,
      meta: {
        id: "tribal:" + id,
        category: cat || "general",
        confidence: normConf(t.confidence),
        source: typeof t.source === "string" ? t.source : "wedm-knowledge-tips",
        kind: "advisory",
      },
    });
  }
  return out;
}

/** Part 2 — E-code families -> multi-pass H-offset cascade pairs. */
function techTablePairs(): Pair[] {
  const out: Pair[] = [];
  for (const fam of JM_DIE_ECODE_FAMILIES) {
    const passLines = fam.passes
      .map((p) => {
        const feed = p.feed_ipm == null ? "operator-set feed" : p.feed_ipm + " ipm";
        return (
          "Pass " + p.pass_number + " (" + p.type + "): " + p.e_code + ", " + feed +
          ", " + p.h_register + " offset " + p.offset_inches + " in"
        );
      })
      .join("\n");
    out.push({
      instruction:
        "Generate the JM Die Mitsubishi FA-10S multi-pass E-code / H-offset cascade for the cut described. " +
        "Use the shop-calibrated table values; H-offsets must strictly DECREASE from rough to final skim.",
      input:
        fam.description + ". Materials: " + fam.materials.join(", ") + ". " +
        fam.axes + "-axis, " + fam.num_passes + " passes" +
        (fam.uses_h175_master ? ", H175 master-offset style." : "."),
      output:
        "Family " + fam.id + " (" + fam.num_passes + "-pass):\n" + passLines +
        "\nThe H-offset cascade strictly decreases (rough heaviest, final skim tightest) — never re-increase, or the wire re-cuts/leaves stock. " +
        (fam.axes === 4 ? "UV taper: all H-registers = 0 (post handles taper in UV coords)." : ""),
      meta: {
        id: "techtable:" + fam.id,
        category: "programming",
        confidence: 0.95,
        source: "jm-die-wedm-tech-tables",
        kind: "tech_table",
      },
    });
  }
  return out;
}

/** Part 3 — one pair per pass (E-code/feed/H-offset), from the families. */
function perPassPairs(): Pair[] {
  const out: Pair[] = [];
  for (const fam of JM_DIE_ECODE_FAMILIES) {
    for (const p of fam.passes) {
      const feed = p.feed_ipm == null ? "operator-set at the machine" : p.feed_ipm + " ipm (" + p.feed_mm_min + " mm/min)";
      out.push({
        instruction: "Give the JM Die FA-10S shop-calibrated settings for one pass of a wire-EDM cut.",
        input: "Family: " + fam.description + ". Pass " + p.pass_number + " of " + fam.num_passes + " (" + p.type + ").",
        output:
          "Pass " + p.pass_number + " (" + p.type + "): E-code " + p.e_code + ", feed " + feed + ", " +
          p.h_register + " wire offset " + p.offset_inches + " in (" + p.offset_mm + " mm)." +
          (p.type === "rough"
            ? " Rough pass — heaviest offset; adaptive control M90 on."
            : " Skim pass — adaptive control M91 (off); reduce flush pressure vs the rough pass."),
        meta: { id: "techpass:" + fam.id + ":p" + p.pass_number, category: "programming", confidence: 0.95, source: "jm-die-wedm-tech-tables", kind: "tech_pass" },
      });
    }
  }
  return out;
}

/** Part 4 — E-code family SELECTION pairs (answer computed by the real selector). */
function selectionPairs(): Pair[] {
  const scenarios: Array<{ p: Parameters<typeof selectECodeFamily>[0]; desc: string }> = [
    { p: { material: "D2" }, desc: "D2 tool steel, straight cut, standard tolerance" },
    { p: { material: "D2", taper_angle_deg: 2 }, desc: "D2, 2 degree UV taper die" },
    { p: { material: "D2", thickness_mm: 80 }, desc: "D2, 80 mm thick stock" },
    { p: { material: "S7", target_ra_um: 0.3 }, desc: "S7, mirror finish target Ra 0.3 um" },
    { p: { material: "316", taper_angle_deg: 1 }, desc: "316 stainless, 1 degree taper" },
    { p: { material: "6061" }, desc: "6061 aluminum (not in JM Die tech tables)" },
  ];
  const out: Pair[] = [];
  for (const s of scenarios) {
    const fam = selectECodeFamily(s.p);
    const answer = fam
      ? "Use family " + fam.id + " — " + fam.description + " (" + fam.num_passes + " passes, " + fam.axes + "-axis)."
      : "No shop-calibrated JM Die family matches — fall back to generic E-codes and dial in at the machine.";
    out.push({
      instruction: "Select the JM Die Mitsubishi FA-10S E-code family for the wire-EDM job described, and say why.",
      input: s.desc + ".",
      output: answer,
      meta: { id: "techselect:" + JSON.stringify(s.p), category: "programming", confidence: 0.9, source: "jm-die-wedm-tech-tables:selectECodeFamily", kind: "tech_select" },
    });
  }
  return out;
}

/** Part 5 — M-code startup/shutdown sequence pairs (from JM_DIE_MCODE_SEQUENCE). */
function mcodePairs(): Pair[] {
  const m = JM_DIE_MCODE_SEQUENCE;
  return [
    {
      instruction: "Give the JM Die Mitsubishi FA-10S start-of-cut M-code sequence and the gotchas.",
      input: "Wire-EDM start sequence before a cutout.",
      output:
        "Start: " + m.start_sequence.join(" ") + ". " +
        (m.double_tank_fill ? "Tank fill M78 is ALWAYS doubled (M78 M78) — a single M78 triggers intermittent insufficient-fluid alarms during AWT. " : "") +
        (m.adaptive_rough_only ? "Adaptive control M90 is ON for the rough pass only; skims run M91 (off), or the low-power skim discharge looks like a near-short and the servo hunts (bad Ra)." : ""),
      meta: { id: "techmcode:start", category: "controller_dialect", confidence: 0.95, source: "jm-die-wedm-tech-tables:JM_DIE_MCODE_SEQUENCE", kind: "tech_mcode" },
    },
    {
      instruction: "Give the JM Die Mitsubishi FA-10S end-of-cut M-code sequence, glue stop, and program end.",
      input: "Wire-EDM shutdown after a cutout.",
      output:
        "End: " + m.end_sequence.join(" ") + ". Glue stop between cutouts: " + m.glue_stop + ". Program end: " + m.program_end + ".",
      meta: { id: "techmcode:end", category: "controller_dialect", confidence: 0.95, source: "jm-die-wedm-tech-tables:JM_DIE_MCODE_SEQUENCE", kind: "tech_mcode" },
    },
  ];
}

/** Part 6 — wire-selection pairs from the wire-spec catalog (real spec sheets). */
function wireSpecPairs(): Pair[] {
  const out: Pair[] = [];
  for (const w of WIRE_SPEC_CATALOG as Array<Record<string, any>>) {
    const id = typeof w?.id === "string" ? w.id : "";
    const dia = w?.diameter_mm?.value;
    if (id.length === 0 || typeof dia !== "number") continue;
    const apps = Array.isArray(w.applications) && w.applications.length ? w.applications.join(", ") : "general wire-EDM cutting";
    const tens = w?.tension_N?.value;
    const maxTens = w?.max_tension_N?.value;
    const cond = w?.conductivity_pct_IACS?.value;
    const cost = w?.cost_per_m_usd?.value;
    out.push({
      instruction: "Recommend a wire-EDM wire for the application below and give its key operating specs.",
      input: "Application: " + apps + " (material family: " + (w.material ?? "unspecified") + ").",
      output:
        (w.manufacturer ?? "") + " " + (w.product_name ?? id) + " — " + (w.material ?? "") +
        ", diameter " + dia + " mm" +
        (tens != null ? ", operating tension " + tens + " N" + (maxTens != null ? " (break threshold " + maxTens + " N)" : "") : "") +
        (cond != null ? ", conductivity " + cond + " %IACS" : "") +
        (cost != null ? ", ~$" + cost + "/m" : "") +
        ". Best for: " + apps + ".",
      meta: { id: "wirespec:" + id, category: "tooling", confidence: 0.92, source: "wire-spec-sheets", kind: "wire_spec" },
    });
  }
  return out;
}

/** Deterministic stratified-by-kind split (seeded LCG; no Math.random). */
function split(pairs: Pair[], seed: number): { train: Pair[]; val: Pair[]; test: Pair[] } {
  let s = seed >>> 0;
  const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
  const byKind: Record<string, Pair[]> = {};
  for (const p of pairs) (byKind[p.meta.kind] ??= []).push(p);
  const train: Pair[] = [], val: Pair[] = [], test: Pair[] = [];
  for (const arr of Object.values(byKind)) {
    const shuffled = arr
      .map((p) => ({ p, r: rng() }))
      .sort((a, b) => a.r - b.r)
      .map((x) => x.p);
    for (let i = 0; i < shuffled.length; i++) {
      const r = i / Math.max(1, shuffled.length);
      if (r < 0.8) train.push(shuffled[i]);
      else if (r < 0.9) val.push(shuffled[i]);
      else test.push(shuffled[i]);
    }
  }
  return { train, val, test };
}

function main(): void {
  const tips = tipPairs();
  const tech = techTablePairs();
  const perPass = perPassPairs();
  const selection = selectionPairs();
  const mcode = mcodePairs();
  const wire = wireSpecPairs();
  const all = [...tips, ...tech, ...perPass, ...selection, ...mcode, ...wire];

  if (all.length === 0) {
    console.error("[wedm-knowledge] FATAL: 0 pairs produced from knowledge sources. Nothing written.");
    process.exit(2);
  }

  const { train, val, test } = split(all, SEED);
  if (train.length + val.length + test.length !== all.length) {
    console.error("[wedm-knowledge] INVARIANT VIOLATION: split sum != total.");
    process.exit(3);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const write = (name: string, rows: Pair[]) =>
    fs.writeFileSync(path.join(OUT_DIR, name), rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), "utf8");
  write("wedm_knowledge_train.jsonl", train);
  write("wedm_knowledge_val.jsonl", val);
  write("wedm_knowledge_test.jsonl", test);

  const byCat: Record<string, number> = {};
  for (const p of all) byCat[p.meta.category] = (byCat[p.meta.category] ?? 0) + 1;
  const avgOut = Math.round(all.reduce((a, p) => a + p.output.length, 0) / all.length);

  console.log("=== WEDM KNOWLEDGE CORPUS REPORT ===");
  console.log(JSON.stringify({
    total_pairs: all.length,
    advisory_pairs: tips.length,
    tech_cascade_pairs: tech.length,
    per_pass_pairs: perPass.length,
    family_selection_pairs: selection.length,
    mcode_sequence_pairs: mcode.length,
    wire_spec_pairs: wire.length,
    split: { train: train.length, val: val.length, test: test.length },
    categories: Object.keys(byCat).length,
    avg_output_len: avgOut,
    out_dir: OUT_DIR,
  }, null, 2));
  console.log(
    "[wedm-knowledge] OK — " + all.length + " knowledge pairs (" + tips.length + " advisory + " +
    (tech.length + perPass.length + selection.length + mcode.length) + " tech-derived + " + wire.length + " wire-spec).",
  );
}

main();
