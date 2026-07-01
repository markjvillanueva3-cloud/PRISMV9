# FLEET-HYGIENE/U-FLEET-WORK-DIGEST-SEC — [MAIN] [FLEET-HYGIENE]/U-FLEET-WORK-DIGEST-SEC (slot:golf): block git option-injection in the work-digest aggregator

**Commit:** `c4dd828c2672` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T11:06:41-05:00
**Tags:** fleet-hygiene, u-fleet-work-digest-sec, auto-distilled

## Subject
[MAIN] [FLEET-HYGIENE]/U-FLEET-WORK-DIGEST-SEC (slot:golf): block git option-injection in the work-digest aggregator

## Body
```
[MAIN] [FLEET-HYGIENE]/U-FLEET-WORK-DIGEST-SEC (slot:golf): block git option-injection in the work-digest aggregator

3-of-3 scrutiny arm-C P1: fleet-work-digest.mjs passed `branch` (from unvalidated
chat-slots.json state.branch) as a positional `git log <rev>` arg with no way to use a
`--` separator (that would turn the rev into a pathspec). A crafted/corrupted branch like
`--output=/tmp/x` was parsed by git as an OPTION -> arbitrary file write, firing in every
chat's detached Stop regen. Proven exploitable; now proven blocked (PoC writes nothing).

Fix: isSafeBranch(b) = /^[A-Za-z0-9][\w./-]*$/ (plain branch name, no leading '-'/metachars),
applied at BOTH resolveBranch (malicious state.branch -> safe slot/<name> fallback) AND the
gitSubjects/gitLastSubject IO boundary (unsafe branch -> []/null without invoking git).
+4 security tests (isSafeBranch accept/reject, resolveBranch fallback, git-not-invoked).

Also cleaned the P2 dead code arms A+B flagged: dropped unused imports (join/readFileSync/
existsSync) + unused FLEET_STATUS_PATH const; corrected the JSDoc (node:test, not vitest).
33/33 tests green; digest rebuilds clean.
```

## Files touched (3)
- scripts/fleet-work-digest.mjs      | 33 ++++++++++++++++++++++++---------
- scripts/fleet-work-digest.test.mjs | 29 ++++++++++++++++++++++++++++-
- 2 files changed, 52 insertions(+), 10 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c4dd828c2672`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._