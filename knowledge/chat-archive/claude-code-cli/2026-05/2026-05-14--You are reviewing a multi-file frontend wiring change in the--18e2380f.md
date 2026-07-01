---
type: "chat-session"
source: "claude-code-cli"
session_id: "18e2380f-072d-4193-ae34-c9019c07403d"
title: "You are reviewing a multi-file frontend wiring change in the PRISM repo (CALC-RE"
date: "2026-05-14"
first_ts: "2026-05-14T19:45:27.503Z"
last_ts: "2026-05-14T19:47:27.994Z"
cwd: "H:\\PRISM\\mcp-server\\web"
messages: 15
user_msgs: 7
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/18e2380f-072d-4193-ae34-c9019c07403d/subagents/agent-ac679d72a6cc05fbe.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# You are reviewing a multi-file frontend wiring change in the PRISM repo (CALC-RE

> **claude-code-cli** | 2026-05-14 | 15 msgs (7 user / 8 assistant) | cwd: H:\PRISM\mcp-server\web
> Raw: `H:/.claude/projects/H--prism/18e2380f-072d-4193-ae34-c9019c07403d/subagents/agent-ac679d72a6cc05fbe.jsonl`

## Transcript

### User | 2026-05-14T19:45:27.503Z

You are reviewing a multi-file frontend wiring change in the PRISM repo (CALC-RESTORE-MS0 Phase 1A — "wire calculator panels to real dispatcher actions"). Review the WHOLE of each file end-to-end.

FILES TO REVIEW (read all three fully):
1. H:/prism/mcp-server/web/src/api/wireEdm.ts — a `weFeasibility()` function + `WeFeasibilityInput`/`WeFeasibilityResult`/`WeFeasibilityFeature` interfaces were added (after `weCostEstimate`, ~line 407). They mirror the backend `EDMFeasibilityEngine` in H:/prism/mcp-server/src/engines/EDMFeasibilityEngine.ts.
2. H:/prism/mcp-server/web/src/components/calculator/WireEdmFeasibilityPanel.tsx — was pure-local-math; now: imports weFeasibility, adds exported pure fns `buildFeasibilityInput()` + `mapFeasibilityResponse()`, the `check` callback is now async (API-first, falls back to local `assessFeasibility()` on throw OR when the mapper returns null), and a `source` LIVE/OFFLINE badge.
3. H:/prism/mcp-server/web/src/__tests__/WireEdmFeasibilityPanel.test.tsx — new test file (19 tests, all passing).

CONTRACT TO VERIFY AGAINST:
- Backend route exists: H:/prism/mcp-server/src/routes/edm.ts line ~155 `router.post("/feasibility", ...)` → `invoke("wedm_assess_feasibility", ...)` → `EDMFeasibilityEngine.assess()`. The wireEdm.ts `wePost` helper prepends `/api/v1/edm`.
- The panel's existing local-math display interface (`FeasibilityResult` in the .tsx) must NOT be broken; the offline path must still work exactly as before.
- `mapFeasibilityResponse` MUST be defensive: any shape mismatch / missing field → return null → caller uses local math. The panel must never crash on a backend contract drift.
- Reference pattern for an already-wired panel: H:/prism/mcp-server/web/src/components/calculator/LatheGroovingPanel.tsx.

