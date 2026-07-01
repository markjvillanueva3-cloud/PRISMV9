---
title: "reference_fleet_reaper_ms3_2026_05_19"
name: reference_fleet_reaper_ms3_2026_05_19
kind: reference
status: promoted
category: reference
domain: knowledge-vault
promoted_from: knowledge/memories/reference/reference_fleet_reaper_ms3_2026_05_19.md
promoted_at: 2026-06-06T04:55:52.797Z
source_refs: 5
---

# reference_fleet_reaper_ms3_2026_05_19

FLEET-REAPER-MS3 — chat-capacity upgrades (2026-05-19, slot charlie, claude-9dc5dad7).

**Problem**: when all 13 chats are LIVE, reaper has zero orphans to kill but commit pressure climbs to 96%. Reaper does nothing useful in this case. MS3 adds 4 strictly-additive layers that keep live chats at full capacity.

**Units shipped** (all 4 — 79 new tests + 45 regression PASS, 116/116 across 6 reaper test suites):

- **D** (`97d60775ec`): reaper-self CPU priority guard — `os.setPriority(0, BELOW_NORMAL)` wraps runSweep with try/finally + beforeExit hook. Honest scope (R12): Win32 PROCESS_MODE_BACKGROUND_BEGIN requires native ffi; v1 ships CPU-only.
- **C** (`51b2d04a10`): per-chat-tree compact advisory in fleet-memory-monitor. Fires per-chat when ANY tree > 2 GB BEFORE system-wide critical, naming WHICH slot to /compact. CLEAR-ON-DROP cooldown: drop+resume re-emits immediately.
- **A** (peer-absorbed `aad2152f7f` + `0b4d868820`): UserPromptSubmit hook lifts active chat's claude.exe tree to AboveNormal for 5 min (clamp 60..1800 via knob). Stop hook scans stamp dir, reverts expired boosts to Normal. AR#1: NEVER above AboveNormal. AR#2: NEVER on non-Claude descendant. Wired in `.claude/settings.json` UserPromptSubmit 28→29, Stop 46→47.
- **B** (`8486d89344` helper + `9baacb056e` wire): Tier-1.5 between soft-relief and serviceRestart. Under warn-band pressure, drop top-3 non-Claude heavy procs (Chrome/Discord/Steam) to BelowNormal. Hysteresis: drop at 90%, restore at 85%. Exhaustive exclusion list + dynamic Claude-descendant rejection.

**Cross-unit invariants**: reversibility-first, kill-switch parity, no-Claude-kill (A boosts, B excludes Claude, C advises, D self-throttles), audit logs to per-unit stamps.

**Knobs**: every unit has its own kill switch + master `PRISM_FLEET_REAPER_DISABLE=1` master. Full table in [[fleet-reaper-ms3]] wiki.

**Shared-tree collision pattern**: 3 of 5 file-groups absorbed by peer commits during this session (DEV-TOOLS/U-DVA01, SLOT-COMPACT-SYNERGY-MS0/U-WAVE5c-AUTO, JULIETT-12CHAT-ALLOCATION-MS0/U-MEMORY-COMPRESS-V2-DOC). Functional deployment intact; commit attribution noisy. Same class as [[reference_iter2_html_adopt_misattribution_2026_05_18]].

**Files**:
- `scripts/lib/reaper-self-io-priority.mjs` (Unit D)
- `scripts/fleet-memory-monitor.mjs` (Unit C wire)
- `.claude/helpers/claude-tree-priority.mjs` + `.claude/hooks/active-chat-priority-{boost,decay}.mjs` (Unit A)
- `scripts/lib/bg-app-throttle.mjs` + Tier-1.5 wire in `scripts/fleet-reaper-sweep.mjs` (Unit B)
- 5 test files under `scripts/__tests__/` + `.claude/hooks/__tests__/`
- Spec at `state/shared/specs/FLEET-REAPER-MS3-CHAT-CAPACITY-DESIGN.md`

**Wiki**: [[fleet-reaper-ms3]]

## Source

Promoted from memory [[reference_fleet_reaper_ms3_2026_05_19]] (referenced 5x across the vault). The memory remains the editable source of truth.
