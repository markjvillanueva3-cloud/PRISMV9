# OCR Active-Learning Queue -- GOLD-Verification Worklist

> The gate to 100% print-reading accuracy. Each row is a print/page whose ensemble
> pseudo-labels need a HUMAN decision before they become GOLD supervised labels for india's
> blueprint-OCR LoRA. CONFIRM the corroborated dims (both VLMs agreed, high confidence) ->
> GOLD. Resolve the ambiguous dim-pairs (model value-disagreement). Reject the hallucination
> candidates. READ-ONLY surface -- verifying is an operator action; this tool never writes GOLD.

- **Distinct prints needing review:** 133
- **GOLD-candidate dims (corroborated, ready to confirm):** 142
- **Ambiguous dim-pairs (need a human pick):** 3119
- **Hallucination candidates (likely reject):** 1028
- _(16 duplicate rows from reaper-kill resume, deduped last-wins)_
- _generated: 2026-06-16T22:38:03.639Z_

## Top 5 prints by GOLD-readiness (verify these first)

| # | Print | Pg | Corrob (GOLD) | Conf | Ambig | Halluc | Readiness |
|--:|-------|---:|--------------:|-----:|------:|-------:|----------:|
| 1 | scanned document - 11_25_2019 2_00 pm.pdf | 3 | 7 | 0.99 | 5 | 2 | 4.0765 |
| 2 | scanned document - 12_19_2019 5_12 am.pdf | 1 | 5 | 0.99 | 2 | 2 | 3.5357 |
| 3 | scanned document - 12_5_2019 6_01 am.pdf | 2 | 7 | 0.99 | 7 | 10 | 2.5667 |
| 4 | scanned document - 12_30_2019 5_22 am.pdf | 2 | 8 | 0.99 | 13 | 8 | 2.5548 |
| 5 | scanned document - 11_15_2019 7_51 am.pdf | 1 | 2 | 0.99 | 0 | 1 | 1.8 |

_Source: scripts/ocr-al-queue-surface.mjs over corpus-train/active-learning-queue.jsonl. Re-run after each nightly OCR Training Loop pass._