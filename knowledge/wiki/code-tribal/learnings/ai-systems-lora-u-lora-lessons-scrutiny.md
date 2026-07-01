# AI-SYSTEMS-LORA/U-LORA-LESSONS-SCRUTINY — [MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-LESSONS-SCRUTINY (slot:alpha): 3-of-3 fixes to the failure->fix LoRA feeder (15111bdc4b) -- generalize PREFIX_RE over all commit-id forms + honest recall reporting

**Commit:** `0d8c6d2b5e8b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T00:09:19-05:00
**Tags:** ai-systems-lora, u-lora-lessons-scrutiny, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-LESSONS-SCRUTINY (slot:alpha): 3-of-3 fixes to the failure->fix LoRA feeder (15111bdc4b) -- generalize PREFIX_RE over all commit-id forms + honest recall reporting

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-LESSONS-SCRUTINY (slot:alpha): 3-of-3 fixes to the failure->fix LoRA feeder (15111bdc4b) -- generalize PREFIX_RE over all commit-id forms + honest recall reporting

3-of-3 scrutiny on 15111bdc4b returned 2 PASS (arms B, C) + 1 FAIL (arm A). Fixes (test-pinned, 16/16):
- P1 (arm A): PREFIX_RE leaked the full "[TAGS]/<id>:" prefix into a pair when the unit id was NOT plain "U-FOO" -- dotted ("/U-H1.0-BUNDLE-AWARE") aborted the charset, and non-U ids ("/P0.3-B-followup") were never matched. Generalized: id = [A-Za-z0-9._+-]+ after `/`, anchored by >=1 bracket tag OR a bare uppercase scope so a real "/path:" narrative is NEVER stripped. Live: leadingTagLeak 1->0 over all 133 pairs.
- P2 (arm B, R12 honesty): the rejection report lumped 871 signal-but-unsplittable lessons in with low-signal noise. Now split + an honest recall line (134/1005 signal-bearing = 13.3%, not the misleading 5.1% scanned rate).
- P2 (arm C): pid-suffixed tmp (race-safe atomic write); .meta.json sidecar gitignored.

Tests: +dotted-id, +non-U/P0.3, +bare-/path-not-stripped (anchor guard). 16/16 pass. Live regen: 133 pairs, 0 leak / 0 meta / 0 degenerate. Follow-up to 15111bdc4b (which is buried under peer papa commits, so a fresh commit not an amend). (slot:alpha attribution; staged via update-index past the drifted lane guard.)
```

## Files touched (4)
- .gitignore                                     |  1 +
- scripts/vault-lessons-to-lora-dataset.mjs      | 44 +++++++++++++++++++++++++++++++++++---------
- scripts/vault-lessons-to-lora-dataset.test.mjs | 11 +++++++++++
- 3 files changed, 47 insertions(+), 9 deletions(-)

## Lessons surfaced in commit body
- LESSONS-SCRUTINY (slot:alpha): 3-of-3 fixes to the failure->fix LoRA feeder (15111bdc4b) -- generalize PREFIX_RE over all commit-id forms + honest recall reporting
- lessons in with low-signal noise. Now split + an honest recall line (134/1005 signal-bearing = 13.3%, not the misleading 5.1% scanned rate).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0d8c6d2b5e8b`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-LORA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._