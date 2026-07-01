# SELF-COMPACT-FIX/U-SELF-RESOLVE-ENV-FALLBACK — [MAIN-FORCE] [SELF-COMPACT-FIX]/U-SELF-RESOLVE-ENV-FALLBACK (slot:alpha): resolve slot from CLAUDE_CODE_SESSION_ID env when no --session-id arg

**Commit:** `939f98a2f259` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T10:50:50-05:00
**Tags:** self-compact-fix, u-self-resolve-env-fallback, auto-distilled

## Subject
[MAIN-FORCE] [SELF-COMPACT-FIX]/U-SELF-RESOLVE-ENV-FALLBACK (slot:alpha): resolve slot from CLAUDE_CODE_SESSION_ID env when no --session-id arg

## Body
```
[MAIN-FORCE] [SELF-COMPACT-FIX]/U-SELF-RESOLVE-ENV-FALLBACK (slot:alpha): resolve slot from CLAUDE_CODE_SESSION_ID env when no --session-id arg

GAP (documented follow-up to U-WT-TAB-SINGLE-LETTER): self-compact + self-startup main() resolved the slot from the --session-id CLI arg ONLY. A bare/cron/--dry-run invocation (no arg) hit 'could not resolve this chat's slot' even though the harness exports the full session UUID into every tool subprocess as CLAUDE_CODE_SESSION_ID. The skill + watcher always pass --session-id, so production worked; the --dry-run resolvability check the skill doc recommends did not.

FIX: new pure exported resolveSessionId(argVal, envVal, {canonical}) in self-compact.mjs. self-compact uses {canonical:true} -> the env UUID becomes the SHORT claude-<8hex> (slot-resolution + handoff terminal key want the stored chatId form; ledgerSessionId stays the FULL UUID, read separately for transcript correlation). self-startup uses it WITHOUT canonical -> the FULL UUID verbatim, because statSlotTranscript's shared-tree fallback needs the <id>.jsonl filename. Arg-present path returns verbatim -> skill (short) + watcher (full) byte-identical to before.

PROOF (live): bare 'self-compact --dry-run' -> action:dry-run slot alpha hwnd 657790 (was action:fallback); bare 'self-startup --dry-run' -> resolves slot alpha (stall-gate skip while working). Tests self-compact 36/0 (+8 resolveSessionId both forms/empty/null/idempotent), self-startup 29/0. Per-file 2-arm scrutiny PASS (reviewer + code-analyzer), 0 findings.
```

## Files touched (4)
- scripts/self-compact.mjs      | 34 ++++++++++++++++++++++++++++++++--
- scripts/self-compact.test.mjs | 37 +++++++++++++++++++++++++++++++++++++
- scripts/self-startup.mjs      |  7 +++++--
- 3 files changed, 74 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 939f98a2f259`
- Milestone envelope: `mcp-server/data/milestones/SELF-COMPACT-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._