---
name: token-savings-pivot
type: architecture
status: live
shipped: 2026-05-22
slot: alpha
schemaVersion: 1.0.0
related:
  - mcp-route-suggest
  - ollama-route-check
  - atomic-write-idempotency-patterns
  - session-continuity-stack
---

# TOKEN-SAVINGS-PIVOT — route-suggest extension + telemetry

User-directed pivot 2026-05-22 in slot `alpha`. Goal: *"expand our token savings with grep, bash, read, write, search tool calls ran through the mcp server for token savings, utilize system-viz | max high roi wired in."*

Built a complete feedback loop across **6 iterations** that surfaces TOKEN-SAVE nudges on every qualifying tool call across all 26 fleet slots, records each fire to an atomic-write sidecar, and exposes the cumulative ROI via an operator skill.

## Architecture

```
Tool call (any chat in fleet)
   └→ PreToolUse hook chain
       └→ mcp-route-suggest.mjs
           ├─ allowlist gate (9 tools: Bash, Read, Edit, Write, MultiEdit, Grep, Glob, WebSearch, WebFetch)
           ├─ Ollama nudge (Bash only, broad-shell heuristic)
           ├─ Regex nudges (5 tool-class branches + 4 metadata branches)
           ├─ _recordRouteFires() → atomic-write sidecar at state/shared/mcp-route-suggest-stats.json
           └─ additionalContext → model sees "TOKEN-SAVE — …" nudge before tool fires
                                                      ↓
                                        model takes nudge (assumed 30% take-rate per CLAUDE.md §TOKEN ECONOMY)
                                                      ↓
                                              ~5-50K tokens saved per fire
                                                      ↓
Operator → /route-suggest-stats skill → reads sidecar → reports cumulative ROI
```

## 9 classifiers

| Classifier | Fires when |
|---|---|
| `isBroadGrep` | Grep with `output_mode:'content'` + no `glob`/`type` + prism path |
| `isVerboseBash` | Bash starts with `cat`, `git log --all`, `git log -p`, `find /`, `npm ls`, `pip list`, `docker ps -a`, `docker logs`, `kubectl get`, `tail -f` |
| `isLargeRead` | Read of ENGINE_DIGEST / DISPATCHER_DIGEST / DIRECTORY_DIGEST / PRISM-INVENTORY-LATEST / BASELINE_INVENTORY / CODE_SYSTEM_INDEX / MEMORY / CLAUDE / wiki/index |
| `isLargeWrite` | Write/Edit/MultiEdit with content > 50,000 chars |
| `isBroadGlob` | Glob with `**/*` pattern + no `path` |
| `isBroadWebSearch` | WebSearch with no `allowed_domains` |
| `ollama` | Bash broad-shell branch where Ollama bridge returned a route suggestion |
| `backendAuditChain` | Edit of `*.ts` under `mcp-server/` — suggests `run-dev-audit-chain.ts` |
| `doctrineSurface` | Read of a known doctrine file (CLAUDE.md, MEMORY.md, etc.) — first time per session per file |

## Iter-by-iter ship history

