# WIRE-UNWIRED-PAPA/U-WIRE-HZPAUDIT — [MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-HZPAUDIT (slot:papa->golf): wire HzpDashAuditEngine -> prism_dev (3 actions)

**Commit:** `7b784ba8a0af` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T10:23:46-05:00
**Tags:** wire-unwired-papa, u-wire-hzpaudit, auto-distilled

## Subject
[MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-HZPAUDIT (slot:papa->golf): wire HzpDashAuditEngine -> prism_dev (3 actions)

## Body
```
[MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-HZPAUDIT (slot:papa->golf): wire HzpDashAuditEngine -> prism_dev (3 actions)

Wire the 3 static methods of HzpDashAuditEngine (HZD-03, HZP-DASH-MS0 by bravo)
into prism_dev: hzp_audit_build / hzp_audit_to_jsonl / hzp_audit_render_line.
Mirror sub-schemas _hzpAuditRequest (faithful mirror of the engine's exported
AuditEnvelopeRequestSchema) + _hzpAuditEnvelope (full 11-field mirror, .passthrough).

- build() re-validates via .parse and throws on a bad ts_iso -> dispatcherError
  (fail-loud). round-trip test pins this distinctly from boundary rejection.
- 15-test suite: engine-direct reference values (deterministic audit_id via randHex6
  seed, null-default mapping, toJsonl round-trip, render glyphs via String.fromCharCode
  = ASCII-safe), live round-trip x3, schema rejection x3 + ts_iso engine-throw.
  tsc 0 new errors from hzp symbols (total 638 = pre-existing baseline). vitest 15/15.
- 2 per-file scrutiny agents: both VERDICT PASS, 0 P0/P1; the P2 (partial envelope
  mirror) applied inline -> full 11-field mirror.

dup-checked all branches: HzpDashAudit produced by bravo HZP-DASH-MS0; no peer
wired it. galaxy:golf engine -> prism_dev (papa home dispatcher); shared-tree
fallback (golf live hygiene slot) per feedback_papa_cross_galaxy_work_commit_to_their_worktrees.
```

## Files touched (4)
- mcp-server/src/__tests__/devDispatcher.uwireHzpAudit.test.ts | 218 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts                   |  39 +++++++++++++++++++++
- mcp-server/src/tools/dispatchers/devDispatcher.ts            |  24 +++++++++++++
- 3 files changed, 281 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7b784ba8a0af`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._