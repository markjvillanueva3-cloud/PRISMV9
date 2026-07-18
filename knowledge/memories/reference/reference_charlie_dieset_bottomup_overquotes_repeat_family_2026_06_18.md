---
name: reference_charlie_dieset_bottomup_overquotes_repeat_family_2026_06_18
description: Bottom-up should-cost overquotes repeat/family tools 3-4x vs the accepted price; quoting system needs a historical-actual/family calibration layer.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.508Z
aliases: reference_charlie_dieset_bottomup_overquotes_repeat_family_2026_06_18
---


Quoting C-033626 R01 "flattening tool" die set (4 hardened tool-steel components: Base D2, Top Block D2, Center Post D2, 2x Alignment Pin M2) for PrecisionForm via a bottom-up should-cost workflow (slot:charlie, 2026-06-18).

**Finding:** the from-scratch bottom-up estimate (per-component setups, separate programming/HT/CMM per piece, grounded in canonical ShopConfigurationEngine JM rates) summed to **~$3,300 direct / ~$4,400-5,200 priced** — **3-4x the twice-confirmed accepted price of $1,395** (the 3-ear C-033626 AND the 2-ear sister C-033627 both quoted $1,395, PO P-065123 / JM quote #05/07/26_6). All 3 adversarial reviewers returned `reject`.

**Root cause (reviewer-consensus):** a naive bottom-up costs every component as a standalone first-article discovery job. JM builds this as a **bundled, tooled-up, repeat-FAMILY** job — shared fixtures, one CAM template reused across the 2-ear/3-ear variants, batched heat-treat, one combined CMM setup. Reverse-engineered, $1,395 implies ~8-10 total shop hours across all 4 components -> ~30% gross margin on the lean build (healthy, NOT underwater). A true cold one-off WOULD cost ~$3,500 (so $1,395 would be deeply underwater as a first build).

**Lesson for the quoting system (charlie galaxy):** a from-scratch bottom-up MUST be calibrated against historical actuals for repeat/family tooling or it massively over-quotes. This is exactly what charlie's quote-vs-actual reconciliation + historical-price layer exists for — wire the bottom-up to defer to (or blend with) the historical family price when a matching prior build exists. Net-new die set from a new customer = quote the cold-build (~$3k+); repeat family = quote the established price.

**Method notes:** machine rates in ShopConfigurationEngine are all-in work-center rates (machine+operator+direct floor OH) -> applying overhead_pct 18% on top risks double-counting OH (reviewer-flagged). Synthesis agent failed on a server rate-limit (not usage cap); rolled up by hand. One estimator went off-script (duplicate Base instead of shop-services). [[feedback_psn_definition]]
