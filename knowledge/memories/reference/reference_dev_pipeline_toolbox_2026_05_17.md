---
name: reference-dev-pipeline-toolbox-2026-05-17
description: "Consolidated index of every PRISM dev tool — skills, scripts, hooks, pipelines, Ollama-when, zombie/orphan vigilance, /system-viz search-first. The \"reader\" that makes the writer-without-reader tooling discoverable."
aliases: reference_dev_pipeline_toolbox_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.552Z
---


# PRISM dev-pipeline toolbox (2026-05-17, lima)

The token-savings audit (`reference_audit_token_savings_2026_05_17`) found PRISM's
tooling is **writer-without-reader**: the tools exist, almost nobody consults them.
This entry is the reader-index. Counts are pointers (read the source, don't trust
numbers baked here — they rot).

## 1. SEARCH-FIRST — /system-viz before Grep/Glob/Agent

Live 10-layer graph at `state/shared/system-viz/system-graph.json` (~145K nodes).
**Always query it before filesystem scans** ([[feedback_system_viz_first_audit]]):
- `node scripts/system-viz-query.mjs find <kw>` — where is X / is X built/wired/orphan
- `node scripts/system-viz-query.mjs headline` — live engine/dispatcher/action counts
- `node scripts/system-viz-query.mjs coverage-by-domain` — unwired domains
- `/system-viz` skill opens the 3D viewer (:8765); `/master-index <q>` unified search
- `audit-viz-first.mjs` hook auto-runs `find` before Grep when intent=audit
Doctrine: Grep/Glob is the FALLBACK (confidence <0.5), not the default.

## 2. META measurement tools (re-runnable; the audit-compounding layer)

`scripts/*-rank.mjs` / `*-watch.mjs` — each exits 0/1/2/3 + appends history jsonl:
- `token-savings-rank.mjs` — Ollama/RTK/MEMORY/cache/hooks token-saving health (NEW 2026-05-17)
- `synergy-regression-watch.mjs` — week-over-week dev-pipeline synergy (21.1%, target 30%)
- `memory-size-watch.mjs` — MEMORY.md vs 24,576-byte truncation ceiling
- `hook-fire-rank.mjs` — which hooks actually fire (only ~10 of 523 do)
- `node-staleness-rank.mjs` — stale system-graph nodes
- `dev-tool-leverage-rank.mjs` · `stale-milestone-rank.mjs`
Run before building anything to know the live baseline.

## 3. Pipelines (slash) — the autonomous dev loop

- `/checkin-<nato> /loop <task>` — full-stack autonomous: slot-claim → worktree →
  inject-chain → pick-unit → build (per-file scrutiny) → 3-of-3 → commit → handoff,
  self-resumes across /compact. NATO slots alpha..mike (golf=hygiene).
- `/forge7` `/forge-audit-v2` — Boris-discipline build/audit (verification gate,
  peer-reviewer agent isolation:worktree, HTML+MD emit, /loop self-schedule,
  regressions→CLAUDE.md, META artifact mandatory).
- `/rgs6` — self-optimizing roadmap generation. `/pick-unit` `/pick-dev` pickers.
- `/dedup` BEFORE any new asset · `/forge-triple` engine+skill+hook together.
- `/scrutinize` `/peer-review` `/close-out-audit` quality gates.
Skill manifest: `state/shared/PRISM-COMMANDS-MANIFEST.md`. ~387 user + ~226 project skills.

## 4. Ollama-when (route OFF Claude)

Local qwen2.5-coder:7b for: code explain/summarize/docstring/classify/lint/
diff-summary/error-triage. NOT for: physics, safety-tier (Ω≥0.95) reasoning,
multi-step synthesis, routing/status logic (R5 — code answers those).
- `/ollama-*` skills · `OllamaHookBridgeEngine` · `aiSystemRouterEngine.route()`
- Health: `node scripts/ollama-docker-health.mjs`
- Audit found offload at 9.6% vs 30% target — under-utilized. When a task is
  mechanical text-transform, route it. See [[feedback_ollama_token_routing]],
  [[reference_audit_token_savings_2026_05_17]].

## 5. Zombie / orphan vigilance (CRITICAL — live OOM risk)

13 concurrent chats spawn node/bash/git children; crashed chats orphan them →
commit-mem pressure → surviving chats OOM-crash. Live evidence 2026-05-17:
golf advisory named /compact targets for 11h, one chat already OOM-crashed.
- **[[reference_fleet_reaper|Fleet Reaper]]** (`/fleet-reaper`, golf owns it per [[feedback_golf_owns_reaper]]):
  slot-aware orphan reaper, scheduled task every 5min, confirm-after-10min gate.
- **[[reference_fleet_memory_monitor_2026_05_16|Fleet Memory Monitor]]** ([[reference_fleet_memory_monitor_2026_05_16]]):
  5-min RAM monitor, names the largest claude.exe-tree as /compact target.
- Kill switch: `PRISM_FLEET_REAPER_DISABLE=1`. Generic: `node .claude/helpers/cleanup-orchestrator.mjs`.
- When golf posts a MEMORY ADVISORY naming a PID → that window should /compact or /clear.
- Prefer `/clear` over `/compact` for token headroom (CLEAR-NOT-COMPACT doctrine,
  [[reference_juliett_12chat_allocation_2026_05_17]]) — 11 bypass systems carry state.

## 6. Hook reality (audit finding)

523 hooks on disk, ~10 fire (bundle-children fire under bundle name → true
orphan ≤373). Noisy hooks waste sync-path latency. F5 fix shipped this session:
`error-pattern-promote.mjs` got a size+mtime memo guard skipping the full
ledger read+parse on the 99.83% no-op path (pure core in
`.claude/hooks/lib/error-pattern-memo-guard.mjs`, 9 tests). Pattern for any
high-fire low-yield hook: memoize the no-op path on an unchanged-input guard.

## 7. The doctrine this entry enforces

**writer-without-reader is PRISM's dominant token-savings failure mode.** Before
building a new measurement/cache/suggester, check it has a CONSUMER wired. A
tool nobody reads is dead weight that still costs startup + matcher overhead.
Cross-refs: [[reference_audit_token_savings_2026_05_17]] · [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]] · [[feedback_system_viz_first_audit]] · [[feedback_golf_owns_reaper]] · wiki `dev-pipeline-toolbox-2026-05-17`.
