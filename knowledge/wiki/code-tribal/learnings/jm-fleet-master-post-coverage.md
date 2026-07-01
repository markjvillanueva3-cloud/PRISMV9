---
title: JM fleet master-post closed-loop coverage (enumerate the denominator)
slug: jm-fleet-master-post-coverage
domain: post-processor
slot: echo
created: 2026-06-28
commits: [e7d116f03f, 7d3c707723]
tags: [post-processor, closed-loop, corpus, jm-fleet, okuma, haas, live-tool, c-axis, r15, coverage]
---

# JM fleet master-post closed-loop coverage

The post-processor closed-loop training corpus (`state/shared/post-training/post-training-corpus.json`)
is the SET of master posts the harness scores. "Generate master posts for ALL JM fleet machines" means
every NC-programmable JM machine must be IN that set -- not a representative sample.

## The denominator (read it, don't assume)

`ShopConfigurationEngine.DEFAULT_MACHINES` is the source of truth: JM has **21 machines**, of which the
**NC-programmable G-code fleet is 12**: 5 mills (VMC-01 Hurco / 02 Okuma OSP / 03 Haas VF-2 / 04 Haas
OM-2 / 05 Roku-Roku Fanuc) + 7 lathes (LTH-01..07, all Okuma OSP; LTH-07 Multus = mill-turn). The other
9 are 1 wire-EDM (Mitsubishi -- WEDM galaxy / mike), 2 sinker-EDM (electrode-burn, not a G-code post),
and 6 support machines (saw/grinder -- not NC-programmed).

## The gap class: built+wired but NOT in the closed loop (R15 wire-into-the-loop)

A machine can have a fully BUILT + dispatcher-WIRED master-post engine and STILL be invisible to the
closed loop if no corpus entry references it -- the harness never scores it. This is the same R15 gap
RokuRoku had (2026-06-25: engine shipped + route-wired but never in the training SET). 6 JM machines
were in exactly this state until 2026-06-28: the 5 non-LB3000/Multus Okuma lathes + Haas OM-2.

**Before claiming corpus coverage, enumerate the real machine list and diff it against the corpus.**

## Two engine facts that made the fix a clean ADD (R8 read-before-write)

1. **`OkumaB250LatheMasterPostEngine.OKUMA_LATHE_MACHINES`** already holds all 7 JM Okuma lathe identities
   (model + controller, keyed by machine_id; added U-PP-LATHE-JM-FLEET-IDENTITY). So a corpus entry with
   `config.machine_id: "GENOS-L300-M"` emits an ACCURATE `(MACHINE: OKUMA GENOS L300-M OSP-P300L-R)`
   header with NO "Unknown machine_id" warning. An unknown id does not reject -- it defaults to LB250II-M
   and warns. So reading the table first avoided building a redundant one.
2. **`c_mill` is fully wired** for C-axis live tooling: schema enum (`camActionSchemas.ts`) includes it;
   the engine routes `case "c_mill" -> generateCAxisMilling` (emits M76 home / M23+M203 live-tool CW /
   G12.1+G13.1 polar on-off / M24 off). So live-tool coverage was a job-set add, not an engine build.

## Verify without :3100 -- direct-engine sidecar (and it is STRICTER)

The shared MCP daemon (:3100) OOM'd mid-run (heap near cap). Do NOT restart the shared fleet server.
Verify directly against the engine singletons via a sidecar mirroring `scripts/haas-post-proof.ts`:
generate -> `post-nc-dialect-lint.mjs` -> `post-nc-conformance.mjs --structural`. The direct path is
actually STRICTER than the :3100 harness: it can assert the exact per-machine `(MACHINE:)` header and,
for live tooling, the required M76/M203/G12.1/... markers + no-NaN -- checks the HTTP harness does not do.
Sidecar: `scripts/verify-jm-fleet-coverage.ts` -- 6/6 fleet posts + 3/3 live-tool machines PERFECT
(0 dialect-ERR + structural-100% + 0 skipped + accurate header).

## Lesson

A closed-loop training corpus's coverage claim is only as good as its DENOMINATOR. Enumerate the real
population (here: ShopConfig machines), diff against the corpus, and close the wire-into-the-loop gaps --
a built+wired engine that no corpus row references is invisible to the loop. When the live daemon is
down, the direct-engine proof path is both non-disruptive and a tighter check than the round-trip.

## Related
- [[hurco-winmax-lathe-isnc-post]] -- the prior unit (the 9th post that first made the corpus 9/9)
- [[reference_echo_jm_fleet_coverage_2026_06_28]] (memory)
- `OkumaB250LatheMasterPostEngine` / `HaasNGCMillMasterPostEngine` -- the engines proven
