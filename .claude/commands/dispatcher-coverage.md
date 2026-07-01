---
name: dispatcher-coverage
title: Dispatcher Coverage — Per-Dispatcher Engine & Action Heatmap
description: Pivot ENGINE_WIRING_INDEX.json on the dispatcher axis. Surfaces engines-per-dispatcher, listed-actions-per-dispatcher, dispatcher orphan rate, and bottom-heavy dispatchers (1-2 engines = candidates for consolidation). Complements /coverage-by-domain (engine-name-prefix axis) with the dispatcher-side view a wiring sprint actually needs.
type: skill
model: sonnet
effort: low
context: development
allowed-tools:
  - Bash
  - Read

# ── Auto-trigger frontmatter (forward-compat for Phase D orchestrator) ──
# These fields are declarative metadata consumed by Phase D's
# `skill-auto-trigger.mjs` + `regen-wiki-from-viz.mjs` stage-22 (per
# state/shared/SKILL-AUTO-TRIGGER-PLAN.md). Until Phase D ships, the skill
# is operator-invoked only.
triggers:
  - event: UserPromptSubmit
    matcher:
      type: keyword
      value: "dispatcher coverage|dispatcher map|engines per dispatcher|wiring breakdown by dispatcher|dispatcher heatmap|dispatcher orphan|under-utilized dispatcher"
    score: 0.85
    action: suggest

pipeline_integrations:
  - pipeline: forge-audit               # /forge-audit, /forge-audit-v2
    phase: layer-2-wiring
    trigger: "audit of dispatcher fan-out + under-utilization"
    action: invoke
  - pipeline: rgs                       # /rgs propose-phase
    phase: propose
    trigger: "before proposing a new dispatcher (check whether to extend instead)"
    action: invoke
  - pipeline: wire-unwired              # Phase D.1 umbrella (see SKILL-AUTO-TRIGGER-PLAN §P2)
    phase: dispatcher-pick
    trigger: "selecting which dispatcher to wire a batch of engines into"
    action: invoke
  - pipeline: forge                     # /forge, /forge2..7
    phase: P0-context
    trigger: "engine creation — check natural dispatcher home(s)"
    action: invoke-if-engine-build

loop_contract:
  max_iterations: 1                # single-shot analysis; not iterative
  initial_delay: 0
  inter_iteration_delay: 0
  break_when: all-pass
  state_signal: snapshot
  rollback_on_runaway: false
  done_signals:
    - '{"done": true, "verdict": "REPORT", "dispatchers": <N>, "wired_engines": <W>, "unwired_engines": <U>}'

impact:
  upstream:
    - state/shared/ENGINE_WIRING_INDEX.json (the pivoted data source)
    - /forge-audit layer-2 (dispatcher utilization)
    - /rgs propose-phase (dispatcher-vs-new check)
    - /wire-unwired (Phase D.1) — picks dispatcher targets for engine batches
    - operator manual invocation
  downstream:
    - state/shared/DISPATCHER_COVERAGE_REPORT.json (if --output-json)
    - informs: dispatcher-pick decisions in /wire-unwired and /wiring-batch
    - informs: dispatcher consolidation candidates (singleton dispatchers)
    - informs: roadmap planning (which dispatchers are under-developed)
  bounded: true
  reversible: true  # analysis only; no file mutations
composes_with:
  - "/coverage-by-domain"
  - "/forge"
  - "/forge-audit"
  - "/rgs"
  - "/wire-unwired"
  - "/wiring-batch"
consumes:
  - "prism_session:dispatcher_map_compact"
---
# /dispatcher-coverage — Per-Dispatcher Engine & Action Heatmap

> **Goal:** make the dispatcher-axis view of PRISM's wiring graph as easy to surface as the domain-axis view (`/coverage-by-domain`). When you're about to wire 6 unwired Lathe engines, the question is **"which dispatcher do they belong in?"** — that's a dispatcher-axis question. This skill answers it.
>
> **Built for:** Phase D.1 `/wire-unwired`'s dispatcher-pick step, `/forge-audit` layer-2 utilization sweep, and `/rgs propose-phase`'s "do we really need a new dispatcher?" check.

## When to use

