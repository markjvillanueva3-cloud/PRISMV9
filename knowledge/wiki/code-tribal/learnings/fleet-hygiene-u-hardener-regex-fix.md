# FLEET-HYGIENE/U-HARDENER-REGEX-FIX — [MAIN] [FLEET-HYGIENE]/U-HARDENER-REGEX-FIX (slot:golf): fix Task Hardener false-disabling crash-critical tasks every 6h

**Commit:** `0c4f38121e1e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T01:13:20-05:00
**Tags:** fleet-hygiene, u-hardener-regex-fix, auto-distilled

## Subject
[MAIN] [FLEET-HYGIENE]/U-HARDENER-REGEX-FIX (slot:golf): fix Task Hardener false-disabling crash-critical tasks every 6h

## Body
```
[MAIN] [FLEET-HYGIENE]/U-HARDENER-REGEX-FIX (slot:golf): fix Task Hardener false-disabling crash-critical tasks every 6h

Get-TaskScript in harden-prism-tasks.ps1 extracted the task's script path with
([A-Za-z]:\[^"]+?\.(?:mjs|js|ps1)) -- char-class excluded only double-quotes. When
a task command has a FULL-PATH interpreter before the script (unquoted
`H:\Tools\nodejs\node.exe H:\prism\scripts\foo.mjs` or quoted `"& 'C:\..node.exe'
'H:\..foo.mjs'"`) the non-greedy match SPANNED the space/quote and concatenated
interpreter+script into a garbage path that fails Test-Path -> the hardener set
Enabled=false. This false-disabled crash-critical PRISM Zombie Reaper v2 every 6h
(re-enable ledger: ~8 G10 heals in 2 days) plus Hermes-Obsidian Bridge / Ollama
Night Batch / Slot Worktree Migration Status (stayed disabled -- not crash-critical
so the G10 guard never healed them). Root cause of the recurring "reaper keeps
getting disabled" pattern (alpha 2bc54961b 05-19; golf 06-09; 06-15).

FIX: regex [^"] -> [^"'\s] (exclude whitespace + both quote kinds) so the match
stops at the shell's arg boundaries; the .exe interpreter (never a script suffix)
is skipped and the real script isolated.

Validated across all 69 live PRISM tasks: 4 false-disabled tasks fixed (scripts
confirmed to exist), 0 regressions; the 2 genuinely-missing (Tribal Consolidate
deleted %TEMP% cron, Zebra absent script) correctly stay disabled. Live hardener
run: disabled-broken 5->2, reaper-net 10/10. New regression test
harden-prism-tasks.test.ps1 8/8 (zero-drift: reads the production regex literal;
anti-vacuity arm proves the old regex spans). Both files ASCII-clean. Per-file
2-reviewer scrutiny PASS. G10 auto-re-enable guard retained as safety net.
```

## Files touched (3)
- .claude/helpers/harden-prism-tasks.ps1      | 25 ++++++++++++++++++++++---
- .claude/helpers/harden-prism-tasks.test.ps1 | 87 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 109 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0c4f38121e1e`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._