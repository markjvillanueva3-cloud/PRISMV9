---
title: parseInt-fractional threshold trap + staged-only lanes need their consumer armed
type: lessons
tags: [cron, tribal-knowledge, youtube, threshold, parseInt, producer-consumer, india, learning-pipeline]
created: 2026-06-25
slot: india
commits: [b8acbfcf5c, ce931d7527, 427b937d29]
related: [tribal-to-wiki-promotion, cad-learning-tribal-injection]
---

# parseInt-fractional threshold trap + staged-only consumer arming

Two reusable lessons from closing the video `/learn` promotion loop (slot:india, 2026-06-25).

## 1. The parseInt-fractional threshold trap (silently-disabled gate)

A CLI knob parsed with `parseInt(v, 10)` on a **0-100** confidence scale silently collapses a
fractional argument to `0`:

```
parseInt('0.9', 10) === 0     // parseInt stops at the '.'
```

`prism-tribal-promotion-cron.ps1` step 2 passed `--threshold 0.9` to `promote-tribal-to-wiki.mjs`,
whose `parseArgs` does `out.threshold = parseInt(argv[++i], 10)`. With `DEFAULT_THRESHOLD = 90` and
`shouldPromote = (confidence >= threshold)`, a threshold of **0** means **promote everything with
finite confidence** — the high-confidence gate is silently OFF. Live proof: `@90 above=628` (the
intended high-confidence subset) vs `@0.9→0 above=3919` (6.2x over-promotion).

**Rule:** for any `parseInt`-parsed 0-100 knob, pass an INTEGER. A value like `0.9` is the tell that
someone assumed a 0-1 scale. The mismatch reads as a working gate but is a no-op. Defend with an inline
comment on the call site AND, ideally, by rejecting/clamping non-integers in the parser.

## 2. A "staged-only by design" lane needs its consumer scheduled separately

`youtube-night-extract.mjs` is deliberately **staging-only** (it writes tips to
`state/shared/youtube-extraction/<videoId>.json` and never mutates the shared tribal store) — a correct
clobber-safety choice (cf. tribal-index clobber `8bf1873577`). But that design makes the **promote**
step (`promote-youtube-staged.mjs --apply`) a REQUIRED, SEPARATE scheduled arm. Here the producer
(extract) was scheduled but the consumer (promote) was not, so ~28 CAD/machining videos' tips pooled in
staging from 2026-06-12 to 2026-06-25 — extracted but never injected (**producer-alive / consumer-dead**,
the same class as the resources-embed lane fixed the same day).

**Rule:** when you find a scheduled PRODUCER (extract/stage/mine), verify the CONSUMER (promote/embed/ingest)
is scheduled too. A staging dir that only grows is the symptom. Arm the consumer on the same cadence (here:
added the youtube→tribal promote as step 1 of the existing tribal-promotion cron, before the tribal→wiki step).

## 3. Corollary: a fix can ACTIVATE a latent bug

Adding conf-60 video tips (low confidence) to a pipeline whose downstream wiki gate was silently broken
(threshold 0) would have turned a dormant defect live (the low-confidence tips would leak into wiki). The
2-of-2 scrutiny gate caught it. **Run the scrutiny gate even on a "trivial" one-line wire** — the risk is
not in the wire, it's in what the wire newly feeds into a previously-unexercised path.

## 4. Validate a producer THROUGH its consumer, not just in isolation (R15)

Building the web-article half of the same lane (U-WEB-SOURCE-TRIBAL-LANE), the producer staged RAW tip-gen
output `{title,body,category,tags,confidence,timestamp_hint}` — but the consumer (`TribalKnowledgeEngine.ingest`
→ `inferDomain`) does `tip.source.toLowerCase()` **unconditionally**, so a tip with no `source` field THROWS and
the artifact never promotes. The sibling youtube lane stages `tipsToKnowledgeTips(...)` (fully-formed records);
the new lane skipped that normalization.

It slipped because the live validation proved **staging** (8 tips written to the artifact) but never the
**promote round-trip through `ingest()`**. A producer that emits the wrong SHAPE looks perfect in isolation —
the bug only fires at the consumer. The 2-of-N scrutiny pair caught it (both arms P0).

**Rule (R15 TEST/VALIDATE):** when a new producer feeds an existing consumer (an ingest, a dispatcher, a promote
step), round-trip a real artifact THROUGH that consumer with numbers (`promoted=N tipsIngested=M failed=0`,
store-count before/after) before claiming done. Match the existing producer's output contract exactly — and
keep the provenance HONEST (a web article normalized through a youtube-shaped helper would be mislabeled a
video; use consumer-correct-but-source-accurate labels). The isolation test of the producer is necessary but
not sufficient; the seam is where the shape bug lives.
