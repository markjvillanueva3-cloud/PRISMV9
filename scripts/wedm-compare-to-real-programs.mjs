/**
 * wedm-compare-to-real-programs.mjs — the operator's accuracy test: "read print,
 * write program, post the g-code to COMPARE TO EXISTING PROGRAMS."
 *
 * Per WEDM-P2P-COMPREHENSIVE-VALIDATION-2026-06-01.md: the only ground truth is the
 * handful of REAL runnable Mitsubishi FA-10S programs on disk under
 * "H:/PRISM/JM DIE/WIRE EDM". This parses their real FA dialect (H-register offset
 * defs + `E#### H# F.## (PASS=n)` cascade) and compares each to the cascade the JM
 * oracle (jm-die-wedm-tech-tables.ts) GENERATES for the matched E-code family —
 * per-pass: E-code exact, H-offset within tol, feed within tol.
 *
 * R12 HONESTY — what 100% here does and does NOT prove: the JM_DIE_ECODE_FAMILIES
 * oracle was CALIBRATED FROM these same programs, so a 100% match is IN-SAMPLE
 * REPRODUCTION (oracle internal consistency + this harness's correctness), NOT a
 * held-out generalization proof. It is a real regression/fidelity gate — if the
 * oracle tables or the parser ever drift away from the shipping JM cascades, this
 * drops below 100% and the gate catches it. The genuine "100% accuracy on UNSEEN
 * prints" the operator wants requires the corpus-repair + physics-wiring path in
 * the validation spec (held-out programs paired to their prints) — tracked, not
 * yet closeable on the ~6 in-sample programs that exist on disk today.
 *
 *   npx tsx scripts/wedm-compare-to-real-programs.mjs ["H:/PRISM/JM DIE/WIRE EDM"]
 *   (tsx, not plain node — main() lazy-imports the .ts JM oracle tables.)
 *
 * Pure-core (parseRealProgram / compareToOracle / matchOracleFamily) + injected reader (main reads the
 * real files). No inlined discharge constants. No template-${...}.
 *
 * @module scripts/wedm-compare-to-real-programs
 */
import * as fs from "node:fs";
import * as path from "node:path";

/** Tolerances for a per-pass MATCH (real vs oracle). */
export const OFFSET_TOL_IN = 0.0003; // 0.3 thou — H-offset agreement
export const FEED_TOL_IPM = 0.02;    // ipm — feed agreement

/**
 * Parse a real FA-10S wire program into its pass cascade. Pure.
 * Recognizes H-register defs ("H1 =.0085 + H175") and pass lines
 * ("N50 E1221 H1 F.12 (PASS=1)"). Returns { passes, family_prefix }.
 */
export function parseRealProgram(text) {
  const lines = String(text || "").split(/\r?\n/);
  const num = (s) => { const v = String(s); return Number(v.startsWith(".") ? "0" + v : v); }; // ".12" -> 0.12, "25.0" -> 25
  const hOffset = {}; // H1 -> 0.0085 (inches, the base before +H175 global trim)
  for (const l of lines) {
    const m = l.match(/^\s*H(\d+)\s*=\s*([.\d]+)/i);
    if (m && !/H175/i.test(l.replace(/=.*/, ""))) hOffset["H" + m[1]] = num(m[2]);
  }
  const passes = [];
  const seen = new Set();
  for (const l of lines) {
    const m = l.match(/E(\d{4})\s+(H\d+)\s+F([.\d]+)\s*\(PASS=(\d+)\)/i);
    if (!m) continue;
    const pass = Number(m[4]);
    if (seen.has(pass)) continue; // first occurrence (programs repeat the cycle per contour)
    seen.add(pass);
    passes.push({
      pass,
      e_code: "E" + m[1],
      h_register: m[2],
      offset_in: hOffset[m[2].toUpperCase()] ?? null,
      feed_ipm: num(m[3]),
    });
  }
  passes.sort((a, b) => a.pass - b.pass);
  return { passes, family_prefix: passes.length ? passes[0].e_code.slice(0, 3) : null };
}

/**
 * Compare a parsed real cascade against the oracle family's generated cascade.
 * `oracleFamily` is a JM_DIE_ECODE_FAMILIES entry. Pure. Returns the per-pass
 * diff + an accuracy fraction (passes that match exactly on E-code + within tol).
 */
