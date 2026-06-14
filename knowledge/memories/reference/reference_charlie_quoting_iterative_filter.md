---
name: reference_charlie_quoting_iterative_filter
description: Quoting gotcha
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.055Z
aliases: reference_charlie_quoting_iterative_filter
---


QUOTING-SYNERGY-MS0 iter9→iter41 chain. Each baseline regen surfaced 3-6 NEW R12 leak classes the prior iter's NON_CUSTOMER filter missed. This is multi-iter convergence — NOT a single-shot fix.

**Rule:** each filter extension ships with its OWN anti-regression test set AND the prior anti-regression set must continue passing. Expect to re-run the bootstrap, inspect the surviving non-customers, and add a guard — repeatedly — until the distribution stabilizes. The iter9-41 commit chain is the canonical reference for this discipline. Sister: [[reference_charlie_quoting_noncustomer_filter]].
