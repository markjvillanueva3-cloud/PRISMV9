# GOLF (fleet-hygiene) Context Inventory — 2026-06-11

> **Reconciliation (R8/R7):** this is the **handoff-mine + Ollama-miner appendix** to the canonical brain entry [[reference_golf_inventory_of_record_2026_06_11]] (built earlier today by Workflow `wf_2c7ce362`, 4 miners over git+memories+dormant-audit+AI-posture). That memory is more precise on dormant-asset names (`stop-mcp-server-heal.mjs`, `agent-tier-route.mjs`, `hermes-orchestration-advisory-inject.mjs`) + the 6 india/zulu AI-systems improvements + the decoded articles (Loop Engineering, Pawel Huryn, Opik, IBuzovskyi). This doc corroborates it from an independent angle (46 handoffs) and adds **two net-new facts**: (1) the reaper is **currently DISABLED**, (2) the Ollama galaxy-miner is **now operational** (prior exit-255 resolved). Read the memory first; this for handoff-level evidence.

> **Provenance (R12 — how this was built, do not overstate):**
> - **Workflow** `golf-context-inventory` (`wf_cc1f3500-64f`): 6 sonnet agents fanned out over the **46** `HANDOFF-golf-*.md` session handoffs, 600K subagent tokens, 129s. Each extracted {todo / unfinished / dormant-unwired / articles} with handoff-filename evidence.
> - **Ollama miner** `mine-galaxy-transcripts.mjs --galaxy fleet-hygiene` (qwen2.5-coder:32b MAP → gpt-oss:120b SYNTH): 23 mineable sessions (258MB JSONL spine), refreshes `reference_fleet-hygiene_transcript_synthesis.md`.
> - **git cross-reference** (90-day window) to filter stale "Next:" claims against what actually shipped.
>
> **Status legend:** 🔴 unfinished/blocked · 🟠 dormant-built-not-wired · 🟢 confirmed-shipped (removed from pending) · ⬜ todo (not started)
> **Advisory** — file/commit presence ≠ correctness. Human-verify before flipping any milestone status.

---

## ⚠️ TOP-LINE (the two facts that govern golf right now)

1. **Golf's core duty is OFFLINE.** `PRISM_FLEET_REAPER_DISABLE=1` **and** `PRISM_GOLF_GUARDIAN_DISABLE=1` are both set in `C:/Users/wompu/.claude/settings.json` (operator, 2026-06-11). Root cause: `stale-node-hunter` `findStaleOrphanedNodes` (commit `01220f8a5f`) reaped **legit idle fleet `node.exe`** (RSS=0 / sub-5MB). The reaper must NOT be re-launched until the hunter is fixed. **This is golf's #1 highest-ROI item** — its entire reason for existing is currently disabled.
2. **The Ollama→Haiku→Sonnet→Opus tier router is already built but stranded.** `AGENT-TIER-MS0` (U-AT01+U-AT02 core `2f0010b10d`, U-AT03 hook `34bcb6bfd9`, 20 tests) is committed on **`slot/golf` only** — not merged to the integration branch, not wired to live agent dispatch. This is the exact "offload easier tasks onto sonnet/haiku/ollama" mechanism the operator keeps asking for. **Merge + wire = highest-leverage move.**

---

## A. TODO — tasks left to complete (ROI-ranked) ⬜