export function compareToOracle(realPasses, oracleFamily) {
  if (!oracleFamily || !Array.isArray(oracleFamily.passes)) return { total: realPasses.length, matched: 0, accuracy: 0, diffs: [{ pass: 0, reason: "no oracle family" }] };
  const diffs = [];
  let matched = 0;
  for (const rp of realPasses) {
    const op = oracleFamily.passes.find((p) => p.pass_number === rp.pass);
    if (!op) { diffs.push({ pass: rp.pass, reason: "oracle has no pass " + rp.pass }); continue; }
    const eOk = op.e_code === rp.e_code;
    const offOk = rp.offset_in == null || op.offset_inches == null || Math.abs(op.offset_inches - rp.offset_in) <= OFFSET_TOL_IN;
    const feedOk = op.feed_ipm == null || rp.feed_ipm == null || Math.abs(op.feed_ipm - rp.feed_ipm) <= FEED_TOL_IPM;
    if (eOk && offOk && feedOk) { matched += 1; }
    else diffs.push({ pass: rp.pass, real: { e: rp.e_code, off: rp.offset_in, f: rp.feed_ipm }, oracle: { e: op.e_code, off: op.offset_inches, f: op.feed_ipm }, eOk, offOk, feedOk });
  }
  const total = realPasses.length;
  return { total, matched, accuracy: total ? matched / total : 0, diffs };
}

/**
 * Bind a parsed real cascade to its oracle family. Pure. Prefers an EXACT match
 * (same E-code prefix AND same pass count); falls back to prefix-only when no
 * exact-length family exists. Returns { family, matched_via } where matched_via
 * is "exact" | "prefix-fallback" | "unmatched" so a loose bind can never silently
 * feed the aggregate (reviewer-B P1). Guards malformed families (empty passes[]).
 */
export function matchOracleFamily(parsed, families) {
  const prefix = parsed && parsed.family_prefix;
  const list = Array.isArray(families) ? families : [];
  const hasPrefix = (f) => f && Array.isArray(f.passes) && f.passes[0] && f.passes[0].e_code.slice(0, 3) === prefix;
  if (!prefix) return { family: null, matched_via: "unmatched" };
  const exact = list.find((f) => hasPrefix(f) && f.passes.length === parsed.passes.length);
  if (exact) return { family: exact, matched_via: "exact" };
  const loose = list.find(hasPrefix);
  return loose ? { family: loose, matched_via: "prefix-fallback" } : { family: null, matched_via: "unmatched" };
}

async function main() {
  const root = process.argv[2] || "H:/PRISM/JM DIE/WIRE EDM";
  const { JM_DIE_ECODE_FAMILIES } = await import("../mcp-server/src/data/jm-die-wedm-tech-tables.js");
  // Discover real programs: files whose content carries the E#### H# F.## cascade.
  const found = [];
  const walk = (dir, depth) => {
    if (depth > 3) return;
    let ents = [];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) { walk(fp, depth + 1); continue; }
      if (/\.(mcx|mcam|esp|dwg|dxf|pdf|tif|zip|png|jpg)$/i.test(e.name)) continue;
      let txt = "";
      try { txt = fs.readFileSync(fp, "latin1"); } catch { continue; }
      if (/E\d{4}\s+H\d+\s+F\.?\d/i.test(txt)) found.push({ fp, txt });
    }
  };
  walk(root, 0);

  const results = [];
  const seenProg = new Set(); // de-dupe identical program copies (CHOCTAW + FIOCCHI dupes)
  for (const { fp, txt } of found) {
    const parsed = parseRealProgram(txt);
    if (parsed.passes.length === 0) continue;
    const { family: fam, matched_via } = matchOracleFamily(parsed, JM_DIE_ECODE_FAMILIES);
    const cmp = compareToOracle(parsed.passes, fam);
    const key = path.basename(fp) + "|" + parsed.passes.map((p) => p.e_code).join(",");
    if (seenProg.has(key)) continue;
    seenProg.add(key);
    results.push({ program: path.basename(fp), passes: parsed.passes.length, family: fam ? fam.id : "UNMATCHED", matched_via, accuracy: cmp.accuracy, matched: cmp.matched, total: cmp.total });
  }

  results.sort((a, b) => b.accuracy - a.accuracy);
  const totPass = results.reduce((s, r) => s + r.total, 0);
  const totMatch = results.reduce((s, r) => s + r.matched, 0);
  const looseBinds = results.filter((r) => r.matched_via === "prefix-fallback").map((r) => r.program);
  console.log("=== WEDM GENERATED-vs-REAL PROGRAM ACCURACY (IN-SAMPLE / oracle-calibration set) ===");
  console.log(JSON.stringify({
    real_programs: results.length,
    total_passes: totPass,
    matched_passes: totMatch,
    overall_pass_accuracy: totPass ? Number((totMatch / totPass).toFixed(4)) : 0,
    measurement: "in_sample_reproduction",
    caveat: "oracle calibrated FROM these programs; 100% = harness+oracle fidelity gate, NOT held-out generalization",
    loose_family_binds: looseBinds, // prefix-fallback binds — accuracy on these is less trustworthy
  }, null, 2));
  for (const r of results) console.log("  " + (r.accuracy * 100).toFixed(0).padStart(3) + "%  " + r.matched + "/" + r.total + "  " + (r.matched_via === "exact" ? " " : "~") + r.family.padEnd(22) + "  " + r.program);
}

if (process.argv[1] && process.argv[1].endsWith("wedm-compare-to-real-programs.mjs")) main();
