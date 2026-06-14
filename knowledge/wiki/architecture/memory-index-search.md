---
title: memory-index-search
type: architecture
unit: U-MEMORY-INDEX-SEARCH
milestone: SYNERGY-AUDIT-CONTINUE
created: 2026-05-20
owner: echo
---

# memory-index-search

Direct BM25-lite search over the Obsidian memory vault for free-floating
memories not pre-joined to `system-graph.json` nodes. Closes H7 of
[[audit-system-synergy-2026-05-09]] — the synergy edge between user prompts
and the ~492-file memory vault that the existing master-index couldn't see.

## Why this exists

Three pre-existing memory-recall surfaces, all with the same blind spot:

| Surface | Scope | Blind spot |
|---------|-------|------------|
| `master-index-precheck-inject.mjs` (UserPromptSubmit) | system-graph node search | Surfaces memories ONLY if pre-joined to a node via `knowledge.memoryEntries[]`. Free-floating memories not yet in any node are invisible. |
| `memory-relevance-inject.mjs` (PreToolUse:Edit) | Memory recall scoped to the file being edited | Fires on Edit/Write/MultiEdit only. UserPromptSubmit text queries get nothing. Search terms derived from FILE PATH tokens, not from prompt content. |
| `tribal-by-domain-inject` | Tribal-knowledge tips by slot domain | Tribal corpus, not the memory vault. |

A user prompt like *"what do we know about shared-tree misattribution from peer commits"* hits NONE of the three. The memory `reference_h8_misattribution_2026_05_20.md` exists, has the answer, and is unreachable until either (a) `regen-viz` rebuilds the graph and the merge step re-joins it, or (b) the operator manually `/master-index`-queries.

## What it records

The lib has no persistent state — it's a pure search. Per call:

