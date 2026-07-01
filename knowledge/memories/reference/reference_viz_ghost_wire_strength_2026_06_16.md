---
name: reference_viz_ghost_wire_strength_2026_06_16
description: U-VIZ-GHOST-WIRE-STRENGTH (slot:sierra) -- ghost-wire validator now grades confirmations strong/weak (weak = engine name in a dispatcher COMMENT only, not real code) and the GNN ref-pool feed excludes weak labels; additive/backward-compat hardening of the "existence != correct wiring" false-positive class
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.252Z
aliases: reference_viz_ghost_wire_strength_2026_06_16
---


**SYSTEM-VIZ-HARDEN/U-VIZ-GHOST-WIRE-STRENGTH** (slot:sierra, system-viz domain, 2026-06-16, commit `94e2520d54` on cad-fusion-live-ms0).

Operator: "build wherever we need to" (Ultracode on). Picked an IN-DOMAIN, zero-staleness target (both files cad-fusion-only, absent on main -> no fork risk) over more cross-galaxy wiring (which had hit the owned-elsewhere/staleness wall 3x -- see [[reference_cadfusion_874_behind_main_2026_06_16]]).

**The bug class:** `validate-ghost-wires.mjs` marked a `ghost.unwired-engine` **confirmed** whenever the engine name matched `\bEngineName\b` ANYWHERE in the proposed dispatcher's text -- including a bare COMMENT mention (e.g. `// FooEngine to wire later`). That is the exact **"existence != correct wiring"** failure mode I hit 3x in cross-galaxy analysis this same session (a comment naming an engine is not a wire). These confirmed outcomes are **ground-truth labels** the consumer `ghost-wire-outcomes-to-refpool.mjs` feeds into india's GNN reference pool (PSN leg #10, which is BELOW-GATE on Brier calibration 0.21) -- so a comment-only false-`confirmed` injects a wrong label that degrades calibration.

**The fix (additive + backward-compatible -- no breaking change):**
- `stripComments(src)` -- pure exported JS/TS comment stripper, string/template-literal aware (a `//` inside a string is NOT stripped), O(n) single pass, no regex backtracking. Conservative-by-design: any ambiguity is treated as CODE (kept), so a mis-strip can only downgrade a real match to weak (excluded) -- NEVER upgrade a comment to strong. Precision over recall for ground truth.
- `analyzeConfirmationContext(name, text)` -> `{ codeMatch, commentMatch, inImport, strength }`. strength = "strong" iff the name survives comment-stripping (real code reference), else "weak" (comment-only).
- `classifyGhostWire` confirmed branch attaches `confirmationStrength` + `evidence`; **status STAYS "confirmed"** (backward-compat -- existing tests + the augmentation overlay consumer `merge-augmentations.mjs` unaffected). `validate()` adds `counts.weakConfirmed` (a STRICT SUBSET of confirmed -- never reduces it) + overlay `ghost_wire_confirmation_strength`.
- `ghost-wire-outcomes-to-refpool.mjs` ground-truth extractor now skips `confirmationStrength === "weak"`. **Backward-compat:** historical rows lacking the field (`undefined !== "weak"`) are KEPT -- no retroactive drop of the 545 historical confirmed labels.

**Cross-leg discipline (R7/R8):** sierra owns the graph + ref-pool FEED; india owns the GNN model weights. So sierra ENRICHES the labels (graded strength) and TIGHTENS the feed; india decides how to use the richer signal. Sierra did not unilaterally redefine "confirmed" (status unchanged) -- only added a quality grade + excluded provably-weak labels from the feed.

**HONEST (R12):** live run on the real 765MB graph = `confirmed:16, pending:193, malformed:52, weakConfirmed:0`. The CURRENT graph's 16 confirmations are all legitimately strong, so this is **PREVENTIVE** hardening against the comment-only false-positive class (not a hot-fix for a rampant problem) + adds graded `evidence` (incl `inImport`) useful to downstream consumers. It also proved the validator runs end-to-end on the live graph (streaming read path intact -- no regression).

**Verification:** validate-ghost-wires.test.mjs 26/26 (14 new: stripComments x5 incl string-literal `//` preservation + escaped-quote adversarials, analyzeConfirmationContext x5 incl word-boundary MillEngine!=WindMillEngine, classifyGhostWire weak/strong x2, validate weakConfirmed x2 + 1 integration assert) + ghost-wire-outcomes-to-refpool.test.mjs 11/11 (3 new: weak-excluded, backward-compat-kept, weak-doesnt-shadow-strong via skip-before-dedup). 2-agent scrutiny PASS (code-analyzer + reviewer, 0 P0/P1; reviewer traced the merge-augmentations overlay consumer + confirmed Object.assign forwards the new field additively-safe).

**Process note:** first scrutiny dispatch must use ABSOLUTE `H:/prism/...` paths -- a slot session's cwd is the slot worktree (`H:/prism-slot-sierra`); relative paths make the reviewer audit the wrong tree (cost a wasted pass earlier this session, see [[reference_xgal_bar_stock_trio_2026_06_16]]).

Related: [[reference_u_viz_ghost_wire_validate_2026_05_21]] (the original validator) · [[reference_gnn_refpool_123_groundtruth_ready_2026_06_13]] (the ref-pool feed this improves) · doctrine [[feedback_read_full_content_not_titles]] (existence != correct/complete).
