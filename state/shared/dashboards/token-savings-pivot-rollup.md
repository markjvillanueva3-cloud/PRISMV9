# TOKEN-SAVINGS-PIVOT — final iter19 rollup

**Milestone:** TOKEN-SAVINGS-PIVOT (slot:alpha, 2026-05-22)
**Status:** iter 19 of 20 (one tick remaining)
**Sidecar:** `state/shared/mcp-route-suggest-stats.json` (schema 1.0.0)

## Live sidecar snapshot

```
totalFires:      23
byToolName:      Grep:4  Read:7  Bash:5  Glob:1  Write:3  Edit:2  MultiEdit:1
byClassifier:    isBroadGrep:4  doctrineSurface:6  isVerboseBash:5  isLargeRead:3
                 isBroadGlob:1  backendAuditChain:3  isLargeWrite:1
bySlot:          alpha:2  charlie:1  _unresolved:2
takeupTotals:    totalTakeups:1  byClassifier:{isBroadGrep:1}
recent[]:        23 entries (cap 100)
takeups[]:       1 entry (cap 100)
```

## Goal-condition verification

User goal: *"expand our token savings with grep, bash, read, write, search tool calls ran through the mcp server for token savings, utilize system-viz | max high roi wired in"*

| Goal element | Status | Evidence |
|---|---|---|
| Grep routed | ✓ | byToolName.Grep=4, classifier isBroadGrep |
| Bash routed | ✓ | byToolName.Bash=5, classifier isVerboseBash |
| Read routed | ✓ | byToolName.Read=7, classifier isLargeRead |
| Write routed | ✓ | byToolName.Write=3 + Edit=2 + MultiEdit=1, classifier isLargeWrite |
| Search routed | ✓ | byToolName.Glob=1, classifier isBroadGlob |
| through MCP | ✓ | Nudges point at prism_session:* / prism_dev:* actions; takeup hook credits them |
| token savings | ✓ | Telemetry sidecar records every fire + take-up |
| utilize system-viz | ✓ | ghost.token_savings_pivot roost in system-graph (1 + 7 + 7 = 15 nodes) |
| max high roi | ✓ | 7 follow-ups closed across iter7–iter17 |
| wired in | ✓ | PreToolUse hook (mcp-route-suggest) + PostToolUse hook (mcp-route-takeup) both in settings.json; auto-mirror C:→H: |

## Ship history (19 iters)

| # | Commit | Scope |
|---|---|---|
| 1 | `a592012873` | Grep added to allowlist; isBroadGrep classifier |
| 2 | `2112520b0c` | bash+read+write+search routes; 4 more classifiers |
| 3 | `eb55b19810` | atomic-write telemetry sidecar; 9 classifiers tracked |
| 4 | `8aa3a621c7` | /route-suggest-stats skill |
| 5 | `2a74da853e` | doc-reflection memory + obsidian mirror |
| 6 | `8dbac9f11b` | phantom prism_dev:bash fix + wiki entry |
| 7 | `cd7738d0d1` | /system-viz roost (7/7 generator tests) |
| 8 | `fbf39cb036` | take-rate measurement hook (13/13 tests) |
| 9 | `99fbc7fe11` | measured take-rate in skill |
| 10 | `de2d9510b2` | per-slot ROI breakdown |
| 11 | `f837cab980` | bySlot in skill output |
| 12 | `b4df05d223` | MultiEdit latent-bug fix |
| 13 | `527fd98db0` | _ACTION_TO_CLASSIFIERS 4→7 actions |
| 14 | `0f15a2c1b7` | defensive 256KB sidecar size cap |
| 15 | `2509752a6a` | wiki extended through iter14 |
| 16 | `443ac95a24` | hook wiki cross-ref |
| 17 | `91671aeee5` | mcp-route-takeup wiki entry |
| 18 | `1dbdcd4351` | reference memory updated 4-iter → 17-iter |
| 19 | _(this commit)_ | final rollup snapshot + system-viz augmentation regen |

## Artifacts on disk

- **Source:** `H:/prism/.claude/hooks/mcp-route-suggest.mjs` (PreToolUse, fires nudges + writes sidecar)
- **Source:** `H:/prism/.claude/hooks/mcp-route-takeup.mjs` (PostToolUse, credits take-ups)
- **Source:** `H:/prism/scripts/generate-token-savings-pivot-features.mjs` (system-viz augmentation generator)
- **Tests:** 7/7 generator + 13/13 takeup = 20/20 PASS
- **Skill:** `H:/prism/.claude/commands/route-suggest-stats.md` (haiku, effort=low)
- **Sidecar:** `H:/prism/state/shared/mcp-route-suggest-stats.json` (atomic-write, schema 1.0.0)
- **Augmentation:** `H:/prism/state/shared/system-viz/token-savings-pivot-augmentation.json` (gitignored, regen by FAST[])
- **Wiki:** `H:/prism/knowledge/wiki/architecture/token-savings-pivot.md` (milestone home)
- **Wiki:** `H:/prism/knowledge/wiki/architecture/hooks/runtime/mcp-route-suggest.md` (cross-ref)
- **Wiki:** `H:/prism/knowledge/wiki/architecture/hooks/runtime/mcp-route-takeup.md` (companion hook)
- **Memory:** `reference_token_savings_pivot_2026_05_22.md` (obsidian + auto-memory mirror)
- **MEMORY.md:** Recent-work pointer entry

## Wiring verification

- `C:/Users/wompu/.claude/settings.json` PostToolUse[0].hooks[4] = `mcp-route-takeup.mjs` (added iter8)
- `C:/Users/wompu/.claude/settings.json` PreToolUse already had `mcp-route-suggest.mjs` (pre-existing)
- Auto-mirrored to `H:/.claude/settings.json` via `c-to-h-mirror.mjs`
- `scripts/regen-viz.mjs` FAST[] includes `generate-token-savings-pivot-features.mjs`
- `scripts/merge-augmentations.mjs` `loadOptional("token-savings-pivot-augmentation.json")` + splice block

## Disable knobs (full inventory)

- `PRISM_MCP_ROUTE_TELEMETRY_DISABLE=1` — sidecar fire-writes only
- `PRISM_MCP_ROUTE_TAKEUP_DISABLE=1` — sidecar takeup-writes only
- `PRISM_HOOK_PROFILE` — disable either hook via per-session profile
- `PRISM_PRE_BASH_GRAPH_INJECT=0` — separate hook, not part of TSP
