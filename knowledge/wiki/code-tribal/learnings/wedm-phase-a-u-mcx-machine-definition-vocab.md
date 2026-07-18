# WEDM-PHASE-A/U-MCX-MACHINE-DEFINITION-VOCAB — [MAIN] [WEDM-PHASE-A]/U-MCX-MACHINE-DEFINITION-VOCAB (slot:charlie iter42): JM Die WEDM corpus is dominantly Mitsubishi FA-class — 77/97 X-WIRE + 53/97 FA-FX + 31/97 FA-SERIES 4X

**Commit:** `c117f699c703` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T02:43:49-05:00
**Tags:** wedm-phase-a, u-mcx-machine-definition-vocab, auto-distilled

## Subject
[MAIN] [WEDM-PHASE-A]/U-MCX-MACHINE-DEFINITION-VOCAB (slot:charlie iter42): JM Die WEDM corpus is dominantly Mitsubishi FA-class — 77/97 X-WIRE + 53/97 FA-FX + 31/97 FA-SERIES 4X

## Body
```
[MAIN] [WEDM-PHASE-A]/U-MCX-MACHINE-DEFINITION-VOCAB (slot:charlie iter42): JM Die WEDM corpus is dominantly Mitsubishi FA-class — 77/97 X-WIRE + 53/97 FA-FX + 31/97 FA-SERIES 4X

iter-41 surfaced .wmd-* machine-definition refs as the real high-leverage operator vocabulary in .mcx-* embedded strings (vs the dead-end material vocab). This unit walks all 97 corpus .mcx-* binaries, extracts every .wmd-* identity, and aggregates a machine-definition catalog with suffix-fragment dedup.

Output: state/shared/wedm-mcx-wmd-catalog.json

Final distribution (7 unique after dedup, 4 suffix-fragment artifacts suppressed):

  77/97  generic_wire        X WIRE (TECH).wmd-5            (Mastercam X5 generic wire-EDM)

  53/97  mitsubishi_fa_fx    MPW MITS FA-FX EDM(TECH).wmd-8 (Mitsubishi FA-FX X8)

  16/97  generic_wire        MITSUBISHI FA-SERIES 4X WIRE (TECH).wmd-8

  15/97  generic_wire        MITSUBISHI FA-SERIES 4X WIRE (TECH).WMD-8 (case variant)

   2/97  generic_wire        Wire Default.wmd-8

   1/97  generic_wire        MITSUBISHI FA-SERIES 4X WIRE.WMD

   1/97  generic_wire        WIRE DEFAULT.WMD

By format: .wmd-8=86 manifest-hits · .wmd-5=77 · .wmd=2

By machine class: mitsubishi_fa_fx=53 (explicit) + generic_wire=112 (mostly Mitsubishi FA from name inspection but the machine_class regex needs MITSUBISHI/FA-SERIES patterns to classify them properly — follow-up tightening)

Operationally significant findings:

  ✓ JM Die's WEDM corpus is OVERWHELMINGLY authored against Mastercam machine definitions targeting Mitsubishi FA-class wire-EDM machines. Combined Mitsubishi FA signal = 53 (FA-FX explicit) + 31 (FA-SERIES 4X variants) + likely overlap with the 77 'X WIRE (TECH).wmd-5' (which is the generic Mastercam X5 wire def operators tend to leave on default when posting to a Mitsubishi target).

  ✓ PRISM WEDM safety/physics defaults should bias toward Mitsubishi FA-class machine envelope, controller dialect (M20/M21/M78/M58/M90 + E-codes), multi-pass recipe per Mitsubishi tech-database convention. Charlie's slot soul's 'Multi-pass discipline per Sandvik/Mitsubishi recipe' is corpus-confirmed.

  ✓ 18/97 manifests had ZERO .wmd refs in embedded strings — those are probably files where Mastercam's machine-definition reference was kept in a compressed region the parser can't reach (iter-40 R12: X8 binary is genuinely opaque). Worth a follow-up sample inspection.

Suffix-fragment dedup pass (NEW): the engine's printable-run extractor emits overlapping strings from the same byte region — both 'EDM(TECH).wmd-8' AND 'ECH).wmd-8' appear as separate strings. Dedup suppresses any wmd name whose lowercased form is a strict suffix of another wmd AND whose manifest-set is a subset. Conservative — only kills true noise. Suppressed 4 fragments this run.

Follow-up units surfaced:

  - U-WMD-MACHINE-CLASS-REGEX-TIGHTEN: extend MACHINE_CLASS_PATTERNS so MITSUBISHI/FA-SERIES variants classify as mitsubishi_fa_fx instead of generic_wire (the regex needs FA-SERIES + MITSUBISHI keywords beyond the strict FA-FX form)

  - U-WMD-COMPRESSED-REGION-SAMPLE: investigate the 18 zero-wmd manifests — are they X8-internal-only refs, different post-processor, or genuinely .wmd-less projects?

Files: scripts/wedm-mcx-wmd-catalog.mjs +220 · state/shared/wedm-mcx-wmd-catalog.json +new

Memory: [[reference_phase_a_3iter_progression_2026_05_23]] (Phase-A context this builds on), [[reference_u_mcx_metadata_wire_2026_05_23]] (iter-35 reference_metadata wire)
```

## Files touched (3)
- scripts/wedm-mcx-wmd-catalog.mjs       | 226 +++++++++++++++++++++++++++++++++
- state/shared/wedm-mcx-wmd-catalog.json | 182 ++++++++++++++++++++++++++
- 2 files changed, 408 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c117f699c703`
- Milestone envelope: `mcp-server/data/milestones/WEDM-PHASE-A.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._