---
title: Post-processor feature coverage -- verify the EMIT, not the grep/doc-comment
slug: post-feature-coverage-verify-the-emit
domain: post-processor
slot: echo
created: 2026-06-28
commits: [ca7618500c, fb5d0f852b, a9ae37816b, 3ddf6db33f]
tags: [post-processor, feature-coverage, canned-cycle, g81, g83, g74, verify-emit, r8, r12, lesson]
---

# Post-processor feature coverage -- verify the EMIT, not the grep/doc-comment

When mapping which advanced features a post-processor engine *actually supports*, the only valid
evidence is the **generated NC**. A G-code appearing in the engine source (a `grep` hit), a doc-comment
header listing it, or a tribal tip mentioning it is **NOT** evidence the engine emits it for a given
operation. This was the dominant failure mode while mapping the JM post-processor feature coverage --
caught THREE times in one session (R8 read-before-write + R12 fail-loud):

1. **Mill canned cycles** -- the matrix first claimed an "all-5-engine canned-cycle gap" (drill -> G0/G1).
   Reading HaasNGC revealed it FULLY supports canned cycles via `op.cycle` -> G81/G82/G83/G73/G84/G85
   (with passing tests). The corpus drill job simply carried no `cycle` field, so the engine took the
   move-list path (engine: "cycle present -> canned; absent -> move list"). NOT an engine gap -- a
   corpus-doesn't-trigger gap. Fixed by adding a `cycle`-carrying drill job; HaasNGC + RokuRoku now emit
   `G81` (verified in NC).
2. **Lathe drilling** -- the matrix claimed "both lathe engines support G83/G87" from grep hits. Adding a
   lathe-drill job and reading the generated NC showed OkumaB250 emits a plain `G00 X0 Z4 / G01 Z-25 F.1
   / G00 Z4` move-list plunge -- NOT a peck cycle. The G83 grep hits were a tribal tip + live-tool code,
   not the drill-op handler. Real peck-cycle gap.
3. **OkumaOSP canned cycles** -- the engine's header doc-comment lists "Canned cycles: G81/G83/G73/G84".
   But there is NO `op.cycle` handling and the generated NC is move-list. The doc-comment is aspirational
   / unimplemented. So the genuine canned-cycle engine gap is **HurcoV11 + OkumaOSP** (2 engines), not 1.

## The rule

To claim a post engine "supports feature X", generate NC for an op that should trigger X and confirm the
feature G-code is **in the output**. Build a verifier that asserts it (e.g.
`scripts/verify-jm-fleet-coverage.ts` asserts a `G8x` canned cycle appears for the `drill-canned` job on
the Fanuc-family posts). `grep`-presence / doc-comment / tip = a HYPOTHESIS to verify, never a conclusion.
This is the post-processor instance of the fleet-wide "existence != content -- read the body, not the
title" doctrine.

## Safety corollary (why this gates feature builds)

The same trap applies to EMITTING a *new* feature G-code. Without confirming the real controller's actual
convention (e.g. Okuma OSP lathe peck drilling is **G74** face-peck, not necessarily Fanuc G83), an
autonomous build could emit a control-rejected or wrong cycle -- a CNC crash/scrap hazard. So the residual
feature builds (HurcoV11/OkumaOSP canned cycles, lathe peck, 5-axis TCP) are **gated on the controller
convention** (the goal's `hermes /learn` tribal-knowledge phase) + CIMCO sim validation, NOT something to
emit blind. Units-first / safety-first: confirm the convention, then emit, then CIMCO-verify.

## Related
- [[jm-fleet-master-post-coverage]] -- the machine-coverage layer (closed)
- [[hurco-winmax-lathe-isnc-post]] -- the dialect-correctness sibling lesson (G71-not-G72)
- `state/shared/specs/POST-FEATURE-COVERAGE-MATRIX-2026-06-28.md` -- the grounded, thrice-corrected matrix
- `scripts/verify-jm-fleet-coverage.ts` -- the whole-corpus :3100-independent verifier (asserts the emit)
