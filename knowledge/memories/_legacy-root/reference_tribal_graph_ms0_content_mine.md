---
name: reference-tribal-graph-ms0-content-mine
description: TRIBAL-GRAPH-MS0 iter-7 — course-content mining pipeline shipped (commit 67895484f)
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:10.003Z
aliases: reference_tribal_graph_ms0_content_mine
---


# TRIBAL-GRAPH-MS0 / U-CONTENT-MINE (iter 7) — shipped 2026-05-16

Commit `67895484f` (slot india, claude-41db1b82). 3 new files, 1390 LOC, 3-of-3 scrutiny PASS, 6 per-file reviewer dispatches.

**What it does:** mines the machine-readable per-resource `data.json` descriptor layer of MIT-OCW course zips → Ollama qwen2.5-coder distills per-course technique vocabulary + candidate `{formula|algorithm|technique|tip|engine}` proposals + mfg-relevance → ranked **ADVISORY review queue** `state/shared/tribal-graph/course-content-candidates.jsonl` (gitignored runtime state) + 64 `advisoryOnly` graph nodes on /system-viz.

**Files (committed):**
- `scripts/lib/course-content-mine-lib.mjs` — pure transforms, 19 exports.
- `scripts/lib/course-content-mine-lib.test.mjs` — 46 node:test cases.
- `scripts/tribal-graph-course-content-mine.mjs` — zip→Ollama→JSONL orchestrator (idempotent checkpoint, fail-loud exit 4, env-var PowerShell).

**Result:** 226/227 courses processed. 65 ranked candidates · 126 asset proposals · 211 technique tags. The 1 holdout (`6.007-spring-2011.zip`) is a corrupt 699 MB download — truncated, zeroed End-Of-Central-Directory record — handled gracefully (60s spawn timeout + SIGKILL + 2× hang-cap → clean EXTRACT-FAIL, run still completes). Idempotently recoverable if the zip is re-downloaded intact.

**Doctrine — advisory, never auto-built:** the output is a human/forge-gated review queue. PRISM's comprehensive-build-enforce / no-stub / duplication-guard hooks block LLM-generated stub engines by design; auto-building from an LLM distillation would pollute the codebase. `advisoryOnly:true` + `mustHumanVerify:true` + a never-auto-build `caveat` are structurally hardcoded on every JSONL record and graph node — not model-controllable.

**Why descriptor-layer, not PDFs:** MIT lecture-note PDFs are scanned images (pymupdf: ~200 char cover-only, zero body — OCR-gated, out of autonomous scope). The minable signal is the per-resource `data.json` `description` blurbs.

Composes iters 3-6 ([[reference_u_ppl_d4_program_equivalent_index]] sibling pattern — compose, never fork). Sister lesson: [[feedback_verify_actual_contract_not_proxy]].


## Related
[[skills/shared|/shared]] • [[skills/tribal-graph|/tribal-graph]] • [[skills/course-content-candidates|/course-content-candidates]] • [[skills/system-viz|/system-viz]] • [[skills/lib|/lib]] • [[skills/course-content-mine-lib|/course-content-mine-lib]] • [[skills/tribal-graph-course-content-mine|/tribal-graph-course-content-mine]] • [[skills/forge-gated|/forge-gated]]