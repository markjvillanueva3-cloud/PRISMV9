#!/usr/bin/env node
// tier: T2  (injector — additive UserPromptSubmit context)
// whiskey-lathe-context-inject.mjs  (WHISKEY-LATHE-GALAXY-SYNERGY, operator 2026-05-28, slot:whiskey)
// Slot-gated injector — gives the Lathe Wizard lathe-galaxy domain context. Fires on
// slot==whiskey OR a lathe-domain keyword in the prompt (mirrors DELTA-CAD-GALAXY-SYNERGY:
// "slot==delta OR cad-keyword" — robust when chat-slots.json has the slot record null,
// and surfaces lathe context whenever lathe work happens in ANY slot).
// Additive, fail-soft. Disable: PRISM_WHISKEY_LATHE_CONTEXT_DISABLE=1
import fs from "node:fs";
import path from "node:path";
// HIGHVALUE-DISCOVERY #1 (2026-06-08, slot:alpha): session-keyed dedup so the
// static lathe block isn't re-injected byte-identically every prompt. Fail-open.
import { dedupedContext } from "../../scripts/lib/injection-dedup-emit.mjs";
// Task-aware approach firing (LATHE-APPROACH-KNOWLEDGE, slot:zulu 2026-06-29) is loaded
// via a GUARDED DYNAMIC import inside the taskBlock try below -- NEVER a static import --
// so a load failure in that optional lib can never kill the static galaxy block (arm-C P1).

function done() { process.exit(0); }
if (process.env.PRISM_WHISKEY_LATHE_CONTEXT_DISABLE === "1") done();

let raw = "";
try { raw = fs.readFileSync(0, "utf8"); } catch { done(); }

let sid = "", prompt = "";
try { const j = JSON.parse(raw || "{}"); sid = String(j.session_id || "").slice(0, 8).toLowerCase(); prompt = String(j.prompt || ""); } catch { done(); }

// Lathe-domain keyword gate (word-boundary; specific enough to avoid generic false-fires).
const LATHE_KW = /\b(lathe|turning|g50|g96|g97|g71|g72|g73|g75|g76|thread(?:ing)?|parting|groov(?:e|ing)|boring\s*bar|sub-?spindle|tailstock|chuck\s*jaw|swiss|okuma|mill-?turn|css)\b/i;
const latheHit = LATHE_KW.test(prompt);

// Best-effort slot resolution (chat-slots.json may store the slot record as null — fail-soft).
let slot = "";
try {
  const ROOT = process.env.PRISM_ROOT || "H:/prism";
  const cs = JSON.parse(fs.readFileSync(path.join(ROOT, "state/shared/chat-slots.json"), "utf8"));
  const slots = (cs && typeof cs === "object" && cs.slots && typeof cs.slots === "object") ? cs.slots : cs;
  for (const [name, st] of Object.entries(slots || {})) {
    if (!st || typeof st !== "object") continue;
    if (sid && JSON.stringify(st).toLowerCase().includes(sid)) { slot = name.toLowerCase(); break; }
  }
} catch { /* fail-soft: rely on keyword gate */ }

if (slot !== "whiskey" && !latheHit) done();   // fire for whiskey slot OR any lathe-keyword prompt

const ctx = [
  "## 🪛 Lathe galaxy context (slot:whiskey — Lathe Wizard)",
  "- **Safety reflex** — pre-emit triad `lathe_safety_predicate_evaluate` + `lathe_partoff_safety_gate` + `lathe_workholding_select_jaw`; per-op `prism_safety:check_spindle_torque`/`check_spindle_power`. Shop-floor Ω≥0.95 S(x)≥0.98.",
  "- **G96 CSS ⇒ G50 max-RPM cap** (missing = chuck overspeed / −20). Multi-pass G76 threading. Boring-bar deflection ∝ L³/D⁴, L/D≤4 steel / ≤6 carbide. Sub-spindle handoff ≤0.5° phase. Parting >3× width → G75 peck. IPR≠IPM (10× feed = −25).",
  "- **Constants** from `physics/constants.ts` (kc1.1 P1800/M2100/K1100/N700/S2800/H3200) — never inline. JM Die fleet **100% Okuma OSP** (LTH-01..07).",
  "- **Surface** `prism_turning`(373) + `prism_turning_program`(14) + `prism_thread`(22). Galaxy: `engines/lathe/{CLAUDE,MEMORY,PATHS,TOOLBELT,GSD,KNOWLEDGE}.md` (GSD=session protocol · KNOWLEDGE=compiled wiki+tribal+memory index). Deep-load: `/galaxy-verify-whiskey` · offline lint: `/lathe-lint`.",
  "_Custom slot hook · disable: PRISM_WHISKEY_LATHE_CONTEXT_DISABLE=1_",
].join("\n");

// TASK-AWARE firing -- fire only the gotchas/OSP-dialect for the lathe op(s) actually
// named in the prompt, conditioned on the JM Die Okuma OSP fleet. Compact (top-4
// gotchas/op) + fires only when an op is detected, so it adds ~0 tokens to non-lathe-op
// prompts. Fail-soft. The Lathe Wizard's print-reading pipeline can call fireForApproach
// directly with the LIVE machine+tooling list for full availability-aware firing.
let taskBlock = "";
try {
  // Dynamic import (top-level await, .mjs): a bad path/syntax in the optional task-lib
  // is caught here, so whiskey's static galaxy block always still ships (arm-C P1 fix).
  const { detectOperations, fireForApproach, KNOWN_OKUMA_OSP } = await import("../../scripts/lib/lathe-approach-knowledge.mjs");
  const ops = detectOperations(prompt);
  if (ops.length) {
    const fired = fireForApproach({ operations: ops, machines: KNOWN_OKUMA_OSP });
    const lines = [`### 🎯 Approach firing -- ${ops.join(", ")} (JM Die = 100% Okuma OSP)`];
    for (const o of fired.operations) {
      const tips = o.gotchas.slice(0, 4).map((g) => `${g.rule} [${g.cite}]`).join("  ·  ");
      lines.push(`- **${o.operation}**: ${tips}`);
      for (const d of o.okumaDialect) lines.push(`  - OSP: ${d.rule}`);
    }
    taskBlock = "\n\n" + lines.join("\n");
  }
} catch { /* fail-soft: static galaxy block still ships */ }

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: dedupedContext("whiskey-lathe-context", ctx + taskBlock, sid) },
}));
done();
