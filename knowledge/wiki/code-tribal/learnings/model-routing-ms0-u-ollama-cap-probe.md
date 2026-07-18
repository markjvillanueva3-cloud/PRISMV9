# MODEL-ROUTING-MS0/U-OLLAMA-CAP-PROBE — [MAIN-FORCE] [MODEL-ROUTING-MS0]/U-OLLAMA-CAP-PROBE + U-LANE-MAINFORCE-CONSISTENCY (slot:india): verifiable Ollama capability probe + make [MAIN-FORCE] a consistent staging escape (R11).

**Commit:** `0ab5e0a98bbf` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T08:28:08-05:00
**Tags:** model-routing-ms0, u-ollama-cap-probe, auto-distilled

## Subject
[MAIN-FORCE] [MODEL-ROUTING-MS0]/U-OLLAMA-CAP-PROBE + U-LANE-MAINFORCE-CONSISTENCY (slot:india): verifiable Ollama capability probe + make [MAIN-FORCE] a consistent staging escape (R11).

## Body
```
[MAIN-FORCE] [MODEL-ROUTING-MS0]/U-OLLAMA-CAP-PROBE + U-LANE-MAINFORCE-CONSISTENCY (slot:india): verifiable Ollama capability probe + make [MAIN-FORCE] a consistent staging escape (R11).

U-OLLAMA-CAP-PROBE: scripts/lib/ollama-capability-battery.mjs (6 verifiable task-types: classify-enum/unit-convert/extract-number/boolean-judgment/json-extract/keyword-extract, each KNOWN-answer cases + code verify() checking CORRECTNESS not format) + scoreMatrix/autoOffloadCandidates + scripts/ollama-capability-probe.mjs (live runner, writes ollama-capability-matrix.json). 12 tests. The empirical foundation for auto-offload: only route a task to Ollama when MEASURED ~100% (verifiedOffload doctrine).

U-LANE-MAINFORCE-CONSISTENCY (R11 fix, dogfooded here): git-add-lane-guard now honors [MAIN-FORCE] in the command string -- the SAME cross-cutting escape its sibling commit hooks (worktree-commit-route, slot-commit-worktree-enforce) already accept. Before: a fleet-infra stage from a slot chat had no command-content escape (only cd-to-worktree or the env kill switch), inconsistent with commit-time. Now all 3 lane hooks share one escape convention.

Operator goal: auto-enforce model switching (fable=deep reasoning, opus=building, ollama=verified-100%, sonnet/haiku=capable) + heavy-test Ollama. This commit is the test harness + a staging-consistency fix surfaced by dogfooding the live enforcement.
```

## Files touched (5)
- .claude/hooks/git-add-lane-guard.mjs           |   5 ++++
- scripts/lib/ollama-capability-battery.mjs      | 136 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/ollama-capability-battery.test.mjs |  88 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/ollama-capability-probe.mjs            | 105 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 334 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0ab5e0a98bbf`
- Milestone envelope: `mcp-server/data/milestones/MODEL-ROUTING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._