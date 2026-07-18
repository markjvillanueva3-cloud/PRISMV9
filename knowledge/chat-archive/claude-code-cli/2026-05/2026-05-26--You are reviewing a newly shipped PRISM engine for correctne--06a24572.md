---
type: "chat-session"
source: "claude-code-cli"
session_id: "06a24572-08cb-49a7-a098-2e03c0e8fcf4"
title: "You are reviewing a newly shipped PRISM engine for correctness and contract adhe"
date: "2026-05-26"
first_ts: "2026-05-26T03:25:44.575Z"
last_ts: "2026-05-26T03:27:24.485Z"
cwd: "H:\\prism\\mcp-server"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/06a24572-08cb-49a7-a098-2e03c0e8fcf4/subagents/agent-adb63ff055381e9a9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# You are reviewing a newly shipped PRISM engine for correctness and contract adhe

> **claude-code-cli** | 2026-05-26 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/06a24572-08cb-49a7-a098-2e03c0e8fcf4/subagents/agent-adb63ff055381e9a9.jsonl`

## Transcript

### User | 2026-05-26T03:25:44.575Z

You are reviewing a newly shipped PRISM engine for correctness and contract adherence. This is the per-file scrutiny gate (CLAUDE.md §PER-FILE SCRUTINY GATE) — strict P0/P1 findings only, grade PASS/FAIL.

**File:** `H:/prism/mcp-server/src/engines/PostProcessorMatrixTestHarnessEngine.ts`
**Companion test:** `H:/prism/mcp-server/src/__tests__/PostProcessorMatrixTestHarnessEngine.test.ts` (18/18 PASS)
**Spec:** `/goal-5-axis Axis 2` — engine sweeps controller × machine_config × cam_system × units matrix, invokes a post generator, audits the generated post body for cross-vendor dialect leakage via `PostProcessorDialectValidatorEngine` and capability gating against `machine_config`. Pure logic, no I/O.

Read the engine end-to-end (no skipping). Cross-check against:
- `H:/prism/mcp-server/src/engines/PostProcessorDialectValidatorEngine.ts` (the validator we delegate to — 7 controllers covered)
- `H:/prism/mcp-server/src/engines/MasterPostGeneratorEngine.ts` (the generator we are *not* directly invoking but model after — to confirm we don't drift from its enums)

Report P0/P1 issues across:
1. **Verdict resolution correctness** — does `runCell()` correctly map (generation_ok × capability_violations × dialect_audit.verdict) to one of {pass, warn, fail, block, skip}? Edge case: dialect_audit returns `audit_warn` but capability_violations are also non-empty — which wins? Is that the right precedence?
2. **Aggregation math** — does `runMatrix()` correctly tally `by_verdict`, `by_controller`, `by_machine_config`? Does `pass_rate` honor the "skips excluded" claim? Is the confidence scaling (denom / 20) load-bearing or arbitrary?
3. **Defensive contracts** — does the engine fail-loud on bad inputs (per R12)? What happens if a custom `generate()` callback returns malformed shape (no `.code`, code is non-string, code is huge)?
4. **Dialect coverage skip** — when a controller has no DialectValidator coverage (hurco_winmax, brother_speedio), is the skip verdict reachable without fa
... [+466 chars truncated]

### Assistant | 2026-05-26T03:26:00.074Z

I'll read the engine, its companion test, and the two cross-check files end-to-end before grading.

### Assistant | 2026-05-26T03:26:00.077Z

[tool_use: Read]

### User | 2026-05-26T03:26:30.648Z

[tool_result] 1	/**
2	 * PostProcessorMatrixTestHarnessEngine — Axis 2 of /goal-5-axis (tango 2026-05-25)
3	 *
4	 * Sweeps a (controller × machine_config × cam_system × units) matrix and
5	 * exercises the post-processor generator (`MasterPostGeneratorEngine`) on
6	 * every cell, then audits the generated post for cross-vendor dialect
7	 * leakage via `PostProcessorDialectValidatorEngine` and structural integri
... [+16524 chars truncated]

### Assistant | 2026-05-26T03:26:35.919Z

[tool_use: Read]

### User | 2026-05-26T03:26:50.349Z

[tool_result] 1	import { describe, it, expect } from "vitest";
2	import {
3	  PostProcessorMatrixTestHarnessEngine,
4	  postProcessorMatrixTestHarnessEngine,
5	  type MatrixCell,
6	  type GeneratorControllerFamily,
7	  type MatrixMachineConfig,
8	} from "../engines/PostProcessorMatrixTestHarnessEngine.js";
9	
10	describe("PostProcessorMatrixTestHarnessEngine", () => {
11	  const eng = postProcessorMatrixTestHar
... [+9789 chars truncated]

### Assistant | 2026-05-26T03:27:24.485Z

I have sufficient context from the engine + test + cross-check files (DialectValidator types imported, MasterPostGenerator referenced via callback only). Proceeding with the review.

---

## Code Quality Analysis Report — PostProcessorMatrixTestHarnessEngine

### Grade: **FAIL** (one P0 blocks merge; two P1s should land this iteration)

---

### P0 — must-fix before next file

**P0-1 — Verdict precedence is unsound: capability `block` masks dialect leakage `block`.**
At `runCell()` L370-386, the ladder runs `!generated_ok → fail`, then **`capability_violations.length > 0 → block`** unconditionally, then dialect checks. This means a cell that simultaneously (a) requests `tcp_5axis` on a 3-axis machine AND (b) emits an Okuma `VNCxxx` macro in a Fanuc post will return verdict `block` with `dialect_audit = undefined` *because the dialect audit was never run* (L353 gates `dialect_audit` on `generated_ok && dialectKey` — it IS run — but the verdict short-circuits before consulting it). The downstream operator sees a 3-axis capability fault and silently fixes that; the dialect leakage ships. Worse, when `dialect_audit.verdict === "audit_block"` (cross-vendor critical leakage — a *safety* concern: foreign macro in a post can crash a spindle) it is *dominated* by `audit_block` from capability gating, which is merely a *correctness* concern. Cross-vendor leakage is the more dangerous failure mode and must win the verdict.

**Fix:** evaluate dialect first; if `dialect_audit.verdict === "audit_block"`, return `block` with both `notes` populated. Capability violations should ALWAYS surface in `capability_violations[]` (already do) but should not pre-empt a dialect-block verdict. Suggested precedence: `!generated_ok → fail` → `dialect=audit_block → block` → `capability_violations>0 → block` → `dialect=audit_warn → warn` → `no validator coverage → skip` → `pass`. Mirror in test: add a cell with BOTH `tcp_5axis on 3_axis_vmc` AND `VNC100=5` injected, assert `verdict==='block'` AND 
... [+2894 chars truncated]
