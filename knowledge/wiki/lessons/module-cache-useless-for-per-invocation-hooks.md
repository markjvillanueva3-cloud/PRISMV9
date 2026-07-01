---
title: A module-level cache helps only N-reads-per-process, NOT once-per-spawn hook reads
layer: lessons
tags: [token-economy, hooks, caching, efficiency, per-invocation, alpha, verify-the-fix]
created: 2026-06-21
related:
  - subagent-injection-measured-non-problem
  - measure-injection-before-dedup-fix
---

# A module-level cache helps only N-reads-per-process, NOT once-per-spawn hook reads

**Principle:** PRISM hooks (UserPromptSubmit / PreToolUse / Stop) are spawned as a
**fresh `node <hook>.mjs` process per fire** — read stdin, do work, exit. Module-level
(`let _cache = ...`) state **never persists to the next spawn**. So a module-level
mtime/value cache provides a real benefit **only** when the same file is read
**multiple times within ONE process invocation**; for a hook that reads a file
**once per spawn**, the cache is **cold every time → zero benefit**, and adding it is
pure over-engineering (code + maintenance surface for nothing).

## The trap (a real audit got this wrong, 2026-06-21)

A token-efficiency audit flagged `model-tier-advisor.mjs` and `inventory-check-guard.mjs`
for "redundant per-prompt JSON.parse with no module-level mtime cache" and proposed
mirroring `master-index-precheck-inject.mjs:95-104 loadDslReverse()`. **Wrong** — both
hooks read their file exactly **once per spawn**:

- `loadDslReverse()` genuinely benefits because `dslLookup()` is called **per-symbol,
  many times within one invocation** → the cache saves N-1 re-parses *inside that process*.
- `model-tier-advisor.mjs:57` reads the matrix **once** then the process exits → a
  module-level cache can never hit (next prompt = new process = cold).

The proposed fix would have added a cache that never fires. Verify-first caught it:
**an audit finding's proposed FIX needs the same scrutiny as its bug claim** — check
*call-frequency-within-process*, not just structural similarity to a working pattern.

## How to actually optimize a costly once-per-spawn read

If a per-spawn read is genuinely expensive (large file, hot path), the cross-spawn
levers are: (1) a **pre-parsed compact sidecar** the hook reads instead of the big
source (the node-card offset-index / find-cache pattern); (2) a **long-lived daemon**
that holds the parsed data warm (the master-index daemon on :3101); (3) **CAG cold-cache
anchoring** for static doctrine files. A module-level cache is NOT one of them.

## When a module-level cache IS correct

Only when one process invocation reads the same file/derives the same value **2+ times**
(a per-item lookup loop, a retry path, a function called repeatedly). Then it's the right
tool — exactly what `loadDslReverse` does.

Memory: [[reference_token_economy_surface_optimized_2026_06_21]].
