---
artifact: hermes-external-knowledge-ingestion-roadmap
source: Hermes proxy :8645 -> xAI Grok (grok-4.20-0309-reasoning), OAuth authenticated
generated_by: slot:zulu 2026-06-29 (operator standing directive: "add more from reputable sources online like college textbooks, MIT courses we didn't download" + "utilize hermes agents to the max")
status: ADVISORY ingestion roadmap. FREE items (MIT OCW + the cited knowledge items) -> auto-ingestable via the academy/pdf pipelines. Copyrighted textbooks + paywalled standards -> OPERATOR/legitimate-acquisition only, NEVER auto-download.
serves: the 6-domain max-knowledge directive (mill/lathe/wedm/cam/post/cad)
---

# External-knowledge ingestion roadmap (Hermes/Grok-researched, cited)

The original directive's second half -- "when you exhaust the H drive, add more from reputable sources online like college textbooks, MIT courses we didn't download." Hermes (Grok-reasoning) produced the per-domain authoritative source map below. Each source is REAL + canonical (zulu-spot-verified: MIT 2.008/2.810/2.854/6.849 are real OCW courses; the textbooks + ISO/ASME standards are canonical). The per-domain GOTCHAS mostly CONFIRM PRISM's existing doctrine (chip-thinning, CSS/G96, AP242, multi-skim) -- treat new ones as candidate tribal tips, verify before firing.

