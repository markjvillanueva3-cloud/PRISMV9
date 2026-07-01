# Opus 4.7 / 4.5 Profile A/B Harness

## Context

Mark wants to benchmark **Opus 4.7 [1m]** (current, 1M context) against **Opus 4.5 20251101** (200K context) without manually editing settings between runs. The risks of manual swaps are real:

- Model selection lives in `~/.claude/settings.json` env block (`CLAUDE_CODE_DISABLE_1M_CONTEXT`), which is auto-mirrored across `C:/Users/Mark Villanueva/.claude/` ↔ `H:/.claude/` and shared with 6 concurrent chats.
- Token-window-sensitive constants are scattered: `precompact-auto-trigger.mjs` (SOFT/HARD/CAP), `lib/common.sh` (`PRISM_MAX_CONTEXT_TOKENS`), GSD docs (`GSD_MICRO.md` line 319 hardcodes "200K context limits"), and several state files (`COGNITIVE_BUDGET.json` literally contains `"tokensRemaining": 200000`).
- A single forgotten file leaves the system in a hybrid state — e.g., env vars say 1M but precompact fires at 185K, killing the test.

**Outcome:** A profile-overlay system (`H:/prism/.claude-profiles/`) plus a single PowerShell switch script. One command flips every window-sensitive parameter in lockstep; memory/wiki/JM Die data stay shared so the test compares model behavior on the same workload.

## Architecture: Overlay swap, not directory clone

**Live config tree stays at the canonical paths Claude Code reads.** Profile dirs hold *override copies* of just the files that differ between 4.7 and 4.5. Switch script copies overrides into the live paths and snapshots model-tied state on the way out.

Why not full directory clone:
- The c-to-h-mirror hook (`H:/prism/.claude/hooks/c-to-h-mirror.mjs`) replicates `C:/Users/Mark Villanueva/.claude/{settings.json, hooks/, commands/, ...}` → `H:/.claude/...` on every save. A duplicate `.claude-opus45/` dir would not be mirrored, and any duplicate hook files would get registered twice in the hooks list and double-fire.
- The hooks list in settings.json is identical between profiles (we only change *content* of one hook, not which hooks fire).
- MCP server at port 3100 is process-shared and model-agnostic.

**Mirror-safety:** Sibling dirs like `H:/prism/.claude-profiles/` are NOT touched by the mirror — confirmed in `c-to-h-mirror.mjs:84` (`if (!isRoot && !isSubdir) exit(0)`). Safe to create.

## Files to clone (per profile)

| # | Path (live) | Why it differs | Source for 4.5 variant |
|---|---|---|---|
| 1 | `C:/Users/Mark Villanueva/.claude/settings.json` (env block delta only) | `CLAUDE_CODE_DISABLE_1M_CONTEXT`: `"0"` (4.7) vs `"1"` (4.5); `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` may differ | Hand-authored env-delta JSON |
| 2 | `H:/prism/.claude/hooks/precompact-auto-trigger.mjs` | SOFT=800K/HARD=900K/CAP=1M (4.7) vs SOFT=175K/HARD=185K (4.5) | **Already exists at `precompact-auto-trigger.mjs.pre-1m-backup`** — half the work is done |
| 3 | `H:/prism/mcp-server/data/docs/gsd/GSD_MICRO.md` | Line 319 hardcodes "Strategies that survive **200K** context limits" — accurate for 4.5, stale for 4.7 | Author 1M variant; current file becomes the 4.5 variant |
| 4 | `H:/prism/CLAUDE.md` (optional, light edits) | "Compact every 2-3 units" cadence guidance differs between windows | Author 1M variant; current file becomes the 4.5 variant |

