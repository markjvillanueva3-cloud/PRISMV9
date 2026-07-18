# COMMAND-KERNEL-MS0/U-CK15 — [MAIN] [COMMAND-KERNEL-MS0]/U-CK15: populate consumes/composes_with frontmatter across migrated commands (CRLF/BOM tolerant, additive)

**Commit:** `f3dad1825337` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T09:42:35-05:00
**Tags:** command-kernel-ms0, u-ck15, auto-distilled

## Subject
[MAIN] [COMMAND-KERNEL-MS0]/U-CK15: populate consumes/composes_with frontmatter across migrated commands (CRLF/BOM tolerant, additive)

## Body
```
[MAIN] [COMMAND-KERNEL-MS0]/U-CK15: populate consumes/composes_with frontmatter across migrated commands (CRLF/BOM tolerant, additive)

Recovers the U-CK15 work blocked on C: ENOSPC in prior bravo session
(claude-df944902, 2026-05-19 04:50). C: drive recovered to 12GB free;
49/49 tests PASS; round-2 per-file scrutiny PASS/PASS (0 P0/P1).

scripts/populate-command-frontmatter.mjs — 443 LOC populator tool
  + 9 hardened exports (round-1 fixes verified):
    1. digit-tolerant DISPATCHER_ACTION_RE (prism_5axis:*, *_v2)
    2. CRLF+BOM-tolerant parseFrontmatter / rebuildFile
    3. symmetric validateAdditions (composes_with + consumes)
    4. emitYamlStringArray R12-throws on newline + correct escape order
    5. transformFileText byte-identity on empty-FM/empty-additions
    6. split schemaInvalidCount (exit 2) vs ioErrorCount (exit 3)
    7. parseArgs --field allowlist (rejects produces/unknown, R12)
    8. --report "" suppresses dashboard write (test-friendly)
    9. CLI bootstrap via pathToFileURL(resolve(argv[1] || ""))
scripts/populate-command-frontmatter.test.mjs — 49/49 PASS via node:test
state/shared/dashboards/command-frontmatter-coverage.md — operator dashboard
.claude/commands/* — 36 commands frontmatter-populated

Apply delta (live): ~342 composes_with + ~108 consumes inferences across
the merged corpus (H:/prism/.claude/commands + H:/.claude/commands).
Additive, idempotent on re-run (oracle test pins byte-identity).

Round-2 scrutiny: code-analyzer PASS, independent reviewer PASS, 0 P0/P1.
3 P2/P3 deferred to follow-up (F1: slot-worktree advisory caveat for --apply,
F2: extract emitYamlStringArray/mergeFrontmatterYaml into scripts/lib/yaml-additive-merge.mjs,
F3: prune unused ALLOWED_TIMEOUT_MS or wire into test spawnSync timeouts).
```

## Files touched (41)
- .claude/commands/awareness-snapshot.md             |   6 +-
- .claude/commands/big-blob-hunt.md                  |   4 +-
- .claude/commands/checkin-alpha.md                  |   7 +-
- .claude/commands/checkin-bravo.md                  |   5 +-
- .claude/commands/checkin-charlie.md                |   5 +-
- .claude/commands/checkin-delta.md                  |   5 +-
- .claude/commands/checkin-echo.md                   |   5 +-
- .claude/commands/checkin-foxtrot.md                |   5 +-
- .claude/commands/checkin-golf.md                   |   5 +-
- .claude/commands/checkin-hotel.md                  |  19 +-
_(+31 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f3dad1825337`
- Milestone envelope: `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._