---
name: token-savings-pivot-2026-05-22
description: "TOKEN-SAVINGS-PIVOT — 17-iter compounding system: 5 tool classes routed through mcp-route-suggest; 9 classifiers; atomic-write telemetry sidecar; take-rate measurement hook; per-slot ROI breakdown; system-viz roost; /route-suggest-stats skill; wiki + memory + cross-refs."
aliases: reference_token_savings_pivot_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.223Z
---


# TOKEN-SAVINGS-PIVOT — 2026-05-22, slot alpha

User-directed pivot mid-loop from U-BRIDGE-WIRE-MILL: *"expand our token savings with grep, bash, read, write, search tool calls ran through the mcp server for token savings, utilize system-viz | max high roi wired in"*. Built a complete feedback loop across **17 iterations**.

## Layered iters (all on `cad-fusion-live-ms0`)

**iter 1 — `a592012873` `[TOKEN-SAVINGS-PIVOT]/U-GREP-ROUTE`** (slot:alpha)
- Added `Grep` to `mcp-route-suggest.mjs` PreToolUse allowlist.
- Exported `isBroadGrep` classifier — content output_mode + no glob/type + prism path = broad.
- Injected TOKEN-SAVE nudge pointing at `prism_session:master_index_query` + `prism_dev:code_search` + narrowing patterns.
- Test file `mcp-route-suggest.test.mjs` (10 unit + 5 subprocess integration cases).

**iter 2 — `2112520b0c` `[TOKEN-SAVINGS-PIVOT]/U-MCP-ROUTE-ALL5`** (slot:alpha)
- Extended allowlist: `Glob`, `WebSearch`, `WebFetch`.
- Added 4 classifiers: `isVerboseBash` (cat/git log --all/git log -p/find/docker logs/kubectl get/tail -f), `isLargeRead` (ENGINE_DIGEST/DISPATCHER_DIGEST/PRISM-INVENTORY-LATEST/CLAUDE/MEMORY/wiki-index), `isLargeWrite` (>50KB content), `isBroadSearch` (Glob `**/*` no path; WebSearch no allowed_domains).
- 4 new TOKEN-SAVE branches in `getRegexSuggestions`.
- Smoke 7/7: bash-verbose fires, read-digest fires, write-60KB fires, glob-`**/*` fires, websearch-unbounded fires, read-README silent, websearch-scoped silent.

**iter 3 — `eb55b19810` `[TOKEN-SAVINGS-PIVOT]/U-MCP-ROUTE-TELEMETRY`** (slot:alpha)
- Atomic-write telemetry sidecar at `state/shared/mcp-route-suggest-stats.json`.
- Schema 1.0.0: `totalFires`, `byToolName`, `byClassifier`, `recent[]` (cap 100), `createdAt`, `lastFireAt`.
- 9 classifiers tracked: `isBroadGrep`, `isVerboseBash`, `isLargeRead`, `isLargeWrite`, `isBroadGlob`, `isBroadWebSearch`, `ollama`, `backendAuditChain`, `doctrineSurface`.
- Per-PID temp + rename atomicity (mirrors `scripts/lib/atomic-json.mjs`).
- 26-chat-fleet safe: concurrent RMW may lose 1 increment under race, NEVER corrupts file.
- Best-effort try/catch: telemetry IO NEVER fails the hook (advisory only).
- Disable knob: `PRISM_MCP_ROUTE_TELEMETRY_DISABLE=1`.

**iter 4 — `8aa3a621c7` `[TOKEN-SAVINGS-PIVOT]/U-ROUTE-STATS-SKILL`** (slot:alpha)
- `/route-suggest-stats` skill (`.claude/commands/route-suggest-stats.md`).
- Reads iter-3 sidecar, reports totalFires + topToolName + topClassifier + last-10 recent + lower-bound ROI estimate (`totalFires × 0.30 take-rate × 8K tokens/fire`).
- model=haiku, effort=low — zero Claude synthesis tokens.
- Triggers: "route suggest stats", "token save stats", "mcp route roi", "how much did routing save", "route-suggest telemetry".

