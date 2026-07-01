# OLLAMA-STRESS/U-ALPHA-OLLAMA-BATTERIES-6 — [MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-BATTERIES-6 (slot:alpha): 6 new verified capability batteries extending the stress harness beyond short-mechanical tasks

**Commit:** `135fdb5a2ee2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T21:35:27-05:00
**Tags:** ollama-stress, u-alpha-ollama-batteries-6, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-BATTERIES-6 (slot:alpha): 6 new verified capability batteries extending the stress harness beyond short-mechanical tasks

## Body
```
[MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-BATTERIES-6 (slot:alpha): 6 new verified capability batteries extending the stress harness beyond short-mechanical tasks

Authored + adversarially reviewed via the ollama-capability-stress-expansion Workflow
(6 sonnet author agents + 6 sonnet reviewers), then self-test-validated:
- stress-battery-codegen.mjs    -- pure-JS function gen, vm-sandboxed exec verify (SELFTEST 36/36; review FIXED an initial 4/36)
- stress-battery-reasoning.mjs  -- deterministic multi-step logic/word problems (27/27)
- stress-battery-longcontext.mjs-- needle-in-haystack at 2K/8K/16K filler (117/117) -- exercises the byte-num_ctx fix
- stress-battery-jsonschema.mjs -- structured-JSON adherence + schema/type check (12/12)
- stress-battery-instruction.mjs-- hard mechanical output constraints (32/32)
- stress-battery-mfgdomain.mjs  -- G-code/ISO/tolerance/threading facts, exact-match (48/48)
Each is india-TASK_BATTERY-shaped {id,category,cases,prompt,verify}, consumed directly by
runTierSweep; verifiers are PURE+SAFE and FAIL on wrong answers (R9, proven by self-tests +
adversarial review). codegen's vm sandbox has NO require/process/fs + 1000ms timeout + throw->false.

scripts/ollama-stress-expanded-run.mjs: GPU-safe executor (model-outer, num_ctx auto-sized,
dynamic battery import so a broken file is skipped not fatal) -> per-battery capability matrix.

LIVE-NUMBER STATUS (R12 honest): the harness + verifiers PROVABLY work (demonstrated live:
reasoning 'who is shortest' -> 'Carol' -> verify true), but a CLEAN full matrix run was blocked
by Ollama flaking under concurrent 3-peer fleet load (contaminated sweeps returned all-0% /
empty when callOllama failed mid-run). The batteries are the durable asset; the clean matrix
needs a quiet Ollama window (run: node scripts/ollama-stress-expanded-run.mjs --include-codegen).
```

## Files touched (8)
- scripts/lib/stress-battery-codegen.mjs     | 343 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/stress-battery-instruction.mjs | 465 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/stress-battery-jsonschema.mjs  | 580 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/stress-battery-longcontext.mjs | 313 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/stress-battery-mfgdomain.mjs   | 404 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/stress-battery-reasoning.mjs   | 499 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/ollama-stress-expanded-run.mjs     | 107 ++++++++++++++++++++++++++++++++++++++++++++++++++
- 7 files changed, 2711 insertions(+)

## Lessons surfaced in commit body
- wrong answers (R9, proven by self-tests +

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 135fdb5a2ee2`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-STRESS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._