# MODEL-ROUTING-MS0/U-CAP-BATTERY-EXPAND — [MAIN-FORCE] [MODEL-ROUTING-MS0]/U-CAP-BATTERY-EXPAND (slot:india): expand the heavy-test battery (6->8 verifiable tasks) -- 'see what else ollama can do'.

**Commit:** `12d09758709f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T09:08:57-05:00
**Tags:** model-routing-ms0, u-cap-battery-expand, auto-distilled

## Subject
[MAIN-FORCE] [MODEL-ROUTING-MS0]/U-CAP-BATTERY-EXPAND (slot:india): expand the heavy-test battery (6->8 verifiable tasks) -- 'see what else ollama can do'.

## Body
```
[MAIN-FORCE] [MODEL-ROUTING-MS0]/U-CAP-BATTERY-EXPAND (slot:india): expand the heavy-test battery (6->8 verifiable tasks) -- 'see what else ollama can do'.

Added arithmetic (computed result, verified numerically) + list-sort (exact sequence equality). Dropped regex-generate (running a model-generated regex is a ReDoS surface -- not worth re2 for a probe; code-lite stays a Claude task, R12 honest). RE-PROBED 4 models x 8 tasks: qwen3-coder:30b now 100% on 8/8 measured; qwen2.5-coder:32b 100% on 7/8; even qwen2.5-coder:1.5b 100% on list-sort + extraction. arithmetic + list-sort are capability-discovery signals (unmapped in BATTERY_TO_CLASS -> they don't shift routing; classify/extract/format offload unchanged). 14 battery tests; policy 10/10 still green off the new matrix. [MAIN-FORCE]: fleet routing infra.
```

## Files touched (4)
- scripts/lib/ollama-capability-battery.mjs      |  25 ++++++++++++
- scripts/lib/ollama-capability-battery.test.mjs |  13 ++++++
- state/shared/ollama-capability-matrix.json     | 181 ++++++++++++++++++++++++++++++++++++++++++++++++++++-------------------------------
- 3 files changed, 152 insertions(+), 67 deletions(-)

## Lessons surfaced in commit body
- till green off the new matrix. [MAIN-FORCE]: fleet routing infra.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 12d09758709f`
- Milestone envelope: `mcp-server/data/milestones/MODEL-ROUTING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._