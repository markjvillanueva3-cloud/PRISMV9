---
title: Node-path template — node → exact source path (zero graph-parse navigation)
type: architecture
domain: system-viz
slug: node-path-template
created: 2026-06-03
by: claude-cd8e1622 (slot:sierra)
unit: U-SV-NODE-PATH-TEMPLATE
tags: [system-viz, token-savings, navigation, code-path-resolver, nav-savings, master-index, pre-bash]
---

# Node-path template

**Problem.** The node-direct-navigation surfaces (master-index-precheck inject, pre-bash-graph-inject EXACT-MATCH banner) tell the model "the graph already knows X" but emit only a label + a synthetic node id — never a file path. So the model still Grep/Glob-searches the ~200K-file tree to Read the file. The template closes that gap: given the name/id the banners already carry, emit `→ Read <path>` so the next tool call lands DIRECTLY on the source.

## Pieces

| File | Role |
|------|------|
| `scripts/lib/code-path-resolver.mjs` | **The template.** `resolveCodePath(nameOrId, {withLine?})` → `{path, repoPath, code, type, line?}` or `null`. O(1) over the compact `CODE_SYSTEM_INDEX.json` — **never** parses the 548 MB graph. |
| `scripts/lib/nav-savings-ledger.mjs` | `recordNavHit()` → append-only `{kind:"hit", est_tokens:300}` ledger (the shape `psn-savings-aggregate.summarizeJsonl` counts). Fail-soft. |
| `.claude/hooks/master-index-precheck-inject.mjs` | exact-match banner → emits `→ Read <repoPath>` + records a hit. |
| `.claude/hooks/pre-bash-graph-inject.mjs` | exact-match banner → same; exact-match predicate extracted to shared `exactMatchHit(keys,hits)`. |
| `.claude/hooks/stop-psn-savings-aggregate.mjs` | `SOURCES += "nav"` → rolls into the SessionStart "PSN savings" headline. |
| `.claude/commands/nav.md` | `/nav <name\|class\|shortcode\|node-id>` — operator-facing resolver (uses `{withLine}`). |

## Resolution (deterministic, fail-soft)

- Keys: `byCode` (DSL shortcode, unique) → `byName` (suffix-stripped) → `byBasename`, on the raw input AND its id-tail, case-insensitive.
- **AMBIGUOUS → null.** A key mapping to ≥2 distinct paths returns null — never a guessed path.
- `type` from the index `category` (E→engine, D→dispatcher, RG→registry, …).
- `line` (opt-in `{withLine}` only) — one source-file declaration scan, mtime-cached, **off the hot hook path**.

## `path` vs `repoPath` — the load-bearing distinction (P1 lesson)

CODE_SYSTEM_INDEX `path`s are relative to the index's `_meta.root` (`mcp-server/`). A bare `src/engines/X.ts` read **from the repo root** opens an **untracked, git-ignored top-level `H:/prism/src/` duplicate** (different inode, divergence-prone) — or 404s on a clean tree. So:
- `path` — index-root-relative (`src/engines/X.ts`). Display/back-compat.
- `repoPath` — **repo-root-relative, directly Readable** (`mcp-server/src/engines/X.ts`). **Consumers emitting a `Read` line use `repoPath`** (gated on `np.repoPath`, never `path`).
- Regression guard: a test asserts `fs.existsSync(repoRoot/repoPath)` for real engines.

→ General rule: a node→path resolver must emit a path resolvable from the **consumer's cwd**, not the index's root. See [[feedback_node_path_must_be_repo_root_relative]].

## Cost contract

`resolveCodePath(x)` with no opts = ZERO IO beyond the one-time mtime-cached parse of the compact index. Only `{withLine}` reads a source file. Knobs: `PRISM_CODE_SYSTEM_INDEX_PATH`, `PRISM_CODE_SYSTEM_SRC_ROOT`, `PRISM_NAV_EST_TOKENS` (default 300), `PRISM_NAV_SAVINGS_DISABLE`.

## Extension — U-SV-NAV-INJECT-GREP-WRITE (2026-06-03)

The exact-path inject now spans **four** surfaces, sharing one predicate:
- `scripts/lib/graph-exact-match.mjs` — the canonical home for `exactMatchHit(keys,hits)` + `navPathLine(np)` + `exactMatchBanner(h0,{header,footer,maxBytes,resolve})`. pre-bash refactored to import + re-export it (DRY — no three-way drift).
- **pre-grep** + **pre-write** gained an exact-match collapse (they were multi-hit only): a single concrete (non-ghost) node matching the pattern/filename → short banner + `→ Read <repoPath>` + nav-savings credit-on-emit. pre-write is framed "this asset already exists — Read before you (re)write" (a dedup-before-create signal).
- **pre-read intentionally excluded** — a Read already names its file; a `→ Read <same file>` line is redundant.
- Credit-on-emit (P2 fix carried through): `recordNavHit` fires only when the banner actually emits, never on a deduped repeat.
- Commit `33753f4c67`, 80/80 tests, 3-of-3 PASS. Deferred P2: credit-on-emit lacks a direct test (structurally guaranteed; mirrors the 3-of-3-passed pre-bash path).

## Related

[[system-viz-galaxy]] · [[master-index-surface]] · [[reference_sierra_ranked_hybrid_n1_2026_05_29]] · the resolver predates this (U-SV-CODE-PATH-RESOLVER); this unit added `type`/`byCode`/`repoPath`/`line` + the consumer wiring + telemetry.
