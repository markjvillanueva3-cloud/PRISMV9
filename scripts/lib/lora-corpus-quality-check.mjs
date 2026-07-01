// scripts/lib/lora-corpus-quality-check.mjs
// LoRA SFT-corpus degeneracy guard (U-LORA-CORPUS-QUALITY, slot:india 2026-06-30).
//
// THE GAP IT CLOSES: the outcome->LoRA pipeline now assembles real SFT pairs
// (U-OUTCOME-SWEEP-SFT: 11,483 from the sweep ledgers) that fold into the fleet
// corpus via assemble-fleet-lora-corpus.mjs -- but NOTHING validates the assembled
// Alpaca JSONL before training. The thin-data lesson
// ([[reference_closed_loop_outcome_thin_data_2026_06_13]]) is exactly the failure
// mode: a corpus dominated by near-degenerate pairs (one instruction, many copies)
// teaches the model nothing and -- worse -- contradictory pairs (same instruction,
// different output) inject label noise. This is the pre-train R9 gate: it grades an
// assembled corpus on the degeneracy axes so a bad corpus is caught BEFORE a GPU run,
// not after. Pure / deterministic / streaming-safe (one row at a time).

/** Count the determining-input tokens ("key=val") inside an Alpaca instruction. */
export function inputTokenCount(instruction) {
  if (typeof instruction !== "string") return 0;
  const m = instruction.match(/[A-Za-z_]+=/g);
  return m ? m.length : 0;
}

/**
 * Instruction-diversity distribution. A healthy SFT corpus has MANY distinct
 * instructions (states); a degenerate one collapses to a few. Returns
 * { totalRows, uniqueInstructions, uniqueRatio, topRepeated }.
 */
export function instructionDistribution(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const counts = new Map();
  let total = 0;
  for (const r of list) {
    if (!r || typeof r.instruction !== "string") continue;
    total++;
    counts.set(r.instruction, (counts.get(r.instruction) || 0) + 1);
  }
  const topRepeated = [...counts.entries()]
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([instruction, count]) => ({ instruction: instruction.slice(0, 80), count }));
  return {
    totalRows: total,
    uniqueInstructions: counts.size,
    uniqueRatio: total > 0 ? +(counts.size / total).toFixed(4) : 0,
    topRepeated,
  };
}

/**
 * Contradictory pairs: the SAME instruction mapping to >=2 DISTINCT outputs --
 * label noise the model cannot resolve (a dropped determining dimension). Returns
 * { contradictoryInstructions, contradictoryRows, examples }.
 */
export function contradictoryPairs(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const byInstr = new Map();
  for (const r of list) {
    if (!r || typeof r.instruction !== "string" || typeof r.output !== "string") continue;
    if (!byInstr.has(r.instruction)) byInstr.set(r.instruction, new Map());
    const outs = byInstr.get(r.instruction);
    outs.set(r.output, (outs.get(r.output) || 0) + 1);
  }
  let contradictoryInstructions = 0, contradictoryRows = 0;
  const examples = [];
  for (const [instruction, outs] of byInstr) {
    if (outs.size >= 2) {
      contradictoryInstructions++;
      for (const c of outs.values()) contradictoryRows += c;
      if (examples.length < 5) examples.push({ instruction: instruction.slice(0, 70), distinctOutputs: outs.size });
    }
  }
  return { contradictoryInstructions, contradictoryRows, examples };
}

/** Rows whose instruction carries FEWER than `minInputs` determining inputs (too thin to learn). */
export function thinInstructionRate(rows, minInputs = 2) {
  const list = Array.isArray(rows) ? rows : [];
  let total = 0, thin = 0;
  for (const r of list) {
    if (!r || typeof r.instruction !== "string") continue;
    total++;
    if (inputTokenCount(r.instruction) < minInputs) thin++;
  }
  return { total, thin, thinRate: total > 0 ? +(thin / total).toFixed(4) : 0 };
}

/**
 * Grade an assembled corpus. Thresholds encode the thin-data lesson: a corpus whose
 * unique-instruction ratio is very low (mass duplication) OR whose contradiction rate
 * is high is NOT training-ready. Advisory by default (verdict + warnings); the caller
 * (a pre-train gate) decides whether to block.
 */
