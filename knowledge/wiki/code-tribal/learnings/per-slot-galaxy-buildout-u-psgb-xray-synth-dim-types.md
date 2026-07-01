# PER-SLOT-GALAXY-BUILDOUT/U-PSGB-XRAY-SYNTH-DIM-TYPES — [MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-SYNTH-DIM-TYPES (slot:xray) [BOOTSTRAP-SLOT-ENFORCE]: synthetic gen emits radius/angular/chamfer/GD&T — exercises the type-aware scorer

**Commit:** `467de9c33fd4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-01T22:21:53-05:00
**Tags:** per-slot-galaxy-buildout, u-psgb-xray-synth-dim-types, auto-distilled

## Subject
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-SYNTH-DIM-TYPES (slot:xray) [BOOTSTRAP-SLOT-ENFORCE]: synthetic gen emits radius/angular/chamfer/GD&T — exercises the type-aware scorer

## Body
```
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-SYNTH-DIM-TYPES (slot:xray) [BOOTSTRAP-SLOT-ENFORCE]: synthetic gen emits radius/angular/chamfer/GD&T — exercises the type-aware scorer

Broadens the synthetic OCR training corpus beyond linear+diameter so the closed loop measures the model reading + TYPING radius/chamfer/angular dims + GD&T FCFs. Exercises the new type-aware scorer's separation.

- radius + chamfer: LENGTH types (nominal_mm = inches x25.4) — overlap diameter/linear in magnitude, so the scorer's type-gated matching is genuinely tested (a radius must not match a linear of equal mm).
- angular: DEGREES, nominal_deg holds the angle, nominal_mm=null so the length scorer correctly DROPS it (no units lie; type-aware = an angle never cross-matches a linear mm). Honest representation.
- GD&T: ASCII-safe FCF rendered ([POS] .005 (M) A-B-C) + truth.gdt[] (symbol, length tolerance x25.4, datum_refs). OCR-reading coverage; NOT length-graded (orthogonal — for a future GD&T scorer).
- truth gains gdt[] + n_length_dims (length dims = scoreable set; angular+gdt present for reading).

7/7 gen tests: all-types-emitted, angular-is-degrees-not-mm guard, GD&T structural validity, type-aware self-score + radius!=linear cross-type guard (via scoreDimensionSet), hard-mode per-type key shape, inch round-trip range. Deterministic per seed.
```

## Files touched (3)
- scripts/lib/synthetic-print-gen.py       | 40 +++++++++++++++++++++++++++++++++++++++-
- scripts/lib/synthetic-print-gen.test.mjs | 60 ++++++++++++++++++++++++++++++++++++++++++++++++++++--------
- 2 files changed, 91 insertions(+), 9 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 467de9c33fd4`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-GALAXY-BUILDOUT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._