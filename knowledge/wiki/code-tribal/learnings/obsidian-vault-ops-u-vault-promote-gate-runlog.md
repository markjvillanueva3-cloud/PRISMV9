# OBSIDIAN-VAULT-OPS/U-VAULT-PROMOTE-GATE-RUNLOG — [MAIN-FORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-PROMOTE-GATE-RUNLOG (slot:sierra): exclude ephemeral run-log memories from wiki promotion (run_log convention)

**Commit:** `ee43c5487645` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T21:53:53-05:00
**Tags:** obsidian-vault-ops, u-vault-promote-gate-runlog, auto-distilled

## Subject
[MAIN-FORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-PROMOTE-GATE-RUNLOG (slot:sierra): exclude ephemeral run-log memories from wiki promotion (run_log convention)

## Body
```
[MAIN-FORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-PROMOTE-GATE-RUNLOG (slot:sierra): exclude ephemeral run-log memories from wiki promotion (run_log convention)

Sibling of U-VAULT-PROMOTE-GATE-HARDEN (409532c31e). After excluding node-pointer +
unverified-advisory memories, the live dry-run still surfaced 17 candidates of which
11 were reference_nn_retrain_<ts> -- ephemeral machine-generated per-retrain metric
records (NN-GRAPH tier-5), not durable synthesized knowledge. Their inbound refs are
inflated by a shared index hub (same mechanism as the node-pointer case), clearing
minRefs=3. Promoting timestamped run-logs to the canonical wiki = noise.

FIX -- generalizable `run_log` frontmatter convention (any run-log generator opts in):
- promote-memory-to-wiki.mjs: nonPromotableReason now returns "run-log" when fm.run_log
  is YAML-truthy (3rd exclusion class; reuses the truthy() helper).
- nn-feedback-to-memory.mjs (the generator): emits `run_log: true` so all FUTURE retrain
  memories are auto-excluded.
- 31 existing reference_nn_retrain_*.md backfilled with run_log: true (EOL-preserved; one
  CRLF file handled) so the current set is excluded too -- the vault data self-corrects.

VALIDATION (real data, R12):
- gate tests 33/33 (3 new: unit truthy+falsy, integration flat-shape, integration the
  REAL nested metadata.run_log shape); generator tests 15/15 (asserts the marker).
- LIVE dry-run: WOULD PROMOTE 17 -> 6, 0 nn_retrain remaining. The 6 are genuine
  reference/feedback atoms (skippedNonPromotable 12924 vault-wide).
- per-file 2-arm scrutiny PASS, 0 P0/P1.

Known follow-up (scrutiny arm-B P2, filed): a 4th junk class -- the 2 feedback_d2_*smoke
fixtures (deadbeef-sentinel sessionId, refs inflated by dreams/ hub files) -- still clear
the gate. Needs a test-fixture signal; separate unit.

[MAIN-FORCE]: promote-memory-to-wiki.mjs is canonical-only (cad-fusion-live-ms0), absent
from slot/sierra; same lane rationale as 409532c31e.
```

## Files touched (36)
- knowledge/memories/reference/reference_nn_retrain_2026_05_18_2358.md |  1 +
- knowledge/memories/reference/reference_nn_retrain_2026_05_22_0445.md |  1 +
- knowledge/memories/reference/reference_nn_retrain_2026_05_22_1805.md |  1 +
- knowledge/memories/reference/reference_nn_retrain_2026_05_23_0430.md |  1 +
- knowledge/memories/reference/reference_nn_retrain_2026_05_24_0133.md |  1 +
- knowledge/memories/reference/reference_nn_retrain_2026_05_24_2108.md |  1 +
- knowledge/memories/reference/reference_nn_retrain_2026_05_24_2111.md |  1 +
- knowledge/memories/reference/reference_nn_retrain_2026_05_24_2114.md |  1 +
- knowledge/memories/reference/reference_nn_retrain_2026_05_24_2233.md |  1 +
- knowledge/memories/reference/reference_nn_retrain_2026_05_24_2236.md |  1 +
_(+26 more)_

## Lessons surfaced in commit body
- till surfaced 17 candidates of which
- till clear

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ee43c5487645`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._