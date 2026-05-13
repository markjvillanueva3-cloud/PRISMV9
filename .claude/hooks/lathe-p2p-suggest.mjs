#!/usr/bin/env node
// tier: T4
/**
 * lathe-p2p-suggest.mjs — UserPromptSubmit hook
 *
 * Detects lathe print-to-program intent in user prompts and suggests the
 * /lathe-print-to-program skill. Catches cases where the user describes the
 * workflow ("turn this into g-code for a lathe", "process this turning
 * print", "make a cnc program from this shaft drawing") but doesn't
 * explicitly invoke the skill.
 *
 * @milestone LATHE-MASTER U-LTH47 (forge-triple hook)
 * @fires UserPromptSubmit
 */

import * as fs from "fs";

const LATHE_KEYWORDS = [
  "lathe", "turning", "turn this", "cnc turn", "swiss", "mill-turn",
  "chuck", "tailstock", "steady rest", "od turn", "id bore",
];

const PROGRAM_KEYWORDS = [
  "print to program", "p2p", "blueprint to g-code", "drawing to gcode",
  "pdf to cnc", "generate g-code", "make a program", "create cnc program",
  "g-code from print", "program from drawing", "drawing to program",
];

const FEATURE_KEYWORDS = [
  "thread external", "thread internal", "groove", "chamfer",
  "face off", "bore hole", "drill hole", "tapping",
];

function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => {
      try { resolve(JSON.parse(buf || "{}")); } catch { resolve({}); }
    });
    setTimeout(() => resolve({}), 150);
  });
}

function scoreLatheP2PIntent(prompt) {
  const p = (prompt || "").toLowerCase();
  let score = 0;
  const reasons = [];

  const latheHit = LATHE_KEYWORDS.find(k => p.includes(k));
  if (latheHit) {
    score += 2;
    reasons.push(`lathe keyword: "${latheHit}"`);
  }

  const programHit = PROGRAM_KEYWORDS.find(k => p.includes(k));
  if (programHit) {
    score += 3;
    reasons.push(`program keyword: "${programHit}"`);
  }

  const featureHit = FEATURE_KEYWORDS.find(k => p.includes(k));
  if (featureHit) {
    score += 1;
    reasons.push(`turning feature: "${featureHit}"`);
  }

  // PDF/blueprint reference boosts score
  if (/\.(pdf|png|jpg|jpeg|dxf|step|stp)\b/i.test(p)) {
    score += 1;
    reasons.push("print file referenced");
  }

  return { score, reasons };
}

async function main() {
  const input = await readStdin();
  const prompt = input.prompt || input.message || "";

  // Skip if user already invoked the skill explicitly
  if (/\/lathe-print-to-program\b/.test(prompt)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const { score, reasons } = scoreLatheP2PIntent(prompt);

  if (score < 3) {
    // Not strong enough signal — stay silent
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const ctx = `💡 LATHE PRINT-TO-PROGRAM INTENT DETECTED (score ${score})
Reasons: ${reasons.join(", ")}

Consider using /lathe-print-to-program — the LATHE-MASTER P4 pipeline will:
  1. Ingest the print (OCR + GD&T extraction)
  2. Recognize turning features (20 types)
  3. Propagate tolerances with Cpk targets
  4. Select strategies (chain-of-thought reasoning)
  5. Plan op sequence (precedence-validated)
  6. Pick workholding (chuck + tailstock + steady rest physics)
  7. Generate toolpath (Kienzle forces, Vc/feed per ISO group)
  8. Emit G-code (7 controller dialects)
  9. Produce signoff dossier (Cpk + risks + approval chain)
  10. DL failure review (attention-weighted 10-feature model)
  11. Full reasoning trace (causal + counterfactual)
  12. Ingest into manufacturing knowledge graph

Controllers: fanuc, haas, okuma_osp, mitsubishi, mazak, siemens, generic
Materials: all ISO groups (P, M, K, N, S, H)

Or call actions directly: prism_cam:lathe_p2p_* (45 actions wired).`;

  // Log detection for later audit
  try {
    const logPath = "H:/prism/state/shared/lathe-p2p-intent.log";
    fs.appendFileSync(logPath,
      `${new Date().toISOString()} score=${score} reasons="${reasons.join("; ")}"\n`,
      { encoding: "utf-8" }
    );
  } catch { /* non-critical */ }

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: ctx,
    },
  }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
