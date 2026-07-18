---
title: Hurco WinMax lathe ISNC post + G75 dialect gotchas
slug: hurco-winmax-lathe-isnc-post
domain: post-processor
slot: echo
created: 2026-06-27
commits: [7853a6402f, c1619e1c62]
tags: [post-processor, lathe, hurco, winmax, isnc, fanuc, g75, dialect, scrutiny]
---

# Hurco WinMax lathe ISNC post + G75 dialect gotchas

`HurcoWinMaxLatheMasterPostEngine` (`mcp-server/src/engines/`) is the operations->NC generator for the
Hurco WinMax LATHE, wired via the dedicated `master_post_hurco_winmax_lathe` camDispatcher action. It
closed the LAST `actionVerified:false` post in the closed-loop post-training corpus (now 9/9).

## Dialect basis: WinMax ISNC == Fanuc-form turning

Hurco WinMax controls run conversational OR **ISNC** (Industry-Standard NC) mode. ISNC turning IS
Fanuc-compatible G-code, so the post emits standard Fanuc-form turning (G96 CSS + G50 RPM clamp, G99
feed/rev, G54, `T<nn><nn>`, `( )` comments). The engine was adapted from the proven
`OkumaB250LatheMasterPostEngine` turning structure (reuses its `TurningOperation` shape).

**Key dialect correction vs the Okuma template: G71, not G72, for longitudinal roughing.** In
Fanuc/ISNC, **G71 = longitudinal (OD/ID) roughing** and **G72 = facing roughing**; Okuma OSP uses G72
for the transverse pass. Cloning an OSP post into a Fanuc-form post must swap G72->G71 for OD turning.

## Two G75 gotchas (caught by 3-of-3 scrutiny arm A, both inherited verbatim from the Okuma template)

Fanuc/ISNC G75 grooving/parting two-block: `G75 R<e>` then `G75 X.. Z.. P<x-peck-um> Q<z-step-um> R.. F..`
where **P = X-axis radial peck (microns)** and **Q = Z-axis stepover between grooves (microns)**.

1. **Never emit `Q0` on a single-position cutoff/groove.** A part-off is a pure radial plunge at one Z;
   a `Q0` (zero Z-shift) is a malformed/ambiguous cycle that Fanuc-class controls reject or run
   degenerately. Fix: **omit the Q word entirely** for a single-Z cut (X-pecking only).
2. **Emit Q only when the groove actually spans Z.** A single-position plunge groove has
   `start_z == end_z` -> emitting `Q<grooveWidth>` with no Z travel is geometrically inconsistent. Gate
   it: `const qWord = Math.abs(end_z - start_z) > 0 ? " Q<width>" : ""`.

Lesson: **a dialect-correct cycle in one control family is not automatically correct in another** -- when
cloning a post engine across dialects, the canned-cycle word semantics (G71/G72 roles, G75 P/Q meaning,
Q-omission rules) must be re-verified, not copied. A structural dialect linter passes these (0 errors)
because they are word-present/structurally-valid; only a semantic review (or a real CIMCO sim) catches them.

## Other guards in the engine

- Per-op-type non-finite guard (the RokuRoku/HaasNGC bug-class): a NaN/+-Infinity in an emitted field
  drops the op with a visible ERROR block, never a literal `XNaN`/`FNaN` block.
- Threading: G97 fixed RPM (not CSS); guards missing/non-positive pitch; derives thread depth from pitch
  (`0.6134 * pitch`, 60deg metric single-depth) when absent.
- Zod boundary schema `master_post_hurco_winmax_lathe` (`camActionSchemas.ts`) `.positive()`-bounds
  pitch/feed/depth -- the dispatcher-edge validation every sibling master-post action has.

## Deferred (operator-gated, separate unit)

The conversational **WinMax-UI driver** path (PrismWinMaxUI process-attach + on-site lathe Tool-Setup
FSM map) needs the live on-site controller -- it is NOT this ISO-G-code engine. See the corpus
`driverPlan` + `state/shared/specs/ECHO-OPEN-TASKS-LEDGER.md`.

## Related
- [[post-processor-knowledge-base]] -- canonical post-processor domain KB
- [[reference_echo_loop_2026_06_27]] (memory) -- the build session
- OkumaB250LatheMasterPostEngine -- the turning-structure template this adapted
