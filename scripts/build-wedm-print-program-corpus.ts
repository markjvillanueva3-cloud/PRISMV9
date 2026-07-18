/**
 * build-wedm-print-program-corpus.ts — assemble the WEDM print→program training
 * corpus from the EXISTING title-block-verified triples.
 *
 * The DocuStrata pipeline already OCR'd the scanned JM Die prints, joined them to
 * programs by part number, and emitted title-block-verified triples at
 * `Docustrata/.index/training-triples-v4.jsonl` (match_confidence 1.0). This
 * runner is the FORWARD arc of the training loop: it loads those triples, filters
 * to wire-EDM, reads each matched .NC/.MIN program, builds a PrintExtraction from
 * the verified title block, and feeds the EXISTING
 * `WEDMPrintProgramAlpacaAugmenterEngine` to emit print→program Alpaca pairs.
 *
 *   cd mcp-server && npx tsx ../scripts/build-wedm-print-program-corpus.ts
 *
 * Standalone (tsx) — runs with MCP down. Pure consumer of existing engines; no
 * new engine, no duplication. Fail-loud: exits non-zero on 0 triples / 0 pairs.
 *
 * NOTE: no ${...} template literals — the scripts/ security hook flags them.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { wedmPrintProgramAlpacaAugmenterEngine } from "../mcp-server/src/engines/WEDMPrintProgramAlpacaAugmenterEngine.js";
import type {
  AugmentInput,
  PrintExtraction,
} from "../mcp-server/src/engines/WEDMPrintProgramAlpacaAugmenterEngine.js";

// Title-block-verified triples (main tree, gitignored data — absolute path).
const TRIPLES = "H:/prism/Docustrata/.index/training-triples-v4.jsonl";
const OUT_DIR = path.resolve(process.cwd(), "data/training/wedm-print-program");
const OUT_FILE = path.join(OUT_DIR, "corpus.jsonl");

// A program is genuinely wire-EDM if its PATH is under a WIRE EDM folder, OR its
// CONTENT carries wire-EDM markers (E-code power lines + M78/M80/M82/M84 startup)
// AND lacks lathe/turning markers (G96 CSS, G50 spindle-clamp, T###### turning
// tools). The .MIN/.NC extension alone is NOT a wire signal — Mitsubishi .MIN is
// also used by lathe/mill, so an extension filter over-captures ~15x (49→3).
const WIRE_PATH_RE = /WIRE\s*EDM/i;
const WIRE_CONTENT_RE = /(^|\s)E\d{3,4}(\s|$)/m;
const WIRE_MCODE_RE = /\bM8[0-4]\b/;
const LATHE_MARKER_RE = /\bG96\b|\bG50\s+S|\bT\d{4,6}\b/;

function isWireProgram(programPath: string, content: string): boolean {
  if (WIRE_PATH_RE.test(programPath)) return true;
  if (LATHE_MARKER_RE.test(content)) return false;
  return WIRE_CONTENT_RE.test(content) && WIRE_MCODE_RE.test(content);
}

type CandidateProgram = { name?: string; path?: string; score?: number; program_kind?: string };
type TripleRow = {
  print_id?: string;
  print_disk_path?: string;
  tb_part_number?: string | null;
  tb_drawing_number?: string | null;
  tb_revision?: string | null;
  tb_customer?: string | null;
  tb_material?: string | null;
  tb_description?: string | null;
  candidate_programs?: CandidateProgram[];
  match_confidence?: number;
  has_program?: boolean;
};

/** Candidate programs of a triple that have a path, sorted best-score-first. */
function sortedCandidates(row: TripleRow): CandidateProgram[] {
  return (Array.isArray(row.candidate_programs) ? row.candidate_programs : [])
    .filter((c) => typeof c?.path === "string" && (c.path as string).length > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/** Read a program file; returns null if missing/unreadable/empty. */
function readProgram(p: string): string | null {
  if (!fs.existsSync(p)) return null;
  try {
    const c = fs.readFileSync(p, "utf8");
    return c.trim().length > 0 ? c : null;
  } catch {
    return null;
  }
}

/** Build a PrintExtraction from a triple's verified title-block fields. */
function printExtractionFromTriple(row: TripleRow): PrintExtraction {
  const tb: Record<string, string> = {};
  if (row.tb_part_number) tb.part_no = row.tb_part_number;
  if (row.tb_drawing_number) tb.drawing_no = row.tb_drawing_number;
  if (row.tb_revision) tb.revision = row.tb_revision;
  if (row.tb_customer) tb.customer = row.tb_customer;
  if (row.tb_description) tb.description = row.tb_description;
  return {
    material: row.tb_material ?? null,
    title_block: tb,
    raw_text: row.tb_description ?? undefined,
  };
}

function tierOf(conf: number): "exact" | "loose" | "none" {
  if (conf >= 0.85) return "exact";
  if (conf >= 0.5) return "loose";
  return "none";
}

async function main(): Promise<void> {
  if (!fs.existsSync(TRIPLES)) {
    console.error("[wedm-pp-corpus] FATAL: triples not found at " + TRIPLES + " (run DocuStrata phase16 first).");
    process.exit(2);
  }
  const lines = fs.readFileSync(TRIPLES, "utf8").split(/\r?\n/).filter((l) => l.trim().length > 0);

  let total = 0;
  let wedm = 0;
  let nonWire = 0;
  let progMissing = 0;
  let skipped = 0;
  const pairs: unknown[] = [];
  const tierCount: Record<string, number> = { exact: 0, loose: 0, none: 0 };
  let withPrint = 0;

  for (const line of lines) {
    total += 1;
    let row: TripleRow;
    try {
      row = JSON.parse(line) as TripleRow;
    } catch {
      continue;
    }
    if (row.has_program !== true) continue;
    const cands = sortedCandidates(row);
    if (cands.length === 0) continue;

    // Read candidates best-score-first; keep the first that is genuinely wire-EDM
    // (by path OR content). A triple whose only readable programs are lathe/mill
    // is excluded (counted nonWire) — NOT mislabeled as wedm.
    let prog: CandidateProgram | null = null;
    let programContent = "";
    let anyReadable = false;
    for (const c of cands) {
      const content = readProgram(c.path as string);
      if (content === null) continue;
      anyReadable = true;
      if (isWireProgram(c.path as string, content)) {
        prog = c;
        programContent = content;
        break;
      }
    }
    if (!prog) {
      if (anyReadable) nonWire += 1;
      else progMissing += 1;
      continue;
    }
    wedm += 1;

    const conf = typeof row.match_confidence === "number" ? row.match_confidence : 0;
    const input: AugmentInput = {
      program_content: programContent,
      program_path: prog.path,
      print_extraction: printExtractionFromTriple(row),
      join_confidence: conf,
      join_tier: tierOf(conf),
      confidence_floor: 0.5,
      emit_program_only_below: true,
    };

    const pair = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair(input);
    if (pair.meta.skipped) {
      skipped += 1;
      continue;
    }
    tierCount[pair.meta.confidence_tier] = (tierCount[pair.meta.confidence_tier] ?? 0) + 1;
    if (pair.meta.has_print) withPrint += 1;
    pairs.push(pair);
  }

  if (pairs.length === 0) {
    console.error(
      "[wedm-pp-corpus] FATAL: 0 wire-EDM print->program pairs from " + total +
        " triples (" + wedm + " wire, " + nonWire + " non-wire excluded, " +
        progMissing + " program files missing). Nothing written.",
    );
    process.exit(3);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, pairs.map((p) => JSON.stringify(p)).join("\n") + "\n", "utf8");

  const report = {
    triples_total: total,
    wedm_triples: wedm,
    non_wire_excluded: nonWire,
    program_files_missing: progMissing,
    pairs_emitted: pairs.length,
    pairs_with_print_context: withPrint,
    pairs_program_only: pairs.length - withPrint,
    pairs_skipped: skipped,
    by_tier: tierCount,
    out_file: OUT_FILE,
  };
  console.log("=== WEDM PRINT->PROGRAM CORPUS REPORT ===");
  console.log(JSON.stringify(report, null, 2));
  console.log("[wedm-pp-corpus] OK — " + pairs.length + " print->program pairs (" + withPrint + " with print context).");
}

main().catch((err) => {
  console.error("[wedm-pp-corpus] UNCAUGHT: " + (err && err.stack ? err.stack : String(err)));
  process.exit(1);
});
