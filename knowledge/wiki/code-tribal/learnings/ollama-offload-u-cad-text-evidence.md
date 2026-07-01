# OLLAMA-OFFLOAD/U-CAD-TEXT-EVIDENCE — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-CAD-TEXT-EVIDENCE (slot:zulu): wiki landscape entry + 3-generation live validation set for the Ollama text->CAD lane

**Commit:** `2fc773f30bd9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T15:14:20-05:00
**Tags:** ollama-offload, u-cad-text-evidence, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-CAD-TEXT-EVIDENCE (slot:zulu): wiki landscape entry + 3-generation live validation set for the Ollama text->CAD lane

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-CAD-TEXT-EVIDENCE (slot:zulu): wiki landscape entry + 3-generation live validation set for the Ollama text->CAD lane

knowledge/wiki/architecture/cad-text-to-cad-landscape.md: the open-source
recon (CadQuery/build123d+LLM, Text-to-CadQuery 170K, Seek-CAD, STEP-LLM)
mapped onto resident models + PRISM's live lane + the first 3-generation
validation set with domain-rule findings for delta's canonical prompt:
electrode conditional must scope to BURNING SURFACES only (gap correctly
applied to pocket geometry, wrongly to the shank); die plate generation
clean; stochasticity at temp 0.2 makes the Seek-CAD validate/refine loop
mandatory before any STEP reaches a machine. Structural gates 3/3.

Live artifacts: state/shared/cad-text-gen/{cube-hole,edm-electrode,
die-plate}-*/ (model.py + request + status).
```

## Files touched (2)
- knowledge/wiki/architecture/cad-text-to-cad-landscape.md | 46 ++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 46 insertions(+)

## Lessons surfaced in commit body
- wrongly to the shank); die plate generation

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2fc773f30bd9`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._