export function gradeCorpus(rows, opts = {}) {
  const minUniqueRatio = typeof opts.minUniqueRatio === "number" ? opts.minUniqueRatio : 0.2;
  const maxContradictionRate = typeof opts.maxContradictionRate === "number" ? opts.maxContradictionRate : 0.1;
  const dist = instructionDistribution(rows);
  const contra = contradictoryPairs(rows);
  const thin = thinInstructionRate(rows, opts.minInputs);
  const contradictionRate = dist.totalRows > 0 ? +(contra.contradictoryRows / dist.totalRows).toFixed(4) : 0;
  // DEGENERACY signals (fail the corpus): the two that genuinely make a corpus
  // un-trainable -- mass duplication (no diversity) and label noise (contradiction).
  const warnings = [];
  // ADVISORY signals (reported, do NOT fail): soft quality notes.
  const advisories = [];
  if (dist.totalRows > 0 && dist.uniqueRatio < minUniqueRatio) {
    warnings.push(`LOW DIVERSITY: uniqueRatio ${dist.uniqueRatio} < ${minUniqueRatio} (mass duplication -- the thin-data degenerate pattern)`);
  }
  if (contradictionRate > maxContradictionRate) {
    warnings.push(`HIGH CONTRADICTION: ${contradictionRate} of rows share an instruction with a different output (label noise)`);
  }
  if (thin.thinRate > 0.5) {
    // THIN is a key=value (parametric-corpus) heuristic: a prose knowledge-recall corpus
    // (e.g. the Hermes per-domain rules) legitimately carries no key= tokens, so a high
    // thinRate there is NOT degeneracy. Advisory only -- a diverse, non-contradictory
    // corpus is training-ready regardless of key=value density. (U-HERMES-LORA-CORPUS fix.)
    advisories.push(`THIN INSTRUCTIONS: ${(thin.thinRate * 100).toFixed(0)}% carry <${opts.minInputs ?? 2} key=val determining inputs (weak state if PARAMETRIC; ignore for prose/knowledge corpora)`);
  }
  return {
    pass: warnings.length === 0,
    verdict: warnings.length === 0 ? "training-ready" : "degenerate-corpus",
    totalRows: dist.totalRows,
    uniqueInstructions: dist.uniqueInstructions,
    uniqueRatio: dist.uniqueRatio,
    contradictionRate,
    thinRate: thin.thinRate,
    warnings,
    advisories,
    topRepeated: dist.topRepeated,
  };
}

/** Read an Alpaca JSONL into rows (streaming-tolerant; skips blank/unparseable lines). */
export function parseJsonlRows(text) {
  const rows = [];
  for (const line of String(text || "").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try { rows.push(JSON.parse(t)); } catch { /* skip */ }
  }
  return rows;
}

const _isMain = (() => {
  try { return process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("lora-corpus-quality-check.mjs"); }
  catch { return false; }
})();
if (_isMain) {
  (async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
    const arg = process.argv[2];
    const target = arg || path.join(root, "state", "shared", "lora", "outcomes-dataset.jsonl");
    let text;
    try { text = fs.readFileSync(target, "utf8"); }
    catch (e) { process.stderr.write(`[lora-corpus-quality-check] cannot read ${target}: ${e?.message || e}\n`); process.exit(1); }
    const grade = gradeCorpus(parseJsonlRows(text));
    process.stdout.write(`# LoRA corpus quality: ${target}\n`);
    process.stdout.write(`verdict: ${grade.verdict} | rows ${grade.totalRows} | unique ${grade.uniqueInstructions} (ratio ${grade.uniqueRatio}) | contradiction ${grade.contradictionRate} | thin ${grade.thinRate}\n`);
    for (const w of grade.warnings) process.stdout.write(`  ! ${w}\n`);
    if (grade.topRepeated.length) {
      process.stdout.write(`top-repeated instructions:\n`);
      for (const r of grade.topRepeated) process.stdout.write(`  x${r.count}: ${r.instruction}\n`);
    }
    process.exit(grade.pass ? 0 : 0); // advisory: report, never block the pipeline on exit code
  })();
}
