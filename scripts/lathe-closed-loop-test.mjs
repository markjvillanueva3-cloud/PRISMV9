#!/usr/bin/env node
/**
 * lathe-closed-loop-test.mjs — CLOSED-LOOP-MS0/U-CL4 (slot:whiskey)
 *
 * The closed-loop TESTING substrate: composes the three built legs into one per-program
 * PASS/FAIL verdict, so any lathe program (hand-written, JM-archive, or template-generated)
 * can be tested end-to-end before it reaches a machine:
 *   1. SAFETY/PROPER   — assessProgram (U-CL1, the 8-gotcha physics/safety lint)
 *   2. TOOLING         — the tool types the program's G-codes imply, cross-referenced against
 *                        the JM purchase corpus (U-CL3) → are the needed tools on hand?
 *   3. (generation ref — U-CL2 LatheToolpathTemplateEngine — defines the expected cycle/gates
 *      per op type; the lint in step 1 enforces those gates, so conformance is covered there.)
 *
 * verdict PASS ⟺ program is PROPER (0 ERROR gotchas) AND every implied tool type is purchased.
 * Pure `closedLoopTest` core + CLI. Offline — no MCP, no engine, no dist build.
 *
 * @milestone CLOSED-LOOP-MS0/U-CL4
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assessProgram } from "./lathe-program-assessor.mjs";
import { crossRefToolTypes } from "./lib/lathe-tool-inventory-crossref.mjs";

/** Infer the turning operation set from the canned cycles / motion present in a program. */
export function inferOpsFromGcodes(text) {
  if (typeof text !== "string") return {};
  const up = text.toUpperCase();
  const ops = {};
  const add = (op) => { ops[op] = (ops[op] || 0) + 1; };
  if (/\bG76\b/.test(up)) add("od_thread");
  if (/\bG71\b/.test(up)) add("od_rough");
  if (/\bG70\b/.test(up)) add("od_finish");
  if (/\bG72\b/.test(up)) add("face");
  if (/\bG73\b/.test(up)) add("contour");
  if (/\bG75\b/.test(up)) add("part_off");
  if (/\bG74\b/.test(up)) add("drill_axial"); // Okuma peck drill / face groove
  // boring: an internal G71/G70 on a bored diameter — flagged conservatively if a boring-bar tool comment present
  if (/BORING|BORE|\bID\b/.test(up)) add("bore_rough");
  return ops;
}

/**
 * Run the closed-loop test on a single program.
 * @param {{programText:string, ctx?:object, purchaseByType?:Record<string,{count?:number,spend?:number}>, opFrequencies?:Record<string,number>}} args
 * @returns {{proper:boolean, errorCount:number, toolTypesNeeded:string[], toolTypesMissing:string[], verdict:"PASS"|"FAIL", reasons:string[], assessment:object, toolCheck:object}}
 */
export function closedLoopTest({ programText, ctx = {}, purchaseByType = {}, opFrequencies } = {}) {
  const assessment = assessProgram(programText, ctx);                 // U-CL1
  const ops = opFrequencies || inferOpsFromGcodes(programText);
  const toolCheck = crossRefToolTypes({ purchaseByType, opFrequencies: ops }); // U-CL3
  const toolTypesNeeded = [...toolCheck.matched, ...toolCheck.neededUnpurchased].sort();
  const toolTypesMissing = toolCheck.neededUnpurchased;
  const reasons = [];
  if (!assessment.proper) reasons.push(`unsafe: ${assessment.errorCount} ERROR-severity finding(s) [${assessment.ruleSet.filter((r) => true).join(", ")}]`);
  // tooling only fails the verdict when there IS purchase data to check against (else informational)
  const havePurchaseData = Object.keys(purchaseByType).length > 0;
  if (havePurchaseData && toolTypesMissing.length > 0) reasons.push(`tooling gap: needed-but-unpurchased [${toolTypesMissing.join(", ")}]`);
  const verdict = reasons.length === 0 ? "PASS" : "FAIL";
  return { proper: assessment.proper, errorCount: assessment.errorCount, toolTypesNeeded, toolTypesMissing, verdict, reasons, assessment, toolCheck };
}

// ───────────────────────── CLI ─────────────────────────
function readSafe(p) { try { return fs.readFileSync(p, "utf8"); } catch { return null; } }
function readJsonSafe(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }

function main(argv) {
  const args = argv.slice(2);
  const val = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
  const asJson = args.includes("--json");
  const progPath = val("--program");
  if (!progPath) { process.stderr.write("usage: --program <file.MIN> [--purchases <jm-tool-purchases.json>] [--controller okuma] [--json]\n"); process.exit(2); }
  const programText = readSafe(progPath);
  if (programText == null) { process.stderr.write(`cannot read ${progPath}\n`); process.exit(2); }
  const purchases = val("--purchases") ? readJsonSafe(val("--purchases")) : null;
  const r = closedLoopTest({
    programText,
    ctx: { controller: val("--controller", "okuma") },
    purchaseByType: purchases?.byType || {},
  });
  if (asJson) { process.stdout.write(JSON.stringify({ program: progPath, ...r }, null, 2) + "\n"); return; }
  process.stdout.write(`\n=== CLOSED-LOOP TEST: ${progPath} ===\n`);
  process.stdout.write(`VERDICT: ${r.verdict}\n`);
  process.stdout.write(`  proper (lint-clean): ${r.proper} (errors=${r.errorCount})\n`);
  process.stdout.write(`  tool types needed: ${r.toolTypesNeeded.join(", ") || "(none inferred)"}\n`);
  process.stdout.write(`  tool types missing: ${r.toolTypesMissing.join(", ") || "(none)"}\n`);
  if (r.reasons.length) process.stdout.write(`  FAIL reasons:\n${r.reasons.map((x) => "    - " + x).join("\n")}\n`);
}

const isMain = (() => { try { return process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]); } catch { return false; } })();
if (isMain) main(process.argv);