| ROI | Unit | What | Evidence |
|----|------|------|----------|
| 🔥 high | **L8-P0-MS2 / L8-P1-MS2 / L8-P2-MS2** | Current roadmap head — named "Next:" across nearly every recent golf handoff; **0 commits** under any L8 naming → genuinely unbuilt | `HANDOFF-golf-golf-golf.md`, +8 more |
| 🔥 high | **U-FD02** TaskAddEngine + `prism_session:task_add`/`task_propose` | Blocks U-FD03 (/queue-add) + U-FD04 (auto-task-detect hook); 0 commits; in eligible queue | `HANDOFF-golf-slot-recovery-ms0.md` |
| 🔥 high | **U-SR05** launcher rewrite `Launch-PRISM-Fleet.ps1 --resume` + **U-SR06** `/slot-resume` skill | Last 2 of 8 SLOT-RECOVERY-MS0 units; MS closes when both land; 0 commits; in eligible queue | `HANDOFF-golf-slot-recovery-ms0.md` |
| 🔥 high | **U-BIBRYAM-1** per-subdir CLAUDE.md context cascade · **U-BIBRYAM-6** scoped-skill path-globs | From the bibryam article; #3 noise-filter already SHIPPED, these remain. Fleet-wide token win | `HANDOFF-golf-golf-token-context-f.md` |
| med | **U-BIBRYAM-4** LSP symbol-lookup hint | MEDIUM per the handoff's own sequencing | `HANDOFF-golf-golf-token-context-f.md` |
| med | **U-FD03 / U-FD04 / U-FD05** | /queue-add skill · auto-task-detect PostToolUse hook · generate-fleet-state-features system-viz roost (FD03/04 gated on FD02) | `HANDOFF-golf-slot-recovery-ms0.md` |
| med | **Blackwell model-routing tail** (U-BW-CATALOG-REALIGN presence-gate, hook-bridge DEFAULT_MODEL→qwen3-coder, qwen3-rerank.mjs, octopus dual-voice 14b→32b/96k) | gpt-oss:120b pull DONE (present in `/api/tags`); these catalog/router refinements remain | `HANDOFF-golf-blackwell-gpu-sync.md` |
| low | **U-VAULT04** skill↔wiki cross-trigger registry · **U-SKILL-MIRROR-RECONCILE** 64 C:/H: skill mirror deltas | Spec-light / audit exercise; in eligible queue | `HANDOFF-golf-slot-recovery-ms0.md` |
| low | tribal generation for low-coverage domains (logistics 5.3%, post-processor 9.6% — echo's, coordinate) | cross-galaxy assist | `HANDOFF-golf-galaxy-memory-recall.md` |

## B. UNFINISHED — started but never finished (blocked / mid-loop) 🔴

| Sev | Unit | Blocker |
|-----|------|---------|
| 🔥 P0 | **Reaper re-enable** | `stale-node-hunter findStaleOrphanedNodes` (`01220f8a5f`) reaps legit idle fleet node.exe. Needs **cmdline allowlist + higher age floor + deeper ancestry** before clearing the two `*_DISABLE=1` knobs. Golf's core duty is off until fixed. |
| 🔥 P0 | **U-MCP-FACTORY-REFACTOR** | Live MCP disconnect leak (operator `/mcp` timed out @ iter10). SDK invariant: `McpServer.connect()` binds ONE transport/server → factory-per-session required. First attempt **reverted**. Read `specs/MCP-DISCONNECT-ROOT-CAUSE-2026-05-25.md` + `reference_mcp_sdk_single_transport_invariant_2026_05_25`. Dedicated chat. |
| 🔥 P0 | **U-RAG-1** index key-unify + locking | `tribal-embed-index.json` (369MB, 24286 entries) written by 5+ scripts under 3 incompatible id schemes (`wiki:`/`external:`/`memory:`); unlocked RMW clobbered the 13K-embed backfill. **Operator design decision required** (canonical `wiki:<rel-path>` + per-writer lock). Blocks U-RAG-3 + GNN feed. |
| high | **GIT-INFRA push corruption** | Push to origin blocked by missing/corrupt tree `e36809bbd2` (local-only; pack-corruption or probe-gap). Needs a **real terminal** full `git fsck` (bg-agent env kills fsck @~280s). cad-fusion-live-ms0 is 3477 ahead of origin. |
| med | mid-run /loop sessions never finished | PSN-HIGH-ROI-AUDIT-MS0 (iter 0/5 — bge-reranker + 7b→14b prewarm + Ollama batch); SYSTEM-AWARENESS-FRESHNESS-MS0 (iter 1/8); WIRE-UNWIRED-MS0 (iter 1/8); JULIETT-12CHAT T6-T10 deferred & never resumed |

## C. DORMANT / built-but-never-wired 🟠

| Unit | State |
|------|-------|
| 🔥 **AGENT-TIER-MS0 (U-AT01-03)** | Ollama→Haiku→Sonnet→Opus hybrid tier router + PreToolUse:Agent advisory hook, 20 tests. **On `slot/golf` ONLY** (`git branch --contains 34bcb6bfd9` = slot/golf). Not merged to integration branch, not wired to live agent dispatch. **= the offload mechanism this work order wants.** |
| **golf AI-reasoning wiring** | 6 documented AI-systems improvements; golf galaxy has **ZERO domain AI-reasoning wiring** (reasons only via generic `galaxy-reasoning-bridge.mjs`). |
| **MCP boot-grace flap-prevention** | Built but dormant; needs activation + wiring into the reconnect hook spawn path (`reference_mcp_bootgrace_dormant_wiring_2026_06_04`). |
| **U-RAG-4 `edge-order.mjs`** | Wired into `master-index-precheck-inject` only; 3 more inject hooks (memory-relevance, wiki-precheck, tribal-by-domain) unwired. |
| **U-FD06 `ghost.slot_queue` roost** | Shipped to slot-golf worktree (10/10 tests), pending merge to shared tree. |
| `golf-slot-write-allowlist.mjs` | Preserved-on-disk, unwired from PreToolUse — **intentional** (2026-05-20 doctrine shift, `feedback_never_delete_only_disable`). Not debt. |
| `StockPositionsLoader` | Standalone, not bridge-wired — **intentional** (geometric reference, not a quote catalog). Not debt. |

## D. ARTICLES the operator fed 📰

| Article | Status |
|---------|--------|
| **bibryam X post (2026-05-26)** "How to Adapt Claude Code to Large Codebases" (13 patterns) | Pattern **#3 Noise-Filter SHIPPED** (`U-BIBRYAM-3-NOISE-FILTER` + DENY-SYNTAX-FALLBACK + NOISE-PATHS-CATALOG). Remaining: **#1 Context-Cascade, #4 LSP-hint, #6 Scoped-Skill**; #2/#5/#7-13 un-triaged. Full per-pattern gap analysis in `HANDOFF-golf-golf-token-context-f.md`. |

_Note: article ingestion is mostly a fleet-wide concern routed to zulu's agentic-corpus (`MASTER-GALAXY-ARTICLE-INGEST/U-ZULU-AGENTIC-CORPUS`) + india. Golf-slot-specific article exposure is just the bibryam piece above._

## E. STALE-CLAIM CORRECTIONS — handoffs said pending, but actually SHIPPED 🟢

These were named "Next:" across many golf handoffs but git shows them shipped — **do NOT re-queue them:**

- 🟢 **INFRA-CONSENSUS-WIRE-MS0** — 8 commits in 90d.
- 🟢 **INFRA-AGI-ROUTER-MS2** — 13 commits in 90d.
- 🟢 **U-BIBRYAM-3 (Noise Filter)** — shipped (3 sub-units).
- 🟢 **gpt-oss:120b pull** — model present in live `/api/tags` (also gpt-oss:20b, qwen2.5-coder:32b, qwen3-coder:30b, deepseek-r1:32b).

---

## 🎯 ROI-RANKED MASTER TASK QUEUE (the actionable output)

> Highest leverage first. "Leverage" = unblocks-other-work × fixes-live-degradation × matches-operator-intent.

1. **Fix `stale-node-hunter` + re-enable the reaper** (P0, golf-core duty offline). cmdline-allowlist + age-floor + ancestry-depth, then clear the two `*_DISABLE=1` knobs. *(unblocks all fleet hygiene)*
2. **Merge + wire AGENT-TIER-MS0 to live** (built, stranded on slot/golf; IS the operator's requested offload router). *(directly serves this work order's "offload to sonnet/haiku/ollama")*
3. **U-MCP-FACTORY-REFACTOR** (P0, live MCP leak). Dedicated chat per the spec.
4. **U-RAG-1 index key-unify + locking** — surface the operator design decision (blocks RAG-3 + GNN feed; 369MB index integrity at risk).
5. **GIT-INFRA push** — real-terminal fsck of tree `e36809bbd2` (3477 commits unpushed).
6. **L8-P0/P1/P2-MS2** — current roadmap head.
7. **U-FD02 → U-FD03/04/05** (FLEET-DASHBOARD; FD02 unblocks 3 units) + **U-SR05/U-SR06** (close SLOT-RECOVERY-MS0).
8. **U-BIBRYAM-1 / #6 / #4** (fleet-wide token win) + **U-RAG-4** edge-order to 3 more inject hooks.
9. Blackwell model-routing tail + low-coverage tribal generation + U-VAULT04 + skill-mirror reconcile.

---

_Generated by slot:golf (claude-cc814d81) via ultracode Workflow + Ollama miner + git cross-reference. Loop: GOLF-CONTEXT-INVENTORY. Wired into: galaxy MEMORY.md, CLAUDE.md, soul, AWARENESS, wiki, Obsidian vault (auto Stop-feed), Hermes/Zulu (reasoning-bridge + agent-chat)._
