# SYSTEM-HEALTH/U-WSL-MEM-GUARD — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SYSTEM-HEALTH]/U-WSL-MEM-GUARD (slot:charlie): WSL2 memory-cap guard — fix recurring 'API limit error' root cause

**Commit:** `38af3407733c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T14:34:28-05:00
**Tags:** system-health, u-wsl-mem-guard, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SYSTEM-HEALTH]/U-WSL-MEM-GUARD (slot:charlie): WSL2 memory-cap guard — fix recurring 'API limit error' root cause

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SYSTEM-HEALTH]/U-WSL-MEM-GUARD (slot:charlie): WSL2 memory-cap guard — fix recurring 'API limit error' root cause

Diagnosed: the recurring 'API limit error' is host commit-memory pressure, NOT
an Anthropic key limit. WSL2 ran with its .wslconfig memory=16GB cap NOT enforced
(vmmemWSL ~96GB committed) because 'wsl --shutdown' was never run to apply it.
At ~99% host commit, outbound HTTPS + the MCP server fail allocation -> surfaces
as API/rate limit + ECONNREFUSED. This session: killed 3 zombie tsservers
(commit 98.4%->79.1%); built the permanent recurrence-fix below.

scripts/system-health/27-wsl-memory-guard.mjs — polls vmmemWSL commit vs the
REAL .wslconfig cap (parsed, not hardcoded). exit 0 healthy / 1 watch|no-cap /
2 overrun. Advise-only by default; --enforce runs gated 'wsl --shutdown'
(refuses if docker containers active unless --force). Pure logic (parseWslConfigCap,
classify) exported + import.meta run-guard so import is side-effect-free.
Live: OVERRUN 95.3GB vs 16GB cap (6x).

27-wsl-memory-guard.test.mjs — 15/15: unit parsing (GB/MB/KB/bytes, commented-
memory= ignored [THE bug class], first-match-wins, null/empty) + classify state
machine (down/no-cap/healthy/watch/overrun + overrun-factor boundaries).

install-wsl-memory-guard-task.ps1 — cloned from install-fleet-memory-monitor-
task.ps1; registers a 15-min S4U scheduled task (advise mode, +390s phase offset,
AtStartup, self-heal) so the cap-overrun is surfaced before it goes acute.
NEEDS elevated shell to register + a one-time 'wsl --shutdown' to reclaim now.
```

## Files touched (4)
- .claude/helpers/install-wsl-memory-guard-task.ps1  | 173 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/system-health/27-wsl-memory-guard.mjs      | 204 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/system-health/27-wsl-memory-guard.test.mjs | 101 +++++++++++++++++++++++++++++++++++++++
- 3 files changed, 478 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 38af3407733c`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-HEALTH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._