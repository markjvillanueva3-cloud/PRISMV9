# KNOWLEDGE-CONVERSION-MS0 — Plan

**Status:** plan (not started) · **Author:** claude-41db1b82 (slot india) · **Date:** 2026-05-16
**Execute in:** a fresh session (this plan was written at deep post-compaction context).

## Problem

Two large knowledge corpora are *extracted* but **not wired into any PRISM consumption surface** — verified, not assumed:

| Corpus | What exists | Wired? |
|--------|-------------|--------|
| **Coursework** (TRIBAL-GRAPH-MS0) | 209 course-tribal nodes + 65 ranked content-mining candidates (`state/shared/tribal-graph/course-content-candidates.jsonl`) + 64 `/system-viz` nodes | **No.** `prism_knowledge:tribal_search` reads `TribalKnowledgeEngine`, not this data. Zero consumers in `mcp-server/src`. |
| **Monolith** (`extract_monolith_modules.py`, 2026-01-30) | 1000 unique modules · 71 formulas · 20 algorithms · 948 indexed (`extracted_modules/MONOLITH_MODULE_INVENTORY.json`, `scripts/extraction/monolith_index.json`); 1016 files in `extracted_modules/` | **Partial.** `S1-MS2`/`L1-P0-MS1`/`L2-P0-MS1` ported *some* algorithms+engines (complete). The rest — descriptions, formulas, modules — unported/unwired. |

"Pipeline-consumable" (the shape is right) ≠ "pipeline-consumed" (a consumer reads it). This milestone closes that gap.

## The two-lane conversion model (load-bearing)

Not all of "tribal knowledge / algorithms / formulas / pipelines / skills / hooks" can be produced the same way. PRISM's `no-stub` / `comprehensive-build-enforce` / `duplication-guard` hooks **block** LLM-generated stub engines by design, and auto-spawning LLM-distilled assets is the codebase pollution the operator's standing "be careful" mandate forbids. So:

- **Lane A — direct-wire (autonomous-safe).** Target: **tribal knowledge** + **memories**. Source data → `KnowledgeTip[]` → `TribalKnowledgeEngine.ingest()` / `DOC_KNOWLEDGE_DIR` auto-load. Verifiable round-trip through `prism_knowledge:tribal_search`. Honest `source:` provenance + honest confidence. Safe to run autonomously.
- **Lane B — port (engineering, semi-autonomous).** Target: **formulas + algorithms** *that already exist as real extracted code* in the monolith (71 formulas, 20 algorithms — actual prior-PRISM code, not LLM inventions). Port = dedup-check against `src/physics/constants.ts` + `src/algorithms/`, verify, wire. This is legitimate engineering (it is what `S1-MS2` already did for 14 algorithms).
- **Lane C — /forge-gated (human-in-the-loop).** Target: **new engines / skills / hooks**, and **course-derived** (LLM-distilled) formula/algorithm *proposals*. These stay a **ranked candidate queue** feeding human-gated `/forge` + scrutiny. Never auto-built.

## Units

### Phase 0 — Audit & reconcile (don't redo prior work)
- **U-KC-A1** — Monolith port-state audit. Cross-ref `monolith_index.json` (948 modules) + the 71 formulas + 20 algorithms against current `src/engines/`, `src/algorithms/`, `src/physics/constants.ts` via `duplicationGuardEngine`. Output: `state/shared/specs/monolith-port-ledger.json` — per-item `{ported|unported|superseded}`. Subtract `S1-MS2`/`L1-P0-MS1`/`L2-P0-MS1` deliverables.
- **U-KC-A2** — Coursework wiring-state audit (mostly done this session): 65 candidates + 209 nodes confirmed unwired. Confirm `TribalKnowledgeEngine` `ingest()` + `KnowledgeTip` schema is the target.

### Phase 1 — Lane A: tribal knowledge (direct-wire)
- **U-KC-B1** — `scripts/course-to-tribal-tips.mjs`: transform `course-content-candidates.jsonl` + course technique vocabulary → `KnowledgeTip[]` (`source:"mit-ocw:<courseId>"`, `confidence` = mfgRelevance×confidence×100, `category` mapped, `tags` = technique tags). Emit a JSON into `DOC_KNOWLEDGE_DIR`. Real tests + per-file scrutiny gate.
- **U-KC-B2** — `scripts/monolith-to-tribal-tips.mjs`: monolith module descriptions/categories (the 948 indexed) where the module is a *knowledge/practice unit* (not code) → `KnowledgeTip[]` (`source:"monolith:<module>"`).
- **U-KC-B3** — **Wiring verification (the gap the operator caught)**: round-trip E2E test — ingest, then `prism_knowledge:tribal_search` query returns the course + monolith tips. A test that invokes through the dispatcher, not just the engine.
- *Merges with:* `CC-MS2` (Knowledge Extraction Engine), `CC-EXT-MS5` (Cross-Source Knowledge Synthesis), `CC-MS6` (Machining Practice KB) — all `not_started`.

