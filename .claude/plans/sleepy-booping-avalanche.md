# GRAPH-OCTOPUS-AUTOWIRE-MS0 — Plan

## Context

Across this session the user surfaced three connected **under-utilization gaps in PRISM's own AI / awareness infrastructure** and directed: *"do everything in logical ROI order — all gaps filled, all tasks completed and wired"* via an autonomous `/loop`.

1. **Tool calls don't use the master graph.** Only the `Read` tool consults the system-viz master graph (`pre-read-graph-inject.mjs`). `Grep`, `Write`, `Bash` don't — and the existing key derivation is a crude basename, not "high-ROI graph keys."
2. **The master graph is stale and its autoupdate is silently failing.** `system-graph.json` is 412 MB, mtime `2026-05-21 11:32` — **9.5 h stale** vs HEAD. Autoupdate *is* wired (`.git/hooks/post-commit` → `system-viz-on-commit.mjs`, background spawn, **exit code ignored**) but is failing without surfacing. The 412 MB graph exceeds `master-index-search-lib`'s 200 MB load cap, so search depends entirely on the 109 MB sidecar `system-graph-index.json` — when that goes stale, search silently degrades to the 27 MB / 20 K-node `architecture-graph.json` fallback.
3. **Octopus (5-LLM consensus) is built but never used.** `consensus-model-performance.json` is frozen at `2026-05-05, n=1, ema=0`. A 72-entry `consensus-queue.jsonl` is not draining. Only 2/5 voices are live (Claude+Ollama). It exists as engines + hooks but produces nothing — the user: *"we need octopus auto-invoked when we need it. I don't think we've ever used it."*

**Outcome:** all three gaps filled, every new asset built **and wired** (hooks → settings.json, engines → dispatchers), in logical ROI order. Two CLIs were already updated this session (Claude Code 2.1.148, Codex 0.133.0); the xAI Grok CLI is already integrated into octopus (`GrokCLIClientEngine`) — it only needs credentials.

Milestone id: **GRAPH-OCTOPUS-AUTOWIRE-MS0**. Unit prefix: `U-GO-*`. Slot: **echo**.

---

## Track B — Master-index graph freshness + autoupdate  *(FOUNDATION — leads; Track A depends on it)*

ROI: a graph-injection hook reading a stale/degraded graph injects *wrong* context — worse than nothing. master-index search is degraded fleet-wide right now. Highest leverage; unblocks Track A.

| Unit | Work |
|------|------|
| **U-GO-B1** | Root-cause the failing post-commit regen. Run `node scripts/system-viz-on-commit.mjs` manually, capture errors; inspect `.newly-built-fold-debt.json` (stuck fold?). |
| **U-GO-B2** | Make post-commit regen reliable + observable. The background spawn with ignored exit (`.git/hooks/post-commit` line 13) is an R12 fail-loud violation. Add a `last-successful-regen` sentinel + completion marker; log failures instead of swallowing them. |
| **U-GO-B3** | Guarantee the sidecar `system-graph-index.json` is rebuilt whenever the graph regenerates — it is the load-bearing fast-path (412 MB graph > 200 MB cap). Wire sidecar rebuild into `regen-viz.mjs` / `system-viz-on-commit.mjs` if not already chained. |
| **U-GO-B4** | Autoupdate backstop — a scheduled task (existing `install-*-task.ps1` pattern) **or** a SessionStart/Stop staleness trigger that regenerates when graph age > N h. Post-commit alone is best-effort. |
| **U-GO-B5** | Staleness visibility — SessionStart inject (or extend existing awareness inject) warning when graph/sidecar is stale, so degradation is never silent. `master-index-search-lib` already mtime-caches → a fresh graph is auto-picked-up. |

**Reuse:** `scripts/regen-viz.mjs`, `scripts/merge-augmentations.mjs`, `scripts/system-viz-on-commit.mjs`, `scripts/lib/regen-viz-merge-guard.mjs`, `scripts/lib/master-index-search-lib.mjs` (mtime cache lines ~69–75, sidecar fast-path ~155–208).

---

## Track C — Octopus auto-invoke repair  *(HIGH ROI — user's flagged priority)*

