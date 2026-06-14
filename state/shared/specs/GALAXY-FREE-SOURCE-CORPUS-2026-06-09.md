# GALAXY FREE-SOURCE CORPUS - per-domain authoritative external knowledge index

> **Generated** by `scripts/build-galaxy-free-source-corpus.mjs` from the staged deep-domain research packets (GALAXY-ENRICH batches 1-3, papa 2026-06-09). Re-run after any new packet lands - idempotent, fully regenerated.
>
> **What this is:** the curated, deduped, tiered index of free + legal authoritative EXTERNAL knowledge sources per galaxy - the "pull fresh authoritative data on demand" corpus that keeps each domain's knowledge non-stagnant. Complements the INTERNAL corpus roots (`mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` -> `H:/PRISM/{resources,JM DIE,Docustrata}`): internal = our files, external = the world's free authoritative references.
>
> **R12 / honesty boundary:** this file indexes verifiable source pointers only (real, resolvable, free/legal URLs). It does NOT assert the physics/numeric/cost claims those sources contain - those are drafted UNVERIFIED in each galaxy's `_staging/` packet and stay owner-gated until the owner slot spot-checks them against source. A TIER-1 source does not make a derived claim verified.
>
> **Source-quality tiers:** TIER-1 = primary (gov/edu/standards bodies/MIT-OCW/arXiv/NIST/NIMS/eCFR) - TIER-2 = vendor/OEM technical docs (Sandvik/Mitsubishi/ISCAR/Kennametal/Haas/Fanuc/Siemens, authoritative for tool/material/controller specifics) - TIER-3 = free articles/aggregators (secondary; corroborate against T1/T2 before trusting a number).
>
> **Auto-invoke path:** discoverable via the galaxy CLAUDE.md cross-cutting block -> `GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` -> this index. Owners integrate survivors into live galaxy MEMORY.md / wiki / tribal so per-domain recall surfaces them.
>
> **Legal-sources-only:** every entry is a free, publicly-accessible page. No paywalled/pirated sources (no LibGen/SciHub). Vendor docs are public technical-info pages.

## Coverage

| galaxy | owner | sources | T1 | T2 | T3 |
|--------|-------|--------:|---:|---:|---:|
| ai-training | india | 15 | 12 | 0 | 3 |
| speed-feed | oscar | 17 | 2 | 3 | 12 |
| cad | delta | 29 | 8 | 1 | 20 |
| quality | (quality-owner) | 15 | 5 | 0 | 10 |
| mill | foxtrot | 15 | 2 | 8 | 5 |
| lathe | whiskey | 30 | 0 | 6 | 24 |
| wedm | mike | 23 | 1 | 0 | 22 |
| cam | kilo | 44 | 4 | 10 | 30 |
| post-processor | echo | 16 | 0 | 9 | 7 |
| blueprint-vision | xray | 19 | 6 | 0 | 13 |
| business | hotel | 24 | 4 | 0 | 20 |
| quoting | charlie | 11 | 3 | 3 | 5 |
| academy | lima | 36 | 22 | 0 | 14 |
| shop-floor | (shop-floor-owner) | 21 | 3 | 0 | 18 |

## Per-galaxy corpus

### ai-training - 15 sources   owner: india
> Deep physics/numeric claims for this domain live in `knowledge/wiki/ai-training/_staging/deep-domain-research-2026-06-09.md` (status: UNVERIFIED - india verifies before integration). The pointers below are the verifiable corpus the owner draws from.

