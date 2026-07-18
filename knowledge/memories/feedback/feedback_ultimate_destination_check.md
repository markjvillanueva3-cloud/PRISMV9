---
name: feedback_ultimate_destination_check
description: "Standing rule (operator 2026-06-15): before AND while building any unit, ask (1) where is this ultimately going? and (2) where should it eventually end up for the FULL build of the PRISM app? A deliverable is not done until it reaches its real consumer/home in the finished product -- not just when the local task compiles. The destination-awareness sibling of R15 (WIRE->TEST->VALIDATE->APPLY) and the 'existence != wired' doctrine."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.448Z
aliases: feedback_ultimate_destination_check
---


**Always ask: where is this ultimately going, and where should it eventually end up for the FULL build of the PRISM app?** (operator directive, 2026-06-15, slot:romeo while placing CAD/CAM tool libraries.)

Two questions, asked at task START and again before marking DONE:
1. **Where is this ultimately going?** -- what real thing consumes this output, what is the final integrated state it feeds into.
2. **Where should it eventually end up for the full PRISM app?** -- the canonical home/surface in the finished product (a dispatcher action + UI/bridge for an engine; an actual software/folder/import surface for a data file or tool library; an index/reader surface for a doc; the GNN ref-pool / LoRA dataset for knowledge).

**Why:** PRISM's recurring failure mode is the ORPHAN -- generated-but-not-placed, built-but-not-wired, extracted-but-not-consumed, doc-written-but-not-indexed. "It compiles / the file exists in the repo" is NOT the finish line. The finish line is the output sitting where its ultimate consumer reads it in the assembled product. Concrete trigger for this rule: the full-corpus tool libraries (118,409 tools x 3 CAM formats) were generated into `state/shared/` and the task FELT done -- but the operator's CAD/CAM seats can't read them there; the real destination is each software's tool-library folder (Fusion CAM dir / Mastercam `shared mcamx8` / hyperMILL tool DB). Generating != delivering. (Same class: unwired engines, ghost system-viz nodes, MIT-OCW extracted-but-not-routed, libraries-in-repo-not-in-software.)

**How to apply:**
- At task start, write down the END destination explicitly (one line). If you cannot name where it ultimately lands, you do not yet understand the task -- find out first.
- Before marking done, verify the change actually REACHED that destination this session, or -- if it cannot (peer-locked surface, live-software step, out-of-session run) -- name the destination + queue the bridge/placement step honestly (R12). Never let "the artifact exists" stand in for "the artifact is consumed."
- Zoom out one level past the immediate ask: a tool library -> imported by the CAM seat -> referenced by PRISM's CAM bridge -> used in print-to-program. An engine -> dispatcher -> UI/bridge -> the saleable product. Trace the chain to the full-app end state, then make sure your step connects to the next link.
- Pairs with the Karpathy anti-drift checkpoint (now carries this question) + [[feedback_wire_test_validate_all_galaxies]] (R15) + [[feedback_read_full_content_not_titles]] (existence != done) + [[feedback_build_in_logical_order]] (build each unit on a proven foundation toward the integrated whole).
