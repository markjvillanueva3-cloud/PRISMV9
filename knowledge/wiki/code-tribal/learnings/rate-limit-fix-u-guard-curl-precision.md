# RATE-LIMIT-FIX/U-GUARD-CURL-PRECISION — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [RATE-LIMIT-FIX]/U-GUARD-CURL-PRECISION (slot:bravo): lock the fetch-vs-curl distinction -- the bug is NODE-FETCH-ONLY

**Commit:** `41f9f98cb647` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T22:34:16-05:00
**Tags:** rate-limit-fix, u-guard-curl-precision, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [RATE-LIMIT-FIX]/U-GUARD-CURL-PRECISION (slot:bravo): lock the fetch-vs-curl distinction -- the bug is NODE-FETCH-ONLY

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [RATE-LIMIT-FIX]/U-GUARD-CURL-PRECISION (slot:bravo): lock the fetch-vs-curl distinction -- the bug is NODE-FETCH-ONLY

R12 scope correction (verified live this session): the localhost->IPv6 bug is NODE-FETCH-ONLY. Shell curl DOES IPv4 fallback so curl http://localhost:11434 WORKS (tested: curl localhost + curl 127 both reach 10 models). So ~11 of the 33 localhost files use curl + are NOT broken (ollama-auto-router, ollama-terminal-watcher, etc.) -- only the ~22 node-fetch callers are. +2 test cases on the hardcode-guard locking that it flags a quoted-URL fetch value (the bug) but NOT a curl command string (space before http, works) -- prevents the guard false-positiving on 11 working curl hooks + prevents the fleet 'fixing' them. 12/12 tests. ollama-auto-router live-tested: curl reaches Ollama but it did not inject on a cold model (timeout, additive+fail-soft) -- a separate non-localhost dormancy, low priority.
```

## Files touched (2)
- .claude/hooks/localhost-ollama-hardcode-guard.test.mjs | 17 +++++++++++++++++
- 1 file changed, 17 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 41f9f98cb647`
- Milestone envelope: `mcp-server/data/milestones/RATE-LIMIT-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._