**iter 5 — `2a74da853e` `[TOKEN-SAVINGS-PIVOT]/U-MEMORY-DOC`** — doc-reflection (memory + obsidian + MEMORY.md pointer).

**iter 6 — `8dbac9f11b` `[TOKEN-SAVINGS-PIVOT]/U-PHANTOM-FIX-WIKI`** — phantom `prism_dev:bash` reference fixed + wiki entry shipped at `knowledge/wiki/architecture/token-savings-pivot.md`.

**iter 7 — `cd7738d0d1` `[TOKEN-SAVINGS-PIVOT]/U-SYSTEM-VIZ-FEATURE`** — `/system-viz` roost. New `scripts/generate-token-savings-pivot-features.mjs` (pure generator, 7/7 tests) + regen-viz FAST[] registration + merge-augmentations splice. Output: `ghost.token_savings_pivot` L8 roost + per-classifier + per-tool children.

**iter 8 — `fbf39cb036` `[TOKEN-SAVINGS-PIVOT]/U-MCP-ROUTE-TAKEUP`** — take-rate measurement. New PostToolUse hook `.claude/hooks/mcp-route-takeup.mjs` (13/13 tests). Extends sidecar with `takeups[]` + `takeupTotals`. Credits TOKEN-SAVE nudges when the model invokes a suggested prism_*:* MCP action within 60s. Knob: `PRISM_MCP_ROUTE_TAKEUP_DISABLE=1`.

**iter 9 — `99fbc7fe11` `[TOKEN-SAVINGS-PIVOT]/U-SKILL-MEASURED-RATE`** — `/route-suggest-stats` uses MEASURED take-rate when `takeupTotals.totalTakeups > 0`, falls back to 30% doctrine otherwise.

**iter 10 — `de2d9510b2` `[TOKEN-SAVINGS-PIVOT]/U-PER-SLOT-ROI`** — sessionId → slot resolution via `state/shared/chat-slots.json`. Sidecar gains `bySlot{}` aggregate + `recent[].slot` field. 3 resolution strategies (additive).

**iter 11 — `f837cab980` `[TOKEN-SAVINGS-PIVOT]/U-SKILL-PER-SLOT`** — `/route-suggest-stats` surfaces `bySlot` top-3 + slot column in recent-fires.

**iter 12 — `b4df05d223` `[TOKEN-SAVINGS-PIVOT]/U-MULTIEDIT-FIX`** — MultiEdit latent-bug fix. `isLargeWrite` now sums `edits[].new_string` (previously slipping past entirely).

**iter 13 — `527fd98db0` `[TOKEN-SAVINGS-PIVOT]/U-TAKEUP-EXPAND-MAP`** — `_ACTION_TO_CLASSIFIERS` expanded 4 → 7 actions. Adds `prism_session:tool_route_best`, `prism_session:dispatcher_map_compact`, `prism_dev:file_read`.

**iter 14 — `0f15a2c1b7` `[TOKEN-SAVINGS-PIVOT]/U-SIDECAR-SIZE-CAP`** — defensive 256KB sidecar size cap. 3-tier truncation (100 → 25 → 10 → skip).

**iter 15 — `2509752a6a` `[TOKEN-SAVINGS-PIVOT]/U-WIKI-UPDATE-7-14`** — wiki entry extended through iter14 + follow-ups marked CLOSED.

**iter 16 — `443ac95a24` `[TOKEN-SAVINGS-PIVOT]/U-WIKI-CROSSREF`** — hook wiki entry (`knowledge/wiki/architecture/hooks/runtime/mcp-route-suggest.md`) cross-refs back to the TSP milestone, outside the AUTO-START block so regenerator preserves.

**iter 17 — `91671aeee5` `[TOKEN-SAVINGS-PIVOT]/U-WIKI-TAKEUP`** — wiki entry for `mcp-route-takeup` hook. Purpose, 6-step how-it-works, 7-entry action map, 5 safety properties, cross-refs.

## Architecture

