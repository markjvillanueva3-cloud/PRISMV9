---
name: brain-refresh-scheduled-2026-05-31
description: "Workflow audit of obsidian+PSN+system-viz full-power utilization peeled 3 layers of false gaps and found the ONE real one: brain-refresh.mjs (the 5-pipeline orchestrator) was UNWIRED -> dense-embeddings arm went 33h stale. golf re-embedded + registered a PRISM Brain Refresh scheduled task (every 45m). Closes alpha's #1-identified brain weakness."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.482Z
aliases: reference_brain_refresh_scheduled_2026_05_31
---


**Operator (2026-05-31): "use workflow to tap into the full power of obsidian + PSN + /system-viz" (ultracode).**

golf ran a 9-agent Workflow (`psn-obsidian-fullpower-audit`, run wf_7b880b61-0da): 7 parallel surface auditors -> synthesis -> adversarial code-analyzer critic. The value was the **adversarial verification** — it peeled THREE layers of false gaps before the real one surfaced:

1. **golf's own earlier finding "memory-embed-index.json MISSING -> no dense recall" was FALSE.** The asset exists as `state/shared/memory-embeddings-sidecar.json` (nomic-embed-text, 768-d int8, ~11k vecs) — I looked at the wrong filename.
2. **The critic's "biggest unlock = wire dense into the per-prompt hook" was ALSO FALSE.** The dense BM25+dense+RRF lib (`scripts/lib/memory-index-search-lib.mjs#runMemoryIndexSearch`, A6) is ALREADY wired into the prompt-driven hook `memory-index-precheck-inject.mjs` (line 77) AND into `brain_recall` (`memoryDispatcher.ts:1323`). The critic mistargeted `memory-relevance-inject.mjs` — which is a PreToolUse:**Edit** hook with **file-path** queries (dense is marginal there; it correctly uses lexical-rerank). alpha already built+wired the hybrid recall (A6) AND fixed its production no-fire bug (commit `0c0c7ace08`, stale-sidecar now degrades gracefully).
3. **The dense arm being "stale" wasn't a health-gate bug** (my hypothesis): brain-refresh's embeddings step correctly gates on `/api/embeddings` (UP), not `/api/chat` (down) — confirmed at `brain-refresh.mjs:84,269`.

**THE ONE REAL GAP (verified):** `scripts/brain-refresh.mjs` — the consolidated orchestrator for the brain's **5 refresh pipelines** (BM25 memory index, dense embeddings sidecar, tribal index, wiki->tribal embed, system-viz) — was **wired NOWHERE** (no scheduled task, not in settings.json). Its own header names the disease and alpha's sweep flagged it as the brain's **#1 weakness** ([[reference_alpha_brain_refresh_ms0_2026_05_30]]: "5 built+tested refresh stacks all depend on a HUMAN to run them, so each silently rots"). Result: the **dense-embeddings sidecar was 33h stale** -> memories added in the last 33h were BM25-reachable but **dense-invisible** ([[reference_alpha_embeddings_staleness_gate_2026_05_30]] built the gate that detects exactly this).

**golf's fix (2026-05-31):**
1. **Immediate relief:** `node scripts/build-memory-embeddings-sidecar.mjs --resume` -> embedded 79 stale memories (11035 -> **11114** vecs, fail=0, 2s). Dense arm now current.
2. **Durable fix:** registered scheduled task **`PRISM Brain Refresh`** (every 45m, non-elevated current-user, NextRun set). brain-refresh self-throttles (30m cooldown), O_EXCL lock-serializes (never two writers), and benign-defers (exit 3) when Ollama down — a perfect scheduled-task citizen. Installer artifact: `.claude/helpers/install-brain-refresh-task.ps1` (supports `-AsCurrentUser`/`-AsSystem` for logged-off robustness; needs elevation only for those). This is the same golf durable-task pattern as `PRISM MCP Server` + `PRISM Fleet Reaper`.

**Genuinely-untapped (survived scrutiny, NOT golf-domain — hand-off):** Obsidian **Bases** = 0 `.base` files (zero-state; alpha/obsidian-bases skill exists), Canvas = 1 file; route-suggest take-rate 0.9% + Ollama `/api/chat` offload 11% are firing-but-unactioned consumption gaps (alpha/operator); NN/GNN #10 ungraded (india, already-tracked).

**LESSON (durable):** for a "find underutilization" audit, the adversarial-verify arm is load-bearing — both the first analyst AND the operator's own earlier finding had confident false gaps (wrong filename, wrong hook). Always verify a claimed gap against the LIVE code path + real file before building; the truth here was "the asset exists and is wired, it just isn't kept fresh." Related: [[feedback_obsidian_brain]], [[reference_alpha_memory_index_nofire_2026_05_29]], [[reference_mcp_supervisor_persistence_fix_2026_05_31]] (sister durable-task fix this session).
