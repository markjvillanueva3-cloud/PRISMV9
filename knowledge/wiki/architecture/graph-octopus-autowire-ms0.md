---
title: GRAPH-OCTOPUS-AUTOWIRE-MS0
kind: architecture
status: shipped
owner: echo/claude-0c203c88
created_at: 2026-05-22
shipped_at: 2026-05-23
related_units: [U-GO-B1, U-GO-B2, U-GO-B3, U-GO-B4, U-GO-B5, U-GO-A1, U-GO-A2, U-GO-A3, U-GO-A4, U-GO-A5, U-GO-A6, U-GO-C1, U-GO-C2, U-GO-C3, U-GO-C4, U-GO-C5, U-GO-C6]
related_memories: [reference-graph-octopus-autowire-ms0-2026-05-22, reference-session-continuity-stack-2026-05-15]
---

# GRAPH-OCTOPUS-AUTOWIRE-MS0 — graph-aware tool hooks + master-index autoupdate + octopus auto-invoke repair

Three connected under-utilization gaps in PRISM's own AI/awareness substrate, all closed in one 17-unit milestone shipped 2026-05-22 (slot echo).

## The three original gaps

1. **Graph-aware tools were Read-only.** `pre-read-graph-inject.mjs` consulted the 258K-node master graph before a Read; Grep / Write / Bash didn't. Key derivation was a crude basename regex unique to that one hook.
2. **The master-graph autoupdate was silently failing.** `system-graph.json` (now 452 MB) routinely ran 9.5h stale because the `.git/hooks/post-commit` regen spawn discarded its exit code (`>/dev/null 2>&1`). The graph exceeded `master-index-search-lib.mjs`'s 200 MB load cap, so search depended entirely on the 109 MB sidecar; a stale sidecar degraded fleet search to a 20K-node fallback.
3. **Octopus consensus was built but never used.** 5 client engines (anthropic / codex / ollama / xai / google), `MultiModelConsensusEngine`, 4 hooks, a queue, a drainer — all on disk. `consensus-model-performance.json` was frozen at "2026-05-05 n=1 ema=0". User's words: *"we need octopus auto invoked when we need it. I don't think we've ever used it."*

## Architecture

### Track B — graph freshness pipeline

```
.git/hooks/post-commit
  └─→ scripts/system-viz-on-commit.mjs (detached spawn — STILL exit-code-discarded)
        ├─→ TTL-backstop shared write-lock (B2)
        ├─→ refresh chain (regen-viz)
        ├─→ rebuildMasterIndexSidecar(node, runFn)  ← B3: dependency-injected
        ├─→ .last-successful-regen.json sentinel (B2)
        └─→ .last-regen-failure.json marker (B4) ← captures stage/exit/signal/stderr

Stop hook: stop-graph-staleness-backstop.mjs (B4)
  └─→ if graph age > 3h AND throttle marker > 30min ago
        → detached-spawn the regen above

SessionStart hook: sessionstart-graph-staleness-inject.mjs (B5)
  └─→ 4-branch advisory: failure > graph-missing > graph-stale > sidecar-stale
        priority — surfaces one concise line, otherwise SILENT.
```

### Track A — graph-aware tool hooks

```
scripts/lib/graph-key-derive.mjs (A1, pure, 27 tests)
  └─→ deriveGraphKeys({input, tool: "read"|"grep"|"write"|"bash"})
        ├─→ read/write → basename stem, dash/underscore-split → tokenize
        ├─→ grep       → tokenize(pattern)                  ← strips ALL regex metachars
        └─→ bash       → narrow file-search verb gate       ← grep/rg/find/cat/head/tail/ls

Four PreToolUse hooks, all sharing the lib:
  pre-read-graph-inject.mjs   (A5 refactor, 11 tests; previously bespoke)
  pre-grep-graph-inject.mjs   (A2, 10 tests; ≥2-token floor naturally gates noise)
  pre-write-graph-inject.mjs  (A3, 10 tests; advisory dup-detect nudge, never blocks)
  pre-bash-graph-inject.mjs   (A4, 11 tests; narrow — quiet on 95% of bash)

All four wired in C:/Users/wompu/.claude/settings.json PreToolUse chain (A6).
Each injects {hookSpecificOutput.additionalContext} with top-K master-index hits.
```

### Track C — octopus consensus repair