### Phase 2 — Lane B: formula / algorithm port
- **U-KC-C1** — Monolith formula port: from U-KC-A1's ledger, port `unported` formulas. Each: verify against `src/physics/constants.ts` (NEVER inline constants), `physics-reviewer` agent gate, wire to `prism_calc`/`prism_safety`.
- **U-KC-C2** — Monolith algorithm port: same for the 20 algorithms vs `src/algorithms/`. Most likely already done by `L1-P0-MS1` — confirm, port residue.
- *Merges with:* `L1-P1-MS1/MS2` (New Algorithms), `S1-MS2` (Core Monolith Algorithms).

### Phase 3 — Lane C: /forge candidate queue
- **U-KC-D1** — Formalize the 65 course candidates + any LLM-distilled monolith proposals into registered `/forge`-eligible units (ranked). Top-N by rank get `/forge-triple` proposal stubs. Human-gated — **not auto-built**.
- *Merges with:* the `/forge` pipeline + `CC-EXT-MS1` (PDF/Manual Knowledge Extraction).

### Phase 4 — Memories + doc reflection
- **U-KC-E1** — Durable memory entries: corpora provenance, the wiring map, conversion lessons. Update all 4 doc surfaces (memory, MEMORY.md, wiki, CLAUDE.md pointer if milestone-worthy).

## Roadmap merge

Register `KNOWLEDGE-CONVERSION-MS0` via RGS so it joins `roadmap-index.json` (750 milestones). Explicit dependency/merge edges:
- **Subsumes scope of:** `CC-MS2`, `CC-EXT-MS5`, `CC-MS6` (knowledge-extraction, `not_started`) — fold their intent into Phase 1, or mark them merged.
- **Depends on (done):** `S1-MS2`, `L1-P0-MS1`, `L2-P0-MS1` — Phase 0 subtracts their deliverables.
- **Feeds:** `/forge` queue, `L1-P1` (new algorithms).

## Execution notes for the fresh session
- Per-file scrutiny gate (2 parallel reviewers/file) + end-of-task 3-of-3.
- Ollama for any LLM distillation; `prism_calc`/`physics-reviewer` for ported formulas.
- Lanes A+B are autonomous; Lane C stops at the queue — do not auto-build engines/skills/hooks.
- Idempotent ingest scripts (checkpoint), `DOC_KNOWLEDGE_DIR` is the auto-load path.
- Commit `[MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-KC-*`.

## Phase 0 — EXECUTED 2026-05-16 (U-KC-A1 + U-KC-A2)

**Tool:** `scripts/audit-monolith-port-state.mjs` (re-runnable, deterministic with `--frozen-time`; per-file scrutiny PASS/PASS).
**Ledger:** `state/shared/specs/monolith-port-ledger.json` — `advisoryOnly:true`, `mustHumanVerify:true`.

**Premise correction (load-bearing):** the Problem table above states `S1-MS2 / L1-P0-MS1 / L2-P0-MS1` are *complete*. They are **not** — their milestone envelopes are `status=not_started`. Port-state below is derived from **live `mcp-server/src` cross-reference**, which is envelope-independent and authoritative; the envelopes were not used.

**Findings:**
- **Algorithms — Lane B is confirm-only.** All **20/20** monolith core algorithms resolve to a current PRISM file (8 grep-content-verified, 12 by name-match). `U-KC-C2` downgrades from "port the 20 algorithms" to "confirm 20 ported + spot-check the 12 name-match entries." No algorithm-porting work.
- **Formulas — `U-KC-C1` remains real.** The "71 formulas" is a detection *count*, not a list; the portable formula CODE is `extracted/formulas/*.js` (**12 files**) — name-match: 8 ported / 3 ambiguous / 1 unported. `U-KC-C1` verifies these 12 against `src/` + `src/physics/constants.ts`.
- **Modules — mostly not port targets.** 948 indexed monolith modules → 268 ported / 419 ambiguous / 256 unported / 5 unclassifiable (name-match, advisory). **`unported` ≠ "needs porting"** — the count is dominated by deprecated/config/test/route modules. Lane routing: 815 code-lane, 133 data-lane (data-lane → Lane A/B2 tribal-knowledge).
- **Coursework (U-KC-A2) — confirmed UNWIRED.** The 65 content-mining candidates have **zero `.ts` consumers** under `mcp-server/src`. Lane A target **confirmed present**: `TribalKnowledgeEngine.ingest()` accepts `KnowledgeTip[]`; `DOC_KNOWLEDGE_DIR` is the auto-load path.

**Net effect on remaining phases:** Phase 1 (Lane A tribal-knowledge wiring) is the main remaining build. Phase 2 Lane B = `U-KC-C2` confirm-only + `U-KC-C1` formula verification (12 files). Phase 3/4 unchanged. Re-run the audit any time: `node scripts/audit-monolith-port-state.mjs`.
