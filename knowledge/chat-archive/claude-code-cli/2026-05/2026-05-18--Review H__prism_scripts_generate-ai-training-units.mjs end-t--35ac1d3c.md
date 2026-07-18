---
type: "chat-session"
source: "claude-code-cli"
session_id: "35ac1d3c-be24-480e-9950-8f6fea4e58db"
title: "Review H:\\prism\\scripts\\generate-ai-training-units.mjs end-to-end (whole file) p"
date: "2026-05-18"
first_ts: "2026-05-18T00:36:42.147Z"
last_ts: "2026-05-18T00:37:09.973Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/35ac1d3c-be24-480e-9950-8f6fea4e58db/subagents/agent-ac85752127269d0fc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Review H:\prism\scripts\generate-ai-training-units.mjs end-to-end (whole file) p

> **claude-code-cli** | 2026-05-18 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/35ac1d3c-be24-480e-9950-8f6fea4e58db/subagents/agent-ac85752127269d0fc.jsonl`

## Transcript

### User | 2026-05-18T00:36:42.147Z

Review H:\prism\scripts\generate-ai-training-units.mjs end-to-end (whole file) plus its test H:\prism\scripts\generate-ai-training-units.test.mjs.

CONTEXT: This is the deliverable for roadmap unit U-AI-TRAINING-FIRST-ROADMAP-ENROLL (milestone AI-TRAINING-FIRST-MS0). Its job: scan mcp-server/src/engines/ for *MetaLearning/*DeepLearning/*UltraIntelligence engines, classify each to one of 13 DOMAIN-PIPELINE-MS0 domains (mill/lathe/wire/cad/cam/tribal/erp/post/speedfeed/print2prog/academy/database/misc), and emit a roadmap milestone envelope at mcp-server/data/milestones/AI-TRAINING-FIRST-MS0.json matching the FEATURE-GAP-AUDIT-MS0.json schema (id, version, title, brief, created_at, created_by, track, roadmap_priority, status, total_units, total_sessions, source_audit, advisory_only, must_human_verify, units[]). It already ran: 25 engines → 25 units, 9 domains, envelope written. 9/9 tests pass.

Verify against the unit contract: (1) classifyEngineDomain correctness — every engine maps to a sensible domain, vendor-CAM (mastercam/hypermill/fusion) does NOT fall to mill, the ^cam prefix rule is sound, misc fallback never throws. (2) Idempotency claim — re-run preserves created_at when units unchanged; is the sameUnits comparison actually robust? (3) Atomic write (temp+rename) correctness. (4) Envelope schema fidelity vs the documented FEATURE-GAP-AUDIT-MS0 fields. (5) The entrypoint guard `import.meta.url === pathToFileURL(process.argv[1]).href` — does it fire correctly on Windows when invoked as `node scripts/generate-ai-training-units.mjs`? (6) Any silent-failure / R12 fail-loud violations (e.g. corrupt prior envelope swallowed). (7) Test integrity — are assertions real-value (not stubs), do they actually pin behavior?

Report P0/P1/P2 findings with line numbers and grade PASS or FAIL. Be concrete. Under 400 words.

### Assistant | 2026-05-18T00:36:45.635Z

I'll review both files end-to-end.

### Assistant | 2026-05-18T00:36:46.484Z

[tool_use: Read]

### Assistant | 2026-05-18T00:36:46.592Z

[tool_use: Read]

### User | 2026-05-18T00:36:48.192Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-ai-training-units.mjs — derive + enroll per-domain AI-training units.
4	 *
5	 * Unit: U-AI-TRAINING-FIRST-ROADMAP-ENROLL (milestone AI-TRAINING-FIRST-MS0).
6	 * Doctrine: feedback_ai_training_first_before_revenue — pre-revenue, the fleet
7	 * trains per-domain AI engines on the full corpus so revenue ships at full
8	 * potential. This generator enumerates 
... [+8451 chars truncated]

### User | 2026-05-18T00:36:48.251Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Tests for generate-ai-training-units.mjs — the AI-TRAINING-FIRST-MS0 enroller.
4	 * Real-value assertions (no toBeDefined stubs). Run: node --test scripts/generate-ai-training-units.test.mjs
5	 */
6	import { test } from "node:test";
7	import assert from "node:assert/strict";
8	import {
9	  classifyEngineDomain,
10	  deriveUnits,
11	  DOMAINS,
12	  MILESTONE_ID,
13	
... [+4052 chars truncated]

### Assistant | 2026-05-18T00:37:09.973Z

Both files read in full (195 + 95 lines). Analysis against the 7 contract points:

## Code Quality Analysis Report

### Summary
- Overall Quality Score: 8/10
- Files Analyzed: 2
- Issues Found: 5 (0 P0, 2 P1, 3 P2)
- Grade: **PASS**

### P1 Findings

**P1-1 — Idempotency comparison is too shallow (line 176-179).** `sameUnits` compares only `p.id === units[i].id && p.status === units[i].status`. If an engine file is *renamed* such that its `title`/`engine` path changes but the derived `id` and `status` collide (e.g., a refactor keeping the same domain+slug), `created_at` is wrongly preserved while the envelope substance changed. More realistically: changing `training_priority` text or `acceptance` wording in `deriveUnits` produces a substantively different envelope but the stale `created_at` persists silently — the "idempotent" claim is narrower than documented (line 18-19 says "byte-stable... if envelope unchanged in substance"). The comparison does not cover the substance it claims to. Recommend hashing the serialized `units` array (sans `created_at`) or comparing full unit objects via `JSON.stringify`.

**P1-2 — Corrupt prior envelope swallowed silently (line 181).** `catch { /* corrupt prior — overwrite */ }` is an R12 fail-loud violation. A corrupt existing envelope is overwritten with **zero stderr/stdout signal**. Per CLAUDE.md R12 ("Fail loud... say so explicitly"), this should emit a warning to stderr (e.g., `corrupt prior envelope at ENVELOPE_PATH — regenerating fresh`). The data isn't lost destructively (it's being regenerated), but the operator never learns the prior was corrupt — masking a real fault.

### P2 Findings

**P2-1 — `^cam` rule false-positive risk (line 56).** `^cam` matches any engine whose lowercased name *starts with* "cam". `CamshaftDeepLearningEngine` or `CamberDeepLearningEngine` would misclassify to "cam". Low real-world risk given the engine inventory, but the comment's justification is incomplete. Currently sound for the 25-engine se
... [+1386 chars truncated]
