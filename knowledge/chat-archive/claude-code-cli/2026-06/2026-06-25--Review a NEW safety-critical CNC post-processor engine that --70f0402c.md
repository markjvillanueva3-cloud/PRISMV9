---
type: "chat-session"
source: "claude-code-cli"
session_id: "70f0402c-598e-4207-8a67-a8d2615fdcf0"
title: "Review a NEW safety-critical CNC post-processor engine that emits G-code for a r"
date: "2026-06-25"
first_ts: "2026-06-25T14:14:14.387Z"
last_ts: "2026-06-25T14:15:56.207Z"
cwd: "H:\\prism\\.claude\\worktrees\\agent-a2fb8a76701014b27"
messages: 24
user_msgs: 10
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/70f0402c-598e-4207-8a67-a8d2615fdcf0/subagents/agent-a2fb8a76701014b27.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review a NEW safety-critical CNC post-processor engine that emits G-code for a r

> **claude-code-cli** | 2026-06-25 | 24 msgs (10 user / 14 assistant) | cwd: H:\prism\.claude\worktrees\agent-a2fb8a76701014b27
> Raw: `H:/.claude/projects/H--prism/70f0402c-598e-4207-8a67-a8d2615fdcf0/subagents/agent-a2fb8a76701014b27.jsonl`

## Transcript

### User | 2026-06-25T14:14:14.387Z

Review a NEW safety-critical CNC post-processor engine that emits G-code for a real machine (JM Die VMC-05 Roku-Roku HC 658-II, Fanuc 31i-B5). Focus on physics + safety correctness.

FILE: H:/prism/mcp-server/src/engines/RokuRokuFanuc31iMillMasterPostEngine.ts

It is a clone of the proven H:/prism/mcp-server/src/engines/HaasNGCMillMasterPostEngine.ts (read both to compare). Verify specifically:

1. PHYSICS CHECKS (`physicsChecks` method) — it clones HaasNGC's Kienzle Fc + Taylor life + chip-load:
   - Are kc1_1/mc/C/n sourced from CANONICAL_KIENZLE/CANONICAL_TAYLOR (imported from src/physics/constants.ts), NEVER inlined?
   - Is the Kienzle force Fc = kc1_1 * ap * fz^(1-mc) correct (sign, exponent)?
   - Is the Taylor life T = (C/Vc)^(1/n) correct, with Vc = pi*D*n/1000?
   - Is chip load fz = F/(n*Z) correct?
   - CRITICAL DESIGN CLAIM TO VERIFY: the engine does NOT fabricate a Roku-Roku spindle MAX_RPM / MAX_FORCE datasheet value (R12). The RPM/force advisory checks should run ONLY when the caller supplies max_rpm/max_force_n; absent => the check is skipped. Confirm this is correct and that omitting the check is SAFE (advisory-only, never blocks emission).

2. SAFETY/DIALECT — does the emit avoid the known post-processor hazards?
   - UNITS-FIRST: G20 inch scales every geometry+feed by 1/25.4 (a units mismatch is a 25.4x scale error). Verify the scale is applied to ALL coordinates + feeds + canned-cycle depths.
   - Coolant ordering: M8/M7 AFTER spindle M3.
   - Non-finite guards: no literal XNaN/YNaN/FInfinity can leak (the test caught one in emitToolpath — verify the fix is complete, incl. canned-cycle + first-approach).
   - G05.1 Q1 look-ahead opt-in + G05.1 Q0 cancel; never Haas G187.
   - TSC coolant falls back to M8 (unverified M-code not fabricated).

3. Any place a wrong number/sign/exponent/unit would emit unsafe G-code to the machine.

Report P0 (unsafe/wrong physics) and P1 with file:line. Grade PASS or FAIL. Be adversarial. Do NOT edit files.

### Assistant | 2026-06-25T14:14:21.614Z

I'll review this safety-critical post-processor engine. Let me start by reading the canonical constants and both engines to compare.

### Assistant | 2026-06-25T14:14:22.112Z

[tool_use: Read]

### User | 2026-06-25T14:14:22.941Z

