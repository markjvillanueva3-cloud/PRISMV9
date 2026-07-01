---
type: "chat-session"
source: "claude-code-cli"
session_id: "f593aee3-12cf-4e8a-a566-8411386cc606"
title: "You are producing delta (CAD)'s **definitive dependency-ordered execution roadma"
date: "2026-06-09"
first_ts: "2026-06-09T23:39:43.104Z"
last_ts: "2026-06-09T23:44:47.679Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/f593aee3-12cf-4e8a-a566-8411386cc606/subagents/workflows/wf_7909e40d-9ee/agent-a4c30bdeb6f4e3551.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# You are producing delta (CAD)'s **definitive dependency-ordered execution roadma

> **claude-code-cli** | 2026-06-09 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/f593aee3-12cf-4e8a-a566-8411386cc606/subagents/workflows/wf_7909e40d-9ee/agent-a4c30bdeb6f4e3551.jsonl`

## Transcript

### User | 2026-06-09T23:39:43.104Z

You are producing delta (CAD)'s **definitive dependency-ordered execution roadmap** toward 3 goal-clears: (1) finish ALL remaining delta units/phases, (2) upgrade delta systems for the Blackwell box, (3) fully finished closed-loop learning for generating highly complex CAD models. Operating model: ultracode-workflows for planning/reasoning, Ollama for grunt, Claude for judgment/safety/wiring.

You have 4 lens reports below. Produce an operator-facing markdown roadmap:

1. **Executive sequence** — the dependency-ordered PHASES (P0..Pn) from "do first / unblocks everything" to "final complex-CAD closed loop". Each phase one line: what + why-this-order.
2. **Per-phase unit list** — under each phase, the concrete units (id/name · build/wire/test acceptance · est size · route tag [ULTRACODE-PLAN / CLAUDE-BUILD / OLLAMA-GRUNT]). Enumerate ALL — do not prune.
3. **Closed-loop complex-CAD critical path** — the explicit chain from lens 3 (live round-trip -> feature-recognition -> smooth solid gen -> compare -> correct -> learn -> scale-to-complex), with the single hardest blocker called out.
4. **Blackwell upgrades** — the utilization-gap fixes, ordered by ROI.
5. **Ollama-grunt routing table** — task-type -> route -> model/surface -> guardrail (red-lines preserved).
6. **THE FIRST 3 UNITS to execute this session** — concrete, with exact commands/files. Unit 0 is already in flight: A1 (fix cad-ollama-archetype-label.mjs dead model tag).

Be SPECIFIC (unit ids, file paths, model tags, acceptance tests). Resolve contradictions toward the safety lens. This roadmap is what an autonomous /loop will execute unit-by-unit. Comprehensive route, logical order (R13).

LENS REPORTS:
===== LENS remaining-units =====
I now have complete, verified data. The briefing's "~201 pending" was pre-reconciliation; the live `CAD-COMPLETE-MS0` envelope shows **67 real pending** (64 not_started + 3 pending), and `FEATURE-GAP-AUDIT-MS0` confirms **44 not_started** with **U-BRIDGE-CAD-CAM-HANDOFF still
... [+57468 chars truncated]

### Assistant | 2026-06-09T23:39:47.669Z

I'll produce the definitive roadmap. Let me first verify a few load-bearing facts from the lens reports against live state, then synthesize. The most important verifications: Unit 0's target file, the dead model tag, and the model-resolver helper signature.

### Assistant | 2026-06-09T23:39:48.562Z

[tool_use: Bash]

### Assistant | 2026-06-09T23:39:50.136Z

[tool_use: Bash]

### User | 2026-06-09T23:40:02.709Z

[tool_result] /h/prism-slot-delta

### User | 2026-06-09T23:40:03.919Z

[tool_result] #!/usr/bin/env node
// tier: T2 / CAD-PIPELINE-WIRE-MS0/U-CAD-OLLAMA-ARCHETYPE-LABEL
// Ollama archetype classifier — feeds geom.json features to qwen2.5-coder:7b,
// gets back {archetype, confidence, reasoning}. Graceful no-op when Ollama
// /api/chat is dead (current state — GPU contention).

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resol
... [+1908 chars truncated]

### Assistant | 2026-06-09T23:40:13.596Z

Important finding: Unit 0 (A1) is **already fixed** in the slot-delta worktree. The file at `/h/prism-slot-delta/scripts/cad-ollama-archetype-label.mjs` no longer pins the retired `qwen2.5-coder:7b` for resolution — it has `MODEL_PREFERENCE = ["gpt-oss:120b", "qwen2.5-coder:32b", "gpt-oss:20b"]`, host-aware `pickStrongestModel()`, and a live `/api/tags` probe. Only the stale top-of-file comment still mentions `7b`. Let me verify the call path actually uses the resolved model and check live model availability + the offload stats.

### Assistant | 2026-06-09T23:40:14.570Z

[tool_use: Bash]

### Assistant | 2026-06-09T23:40:15.982Z

[tool_use: Bash]

### Assistant | 2026-06-09T23:40:17.755Z

[tool_use: Bash]

### User | 2026-06-09T23:40:22.273Z

[tool_result]   for (const pref of MODEL_PREFERENCE) if (installed.has(pref)) return pref;
  const coder = models.find((m) => m.startsWith("qwen2.5-coder"));
  return coder || models[0] || fallback;
}

async function classifyOne(geom, blades, model) {
  const facts = {
    bbox_mm: geom.boundingBox?.size,
    pointCount: geom.primitives?.pointCount,
    bsplineSurfaces: geom.primitives?.bsplineSurfaceCount,
   
... [+4528 chars truncated]

### User | 2026-06-09T23:40:30.758Z

[tool_result] {"models":[{"name":"qwen2.5-coder:1.5b"
{"name":"gpt-oss:120b"
{"name":"qwen2.5-coder:32b"
{"name":"gpt-oss:20b"
{"name":"qwen3-vl:8b-instruct"
{"name":"qwen3-vl:8b"
{"name":"qwen2.5vl:7b"
{"name":"moondream:1.8b"
{"name":"llama3.2-vision:11b"
{"name":"nomic-embed-text:latest"

### User | 2026-06-09T23:40:40.108Z

[tool_result] 575c19a709 [delta] [DELTA-OLLAMA-EFFICIENCY-MS0]/U-A1-ARCHETYPE-LABELER-MODEL-RESOLVE: fix dead-model-tag silent degradation
8acf03b236 [delta] [CAD-TRAINING-PIPELINE]/U-CADTP-FILLET-CLOSED-LOOP: fillet correction mechanic + R12 health-gated verify -> 4 part classes close to 100% LIVE.
d587d68fa0 [delta] [CAD-TRAINING-PIPELINE]/U-CADTP-CHAMFER-CLOSED-LOOP: wire chamfer into the correction-loop orc
... [+388 chars truncated]

### Assistant | 2026-06-09T23:40:47.417Z

I found a real bug to flag, and confirmed key facts. Critical findings:

1. **Unit 0 (A1) was committed** as `575c19a709` (U-A1-ARCHETYPE-LABELER-MODEL-RESOLVE) — the model resolution is fixed. BUT there's a **real residual bug**: line ~127 still references `OLLAMA_MODEL` (an undefined variable — it was renamed to `model`/`FALLBACK_MODEL`). `result = { ...ollamaR.label, source: "ollama:" + OLLAMA_MODEL }` will throw `ReferenceError` on every successful Ollama classification. The A1 fix is incomplete — there's a dead variable reference that crashes the success path.

2. **Live models confirmed**: `gpt-oss:120b`, `qwen2.5-coder:32b`, `gpt-oss:20b`, `qwen3-vl:8b-instruct`, `qwen3-vl:8b`, `qwen2.5vl:7b`, `llama3.2-vision:11b`, `moondream:1.8b`, `nomic-embed-text` — all routing-table targets exist.

3. **slot/delta is 409 commits ahead** of trunk — merge debt confirmed (Lens 3's "408" + the new A1 commit).

Let me verify the `OLLAMA_MODEL` bug precisely and check the trainer/ledger wiring claim from Lens 3.

### Assistant | 2026-06-09T23:40:48.832Z

[tool_use: Bash]

### Assistant | 2026-06-09T23:40:51.310Z

[tool_use: Bash]

### User | 2026-06-09T23:40:55.785Z

[tool_result] 18:const FALLBACK_MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:32b";
38:  if (process.env.OLLAMA_MODEL) return process.env.OLLAMA_MODEL;
138:      if (ollamaR.ok) result = { ...ollamaR.label, source: "ollama:" + OLLAMA_MODEL };

### User | 2026-06-09T23:41:08.965Z

[tool_result] ls: cannot access 'mcp-server/src/engines/cad/CADFeatureRecognitionEngine.ts': No such file or directory
scripts/cad-fusion-correction-loop-live.mjs
scripts/lib/cad-fix-training-ledger.mjs
scripts/lib/cad-fusion-capability-ladder.mjs
---retrain consumer?---
scripts/lib/cad-fix-training-ledger.mjs
scripts/lib/cad-fix-training-ledger.test.mjs

### Assistant | 2026-06-09T23:44:47.679Z

Both findings confirmed. Line 138 references `OLLAMA_MODEL` (undefined — only `FALLBACK_MODEL` and the local `model` var exist) → **ReferenceError crashes every successful Ollama classification**, silently degrading to rule-based for the whole corpus. This is a real residual bug in the A1 commit and is the natural Unit 1.

Also confirmed: `cad-fix-training-ledger.mjs` has **no retrain consumer** (only itself + its test reference it — Lens 3's finding holds), and `CADFeatureRecognitionEngine.ts` does **NOT exist on the slot-delta worktree** (it's the shared-tree U-EFF25 stub — the new milestone is genuinely net-new here).

I have enough verified ground truth. Producing the roadmap now.

---

# DELTA (CAD) DEFINITIVE EXECUTION ROADMAP — toward 3 goal-clears
**Generated 2026-06-09 · slot:delta · branch `slot/delta` (409 ahead of `cad-fusion-live-ms0`)**

**Goal clears:** (1) finish ALL remaining delta units, (2) upgrade delta systems for the Blackwell box, (3) fully-finished closed-loop learning for highly-complex CAD generation.
**Operating model:** ULTRACODE-PLAN for decomposition/merge/multi-agent · OLLAMA-GRUNT for mechanical text/vision (strongest model for the grunt) · CLAUDE-BUILD for geometry/safety/wiring/synthesis. **Default-DENY on geometry & safety — Ollama is pre-gate draft only.**

**Live-verified this session:** A1 model-resolve already committed (`575c19a709`) but carries a residual `ReferenceError` (line 138 `OLLAMA_MODEL` undefined) that crashes the success path → Unit 1. Models `gpt-oss:120b / qwen2.5-coder:32b / gpt-oss:20b / qwen3-vl:8b-instruct / qwen3-vl:8b / qwen2.5vl:7b / llama3.2-vision:11b / moondream:1.8b / nomic-embed-text` all live. `CADFeatureRecognitionEngine.ts` absent on slot-delta. `cad-fix-training-ledger.mjs` has zero retrain consumer.

---

## 1 · EXECUTIVE SEQUENCE (dependency-ordered phases P0→P10)

| Phase | What | Why this order |
|---|---|---|
| **P0 · STABILIZE & UNBLOCK** | Fix A1 residual crash, repair malformed `CAD-DRAW-M
... [+37136 chars truncated]
