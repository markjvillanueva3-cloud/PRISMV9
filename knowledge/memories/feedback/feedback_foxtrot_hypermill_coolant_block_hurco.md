---
name: feedback-foxtrot-hypermill-coolant-block-hurco
description: HyperMILL 4-char coolant block breaks Hurco V11; never assume cross-post coolant transfer.
type: feedback
slot: foxtrot
galaxy: mill
source: prism-memory
synced: 2026-06-27T20:30:46.426Z
aliases: feedback_foxtrot_hypermill_coolant_block_hurco
---


# HyperMILL 4-char `<Coolant>` block breaks Hurco V11 (mill→post)

HyperMILL emits a `<Coolant>` block in either a 2-character or 4-character format. The 4-character format breaks the Hurco V11 control dialect (parse error / ignored coolant → dry cut). Source: `master-post-fanuc-tail-coolant-fix` lessons.

**Why:** post dialects don't share coolant-code grammar; a block valid for one controller is malformed for another. This is a cross-galaxy gotcha (mill = CAM-side cause, post-processor = G-code-side effect).
**How to apply:** never assume a coolant block transfers across posts. Query the post-specific bridge for the controller (Hurco WinMax vs Fanuc vs Okuma OSP). VMC-01 = Hurco VM30i WinMAX v10 specifically. Verify the emitted coolant M-code against the target controller's grammar.