FOCUS YOUR REVIEW ON: React state management correctness (the async `check` callback, loading/source state, the finally block + early return interaction), the input-builder/response-mapper correctness vs the real backend `EDMFeasibi
... [+585 chars truncated]

### Assistant | 2026-05-14T19:45:32.046Z

I'll review all three files end-to-end, plus the contract sources.

### Assistant | 2026-05-14T19:45:32.501Z

[tool_use: Read]

### Assistant | 2026-05-14T19:45:32.983Z

[tool_use: Read]

### Assistant | 2026-05-14T19:45:33.853Z

[tool_use: Read]

### Assistant | 2026-05-14T19:45:34.319Z

[tool_use: Read]

### Assistant | 2026-05-14T19:45:34.929Z

[tool_use: Read]

### Assistant | 2026-05-14T19:45:35.476Z

[tool_use: Read]

### User | 2026-05-14T19:45:41.453Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\components\calculator\LatheGroovingPanel.tsx' was already read 17m ago in this session and is unchanged (mtime 1777035949131). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable
... [+21 chars truncated]

### User | 2026-05-14T19:45:44.039Z

[tool_result] 1	/**
2	 * Wire EDM Calculator API — calls edmDispatcher (prism_edm) via /api/v1/edm/*
3	 *
4	 * Routes:
5	 *   /calculator-solve  — 6-engine orchestration (settings→multipass→cutting→corners→surface→cost)
6	 *   /wire              — legacy quick wire settings
7	 *   /multipass          — full multi-pass strategy
8	 *   /cost               — cost estimation
9	 *   /machines           — wire EDM ma
... [+21867 chars truncated]

### User | 2026-05-14T19:45:44.465Z

[tool_result] 1	/**
2	 * WireEdmFeasibilityPanel — Wire EDM feasibility assessment.
3	 * Shows: conductivity check, tolerance achievability, min inside radius,
4	 *        taper feasibility, overall go/no-go gate.
5	 * Wire: prism_edm:wedm_assess_feasibility
6	 */
7	
8	import { useState, useCallback } from 'react';
9	import { weFeasibility, type WeFeasibilityInput, type WeFeasibilityResult } from '../../api/wir
... [+22653 chars truncated]

### User | 2026-05-14T19:45:45.267Z

[tool_result] 1	// @vitest-environment jsdom
2	/**
3	 * WireEdmFeasibilityPanel tests — CALC-RESTORE-MS0 / Phase 1A.
4	 *
5	 * Covers the backend-wiring pure functions (buildFeasibilityInput,
6	 * mapFeasibilityResponse) with reference values + failure/adversarial inputs,
7	 * plus the panel's live/offline fallback behaviour through a mocked weFeasibility.
8	 */
9	import { beforeEach, describe, expect, it, vi }
... [+12628 chars truncated]

### User | 2026-05-14T19:45:46.865Z

[tool_result] 1	/**
2	 * PRISM Manufacturing Intelligence - EDM Feasibility & Geometry Assessment Engine
3	 * Wire EDM feasibility analysis consolidating conductivity, geometry, tolerance,
4	 * start-hole access, taper, wire access, and cutting time estimation.
5	 *
6	 * Consolidates WEDM-P2P-MS2 U01-U07:
7	 *   U01 ConductivityVerifier
8	 *   U02 GeometryFeasibilityChecker
9	 *   U03 ToleranceAchievabilityEngi
... [+34017 chars truncated]

### User | 2026-05-14T19:45:47.139Z

[tool_result] 1	/**
2	 * EDM Routes — Non-Traditional Machining API
3	 * WEDM-MS0 U-WEDM01
4	 *
5	 * Legacy routes (7): wire, sinker, laser, waterjet, pipeline, recommendation
6	 * WEDM Pipeline routes (20): geometry parsing, interpretation, feasibility,
7	 *   material/machine/wire, start holes, toolpath, optimization, cutting params,
8	 *   wire management, monitoring, G-code, cost, quality
9	 *
10	 * Auth: v
... [+48425 chars truncated]

### Assistant | 2026-05-14T19:47:27.994Z

I have the LatheGroovingPanel.tsx content from earlier in the session. Let me check the one critical thing I need to verify: how `weCostEstimate` (the reference for `wePost` usage) and the route response wrapping interact, plus the `LatheGroovingPanel` reference pattern. I have enough from context. Let me verify one integration detail — the `invoke()` helper in edm.ts and how the response gets unwrapped.

I have all the contract sources. Let me write the review.

---

## Code Review — CALC-RESTORE-MS0 Phase 1A: Wire EDM Feasibility Panel

### File 1: `H:/prism/mcp-server/web/src/api/wireEdm.ts`

**P0 — `weFeasibility` return type vs. actual route response shape mismatch**
`wireEdm.ts:481-483` — `weFeasibility` is typed `Promise<PrismResponse<WeFeasibilityResult>>` and `wePost` does `fetchJson<PrismResponse<T>>(...)`. But the actual `/feasibility` route (`edm.ts:155-157`) returns `res.json(await invoke("wedm_assess_feasibility", req.body))`, and `invoke` (`edm.ts:25-30`) returns `{ result: await callTool(...) }`. So the wire response is `{ result: <dispatcher response> }` — NOT a `PrismResponse` shape with `ok`/`success`/`data`. The declared type `PrismResponse<WeFeasibilityResult>` is a fiction. This is the same pattern the file already flagged and *fixed* for `wePhotoToProgram` ("FIX H1: properly parse the response shape (route returns { ok, data, ocr })") — `weFeasibility` reintroduces exactly that bug class. The panel's `check` callback partially compensates with `(resp as { result?: unknown })?.result ?? resp`, but the exported function's contract is wrong, which will mislead every future caller. The type should be `Promise<{ result: WeFeasibilityResult }>` or the function should unwrap `.result` itself like `wePhotoToProgram` does.

**P1 — `wedm_assess_feasibility` dispatcher response is double-wrapped; mapper sees the wrong object**
`edm.ts:29` wraps the dispatcher result as `{ result: callTool(...) }`. But `callTool("prism_edm", "wedm_assess_feasibility", ...
... [+13229 chars truncated]
