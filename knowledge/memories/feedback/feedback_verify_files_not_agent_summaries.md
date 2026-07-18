---
name: feedback_verify_files_not_agent_summaries
description: "A fan-out agent's empty/missing RETURN-SUMMARY is not evidence its FILE output is empty/missing — verify artifacts on disk independently, never via the producer's self-report."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.450Z
aliases: feedback_verify_files_not_agent_summaries
---


When a multi-agent fan-out writes artifacts (files), the orchestrator/synthesis step must judge completion from the **artifacts on disk**, not from the agents' **return summaries**. The two decouple: an agent can write a perfect file and return an empty/garbled summary (or none), and a synthesis agent that reads only the summaries will wrongly conclude "nothing was produced."

**Concrete case (2026-06-27, slot:zulu, FLEET-PHD-BUILDOUT):** the prior zulu fan-out authored 13 of 15 `DOMAIN-PLAN-<slot>.md` files to disk, but its agents' return-summaries came back empty. The synthesis step wrote `01-FLEET-ROLLUP.md` claiming "all 16 plans NOT WRITTEN / fan-out returned empty." Both were false — 13 genuine OSCAR-depth plans were on disk the whole time. Worse, 2 plans (xray, zulu) were *genuinely* missing and 1 (whiskey) had a non-existent Kienzle filename + 2 invented action names — defects a blind commit would have shipped.

**Why:** This is the "existence ≠ content" rule applied to the producer/observer seam. A producer's self-report is a lossy, unreliable proxy for its actual output. Trusting it both (a) under-reports real work (the 13 plans) and (b) hides real gaps (the 2 missing + 1 bad).

**How to apply:** After any fan-out that writes files, run an **independent verification pass**: `ls`/`wc -l` the expected artifacts (enumerate — `feedback_enumerate_before_read`), then read/grade the actual content (a read-only reviewer fan-out grounding every citation against source). Reconcile produced-vs-expected by the **file set**, not the summary set. Only then commit. The verification loop is where missing/fabricated artifacts surface — make it mandatory, not optional. See [[feedback_read_full_content_not_titles]] · [[feedback_never_assume_data_file_contents]] · [[feedback_all_means_all]] · sibling of R12 fail-loud and R16 loop-until-gaps-closed.