| Field | Source |
|-------|--------|
| `tokens` | tokenized + stopword-filtered query (matches master-index-search-lib's tokenizer verbatim) |
| `hits[].name` | memory slug (filename minus `.md`) |
| `hits[].fileName` | original filename |
| `hits[].namespace` | `feedback` / `reference` / `project` / `user` / `patterns` / `mistakes` / `inbox` |
| `hits[].score` | BM25-lite (W_NAME=3.0, W_DESC=2.5, W_BODY=1.0, W_TYPE=0.5) summed over query tokens |
| `hits[].description` | frontmatter `description:` (the recall ranking signal) |
| `hits[].opening` | first non-heading paragraph, truncated to 200 chars |

## Pipeline

```
user prompt (UserPromptSubmit)
    ↓ tokenize (≥2 content tokens after stopword strip)
runMemoryIndexSearch
    ↓ enumerateMemoryFiles — walks namespaces; skips MEMORY.md + MEMORY-ARCHIVE.md
    ↓ for each .md file:
    ↓   statSync (skip if zero-byte)
    ↓   readFileSync ≤ DEFAULT_MAX_BODY_BYTES (4 KB)
    ↓   parseFrontmatter → description
    ↓   firstParagraph → opening
    ↓   scoreMemoryRecord against tokens
    ↓ DoS guard: halt scan when total bytes read exceeds DEFAULT_MAX_TOTAL_BYTES (8 MB)
    ↓ sort by score desc, alphabetical tie-break
    ↓ slice topK
returns { tokens, hits[] }
```

## Pure-core + injected-IO

Same shape as [[stop-hook-aggregator]] — the lib is testable hermetically because every fs call is injected. The hook layer (`.claude/hooks/memory-index-precheck-inject.mjs`) wires the real `readdirSync` / `readFileSync` / `statSync` / `existsSync`; tests inject in-memory fakes. 32/32 `node:test` cases cover tokenizer (6), record builder (8), scorer (7), enumerator (4), end-to-end search (7).

## Safety

- **Never blocks** — hook always exits 0 with `{hookSpecificOutput: {additionalContext}}` or silent exit on no hits.
- **Total-bytes cap** — `DEFAULT_MAX_TOTAL_BYTES = 8 MB`. With 492 files × avg 4 KB body cap = ~2 MB worst-case; cap is 4× headroom.
- **Per-file body cap** — `DEFAULT_MAX_BODY_BYTES = 4 KB`. A pathological 1 MB memory file reads at most 4 KB.
- **Per-namespace fail-soft** — a `readdirSync` throw (EACCES, etc.) skips that namespace, doesn't abort the scan.
- **Per-file fail-soft** — a `readFileSync` throw skips that file.
- **Index files filtered** — `MEMORY.md` and `MEMORY-ARCHIVE.md` are skipped (those are the index, not memories).
- **Deterministic tie-break** — alphabetical by slug ensures byte-identical output across runs.

## Knobs

| Env var | Default | Effect |
|---------|---------|--------|
| `PRISM_MEMORY_INDEX_INJECT` | `1` | Set `0` to disable hook entirely |
| `PRISM_MEMORY_INDEX_K` | `3` | Top-K hits to surface (bounded 1..10) |
| `PRISM_MEMORY_INDEX_MIN_TOKENS` | `2` | Minimum content tokens to fire (avoids low-signal triggers) |

## Wiring status — LIVE (U-MEMORY-INDEX-SIDECAR landed 2026-05-20)

The hook is **wired into `UserPromptSubmit` after `master-index-precheck-inject`** in both `C:` + `H:` `.claude/settings.json`. The sidecar fast-path (next section) drops cold-parse from ~8.7 s → ~11 ms on the work PC — 790× speedup, well inside the 5 s UPS timeout.

## Sidecar fast-path (U-MEMORY-INDEX-SIDECAR)

`scripts/build-memory-index-sidecar.mjs` pre-builds `state/shared/memory-index-sidecar.json` (slug + namespace + description + opening per file). The lib's `tryLoadMemorySidecar` prefers the sidecar and falls back to live scan + R12 stderr-warning on staleness/schema-mismatch/parse failure. Mirrors the `master-index-search-lib.mjs` `tryLoadSidecar` shape.

Sidecar shape (`schemaVersion: "1.0.0"`):

```json
{
  "schemaVersion": "1.0.0",
  "builtAt": "...",
  "vaultRoot": "H:/prism/knowledge/memories",
  "namespaces": [...],
  "sourceMtimeMs": <max namespace-dir mtime>,
  "recordCount": 495,
  "skippedFiles": 0,
  "records": [{ name, fileName, namespace, description, opening }]
}
```

Staleness gate: `sourceMtimeMs >= max(stat(namespace_dir).mtimeMs)`. Older → lib stderr-warns and falls through to live scan (preserving the H7 contract).

Regen surfaces:
- **Stop hook** (`.claude/hooks/memory-index-sidecar-regen.mjs`, Stop[0].hooks[50], timeout 3 s) — detached spawn when sidecar absent or stale; ≥1 regen per `PRISM_MEMORY_INDEX_REGEN_THROTTLE_MS` (default 1 h). Never blocks the Stop chain.
- **CLI** — `node scripts/build-memory-index-sidecar.mjs [--dry-run] [--json]` for operators.

Knobs:

| Env var | Default | Effect |
|---------|---------|--------|
| `PRISM_MEMORY_INDEX_SIDECAR_DISABLE` | `0` | Set `1` to bypass sidecar (lib falls back to live scan) |
| `PRISM_MEMORY_INDEX_REGEN_DISABLE` | `0` | Set `1` to disable the Stop-hook regen entirely |
| `PRISM_MEMORY_INDEX_REGEN_THROTTLE_MS` | `3600000` | Min gap between regen attempts (clamped 60s..24h) |

## Honest scope (R12)

This lib does NOT replace `memory-relevance-inject` — that hook still has unique value for Edit/Write context (file-path-derived memo surfacing). It does NOT replace `master-index-precheck-inject` either — that hook scans the system-graph (engines/dispatchers/wiki nodes), this one scans the memory vault directly. Three surfaces, three scopes, additive.

This lib does NOT update the system-graph. A memory it surfaces still has no `knowledge.memoryEntries[]` backlink in the graph until `regen-viz` rebuilds. Two paths to the same memory; both should converge over time.

## Files

- `scripts/lib/memory-index-search-lib.mjs` — pure-core (9 named exports incl. `tryLoadMemorySidecar`, `SIDECAR_SCHEMA_VERSION`, `DEFAULT_SIDECAR_PATH` + `__test_constants`)
- `scripts/lib/memory-index-search-lib.test.mjs` — node:test, 32 cases, hermetic (parent H7 suite)
- `.claude/hooks/memory-index-precheck-inject.mjs` — UserPromptSubmit hook (~95 LOC; **WIRED 2026-05-20 in `UserPromptSubmit[0].hooks` after master-index-precheck-inject**)
- `scripts/build-memory-index-sidecar.mjs` — sidecar builder CLI (`--dry-run`, `--json`)
- `scripts/build-memory-index-sidecar.test.mjs` — node:test, 23 cases (builder + lib fast-path + e2e real-disk round-trip)
- `.claude/hooks/memory-index-sidecar-regen.mjs` — Stop-hook autonomous regen (T3 advisory; **WIRED 2026-05-20 in Stop[0].hooks**)
- `state/shared/memory-index-sidecar.json` — pre-built fast-path artifact (~495 records at ship time)

## Related

- [[audit-system-synergy-2026-05-09]] — the parent audit (H7 finding)
- [[master-index-precheck-inject]] — system-graph search; complementary surface
- [[memory-relevance-inject]] — PreToolUse:Edit memory recall; complementary surface
- [[obsidian-vault-flow]] — vault structure + namespace doctrine
- [[stop-hook-aggregator]] — sibling H8 unit, same pure-core + injected-IO pattern
- [[reference_h8_misattribution_2026_05_20]] — the memory this lib was BUILT to find (R12 dogfooding)
