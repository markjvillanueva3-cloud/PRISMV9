/**
 * U-CAL04 — Generate golden snapshots for parser regression testing.
 *
 * Parses all NC programs in data/programs/wire-edm/ and saves the results
 * to data/state/PARSER_GOLDEN_SNAPSHOTS.json.
 *
 * Usage: npx tsx scripts/generate-parser-golden-snapshots.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { wireEDMProgramParserEngine } from "../src/engines/WireEDMProgramParserEngine.js";

const PROGRAMS_DIR = path.resolve("data/programs/wire-edm");
const OUTPUT_FILE = path.resolve("data/state/PARSER_GOLDEN_SNAPSHOTS.json");

interface GoldenSnapshot {
  filename: string;
  parsed_at: string;
  dialect: string;
  dialect_confidence: number;
  program_number: string | null;
  program_comment: string | null;
  pass_count: number;
  contour_move_count: number;
  has_taper: boolean;
  has_auto_thread: boolean;
  has_submerged_cut: boolean;
  work_origin: { x: number | null; y: number | null };
  offset_declarations: Record<string, number>;
  passes: Array<{
    pass_number: number;
    offset_mm: number | null;
    e_code: string | null;
    feed_rate: number | null;
  }>;
  safety: {
    has_program_end: boolean;
    has_wire_stop: boolean;
    has_offset_cancel: boolean;
    warnings: string[];
  };
}

function generateSnapshots(): void {
  if (!fs.existsSync(PROGRAMS_DIR)) {
    console.error(`Programs directory not found: ${PROGRAMS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(PROGRAMS_DIR).filter((f) => /\.(nc|NC)$/i.test(f));
  console.log(`Found ${files.length} NC programs`);

  const snapshots: GoldenSnapshot[] = [];

  for (const file of files) {
    const filePath = path.join(PROGRAMS_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    console.log(`Parsing: ${file}`);

    try {
      const result = wireEDMProgramParserEngine.parse(content, file);

      const snapshot: GoldenSnapshot = {
        filename: file,
        parsed_at: new Date().toISOString(),
        dialect: result.dialect,
        dialect_confidence: result.dialect_confidence,
        program_number: result.program_number,
        program_comment: result.program_comment,
        pass_count: result.passes.length,
        contour_move_count: result.contour_moves.length,
        has_taper: result.hasTaper,
        has_auto_thread: result.wire_settings.has_auto_thread,
        has_submerged_cut: result.hasSubmergedCut,
        work_origin: result.work_origin,
        offset_declarations: result.offset_declarations,
        passes: result.passes.map((p) => ({
          pass_number: p.pass_number,
          offset_mm: p.offset_mm,
          e_code: p.e_code,
          feed_rate: p.feed_rate,
        })),
        safety: {
          has_program_end: result.safety.has_program_end,
          has_wire_stop: result.safety.has_wire_stop,
          has_offset_cancel: result.safety.has_offset_cancel,
          warnings: result.safety.warnings,
        },
      };

      snapshots.push(snapshot);
      console.log(`  ✓ ${result.passes.length} passes, dialect: ${result.dialect}`);
    } catch (err) {
      console.error(`  ✗ Failed to parse: ${(err as Error).message}`);
    }
  }

  const output = {
    schemaVersion: 1,
    generated_at: new Date().toISOString(),
    program_count: snapshots.length,
    snapshots,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nWrote ${snapshots.length} snapshots to ${OUTPUT_FILE}`);
}

generateSnapshots();
