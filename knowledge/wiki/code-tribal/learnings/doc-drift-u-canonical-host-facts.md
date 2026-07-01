# DOC-DRIFT/U-CANONICAL-HOST-FACTS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOC-DRIFT]/U-CANONICAL-HOST-FACTS (slot:papa): verified host specs + Ollama roster single-source-of-truth + R12 correction

**Commit:** `bf0b22bb5960` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T15:17:40-05:00
**Tags:** doc-drift, u-canonical-host-facts, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOC-DRIFT]/U-CANONICAL-HOST-FACTS (slot:papa): verified host specs + Ollama roster single-source-of-truth + R12 correction

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOC-DRIFT]/U-CANONICAL-HOST-FACTS (slot:papa): verified host specs + Ollama roster single-source-of-truth + R12 correction

Foundation for the doc-drift campaign. Verified LIVE: CPU 9950X3D 32T, GPU RTX PRO 6000 Blackwell 96GB VRAM (driver 596.59), 127GB physical RAM (227GB = commit limit incl pagefile, NOT RAM), 10 Ollama models. KEY FINDING: PC specs are NOT significantly drifted (feedback_build_for_blackwell_hardware is accurate/current); the real drift is the Ollama routing doctrine -- the fleet-documented offload default qwen2.5-coder:7b is NOT installed (actual: 32b heavy + 1.5b trivial), and gpt-oss:120b (65GB, fits the 96GB VRAM) deep-reasoning + a 5-VLM ensemble are under-documented. CORRECTS the U-SIDECAR-FRESHNESS-RAMGATE commit-msg misread (227GB-as-RAM). Routes the per-galaxy/skill/pipeline propagation to owning lanes (multi-chat campaign, not papa-solo; sequence after commit-charge pressure relief).
```

## Files touched (3)
- state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.html | 134 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md   |  45 +++++++++++++++++++++++++
- 2 files changed, 179 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bf0b22bb5960`
- Milestone envelope: `mcp-server/data/milestones/DOC-DRIFT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._