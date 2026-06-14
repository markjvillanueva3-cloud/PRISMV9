# /nav — node → exact source path (zero graph-parse navigation)

Resolve a PRISM node's **name / class / DSL shortcode / graph-node-id** to its
**exact source file path** (+ asset type, + optional declaration line) so you can
`Read` it DIRECTLY instead of Grep/Glob-searching the ~200K-file tree. Backed by
the compact `CODE_SYSTEM_INDEX.json` — **never** parses the 548 MB system-graph.

This is the operator-facing half of the node-path template (`U-SV-NODE-PATH-TEMPLATE`).
The same resolver auto-fires inside `master-index-precheck-inject` and
`pre-bash-graph-inject` — when those banners already show a `→ Read <path>` line,
you don't need `/nav`; use it when you have a name in hand and want the path now.

## Usage

```
/nav <name | class | shortcode | node-id>
```

- `<name>` — suffix-stripped name (`AHP`, `CuttingForce`) or class basename (`AHPEngine`, `CuttingForceEngine`)
- `<shortcode>` — a DSL code (`E0001`, `RG3`, `D12`) — see `/code-index`
- `<node-id>` — a graph node id / id-tail (`eng.calc.cuttingforceengine`)

## How it resolves (deterministic, O(1), fail-soft)

Run the resolver with the declaration-line scan enabled:

```bash
node -e "import('H:/prism/scripts/lib/code-path-resolver.mjs').then(m => { const r = m.resolveCodePath(process.argv[1], { withLine: true }); console.log(r ? JSON.stringify(r) : 'NO_MATCH (unindexed or ambiguous — never a guessed path)'); })" -- "$ARGUMENTS"
```

Returns `{ path, repoPath, code, type, line }`:
- `repoPath` — **repo-root-relative, directly Readable** (`mcp-server/src/engines/…`). Use this for the Read. (A bare `path` read from the repo root opens an untracked top-level `src/` dup — always use `repoPath`.)
- `path` — index-root-relative (`src/engines/…`); kept for back-compat / display.
- `type` — `engine | dispatcher | algorithm | schema | hook | util | registry | service | test | …`.
- `line` — best-effort declaration line (jump straight to the symbol). `null` if the source isn't readable.
- `NO_MATCH` — the name maps to ≥2 distinct paths (ambiguous) or isn't in the index. The resolver **refuses to guess** — disambiguate with `/code-index search <name>` or `/master-index <name>`.

Then `Read <repoPath>` (optionally at `:<line>`).

## Why this saves tokens

A direct `Read mcp-server/src/engines/CuttingForceEngine.ts` replaces a
Grep/Glob over the huge tree (often a timed-out recursive scan) **plus** the
wrong-file Reads that follow it. Each resolved nav is credited to the nav-savings
ledger (`state/shared/dashboards/nav-savings-ledger.jsonl`) and rolls up into the
SessionStart **PSN savings** headline.

## Knobs

- `PRISM_CODE_SYSTEM_INDEX_PATH` — override the index location (tests).
- `PRISM_NAV_EST_TOKENS` — tokens-saved credited per hit (default 300).
- `PRISM_NAV_SAVINGS_DISABLE=1` — stop ledger recording.

## See also

- `/code-index <CODE>` — DSL shortcode ↔ path (the backing index).
- `/master-index <query>` — ranked unified search when you don't have an exact name.
- `/navigate <topic>` — directory-level routing (when you want "where do X live", not an exact file).
