---
title: Injection-dedup pattern — generalize the goal-prereq self-dedup
slug: injection-dedup-pattern-2026-05-23
type: code-tribal
date: 2026-05-23
slot: alpha
status: live
---

# Injection-dedup pattern

UserPromptSubmit hooks in PRISM emit ~14-16 `additionalContext` blocks per prompt. In any active /loop the same block content recurs across iterations (wiki precheck, slot soul, master-index pre-search, memory vault top-K, slash-command rules, discipline-expert injection). A single hook — `goal-prereq-inject` — already proves the pattern works in production: when its loop-context block is unchanged across prompts in the same session, it skips and emits `🔁 [goal-prereq-inject] loop-context dedup — block unchanged since prior prompt this session; not re-injected (token-save).` instead of the full block.

This entry generalizes that pattern.

## Lib — `scripts/lib/injection-dedup.mjs`

Pure-function (no FS I/O). Caller owns the sidecar.

| Export | Contract |
|---|---|
| `hashBlock(text)` | 16-char SHA-256 hex; trailing-whitespace normalized; 4 KB input cap; `null` on empty / non-string |
| `shouldEmit(cache, hookTag, hash, now, ttlMs=60_000)` | `{ emit, reason, lastSeenAt }`. Fresh / expired / missing-key → `emit:true`. Within-TTL match → `emit:false`. `ttlMs=0` disables. |
| `recordEmit(cache, hookTag, hash, now)` | Immutable: returns NEW cache |
| `formatDedupedMarker(hookTag)` | 1-line skip marker, matches fleet style |
| `pruneExpired(cache, now, ttlMs)` | GC stale entries; returns NEW cache |

Constants: `DEFAULT_TTL_MS=60000`, `MAX_HASH_INPUT_BYTES=4096`.

Tests: 17/17 via `node --test` (`scripts/__tests__/injection-dedup.test.mjs`). Covers identity, hookTag isolation, TTL boundaries, immutability, null-safety, prune.

## Adopters (live)

| Hook | Path | TTL | Block size | Status |
|---|---|---:|---:|---|
| slot-soul-inject | `.claude/hooks/slot-soul-inject.mjs` | 5 min | ~2 KB | live |
| prompt-rules-inject (slash path) | `.claude/hooks/prompt-rules-inject.mjs` | 10 min | ~500 B | live |

## Adopter pattern — `slot-soul-inject.mjs`

First real adoption. Slot soul is ~2 KB and identical across every prompt in a /loop iter (only changes if the soul `.md` file is edited). 5-minute TTL.

```js
import { hashBlock, shouldEmit, recordEmit, formatDedupedMarker, pruneExpired } from "../../scripts/lib/injection-dedup.mjs";
const DEDUP_SIDECAR = path.join(PRISM_ROOT, "state/shared/dashboards/injection-dedup-cache.json");
const DEDUP_TTL_MS = 5 * 60_000;

// ... later, after fullBlock is composed:
const hookTag = `slot-soul-inject:${sid.slice(0, 8)}`;
const contentHash = hashBlock(fullBlock);
let cache = readJson(DEDUP_SIDECAR) || {};
cache = pruneExpired(cache, Date.now(), DEDUP_TTL_MS);
const decision = shouldEmit(cache, hookTag, contentHash, Date.now(), DEDUP_TTL_MS);
const additionalContext = decision.emit ? fullBlock : formatDedupedMarker(hookTag);
if (decision.emit && contentHash) {
  try {
    fs.mkdirSync(path.dirname(DEDUP_SIDECAR), { recursive: true });
    fs.writeFileSync(DEDUP_SIDECAR, JSON.stringify(recordEmit(cache, hookTag, contentHash, Date.now())), "utf8");
  } catch { /* fail-soft */ }
}
```

Knob: `PRISM_INJECTION_DEDUP_DISABLE=1`.

## When to adopt

**Adopt** when an injection block satisfies BOTH:
1. Content is stable across prompts in a session (no per-prompt data like prompt tokens, master-index hits, chat-bus counts).
2. Block is ≥500 B (smaller blocks aren't worth the sidecar cost).

**Don't adopt** when content changes per prompt — `master-index-precheck-inject`, `memory-relevance-inject`, `wiki-precheck-inject` all do per-prompt keyword search and shouldn't be deduped (the dedup would be a cache-miss every prompt anyway, just wasted hash work).

## Companion N6 — `scripts/lib/stop-skip-when-clean.mjs`

Sibling pattern for Stop hooks. A session that produced NO edits / untracked / commits doesn't need end-of-session ledger work. `classifyCleanness(probe)` + `shouldSkipHook(hookName, verdict, skipEligible)` + `probeGitState(cwd)` + `DEFAULT_SKIP_ELIGIBLE` Set. 9/9 tests. First adopter: `stop-session-spend-summary.mjs` (this iter).

## Commit attribution

- `scripts/lib/injection-dedup.mjs` + tests → committed on `slot/alpha` (`8b3f86f55c`), mirrored to main-tree as untracked working copy so the hook can resolve `../../scripts/lib/...` import (until slot/alpha merges to main).
- `scripts/lib/stop-skip-when-clean.mjs` + tests + slot-soul-inject patch + stop-session-spend-summary patch → uncommitted main-tree (will be picked up in next commit window — heavy 16-chat fleet git-index contention).

## Linked

- Memory: [[reference_psn_injection_dedup_lib_2026_05_23]] (the lib record)
- Memory: [[reference_psn_hook_stop_helpers_2026_05_23]] (prior S2/S4 hook helpers)
- Memory: [[feedback_token_savings_discoveries_2026_05_23]] (9-rule doctrine grounding this work)
- Existing-prior-art hook: `.claude/hooks/goal-prereq-inject.mjs` (the loop-context self-dedup that proved the pattern)
