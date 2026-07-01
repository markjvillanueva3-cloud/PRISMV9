---
title: Offload dashboard cross-bucket conversion overlay (U-OFFLOAD-DASH-XCONV)
type: code-tribal
slug: offload-dashboard-xconv
commit: 4752e0c25f
slot: alpha
date: 2026-06-24
tags: [ollama-offload, observability, advisory-decay, token-economy, dashboard]
---

# Offload dashboard: surface the TRUE cross-bucket conversion of pure-advisory hooks

## The mis-read
`scripts/ollama-offload-dashboard.mjs` per-hook section rendered each hook's own
`byHook.<hook>.offloaded`. A **pure-advisory hook only SUGGESTS** (it never offloads
itself), so its `offloaded` is **structurally 0** — the line read `offload=0` and a
reader concluded the hook was 0% useful. Live: `large-read-digest-advisory`
fired/suggested 133 times, `offload=0`.

## The truth lives in another bucket
An advisory hook's real conversion is the offloads in the **execution bucket it
drives** — captured by `CONVERSION_BUCKET_MAP` in `scripts/lib/advisory-decay.mjs`
(`large-read-digest-advisory -> ollama-file-digest`, `nav-rerank-advisory ->
ollama-nav-rerank`, ...). The pure primitive `crossBucketTakeRate(stats, hook)`
returns `{injected, taken, takeRate, conversionKey, status}` — `taken/injected`
read across buckets, `unmeasured` (null, never a false 0) when the execution bucket
is absent.

## The fix (observability only — reuse, don't re-derive)
`summarize()` now builds a **separate additive** `xconvByHook` overlay (only for
mapped advisory hooks present in `byHook`) by **reusing** `crossBucketTakeRate`
(import — no fork). `byHook` passthrough identity is preserved; the field surfaces
in `--json`; the text render appends `xconv=...` only inside the `status==="measured"`
branch (unmeasured/absent render honestly). **decayDecision / classify / muting are
NOT touched** — that un-mute DECISION wiring is a separately-deferred gated unit.

Live after: `large-read-digest-advisory ... xconv=0.8% (1/133 via ollama-file-digest)`,
`nav-rerank-advisory ... xconv=unmeasured (via ollama-nav-rerank)`.

## Lesson
When a metric structurally reads 0 for a whole *class* of producers, the value is
probably measured in the wrong bucket — surface the cross-bucket truth before
concluding "useless". Reuse the existing tested primitive; keep observability
strictly separate from the gated decision that acts on it. 47/47 tests (7 new
reference-value), 3-of-3 PASS.

See also: `[[reference_offload_dashboard_xconv_2026_06_24]]`,
`[[ollama-offload-u-advisory-decay-xbucket]]`,
`[[feedback_low_take_rate_nudges_are_net_negative]]`.
