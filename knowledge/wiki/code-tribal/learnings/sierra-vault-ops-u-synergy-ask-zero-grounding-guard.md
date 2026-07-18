# SIERRA-VAULT-OPS/U-SYNERGY-ASK-ZERO-GROUNDING-GUARD — [MAIN-FORCE] [SIERRA-VAULT-OPS]/U-SYNERGY-ASK-ZERO-GROUNDING-GUARD (slot:sierra): synergy-ask must not call the LLM on zero grounding (R5/R12 -- enforce "does not invent" in code)

**Commit:** `8f358a2e19b8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T13:27:10-05:00
**Tags:** sierra-vault-ops, u-synergy-ask-zero-grounding-guard, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-SYNERGY-ASK-ZERO-GROUNDING-GUARD (slot:sierra): synergy-ask must not call the LLM on zero grounding (R5/R12 -- enforce "does not invent" in code)

## Body
```
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-SYNERGY-ASK-ZERO-GROUNDING-GUARD (slot:sierra): synergy-ask must not call the LLM on zero grounding (R5/R12 -- enforce "does not invent" in code)

synergyAsk() built the grounded prompt and called ask-ollama EVEN WHEN
mergeHits returned 0 hits -- relying on the model to obey the prompt's
"if the grounding does not contain the answer... do not invent". That
delegates a deterministic question (is there grounding?) to the LLM (R5
violation), wastes an offload, and lets a 0-hit prompt hallucinate despite
the instruction -- breaking the skill's "no PRISM grounding -> says so
plainly; does not invent" promise.

FIX: short-circuit -- hits.length===0 returns {grounded:false, answer:"",
grounding.total:0, sources:[]} WITHOUT calling ollama (no LLM call =
invention impossible; saves the wasted offload). Added a `grounded` boolean
to the return shape; main() prints an honest "no PRISM grounding found ...
not invented" line for that case. All ASCII; additive.

TEST: +2 R9 tests -- ZERO-grounding short-circuit proven by askCalled===false
(LLM never reached, no invented answer can leak); grounded:true path proven
to DO call ollama. 11/11 pass. VALIDATE (live): nonsense token -> grounded:
false/total:0/answer:"" with no ollama call; real-keyword question still
grounds + answers.
```

## Files touched (3)
- scripts/synergy-ask.mjs      | 21 ++++++++++++++++++++-
- scripts/synergy-ask.test.mjs | 35 +++++++++++++++++++++++++++++++++++
- 2 files changed, 55 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8f358a2e19b8`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._