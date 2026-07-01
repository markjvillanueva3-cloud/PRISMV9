---
title: PRISM Dev-Process Efficiency + Tool/Feature-Utilization Queue
date: 2026-06-11
slot: sierra
method: ultracode Workflow wf_87c89af2-845 (6 Sonnet dimension agents + 1 synthesis, 823K tokens, 15m)
status: advisory — each item is owner-slot's to VERIFY (R12) before building
supersedes_context: state/shared/specs/OBSIDIAN-VAULT-SYNERGY-QUEUE-2026-06-09.md (vault-wiring angle; this is the build-process-efficiency angle, additive)
---

# Efficiency + Tool/Feature-Utilization Queue (2026-06-11)

Operator /goal: *"improve system efficiency and system feature/tools utilization"* — audit how we build/search/read/summarize/plan/roadmap/audit, how/when we inject memories + tribal, how we create memories/wiki, how we learn from mistakes, ollama offloading, model switching, parallel agents. Ran a focused **ultracode** Workflow across 6 dimensions, cross-referenced against the 2026-06-09 vault-synergy queue (no dup), produced this prioritized, file-cited, **measurable-loss-function** queue.

> **R12 VERIFICATION NOTE (sierra, before you act on any item):** the synthesis is a Sonnet aggregation — verify the cited file:line/command holds before building. Sierra spot-checked the top sierra item (U-EFF-11) and found its premise WRONG (see below) — **assume every UNVERIFIED row needs the same check.** A measurable loss-function is given so "done" is deterministic, not prose.

## CURRENT EFFICIENCY STATE (the hard numbers)
- **Ollama offload 9.2%** (80 offloaded / 872 decided) vs ≥30% doctrine floor. Dominant cause: `ollama-route-pretooluse` fires **6,501×** but offloads **4** (0.06% take-rate — suggest-mode default, not auto).
- **Tribal embed index 0% built** (0/3,920 tips; OOM at 965MB; no state file) → every recall falls back to keyword BM25.
- **`resolveExecutor`** (the anti-Opus-leak invariant: Ollama→Sonnet→Opus) has **0 production call-sites** → mechanical work silently promotes to Opus when Ollama is down.
- **3-arm scrutiny incomplete on 43.8%** of sessions (177/404 ledger entries); **29 escape-hatch auto-passes** shipped 0-of-3-reviewed multi-file builds.
- **`grep-result-cache` 1216h stale** → Grep dedup blind, ~100% in-session re-execution.

## PRIORITIZED QUEUE (ROI = impact / effort)
| Rank | ID | Dim | Problem | Loss-function target | Owner | Effort | R12 status |
|---|---|---|---|---|---|---|---|
| 1 | U-EFF-01 | ollama | `ollama-route-pretooluse` fires 6501×, offloads 4 (suggest default) | offload 9.2%→≥30%; take-rate 0.06%→≥10% | golf | S | UNVERIFIED |
| 2 | U-EFF-02 | tribal | embed index 0% built, OOM at 965MB | coverage 0%→≥80% (≥3136/3920); `--stats` exit 0 | india | S | UNVERIFIED |
| 3 | U-EFF-03 | scrutiny | 29 escape-hatch auto-passes ship 0-of-3-reviewed builds silently | escaped 29→0 (logged+surfaced) | golf | S | UNVERIFIED |
| 4 | U-EFF-04 | model | `resolveExecutor` has 0 production call-sites | call-sites 0→≥1; `claudeModel` in every offload event | golf | S | UNVERIFIED |
| 5 | U-EFF-05 | pipeline | `unknown:38` keep-category → defaults to Claude | unknown keeps 38→0; offload +4.4pp | alpha | S | UNVERIFIED |
| 6 | U-EFF-06 | pipeline | `grep-result-cache` 1216h stale; Grep dedup blind | repeated-Grep miss 100%→0 in-session | golf | S | UNVERIFIED |
| 7 | U-EFF-07 | ollama | 4 dead model tags hollow the balanced tier | dead tags 4→0; balanced tier populated | golf | S | UNVERIFIED |
| 8 | U-EFF-08 | tribal | bug-finding wiki gate advisory-only; bugs ship w/o wiki | gate exit 1 on BUG_KEYWORDS commit w/o wiki | golf | S | UNVERIFIED |
| 9 | U-EFF-09 | injection | `whiskey-lathe-context-inject` static, 0 dedup, fleet-wide | re-emit 100%→1/session (~2,900 tok/lathe-loop) | golf | S | UNVERIFIED |
| 10 | U-EFF-10 | injection | `quality-dashboard-alert` double-wired (Stop+PreCompact) | Stop-cycle fire 2→1 | golf | S | UNVERIFIED |
| 11 | ~~U-EFF-11~~ | sierra | ~~nav-savings ledger never created (ENOENT)~~ | — | sierra | — | **VERIFIED-FALSE** |
| 12 | U-EFF-12 | injection | `memory-index-precheck-inject` 60s-throttle only, no content dedup | re-emit ~100%→≤20% (content TTL dedup) | alpha | S | UNVERIFIED |