- Before staffing a wiring batch — see which dispatcher already hosts the engine family
- During `/forge-audit` layer-2 — identify under-utilized dispatchers (1-2 engines) that should be consolidated
- During `/rgs propose-phase` — verify a proposed new dispatcher isn't redundant with an existing one
- After a wiring sprint — confirm engine fan-out moved the dispatcher's coverage
- For roadmap planning — `--worst` flags dispatchers with action-count drift (`totalActions=0` despite many engines wired in = engines wired by import-only, no action enum entries)

## When NOT to use

- For the **domain-axis** view (Lathe, WEDM, Mill) — use `/coverage-by-domain` instead
- For per-engine wiring detail — query `state/shared/ENGINE_WIRING_INDEX.json` directly
- For dispatcher source code analysis — read `mcp-server/data/docs/DISPATCHER_DIGEST.md`

## Usage

```
/dispatcher-coverage                          # default: top-30 by engine count
/dispatcher-coverage --top=<N>                # top-N (default 30, --all for full list)
/dispatcher-coverage --all                    # every dispatcher
/dispatcher-coverage --worst                  # bottom-N (singleton dispatchers — consolidation candidates)
/dispatcher-coverage --actions                # sort by listed-action count instead of engine count
/dispatcher-coverage --orphans                # ALSO list unwired engines (1 line each, capped at 100)
/dispatcher-coverage --filter=<name>          # one dispatcher only (e.g. --filter=calcDispatcher)
/dispatcher-coverage --diff=<ref>             # compare against ENGINE_WIRING_INDEX.json at <ref> (HEAD@{1}, sha)
/dispatcher-coverage --output-json            # write state/shared/DISPATCHER_COVERAGE_REPORT.json
```

## Protocol

### Step 0 — Resolve parameters
- Default top-N: 30
- Default sort: `engine_count desc`
- Validate `--filter` matches at least one dispatcher (case-insensitive substring); if not, list all dispatcher names and exit.
- Validate `--diff` ref via `git rev-parse <ref>`; reject if unresolvable.

### Step 1 — Load wiring index
Read `state/shared/ENGINE_WIRING_INDEX.json`. Required shape:
```jsonc
{
  "schemaVersion": "<N>",
  "summary": { ... },
  "engines": {
    "<EngineName>": {
      "engine": "<EngineName>",
      "wired": <bool>,
      "dispatchers": [{ "dispatcher": "<dispName>", "actions": ["<a>", ...] }],
      "totalActions": <N>,
      "totalImports": <N>,
      "orphanNoEngineFile": <bool>
    },
    ...
  }
}
```
If the file is missing or older than `mcp-server/data/state/BASELINE_INVENTORY.json.mtime - 1h`, recommend the operator run:
```bash
node H:/prism/scripts/build-engine-index.mjs   # regenerates BOTH index.ts and state/shared/ENGINE_WIRING_INDEX.json
```
(`build-engine-index.mjs` is the dual-output regen script — emits `src/engines/index.ts` plus the wiring index. The post-edit hook `engine-wiring-index-regen` invokes it automatically on engine edits; the 1 h staleness floor exists for the case where the hook was disabled or skipped.)

### Step 2 — Pivot to dispatcher axis
For each engine, walk its `dispatchers[]` entries. Build:
```
dispatcherMap[<name>] = {
  engines: Set<engineName>,           // unique engines wrapped
  actions: number,                     // sum of listed actions across engine entries
  enginesWithListedActions: Set<...>   // engines that contribute at least 1 listed action
}
```

Also compute:
- `totalWired` = engines where `wired === true`
- `totalUnwired` = engines where `wired === false`
- `unwiredList` = sorted array of unwired engine names