**TIER-1 (primary: gov/edu/standards/courseware)**
- [*Improving Retrieval for RAG-based Question Answering*](https://arxiv.org/abs/2404.07221)
- [*Multi-Source Knowledge Pruning for Retrieval-Augmented Generation*](https://arxiv.org/abs/2409.13694)
- [DoRA — *Weight-Decomposed Low-Rank Adaptation*](https://arxiv.org/abs/2402.09353)
- [Guo, Pleiss, Sun, Weinberger — *On Calibration of Modern Neural Networks* (ECE, temperature scaling)](https://arxiv.org/abs/1706.04599)
- [Hamilton, Ying, Leskovec — *Inductive Representation Learning on Large Graphs (GraphSAGE)*](https://arxiv.org/abs/1706.02216)
- [Hu, Shen, Wallis, Allen-Zhu, Li, Wang, Wang, Chen — *LoRA: Low-Rank Adaptation of Large Language Models*](https://arxiv.org/abs/2106.09685)
- [Karpukhin et al. — *Dense Passage Retrieval for Open-Domain Question Answering*](https://arxiv.org/abs/2004.04906)
- [Lewis et al. — *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*](https://arxiv.org/abs/2005.11401)
- [LoRA+ — *Efficient Low Rank Adaptation of Large Models*](https://arxiv.org/abs/2402.12354)
- [QLoRA — *Efficient Finetuning of Quantized LLMs*](https://arxiv.org/abs/2305.14314)
- [rsLoRA — *A Rank Stabilization Scaling Factor for Fine-Tuning with LoRA*](https://arxiv.org/abs/2312.03732)
- [Wang et al. — *Searching for Best Practices in Retrieval-Augmented Generation*](https://arxiv.org/abs/2407.01219)

**TIER-3 (free articles/aggregators)**
- [HuggingFace — *PEFT LoRA developer guide* (rsLoRA, DoRA, LoRA+, QLoRA-style `all-linear`, rank/alpha patterns)](https://huggingface.co/docs/peft/main/en/developer_guides/lora)
- [Wikipedia — *Brier score* (formula, range, Murphy decomposition)](https://en.wikipedia.org/wiki/Brier_score)
- [Wikipedia — *Calibration (statistics)* (reliability diagram, discrimination vs calibration)](https://en.wikipedia.org/wiki/Calibration_(statistics)

### speed-feed - 17 sources   owner: oscar
> Deep physics/numeric claims for this domain live in `knowledge/wiki/speed-feed/_staging/deep-domain-research-2026-06-09.md` (status: UNVERIFIED - oscar verifies before integration). The pointers below are the verifiable corpus the owner draws from.

**TIER-1 (primary: gov/edu/standards/courseware)**
- [ACS College of Engineering — "Tool Wear/Tool Life, Machine Time" (Metal Cutting & Forming, Module 3)](https://www.acsce.edu.in/acsce/wp-content/uploads/2020/04/Metal-Cutting-Forming-Module-3.pdf)
- [IIT Bombay Virtual Labs — Machine Tools, tool-life experiment theory](http://vlabs.iitb.ac.in/vlabs-dev/labs/mit_bootcamp/machine_tools/labs/exp1/theory.php)

**TIER-2 (vendor/OEM technical docs)**
- [DAPRA Corporation — "Radial Chip Thinning — How to Max Out Your Milling Tool Feed Rate](https://www.dapra.com/articles/radial-chip-thinning)
- [Harvey Performance — "Speeds and Feeds 101 (In The Loupe)](https://www.harveyperformance.com/in-the-loupe/speeds-and-feeds-101/)
- [ISCAR — "User Guide for Radial Chip Thinning Calculator in Milling](https://www.iscar.com/ITC/UserGuide/ITA_USER_GUIDE_RadialChipThinningCalculator_EN.pdf)

**TIER-3 (free articles/aggregators)**
- [CNCoptimization — "CNC Speed & Feed Formulas: RPM, Feed Rate & Chip Load](https://www.cncoptimization.com/resources/guides/cnc-cutting-speed-feed-formulas/)
- [CNCoptimization — "SFM to RPM Formula & Chart: Diameter Converter](https://www.cncoptimization.com/resources/guides/sfm-rpm-conversion/)
- [IIT Kanpur — V.K. Jain, "Mechanics of Cutting" (Lecture L6, TA-202)](https://home.iitk.ac.in/~vkjain/L6-TA-202%20MECHANICS%20OF%20CUTTING.pdf)
- [Machining Doctor — "Chip Thinning: Calculators and Formulas (Radial and Axial)](https://www.machiningdoctor.com/calculators/chip-thinning-calculator/)
- [Machining Doctor — "Specific Cutting Force (KC & KC1)](https://www.machiningdoctor.com/glossary/specific-cutting-force-kc-kc1/)
- [MDPI J. Manuf. Mater. Process. — "Determination of the Shear Angle in the Orthogonal Cutting Process](https://www.mdpi.com/2504-4494/6/6/132)
- [Mechical — "Tool Life, Taylor's Tool Life Equation, Calculation, Factor](https://www.mechical.com/2022/01/tool-life-taylors-tool-life-equation.html)
- [Nature Scientific Reports (2021) — "In-SEM micro-machining reveals the origins of the size effect in the cutting energy](https://www.nature.com/articles/s41598-021-81125-7)
- [ScienceDirect — "Size effect and minimum chip thickness in micromilling](https://www.sciencedirect.com/science/article/abs/pii/S0890695514400130)
- [ScienceDirect — "The Merchant's model of orthogonal cutting revisited: A new insight into the modeling of chip formation](https://www.sciencedirect.com/science/article/abs/pii/S0020740307001233)
- [ScienceDirect Topics — "Shear Angle — an overview](https://www.sciencedirect.com/topics/engineering/shear-angle)
- [Sirris — "Key to model-based machining: Kienzle's cutting force formula](https://www.sirris.be/en/inspiration/key-model-based-machining-kienzles-cutting-force-formula)

### cad - 29 sources   owner: delta
> Deep physics/numeric claims for this domain live in `knowledge/wiki/cad/_staging/deep-domain-research-2026-06-09.md` (status: UNVERIFIED - delta verifies before integration). The pointers below are the verifiable corpus the owner draws from.

**TIER-1 (primary: gov/edu/standards/courseware)**
- [arXiv — "BRepFormer: Transformer-Based B-rep Geometric Feature Recognition](https://arxiv.org/pdf/2504.07378)
- [ASME — "Y14.41 — Digital Product Definition Data Practices](https://www.asme.org/codes-standards/find-codes-standards/y14-41-digital-product-definition-data-practices)
- [ISO — "ISO 10303-242:2025 — Application protocol: Managed model-based 3D engineering](https://www.iso.org/standard/84300.html)
- [ISO — "ISO 1101:2017 — Geometrical product specifications (GPS) — Geometrical tolerancing](https://www.iso.org/standard/66777.html)
- [NIST — "Conformance checking of PMI representation in CAD model STEP data exchange files" (tsapps pub 917105)](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=917105)
- [NIST — "MBE PMI Validation and Conformance Testing Project](https://www.nist.gov/ctl/smart-connected-systems-division/smart-connected-manufacturing-systems-group/mbe-pmi-validation)
- [NIST — "Portrait of an ISO STEP tolerancing standard" (tsapps pub 915430)](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=915430)
- [NIST — "Testing the Digital Thread in Support of Model-Based Manufacturing and Inspection" (tsapps pub 919497)](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=919497)

**TIER-2 (vendor/OEM technical docs)**
- [CNCCookbook — "The Beginner's Guide to GD&T — MMC, LMC, RFS, and Bonus Tolerances](https://s3.us-east-1.amazonaws.com/s3.cnccookbook.com/GD&T/GD&TMMC-LMC-RFS-BonusTolerances.html)

**TIER-3 (free articles/aggregators)**
- [Accendo Reliability — "Root Sum Squared Tolerance Analysis Method](https://accendoreliability.com/root-sum-squared-tolerance-analysis-method/)
- [ALEKVS — "What Is ASME Y14.5? A Complete Guide to GD&T and Engineering Drawings](https://www.alekvs.com/what-is-asme-y14-5-a-complete-guide-to-gdt-and-engineering-drawings/)
- [CNC Guides — "GD&T Maximum Material Condition (MMC) Definition, Formulas, Design & Uses](https://www.cncguides.com/guide/gdt-maximum-material-condition-mmc-definition-formulas-design-uses)
- [CNCLathing — "GD&T MMC: Definition, Formula, Calculation, Bonus Tolerance, Uses, MMC vs LMC](https://www.cnclathing.com/guide/gdt-mmc-definition-formula-calculation-bonus-tolerance-uses-mmc-vs-lmc)
- [Enventive — "Worst Case, RSS, and Monte Carlo Simulation Calculations for Tolerance Analysis](https://enventive.com/tolerance-analysis-resources/worst-case-rss-and-monte-carlo-simulation-calculations-for-tolerance-analysis/)
- [FARO — "GD&T for beginners: MMC & bonus tolerance, explained in 3D](https://www.faro.com/en/Resource-Library/Article/gdt-for-beginners-mmc-bonus-tolerance-explained-in-3d)
- [Figay (LinkedIn) — "PLM interoperability — STEP AP 242 — Managed Model Based 3D Engineering](https://www.linkedin.com/pulse/plm-interoperability-step-ap-242-managed-model-based-figay)
- [Five Flute — "Introduction to Root Sum Squared (RSS) Tolerance Analysis](https://www.fiveflute.com/guide/introduction-to-root-sum-squared-rss-tolerance-analysis/)
- [GD&T Basics — "Maximum Material Condition (MMC)](https://www.gdandtbasics.com/maximum-material-condition/)
- [GD&T Basics — "The ASME Y14.5 GD&T Standard](https://www.gdandtbasics.com/asme-y14-5-gdt-standard/)
- [GeoTol — "ASME Y14.5-2018 vs. 2009: Changes & Latest GD&T Standards](https://geotol.com/symbol/2018-standards/)
- [GrabCAD Tutorials — "ASME Y14.5 2018 – Key Terms and Definitions Explained](https://grabcad.com/tutorials/asme-y14-5-2018-key-terms-and-definitions-explained)
- [Nature Scientific Reports — "Machining feature recognition based on deep neural networks to support tight integration with 3D CAD systems](https://www.nature.com/articles/s41598-021-01313-3)
- [Oxford Academic, JCDE — "BRepGAT: Graph neural network to segment machining feature faces in a B-rep model](https://academic.oup.com/jcde/article/10/6/2384/7453688)
- [ProSTEP iViP — "Fact Sheet: ISO 10303-242 (STEP AP242)](https://www.prostep.org/fileadmin/fact-sheets/Public_SSB_Fact_Sheet__ISO_10303-242__STEP_AP242_-v15-20231219_082046.pdf)
- [ScienceDirect — "BrepMFR: Enhancing machining feature recognition in B-rep models through deep learning and domain adaptation](https://www.sciencedirect.com/science/article/abs/pii/S0167839624000529)
- [Sigmetrix — "ASME Y14.5 — The Ultimate Guide](https://www.sigmetrix.com/blog/ultimate-guide-to-asme-y14.5)
- [SMLease Design — "Tolerance Stackup Analysis: Worst Case and RSS](https://www.smlease.com/entries/tolerance/tolerance-stackup-analysis/)
- [Wikipedia — "ASME Y14.41](https://en.wikipedia.org/wiki/ASME_Y14.41)
- [Wikipedia — "Model-based definition](https://en.wikipedia.org/wiki/Model-based_definition)

### quality - 15 sources   owner: (quality-owner)
> Deep physics/numeric claims for this domain live in `knowledge/wiki/quality/_staging/deep-domain-research-2026-06-09.md` (status: UNVERIFIED - (quality-owner) verifies before integration). The pointers below are the verifiable corpus the owner draws from.

**TIER-1 (primary: gov/edu/standards/courseware)**
- [ISO 14253-1:2013 standard abstract (ISO.org):](https://www.iso.org/standard/63638.html)
- [ISO 14253-1:2017 online browsing platform (ISO/OBP):](https://www.iso.org/obp/ui/#iso:std:iso:14253:-1:en)
- [NIST/SEMATECH e-Handbook of Statistical Methods, §6.3.1 Univariate Control Charts:](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm)
- [NIST/SEMATECH e-Handbook, §6.1.6 Process Capability Indices (Cp/Cpk/Cpm/Cpu/Cpl + reject-rate table):](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm)
- [NIST/SEMATECH e-Handbook, §6.3.1.1 / §6.3.2.1 Shewhart X-bar and R and S Control Charts:](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc311.htm)

**TIER-3 (free articles/aggregators)**
- [ASTM-derived control-chart constant table (Bessegato/UFJF mirror):](https://www.bessegato.com.br/UFJF/resources/table_of_control_chart_constants_old.pdf)
- [H.N. Metrology, "ISO 14253-1 Decision Rules":](https://www.hn-metrology.com/papers/decrules.htm)
- [ISOBudgets, "Guard Banding — How to Take Uncertainty Into Account":](https://www.isobudgets.com/guard-banding-how-to-take-uncertainty-into-account/)
- [Lean Six Sigma Definition glossary, "Nelson Rules":](https://www.leansixsigmadefinition.com/glossary/nelson-rules/)
- [QI Macros, "Western Electric Rules | WECO Rules":](https://www.qimacros.com/control-chart/western-electric-rules/)
- [QualityEngineer.ai, "Gauge R&R Acceptance Criteria: %GRR, NDC, and What AIAG MSA Requires":](https://app.qualityengineer.ai/blog/gauge-rr-acceptance-criteria)
- [ScienceDirect (Measurement journal), "Number of distinct data categories and gage repeatability and reproducibility — a double (but single) requirement":](https://www.sciencedirect.com/science/article/abs/pii/S0263224113001760)
- [Six Sigma Study Guide, "Gage Repeatability and Reproducibility (GR&R)":](https://sixsigmastudyguide.com/gage-repeatability-and-reproducibility-rr/)
- [Wikipedia, "Nelson rules":](https://en.wikipedia.org/wiki/Nelson_rules)
- [Wikipedia, "Western Electric rules":](https://en.wikipedia.org/wiki/Western_Electric_rules)

### mill - 15 sources   owner: foxtrot
> Deep physics/numeric claims for this domain live in `knowledge/wiki/mill/_staging/deep-domain-research-2026-06-09.md` (status: UNVERIFIED - foxtrot verifies before integration). The pointers below are the verifiable corpus the owner draws from.

**TIER-1 (primary: gov/edu/standards/courseware)**
- [MTRC (Univ. of Tennessee) reprint — "Chatter Stability of Machining Operations](https://mtrc.utk.edu/wp-content/uploads/sites/45/2020/08/manu_142_11_110801.pdf)
- [Y. Altintas — "Chatter Stability of Machining Operations" (MIT CBA course-hosted PDF; ZOA method + a_lim derivation)](https://academy.cba.mit.edu/classes/computer_machining/chatter.pdf)

**TIER-2 (vendor/OEM technical docs)**
- [CNCCookbook — "Who is Afraid of Tool Deflection? [4 Evils + The Cures]](https://www.cnccookbook.com/afraid-tool-deflection/)
- [DAPRA Corporation — "Radial Chip Thinning – How to Max Out Your Milling Tool Feed Rate](https://www.dapra.com/articles/radial-chip-thinning)
- [Harvey Performance Company / In The Loupe — "Intro to Trochoidal Milling](https://www.harveyperformance.com/in-the-loupe/introduction-trochoidal-milling/)
- [Harvey Performance Company / In The Loupe — "Introduction to High Efficiency Milling](https://www.harveyperformance.com/in-the-loupe/intro-high-efficiency-milling/)
- [Harvey Performance Company / In The Loupe — "Tool Deflection & Its Remedies](https://www.harveyperformance.com/in-the-loupe/tool-deflection-remedies/)
- [Mitsubishi Materials (USA) — "Cutting Power for Face Milling — Technical Info / Cutting Formula](https://www.mmc-carbide.com/us/technical_information/formula/tec_milling_power_formula)
- [Mitsubishi Materials Corporation — "Formulae for Cutting Power](https://www.mitsubishicarbide.net/contents/mhg/enuk/html/product/technical_information/information/formula4.html)
- [Sandvik Coromant — "Entering angle and chip thickness in milling](https://www.sandvik.coromant.com/en-us/knowledge/milling/entering-angle-and-chip-thickness)

**TIER-3 (free articles/aggregators)**
- [Altintas, Stépán, Merdol, Dombóvári — "Chatter stability of milling in frequency and discrete time domain," CIRP JMST 2008](https://www.mm.bme.hu/~dombovari/Downloads/2008_CIRPJMST_AltintasStepanMerdolDombo.pdf)
- [CADEM Technologies — "Material removal rate formula for milling, turning](https://cadem.com/material-removal-rate/)
- [Machining Doctor — "Chip Thinning: Calculators and Formulas (Radial and Axial)](https://www.machiningdoctor.com/calculators/chip-thinning-calculator/)
- [Machining Doctor — "Machining Power Calculator and Formulas](https://www.machiningdoctor.com/calculators/machining-power/)
- [Machining Doctor — "Specific Cutting Force (KC & KC1)](https://www.machiningdoctor.com/glossary/specific-cutting-force-kc-kc1/)

### lathe - 30 sources   owner: whiskey
> Deep physics/numeric claims for this domain live in `knowledge/wiki/lathe/_staging/deep-domain-research-2026-06-09.md` (status: UNVERIFIED - whiskey verifies before integration). The pointers below are the verifiable corpus the owner draws from.

**TIER-2 (vendor/OEM technical docs)**
- [CNCCookbook — "G96 G-Code: Constant Surface Speed CNC Programming](https://www.cnccookbook.com/g96-g-code-constant-surface-speed-cnc/)
- [Haas Automation — "G76 Threading Cycle, Multiple Pass (Group 00)](https://www.haascnc.com/service/codes-settings.type=gcode.machine=lathe.value=G76.html)
- [Haas Automation — "Lathe Chatter — Troubleshooting (TG0092)](https://www.haascnc.com/service/troubleshooting-and-how-to/troubleshooting/lathe-chatter---troubleshooting.html)
- [Kennametal — "Boring Bar Deflection Calculator](https://www.kennametal.com/us/en/resources/engineering-calculators/turning-calculators/boring-bar-deflection.html)
- [Mitsubishi Materials USA — "Formula for Turning — Technical Info/Cutting Formula](https://www.mmc-carbide.com/us/technical_information/formula/tec_turning_formula)
- [Sandvik Coromant — "Parting off](https://www.sandvik.coromant.com/en-us/knowledge/parting-and-grooving/parting-off)

**TIER-3 (free articles/aggregators)**
- [Carbide Depot — "Turning Formula Calculator" (SFM/RPM/IPR/IPM/MRR)](https://www.carbidedepot.com/formulas-turning.htm)
- [cnccode.com — "CNC Grooving & Parting Cycles: G75, G74, and Advanced Lathe Grooving Explained](https://cnccode.com/2025/10/10/cnc-grooving-parting-cycles-g75-g74-and-advanced-lathe-grooving-explained/)
- [cnccode.com — "G50 G-Code Explained: Spindle Speed Limits and Position Setting in CNC Turning](https://cnccode.com/2025/07/25/g50-g-code-explained-spindle-speed-limits-and-position-setting-in-cnc-turning/)
- [cncmakers.com — "Thread diameter calculation formula](https://cncmakers.com/cnc/Tech_Support/Thread_diameter_calculation_formula.html)
- [Cutting Tool Engineering — "Boring: Calculating deflection](https://www.ctemag.com/articles/boring-calculating-deflection)
- [Cutting Tool Engineering — "Strictly Boring](https://ctemag.com/articles/strictly-boring/)
- [Cutting Tool Engineering — "Time to part](https://www.ctemag.com/articles/time-part)
- [FIRGELLI Engineering — "Free Surface Finish Calculator — Theoretical Ra](https://www.firgelliauto.com/blogs/engineering-calculators/surface-finish-calculator-theoretical-ra)
- [GcodeTutor — "G76 Screw Thread Cycle](https://gcodetutor.com/cnc-machine-training/g76-thread-cycle.html)
- [Industrial Monitor Direct — "Eliminating Boring Bar Chatter in CNC Lathe Deep Bore Operations](https://industrialmonitordirect.com/blogs/knowledgebase/eliminating-boring-bar-chatter-in-cnc-lathe-deep-bore-operations)
- [Jones Marketing Inc (JMI) — "Boring Bar Selection: Choosing The Correct Length To Diameter Ratio: 4, 6, 8, 10](https://www.jonesmarketinginc.com/news/boring-bar-selection-choosing-the-correct-length-to-diameter-ratio-4-6-8-10)
- [Machining Doctor — "G96 / G97 Gcode: Programming Examples & Theory](https://www.machiningdoctor.com/gcodes/g96-g97/)
- [Machining Doctor — "Metal Removal Rate: Calculator, Formulas & Theory](https://www.machiningdoctor.com/calculators/metal-removal-rate/)
- [Masso Documentation — "G96 — Turn on Constant Surface Speed (CSS)](https://docs.masso.com.au/supported-g-codes/g96-turn-on-constant-surface-speed-css)
- [minaprem.com — "Derive Formula for Surface Roughness in Turning with a Rounded Tool](http://www.minaprem.com/machining/principle/quality/derive-formula-for-surface-roughness-in-turning-with-a-rounded-tool/)
- [Octane Workholding — "Boring Tips and Tricks](https://www.octaneworkholding.com/pages/boring-tips-and-tricks)
- [Open Oregon Pressbooks (Manufacturing Processes 4-5) — "Unit 6: Lathe Threading](https://openoregon.pressbooks.pub/manufacturingprocesses45/chapter/unit-6-lathe-threading/)
- [Practical Machinist — "g76 for dummies](https://www.practicalmachinist.com/forum/threads/g76-for-dummies.188082/)
- [Practical Machinist — "Parting Off — Part 1: Basic Principles and Challenges](https://www.practicalmachinist.com/cutting-tools/parting-off-part-1-basic-principles-and-challenges/)
- [Practical Machinist — "Thread depth using 60 degree](https://www.practicalmachinist.com/forum/threads/thread-depth-using-60-degree.398302/)
- [Production Machining — "5 Process Security Tips for Parting Off](https://www.productionmachining.com/articles/five-process-security-tips-when-parting-off)
- [ToolGrit — "Surface Finish (Ra) Calculator](https://www.toolgrit.com/tools/surface-finish-calculator)
- [ToolNotes — "Find IPM given IPR and RPM](http://toolnotes.com/calculators/find-ipm-given-ipr-and-rpm/)
- [Wikipedia — "Speeds and feeds](https://en.wikipedia.org/wiki/Speeds_and_feeds)

### wedm - 23 sources   owner: mike
> Deep physics/numeric claims for this domain live in `knowledge/wiki/wedm/_staging/deep-domain-research-2026-06-09.md` (status: UNVERIFIED - mike verifies before integration). The pointers below are the verifiable corpus the owner draws from.

**TIER-1 (primary: gov/edu/standards/courseware)**
- [USPTO US4465914 — *Wire-cut EDM method for automatically measuring a required offset value*](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4465914)

**TIER-3 (free articles/aggregators)**
- [Arbiser Machine — *Can Wire EDM Services Meet Surface Finish Requirements?*](https://www.arbisermachine.com/blog/can-wire-edm-services-meet-surface-finish-requirements)
- [ijisrt.com — *Optimization of Wire EDM Parameters to Calculate MRR and Measure Surface Finish on SS410*](https://ijisrt.com/wp-content/uploads/2017/03/Optimization-of-Wire-EDM-Parameters-To-Calculate-MRR-and-Measure-Surface-Finish-On-SS410.pdf)
- [Inderscience IJMMM 2011 Vol.9 — *Prevention of wire breakage in wire EDM*](https://www.inderscienceonline.com/doi/abs/10.1504/IJMMM.2011.038162)
- [Lemhunter — *Wire EDM Diameter Guide* / *EDM Finish Guide*](https://www.lemhunter.com/news/wire-edm-diameter-guide-standard-sizes-effects-on-speed-and-accuracy/)
- [MDPI Micromachines 14(4):862 (2023) — *Enhancing Wire-EDM Performance with Zinc-Coated Brass Wire Electrode and Ultrasonic Vibration*](https://www.mdpi.com/2072-666X/14/4/862)
- [MDPI Micromachines 16(5):547 — *Study of Corner and Shape Accuracies in Wire Electro-Discharge Machining of Fin and Gear Profiles and Taper Cutting*](https://www.mdpi.com/2072-666X/16/5/547)
- [MFG News — *Wire EDM Corner Accuracy*](https://www.mfgnewsweb.com/archives/4/49153/EDM-Machinery-Consumables-jul17/Wire-EDM-Corner-Accuracy.aspx)
- [Modern Machine Shop — *Buying a Wire EDM, Part 3: Speed, Accuracy and Finish*](https://www.mmsonline.com/articles/buying-a-wire-edm-speed-accuracy-and-finish)
- [Modern Machine Shop — *More Accurate Taper Cutting with Wire EDM*](https://www.mmsonline.com/articles/more-accurate-taper-cutting-with-wire-edm)
- [MoldMaking Technology — *Taper Angles and Wire EDM*](https://www.moldmakingtechnology.com/articles/taper-angles-and-wire-edm)
- [Novotec EDM — *EDM Wire Selection*](https://us.novotec-edm.com/wire-selection/)
- [Practical Machinist forum — *EDM Offset / Programming Wire Offset / Coated Wire* threads](https://www.practicalmachinist.com/forum/threads/offset.432914/)
- [ResearchGate — *Corner error simulation of rough cutting in wire EDM*](https://www.researchgate.net/publication/245172449)
- [ResearchGate — *Influence of Nozzle Jet Flushing on Wire Deflection and Breakage in wire EDM*](https://www.researchgate.net/publication/278671183)
- [ScienceDirect — *Dielectric Fluid / Dielectric Liquids — an overview*](https://www.sciencedirect.com/topics/engineering/dielectric-fluid)
- [ScienceDirect — *Effects of dielectric fluids on surface integrity for the recast layer in high-speed EDM drilling of nickel alloy*](https://www.sciencedirect.com/science/article/abs/pii/S0925838818348370)
- [ScienceDirect — *Investigation of the spark cycle on material removal rate in wire EDM of advanced materials*](https://www.sciencedirect.com/science/article/abs/pii/S0890695503002712)
- [ScienceDirect — *On the influence of cutting-speed limitation on the accuracy of wire-EDM corner-cutting*](https://www.sciencedirect.com/science/article/abs/pii/S0924013606008417)
- [ScienceDirect — *Recast Layer — an overview*](https://www.sciencedirect.com/topics/engineering/recast-layer)
- [ScienceDirect — *Resistivity of Deionized Water — an overview*](https://www.sciencedirect.com/topics/engineering/resistivity-deionized-water)
- [ScienceDirect — *Wire Electrical Discharge Machining: an overview*](https://www.sciencedirect.com/topics/engineering/wire-electrical-discharge-machining)
- [Xometry — *Wire EDM Manufacturing*](https://www.xometry.com/resources/machining/wire-edm-machining/)

### cam - 44 sources   owner: kilo
> Deep physics/numeric claims for this domain live in `knowledge/wiki/cam/_staging/deep-domain-research-2026-06-09.md` (status: UNVERIFIED - kilo verifies before integration). The pointers below are the verifiable corpus the owner draws from.

**TIER-1 (primary: gov/edu/standards/courseware)**
- [NCBI PMC — *Investigation of Tool Wear and Chip Morphology in Dry Trochoidal Milling of Ti-6Al-4V* (PMC6630620)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6630620/)
- [Siemens NX Help — *Tilt Tool Axis enhancements*](http://www2.me.rochester.edu/courses/ME204/nx_help/en_US/tdocExt/content/1/xid505791.xml)
- [USPTO Patent 11,176,291 — *Roughing toolpath sequences generation for CAM*](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11176291)
- [USPTO Patent 6,704,611 — *System and method for rough milling*](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/6704611)

**TIER-2 (vendor/OEM technical docs)**
- [CNCCookbook — *Climb Milling vs Conventional Milling [Sneaky CNC Tips]*](https://www.cnccookbook.com/climb-milling-versus-conventional-milling/)
- [CNCCookbook — *Complete Guide to CAM Toolpaths and Operations for Milling*](https://www.cnccookbook.com/complete-guide-to-cam-toolpaths-and-operations-for-milling/)
- [CNCCookbook — *High Speed Machining (HSM) [Definitive Guide]*](https://www.cnccookbook.com/high-speed-machining-speeds-and-feeds/)
- [CNCCookbook — *How To Choose a Stepover for 3D Profiling*](https://www.cnccookbook.com/cnc-stepover/)
- [DAPRA Corporation — *Radial Chip Thinning — How to Max Out Your Milling Tool Feed Rate*](https://www.dapra.com/articles/radial-chip-thinning)
- [Harvey Performance (In The Loupe) — *Climb Milling vs. Conventional Milling*](https://www.harveyperformance.com/in-the-loupe/conventional-vs-climb-milling/)
- [Harvey Performance (In The Loupe) — *How to Combat Chip Thinning*](https://www.harveyperformance.com/in-the-loupe/combat-chip-thinning/)
- [Harvey Performance (In The Loupe) — *Intro to Trochoidal Milling*](https://www.harveyperformance.com/in-the-loupe/introduction-trochoidal-milling/)
- [Hurco — *5-Axis Programming: Understanding tool axis and collision controls*](https://blog.hurco.com/blog/bid/242006/5-Axis-Programming-understanding-tool-axis-and-collision-controls)
- [Okuma — *3+2 vs. 5-Axis: What's the Difference?*](https://www.okuma.com/blog/3-plus-2-versus-5-axis)

**TIER-3 (free articles/aggregators)**
- [AMP CNC — *3+2 vs 5-Axis Machining: Which Is Right for Your CNC Operation?*](https://www.ampcnc.com/blog/accurate-machine-products-blogs-1/3-2-vs-5-axis-machining-97)
- [Autodesk Community — *2D Adaptive clearing — can someone explain it?*](https://forums.autodesk.com/t5/fusion-manufacture-forum/2d-adaptive-clearing-can-someone-explain-it/td-p/7260319)
- [Autodesk Fusion CAM Help — *Machine remaining stock (flat / rest machining)*](https://help.autodesk.com/cloudhelp/ENU/Fusion-CAM/files/MFG-3D-FLAT-REST-MACHINING.htm)
- [BobCAD-CAM — *3+2 vs Full 5-Axis Machining: Key Differences, Fixtures & Programming*](https://bobcad.com/32-vs-full-5-axis-machining-key-differences-fixtures-programming/)
- [BobCAD-CAM — *Multiaxis Feature Wizard / Gouge Check Advanced Options*](https://bobcad.com/components/webhelp/BobCADCAMV25/en/CAM/Mill/The_Multiaxis_Feature_Wizard/Tabs/Gouge_Check/Advanced_Options.htm)
- [BobCAD-CAM — *Tilt Tool — Gouge Check Strategy (V31)*](https://bobcad.com/components/webhelp/BobCADCAMV31/en/Content/Merge/Linked/CAM/Multiaxis_Wizard/Settings/Gouge_Check_Linked/Tilt_Tool_Gouge_Check_Strategy.htm)
- [BobCAD-CAM — *What Is CAM Software with Rest Machining?*](https://bobcad.com/what-is-cam-software-with-rest-machining/)
- [CNC Philosophy — *Trochoidal Milling: A Comprehensive Guide*](https://cncphilosophy.com/trochoidal-milling/)
- [cnccode.com — *The Ultimate CNC Toolpath Strategies Encyclopedia*](https://cnccode.com/2026/03/08/the-ultimate-cnc-toolpath-strategies-encyclopedia-pocketing-adaptive-clearing-trochoidal-milling-slotting-and-high-efficiency-machining-explained/)
- [CustomPartNet — *Milling Step-over Distance*](https://www.custompartnet.com/widgets/milling-stepover)
- [Cutting Tool Engineering — *Autodesk: Constant cutting forces speed milling*](https://www.ctemag.com/articles/autodesk-constant-cutting-forces-speed-milling)
- [CutViewer — *Ball Nose Stepover & Cusp Height Calculator*](https://cutviewer.com/tools/stepover-calculator/)
- [Cutwel — *Expert Guide to Trochoidal Milling*](https://www.cutwel.co.uk/blog/expert-guide-to-trochoidal-milling)
- [DATRON — *Climb Milling vs. Conventional Milling*](https://www.datron.com/resources/blog/climb-milling-vs-conventional-milling/)
- [GRAITEC — *Inventor HSM Rest Machining "Not Valid Toolpath" Error Fix*](https://graitec.com/uk/blog/inventor-hsm-rest-machining-not-valid-toolpath-error-fix/)
- [HawkRidge Systems — *Explaining Rest Machining in SOLIDWORKS CAM*](https://hawkridgesys.com/blog/explaining-rest-machining-in-solidworks-cam)
- [LSRPF (LS Manufacturing) — *Simultaneous 5-Axis vs. 3+2-Axis Machining: A Comprehensive Guide*](https://www.lsrpf.com/blog/simultaneous-5-axis-vs-3-2-axis-machining-a-comprehensive-guide-ls-manufacturing)
- [Machining Doctor — *Ball Nose Surface Finish: Calculators & Formulas*](https://www.machiningdoctor.com/calculators/ball-nose-surface-finish/)
- [Machining Doctor — *Chip Thinning: Calculators and Formulas (Radial and Axial)*](https://www.machiningdoctor.com/calculators/chip-thinning-calculator/)
- [Machining Doctor — *Depth of Cut (Milling)*](https://www.machiningdoctor.com/machinistglossary/depth-of-cut-milling/)
- [MFG Shop — *Trochoidal and Peel Milling: A Machinist's Guide*](https://shop.machinemfg.com/trochoidal-and-peel-milling-a-machinists-guide-to-advanced-techniques/)
- [MoldMaking Technology — *Five-Axis Myths*](https://www.moldmakingtechnology.com/articles/five-axis-myths)
- [RapidDirect — *Simultaneous 5-Axis vs. 3+2 Axis Machining: A Detailed Comparison*](https://www.rapiddirect.com/blog/32-vs-5-axis-machining/)
- [Runsom Precision — *The Difference between Simultaneous 5-Axis and 3+2 Axis Machining*](https://www.runsom.com/blog/5-axis-vs-32-axis-machining/)
- [ScienceDirect — *Investigation of lead and tilt angle effects in 5-axis ball-end milling processes*](https://www.sciencedirect.com/science/article/abs/pii/S0890695509001497)
- [Theoretical Machinist — *Surface Finish Calc*](http://theoreticalmachinist.com/Surface_Finish_Calc.aspx)
- [Tormach — *Climb Milling vs. Conventional Milling (Sneaky CNC Tricks)*](https://tormach.com/articles/climb-milling-versus-conventional-milling-sneaky-cnc-tricks)
- [TWC Industrial Calculators — *CNC Ball Endmill Calculator — Effective Diameter & Cusp Height*](https://www.twcindustrial.com/cnc-ball-endmill-calculator/)
- [Villa Machine Associates — *Ball Endmill Surface Finishing Calculator*](https://www.villamachine.com/ball-endmill-surface-finishing-calculator-how-to/)
- [Xometry — *Climb Milling vs. Conventional Milling: Their Key Differences*](https://www.xometry.com/resources/machining/climb-milling-vs-conventional-milling/)

### post-processor - 16 sources   owner: echo
> Deep physics/numeric claims for this domain live in `knowledge/wiki/post-processor/_staging/deep-domain-research-2026-06-09.md` (status: UNVERIFIED - echo verifies before integration). The pointers below are the verifiable corpus the owner draws from.

**TIER-2 (vendor/OEM technical docs)**
- [*AI Contour Control, Specifications Additional Manual* — Fanuc CNC manual via cncmanuals (G05.1 Q1 Rx, R1-R10, ~40-block look-ahead, alarms 5111/5112/5157, builder-may-modify caveat):](http://www.cncmanuals.com/fanuc/595/ai-contour-control-specifications-additional-manual)
- [*Drilling With High-Speed Peck (G73)* — Haas Automation technical document (Setting 22 retract amount):](https://www.haascnc.com/content/dam/haascnc/ecommerce-assets/linedrawings/holemaking/modular_drill_heads/Tech_Doc_Drilling_With_High-Speed_Peck_sr_02-0060_to_02-0077.pdf)
- [*Drilling, Centering — CYCLE81* — Siemens SINUMERIK 840D sl Programming Manual via ManualsLib (CYCLE81 RTP/RFP/SDIS/DP/DPR params, pre-call positioning + tool-length-comp, MCALL):](https://www.manualslib.com/manual/1670082/Siemens-Sinumerik-840d-Sl.html?page=745)
- [*FANUC AI High-Speed Modes — Simplified* (Tim Markoski) — LinkedIn article (Alpha-I meaning, G05.1 Q2/Q3, engage-before-G43, per-tool on/off, not in canned cycles):](https://www.linkedin.com/pulse/fanuc-ai-high-speed-modes-simplified-tim-markoski)
- [*G187 Setting the Smoothness Level (Group 00)* — Haas Automation official codes & settings (G187 P/E syntax, Setting 191, Setting 85 interaction):](https://www.haascnc.com/service/codes-settings.type=gcode.machine=mill.value=G187.html)
- [*G73 and G83 Peck Drilling Cycles* — gcodetutor Fanuc Training Course (full-retract vs in-hole retract, Q peck depth, 5×D rule):](https://gcodetutor.com/fanuc-training-course/g73-g83-drilling-cycle.html)
- [*Haas Setting 191 Default Smoothness* — Helman CNC (ROUGH/MEDIUM/FINISH default, parameter list):](https://www.helmancnc.com/haas-setting-191-default-smoothness-haas-mill/)
- [*High Speed Settings — CYCLE832* — Siemens SINUMERIK 840D Programming Manual via ManualsLib (CYCLE832 bundling G641/G642/COMPCAD/FFWON/SOFT, tolerance-mode digits, builder-optimization caveat):](https://www.manualslib.com/manual/1797033/Siemens-Sinumerik-840d-Sl.html?page=1107)
- [*Tool Nose Radius Compensation Function (G40, G41, G42)* — Okuma OSP-P200L Programming Manual via ManualsLib (turning nose-radius vs milling cutter-radius comp, activate-with-offset rule):](https://www.manualslib.com/manual/1251887/Okuma-Osp-P200l.html?page=69)

**TIER-3 (free articles/aggregators)**
- [*Coordinate Systems* — LinuxCNC Documentation (G54-G59.3 param ranges, G53/G52/G92, G10 L2, G92-persistence INI flag):](https://linuxcnc.org/docs/html/gcode/coordinates.html)
- [*Cutter Compensation (G40, G41, G42)* — Tormach machine-codes reference (plane requirement, negative-offset reversal):](https://tormach.com/machine-codes/cutter-compensation-g40-g41-g42)
- [*G-code* — Wikipedia (ISO 6983 / RS-274 lineage, modal word-address structure, G/M function families, STEP-NC successor):](https://en.wikipedia.org/wiki/G-code)
- [*G-Codes* — LinuxCNC Documentation (work offsets G54-G59.3, G43/G49 + params 5401-5409, feed modes G93/G94/G95, path control G61/G64):](https://linuxcnc.org/docs/html/gcode/g-code.html)
- [*G41 and G42 cutter compensation* — gcodetutor G-code tutorial (left/right comp, D-word, lead-in ≥ radius, G40 discipline):](https://gcodetutor.com/gcode-tutorial/g41-g42-cutter-compensation.html)
- [*Mill Canned Cycles* — LinuxCNC Documentation (G81/G82/G83/G84/G85/G86/G87/G88/G89, G98/G99, G80, L word, Q peck delta):](http://linuxcnc.org/docs/2.4/html/gcode_mill_canned.html)
- [*Rigid Tapping G84 Canned Cycle* — CNC Training Centre (M29 rigid-tap mode, G95 feed=pitch, G84.2 peck-tap):](https://www.cnctrainingcentre.com/rigid-tapping-g84-canned-cycle/)

### blueprint-vision - 19 sources   owner: xray
> Deep physics/numeric claims for this domain live in `knowledge/wiki/blueprint-vision/_staging/deep-domain-research-2026-06-09.md` (status: UNVERIFIED - xray verifies before integration). The pointers below are the verifiable corpus the owner draws from.

**TIER-1 (primary: gov/edu/standards/courseware)**
- [ASME — "Y14.36 Surface Texture Symbols":](https://www.asme.org/codes-standards/find-codes-standards/y14-36-surface-texture-symbols)
- [ISO 1101:2017 standard page:](https://www.iso.org/standard/66777.html)
- [ISO 1101:2017(en) (online browsing platform, free read):](https://www.iso.org/obp/ui/#iso:std:iso:1101:ed-4:v1:en)
- [NIST — "Digital Thread for Manufacturing" program:](https://www.nist.gov/programs-projects/digital-thread-manufacturing)
- [NIST — "Promoting Model-Based Definition to Establish a Complete Product Definition" (pub_id 920003):](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=920003)
- [NIST — "Testing the Digital Thread in Support of Model-Based Manufacturing and Inspection" (pub_id 919497):](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=919497)

**TIER-3 (free articles/aggregators)**
- [Autodesk — "Differences between ASME and ISO Drawing Standards in Fusion 360":](https://knowledge.autodesk.com/support/fusion-360/troubleshooting/caas/sfdcarticles/sfdcarticles/Differences-between-ASME-and-ISO-Drawing-Standards-in-Fusion-360.html)
- [Engineering Essentials — "Formatting Tolerances":](http://engineeringessentials.com/ege5/files/ege/tol/tol_page9.htm)
- [Engineering Product Design — "Surface Finish — Roughness Symbols, Charts, Callouts & Costs":](https://engineeringproductdesign.com/knowledge-base/surface-finish/)
- [Formlabs — "GD&T: The Basics of Geometric Dimensioning and Tolerancing":](https://formlabs.com/blog/gdt-geometric-dimensioning-and-tolerancing/)
- [GD&T Basics — "First vs Third Angle Orthographic Views":](https://www.gdandtbasics.com/first-vs-third-angle-orthographic-views/)
- [GD&T Basics — "Maximum Material Condition (MMC)":](https://www.gdandtbasics.com/maximum-material-condition/)
- [GD&T Basics — "The ASME Y14.5 GD&T Standard":](https://www.gdandtbasics.com/asme-y14-5-gdt-standard/)
- [GD&T Basics — "True Position":](https://www.gdandtbasics.com/true-position/)
- [GrabCAD Tutorials — "ASME Y14.5 2018 – Key Terms and Definitions Explained":](https://grabcad.com/tutorials/asme-y14-5-2018-key-terms-and-definitions-explained)
- [Juize Machinery — "Key Standards and Concepts for Metal Part Surface Roughness":](https://juizemachinery.com/key-standards-and-concepts-for-metal-part-surface-roughness/)
- [RoyMech — "First Angle vs Third Angle Projection / Engineering Drawing Guide":](https://www.roymech.co.uk/Useful_Tables/Drawing/basic.html)
- [Sincere-Machining — "Unilateral and Bilateral Tolerance in Engineering Drawings":](https://www.sincere-machining.com/unilateral-and-bilateral-tolerance/)
- [Xometry Pro — "First Angle vs. Third Angle Projection":](https://xometry.pro/en-uk/articles/first-angle-third-angle-projection/)

### business - 24 sources   owner: hotel
> Deep physics/numeric claims for this domain live in `knowledge/wiki/business/_staging/deep-domain-research-2026-06-09.md` (status: UNVERIFIED - hotel verifies before integration). The pointers below are the verifiable corpus the owner draws from.

**TIER-1 (primary: gov/edu/standards/courseware)**
- [NIST — Manufacturing economics (Applied Economics Office):](https://www.nist.gov/manufacturing-economics)
- [NIST — Manufacturing Extension Partnership (MEP):](https://www.nist.gov/mep)
- [NIST — MEP Economic Impacts Boost Business and Jobs:](https://www.nist.gov/news-events/news/2025/03/mep-economic-impacts-boost-business-and-jobs)
- [U.S. Bureau of Labor Statistics — Employer Costs for Employee Compensation (2025 Q04):](https://www.bls.gov/news.release/ecec.nr0.htm)

**TIER-3 (free articles/aggregators)**
- [Accounting For Management — Predetermined Overhead Rate:](https://www.accountingformanagement.org/predetermined-overhead-rate/)
- [analyticure — The "World Class" OEE Trap (85% benchmark):](https://analyticure.com/overall-equipment-effectiveness-oee-85-percent/)
- [Business LibreTexts 4.5 — Compute a Predetermined Overhead Rate and Apply Overhead:](https://biz.libretexts.org/Courses/Folsom_Lake_College/ACCT_311:_Managerial_Accounting_(Black)
- [Consero — Markup vs. Margin: What Is the Difference?:](https://conseroglobal.com/resources/markup-vs-margin-what-is-the-difference/)
- [Dmaic.com — Six Big Losses in TPM and OEE:](https://www.dmaic.com/faq/six-big-losses/)
- [GrowthForce — The Unseen Cost of Mixing Up Markup and Margin:](https://www.growthforce.com/blog/markup-vs-margin-formul)
- [inFlow — Margin vs Markup: How to Calculate:](https://www.inflowinventory.com/blog/calculate-margin-vs-markup/)
- [Lean Production — OEE (Overall Equipment Effectiveness):](https://www.leanproduction.com/oee/)
- [Lean Production — Theory of Constraints (TOC):](https://www.leanproduction.com/theory-of-constraints/)
- [LeanWorx — World Class OEE: What 85% Really Means:](https://leanworx.ai/world-class-oee/)
- [Manufacturing Pulse — Rough-Cut Capacity Planning: A Comprehensive Guide:](https://manufacturing-pulse.com/rough-cut-capacity-planning/)
- [OEE.com — Six Big Losses in Manufacturing:](https://www.oee.com/oee-six-big-losses/)
- [QAD — What is Capacity Utilization? Capacity Utilization vs Throughput Ratio:](https://www.qad.com/blog/2026/02/metrics-matter-capacity-utilization-throughput-ratio)
- [RELEX Solutions — Rough-cut capacity planning for manufacturers:](https://www.relexsolutions.com/resources/rough-cut-capacity-planning/)
- [Saylor (Managerial Accounting) — Assigning Manufacturing Overhead Costs to Jobs:](https://saylordotorg.github.io/text_managerial-accounting/s06-03-assigning-manufacturing-overhe.html)
- [Symestic — What Characterizes a Good OEE Score?:](https://www.symestic.com/en-us/blog/what-characterizes-a-good-oee-score)
- [Theory of Constraints — Wikipedia (Drum-Buffer-Rope, Throughput Accounting):](https://en.wikipedia.org/wiki/Theory_of_constraints)
- [Theory of Constraints Institute — Five Focusing Steps (POOGI):](https://www.tocinstitute.org/five-focusing-steps.html)
- [Theory of Constraints Institute — Theory of Constraints (overview):](https://www.tocinstitute.org/theory-of-constraints.html)
- [Tractian — What Is World Class OEE? Benchmarks and Standards:](https://tractian.com/en/blog/world-class-oee)

### quoting - 11 sources   owner: charlie
> Deep physics/numeric claims for this domain live in `knowledge/wiki/quoting/_staging/deep-domain-research-2026-06-09.md` (status: UNVERIFIED - charlie verifies before integration). The pointers below are the verifiable corpus the owner draws from.

**TIER-1 (primary: gov/edu/standards/courseware)**
- [NIST — *MCG for Supply Chain Statistics* (free software/tool)](https://www.nist.gov/services-resources/software/mcg-supply-chain-statistics)
- [NIST — *The Manufacturing Cost Guide: A Primer, Version 1.0*](https://www.nist.gov/publications/manufacturing-cost-guide-primer-version-10)
- [NIST Special Publication 1176 — *Costs and Cost Effectiveness of Additive Manufacturing* (part-level labor/material/machine cost decomposition; Hopkinson-Dickens machine-cost method)](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1176.pdf)

**TIER-2 (vendor/OEM technical docs)**
- [Protolabs — *How to Reduce CNC Machining Costs* (cost drivers, +/-0.005 in standard tolerance, finish/feature drivers)](https://www.protolabs.com/resources/design-tips/how-to-reduce-cnc-machining-costs/)
- [Protolabs — *New quoting platform by service line: CNC Machining* (automated vs Network volume-tier routing)](https://www.protolabs.com/en-gb/resources/blog/protolabs-new-quoting-platform-by-service-line-cnc-machining/)
- [Protolabs — *Understanding CNC Manufacturing Costs* (machining-time + fixture + setups model, no-NRE methodology)](https://www.protolabs.com/en-gb/resources/blog/understanding-cnc-manufacturing-costs/)

**TIER-3 (free articles/aggregators)**
- [American Micro Inc. — *CNC Machining Cycle Time Calculation* (cycle-time decomposition, time = length ÷ feed)](https://www.americanmicroinc.com/resources/cnc-machining-cycle-time-calculation/)
- [CNC Optimization — *CNC Machining Cost Estimation Guide: Shop Rate & Quoting* (shop-rate formula, OEE billable hours, rate bands, scrap factor, cost-per-edge, setup amortization, CAM inflation, accuracy band)](https://www.cncoptimization.com/resources/guides/cnc-cost-estimation/)
- [FIRGELLI — *Machining Time Calculator: Turning and Milling* (CSS per-pass RPM recompute)](https://www.firgelliauto.com/blogs/engineering-calculators/machining-time-calculator-turning-and-milling)
- [KEYENCE — *Machining Formula Collection: Milling* (Vc = πDN/1000, RPM = SFM/D × 3.82, Vf = N·z·f)](https://www.keyence.com/ss/products/measure-sys/machining/formula/milling.jsp)
- [NIST ATP hierarchical cost-estimation tool (FIPER) — design-stage 80%-cost-locked-early principle (abstract only)](https://www.sciencedirect.com/science/article/abs/pii/S0166361503000162)

### academy - 36 sources   owner: lima
> Deep physics/numeric claims for this domain live in `knowledge/wiki/academy/_staging/deep-domain-research-2026-06-09.md` (status: UNVERIFIED - lima verifies before integration). The pointers below are the verifiable corpus the owner draws from.

**TIER-1 (primary: gov/edu/standards/courseware)**
- [Apprenticeship.gov — Occupation listing 51-4041.00](https://www.apprenticeship.gov/apprenticeship-occupations/listings?occupationCode=51-4041.00)
- [Cornell LII — 29 CFR §29.5 Standards of apprenticeship](https://www.law.cornell.edu/cfr/text/29/29.5)
- [eCFR — 29 CFR Part 29 (Apprenticeship Labor Standards)](https://www.ecfr.gov/current/title-29/subtitle-A/part-29)
- [Ivy Tech — NIMS CNC Operator](https://www.ivytech.edu/classes/skills-training-classes/manufacturing-industrial-technology-mfit/mfitnim5-nims-cnc-operator/)
- [Kirkwood Community College — CNC Machining Technology](https://www.kirkwood.edu/programs/degrees/manufacturing-trades-transportation/cnc-machining-technology)
- [Lincoln Tech — What are NIMS Certifications](https://www.lincolntech.edu/news/skilled-trades/cnc-machining-and-manufacturing/what-are-nims-certifications)
- [MIT 2.810 lecture 1 (PDF)](http://web.mit.edu/2.810/www/files/lectures/lec1-intro-2019.pdf)
- [MIT 2.810 Manufacturing Processes and Systems](https://web.mit.edu/2.810/www/)
- [MIT OCW — 2.830J Control of Manufacturing Processes](https://ocw.mit.edu/courses/2-830j-control-of-manufacturing-processes-sma-6303-spring-2008/)
- [MIT OCW — 2.852 Manufacturing Systems Analysis](https://ocw.mit.edu/courses/2-852-manufacturing-systems-analysis-spring-2010/)
- [MIT Open Learning — 2.008x Fundamentals of Manufacturing Processes](https://openlearning.mit.edu/courses-programs/mitx-courses/fundamentals-manufacturing-processes)
- [NIMS Credentialing](https://www.nims-skills.org/credentialing)
- [NIMS homepage](https://www.nims-skills.org/)
- [NIMS Machining Credentialing Starter Guide (PDF)](https://www.nims-skills.org/sites/default/files/media/document/Starter%20Guide%20-%20Machining%20Credentialing%20v2.1_0.pdf)
- [NIMS Machining Level I Standards (PDF)](https://www.nims-skills.org/sites/default/files/media/document/NIMS%20Machining%20Level%20I%20Standards.pdf)
- [NIU CITL — Bloom's Taxonomy](https://www.niu.edu/citl/resources/guides/instructional-guide/blooms-taxonomy.shtml)
- [PMC — Is the Deliberate Practice View Defensible?](https://pmc.ncbi.nlm.nih.gov/articles/PMC7461852/)
- [PMC — Role of deliberate practice, Ericsson/Krampe/Tesch-Römer 1993 revisited](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6731745/)
- [Purdue — Macnamara & Maitra 2019 deliberate-practice review (PDF)](https://hhs.purdue.edu/skill-learning-and-performance-lab/wp-content/uploads/sites/43/2024/08/macnamara-maitra-2019-the-role-of-deliberate-practice-in-expert-performance-revisiting-ericsson-krampe-tesch-romer.pdf)
- [Truckee Meadows Community College — CNC Machining CoA](https://catalog.tmcc.edu/degrees-certificates/computer-numeric-controlled-machining-ca/)
- [UCSF — Pearls on Deliberate Practice (PDF)](https://meded.ucsf.edu/sites/meded.ucsf.edu/files/inline-files/pearls-deliberate-practice.pdf)
- [University of Illinois Chicago CATE — Bloom's Taxonomy of Educational Objectives](https://teaching.uic.edu/cate-teaching-guides/syllabus-course-design/blooms-taxonomy-of-educational-objectives/)

**TIER-3 (free articles/aggregators)**
- [apprenticeshipstandards.org — Machinist CB occupation (0296CB)](https://www.apprenticeshipstandards.org/occupation_standards/d9f1c146-07fa-4370-be4d-feef46851aa2)
- [Dreyfus (1980) — Five-Stage Model of Directed Skill Acquisition (PDF)](https://devmts.org.uk/dreyfus.pdf)
- [Ericsson (2008) — Deliberate Practice and Acquisition of Expert Performance (Wiley)](https://onlinelibrary.wiley.com/doi/10.1111/j.1553-2712.2008.00227.x)
- [Indeed — Machinist certifications overview](https://www.indeed.com/career-advice/career-development/machinist-certification)
- [Mindtools — Dreyfus Model of Skill Acquisition](https://www.mindtools.com/atdbxer/the-dreyfus-model-of-skill-acquisition/)
- [O*NET — 51-4041.00 Machinists](https://www.onetonline.org/link/details/51-4041.00)
- [ResearchGate — 70:20:10 Model effectiveness study](https://www.researchgate.net/publication/316610452_THE_702010_MODEL_FOR_LEARNING_AND_DEVELOPMENT_AN_EFFECTIVE_MODEL_FOR_CAPABILITY_DEVELOPMENT)
- [Training Industry — 70-20-10 Model](https://trainingindustry.com/wiki/content-development/the-702010-model-for-learning-and-development/)
- [Umbrex — Dreyfus Model of Skill Acquisition](https://umbrex.com/resources/tools-for-thinking/what-is-the-dreyfus-model-of-skill-acquisition/)
- [University of Waterloo CTE — Bloom's Taxonomy](https://uwaterloo.ca/centre-for-teaching-excellence/catalogs/tip-sheets/blooms-taxonomy)
- [Urban Institute — Registering Apprenticeship Standards](https://www.urban.org/apps/youth-apprenticeship/registering-apprenticeship-standards)
- [USMAP/RAPIDS 0296D-CB Machinists (PDF)](https://usmap.osd.mil/trades/competency/0296D-CB.pdf)
- [Wikipedia — Bloom's taxonomy](https://en.wikipedia.org/wiki/Bloom's_taxonomy)
- [Wikipedia — Dreyfus model of skill acquisition](https://en.wikipedia.org/wiki/Dreyfus_model_of_skill_acquisition)

### shop-floor - 21 sources   owner: (shop-floor-owner)
> Deep physics/numeric claims for this domain live in `knowledge/wiki/shop-floor/_staging/deep-domain-research-2026-06-09.md` (status: UNVERIFIED - (shop-floor-owner) verifies before integration). The pointers below are the verifiable corpus the owner draws from.

**TIER-1 (primary: gov/edu/standards/courseware)**
- [ISO 22400-1:2014](https://www.iso.org/standard/56847.html)
- [ISO 22400-2:2014](https://www.iso.org/standard/54497.html)
- [NIST, "A Hierarchical structure of key performance indicators for ..." (publication)](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=919754)

**TIER-3 (free articles/aggregators)**
- [connect981.com, "ISA-95 MES-ERP Boundary](https://connect981.com/blog-posts/isa95-mes-erp-boundary-20260122)
- [connect981.com, "ISO 22400 Overview](https://connect981.com/blog-posts/iso-22400-overview-manufacturing-kpis-basics)
- [eazyworks.com, "Product Tracking and Genealogy](https://eazyworks.com/features-product-tracking-and-genealogy)
- [Kanban Zone, "Andon](https://kanbanzone.com/resources/lean/toyota-production-system/andon/)
- [KanbanBOX, "The Heijunka for levelling production](https://www.kanbanbox.com/heijunka-levelling-production/)
- [Lean Enterprise Institute, "Heijunka Box](https://www.lean.org/lexicon-terms/heijunka-box/)
- [Learn Lean Sigma, "Heijunka 101](https://www.learnleansigma.com/lean-manufacturing/heijunka-in-lean/)
- [Modern Machine Shop, "Understanding MTConnect Agents and Adapters](https://www.mmsonline.com/articles/understanding-mtconnect-agents-and-adapters)
- [MTConnect Getting Started](https://www.mtconnect.org/getting-started)
- [MTConnect Institute homepage](https://www.mtconnect.org/)
- [MTConnect Standard Part 2.0, Devices Information Model (primary spec PDF)](https://docs.mtconnect.org/MTConnect_Part_2-0_Devices_Information_Model_1-8-0.pdf)
- [Real Time Automation, "An Overview of MTConnect](https://www.rtautomation.com/technologies/mtconnect/)
- [symestic.com, "ISA-95](https://www.symestic.com/en-us/blog/mes/isa95)
- [Toyota UK Magazine, "Andon - Toyota Production System guide](https://mag.toyota.co.uk/andon-toyota-production-system/)
- [Wikipedia, "5S (methodology)](https://en.wikipedia.org/wiki/5S_(methodology)
- [Wikipedia, "Andon (manufacturing)](https://en.wikipedia.org/wiki/Andon_(manufacturing)
- [Wikipedia, "MTConnect](https://en.wikipedia.org/wiki/MTConnect)
- [Wikipedia, "Overall equipment effectiveness](https://en.wikipedia.org/wiki/Overall_equipment_effectiveness)

## Remaining galaxies (no deep-domain packet yet)

The ~19 infrastructure galaxies (agent-orchestration, fleet-hygiene, discovery, wiring, bug-hunting, backend-helper, dormant-data, hermes-zulu, token-optimization, database-expansion, cad-fusion-live, mit-curriculum, pdf-corpus, pdf-corpus-mill, corpus-aggregation, knowledge-conversion, compliance-safety, tribal-knowledge, frontend-app) are tooling/meta domains whose authoritative corpus is PRISM-internal (code + wiki + the operator-provided article set) rather than external free-source - they are served by the cross-cutting methodology lane (34/34) and do not need an external-source corpus. If a future packet lands for one, re-run the generator and it appears above automatically.

---
_Maintenance: `node scripts/build-galaxy-free-source-corpus.mjs` regenerates this file. Related: `GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md`, `GALAXY-DEEPDOMAIN-STAGED-2026-06-09.md`, `reference_critical_resource_roots_2026_05_30`._