## ACQUISITION TIERS (copyright boundary -- R12)
- **FREE / auto-ingestable** (lima academy + MIT-curriculum pipeline; `/video-learn` `/pdf-learn` `/wiki-ingest`): MIT OpenCourseWare courses (lecture notes/videos under CC-BY-NC-SA), the cited KNOWLEDGE ITEMS below (formulas/rules are facts, not copyrightable), OEM public docs (Sandvik/OPEN MIND/GF technical papers, controller manuals where public per U-LEGAL-13).
- **OPERATOR / legitimate-acquisition** (do NOT auto-download): copyrighted textbooks (Machinery's Handbook, Kalpakjian, Boothroyd-Knight, Shaw, Altintas, Smid, Guitrau, Zeid, Krulikowski) + paywalled standards (ISO/ASME). Name them as the authoritative reference; ingest only a purchased/licensed copy.

## MILL (foxtrot)
- Textbooks: Machinery's Handbook 31e ("Milling Cutters & Operations", "Cutting Speeds & Feeds", "Tool Wear & Tool Life") · Kalpakjian *Mfg Eng & Tech* 8e Ch25+Ch21 · Boothroyd-Knight *Fundamentals of Machining* 3e Ch5(forces/power) Ch6(Taylor) Ch9(chatter/safety).
- MIT OCW: 2.008 Design and Manufacturing II · 2.810 Manufacturing Processes and Systems.
- Standards: ISO 8688-1/-2 (milling tool-life face/end) · ISO 10791 (machining-centre test) · ANSI B11.23 (MC safety).
- Gotchas (CONFIRM existing foxtrot doctrine): chip-thinning corrected fz = fz/sin(acos(1-2ae/D)) for ae<0.5D (Boothroyd-Knight Ch5) [PRISM has this]; stability-lobe chatter avoidance from the FRF can ~2x MRR safely (Boothroyd-Knight Ch9 / MIT 2.810) [PRISM ChatterStabilityLobeEngine -- known regression].

## LATHE (whiskey)
- Textbooks: Machinery's Handbook 31e ("Turning", "Lathe Tools", "Tool Wear") · Kalpakjian 8e Ch23+Ch21 (carbide Taylor n=0.2-0.4) · Shaw *Metal Cutting Principles* 2e Ch3-5(forces/temps) Ch13(tool life/BUE) Ch15(dynamics).
- MIT OCW: 2.008 · 2.810.
- Standards: ISO 3685 (single-point turning tool-life) · ISO 23125 (turning-machine safety) · ISO 5610 (external turning holders).
- Gotchas: nose-radius surface finish Ra ~= f^2/(32*r) -- 0.8->1.6mm nose at same feed cuts Ra ~75% (Kalpakjian Ch23) [candidate -- verify vs SFC]; CSS G96 vs G97 -- constant-RPM accelerates flank wear at small dia on contour/face (Shaw Ch13) [PRISM css_g50_cap gate].

## WEDM (mike)
- Textbooks: Guitrau *The EDM Handbook* (Hanser 1997 -- wire params, skim strategy, breakage modes, flushing) · Benedict *Nontraditional Mfg Processes* (Marcel Dekker 1987 -- wire-EDM MRR, gap physics) · El-Hofy *Advanced Machining Processes* (McGraw-Hill 2005 Ch6).
- MIT OCW: 2.008 (non-traditional module) · 2.810.
- Standards: ISO 14137 (wire-EDM accuracy test) · ISO 28881 (EDM safety) · ANSI B11.27 (EDM safety).
- Gotchas: kerf offset = wire radius + spark gap (0.010-0.030mm/side, parameter-dependent) -- generic offset -> first-cut oversize/undersize (Guitrau) [feeds the wedm taper/offset gaps]; multi-skim rough+2-4 skims at exp-decreasing on-time -> order-of-magnitude Ra + recast removal (Guitrau/El-Hofy Ch6) [PRISM skim_count_ra_plateau gate].

## CAM (kilo)
- Textbooks: Zeid *Mastering CAD/CAM* 1e Ch14-15(toolpath algorithms, scallop-vs-engagement) · **Altintas *Manufacturing Automation* 2e Ch6-7 (interpolation, feed scheduling, physics-based toolpath, chatter -- CORE to the optimization engine)** · Smid *CNC Programming Handbook* 3e Ch11+Ch14 (5-axis, trochoidal).
- MIT OCW: 2.008 · 2.810.
- Standards: ISO 14649 -1/-10/-11 (STEP-NC feature-based machining) · ISO 10303-238 (STEP-NC integrated CNC).
- Gotchas: constant-scallop default -> up-to-100% radial engagement in corners; adaptive/trochoidal keeps engagement <30deg (Altintas Ch7 + Sandvik trochoidal paper) [PRISM AdaptiveToolpathRouter TGAR/HRAF]; 5-axis lead/lag+tilt useless unless post+kinematic+TCP synchronized -> gouges that PASS simulation (Smid Ch11 + OPEN MIND) [PRISM multiaxis_defer_recommend gate].

## POST-PROCESSOR (echo)
- Textbooks: Smid *CNC Programming Handbook* 3e Ch4/9/12/16 (controller syntax, macro-B vs Siemens cycles, post logic) · FANUC 30i/31i/32i-B Programming Manual B-64484EN (G-code variants, look-ahead #2000, macro-B) · Siemens SINUMERIK 840Dsl/828D Programming Manual (CYCLE832, G64/G641 smoothing, ShopMill vs ISO).
- MIT OCW: 2.008 · 2.854 Manufacturing Systems Analysis.
- Standards: ISO 6983-1/-2 (NC program format / address words -- the G-code standard).
- Gotchas: Haas Setting 9 + G187 accuracy-control differ from Fanuc G05.1 Q1 HSM -- Fanuc-style look-ahead on Haas -> velocity bottleneck/alarm (Haas Mill manual + Smid Ch16) [candidate echo dialect gate]; Siemens 840D needs CYCLE832 (_TOL/_TOLM) for dynamic smoothing -- generic ISO posts emitting only G64/G641 -> poor finish/overload (Siemens manual) [candidate echo gate].

## CAD (delta)
- Textbooks: Krulikowski *Fundamentals of GD&T* 3e (datums, composite position, profile -- ASME Y14.5) · Zeid *Mastering CAD/CAM* Ch8-10 (feature recognition, B-rep vs CSG, STEP exchange) · Benedict Ch6 (EDM electrode design, spark-gap+overcut+wear, orbiting geometry).
- MIT OCW: 6.849 Geometric Folding Algorithms (computational-geometry foundation for feature recognition) · 2.008.
- Standards: ASME Y14.5-2018 (GD&T) · ASME Y14.41-2019 (3D PMI) · **ISO 10303-242:2022 (AP242 -- managed model-based 3D eng, replaces AP214/203 for PMI/GD&T)** · ISO 16792.
- Gotchas: STEP AP214 (vs AP242) LOSES semantic PMI (GD&T on faces) -> downstream feature-recognition/inspection fail though geometry looks fine (ISO 10303-242 + PDES AP242 Recommended Practices) [PRISM delta AP242 doctrine]; EDM electrode undersize = spark gap + overcut + WEAR allowance (0.05-0.25mm/side) -- designers forget the wear term -> undersized cavities; orbit from the FINAL compensated geometry (Benedict Ch6 + GF electrode guidelines) [extends delta sinker_edm_spark_gap gate].

## NEXT ACTION
- **lima (academy):** ingest the free MIT OCW courses (2.008, 2.810, 2.854, 6.849) via the MIT-curriculum pipeline -> domain-tagged tribal/wiki.
- **specialists (foxtrot/whiskey/mike/kilo/echo/delta):** promote the CONFIRMED gotchas already in doctrine; verify the CANDIDATE ones (nose-radius Ra, Haas G187, Siemens CYCLE832, electrode wear-allowance) vs the cited source before firing.
- **operator:** the copyrighted textbooks + paywalled ISO/ASME standards need legitimate acquisition before ingestion (the highest-leverage being Altintas *Manufacturing Automation* for the CAM optimization engine + ASME Y14.5-2018 + ISO 10303-242 for CAD).
- Hermes is the standing research lane for deepening any of these (`mcp__hermes__hermes_ask` grok-4.20-reasoning, or `node scripts/ask-hermes.mjs`).