**NOT cloned (shared across profiles):**
- All other hook files, hook list registration, slash commands, agents, plugins, skills.
- MCP server `dist/`, `.mcp.json`.
- Memory vault (`H:/prism/knowledge/memories/`), wiki (`H:/prism/knowledge/wiki/`).
- JM Die data, engine/dispatcher/action catalogs, all `*_INVENTORY.json`, `*_MANIFEST.json`.
- `~/.claude/CLAUDE.md` (user-global, not project-specific).
- `H:/prism/.claude/settings.json` (project-level — hook registry only, no token thresholds).

## State snapshot-on-switch

On every switch, the outgoing profile's "model-tied" state is snapshotted into its own dir. Incoming profile's snapshot (if present) is restored. First switch into a profile with no snapshot leaves live state untouched (clean baseline).

State files to snapshot (per agent inventory):
- `H:/prism/mcp-server/data/state/SCRUTINY_LEDGER.json`
- `H:/prism/mcp-server/data/state/COGNITIVE_BUDGET.json`
- `H:/prism/mcp-server/data/state/agent-profiles.json`
- `H:/prism/mcp-server/data/state/extended-thinking-log.json`
- `H:/prism/mcp-server/data/state/reasoning-chains.json`
- `H:/prism/mcp-server/data/state/ollama-offload-stats.json`
- `H:/prism/mcp-server/data/state/CONSENSUS_NEURAL_FEED.jsonl`
- `H:/prism/mcp-server/data/state/META_LEARNING_LEDGER.jsonl`
- `H:/prism/mcp-server/data/state/ERROR_LEARN_LEDGER.jsonl`
- `H:/prism/mcp-server/data/state/session-learning-log.jsonl`

Snapshot uses **copy** (per `[[feedback_copy_never_move]]` — file ops use cp/Copy-Item/Write, never move/rm). Old snapshot is overwritten by current live state on switch-out.

## Profile dir layout

```
H:/prism/.claude-profiles/
├── README.md                            # how the harness works + how to add a third profile
├── ACTIVE                               # plain text: "opus47-1m" or "opus45-200k"
├── opus47-1m/
│   ├── manifest.json                    # source→dest map, owned-state list
│   ├── settings-env.json                # env-block delta to deep-merge into ~/.claude/settings.json
│   ├── precompact-auto-trigger.mjs      # 1M-tuned (current live file content)
│   ├── CLAUDE.md                        # 1M-tuned project doctrine
│   ├── gsd/
│   │   └── GSD_MICRO.md                 # 1M-tuned (line 319 reads "1M context")
│   └── state-snapshot/                  # populated on switch-out from this profile
│       ├── SCRUTINY_LEDGER.json
│       ├── COGNITIVE_BUDGET.json
│       └── ...
└── opus45-200k/
    ├── manifest.json
    ├── settings-env.json                # env: CLAUDE_CODE_DISABLE_1M_CONTEXT="1"
    ├── precompact-auto-trigger.mjs      # 200K-tuned (copy of .pre-1m-backup)
    ├── CLAUDE.md                        # 200K-tuned project doctrine
    ├── gsd/
    │   └── GSD_MICRO.md                 # 200K-tuned (current live file)
    └── state-snapshot/
```

Each `manifest.json` declares the canonical (source → live destination) mapping so the script is data-driven (adding a fifth file later = add an entry, no script edits).

## Switch script

**Path:** `H:/prism/scripts/switch-claude-profile.ps1`

**Usage:**
```powershell
.\scripts\switch-claude-profile.ps1 -Target 47        # → Opus 4.7 [1m]
.\scripts\switch-claude-profile.ps1 -Target 45        # → Opus 4.5 200K
.\scripts\switch-claude-profile.ps1 -Status           # show active profile + last switch time
.\scripts\switch-claude-profile.ps1 -Target 45 -Force # bypass peer-active abort
```

