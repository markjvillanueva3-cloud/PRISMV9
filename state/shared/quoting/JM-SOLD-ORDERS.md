# JM-SOLD-ORDERS — outbound pricing mined from JMD Orders Closed (customer POs to J.M. Die)

> Generated 2026-05-30T15:08:57.231Z · source: `Docustrata/JMD Orders Closed (customer POs to J.M. Die — outbound sold orders)` · owner: slot:charlie · **advisory, must-human-verify, OCR-noisy**.
> Best-effort parse of a NOISY OCR text layer. Only high/medium-confidence records carry usable pricing; low/none need the xray OCR pipeline. Never feed low-confidence prices into a live quote.

- **12761** orders processed · **240** with verified line-items · **$47,142.12** confirmed ext-revenue (high/medium only)

## Confidence distribution
| Confidence | Orders | Meaning |
|------------|-------:|---------|
| high | 40 | PO# + verified qty×unit=ext line-item |
| medium | 4141 | price table + figures, line-item unverified |
| low | 7247 | a PO# or stray figure only |
| none | 1333 | nothing recoverable from text layer → needs xray OCR |

## Top sold orders by ext-total (high/medium confidence)
| PO# | quote ref | line-items | ext total |
|-----|-----------|-----------:|----------:|
| — | Date | 16 | $5,765 |
| — | Lead | 5 | $5,592 |
| — | Lead | 13 | $2,933.75 |
| — | — | 2 | $2,040 |
| — | 04/09/18 | 1 | $1,990 |
| — | — | 1 | $1,900 |
| — | 04/18/18_l | 6 | $1,638 |
| P106989 | — | 1 | $1,380 |
| — | From | 1 | $1,216 |
| — | — | 1 | $1,198 |
| — | — | 1 | $1,080 |
| — | — | 1 | $1,030 |
| — | — | 1 | $1,020 |
| P3041 | — | 1 | $977.5 |
| — | — | 1 | $864 |
| — | — | 1 | $850 |
| — | — | 1 | $822 |
| — | — | 1 | $790 |
| — | — | 1 | $678 |
| — | — | 2 | $576 |
| — | — | 1 | $564 |
| — | — | 2 | $488 |
| — | — | 1 | $480 |
| — | — | 1 | $474 |
| — | — | 1 | $436 |

## Next step (R12)
Full + reliable extraction (esp. the 21,515 scanned JMD Sales Orders + the low/none fraction here) needs the **xray blueprint-vision OCR pipeline** — a cross-galaxy handoff, not a charlie text-layer parse. This profile covers the text-recoverable subset only.