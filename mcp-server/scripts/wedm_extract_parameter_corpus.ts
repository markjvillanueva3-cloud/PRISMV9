#!/usr/bin/env npx ts-node
/**
 * WEDM Parameter Corpus Extraction Script
 * Phase 0.9 U-WEDM-JMD2 - WEDM AGI Roadmap
 *
 * Extracts E-codes, offsets, feeds from indexed WEDM programs.
 * Output: WEDM_PARAMETER_CORPUS.json
 *
 * Usage: npx ts-node scripts/wedm_extract_parameter_corpus.ts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ProgramIndexEntry {
  id: string;
  fileName: string;
  filePath: string;
  customer: string;
  machine: string;
  features: { ecode?: string; controller: string };
}

interface ParameterEntry {
  programId: string;
  customer: string;
  controller: string;
  ecodes: string[];
  offsets: Array<{ d_number: string; value_mm: number | null }>;
  feedrates: number[];
  dwells: number[];
  onTimes: number[];
  offTimes: number[];
  peakCurrents: number[];
  servoVoltages: number[];
  taperAngles: number[];
}

interface ParameterCorpus {
  schemaVersion: 1;
  generatedAt: string;
  totalPrograms: number;
  ecodeUsage: Record<string, number>;
  controllerUsage: Record<string, number>;
  customerEcodes: Record<string, string[]>;
  feedrateStats: { min: number; max: number; median: number };
  programs: ParameterEntry[];
}

function extractParameters(content: string): Omit<ParameterEntry, "programId" | "customer" | "controller"> {
  // E-codes
  const ecodeMatches = content.match(/E\d{3,4}/g) ?? [];
  const ecodes = [...new Set(ecodeMatches)];

  // Offsets (D01, D02, H01, etc.)
  const offsetMatches = content.match(/[DH]\d{1,2}/g) ?? [];
  const offsets = [...new Set(offsetMatches)].map((d) => ({
    d_number: d,
    value_mm: null as number | null,
  }));

  // Feedrates (F commands)
  const feedrateMatches = content.match(/F\d+\.?\d*/g) ?? [];
  const feedrates = feedrateMatches
    .map((f) => parseFloat(f.substring(1)))
    .filter((f) => f > 0 && f < 10000);

  // Dwell times (G04 X_ or P_)
  const dwellMatches = content.match(/G0?4\s*[XP](\d+\.?\d*)/gi) ?? [];
  const dwells = dwellMatches
    .map((d) => parseFloat(d.replace(/G0?4\s*[XP]/i, "")))
    .filter((d) => !isNaN(d));

  // On-time / off-time (machine-specific)
  const onTimeMatches = content.match(/T(?:ON|on)\s*=\s*(\d+)/g) ?? [];
  const onTimes = onTimeMatches.map((t) => parseFloat(t.match(/\d+/)?.[0] ?? "0"));

  const offTimeMatches = content.match(/T(?:OFF|off)\s*=\s*(\d+)/g) ?? [];
  const offTimes = offTimeMatches.map((t) => parseFloat(t.match(/\d+/)?.[0] ?? "0"));

  // Peak current
  const currentMatches = content.match(/I(?:P|p)\s*=\s*(\d+)/g) ?? [];
  const peakCurrents = currentMatches.map((i) => parseFloat(i.match(/\d+/)?.[0] ?? "0"));

  // Servo voltage
  const svMatches = content.match(/S(?:V|v)\s*=\s*(\d+)/g) ?? [];
  const servoVoltages = svMatches.map((s) => parseFloat(s.match(/\d+/)?.[0] ?? "0"));

  // Taper angles (G51/G52 with U/V)
  const taperMatches = content.match(/G5[12].*?[UV]-?\d+\.?\d*/gi) ?? [];
  const taperAngles: number[] = [];
  for (const m of taperMatches) {
    const u = m.match(/U(-?\d+\.?\d*)/i);
    const v = m.match(/V(-?\d+\.?\d*)/i);
    if (u) taperAngles.push(parseFloat(u[1]));
    if (v) taperAngles.push(parseFloat(v[1]));
  }

  return {
    ecodes,
    offsets,
    feedrates,
    dwells,
    onTimes,
    offTimes,
    peakCurrents,
    servoVoltages,
    taperAngles,
  };
}

async function extractCorpus(): Promise<ParameterCorpus> {
  const indexPath = path.resolve(__dirname, "../data/state/WEDM_PROGRAM_INDEX.json");

  if (!fs.existsSync(indexPath)) {
    throw new Error(`Program index not found: ${indexPath}. Run wedm_index_programs.ts first.`);
  }

  const index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  const programs: ProgramIndexEntry[] = index.programs ?? [];

  console.log(`\nExtracting parameters from ${programs.length} programs...`);

  const entries: ParameterEntry[] = [];
  const ecodeUsage: Record<string, number> = {};
  const controllerUsage: Record<string, number> = {};
  const customerEcodes: Record<string, Set<string>> = {};
  const allFeedrates: number[] = [];

  for (const program of programs) {
    try {
      if (!fs.existsSync(program.filePath)) continue;

      const content = fs.readFileSync(program.filePath, "utf-8");
      const params = extractParameters(content);

      entries.push({
        programId: program.id,
        customer: program.customer,
        controller: program.machine ?? "unknown",
        ...params,
      });

      // Track usage
      for (const ecode of params.ecodes) {
        ecodeUsage[ecode] = (ecodeUsage[ecode] ?? 0) + 1;
      }
      controllerUsage[program.machine ?? "unknown"] =
        (controllerUsage[program.machine ?? "unknown"] ?? 0) + 1;

      if (!customerEcodes[program.customer]) {
        customerEcodes[program.customer] = new Set();
      }
      params.ecodes.forEach((e) => customerEcodes[program.customer].add(e));

      allFeedrates.push(...params.feedrates);
    } catch (err) {
      // Skip unreadable
    }
  }

  allFeedrates.sort((a, b) => a - b);
  const median = allFeedrates.length > 0 ? allFeedrates[Math.floor(allFeedrates.length / 2)] : 0;

  const corpus: ParameterCorpus = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    totalPrograms: entries.length,
    ecodeUsage,
    controllerUsage,
    customerEcodes: Object.fromEntries(
      Object.entries(customerEcodes).map(([k, v]) => [k, Array.from(v)])
    ),
    feedrateStats: {
      min: allFeedrates[0] ?? 0,
      max: allFeedrates[allFeedrates.length - 1] ?? 0,
      median,
    },
    programs: entries,
  };

  const outputPath = path.resolve(__dirname, "../data/state/WEDM_PARAMETER_CORPUS.json");
  fs.writeFileSync(outputPath, JSON.stringify(corpus, null, 2));

  console.log(`\n--- Parameter Corpus Summary ---`);
  console.log(`Total programs: ${corpus.totalPrograms}`);
  console.log(`Unique E-codes: ${Object.keys(corpus.ecodeUsage).length}`);
  console.log(`Controllers: ${Object.keys(corpus.controllerUsage).length}`);
  console.log(`Customers with E-codes: ${Object.keys(corpus.customerEcodes).length}`);
  console.log(`Feedrate range: ${corpus.feedrateStats.min}-${corpus.feedrateStats.max} (median ${corpus.feedrateStats.median})`);
  console.log(`\nCorpus saved: ${outputPath}`);

  return corpus;
}

extractCorpus().catch(console.error);