### Step 3 — Compute per-dispatcher rows
For each dispatcher, emit:
- name
- engine_count
- action_count (listed; many dispatchers report 0 because they don't enumerate)
- engines_with_listed_actions
- coverage_density = action_count / engine_count (0 means action enum not enumerated)

### Step 4 — Sort
- Default: `engine_count desc, name asc`
- `--actions`: `action_count desc, engine_count desc, name asc`
- `--worst`: `engine_count asc, name asc` (singletons first — consolidation candidates)

### Step 5 — Surface table
```
┌─ /dispatcher-coverage ─────────────────────────────────
│ Source: state/shared/ENGINE_WIRING_INDEX.json (mtime <ts>)
│ Wired engines: <W>     Unwired engines: <U>     Dispatchers: <D>
│ Sum of listed actions across dispatchers: <SA>
├──────────────────────────────────────────────────────
│ Rank Dispatcher                            Engines  Actions  Density
│   1  calcDispatcher                          524       0     0.000
│   2  camDispatcher                           468       0     0.000
│   3  aiReasoningDispatcher                   116     173     1.491
│  ...
└──────────────────────────────────────────────────────
```

Note: the "listed actions" count is the `actions[]` array on each engine entry — most dispatchers don't enumerate, so `0` does NOT mean "no actions exist." It means the wiring index didn't extract them. Use `prism_session:dispatcher_map_compact` for the authoritative action enum per dispatcher.

### Step 6 — (if --orphans) surface unwired engines
After the table, append (capped at 100 lines):
```
ORPHANED ENGINES (wired=false):  <U> total
  AdvancedConicEngine
  AdvancedConicMillingEngine
  AluminumAerospaceMaterialsEngine
  ...

Next: /wire-unwired --batch=<N>   (Phase D.1)
   or: /coverage-by-domain --worst   (find biggest gap by domain)
```

### Step 7 — (if --diff=<ref>)
- Resolve `<ref>` (via `git show <ref>:state/shared/ENGINE_WIRING_INDEX.json` piped to a temp file or in-memory parse). The `git show` form works identically on PowerShell and POSIX since both shells pass the colon-form arg through unchanged; capture stdout via `execFileSync` (NOT shell-piped) to avoid Windows quoting issues.
- If the file did not exist at `<ref>` (e.g. the wiring index was added after `<ref>`), `git show` exits non-zero. Surface "diff source missing — earliest available commit with `ENGINE_WIRING_INDEX.json` is `<sha>`" (locate via `git log --diff-filter=A --pretty=format:%H -- state/shared/ENGINE_WIRING_INDEX.json | tail -1`).
- Compare per-dispatcher engine_count and action_count.
- Surface delta rows only (Δengines ≠ 0 OR Δactions ≠ 0):
```
DISPATCHER DELTA  vs <ref>
  +<N>  <dispatcher>     engines: <new>  ←  <old>     actions: <na>  ←  <oa>
  -<M>  <dispatcher>     ...
```

### Step 8 — (if --output-json)
Write `state/shared/DISPATCHER_COVERAGE_REPORT.json` via atomic temp+rename (write to `.tmp` sibling, then `rename` to final path — NTFS-safe vs concurrent reader peer chats). The whole-file overwrite path is NOT atomic on NTFS; do not rely on `fs.writeFile` directly here.
```jsonc
{
  "schemaVersion": 1,
  "timestamp": "<ISO>",
  "source": "state/shared/ENGINE_WIRING_INDEX.json",
  "source_mtime": "<ISO>",
  "summary": {
    "wired_engines": <W>,
    "unwired_engines": <U>,
    "dispatchers": <D>,
    "sum_listed_actions": <SA>
  },
  "rows": [
    { "rank": 1, "dispatcher": "calcDispatcher", "engines": 524, "actions": 0, "density": 0 },
    ...
  ],
  "singletons": ["<disp1>", "<disp2>", ...],          // engine_count === 1
  "actionless_with_many_engines": ["<disp>", ...],    // engines >= ACTIONLESS_MANY_THRESHOLD (default 10) AND actions === 0
  "actionless_many_threshold": 10,                    // record the threshold used so consumers can re-derive
  "unwired_engines": ["<name>", ...]                  // only if --orphans
}
```

### Step 9 — Emit verdict JSON
```json
{"done": true, "verdict": "REPORT", "dispatchers": <D>, "wired_engines": <W>, "unwired_engines": <U>}
```

## Implementation notes

- **Performance:** ENGINE_WIRING_INDEX.json is ~3 MB / 3,171 engines. Pivot runs in <100 ms. Safe to invoke as part of an audit chain.
- **Data freshness:** the index is regenerated by `scripts/build-engine-wiring-index.mjs` on a post-edit hook (`engine-wiring-index-regen`). If staleness > 1 h, the skill surfaces a regen hint but still emits the table.
- **`totalActions=0` is normal:** action enums are only extracted for dispatchers whose source uses a recognizable shape. Singletons and helper dispatchers commonly emit 0 here — don't read this as "the dispatcher is unused."
- **`--diff` against a missing past index:** if the past commit doesn't have ENGINE_WIRING_INDEX.json (it was added in commit `<sha>`), surface "diff source missing — earliest available is <sha>" rather than crashing.
- **Multi-chat safety:** read-only on the wiring index. The `--output-json` write uses temp-file + `rename` (NTFS-atomic) so a peer chat reading mid-write sees the prior file, not partial JSON. Direct `fs.writeFile` is NOT atomic on NTFS and must not be used here.
- **`--filter` semantics:** case-insensitive substring match on dispatcher name. Multi-hit returns ALL matches (the filter is not exclusive). To get exactly one row, pass the exact dispatcher name.
- **Trigger keyword breadth:** the `triggers[].matcher.value` regex is deliberately tight ("dispatcher coverage", "engines per dispatcher", etc.) — generic words like "dispatcher" or "coverage" alone do NOT trigger. This is the Phase D orchestrator's responsibility; until D ships, manual invocation is the only path anyway.

## What this skill does NOT do

- Does NOT wire engines (that's `/wire-unwired` / `/wiring-batch`)
- Does NOT modify ENGINE_WIRING_INDEX.json (only `scripts/build-engine-wiring-index.mjs` does)
- Does NOT compute domain-axis coverage (use `/coverage-by-domain`)
- Does NOT recommend WHICH dispatcher a specific engine should go into — only surfaces the existing distribution. Per-engine dispatcher-fit reasoning lives in `/forge` P0-context or `prismCreativeReasoningEngine`.

## Examples

### Example 1 — default top-30 view
```
/dispatcher-coverage
```
Shows the 30 largest dispatchers by engine count. Useful for sanity-checking "is calcDispatcher really our biggest fan-out point?"

### Example 2 — find consolidation candidates
```
/dispatcher-coverage --worst --top=20
```
Lists the 20 smallest dispatchers. Singletons (`engines: 1`) are immediate consolidation candidates — usually they shipped during early prototype work and never grew.

### Example 3 — pre-wiring batch picking
```
/dispatcher-coverage --filter=lathe
```
Shows every dispatcher with "lathe" in its name. Useful before a batch like `[CAD-FUSION-LIVE-MS0]/U-WIRE-LATHE-BATCH2` — confirms which dispatcher already hosts lathe AI/intelligence/knowledge engines (e.g. `prism_turning`).

### Example 4 — audit utilization
```
/dispatcher-coverage --actions --top=15 --output-json
```
Sorts by listed-action count, writes JSON for ingestion by `/forge-audit` layer-2.

### Example 5 — delta after a wiring sprint
```
/dispatcher-coverage --diff=HEAD~10
```
Shows which dispatchers grew engine_count or action_count over the last 10 commits — quick verification a wiring sprint landed where it should have.

### Example 6 — full orphan list for next-batch planning
```
/dispatcher-coverage --orphans --output-json
```
Surfaces the full unwired-engine list AND writes the machine-readable report `/wire-unwired` can ingest.

## See also

- `state/shared/ENGINE_WIRING_INDEX.json` — authoritative wiring data (regenerated by `scripts/build-engine-wiring-index.mjs`)
- `mcp-server/data/docs/DISPATCHER_DIGEST.md` — human-readable dispatcher catalog with descriptions
- `prism_session:dispatcher_map_compact` — programmatic action enum per dispatcher
- `/coverage-by-domain` — engine-name-prefix axis (sibling skill; this skill is the dispatcher axis)
- `/wire-unwired` — Phase D.1 umbrella that orchestrates batched wiring (planned)
- `/forge-audit` layer-2 — calls this skill as part of the wiring-utilization sweep
- `state/shared/SKILL-AUTO-TRIGGER-PLAN.md` Phase B.1 — this skill's milestone
