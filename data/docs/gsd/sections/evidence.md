## EVIDENCE LEVELS — What Counts as Proof

### L1: Claim
"This formula calculates cutting force." No proof provided.
Use case: Initial brainstorming, hypothesis generation.
NOT acceptable for any release.

### L2: Listing
"The formula uses Vc, fz, ap, ae as inputs." Enumerated but not verified.
Use case: Documentation, inventories, reference lists.
NOT acceptable for safety-critical outputs.

### L3: Sample (MINIMUM for standard release)
"Here's a worked example: Vc=200, fz=0.1, ap=3, ae=15 → Fc=847N."
At least one verified calculation with actual numbers.
Use case: Feature demonstrations, standard calculations.

### L4: Reproducible (REQUIRED for safety-critical)
"Run prism_calc→cutting_force with these inputs → verified against reference."
Can be independently run and produces same result.
Use case: Safety validations, physics model verification.

### L5: Verified (mathematical proof or exhaustive test)
"Validated against Sandvik handbook table 4.3 across 47 material groups."
Mathematically proven or exhaustively tested against authoritative source.
Use case: Certification, regulatory compliance.

### When to Use What Level
Routine data lookup → L2 sufficient
Standard calculation → L3 minimum
Safety-critical calculation → L4 required
Release candidate → L3+ for all components
New physics model → L5 required before integration

## Changelog
- 2026-02-10: v3.0 — Content-optimized. Examples for each level. When-to-use guidance.
- 2026-02-10: v2.0 — File-based. Added descriptions.
