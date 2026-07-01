---
name: reference_offload_dashboard_xconv_2026_06_24
description: Canonical Ollama-offload dashboard now overlays the TRUE cross-bucket conversion of pure-advisory hooks (was mis-read as offload=0). Reuses crossBucketTakeRate.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.670Z
aliases: reference_offload_dashboard_xconv_2026_06_24
---


**OLLAMA-OFFLOAD/U-OFFLOAD-DASH-XCONV (`4752e0c25f`, slot:alpha, 2026-06-24).**

A **pure-advisory hook only SUGGESTS** — its own `byHook.<hook>.offloaded` is
structurally 0, so the canonical dashboard (`scripts/ollama-offload-dashboard.mjs`)
rendered it `offload=0` and a reader concluded "0% useful". Its TRUE conversion
lives in the **execution bucket it drives** (`CONVERSION_BUCKET_MAP`, e.g.
`large-read-digest-advisory -> ollama-file-digest`).

**Fix (observability ONLY):** `summarize()` now overlays a per-hook `xconvByHook`
by REUSING the already-tested pure primitive `crossBucketTakeRate` from
`scripts/lib/advisory-decay.mjs` (both it + `CONVERSION_BUCKET_MAP` were already in
HEAD — only the *decayDecision un-mute* DECISION-half remains the deferred gated
unit, deliberately left uncommitted/excluded). `xconvByHook` is a SEPARATE additive
field (byHook passthrough identity preserved); surfaces in `--json`; the per-hook
text render appends `xconv=...` only inside the `status==="measured"` branch so
unmeasured/absent buckets render honestly, never a manufactured 0.

**LIVE:** `large-read-digest-advisory -> xconv=0.8% (1/133 via ollama-file-digest)`
(was bare `offload=0`); `nav-rerank-advisory -> xconv=unmeasured (via
ollama-nav-rerank)`; unmapped hooks get no annotation. 47/47 tests (40 prior + 7
new reference-value; closed an R9 gap — the dashboard had no test importing
`summarize` before). 3-of-3 scrutiny PASS.

**Lesson (how to apply):** when a metric structurally reads 0 for a whole class of
producers, suspect the value is being measured in the wrong bucket — surface the
cross-bucket truth before concluding "useless", and REUSE the existing primitive
rather than re-deriving. Sibling of [[reference_ollama_offload_rate_healthy_2026_06_10]]
("the raw metric is misleading"). See [[feedback_low_take_rate_nudges_are_net_negative]]
for the downstream decision (the deferred gated un-mute unit).
