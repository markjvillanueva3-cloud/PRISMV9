# CLAUDE.md PATCH — FLEET-REAPER-MS3 (charlie slot, 2026-05-19)

**Apply to**: `H:/PRISM/CLAUDE.md` between the existing `## FLEET-REAPER-MS2` block and the next `## ` heading.

**Reason**: CLAUDE.md is under heavy peer-edit pressure on the shared `cad-fusion-live-ms0` branch. Per the patch-sibling convention ([[reference_iter2_html_adopt_misattribution_2026_05_18]] + the chat doctrine), live edits to CLAUDE.md must go through a peer-quiet window or a slot-worktree migration. Until then, this file is the authoritative new section.

---

## Insert this section after `## FLEET-REAPER-MS2`:

### FLEET-REAPER-MS3 (2026-05-19, slot charlie) — chat-capacity upgrades (4 units, strictly additive)

Reframes the reaper from "kill more orphans" → "keep live chats at full capacity." Solves the failure mode where **13 live chats** are fighting for CPU/RAM/disk with zero orphans for the reaper to kill (host at 96% commit pressure → reaper returns "ok 0 candidates" → every chat slow). 4 units, each with its own kill switch + master `PRISM_FLEET_REAPER_DISABLE=1`.

- **U-FR-MS3-D** (`97d60775ec`) — reaper-self CPU priority drop. `os.setPriority(0, BELOW_NORMAL)` wraps runSweep entry; try/finally + `beforeExit`/`exit` listeners catch process.exit() escape. Honest scope (R12): Win32 `PROCESS_MODE_BACKGROUND_BEGIN` (which drops CPU + memory + I/O) needs native ffi; v1 ships the CPU-only portable equivalent.
- **U-FR-MS3-C** (`51b2d04a10`) — per-chat-tree compact advisory in fleet-memory-monitor. Fires per-chat when any tree exceeds 2 GB BEFORE system-wide critical, naming WHICH slot to /compact. CLEAR-ON-DROP cooldown — chat that emits then drops then re-bloats fires fresh advisory immediately.
- **U-FR-MS3-A** (peer-absorbed `aad2152f7f` + `0b4d868820`) — live-chat priority boost on prompt. UserPromptSubmit hook lifts active chat's claude.exe tree to AboveNormal for 5 min; Stop hook reverts expired boosts to Normal. AR#1: NEVER above AboveNormal. AR#2: NEVER on non-Claude descendant. Wires `.claude/settings.json` UserPromptSubmit + Stop chains.
- **U-FR-MS3-B** (helper `8486d89344` + wire `9baacb056e`) — Tier-1.5 bg-app throttle. Between soft-relief and serviceRestart, drops top-3 non-Claude heavy procs (Chrome/Discord/Steam) to BelowNormal under pressure. Hysteresis: drop at 90%, restore at 85%. Exhaustive exclusion list + dynamic Claude-descendant rejection via procIndex walk.

**Tests**: 79 new tests + 45 regression PASS, 116/116 across 6 reaper test suites. Per-file scrutiny: 2 reviewers per file PASS/PASS, 0 P0/P1.

**Knobs**: `PRISM_FR_BOOST_{DISABLE,TTL_SEC,PRIORITY}` · `PRISM_FR_BG_THROTTLE_{DISABLE,TOP_N,MIN_RSS_MB}` · `PRISM_FM_CHAT_{ADVISORY_DISABLE,THRESHOLD_MB,ADVISORY_COOLDOWN_SEC}` · `PRISM_FR_SELF_BG_IO_DISABLE` + master `PRISM_FLEET_REAPER_DISABLE=1`.

Wiki: [`knowledge/wiki/architecture/fleet-reaper-ms3.md`](knowledge/wiki/architecture/fleet-reaper-ms3.md). Memory: [[reference_fleet_reaper_ms3_2026_05_19]]. Spec: [`state/shared/specs/FLEET-REAPER-MS3-CHAT-CAPACITY-DESIGN.md`](state/shared/specs/FLEET-REAPER-MS3-CHAT-CAPACITY-DESIGN.md).

---

## Also append to `## Recent regressions` (deduplicate by date+description):

- 2026-05-19 | **3 of 5 FLEET-REAPER-MS3 file-groups absorbed by peer commits** (DEV-TOOLS/U-DVA01 `aad2152f7f`, SLOT-COMPACT-SYNERGY-MS0/U-WAVE5c-AUTO `0b4d868820`, JULIETT-12CHAT-ALLOCATION-MS0/U-MEMORY-COMPRESS-V2-DOC `8486d89344`). Class: shared-tree git-add window — peers running `git add .` swept untracked files into their staging area. Functional deployment intact (79/79 + 45 regression PASS, hooks wired in settings.json, helpers tested); commit attribution wrong. Same class as [[reference_iter2_html_adopt_misattribution_2026_05_18]]. | mitigation: slot-worktree (`/checkin-charlie` on slot/charlie branch) eliminates absorption risk entirely. | observed-by: claude-9dc5dad7 slot charlie /loop FLEET-REAPER-MS3 D→C→A→B. | verify: `git -C H:/prism log --oneline | grep -E "FLEET-REAPER-MS3"` shows 4 of my MS3 commits + the spec + html-twin; the missing 3 file-groups are inside the 3 peer commits.