[tool_result] 1	/**
2	 * RokuRokuFanuc31iMillMasterPostEngine -- full PRISM master post for the JM Die
3	 * Roku-Roku HC 658-II high-speed mill (FANUC 31i-B5 control). slot:echo,
4	 * U-PP-ROKUROKU-ENGINE (2026-06-25).
5	 *
6	 * WHY: VMC-05 (Roku-Roku HC 658-II) was the ONLY JM machine with NEITHER track --
7	 * `master_post_by_machine` else-REJECTED it (no engine, no route). This is the
8	 * full-post sibling 
... [+22978 chars truncated]

### Assistant | 2026-06-25T14:14:23.032Z

[tool_use: Read]

### Assistant | 2026-06-25T14:14:23.248Z

[tool_use: Read]

### User | 2026-06-25T14:14:24.236Z

[tool_result] 1	/**
2	 * HaasNGCMillMasterPostEngine — full PRISM master post for Haas mill controls
3	 * (Next-Gen-Control + classic). slot:echo, POST-TRAIN-MS0/U-PT-HAAS-ENGINE (2026-06-01).
4	 *
5	 * WHY: closes condition-2's full-post-coverage GAP for Haas. JM Die VMC-03/04 (Haas mills)
6	 * had CHEAP `.cps` coverage only (proven 15/15 dialect-clean via cheap-cps-validate) and NO
7	 * PRISM full post — `mas
... [+28229 chars truncated]

### User | 2026-06-25T14:14:24.579Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1007 of 1457 total (30718 tokens, cap 25000). Call Read with offset=1008 limit=1007 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * PRISM Canonical Physics Constants
3	 *
4	 * ALL physics calculations MUST import from this fi
... [+46719 chars truncated]

### Assistant | 2026-06-25T14:14:29.755Z

I have the canonical constants (CANONICAL_KIENZLE, CANONICAL_TAYLOR) and the full new engine. The relevant physics tables are in the page I read (lines 34-64). Let me verify the test file to confirm the claimed non-finite fix coverage, and check the dispatcher wiring claim.

### Assistant | 2026-06-25T14:14:30.697Z

[tool_use: Glob]

### Assistant | 2026-06-25T14:14:31.798Z

[tool_use: Grep]

### User | 2026-06-25T14:14:31.931Z

[tool_result] mcp-server\src\engines\RokuRokuParserEngine.ts

### User | 2026-06-25T14:14:33.259Z

[tool_result] Found 200 files
H:\prism\mcp-server\src\tools\dispatchers\camDispatcher.ts
H:\prism\mcp-server\src\engines\RokuRokuFanuc31iMillMasterPostEngine.ts
H:\prism\mcp-server\src\__tests__\RokuRokuFanuc31iMillMasterPostEngine.test.ts
H:\prism\mcp-server\src\tools\dispatchers\calcDispatcher.ts
H:\prism\mcp-server\src\__tests__\calculator-machinist-allout-sanity.test.ts
H:\prism\mcp-server\src\engines\PostP
... [+12214 chars truncated]

### Assistant | 2026-06-25T14:14:37.298Z

Let me read the test file to verify the non-finite fix coverage claim, and check the dispatcher wiring in camDispatcher.ts.

### Assistant | 2026-06-25T14:14:38.128Z

[tool_use: Read]

### User | 2026-06-25T14:14:38.948Z

[tool_result] 1	// RokuRokuFanuc31iMillMasterPostEngine.test.ts -- R9 reference-value tests for the
2	// VMC-05 Roku-Roku HC 658-II Fanuc-31i mill master post (U-PP-ROKUROKU-ENGINE, slot:echo).
3	// Reference values are hand-derived from the Fanuc-31i emit contract + the HaasNGC ground truth.
4	import { describe, it, expect } from "vitest";
5	import {
6	  rokuRokuFanuc31iMillMasterPostEngine as eng,
7	  type Fa
... [+8110 chars truncated]

### Assistant | 2026-06-25T14:14:39.932Z

[tool_use: Grep]

### User | 2026-06-25T14:14:41.364Z

[tool_result] 7155-                (params as any).config,
7156-              );
7157-            } else if (
7158:              // U-PP-ROKUROKU-ENGINE -- JM VMC-05 Roku-Roku HC 658-II (Fanuc 31i-B5), the high-speed
7159-              // electrode mill. It was the ONLY JM machine with NEITHER track; this branch closes the
7160-              // else-reject. Hurco/Haas/Okuma branches PRECEDE this, so a 31i-in-na
... [+1180 chars truncated]

### Assistant | 2026-06-25T14:14:59.224Z

I have everything needed. Let me verify the exact CANONICAL_KIENZLE/CANONICAL_TAYLOR shapes once more against the engine's field access — confirmed in the page I read (lines 34-64): `CANONICAL_KIENZLE[iso]` returns `{kc1_1, mc}` and `CANONICAL_TAYLOR[iso]` returns `{C, n}`. The engine accesses `k.kc1_1`, `k.mc`, `taylor.C`, `taylor.n` — all correct.

Now let me adversarially verify the two subtle points: the `emitCannedCycle` first-approach guard and whether the canned-cycle subsequent-hole path can leak a non-finite Z (the test caught a NaN in `emitToolpath`; I need to confirm the canned-cycle path is also clean).

Let me re-examine the canned-cycle subsequent-hole emit and the `estimateCycleTime` for non-finite leakage. Both are in the engine I already read. Let me trace the critical paths carefully.

**Tracing the non-finite guards in `emitCannedCycle`:**
- `holes` = `coordinates.filter(Number.isFinite(c.x) && Number.isFinite(c.y))` — so subsequent-hole XYs at line 392 are guaranteed finite. ✓
- `depth_mm`/`retract_mm` guarded at line 353. ✓
- `peck_mm` guarded by `hasPeck` (line 367) before emit at 387. ✓
- `dwell_s` guarded by `hasDwell` (line 368) before emit at 388. ✓
- First-hole feed guarded at 383-384. ✓

**Tracing `emitToolpath`:** X/Y guarded at 301; Z guarded at 306 (`Number.isFinite(c.z)`). This is the fix vs Haas (Haas line 345 emits Z without a finite check — `c.z !== undefined ? Z${fmt(c.z)}`). The Roku-Roku adds `&& Number.isFinite(c.z)`. ✓ — fix complete in the move list.

Now let me verify one genuine concern: the **first-approach block** `G0 G90 ... X${fmt(firstX)} Y${fmt(firstY)}` at line 214 — `firstX`/`firstY` are guarded (212-213). But the `fmt` of `firstX` does NOT include Z, and the spindle block is fine. Let me confirm there is no `estimateCycleTime` NaN leak (it returns a number, not G-code, so it can't emit unsafe G-code — only affects the advisory `estimated_time_min`).

Let me do one final adversarial check on the canned-cycle first-l
... [+185 chars truncated]

### Assistant | 2026-06-25T14:15:01.603Z

[tool_use: Grep]

### Assistant | 2026-06-25T14:15:02.732Z

[tool_use: Grep]

### User | 2026-06-25T14:15:03.500Z

[tool_result] 291:    fmtFeed: (f: number) => string | null,
347:    fmtFeed: (f: number) => string | null,

### User | 2026-06-25T14:15:04.225Z

[tool_result] 362:    if (approachFirst && (fmt(approachFirst.x) !== fmt(holes[0].x) || fmt(approachFirst.y) !== fmt(holes[0].y))) {
363:      warn(`canned cycle: the approach positions to (${approachFirst.x},${approachFirst.y}) but the first hole is (${holes[0].x},${holes[0].y}) -- order the holes drilling-first (no leading rapid) so the bare cycle drills the right point`);

### Assistant | 2026-06-25T14:15:56.207Z

I have completed a thorough adversarial review. I have all the evidence needed. Let me finalize the report.

**Adversarial findings on the two subtle paths:**

1. **`fmtFeed` type annotation mismatch (line 291, 347):** The local `fmtFeed` is declared `(f: number) => string | null` in the method signatures, but the actual closure passed from `generateProgram` (line 159) is `(f: number) => string | null`. Consistent — no runtime issue. The `feedTok` correctly handles the `null` return with the flagged `F1 (INVALID FEED - REVIEW)` token. Not a defect.

2. **`approachFirst.x/.y` at line 362:** If `approachFirst` exists but has a NaN x/y, `fmt(NaN)` = `"NaN"` on both sides only if `holes[0]` were also NaN — but `holes` is pre-filtered to finite XY, so `holes[0].x` is always finite. A NaN `approachFirst.x` → `fmt` returns `"NaN"` ≠ finite → triggers the warn (correct, advisory). The actual emitted cycle line uses `holes`/`cyc` values which are all finite-guarded. No literal NaN can leak into emitted G-code on this path. Not a defect.

Now the full report.

---

# PHYSICS REVIEW REPORT
```
Files reviewed:
  H:/prism/mcp-server/src/engines/RokuRokuFanuc31iMillMasterPostEngine.ts  (subject)
  H:/prism/mcp-server/src/engines/HaasNGCMillMasterPostEngine.ts            (template, compare)
  H:/prism/mcp-server/src/physics/constants.ts                             (canonical source)
  H:/prism/mcp-server/src/__tests__/RokuRokuFanuc31iMillMasterPostEngine.test.ts (16 tests)
  H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts:7158-7174     (wiring)
Formulas checked: 4 (Kienzle Fc, Taylor T, chip-load fz, cutting speed Vc)
```

## 1. PHYSICS CHECKS — verdict per claim

**Kienzle/Taylor sourced from canonical constants, never inlined — CONFIRMED.**
- Line 37: `import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../physics/constants.js";`
- Line 403-404: `k = CANONICAL_KIENZLE[op.material_iso]`, `taylor = CANONICAL_TAYLOR[op.material_iso]`.
- No inline `kc1_1=`, `mc=`, `C=`, 
... [+6725 chars truncated]