```
Tool call → PreToolUse hook chain → mcp-route-suggest.mjs
                                    ├─ allowlist check (Bash/Read/Edit/Write/MultiEdit/Grep/Glob/WebSearch/WebFetch)
                                    ├─ Ollama nudge (Bash only, broad shell)
                                    ├─ Regex nudges (5 tool-class branches + 4 metadata branches)
                                    ├─ _recordRouteFires() → atomic-write sidecar
                                    └─ additionalContext → model sees TOKEN-SAVE nudge
                                                              ↓
                                              model takes nudge (assumed 30%)
                                                              ↓
                                                   tokens saved (~5-50K/fire)

Operator → /route-suggest-stats → reads sidecar → reports cumulative ROI
```

## Why this is "wired in"

- **PreToolUse** path: hook is in `C:/Users/wompu/.claude/settings.json` (auto-mirrored to H:) → fires on EVERY tool call across all 26 fleet slots.
- **Sidecar** path: written on every nudge fire → state survives across sessions, /compact boundaries, host restarts.
- **Skill** path: discoverable via `/route-suggest-stats` trigger keywords → operator sees ROI without grepping JSON.
- All 4 layers ship in HEAD; all 4 commits on `cad-fusion-live-ms0` branch.

## Smoke verification (iter-3 telemetry)

```
Fire 1: Grep broad           → isBroadGrep           ✓
Fire 2: Bash verbose (cat)   → isVerboseBash          ✓
Fire 3: Read PRISM-INVENTORY → isLargeRead + doctrine ✓ (2 classifiers — correct, file is BOTH)
Fire 4: Glob **/*             → isBroadGlob            ✓
Fire 5 (control): Read README → 0 increments           ✓
```
After 5 fires the sidecar correctly showed `totalFires=5`, `byToolName={Grep:1, Read:2, Bash:1, Glob:1}`, `byClassifier={isBroadGrep:1, doctrineSurface:1, isVerboseBash:1, isLargeRead:1, isBroadGlob:1}`.

## Doctrine touchpoints

- **CLAUDE.md §TOKEN ECONOMY** — overarching token-savings doctrine; this milestone is the implementation.
- **CLAUDE.md §[[reference_session_continuity_stack_2026_05_15|SESSION CONTINUITY STACK]]** — sidecar pattern mirrors token-awareness-sidecar (atomic-write, per-PID temp).
- **`atomic-json.mjs`** — single canonical atomic writer; route-suggest sidecar mirrors the per-PID-temp+rename safety properties inline (it's in a hook, not a script, so can't import the lib without bundling).
- **R12 fail-loud** — INVERTED here for telemetry: telemetry MUST NEVER block the hook. Try/catch swallows all telemetry IO errors silently. This is the correct call for advisory-only state.

## Cross-refs

- [[reference_compaction_optimal_2026_05_22]] — sister system (token-awareness sidecar); same atomic-write+per-PID-temp pattern.
- [[feedback_settings_wiring_drift_2026_05_16]] — settings wiring discipline (hook is in PreToolUse chain, mirrored C:→H:).
- [[reference_h8_misattribution_2026_05_20]] — peer-absorption pattern; relevant during iter1's index-lock contention.

## Known follow-ups

1. **No system-viz feature for the telemetry sidecar** — should land in `state/shared/system-viz/system-graph.json` as `infrastructure.token_savings_pivot` so it's discoverable via `/system-viz` and `/master-index`.
2. **No wiki entry** — `knowledge/wiki/architecture/token-savings-pivot.md` would close the doc-reflection rule (CLAUDE.md §Doc reflection rule).
3. **Phantom `prism_dev:bash` reference in iter-2 nudge text** — the suggested route mentions `prism_dev:bash (server-side truncate+compact)` but `bash` is NOT an action in devDispatcher. Either build the action or fix the nudge text. (`prism_dev:code_search` and `prism_dev:file_write` DO exist.)
4. **Take-rate measurement** — the 30% take-rate in `/route-suggest-stats` is doctrine, not measured. A second sidecar tracking "fires that were followed by the suggested MCP action within N ticks" would give actual ROI.

## Disable knobs (all)

- `PRISM_MCP_ROUTE_TELEMETRY_DISABLE=1` — disables sidecar writes only.
- `PRISM_HOOK_PROFILE` — disables the entire mcp-route-suggest hook (per-session profile).
- `PRISM_RTK_REMINDER_OFF=1` — disables the unrelated RTK reminder noise.