**Flow:**
1. Resolve target profile dir from `-Target` arg.
2. Read `ACTIVE` to know current profile.
3. **Peer guard:** call `prism_context:presence` (or read `state/shared/CHAT_BUS_PRESENCE.json`); if any peer chat heartbeat <10min and `-Force` not set, list peers and exit 1.
4. Verify target profile is well-formed (manifest + all listed files exist).
5. Write timestamped pre-switch backup to `H:/prism/.claude-profiles/.backups/<utc-iso>/` (live copies of every file the manifest will replace, plus current state-snapshot list).
6. Snapshot live state files into outgoing profile's `state-snapshot/`.
7. For each `(source, dest)` in target manifest: `Copy-Item -Force` source → dest.
8. Deep-merge target's `settings-env.json` env block into `C:/Users/Mark Villanueva/.claude/settings.json` (preserves other env keys; the c-to-h-mirror replicates to `H:/.claude/settings.json` automatically on next save event — but we'll write to both atomically to dodge the race).
9. Restore incoming profile's `state-snapshot/*` into live state paths (skip if dir empty — fresh baseline).
10. Update `ACTIVE` text file with new profile name + write `LAST_SWITCH.json` (UTC, who, from, to).
11. Print red banner: **"Restart Claude Code (`/exit` then relaunch) for env-var changes to take effect."** Env vars are read by Claude Code at session start, not mid-session.

**Edge cases handled:**
- Switching to the already-active profile → no-op with status print.
- Profile dir missing required file → abort, no partial swap.
- Snapshot dir missing → first-time switch into profile, leave live state alone.
- Settings.json deep-merge clash → only the env keys in `settings-env.json` are touched; user's hand-edits to other keys (permissions, theme, etc.) are preserved.
- c-to-h-mirror race on settings.json → write to C: side first (canonical), let mirror replicate; if H: is stale on next chat startup, mirror will catch up next save event.

## Critical files (paths to be created/modified)

**Created:**
- `H:/prism/.claude-profiles/README.md`
- `H:/prism/.claude-profiles/ACTIVE` (text marker)
- `H:/prism/.claude-profiles/LAST_SWITCH.json`
- `H:/prism/.claude-profiles/opus47-1m/manifest.json`
- `H:/prism/.claude-profiles/opus47-1m/settings-env.json`
- `H:/prism/.claude-profiles/opus47-1m/precompact-auto-trigger.mjs` (copy of current live)
- `H:/prism/.claude-profiles/opus47-1m/CLAUDE.md` (lightly edited copy)
- `H:/prism/.claude-profiles/opus47-1m/gsd/GSD_MICRO.md` (1M-tuned)
- `H:/prism/.claude-profiles/opus45-200k/manifest.json`
- `H:/prism/.claude-profiles/opus45-200k/settings-env.json`
- `H:/prism/.claude-profiles/opus45-200k/precompact-auto-trigger.mjs` (copy of `.pre-1m-backup`)
- `H:/prism/.claude-profiles/opus45-200k/CLAUDE.md` (200K-tuned copy)
- `H:/prism/.claude-profiles/opus45-200k/gsd/GSD_MICRO.md` (current live, 200K-mentioning)
- `H:/prism/scripts/switch-claude-profile.ps1`

**Modified (only on switch — not at setup):**
- `C:/Users/Mark Villanueva/.claude/settings.json` env block (deep-merge)
- `H:/prism/.claude/hooks/precompact-auto-trigger.mjs` (replaced)
- `H:/prism/CLAUDE.md` (replaced)
- `H:/prism/mcp-server/data/docs/gsd/GSD_MICRO.md` (replaced)

**At setup:** none of the live paths are mutated. The first switch is when live config changes.

## Existing utilities to reuse

- `H:/prism/.claude/hooks/precompact-auto-trigger.mjs.pre-1m-backup` → drop-in source for 4.5 profile.
- `prism_context:presence` action → peer-active check.
- `H:/prism/.claude/hooks/c-to-h-mirror.mjs:84` (`isRoot && !isSubdir` predicate) → confirms profile dir is mirror-safe.
- `H:/prism/.claude/helpers/agent-coordination.mjs post` → log switch events to AGENT_CHAT.

