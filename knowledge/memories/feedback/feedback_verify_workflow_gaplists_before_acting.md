---
name: feedback_verify_workflow_gaplists_before_acting
description: Machine-generated census/audit gap-lists are advisory — verify each diagnosis against live code/config before acting; blind execution can regress a correct surface
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.451Z
aliases: feedback_verify_workflow_gaplists_before_acting
---


A multi-agent census/audit Workflow produces reliable ENUMERATION (paths/sizes/counts from real `find/du/wc`) but UNRELIABLE DIAGNOSES. Treat every gap-list "action" as a HYPOTHESIS to confirm, not ground truth.

**Why:** 2026-06-04 (slot juliett) the H: DB-census Workflow's listed #1 P0 (`DB-GAP-LIST.md` item A2) claimed "all galaxy PATHS.md point at a non-existent `mcp-server/data/databases/DB_MANIFEST.json` — fix the path token". VERIFIED FALSE: all 34 PATHS.md already reference the CORRECT existing `data/databases/DB_MANIFEST.json` (22KB, v2.0.0). Blindly "fixing" it would have BROKEN the currently-correct fleet-wide pointers — a self-inflicted regression from trusting a synthesized claim. The store enumeration was right; the diagnosis was fabricated.

**How to apply:** before executing any audit/gap-list/census action — (1) does the named store actually exist (`ls`)? (2) is it really unwired (grep `src/` for the consumer, not just "by filename")? (3) is the claimed "wrong pointer" actually wrong (grep the real PATHS.md/config)? (4) is the "duplicate" a copy or a partition? Confirm with a targeted Read/Grep, THEN act. Prepend a VERIFY-BEFORE-ACTION caveat to any machine-generated gap-list you ship so no peer slot blind-executes it. Pairs with R12 (fail loud) + [[feedback_verify_actual_contract_not_proxy]] + the safety-rail "Have I made any assumptions I haven't verified?".
