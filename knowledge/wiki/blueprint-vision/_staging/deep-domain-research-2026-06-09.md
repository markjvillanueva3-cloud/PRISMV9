---
status: VERIFIED-PARTIAL
owner_slot: xray
staged_by: papa-deepdomain-research
promoted_by: papa-workflow (claude-b5de5424, 2026-06-09)
date: 2026-06-09
galaxy: blueprint-vision
focus: engineering-drawing OCR + GD&T extraction (ASME Y14.5, ISO 1101, title-block/tolerance parsing, projection)
---

**<!-- VERIFIED-PARTIAL (papa-workflow 2026-06-09): institutional/method facts promoted to knowledge/wiki/blueprint-vision/blueprint-vision-foundations.md; numeric/safety specifics below stay owner-gated for xray. -->**

# Deep-Domain Research — blueprint-vision (engineering-drawing OCR + GD&T extraction)

Purpose: ground the blueprint-vision OCR/extraction pipeline (drawing-in → structured dimension/GD&T/tolerance JSON-out) in the canonical drafting standards so the extractor parses the *correct* semantic fields, not just glyphs. Every fact below carries an inline citation.

## 1. The standards landscape (what the OCR must parse against)

- **ASME Y14.5 is the primary US GD&T standard**, structured into nine major sections: the first three cover general principles, section four covers datum reference frames, and sections five through nine each cover one tolerance family — Form, Orientation, Location, Profile, and Runout [GD&T Basics, "The ASME Y14.5 GD&T Standard", gdandtbasics.com]. The extractor's symbol classifier should map every geometric-characteristic glyph into one of these five families.
- **ISO 1101:2017 (4th edition) is the international equivalent**, defining the "symbol language for geometrical specification of workpieces and the rules for its interpretation" for tolerances of form, orientation, location and run-out; it is a *general GPS standard* under ISO 14638 and was confirmed current on review in 2022 [ISO 1101:2017(en), iso.org/obp]. blueprint-vision must detect ISO-vs-ASME dialect because notation conventions differ.
- **For the exact glyph proportions/dimensions of GD&T symbols, ISO refers to ISO 7083** (and ISO 1101 Annex F) [ISO 1101:2017(en), iso.org/obp] — useful when building or validating a symbol-template library for the vision model.
- **ISO 1101:2017 retired the "from-to" symbol, replacing it with the "between" symbol**, and added handling for compound continuous features (non-closed via "between" + UF modifier; closed via "all around" + UF modifier) [ISO 1101:2017(en), iso.org/obp]. An extractor trained on older corpora may mis-classify these.

## 2. The Feature Control Frame (FCF) — the core structure to extract

- **The FCF is the rectangular box enclosing the geometric-characteristic symbol, tolerance value, modifiers, and datum references** [GD&T Basics, "The ASME Y14.5 GD&T Standard", gdandtbasics.com]. Parsing it is the central GD&T extraction task: it decomposes into ordered compartments (symbol | tolerance | datum-primary | datum-secondary | datum-tertiary).
- **The tolerance originates from the FCF, NOT from the dimension.** A hole at basic 2.000 in from datum A with a Ø0.010 position tolerance means the hole center must lie within a 0.010-diameter zone centered exactly at 2.000 — the 2.000 is exact, the 0.010 is the total tolerance [GD&T Basics, "The ASME Y14.5 GD&T Standard", gdandtbasics.com]. The extractor must associate basic dimensions with the controlling FCF, not treat them as toleranced.
- **Practical coverage tip:** most machined parts use only ~4–5 geometric symbols regularly — Position (holes), Flatness (mating surfaces), Perpendicularity (faces), Profile of Surface (complex shapes), and Runout (rotating parts) — covering roughly 90% of shop drawings [GD&T Basics, "The ASME Y14.5 GD&T Standard", gdandtbasics.com]. A blueprint-vision symbol classifier should prioritize recall on these five.
- **Concentricity and Symmetry were deprecated to "former practice" in ASME Y14.5-2018** because they require expensive median-point analysis; Position is the recommended replacement for both [GD&T Basics, "The ASME Y14.5 GD&T Standard", gdandtbasics.com]. The extractor should flag these as legacy if encountered.

## 3. The Datum Reference Frame (DRF) and datum hierarchy

- **ASME Y14.5 requires a Datum Reference Frame structured in a primary → secondary → tertiary hierarchy** to establish a 3D coordinate system and ensure consistent part orientation during manufacturing and inspection [GD&T Basics, "The ASME Y14.5 GD&T Standard", gdandtbasics.com]. The *order* of datum letters in an FCF is semantically load-bearing — the extractor must preserve compartment order, not just the set of letters.
- **A material modifier applied to a DATUM reference (rather than the toleranced feature) means "datum shift," NOT bonus tolerance** — a similar but distinct concept [GD&T Basics, "Maximum Material Condition (MMC)", gdandtbasics.com]. The extractor must distinguish modifier-on-tolerance from modifier-on-datum to assign correct downstream semantics.

