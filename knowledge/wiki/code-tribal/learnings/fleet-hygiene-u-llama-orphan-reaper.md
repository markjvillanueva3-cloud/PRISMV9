# FLEET-HYGIENE/U-LLAMA-ORPHAN-REAPER — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-HYGIENE]/U-LLAMA-ORPHAN-REAPER (slot:india): new reaper for leaked Ollama llama-server orphans -- closes the gap that fired a 97.4%-commit crash gate this session (model reload left an 18:44 llama-server orphaned ~2h holding ~22GB; existing node/tsserver reapers all missed it). Dry-run-by-default, kills ONLY a same-model-blob dup older than --min-age(300s) keeping the newest, never single-instance/different-model/clock-skewed. 18/18 tests (pure decision core incl the real incident + false-positive guards) + 2-reviewer PASS; live-validated (enumerationOk JSON, 0 false-positives on the live 120b/20b pair). R12: enumeration failure reported distinctly, not as '0 orphans'

**Commit:** `f4a681e986ff` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T21:16:08-05:00
**Tags:** fleet-hygiene, u-llama-orphan-reaper, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-HYGIENE]/U-LLAMA-ORPHAN-REAPER (slot:india): new reaper for leaked Ollama llama-server orphans -- closes the gap that fired a 97.4%-commit crash gate this session (model reload left an 18:44 llama-server orphaned ~2h holding ~22GB; existing node/tsserver reapers all missed it). Dry-run-by-default, kills ONLY a same-model-blob dup older than --min-age(300s) keeping the newest, never single-instance/different-model/clock-skewed. 18/18 tests (pure decision core incl the real incident + false-positive guards) + 2-reviewer PASS; live-validated (enumerationOk JSON, 0 false-positives on the live 120b/20b pair). R12: enumeration failure reported distinctly, not as '0 orphans'

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-HYGIENE]/U-LLAMA-ORPHAN-REAPER (slot:india): new reaper for leaked Ollama llama-server orphans -- closes the gap that fired a 97.4%-commit crash gate this session (model reload left an 18:44 llama-server orphaned ~2h holding ~22GB; existing node/tsserver reapers all missed it). Dry-run-by-default, kills ONLY a same-model-blob dup older than --min-age(300s) keeping the newest, never single-instance/different-model/clock-skewed. 18/18 tests (pure decision core incl the real incident + false-positive guards) + 2-reviewer PASS; live-validated (enumerationOk JSON, 0 false-positives on the live 120b/20b pair). R12: enumeration failure reported distinctly, not as '0 orphans'
```

## Files touched (3)
- scripts/__tests__/reap-llama-server-orphans.test.mjs | 158 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/system-health/reap-llama-server-orphans.mjs  | 243 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 401 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f4a681e986ff`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._