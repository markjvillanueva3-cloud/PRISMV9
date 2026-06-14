---
title: Speed-Feed Galaxy — Architecture Map
type: architecture
domain: speed-feed
slot: oscar
maintainer: oscar
seeded_by: alpha
created: 2026-06-01
tags: [speed-feed, sfc, kienzle, taylor, merchant, altintas, saleable-product, galaxy, oscar]
---

# Speed-Feed Galaxy — Architecture Map

The speed-feed galaxy (owned by **slot:oscar**) is the **Speed-Feed Calculator (SFC)** — one of PRISM's two saleable subscription products (with MasterPost). It computes physics-grounded cutting parameters (SFM, chipload/IPT, MRR, depth/width of cut, spindle/feed) for every cutting domain. The canonical, domain-owner-maintained knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (read this for the verified engine/algorithm list, NOT a hand-copy here): `mcp-server/src/engines/speed-feed/MEMORY.md` · doctrine: `mcp-server/src/engines/speed-feed/CLAUDE.md`

## Position in the pipeline

```
material + tool + machine + operation ─►  speed-feed (SFC physics core)  ─►  feed/speed per block
                                                  │                                │
                                                  └─ Kienzle / Taylor / Merchant   └─► consumed by mill (foxtrot),
                                                     / Altintas SLD                    lathe (whiskey), wedm (mike),
                                                                                       cam (kilo), post-processor (echo)
```

SFC is a **producer** of cutting parameters — it does not select CAM strategy (kilo) or emit G-code (echo); those consume its output.

## Physics core (canonical — import, never inline)

Kienzle (specific cutting force), Taylor (tool life), Merchant (shear-angle), Altintas SLD (stability-lobe / chatter). Constants live ONLY in `mcp-server/src/physics/constants.ts` (root CLAUDE.md §SAFETY — kc1.1 by ISO group P/M/K/N/S/H). The 9-axis orchestrator runs 3 modes; the engine carries a large max-variability assertion gauntlet (103-case matrix on `UltimateSpeedFeedEngine` + AutoSpeedFeed R12 `Math.round` fix, kilo `1b87f98f2`). Vendor-parity corpus: ~41K-tool HSMAdvisor / G-Wizard cross-check.

## Dispatchers / invocation

SFC telemetry + cutting-signal work is invokable via `prism_algorithm` (PSN leg #8 → this brain), e.g. `signal_savgol`. Domain map of every SFC engine/algorithm/data/wiki/tribal/dispatcher/skill file: [[reference_oscar_sfc_domain_map_2026_05_27]] · awareness surface + synergy audit: [[reference_oscar_sfc_awareness_surface_2026_05_28]].

## Tribal injection (wiring gap, 2026-06-01)

The tribal corpus has **182 speed-feed tips** in `state/shared/tribal-embed-index.json`, but `tribal-by-domain-inject.mjs` `DOMAIN_MAP` lacks a `speed-feed` domain, so they never route on a speed-feed prompt. Fix queued: [[reference_tribal_domain_map_gap_2026_06_01]] + patch-sibling `state/shared/dashboards/patches/HOOK-PATCH-TRIBAL-DOMAIN-MAP-EXPAND.md`.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/speed-feed/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`
- [[galaxy-context-federation]] — speed-feed is a federation spoke; rolls up to the master brain via `galaxy-cards/MASTER-DIGEST.md`
- [[feedback_psn_definition]] — oscar is the speed-feed/SFC brain on the PSN formula + algorithm axes

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the oscar galaxy card + master-index back-pointer. Domain owner (oscar) refines._
