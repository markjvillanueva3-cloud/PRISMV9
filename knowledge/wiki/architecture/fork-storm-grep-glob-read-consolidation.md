---
title: FORK-STORM-CONSOLIDATION — Grep/Glob/Read bundle legs + mcp cold-start lazy tip-load
type: architecture
status: shipped
slot: tango
created: 2026-06-14
commits: [61e0a47b05, 9b20d92efc, db6fc46a32]
tags: [fork-storm, hooks, bundle, pretooluse, cold-start, tribal-knowledge, performance]
---

# FORK-STORM-CONSOLIDATION — Grep/Glob/Read legs + mcp cold-start

Two efficiency tasks (slot tango, 2026-06-14) draining the fleet fork-storm
(460-695 live `bash.exe` vs the 400 breaker ceiling — the recurring "api server
error" condition) and the mcp-server cold-start cost.

## #9 — U-TK-LAZY: defer TribalKnowledgeEngine tip-load off boot (`61e0a47b05`)

The module-level singleton ran the full tip load at construction (disk read +
categorize ~12k tips + build a 12k-entry dedup hash set), firing on every cold
start the instant any module imported it. Fix: `capturedTips` + `tips` became lazy
getters; `ensureHashes()` builds the dedup set on first dedup check; the
constructor is empty. The rebuild-on-capture sites keep working via a `tips`
setter. Proven behaviorally (`TribalKnowledgeEngine.lazy.test.ts`, 5/5): the
"constructs" test logs zero tip-load; the load fires only on first `stats()`/
`search()`, the hash build only on first `capture()`. Type-clean in its file.

**Caveat (R12):** the full mcp-server `tsc` build has a PRE-EXISTING ~18-error
backlog in other domains' dispatchers + 2 engine callers using wrong method names
(`LatheLoRA.query`, `ReasoningChainSharing.captureKnowledge` — the engine exposes
`search`/`queryTribalNaturalLanguage` and `capture`/`captureFromLLMReasoning`).
NOT introduced by this change; the runtime serves from esbuild (`build:fast`).

## #10 — PreToolUse spawn reduction

Per-tool hooks each spawn a separate portable-node `bash.exe` — a direct
fork-storm contributor. Slot india was already consolidating **bash-bundle**
today (CHANGE-3, duplicate `pre-bash-graph-inject`, done; their live claim).
Tango took the unclaimed legs (announced on the chat bus):

- **`grep-glob-bundle.mjs`** (`9b20d92efc`) — Grep/Glob had NO bundle; folds the
  three advisory matcher blocks (`Glob|Grep`, `Grep`, `Glob`) into ONE
  `tool_name`-dispatched bundle. Grep/Glob specific spawns **5 → 1** each.
- **read-bundle absorb** (`db6fc46a32`) — folded the 5 standalone `Read`
  advisories (`wiki-read-offload-advisory`, `large-read-digest-advisory`,
  `big-data-read-enforce`, `recall-first-advisory`, `grep-index-taken-correlator`)
  into `read-bundle.mjs`. Read-specific spawns **~7 → 1**.

Net: **~5/Read + 4/Grep + 4/Glob + 6/Bash** fewer spawns per tool call fleet-wide.

### Bundling a gate is safe

`big-data-read-enforce` CAN deny. `runBundle` (`hook-runner.mjs:183-231`) is a
CONCURRENT pool + deny-aggregator: any sub-hook returning `continue:false` /
`decision:deny` sets `blocked` → the bundle returns the deny (the same path the
already-bundled `file-read-cache` hard-deny uses). So a gate's block behavior is
preserved when bundled, and order doesn't matter for blocking.

### Wiring

Idempotent content-matched settings.json patchers (`scripts/wire-grep-glob-bundle-settings.mjs`,
`scripts/wire-read-advisories-into-bundle-settings.mjs`): remove a block ONLY if
its matcher + exact hook set match the known advisory set (protects hard-gate /
universal blocks); `--dry`/`--revert`; backups; writes both C:/ and H:/ (bash/node
writes don't trigger the c-to-h mirror); JSON-validated. Verified live (a real Grep
routed through the bundle returned correctly).

## Memory

[[reference_coldstart_forkstorm_2026_06_14]]
