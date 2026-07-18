---
name: feedback_ascii_guard_only_blocks_new_nonascii
description: "ascii-guard blocks only NEW non-ASCII in your edit diff, NOT editing files that already contain non-ASCII"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.398Z
aliases: feedback_ascii_guard_only_blocks_new_nonascii
---


The `ascii-guard` PreToolUse hook blocks an Edit/Write **only when the NEW content you are
writing introduces non-ASCII characters** (em-dash, box-drawing, smart-quotes). It does NOT
block editing a file merely because that file already contains pre-existing non-ASCII elsewhere.

**Why:** A surgical ASCII-only Edit to `mcp-server/src/routes/cost.ts` (which has ~10 lines with
em-dashes in untouched comments) committed with NO ascii-guard block (2026-06-19, slot:sierra,
commit `93dcf472bb`). The hook inspects the diff's new strings, not the whole file.

**How to apply:** Do NOT defer a 2-line route/action fix on a mature file just because the file
contains em-dashes. Make the surgical ASCII-only edit (use `--` not `—`, plain quotes) and it
passes. The earlier FE-route campaign wrongly routed 5 files (erp/orchestration/pipeline/manus,
+cost before it was fixed) to other owners citing "ascii-guard blocked" -- that reason was wrong;
the legitimate reasons to defer were (a) the router is UNMOUNTED (not live traffic, INFO severity)
and (b) the target dispatcher action is genuinely absent and needs domain-owner judgment to build.
Match surrounding comment style in spirit but use ASCII equivalents for any NEW line you write.

Corrects the prior belief recorded during the FE-route action-contract campaign that ascii-guard
"blocks editing ALL files with pre-existing non-ASCII". See [[feedback_route_fix_verify_param_contract]]
and [[reference_fe_route_action_contract_2026_06_19]].
