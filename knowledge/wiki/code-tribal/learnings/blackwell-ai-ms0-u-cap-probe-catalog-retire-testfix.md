# BLACKWELL-AI-MS0/U-CAP-PROBE-CATALOG-RETIRE-TESTFIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-CAP-PROBE-CATALOG-RETIRE-TESTFIX (slot:india): MS0 cap-probe keystone 3/19+1 RED->GREEN — tests encoded pre-retirement model catalog

**Commit:** `e626874eac8b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T10:11:57-05:00
**Tags:** blackwell-ai-ms0, u-cap-probe-catalog-retire-testfix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-CAP-PROBE-CATALOG-RETIRE-TESTFIX (slot:india): MS0 cap-probe keystone 3/19+1 RED->GREEN — tests encoded pre-retirement model catalog

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-CAP-PROBE-CATALOG-RETIRE-TESTFIX (slot:india): MS0 cap-probe keystone 3/19+1 RED->GREEN — tests encoded pre-retirement model catalog

Root: qwen2.5-coder:7b was `ollama rm`'d 2026-06-04 (U-BW-TS-ENGINES-RETIRE, slot:alpha) and dropped from DEFAULT_MODEL_CATALOG. The cap-probe iterates this.catalog and only marks a present model runnable if it is IN the catalog AND fits free VRAM — so 3 OllamaCapabilityProbeEngine tests + 1 ConnectionFinderEngine default test (asserting 7b as live catalog/default) went RED. ENGINE CODE WAS CORRECT; the TESTS were stale = the model-retired-but-consumer-test-stale regression class (india schema-read-blindness family).

Fix (intent-preserving, no weakened assertions — 2-reviewer per-file PASS, both traced engine source):
- OllamaCapabilityProbeEngine.test.ts: migrate 3 tests + fixture to live catalog models. phi3:14b (vramGB14=14336MiB, runsOn[home_blackwell,home_4080]) for the fit/no-fit tests (14336<=15000 runnable; 14336>10000 excluded); qwen3-vl:8b (vramGB6, home_blackwell) for the happy-path runnable set. PS_7B_LOADED->PS_LOADED_8GB (size_vram drives WDDM estimate; /api/ps name need not be in catalog).
- ConnectionFinderEngine.test.ts: DEFAULT_OLLAMA_MODEL assertion 7b->qwen2.5-coder:32b (live engine default at ConnectionFinderEngine.ts:34).

Validation: OllamaCapabilityProbeEngine 19/19 GREEN; ConnectionFinderEngine + 7 consensus/idea tests 266/266 GREEN (those reference retired names only as opaque string fixtures/input-echo — legit, no-retired-llm source-lock is engines-only). tsc clean on both files. 28 other test model-name refs verified non-stale (fixtures/historical records).
```

## Files touched (3)
- mcp-server/src/__tests__/ConnectionFinderEngine.test.ts      |  7 +++++--
- mcp-server/src/__tests__/OllamaCapabilityProbeEngine.test.ts | 33 +++++++++++++++++++++------------
- 2 files changed, 26 insertions(+), 14 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e626874eac8b`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-AI-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._