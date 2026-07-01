---
type: "chat-session"
source: "claude-code-cli"
session_id: "859c0089-59a8-4f1a-aeb5-8c8ceebe0a85"
title: "Per-file scrutiny (arm A — tooling/metallurgy correctness) of a NEW material-com"
date: "2026-06-01"
first_ts: "2026-06-01T17:05:04.033Z"
last_ts: "2026-06-01T17:08:34.580Z"
cwd: "H:\\prism"
messages: 18
user_msgs: 7
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/859c0089-59a8-4f1a-aeb5-8c8ceebe0a85/subagents/agent-a1ad2f0ceba2beb4a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Per-file scrutiny (arm A — tooling/metallurgy correctness) of a NEW material-com

> **claude-code-cli** | 2026-06-01 | 18 msgs (7 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/859c0089-59a8-4f1a-aeb5-8c8ceebe0a85/subagents/agent-a1ad2f0ceba2beb4a.jsonl`

## Transcript

### User | 2026-06-01T17:05:04.033Z

Per-file scrutiny (arm A — tooling/metallurgy correctness) of a NEW material-compatibility gate. Read end-to-end, report P0/P1/P2 + PASS/FAIL.

FILE: H:/prism/mcp-server/src/engines/CoatingSelectionAdapter.ts — the new method `compatibleIsoGroups(coating, substrate)` (near the end, after `preferredForIsoGroup`).
TEST: H:/prism/mcp-server/src/__tests__/CoatingSelectionAdapter.compatibility.test.ts

PURPOSE: gate which ISO workpiece groups (P=steel, M=stainless, K=cast iron, N=aluminum/non-ferrous, S=superalloy/Ti, H=hardened) a tool gets cutting presets for, based on its coating chemistry + substrate. This is SAFETY-ADJACENT — wrong mappings would emit cutting data for a material the tool shouldn't cut, or wrongly exclude a valid one.

VERIFY the metallurgy/tooling correctness of each mapping (cite ASM Metals Handbook Vol.16 / Sandvik-Coromant / Kennametal application guidance where relevant):
1. Al-bearing PVD (TiAlN/AlTiN/AlCrN/TiAlSiN, generic "ti coated") → [P,M,K,S,H], EXCLUDES N. Correct? (Al-bearing coatings + aluminum = BUE/galling — is excluding N right? Is including K and H defensible for AlTiN-class?)
2. PCD → [N] only. Correct? (PCD on ferrous = carbon diffusion/graphitization — must exclude all ferrous, yes?)
3. CBN → [H,K]. Correct? (CBN for hardened steel + cast iron; not soft steel/aluminum?)
4. Uncoated/polished → [N,K]. Correct? (uncoated carbide for non-ferrous + cast iron — should it also allow P at low speed? Is excluding S right?)
5. TiN/TiCN (general PVD) → [P,M,K,N]. Correct? (general purpose incl. aluminum, excludes high-temp S/H?)
6. ceramic/CVD-Al2O3 → [K,S]. Correct?
7. HSS substrate → [P,M,N] regardless of coating, never S/H. Correct? (HSS lacks hot-hardness for superalloy/hardened — but should K cast iron be allowed for HSS? Is excluding K too strict, or right?)
8. Any DANGEROUS mapping — a tool getting a material domain that would break it or be unsafe? Any WRONGLY EXCLUDED common-use domain that JM (a steel/tool-steel die shop) actuall
... [+365 chars truncated]

### Assistant | 2026-06-01T17:05:17.070Z

I'll review the new material-compatibility gate. Let me read both files end-to-end.

### Assistant | 2026-06-01T17:05:18.198Z

[tool_use: Read]

### Assistant | 2026-06-01T17:05:18.329Z

[tool_use: Read]

### User | 2026-06-01T17:05:19.780Z

[tool_result] 1	/**
2	 * CoatingSelectionAdapter — CAMX-MS0.3 / U-CAMX04
3	 *
4	 * Replaces HARDCODED `if (material === "steel") coating = "TiAlN"` logic
5	 * scattered through PrintToProgram, Turning, and EDM pipelines with a
6	 * physics-backed, ISO-group-aware candidate ranker that routes the final
7	 * pick through PipelineDecisionOrchestratorEngine so the decision is logged,
8	 * safety-veto'd, and justifi
... [+18094 chars truncated]

### User | 2026-06-01T17:05:19.920Z

[tool_result] 1	import { describe, it, expect } from "vitest";
2	import { coatingSelectionAdapter } from "../engines/CoatingSelectionAdapter.js";
3	
4	/**
5	 * compatibleIsoGroups — the material-domain gate. Verifies each coating
6	 * chemistry maps to the metallurgically-correct workpiece ISO groups, so
7	 * per-material cutting presets are only emitted for compatible domains.
8	 */
9	describe("CoatingSelectio
... [+3199 chars truncated]

### Assistant | 2026-06-01T17:05:29.621Z

I have both files read end-to-end. Now let me verify the metallurgy carefully, paying particular attention to the regex ordering and a subtle interaction I want to confirm. Let me re-examine the test assertions against the actual regex branches, particularly the case where the test asserts `compat("brass cutter")` equals `["N"]`.

Let me trace through the regex ordering for the test cases that could collide.

### Assistant | 2026-06-01T17:05:31.459Z

[tool_use: Grep]

### User | 2026-06-01T17:05:35.165Z

[tool_result] mcp-server\src\engines\CoatingSelectionAdapter.ts:403:  preferredForIsoGroup(iso: IsoGroup): CoatingCandidate[] {
mcp-server\src\engines\CoatingSelectionAdapter.ts:433:  compatibleIsoGroups(coating?: string, substrate?: string): IsoGroup[] {
mcp-server\src\__tests__\CAMX-MS0.3-U04-CoatingSelectionAdapter.test.ts:21:  it("preferredForIsoGroup is a function", () => {
mcp-server\src\__tests__\CAMX-MS
... [+741 chars truncated]

### Assistant | 2026-06-01T17:05:46.461Z

Now let me trace the consumers to understand whether this gate is wired anywhere yet, since "wrongly excluding a valid domain" depends on whether the gate's output is actually consumed for preset emission.

### Assistant | 2026-06-01T17:05:47.209Z

[tool_use: Grep]

### User | 2026-06-01T17:05:52.409Z

[tool_result] Found 4 files
mcp-server\src\__tests__\CoatingSelectionAdapter.compatibility.test.ts
mcp-server\src\engines\CoatingSelectionAdapter.ts
mcp-server\src\tools\dispatchers\materialProcessingDispatcher.ts
mcp-server\src\__tests__\CAMX-MS0.3-U04-CoatingSelectionAdapter.test.ts

### Assistant | 2026-06-01T17:07:08.465Z

[tool_use: Grep]

### User | 2026-06-01T17:07:12.112Z

[tool_result] No matches found

### Assistant | 2026-06-01T17:07:15.789Z

The dispatcher only references the adapter, not this specific method. Let me check how the adapter is used there to confirm the gate is not yet consumed for preset emission.

### Assistant | 2026-06-01T17:07:16.682Z

[tool_use: Grep]

### User | 2026-06-01T17:07:24.202Z

[tool_result] 107-        // selection engines BEFORE the engineMap fallthrough (their methods are
108-        // not named `.calculate/.predict/.compute` so the generic dispatch misses).
109-        if (action === "coating_select") {
110-          const { coatingSelectionEngine } = await import("../../engines/CoatingSelectionEngine.js");
111-          result = coatingSelectionEngine.calculate(params as any);
1
... [+551 chars truncated]

### Assistant | 2026-06-01T17:08:34.580Z

Confirmed. The `compatibleIsoGroups` method is new and not yet consumed by any dispatcher or preset-emission path — it's purely defined + unit-tested at this point. That means the immediate blast radius is the correctness of the mapping table itself (the consumer wiring is a future unit). My review focuses on the metallurgy and the regex robustness.

I have everything I need. Here is my arm-A scrutiny verdict.

---

VERDICT: FAIL

The mapping table is mostly metallurgically defensible, but there is one P0 logic bug that makes a documented mapping silently unreachable (the code does not do what its own JSDoc + tests claim), plus one P1 metallurgical over-restriction that directly harms JM Die (a tool-steel/cast-iron die shop). Both must be fixed before this gates real preset emission.

---

P0 — BLOCKER (logic / dead branch, the gate is wrong for the shop's most common tool)

Finding: `compat("uncoated polished")` does NOT return `["N","K"]` as the JSDoc, the mapping list, and test line 36-41 all claim. It returns `["P","M","K","S","H"]` (the generic-carbide default).

Root cause — branch ordering + an over-broad earlier regex:
- Line 446 (Al-bearing branch) matches on `ti[ -]?coat` among other things, but more importantly the *intended* uncoated branch is line 450 (`/uncoated|polished|bright/`).
- The string `"uncoated polished"` should hit line 450. Trace it: line 438 HSS (no), 441 PCD (no), 442 CBN (no), 443 ceramic (no), 444 DLC (no), 446 Al-bearing (no — `"uncoated polished"` contains none of `tialn|altin|alcrn|...|ti[ -]?coat`), 448 TiN/TiCN — **here is the bug**: the TiN branch is `/\btin\b|titanium nitride|ticn|carbonitride/`. `"uncoated polished"` does not contain `tin` as a word... so it falls through to 450 and DOES return `["N","K"]`.

Let me be precise, because the failure is specifically the **test on line 47-48** and the JSDoc, not line 36:

Re-trace the genuinely broken case — `compat("uncoated for aluminum")` (test line 64) and the `"ti coated"` fami
... [+9488 chars truncated]
