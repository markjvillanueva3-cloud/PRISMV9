# OLLAMA-OFFLOAD/U-VERIFIED-OFFLOAD-LARGEREAD-HOOK — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-VERIFIED-OFFLOAD-LARGEREAD-HOOK (slot:alpha): wire the file-digest read-lever to auto-fire -- PreToolUse:Read advisory surfaces 'node scripts/ollama-file-digest.mjs <path>' for large (>600-line) non-wiki source reads; sibling of wiki-read-offload-advisory.mjs, advisory/fail-soft/never-blocks, bumps offload-stats for advisory-decay to self-govern; 11/11 tests + live proof (3440-line file fires, small+non-Read passthrough). Wired in settings.json Read block (mirrored C->H)

**Commit:** `0acb1dcbc9d0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T23:12:50-05:00
**Tags:** ollama-offload, u-verified-offload-largeread-hook, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-VERIFIED-OFFLOAD-LARGEREAD-HOOK (slot:alpha): wire the file-digest read-lever to auto-fire -- PreToolUse:Read advisory surfaces 'node scripts/ollama-file-digest.mjs <path>' for large (>600-line) non-wiki source reads; sibling of wiki-read-offload-advisory.mjs, advisory/fail-soft/never-blocks, bumps offload-stats for advisory-decay to self-govern; 11/11 tests + live proof (3440-line file fires, small+non-Read passthrough). Wired in settings.json Read block (mirrored C->H)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-VERIFIED-OFFLOAD-LARGEREAD-HOOK (slot:alpha): wire the file-digest read-lever to auto-fire -- PreToolUse:Read advisory surfaces 'node scripts/ollama-file-digest.mjs <path>' for large (>600-line) non-wiki source reads; sibling of wiki-read-offload-advisory.mjs, advisory/fail-soft/never-blocks, bumps offload-stats for advisory-decay to self-govern; 11/11 tests + live proof (3440-line file fires, small+non-Read passthrough). Wired in settings.json Read block (mirrored C->H)
```

## Files touched (3)
- .claude/hooks/large-read-digest-advisory.mjs      | 164 ++++++++++++++++++++++
- .claude/hooks/large-read-digest-advisory.test.mjs |  78 ++++++++++
- 2 files changed, 242 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0acb1dcbc9d0`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._