```
Multi-vendor voices                MultiModelConsensusEngine.ask()
  anthropic claude code           ├─→ PRISMContextInjectorEngine.buildContext()
  codex CLI                       │    (C6: lazy-imports the master-index search lib,
  ollama local                    │     runs BM25, composes context blob ≤ modelBudget)
  xai grok CLI                    ├─→ ConsensusModelPerformanceEngine
  google gemini CLI               │    .loadState() + .recommendVendors()
                                  │    (C6: 3-branch keep-set ladder with hard floor)
                                  ├─→ Fan-out to N voices
                                  ├─→ ConsensusFactCheckerEngine
                                  └─→ ConsensusObsidianPersistenceEngine
                                       writes wiki/consensus/<sha8>.md

Triggers:
  Async (existed): auto-consensus-userprompt.mjs + auto-consensus-critical-edit.mjs
                   → enqueue to state/shared/consensus-queue.jsonl
                   → drained by stop-consensus-drain.mjs at Stop (~1 per chat-stop)
                   (C1 verified: dist build now exists, drain works end-to-end)

  Sync (new, C2+C3+C4): auto-consensus-sync-bash.mjs
                   PreToolUse:Bash, gated by 5-class irreversibility classifier:
                     git-force-push / git-hard-reset / git-branch-force-delete /
                     rm-recursive-force / git-clean-force
                   Default: match → ASK with class name (zero LLM cost)
                   Opt-in PRISM_AUTO_CONSENSUS_SYNC_BASH=1:
                     match → spawn ask() with 10s Promise.race timeout
                     → rec="accept" → allow; else → ASK
                   Safety invariant: a matched destructive command can ONLY
                     reach allow via rec="accept". Hard-asserted by 26 tests.

Operator setup: scripts/octopus-setup.mjs (C5)
  Probes 5 voices, prints remediation checklist, exits 0 if ≥3 ready.
  Live on PRISM's dev host: 3/5 ready (anthropic + ollama + google).
```

## Key engineering decisions

### `recordOutcome` is functional, not stateful
The new `ConsensusModelPerformanceEngine.recordOutcome(state, vendor, taskType, reward, alpha)` returns a NEW state object — caller persists. This matches the rest of the engine's stateless contract and matches `loadState` semantics. The persistence layer (whichever caller chooses) is not in this milestone's scope.

### Sync-bash hook is OPT-IN by default
The cost of running 5-LLM consensus on every `rm -rf` is real (~10 s + cross-vendor API tokens). The hook defaults to PATTERN-BASED ASK (zero cost, predictable latency). Operators opt in via `PRISM_AUTO_CONSENSUS_SYNC_BASH=1` when they want the cross-vendor sanity check + audit trail.

### Safety invariant trumps every knob
The 1st-pass scrutiny FAILED both arms on a safety-invariant breach: the disable knob (`PRISM_AUTO_CONSENSUS_SYNC_DISABLE=1`) short-circuited the hook BEFORE classification, producing a silent allow on matched destructive commands. The fix: classify FIRST. The disable knob now only suppresses the LLM call; the ASK still fires on every match. Hard-asserted by the test `SAFETY INVARIANT — disable knob + MATCHED destructive command STILL asks`.

### Pre-write hook is advisory, not authoritative
Duplicate detection has a HARD block (`.claude/hooks/duplication-hard-block.mjs`). The pre-write graph-inject is a SOFT nudge — it surfaces "the graph already knows these N similar nodes for this name" so a chat about to Write `CuttingForceEngine.ts` sees the existing CuttingForce* nodes BEFORE writing. Never blocks.

## Failure modes and fail-open coverage

Every new hook is fail-open on every error path: missing input, stdin parse fail, lib import fail, derive fail, search fail, render fail, hooks-system fail. The only path that NEVER allows silently is a matched destructive bash command — and even that fails-SAFE to ASK on classifier throw, engine missing, timeout, or consensus throw.

## Sibling work + lineage

- **NN-GRAPH** (`reference-nn-graph-ms0-2026-05-16`) is the 5th-tier neural-net wiring inference that runs ON TOP of this master-index substrate. NN-GRAPH-MS2/U1 explicitly seeds its reference pool from the same `system-graph.json` this milestone keeps fresh.
- **SESSION-CONTINUITY-STACK** (`reference-session-continuity-stack-2026-05-15`) is the precedent of "audit your own infrastructure" milestones.
- **HOOK-SYNERGY-MS0** (CLAUDE.md §HOOK-SYNERGY-MS0) shipped the cross-worktree firewall + hook registry that the new graph-inject hooks register into via the auto-regen of `HOOK_REGISTRY.json`.

## What's not done (future work, surfaced explicitly)

1. **Octopus quality measurement**. The new `ConsensusModelPerformanceEngine.recordOutcome` is implemented but nothing currently calls it. A future unit could wire MultiModelConsensusEngine to record reward signals (operator override = low reward, accept = high) so the EMA-weighted vendor selection accumulates real data. The cold-start path (keep all vendors) is exercised every consensus run today.
2. **Recall gaps in `classifyDestructiveBash`**. Documented under-trigger: `git checkout --` discard, `git restore .`, `git rebase --onto` history rewrite, `git tag -d`, `git remote remove`, `git push origin :branch`, `truncate -s 0`, `shred`. Precision-first set; recall expansion is a follow-up.
3. **Backlog drain**. The 50-entry `consensus-queue.jsonl` backlog drains naturally via the Stop hook × ~11 fleet chats. A `--max=N` operator manual drain is available; full backlog drain is ~25-50 minutes of cross-vendor API calls and not done synchronously in this milestone.