ROI: octopus is fully built (5 client engines, `MultiModelConsensusEngine`, 4 hooks) but dead — repair cost, not build cost, to unlock cross-vendor review.

| Unit | Work |
|------|------|
| **U-GO-C1** | Fix the drain. Audit `.claude/scripts/consensus-queue-drain.mjs` + `.claude/hooks/stop-consensus-drain.mjs`. `dist/engines/*.js` now exists (was the prior blocker). Real E2E: enqueue → drain → result persisted; clear the 72-entry backlog. |
| **U-GO-C2** | Synchronous auto-invoke "when we need it." Current model is async (enqueue → drain on Stop → recall *next* session). Build/extend `auto-consensus-critical-edit.mjs` into a real decision-point trigger: safety-critical output (G-code, feed/speed), irreversible/architectural decisions, scrutiny gates, ambiguous routing. |
| **U-GO-C3** | Surface the result **in-context** — consensus result injects back as `additionalContext` so it influences the live decision, not the next session. |
| **U-GO-C4** | Smart gating — replace the blanket `auto-consensus-userprompt.mjs` every-prompt enqueue with a stakes classifier ("would 5 models meaningfully disagree / is this irreversible or safety-relevant?"). |
| **U-GO-C5** | Config enablement — setup script + doc for the credential part (`codex login`, `XAI_API_KEY`, `GEMINI_API_KEY`). User supplies credentials; script verifies via `octopus-provider-probe.mjs`. Octopus degrades gracefully but 5 independent voices is the design point. |
| **U-GO-C6** | Fix the 2 stub engines `PRISMContextInjectorEngine` + `ConsensusModelPerformanceEngine` (3 tsc errors in `MultiModelConsensusEngine.ts`; context-injection + perf-weighting silently dead). Implement or formally `// WIRE-EXEMPT`. |

**Reuse:** `mcp-server/src/engines/MultiModelConsensusEngine.ts`, `Grok*ClientEngine`, `CodexClientEngine`, `OllamaClientEngine`, `GeminiClientEngine`; dispatcher `prism_ai:consensus_decide` / `consensus_audit_query` / `consensus_escalate`; hooks `auto-consensus-*.mjs`, `octopus-provider-probe.mjs`.

---

## Track A — Graph-aware tool hooks  *(depends on Track B — graph must be fresh first)*

ROI: extends the proven Read pattern to 3 more tools + adds high-ROI key derivation. Lower ROI than B/C (additive convenience) and only correct once B makes the graph fresh.

| Unit | Work |
|------|------|
| **U-GO-A1** | Shared lib `scripts/lib/graph-key-derive.mjs` — per-tool key strategies: read/write = basename stem; grep = strip regex metachars → 3+ char meaningful tokens; bash = parse command, **only file-search commands** (`grep/find/rg/cat/ls/head/tail`) → extract term/path. Generic-term stoplist (the "high-ROI" filter: drop `function`, `const`, `error`, `data`, …). Reuse `master-index-search-lib`'s `STOPWORDS` + `tokenize`. |
| **U-GO-A2** | `pre-grep-graph-inject.mjs` — PreToolUse:Grep — "the graph already knows these nodes for your pattern." |
| **U-GO-A3** | `pre-write-graph-inject.mjs` — PreToolUse:Write — "graph has N related/duplicate nodes for this name" (advisory, never blocks). |
| **U-GO-A4** | `pre-bash-graph-inject.mjs` — PreToolUse:Bash — narrow: fires only on file-search commands. |
| **U-GO-A5** | Refactor `pre-read-graph-inject.mjs` (currently a sub-hook in `bundles/read-bundle.mjs`) to use the shared lib — single source of truth for key derivation. |
| **U-GO-A6** | Wire the 3 new hooks: Grep matcher (alongside `search-optimizer`/`grep-index-first`/`viz-first-redirect`), Bash → `bundles/bash-bundle.mjs`, Write → `bundles/edit-bundle.mjs`. Edit `H:/.claude/settings.json` (mirrored to C:). |