## 4. Material condition modifiers (MMC / LMC / RFS) and bonus tolerance

- **MMC (Ⓜ, circle-M)** = the condition with maximum material: smallest hole / largest pin within size limits; **LMC (Ⓛ, circle-L)** = least material: largest hole / smallest pin; **RFS** = the default, shown with NO symbol [GD&T Basics, "Maximum Material Condition (MMC)", gdandtbasics.com]. The extractor must treat absence-of-modifier as a positive RFS signal, not missing data.
- **Bonus tolerance:** as a feature departs from MMC toward LMC, allowable geometric tolerance increases by the amount of departure [GD&T Basics, "Maximum Material Condition (MMC)", gdandtbasics.com]. Worked example: a hole sized Ø0.266–0.270 in with Ø0.010 position at MMC has MMC size Ø0.266; if produced at Ø0.270 it gains 0.004 in bonus, so allowed position becomes Ø0.014 in [GD&T Basics, "Maximum Material Condition (MMC)", gdandtbasics.com]. (VERIFY arithmetic before any auto-calc feature.)

## 5. Linear dimension & tolerance notation (title-block / dimension parsing)

- **ASME Y14.5 recognizes two direct tolerancing methods: limit dimensioning** (state max and min directly, high limit above low limit) **and plus/minus tolerancing** (nominal followed by ± expression) [Engineering Essentials, "Formatting Tolerances", engineeringessentials.com]. The dimension parser needs two distinct grammar branches.
- **Plus/minus tolerances are bilateral (equal or unequal) or unilateral.** Example: 25.00 ±0.05 mm → nominal 25.00, upper 25.05, lower 24.95 [Sincere-Machining, "Unilateral and Bilateral Tolerance"; Formlabs, "GD&T Basics"]. In an FCF, an unequal bilateral tolerance can be flagged with the **U modifier** (e.g., a 1 mm tolerance specified as −0.20 / +0.80) [Sincere-Machining; GrabCAD, "ASME Y14.5 2018 Key Terms"].
- **Limits are absolute — a stated limit is treated as continued with zeros** (an upper limit of 6.0 = 6.00000…, so 6.00010 fails) [Engineering Essentials, "Formatting Tolerances", engineeringessentials.com]. The extractor must NOT pad/round limit values when computing pass/fail.
- **Basic dimensions carry NO tolerance themselves** and default title-block tolerances do not apply to them; they define a theoretically exact location/size/profile, with variation controlled by an associated FCF geometric tolerance [GrabCAD, "ASME Y14.5 2018 Key Terms"; GD&T Basics, "True Position"]. A general note "UNTOLERANCED DIMENSIONS ARE BASIC" may appear — the extractor should detect it as a global flag [Engineering Essentials, engineeringessentials.com].
- **Formatting rule:** for bilateral tolerances and limit dimensions both values use the same number of decimal places; for a basic dimension with tolerance the decimal counts need NOT match [Engineering Essentials, "Formatting Tolerances", engineeringessentials.com]. Useful as an OCR sanity check (mismatched decimals on a ± pair may indicate a misread).

## 6. Projection method (1st vs 3rd angle) — read from the title block

- **Every engineering drawing should indicate its projection method via a truncated-cone (frustum) symbol, typically in the title block** [Xometry Pro, "First Angle vs Third Angle Projection"; GD&T Basics, "First vs Third Angle"]. Detecting and classifying this symbol is a discrete blueprint-vision task — getting it wrong yields *mirrored* part interpretations.
- **Third angle (ASME/US, Canada, Japan, Australia; governed by ASME Y14.3): the cone's "pointy" side-view end points TOWARD the circle**; **First angle (ISO/European; governed by ISO 5456-2 / ISO 128): the pointy end points AWAY from the circle** [Xometry Pro; GD&T Basics, "First vs Third Angle"; RoyMech]. View arrangement also differs (3rd angle: top view above front; 1st angle: top view below front) [Xometry Pro]. The detected projection class should propagate to any view-relationship logic.
- **In CAD defaults, first-angle is the ISO default and third-angle is the ASME default** [Xometry Pro; Autodesk Fusion 360 knowledge base], a useful prior when the symbol is missing/illegible but the dialect is otherwise known.

## 7. Surface texture symbols (often co-located with GD&T on the face callout)

