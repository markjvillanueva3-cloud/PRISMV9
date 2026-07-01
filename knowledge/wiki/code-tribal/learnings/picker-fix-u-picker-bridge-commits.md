# PICKER-FIX/U-PICKER-BRIDGE-COMMITS — [MAIN] [PICKER-FIX]/U-PICKER-BRIDGE-COMMITS: source (c) — recover bridge-unit completion from git subjects

**Commit:** `e11e681f8b42` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T20:27:24-05:00
**Tags:** picker-fix, u-picker-bridge-commits, auto-distilled

## Subject
[MAIN] [PICKER-FIX]/U-PICKER-BRIDGE-COMMITS: source (c) — recover bridge-unit completion from git subjects

## Body
```
[MAIN] [PICKER-FIX]/U-PICKER-BRIDGE-COMMITS: source (c) — recover bridge-unit completion from git subjects

Iter 6. Closes the bridge-layer instance of the original P0: U-BRIDGE-*
units live in ROADMAP-CONSOLIDATED.bridge_units with NO milestone envelope,
so the shipped-union (sources a+b) structurally couldn't see them shipped —
the picker re-served U-BRIDGE-SFC-ESPRIT infinitely after iter-4 shipped it
(76dc1b53cb, subject ...U-BRIDGE-SFC-ESPRIT+SOLIDCAM).

Source (c): readShippedFromBridgeCommits() — bounded `git log --format=%s
-n 800` via execFileSync (array args, no shell; timeout+maxBuffer capped;
fail-soft → empty Set). expandBridgeToken() recovers compound A+B subjects
into both sibling ids (prefix-reuse: U-BRIDGE-SFC-ESPRIT+SOLIDCAM →
U-BRIDGE-SFC-ESPRIT + U-BRIDGE-SFC-SOLIDCAM). Unioned into
buildShippedIdsUnion PRODUCTION path only; cache key extended with HEAD sha
so a new commit invalidates. Hermetic custom-path calls + describeShipped-
Sources hermetic branch BOTH skip source (c) (mirrors the mtime-cache
boundary) — existing exact-count hermetic tests stay deterministic.

Live verified: U-BRIDGE-SFC-ESPRIT/SOLIDCAM now SHIPPED; picker top pick
moved to U-BRIDGE-CAD-CAM-HANDOFF (genuinely pending). 65/65 picker-stack
tests (36 shipped-units + 13 priority-queue + 16 domain-classifier).

R12 catch: expandBridgeToken(42) coerced to "42" — test caught it, fixed
with a typeof guard (non-string → empty, the correct contract).

Per-file scrutiny: code-analyzer PASS (compound expansion + security +
hermetic boundary all verified, 0 P0/P1). Independent reviewer PASS. Both
P1s + shared P2 fixed THIS commit (no defer):
  - named constants (BRIDGE_LOG_MAX_COMMITS/_TIMEOUT_MS/HEAD_SHA_TIMEOUT_MS/
    GIT_LOG_MAX_BUFFER) replace inline 800/15000/5000/8MB
  - revert false-positive caveat documented in the source comment (accepted
    tradeoff: false-suppress << infinite-re-serve; subject-only scan so
    commit-body planning text can't trip it)
  - compound-subject convention is now wiki doctrine (recovery-load-bearing:
    comma-separated multi-bridge close-outs are unrecoverable; MUST use
    U-BRIDGE-PREFIX-A+B form) — picker-shipped-units-ssot.md updated

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../wiki/architecture/picker-shipped-units-ssot.md |  28 +++++
- scripts/lib/shipped-units-source-of-truth.mjs      | 124 +++++++++++++++++---
- scripts/lib/shipped-units-source-of-truth.test.mjs | 128 +++++++++++++++++++++
- 3 files changed, 267 insertions(+), 13 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e11e681f8b42`
- Milestone envelope: `mcp-server/data/milestones/PICKER-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._