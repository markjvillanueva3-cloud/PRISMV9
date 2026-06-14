---
title: substrate-health-inject — SessionStart drift digest injector
type: architecture
created: 2026-05-19
commit: 01ff65a734
unit: SYNERGY-SUBSTRATE-MS0/U-SHI01
status: shipped
---

# substrate-health-inject

SessionStart hook that surfaces `scripts/declared-vs-actual.mjs` drift in every PRISM chat's SessionStart context bundle. Compounds with today's earlier ship of `declared-vs-actual.mjs` (commit `aad2152f7f`): the gate I shipped runs only inside `/forge7 §Phase 0.2`; this hook extends its reach to EVERY session so chats learn about dormancy/drift without explicit invocation.

## What it answers

- "Did I declare a hook in `settings.json` that doesn't exist on disk?" (orphan-declared)
- "Did I leave an MCP server name typo in `enabledMcpjsonServers` so the real server stays dormant?" (the 2026-05-19 `prism-mcp-server` → should-be `prism` typo class)
- "Are there hook files on disk no chat's `settings.json` references?" (orphan-on-disk)
- "Did I scaffold an env var without filling it?" (e.g. empty `SUPABASE_PROJECT_URL`)

## Contract

- ADVISORY only — exits 0 on every code path, never blocks SessionStart for the 26-chat fleet.
- Emits a 3-line digest via `hookSpecificOutput.additionalContext`.
- Pure `formatDigest(report, ageMs)` export with no I/O — 27 hermetic tests via `node:test`.
- `main()` auto-execution gated by `isInvokedDirectly()` so test imports don't fire `spawnSync` or pollute stdout.

## Performance

| Path | Cost |
|------|------|
| Cache hit (most invocations) | ~5-15 ms — `existsSync` + `statSync` + `readFileSync` + `JSON.parse` + pure format |
| Cache miss (every 2h) | sub-second — spawns `declared-vs-actual.mjs --json` with 8s timeout ceiling |
| Disabled (`PRISM_SUBSTRATE_HEALTH_INJECT=0`) | ~1 ms |

Cache lives at `state/shared/.cache/substrate-health-last.json`. Atomic write via `${file}.tmp-<pid>-<ts>` → `renameSync` (NTFS `MoveFileEx` is atomic on same volume).

## Knobs

| Env | Default | Effect |
|-----|---------|--------|
| `PRISM_SUBSTRATE_HEALTH_INJECT=0` | enabled | Disable entirely; emits empty envelope |
| `PRISM_SUBSTRATE_HEALTH_TTL_MS=N` | `7200000` (2h) | Override cache TTL |
| `PRISM_ROOT` | `H:/PRISM` | Resolve script + cache paths from this root |

## Failure modes (all → silent emit-null, exit 0)

- Script missing (`declared-vs-actual.mjs` not in `scripts/`)
- spawnSync `r.error` (process spawn fail)
- Subprocess timeout (8s)
- Empty/non-JSON stdout
- Cache JSON corrupt
- Cache file > 1 MB (hostile-payload class; sister to ask-ollama 80 MB graph cap)
- `mkdirSync(CACHE_DIR)` permission denied
- `renameSync` cross-volume / concurrent (best-effort)
- Any uncaught throw — outermost try/catch around `main()` calls `emit(null)`

## Adversarial input guards (R12 fail-loud)

- `summary.drift_count` and `summary.blocking_count`: `Number.isFinite && >= 0` coerce → 0 (NaN/Infinity/negative/undefined never leak as strings)
- `summary.ok`: strict `=== true` — string `"true"` falls through to ⚠ branch (a producer typo is surfaced, not hidden)
- `mcp.dormant_declared_not_configured`: `Array.isArray`-guarded `.join()` via defensive `[]` fallback in `formatDigest`

## Render format

```
## 🧪 Substrate health (declared-vs-actual <schema>, <age>)
   <status> · drift <N> · <MCP clean | MCP dormant: a, b> [· env empty: K] [· J hooks orphan-on-disk]
   _Run `node scripts/declared-vs-actual.mjs --text` for the full report. Disable: PRISM_SUBSTRATE_HEALTH_INJECT=0_
```

Where `<status>` is `✓ clean` (only when `summary.ok === true`) or `⚠ N BLOCKING`. `<age>` is `fresh` (just-ran or null) or `cached Nm ago`.

## Wiring

Wired in user-global `C:/Users/wompu/.claude/settings.json` at `hooks.SessionStart[0].hooks[23]` (after `awareness-snapshot-inject.mjs`, the sibling system-context injector). Auto-mirrored to `H:/.claude/settings.json` via `c-to-h-mirror`. Project-local `H:/PRISM/.claude/settings.json` is NOT wired (per CLAUDE.md doctrine — edit user-global only).

## Tests

`H:/PRISM/.claude/hooks/substrate-health-inject.test.mjs` — 27 hermetic cases:

- Null/undefined/empty input handling
- Clean state rendering (`✓ clean`)
- Drift / blocking rendering (`⚠ N BLOCKING`)
- Cache age formatting (fresh / cached Nm ago / 0m floor)
- Output structure (3 lines, H2 header, disable knob hint, canonical command)
- Schema version surfacing
- Defensive shape handling (missing mcp/env/hooks sections)
- 4 P1 regression guards (from reviewer round 1):
  - Undefined summary fields NEVER leak as `"undefined"` string
  - Negative `blocking_count` clamped to 0
  - String `"true"` for `ok` does NOT trigger clean branch
  - NaN/Infinity drift coerced to 0
- 1 REGRESSION GUARD pinning today's 2026-05-19 typo class (prism-mcp-server dormant + prism_safe missing)

## Per-file scrutiny (2 reviewers, 4 P1s fixed pre-commit)

| Finding | Severity | Fix |
|---------|----------|-----|
| Case-sensitive `invokedDirectly` on case-insensitive FS | P1 | `path.relative(a,b) === ''` |
| `formatDigest({summary:{}})` rendered "undefined" | P1 | Number.isFinite coerce + strict `ok === true` + 4 regression tests |
| Hardcoded `PRISM_ROOT = "H:/PRISM"` | P1 | `process.env.PRISM_ROOT || "H:/PRISM"` |
| Unbounded `JSON.parse(cache)` (hostile payload) | P1 | 1 MB `MAX_CACHE_BYTES` cap before `readFileSync` |

P2s deferred: drift-severity visual weight, schema-drift surfacing in digest, fail-loud advisory threshold.

## See also

- `scripts/declared-vs-actual.mjs` — the underlying drift report (commit `aad2152f7f`)
- `awareness-snapshot-inject.mjs` — sibling SessionStart injector (precedes substrate-health in chain)
- `build-state-inject.mjs` — earlier sibling pattern
- `ask-ollama` — the 80 MB graph-cap reference (hostile-payload class)