### U-EFF-11 — VERIFIED FALSE (R12 correction, sierra)
The synthesis claimed the nav-savings ledger is `mcp-server/data/state/nav-savings-ledger.json` (ENOENT) → "writer-without-reader, injection waste unmeasurable." **Wrong path.** The lib's real `DEFAULT_LEDGER` is `state/shared/dashboards/nav-savings-ledger.jsonl` (`scripts/lib/nav-savings-ledger.mjs:27`) — it **EXISTS** (79 hits, `readNavSavings()` = {hits:79, savedTokens:23700}), is consumed by `stop-psn-savings-aggregate.mjs` (SOURCES["nav"]), and is surfaced in the SessionStart PSN headline (`nav(79h=23.7k)`). The writer + reader + consumer all work. **The ONLY real residual gap (downgraded to S, optional):** `readNavSavings()` has no on-demand MCP action — a `prism_session:nav_savings_report` would let any chat/Hermes query the efficiency ratio without waiting for the next SessionStart. Sierra ships that this session (U-EFF-NAV-REPORT).

## TOP ITEM PER OWNING SLOT (verify, then ship)
- **golf** — U-EFF-01: `PRISM_OLLAMA_ROUTE_AUTO=1` in settings.json env — the single highest-ROI lever (offload 9.2%→~48%, fail-open). Then sweep the S-effort golf cluster U-EFF-03/04/06/07/08/09/10 in one hook-hygiene pass.
- **india** — U-EFF-02: `node --max-old-space-size=8192 .claude/scripts/tribal-embed-index.mjs --bootstrap` → tribal index 0%→≥80% (3,920 tips); highest-leverage compounding-loop unblock.
- **alpha** — U-EFF-05: catch-all keep-classifier heuristic (explain/summarize/lint/classify + no safety/physics keyword → `code_explain` → Ollama) to resolve the 38 `unknown` keeps; +4.4pp offload.
- **sierra** — U-EFF-NAV-REPORT: `prism_session:nav_savings_report` (this session).

## R12 LIVE-STATE VERIFICATION ADDENDUM (sierra, 2026-06-11 — second pass)
The synthesis Sonnet agents did NOT read live config/stats, so **2 of 2 top items are stale.** Verified against the running system:

- **U-EFF-11 (sierra) — FALSE** (covered above): nav-savings ledger exists + is measured (79 hits in the PSN headline).
- **U-EFF-01 (golf) — ALREADY APPLIED + WRONG TARGET.** `mcp-server/data/state/ollama-route-config.json` already has `"mode":"auto"` (sierra flipped it 2026-05-22, GPU-OFFLOAD-MAXIMIZE-MS0/U2); `PRISM_OLLAMA_ROUTE_AUTO=1` is already set in BOTH settings.json files; model is the valid `qwen2.5-coder:32b`. **There is no knob to flip.** And `ollama-route-pretooluse` is **narrow-by-design** (gist-only state files ≥24KB) — it fired 6509× / offloaded 4 because it CORRECTLY passes source-file Reads (you can't summarize a file you're about to edit); its 4 hits saved 174K tokens. It is NOT in the 9.2% denominator and works as intended.
- **REAL BOTTLENECK (live `ollama-offload-stats.json byHook`):** the **9.2% is `ollama-task-offloader`** = 81 offloaded / 805 kept / 886 decided. The **keep-classifier keeping 805 of 886 (91%) on Claude is the lever.** → **alpha**, U-EFF-05 EXPANDED: not just the 38 `unknown` keeps but the broader explain/summarize/classify/lint keeps that default to Claude. Target: kept 805→≤500 (offload rate 9.2%→≥30%).
- **LESSON (compounding R12):** an audit recommendation is a *hypothesis* until checked against live config/state. Both top items survived synthesis but died on a 2-command live check. Every `UNVERIFIED` row above carries the same risk — the owning slot MUST verify its cited file:line/live-state before building. [[feedback_read_full_content_not_titles]]

## Method note
ultracode Workflow `wf_87c89af2-845` — 6 dimension agents (ollama-offload, model-switching, build-pipeline, injection-layer, memory-tribal-cadence, parallel-agents), each Sonnet (fallback-ladder: read/measure = cheap tier), plain-text (StructuredOutput-incompat per [[reference_alpha_explore_agent_schema_incompat]]), file-cited + measurable. Synthesis inherited. The synthesis agent's FINAL message was a verifier-defense, not the queue — the queue was recovered from its transcript (R12: recover the real artifact). Memory: [[reference_efficiency_utilization_audit_2026_06_11]].
