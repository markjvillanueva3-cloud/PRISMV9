# BLACKWELL-MODEL-UPGRADE/U-BW-TS-ENGINES-RETIRE-2-SCRUTINY — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-TS-ENGINES-RETIRE-2-SCRUTINY (slot:alpha): close 3-of-3 arm-B FAIL + arm-C finding from the retirement diff

**Commit:** `8e2b2500c69a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T14:27:52-05:00
**Tags:** blackwell-model-upgrade, u-bw-ts-engines-retire-2-scrutiny, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-TS-ENGINES-RETIRE-2-SCRUTINY (slot:alpha): close 3-of-3 arm-B FAIL + arm-C finding from the retirement diff

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-TS-ENGINES-RETIRE-2-SCRUTINY (slot:alpha): close 3-of-3 arm-B FAIL + arm-C finding from the retirement diff

arm-C (analyst) caught a LIVE dead reference the guard's =|??|||:-only matcher missed: OllamaContextFloorEngine WrapInputSchema model default was .default("qwen2.5-coder:7b") — a deleted model that cold-fails any caller omitting model. Re-pointed to qwen2.5-coder:32b.

Widened EXEC_RE to also police ( (call-arg / .default(...)) and [ (array-literal) positions — the same bypass class. Re-scan immediately caught a real stale block in extend-intel-envelope-v3.mjs (multi_model_stack declared deepseek-r1:14b as PRIMARY reasoning + 7b/14b as 'existing' — a re-run could re-pull deleted models). Realigned the whole block: reasoning -> gpt-oss:120b/qwen2.5-coder:32b/gemma4:31b, existing -> [32b], vision (llama3.2-vision:11b) preserved.

arm-B (independent) flagged the SCAN_DIRS engine-dir extension as an untested invariant (R9). Added an exported isViolation(line) helper + a discrimination test proving the guard FIRES on all 7 executable positions (=, ??, ||, :, (, .default, [) and stays SILENT on //, *, # comments, bare array elements, the kept 32b floor, and prose. 3/3 pass.

Residual (handoff-flagged): the , (comma-position, 2nd+ array element) bypass is still uncovered — a future ', "deepseek-r1:14b"' would slip; deferred to avoid an unbounded fix-loop at high context. VERIFY: node --test scripts/no-retired-llm-refs.test.mjs -> 3/3.
```

## Files touched (4)
- mcp-server/src/engines/OllamaContextFloorEngine.ts |  2 +-
- scripts/extend-intel-envelope-v3.mjs               | 15 ++++++++++----
- scripts/no-retired-llm-refs.test.mjs               | 48 ++++++++++++++++++++++++++++++++++++++------
- 3 files changed, 54 insertions(+), 11 deletions(-)

## Lessons surfaced in commit body
- till uncovered — a future ', "deepseek-r1:14b"' would slip; deferred to avoid an unbounded fix-loop at high context. VERIFY: node --test scripts/no-retired-llm-refs.test.mjs -> 3/3.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8e2b2500c69a`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-MODEL-UPGRADE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._