| Iter | Commit | Scope |
|---|---|---|
| 1 | `a592012873` | Grep added to allowlist; `isBroadGrep` classifier; TOKEN-SAVE nudge → master_index_query / code_search |
| 2 | `2112520b0c` | Allowlist + Glob/WebSearch/WebFetch; 4 classifiers (verboseBash, largeRead, largeWrite, broadSearch); 4 new nudges |
| 3 | `eb55b19810` | Atomic-write telemetry sidecar; 9 classifiers tracked; per-PID temp+rename; best-effort try/catch (R12 inverted for advisory IO) |
| 4 | `8aa3a621c7` | `/route-suggest-stats` skill (haiku, low-effort); reports totalFires + breakdown + lower-bound ROI |
| 5 | `2a74da853e` | Doc-reflection: reference memory + obsidian mirror + MEMORY.md pointer |
| 6 | `8dbac9f11b` | Phantom `prism_dev:bash` reference removed from nudge text; wiki entry shipped |
| 7 | `cd7738d0d1` | `/system-viz` roost — `generate-token-savings-pivot-features.mjs` + regen-viz FAST[] + merge-augmentations splice (closes follow-up #1) |
| 8 | `fbf39cb036` | Take-rate measurement — `mcp-route-takeup.mjs` PostToolUse hook + sidecar `takeups[]` / `takeupTotals` (closes follow-up #2, 13/13 tests) |
| 9 | `99fbc7fe11` | `/route-suggest-stats` uses MEASURED take-rate when available; wiki follow-ups #1+#2 marked CLOSED |
| 10 | `de2d9510b2` | Per-slot ROI breakdown — `bySlot{}` + `recent[].slot` via chat-slots.json resolution (closes follow-up #3) |
| 11 | `f837cab980` | `/route-suggest-stats` surfaces bySlot top-3 + slot column in recent-fires |
| 12 | `b4df05d223` | MultiEdit latent-bug fix — `isLargeWrite` now sums `edits[].new_string` |
| 13 | `527fd98db0` | `_ACTION_TO_CLASSIFIERS` expanded 4→7 actions — adds tool_route_best, dispatcher_map_compact, file_read |
| 14 | `0f15a2c1b7` | Defensive 256KB sidecar size cap — 3-tier truncation (100→25→10→skip) |

## Why this is "wired in"

- **PreToolUse path** — hook is in `C:/Users/wompu/.claude/settings.json` (auto-mirrored C:→H: every edit). Fires on every qualifying tool call across all 26 fleet chats automatically.
- **Sidecar path** — atomic-write JSON at `state/shared/mcp-route-suggest-stats.json`. State survives `/compact`, host restart, fleet expansion. 26-chat-fleet safe (concurrent RMW may lose 1 increment under race, NEVER corrupts file).
- **Skill path** — `/route-suggest-stats` discoverable via 6 trigger keywords. Operator never has to grep the sidecar JSON manually.
- **Doc path** — this wiki entry + `reference_token_savings_pivot_2026_05_22.md` memory + MEMORY.md pointer.

## Doctrine touchpoints

- **CLAUDE.md §TOKEN ECONOMY** — overarching token-savings doctrine; this milestone is the implementation.
- **CLAUDE.md §SESSION CONTINUITY STACK** — the telemetry sidecar mirrors `token-awareness-sidecar` (same atomic-write per-PID-temp pattern).
- **`scripts/lib/atomic-json.mjs`** — single canonical atomic JSON writer. The route-suggest sidecar mirrors its safety properties inline (it's in a hook, not a script, so importing the lib would require bundling).
- **R12 fail-loud** — **INVERTED** here for telemetry: telemetry MUST NEVER block the hook. Try/catch swallows all telemetry IO errors silently. This is the correct call for advisory-only state — the hook's job is to suggest token-savings, not to report on its own measurement infrastructure.

## Disable knobs

- `PRISM_MCP_ROUTE_TELEMETRY_DISABLE=1` — sidecar writes only.
- `PRISM_HOOK_PROFILE` — disable the entire hook (per-session profile).
- `PRISM_PRE_BASH_GRAPH_INJECT=0` — disable the unrelated pre-bash graph context (different hook).

## Known follow-ups

1. ~~system-viz feature for the telemetry sidecar~~ **CLOSED iter7 (`cd7738d0d1`)** — `ghost.token_savings_pivot` roost now in the system-viz graph; child nodes per classifier + per tool name; discoverable via `/system-viz` + `/master-index`.
2. ~~Take-rate measurement~~ **CLOSED iter8 (`fbf39cb036`)** — `mcp-route-takeup.mjs` PostToolUse hook + sidecar `takeups[]` / `takeupTotals`; `/route-suggest-stats` (iter9 update) uses measured take-rate when `totalTakeups > 0`, falls back to 30% doctrine otherwise.
3. ~~Per-chat ROI dashboard~~ **CLOSED iter10+iter11 (`de2d9510b2`+`f837cab980`)** — `bySlot{}` aggregate via chat-slots.json resolution; `/route-suggest-stats` surfaces top-3 slots.
4. **Ollama-routed Bash nudge** — when the Ollama bridge returns a suggestion, the regex branch is skipped entirely. Counting `ollama` classifier separately preserves the distinction. (Partially addressed — `_classifierFromMessage` recognizes the "🤖 Suggested route:" prefix, but iter-3's recorder lumps it under whichever tool fired.)
5. **MultiEdit detection** — **CLOSED iter12 (`b4df05d223`)**.
6. **Take-up coverage** — **CLOSED iter13 (`527fd98db0`)** — _ACTION_TO_CLASSIFIERS expanded 4→7.
7. **Sidecar size safety** — **CLOSED iter14 (`0f15a2c1b7`)** — defensive 256KB cap.

## Cross-refs

- [[mcp-route-suggest]] — the PreToolUse hook itself.
- [[ollama-route-check]] — sister system for the Ollama offload route.
- [[atomic-write-idempotency-patterns]] — atomic-write doctrine the sidecar mirrors.
- [[session-continuity-stack]] — same per-PID-temp+rename pattern.
- `reference_token_savings_pivot_2026_05_22.md` — Obsidian memory with detailed iter-by-iter notes.
