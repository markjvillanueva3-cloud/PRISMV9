---
title: A JSON-truncation repair that only handles a mid-VALUE cut silently loses the whole extraction on a mid-KEY cut
slug: truncation-keycut-salvage
galaxy: blueprint-vision
slot: xray
type: lesson
created: 2026-06-23
tags: [ocr, vlm, json-repair, recall, truncation, R7, R12, blueprint-vision]
---

# Mid-KEY truncation was losing entire dense-print extractions (U-XRAY-TRUNCATION-KEYCUT)

**Commit:** `fa6a037974` (`cad-fusion-live-ms0`, slot:xray). Found while live-validating the reading-knowledge channel.

## The bug

A dense JM drawing's VLM JSON output exceeds `num_predict:4096` and is cut off mid-output. `parseVisionResponse`
(`scripts/lib/ollama-vision-extract-lib.mjs`) had **tier-1** `repairTruncatedJson`, which closes a truncated trailing
**value** string (salvaging a partial dim). But when the cut lands on a **key** position -- a comma + the opening
quote of the next key (`..., "`) -- tier-1 closes the dangling string into `..., ""}` (a key with no `:value`) =
**invalid JSON** -> `success:false` -> the **entire print** (all ~30 dims already read before the cut) is lost.

Live: qwen2.5vl:7b on a dense punch-block print returned `parse_ok=false / 0 dims` on 3/3 runs (raw_len ~6900-7976,
right at the cap). Dense prints are the norm in the JM corpus, so this was a large, silent recall leak.

## The doctrine correction (R7)

The prior test asserted *"mid-key cut -> fail loud entirely, never fabricate."* That is **over-conservative**: the
dims before the cut are complete, real, byte-for-byte model output -- recovering them is **salvage, not fabrication**.
Discarding ~30 real dims to avoid a fabrication that does not occur is the wrong trade. Superseded: recover the
complete dims, drop the incomplete fragment, still never fabricate.

> Updating a "fail loud" test is normally forbidden (you must not weaken a gate to go green). This was allowed
> because it is a **doctrine correction, not a weakening**: the anti-fabrication intent is preserved AND strengthened
> (the new test proves the partial fragment is dropped, never invented into a 2nd dimension). Two independent scrutiny
> arms confirmed this distinction before it shipped.

## The fix

New pure **tier-2** `salvageTruncatedJson`: a structural scan tracking the container stack + string state. On
truncation it trims to the **deepest open frame that has a complete element/property** (a freshly-opened empty frame
is dropped, never emitted as junk `{}`) and appends only closing brackets.

- **Provably non-fabricating:** every output is `text.slice(0, lastCompleteBoundary) + ]/} closers` -- a true prefix
  of the real model bytes plus closers. A number truncated mid-digits is dropped, never surfaced as garbage.
- **Tier ordering:** tier-2 runs only after tier-1's parse fails, so tier-1's better value-string salvage (which keeps
  a partial dim's `raw_text`) is preserved. Wired into both the array path (`tryParseWithRepair`) and the object path.
- **Zero-recovery -> null (fail loud):** a truncation that recovers no complete value returns null so the print
  re-OCRs via `--retry-failed`, never banked as an empty "success".

## Validation

Same dense print: **0 dims / parse_ok=false 3/3 -> 28 / 25 / 28 dims / parse_ok=true 3/3**. 127/127 extract-lib tests
(6 new salvage cases + the mid-KEY test rewritten to assert recovery-without-fabrication) + 45/45 ensemble no-regression.

## Lessons

1. A JSON-repair that only closes a truncated **value** silently loses the whole object on a truncated **key** --
   recover to the last complete element/property and close; never fabricate.
2. A "fail loud" gate that discards real, complete data is over-conservative. The right fix recovers the real data
   while preserving the anti-fabrication intent -- and that distinction must be independently confirmed, not assumed.
3. Reducing truncation *frequency* (a `num_predict` bump, or region-route crops with smaller output) is a complementary
   follow-on -- salvage recovers a truncated read, but a complete read is still better.

Memory: [[reference_xray_truncation_keycut_2026_06_23]]. Sibling: the 2026-06-06 truncation x leading-dot regression.
Pairs with [[reference_xray_reading_knowledge_2026_06_23]] + [[blueprint-reading-improvement-backlog-2026-06-19]].