- **Surface texture is governed by ASME Y14.36 (US) and ISO 1302 internationally**, both controlling roughness, waviness, and lay; **ISO 21920-1:2021 replaced ISO 1302:2002** as the current ISO indication standard [Juize Machinery, "Key Standards…Surface Roughness"; ASME Y14.36 product page]. The extractor's symbol set should include the check-mark surface-texture glyph and its variants.
- **Ra (arithmetic mean roughness) is the most common parameter**, in micrometers (µm) internationally and micro-inches (µin) in the US; the Ra value sits above the symbol's long leg, with other parameters at the left and sampling length/cutoff at the right [Juize Machinery; engineeringproductdesign.com]. A single rating denotes the MAXIMUM acceptable value [Surface-texture refs, scribd/ASME Y14.36 summary]. The extractor must capture parameter, value, unit, and position to reconstruct the callout correctly.

## 8. Why structured (semantic) extraction matters — the NIST / MBD context

- **GD&T is one component of broader Product Manufacturing Information (PMI)**, which also includes material specs, surface texture, process notes, and welding symbols; in a model-based definition these annotations are linked to CAD features (edges, holes, faces) [NIST, "Testing the Digital Thread in Support of Model-Based Manufacturing and Inspection", tsapps.nist.gov/publication get_pdf pub_id=919497]. blueprint-vision's output schema should aim at this PMI structure, not flat text.
- **NIST identifies a persistent gap between human-readable and computer-interpretable PMI**: the same PMI data is not always interpreted/presented consistently across applications, and there are no standards governing how CAD vendors implement representation vs presentation — which decreases interoperability [NIST, "Promoting Model-Based Definition…", tsapps.nist.gov get_pdf pub_id=920003]. This is precisely the gap an OCR→semantic-PMI extractor helps close for legacy 2D drawings.
- **STEP AP242 ("Managed Model Based 3D Engineering") is the primary carrier of computer-interpretable GD&T/PMI** (tolerances, surface finish, manufacturing process info), and QIF (Quality Information Framework) carries inspection-side quality data into the digital thread [NIST, "Testing the Digital Thread…", tsapps.nist.gov pub_id=919497]. A natural blueprint-vision export target is AP242/QIF-aligned structured PMI so extracted data joins the digital thread rather than dead-ending as text.

## Sources

- GD&T Basics — "The ASME Y14.5 GD&T Standard": https://www.gdandtbasics.com/asme-y14-5-gdt-standard/
- GD&T Basics — "Maximum Material Condition (MMC)": https://www.gdandtbasics.com/maximum-material-condition/
- GD&T Basics — "True Position": https://www.gdandtbasics.com/true-position/
- GD&T Basics — "First vs Third Angle Orthographic Views": https://www.gdandtbasics.com/first-vs-third-angle-orthographic-views/
- ISO 1101:2017(en) (online browsing platform, free read): https://www.iso.org/obp/ui/#iso:std:iso:1101:ed-4:v1:en
- ISO 1101:2017 standard page: https://www.iso.org/standard/66777.html
- Xometry Pro — "First Angle vs. Third Angle Projection": https://xometry.pro/en-uk/articles/first-angle-third-angle-projection/
- RoyMech — "First Angle vs Third Angle Projection / Engineering Drawing Guide": https://www.roymech.co.uk/Useful_Tables/Drawing/basic.html
- Autodesk — "Differences between ASME and ISO Drawing Standards in Fusion 360": https://knowledge.autodesk.com/support/fusion-360/troubleshooting/caas/sfdcarticles/sfdcarticles/Differences-between-ASME-and-ISO-Drawing-Standards-in-Fusion-360.html
- Engineering Essentials — "Formatting Tolerances": http://engineeringessentials.com/ege5/files/ege/tol/tol_page9.htm
- Sincere-Machining — "Unilateral and Bilateral Tolerance in Engineering Drawings": https://www.sincere-machining.com/unilateral-and-bilateral-tolerance/
- GrabCAD Tutorials — "ASME Y14.5 2018 – Key Terms and Definitions Explained": https://grabcad.com/tutorials/asme-y14-5-2018-key-terms-and-definitions-explained
- Formlabs — "GD&T: The Basics of Geometric Dimensioning and Tolerancing": https://formlabs.com/blog/gdt-geometric-dimensioning-and-tolerancing/
- NIST — "Testing the Digital Thread in Support of Model-Based Manufacturing and Inspection" (pub_id 919497): https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=919497
- NIST — "Promoting Model-Based Definition to Establish a Complete Product Definition" (pub_id 920003): https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=920003
- NIST — "Digital Thread for Manufacturing" program: https://www.nist.gov/programs-projects/digital-thread-manufacturing
- Juize Machinery — "Key Standards and Concepts for Metal Part Surface Roughness": https://juizemachinery.com/key-standards-and-concepts-for-metal-part-surface-roughness/
- ASME — "Y14.36 Surface Texture Symbols": https://www.asme.org/codes-standards/find-codes-standards/y14-36-surface-texture-symbols
- Engineering Product Design — "Surface Finish — Roughness Symbols, Charts, Callouts & Costs": https://engineeringproductdesign.com/knowledge-base/surface-finish/
