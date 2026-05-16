#!/usr/bin/env node
// tier: T0
// stop-regression-bundle.mjs — single Stop hook that runs the DEV-TOOL
// regression GATES (the fail-closed ones), as the sibling of stop-bundle.mjs
// (which runs only the non-blocking trackers).
//
// Why: the Stop event runs all gates as individual settings.json entries —
// ~62s of serial timeout budget for the 10 folded here, ×N concurrent chats,
// a fresh node.exe per gate per turn-end. This bundle runs them in a bounded
// async pool in ONE process.
//
// SAFETY SEMANTICS (load-bearing — this bundle replaces real gates):
//  • Child emits block (`continue:false`/`decision:block|deny`) → bundle
//    BLOCKS, aggregating EVERY violating child's reason (not first-only) so
//    one Stop surfaces all regressions at once.
//  • Child TIMES OUT or crashes → that gate is fail-OPEN for this turn but
//    LOUDLY surfaced in additionalContext. A slow gate must not wedge every
//    Stop across the fleet — that is the walls-of-errors failure mode — but
//    silence about an unevaluated gate would be a lie (R12).
//  • Bundle ITSELF crashes → fail-OPEN with a LOUD systemMessage naming the
//    gates that did not run. A fail-closed bundle crash wedges every Stop in
//    every chat forever; missing one turn's checks is the lesser evil, but
//    the user must be told the gates were skipped.
//
// SCOPE: only the 10 DEV-TOOL regression gates. The 2 machining-safety gates
// (stop_on_cutting_calculation_protocol, stop_on_unsafe_gcode) deliberately
// stay as individual settings.json entries — different ownership/review,
// out of dev-tools lane; folding them here would blend safety domains.
//
// stop_on_hook_unregistration.mjs's bundleAbsorbedHookNames() scans
// bundles/*.mjs for `.mjs` refs, so the 10 absorbed names count as "still
// registered" automatically — no allowlist edit needed.
//
// Concurrency knob: PRISM_STOP_REGRESSION_CONCURRENCY (default 6, 0=unbounded).
// Disable: PRISM_STOP_REGRESSION_BUNDLE=0 (then restore the 10 originals as
// individual Stop entries — never just leave them unguarded).
// NOT WIRED YET — isolation-tested only; wiring is a separate reviewed step.

import { runHook, readStdin, emit } from "./lib/hook-runner.mjs";

const HOOK_BASE = "H:/prism/.claude/hooks";

// MUST stay in sync with the Stop entries removed from settings.json on wire.
// Timeouts mirror the original per-hook settings.json budgets exactly.
const SUB_HOOKS = [
  { path: `${HOOK_BASE}/stop_on_orphan_children.mjs`,     timeout: 5000 },
  { path: `${HOOK_BASE}/stop_on_c_drive_write.mjs`,       timeout: 5000 },
  { path: `${HOOK_BASE}/stop_on_unwired_assets.mjs`,      timeout: 8000 },
  { path: `${HOOK_BASE}/stop_on_skill_unwired.mjs`,       timeout: 5000 },
  { path: `${HOOK_BASE}/stop_on_failing_tests.mjs`,       timeout: 10000 },
  { path: `${HOOK_BASE}/stop_on_build_error.mjs`,         timeout: 5000 },
  { path: `${HOOK_BASE}/stop_on_duplicate_created.mjs`,   timeout: 3000 },
  { path: `${HOOK_BASE}/stop_on_svi_regression.mjs`,      timeout: 3000 },
  { path: `${HOOK_BASE}/stop_on_broken_imports.mjs`,      timeout: 5000 },
  { path: `${HOOK_BASE}/stop_on_hook_unregistration.mjs`, timeout: 5000 },
];

function getConcurrency() {
  const raw = process.env.PRISM_STOP_REGRESSION_CONCURRENCY;
  if (raw == null || raw === "") return 6;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 6;
  return n; // 0 = unbounded
}

/** Bounded async pool — at most `n` runHook()s in flight; results keep order. */
async function runPool(specs, payload, n) {
  if (n === 0) return Promise.all(specs.map((s) => runHook(s.path, payload, s.timeout || 3000)));
  const results = new Array(specs.length);
  let next = 0;
  async function worker() {
    while (next < specs.length) {
      const my = next++;
      const s = specs[my];
      results[my] = await runHook(s.path, payload, s.timeout || 3000);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, specs.length) }, worker));
  return results;
}

function gateName(spec) {
  return spec.path.slice(spec.path.lastIndexOf("/") + 1).replace(/\.mjs$/, "");
}

async function main() {
  if (process.env.PRISM_STOP_REGRESSION_BUNDLE === "0") { emit({ continue: true }); return; }
  const payload = await readStdin();
  const results = await runPool(SUB_HOOKS, payload || "{}", getConcurrency());

  const ctx = [];
  const blockReasons = [];
  const unevaluated = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const name = gateName(SUB_HOOKS[i]);
    // No parsed output = timeout / crash / non-JSON. Fail-open for THIS gate
    // but surface it — an unevaluated gate is not a passing gate.
    if (!r || !r.parsed) { unevaluated.push(name); continue; }
    const p = r.parsed;
    const dec = p.decision || (p.hookSpecificOutput && p.hookSpecificOutput.permissionDecision);
    if (p.continue === false || dec === "block" || dec === "deny") {
      const why = p.reason || p.stopReason || p.systemMessage ||
        (p.hookSpecificOutput && p.hookSpecificOutput.permissionDecisionReason) || `blocked by ${name}`;
      blockReasons.push(`[${name}] ${why}`);
    }
    const a = p.additionalContext;
    const b = p.hookSpecificOutput && p.hookSpecificOutput.additionalContext;
    if (a) ctx.push(String(a));
    if (b) ctx.push(String(b));
  }

  if (unevaluated.length) {
    ctx.push(`⚠ stop-regression-bundle: ${unevaluated.length} gate(s) NOT evaluated this turn (timeout/crash): ${unevaluated.join(", ")} — run them manually if finishing critical work.`);
  }

  if (blockReasons.length) {
    const reason = `Stop blocked by ${blockReasons.length} regression gate(s):\n` + blockReasons.join("\n");
    emit({ continue: false, stopReason: reason, systemMessage: reason });
    return;
  }
  const resp = { continue: true };
  if (ctx.length) resp.hookSpecificOutput = { hookEventName: "Stop", additionalContext: ctx.join("\n\n") };
  emit(resp);
}

main().catch((err) => {
  try { process.stderr.write(`stop-regression-bundle error: ${err}\n`); } catch { /* */ }
  // Fail OPEN but LOUD — a crashed bundle must not wedge every Stop forever,
  // but the user must know the 10 gates were not evaluated this turn.
  emit({
    continue: true,
    systemMessage: `⚠ stop-regression-bundle CRASHED (${err}) — 10 dev-tool regression gates NOT evaluated this Stop. Re-run them manually before treating critical work as complete.`,
  });
});