## Verification

After implementation, run end-to-end:

1. **Setup OK:**
   ```powershell
   ls H:/prism/.claude-profiles/opus47-1m/
   ls H:/prism/.claude-profiles/opus45-200k/
   cat H:/prism/.claude-profiles/ACTIVE     # should print "opus47-1m"
   ```

2. **Status shows current profile:**
   ```powershell
   .\scripts\switch-claude-profile.ps1 -Status
   # → Active: opus47-1m | Last switch: never | CLAUDE_CODE_DISABLE_1M_CONTEXT=0
   ```

3. **Switch to 4.5 (with peers active → expect abort):**
   ```powershell
   .\scripts\switch-claude-profile.ps1 -Target 45
   # → ABORT: 3 peer chats active (claude-845cf238, claude-bee98bb8, claude-a09ce89e). Re-run with -Force to override.
   ```

4. **Force switch + verify env flip:**
   ```powershell
   .\scripts\switch-claude-profile.ps1 -Target 45 -Force
   node -e "console.log(JSON.parse(require('fs').readFileSync('C:/Users/Mark Villanueva/.claude/settings.json','utf8')).env.CLAUDE_CODE_DISABLE_1M_CONTEXT)"
   # → "1"
   ```

5. **Verify hook content swapped:**
   ```powershell
   Select-String -Path H:/prism/.claude/hooks/precompact-auto-trigger.mjs -Pattern "const SOFT"
   # → const SOFT = 175_000
   ```

6. **Verify GSD_MICRO swapped:**
   ```powershell
   Select-String -Path H:/prism/mcp-server/data/docs/gsd/GSD_MICRO.md -Pattern "context limits"
   # → "Strategies that survive 200K context limits:"
   ```

7. **Restart Claude Code session, confirm model:**
   - `/exit`, relaunch.
   - In new session, `/status` (or whatever Claude Code exposes) should report Opus 4.5.
   - Send a long prompt, observe precompact fires near 175K not 800K.

8. **Switch back, verify state snapshot restored:**
   ```powershell
   .\scripts\switch-claude-profile.ps1 -Target 47 -Force
   diff H:/prism/.claude-profiles/opus47-1m/state-snapshot/COGNITIVE_BUDGET.json H:/prism/mcp-server/data/state/COGNITIVE_BUDGET.json
   # → identical (snapshot restored)
   ```

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Multi-chat env-var drift (5 other chats keep using stale env after switch) | Peer-guard abort with `-Force` override; banner on success "restart all chats" |
| c-to-h-mirror clobbers settings.json mid-write | Atomic write: write temp file + rename; mirror reads consistent state |
| Hook content swap on a live hook that's currently executing | Pre/post-tool hooks fire briefly; race window is microseconds. Switch script aborts if a hook lockfile is detected. |
| User hand-edits live `precompact-auto-trigger.mjs` after switch — switching profiles loses their edit | Pre-switch timestamped backup at `.backups/<utc-iso>/` always preserves live state before overwrite |
| State snapshot grows unbounded (each switch writes JSONL ledgers) | Snapshot replaces (not appends); size bounded by current live state size |
| Profile dir gets out of sync if user manually edits live files without switching out | Document: "always switch out before edits" in README; add `-Recapture` flag to refresh outgoing profile from live |

## Out of scope (explicitly)

- Per-profile MEMORY.md / wiki — shared by design (the user's auto-memory system uses a single `MEMORY.md` index that compounds across both profiles, which is a feature for benchmarking).
- Per-profile MCP server — process-shared, model-agnostic.
- Per-profile JM Die data — domain knowledge, model-invariant.
- Adding a third profile (Sonnet, Haiku) — supportable later by adding a `manifest.json` under a new dir name; script is data-driven.
- Telemetry diff/analysis tooling — that's the *next* step after the harness exists; out of scope for this plan.
