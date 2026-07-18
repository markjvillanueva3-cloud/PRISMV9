# OLLAMA-STRESS-FALSE0-GUARD/U-ALPHA-STRESS-NOSIGNAL — [MAIN-FORCE] [OLLAMA-STRESS-FALSE0-GUARD]/U-ALPHA-STRESS-NOSIGNAL (slot:alpha): stress runner records NO-SIGNAL (timeout/empty) distinct from answered-wrong -- kills the false-0

**Commit:** `cc24367e4139` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T15:44:52-05:00
**Tags:** ollama-stress-false0-guard, u-alpha-stress-nosignal, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-STRESS-FALSE0-GUARD]/U-ALPHA-STRESS-NOSIGNAL (slot:alpha): stress runner records NO-SIGNAL (timeout/empty) distinct from answered-wrong -- kills the false-0

## Body
```
[MAIN-FORCE] [OLLAMA-STRESS-FALSE0-GUARD]/U-ALPHA-STRESS-NOSIGNAL (slot:alpha): stress runner records NO-SIGNAL (timeout/empty) distinct from answered-wrong -- kills the false-0

The U3 finding (5e8638f141) root-caused that runTaskOnModel conflates a model that NEVER
ANSWERED (cold-load timeout / fetch-error / empty text under VRAM contention) with one that
answered everything WRONG -- both scored passRate 0. That false-0 is what made the 32b look
"incapable" on the contended generative run (it had actually timed out). Fixed at the shared
runner so EVERY battery + future run is honest about timeouts.

WIRE: scripts/ollama-stress-test.mjs runTaskOnModel now counts `noSignal` (call !ok OR ok-with-
blank-text) separately and returns NEW fields `noSignal` + `answered` + `answeredRate`
(pass / answered). `passRate` (pass / ALL cases) is BYTE-IDENTICAL -- a blank answer was never a
pass, total is unchanged -- so every existing consumer is untouched (R8 surgical, back-compat).
The matrix printer (ollama-stress-expanded-run.mjs) now annotates a false-0 as e.g. `32b=0%(ns9/9)`
so "never answered" is visibly distinct from a real `7b=0%` (answered, all wrong).

TEST: scripts/ollama-stress-test-nosignal.test.mjs 5/5 via injected callFn (mixed right/wrong/no-
signal -> passRate=1/3 back-compat + answeredRate=1/2 + noSignal=1; all-timeout -> passRate 0 BUT
noSignal===total; ok-but-empty -> no-signal; REAL-0 answered-all-wrong -> noSignal=0; all-right
sanity). Existing ollama-stress-test.test.mjs 23/23 (no regression -- passRate unchanged).

This is harness-upgrade (a) named in reference_ollama_generative_stratified_harness_2026_06_25 --
GPU-independent, makes the deferred idle-GPU re-run trustworthy. (b) LLM-judge hard-tier metric +
(c) the idle-GPU run remain the next units.
```

## Files touched (4)
- scripts/ollama-stress-expanded-run.mjs       | 10 +++++++++-
- scripts/ollama-stress-test-nosignal.test.mjs | 72 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/ollama-stress-test.mjs               | 22 +++++++++++++++++----
- 3 files changed, 99 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- wrong -- kills the false-0
- WRONG -- both scored passRate 0. That false-0 is what made the 32b look
- wrong).
- wrong/no-
- wrong -> noSignal=0; all-right

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cc24367e4139`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-STRESS-FALSE0-GUARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._