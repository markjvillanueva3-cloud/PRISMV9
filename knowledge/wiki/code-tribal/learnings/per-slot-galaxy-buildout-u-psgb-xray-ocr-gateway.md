# PER-SLOT-GALAXY-BUILDOUT/U-PSGB-XRAY-OCR-GATEWAY — [MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-OCR-GATEWAY (slot:xray): unblock vision OCR — qwen2.5vl default + num_ctx cap (the real blockers, NOT a dead daemon)

**Commit:** `bb4eae6aec6a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-29T23:15:55-05:00
**Tags:** per-slot-galaxy-buildout, u-psgb-xray-ocr-gateway, auto-distilled

## Subject
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-OCR-GATEWAY (slot:xray): unblock vision OCR — qwen2.5vl default + num_ctx cap (the real blockers, NOT a dead daemon)

## Body
```
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-OCR-GATEWAY (slot:xray): unblock vision OCR — qwen2.5vl default + num_ctx cap (the real blockers, NOT a dead daemon)

Operator: 'get ollama working so we can get ocr working.' Diagnosed end-to-end;
Ollama daemon was NEVER down (resident-model inference answered in 1s). Three
real blockers, all fixed, proven on a real JM electrode print (TT2000 die):

1. PyMuPDF (fitz) was NOT installed on H:/Tools/python (the runner docstring
   falsely claimed 'already installed') -> PDF->PNG render exit=3 BEFORE Ollama
   was even called. Installed pymupdf 1.27.2.3.
2. num_ctx was UNCAPPED -> qwen2.5vl:7b loaded footprint ~23GB (KV cache) >
   16GB GPU -> Ollama offloaded ALL layers to CPU (size_vram=0 in /api/ps) ->
   119s loads + multi-min inference -> 4-5min aborts. Cap num_ctx=8192 ->
   15.3GB GPU-resident, 15s load, ~55-74s/page. THE load-bearing fix.
3. DEFAULT_VISION_MODEL was moondream:1.8b which PARROTS the prompt example
   (it echoed 'central_oil_hole nominal 1.27' = literally the prompt example,
   not reading the drawing) -> switched to qwen2.5vl:7b which reads REAL dims
   (proven: 1.2340 dia, 0.876, 0.3575 +/-0.0002, title-block 'TAPTITE 2000 DIE').

Changes: lib DEFAULT_VISION_MODEL moondream->qwen2.5vl:7b, +num_ctx:8192 default
(caller-overridable via modelOptions), DEFAULT_TIMEOUT_MS 90s->180s (cold load +
dense page exceeded 90s). runner: +--num-ctx flag (default 8192) threaded through
callOllamaVision->modelOptions, docstring corrected (PyMuPDF install cmd + GPU
headroom note). 48/48 lib tests (45->48: +qwen default assertion, +2 num_ctx).

Operational note (NOT a code bug): the accurate VL model needs the fleet's 10GB
coder model UNLOADED to stay GPU-resident; under fleet contention it falls to CPU.
A batch over the 12,321 needs-OCR prints should run in an idle-fleet window.
```

## Files touched (59)
- .claude/helpers/{install-zebra-orchestrator-task.ps1 => install-zulu-orchestrator-task.ps1}              |   0
- .claude/helpers/{zebra-launch.ps1 => zulu-launch.ps1}                                                    |   0
- .claude/hooks/__tests__/{zebra-advisory-inject.test.mjs => zulu-advisory-inject.test.mjs}                |   0
- .claude/hooks/{zebra-advisory-inject.mjs => zulu-advisory-inject.mjs}                                    |   0
- knowledge/memories/galaxies/{hermes-zebra => hermes-zulu}/.gitkeep                                       |   0
- knowledge/memories/patterns/{hermes-zebra_synthesis.md => hermes-zulu_synthesis.md}                      |   0
- knowledge/memories/reference/{reference_zebra_orchestrator_ms0.md => reference_zulu_orchestrator_ms0.md} |   0
- knowledge/wiki/architecture/{zebra-hermes-gap-audit-campaign.md => zulu-hermes-gap-audit-campaign.md}    |   0
- knowledge/wiki/architecture/{zebra-omniscient-ms0.md => zulu-omniscient-ms0.md}                          |   0
- knowledge/wiki/architecture/{zebra-orchestrator.md => zulu-orchestrator.md}                              |   0
_(+49 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bb4eae6aec6a`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-GALAXY-BUILDOUT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._