**Reuse:** `pre-read-graph-inject.mjs` (deriveQueryKey/renderInject, ~150 LOC pattern), `pre-read-graph-inject.test.mjs` (node:test pattern), `runMasterIndexSearch(query,{topK})` → `{tokens, hits[]}` where hit = `{id,score,layer,label,status,wiki,memory}`.

---

## Process units

| Unit | Work |
|------|------|
| **U-GO-D1** | Check into the **echo** slot (`/checkin-echo`), bind topic `graph-octopus-autowire-ms0`. |
| **U-GO-D2** | Register GRAPH-OCTOPUS-AUTOWIRE-MS0 + all `U-GO-*` units in the task queue — milestone envelope + `mcp-server/data/atomic-roadmap.json` / `roadmap-index.json`. |
| **U-GO-D3** | Doc reflection (4 surfaces): CLAUDE.md pointer + `MEMORY.md` + wiki entry + close-out audit (`/close-out-audit` — required by the `/goal` Stop gate). |

---

## Logical ROI execution order

1. **D1 + D2** — check into echo, register the milestone queue (formalize first).
2. **Track B** (B1→B5) — foundation; fixes fleet-wide search degradation, unblocks A.
3. **Track C** (C1→C6) — octopus repair; user's priority, repair-cost not build-cost.
4. **Track A** (A1→A6) — graph hooks; now correct because B made the graph fresh.
5. **D3** — doc reflection + close-out audit.

Autonomous `/loop` execution. Per-file scrutiny gate (2 reviewers/file). 3-of-3 Stop gate. `/goal` is gated by a fresh close-out audit (Stop hook) — D3 satisfies it. Every hook wired into settings.json; every engine round-trip-tested through its dispatcher. Real reference-value tests — no `toBeDefined()` stubs.

---

## Critical files

- **Track B:** `scripts/regen-viz.mjs`, `scripts/system-viz-on-commit.mjs`, `scripts/merge-augmentations.mjs`, `.git/hooks/post-commit`, `scripts/lib/master-index-search-lib.mjs`, `state/shared/system-viz/{system-graph.json, system-graph-index.json, architecture-graph.json}`.
- **Track C:** `.claude/scripts/consensus-queue-drain.mjs`, `.claude/hooks/{stop-consensus-drain,auto-consensus-userprompt,auto-consensus-critical-edit,octopus-provider-probe}.mjs`, `mcp-server/src/engines/{MultiModelConsensusEngine,PRISMContextInjectorEngine,ConsensusModelPerformanceEngine}.ts`, `state/shared/consensus-queue.jsonl`.
- **Track A:** NEW `scripts/lib/graph-key-derive.mjs`, NEW `.claude/hooks/pre-{grep,write,bash}-graph-inject.mjs` (+ `.test.mjs` each), `.claude/hooks/pre-read-graph-inject.mjs`, `.claude/hooks/bundles/{read,bash,edit}-bundle.mjs`, `H:/.claude/settings.json`.
- **Process:** `mcp-server/data/atomic-roadmap.json` / `roadmap-index.json`, milestone envelope dir, `CLAUDE.md`, `MEMORY.md`, `knowledge/wiki/architecture/`.

## Verification

- **Track B:** `node scripts/regen-viz.mjs` exits 0 + graph mtime advances; sidecar rebuilt same run; `runMasterIndexSearch('mill strategy optimize')` returns full-graph hits (layer diversity L3+, not architecture-graph fallback); staleness inject fires when graph is artificially aged.
- **Track C:** `prism_ai consensus_decide {prompt, voices}` returns a multi-voice result; `consensus-model-performance.json` shows `n>1`; drain empties `consensus-queue.jsonl`; `octopus-provider-probe.mjs` banner shows configured voices; critical-edit trigger fires consensus + injects result in-context (E2E).
- **Track A:** pipe JSON stdin to each new hook → assert `hookSpecificOutput.additionalContext` block (or `{continue:true}` on miss); `graph-key-derive` unit tests cover grep regex-metachar stripping, bash command parsing, generic-term filtering, edge cases (empty/NaN/oversize); round-trip against a real fresh graph.
- **Build gate:** `cd mcp-server && npm run build` clean; `npx vitest run` for all new/affected tests green.
