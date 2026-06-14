---
name: reference-cag-hook-inject-peer-wire-2026-05-26
description: U-CAG-HOOK-INJECT peer-wired within 15min of cag-router lib commit — UserPromptSubmit hook composes scripts/lib/cag-router.mjs and writes route decision sidecars; 80+ sidecars across fleet validate wiring
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.044Z
aliases: reference_cag_hook_inject_peer_wire_2026_05_26
---


# CAG-HOOK-INJECT peer-wired (2026-05-26, sierra iter3 reorient observation)

**Producer-only U-CAG-HOOK-INJECT shipped by a peer chat (sierra iter28 per the hook header) within ~15min of my U-CAG-ROUTER-PURE-FN commit (3787ba822a, sierra iter1).**

**Live evidence**:
- `.claude/hooks/cag-router-inject.mjs` (+ `.test.mjs`) wired as UserPromptSubmit T2
- 80+ route sidecars in `state/shared/cag-route/` from many session ids = fleet-wide adoption
- `latest-5c0bd535-0ecb-4744-9e62-ac1ea40fbe71.json` = my own session's most recent route (tier=HYBRID conf=0 — bare /checkin had no keywords, correct LOW-CONFIDENCE fail-loud)

**Why this is compounding-loop in action**:
- I shipped the pure-fn library at 18:00Z (3787ba822a) with the U-CAG-HOOK-INJECT follow-up unit named explicitly in the commit body
- A peer chat (the hook header credits "sierra iter28" — likely a different session that picked up this slot later) picked the queued unit, built the producer hook, and wired it
- Hook header explicitly cites my memory file + commit hash + the producer/consumer split (R12 fail-loud about what's not yet wired)
- The next follow-up (`U-CAG-INJECTORS-CONSUME`) reads these sidecars from master-index-precheck-inject + memory-relevance-inject + [[reference_tribal_by_domain_inject|tribal-by-domain-inject]] + wiki-precheck-inject; the `skip:{...}` flags in every sidecar are already shaped for the consumers

**Design notes worth preserving**:
- Producer-only split: hook writes the sidecar but does NOT modify any other injector's behavior. Consuming is a separate unit. This keeps the verifiable surface small per Karpathy R12.
- Sidecar path: `state/shared/cag-route/route-<sessionId>-<promptHash>.json` + per-session `latest-*.json` symlinks (de-dup pointer pattern matching `loop-state/` and `cag-route/latest-smoke.json`)
- Knobs: `PRISM_CAG_ROUTER_INJECT_DISABLE`, `_VERBOSE`, `_SIDECAR_DIR` — full operator control
- Schema versioned (`schemaVersion: "1.0.0"`) — consumers can detect drift

**Status of the CAG-router milestone** (now formally part of [[reference_token_savings_pivot_2026_05_22|TOKEN-SAVINGS-PIVOT]] per the wired hook):
- ✓ U-CAG-ROUTER-PURE-FN (lib + 39 tests + wiki + 3 memories) — shipped 3787ba822a
- ✓ U-CAG-HOOK-INJECT (UserPromptSubmit producer) — peer-shipped, live fleet-wide
- ⏳ U-CAG-INJECTORS-CONSUME (4 downstream injectors read the sidecar `skip:{}` flags)
- ⏳ U-CAG-CACHE-CONTROL (Anthropic API client wraps doctrine block in `cache_control: ephemeral`)
- ⏳ U-CAG-DASHBOARD (`/system-viz` `ghost.cag_router` roost showing hit-rate + savings)

**Memory cross-refs**: [[reference_cag_router_2026_05_26]] · [[reference_x_article_cyrilxbt_2026_05_26]] · [[reference_x_article_dunik_7_2026_05_26]] · [[feedback_high_roi_backend_first_slot_queue]] (this is exactly the high-ROI backend-first compounding the doctrine prescribes)
