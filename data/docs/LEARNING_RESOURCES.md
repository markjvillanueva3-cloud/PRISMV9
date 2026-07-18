# PRISM Learning Resources — Engine & Calculator Hardening

Curated 2026-03-22. Sources for validating/hardening Kienzle, Taylor, speed/feed tables,
G-code sequencing, and machining physics across all PRISM engines.

---

## 1. MANUFACTURER CUTTING DATA (Primary Calibration Sources)

### Sandvik Coromant
- **Metal Cutting Technology Training Handbook** — Full Kienzle kc1.1/mc tables by ISO group
  - [Scribd PDF](https://www.scribd.com/document/317281556/Sandvik-Metal-Cutting-Technology-Training-Handbook)
- **Machining Calculator App** — Speed/feed/power calculations for turning, milling, drilling, tapping
  - [Calculator](https://www.sandvik.coromant.com/en-us/knowledge/machining-calculators-apps/machining-calculator-app)
- **Technical Guide / Knowledge Portal** — Process-specific cutting data
  - [Knowledge Base](https://www.sandvik.coromant.com/en-gb/knowledge/pages/default.aspx)

### Kennametal
- **Turning Speeds & Feeds PDF** — Beyond Evolution insert series, feed rate tables
  - [Turning PDF](https://s7d2.scene7.com/is/content/Kennametal/final/kennametal/catalogs/metal-cutting/turning-2018/turning-2018-beyond-evolution-speeds-and-feeds_instructions_en-inch.pdf)
- **End Mill Speed & Feed Tables** — Starting parameters by material
  - [MSC/Kennametal PDF](https://www1.mscdirect.com/images/solutions/kennametal/endMillSpeedFeed.pdf)
- **Milling Tech Info & Formulas** — SFM, RPM, IPM, IPT formulas
  - [Milling Formulas PDF](https://www1.mscdirect.com/images/solutions/kennametal/millingTechInfoFormulas.pdf)
- **Application Data (Grooving/Cutoff)** — KCU10B insert cutting data
  - [Application Data PDF](https://www.kennametal.com/content/dam/final/kennametal/docs/application-data/kcu10b/kcu10b-application-data_en.pdf)
- **Speeds & Feeds Calculator** — Online tool with material database
  - [Calculator](https://www.kennametal.com/us/en/resources/technical-tips/machining-knowledge/tech-tip--30.html)

### ISCAR
- **Milling Applications & Cutter Basics Guide** — Cutting forces, torque, power, HSM/HEM/HFM strategies
  - [ISCAR Milling Guide PDF](https://www.iscar.com/Catalogs/Publication/english_1/Milling_Applications_and_Cutter_Basics_Guide/Milling_Applications_and_Cutter_Basics_Guide.pdf)
- **Cutting Tools User Guide (2023)** — Full range cutting parameters
  - [User Guide PDF](https://www.iscar.com/Catalogs/publication-2023/english_1/Cutting_tools_user_guide_2023/Cutting_tools_user_guide_2023.pdf)
- **Machining Titanium Reference Guide** — ISO S group parameters
  - [Titanium PDF](https://www.iscar.com/Catalogs/Publication/english_1/machining_titanium/machining_titanium_05_2019.pdf)
- **Aluminum Machining Guide** — ISO N group parameters
  - [Aluminum PDF](https://www.iscar.com/Catalogs/Publication/english_1/ALUMINUM_MACHINING/ALUMINUM_MACHINING.pdf)
- **Die & Mold User Guide** — Roughing/semi-finish/finish strategies
  - [Die & Mold PDF](https://www.iscar.hu/Catalogs/Publication/english_1/Die_and_Molds_User_Guide/Die_and_Molds_User_Guide_7861458_2017.pdf)
- **Radial Chip Thinning Calculator** — ae correction methodology
  - [Chip Thinning PDF](https://www.iscar.com/ITC/UserGuide/ITA_USER_GUIDE_RadialChipThinningCalculator_EN.pdf)

### Walter Tools
- **Turning Catalog 2023** — Complete turning cutting data
  - [Turning Catalog PDF](https://cdn.walter-tools.com/files/sitecollectiondocuments/downloads/global/catalogues/en-gb/catalog-turning-2023-en.pdf)
- **Drilling & Threading Handbook** — Drill/tap cutting data tables
  - [Drilling Handbook PDF](https://cdn.walter-tools.com/files/sitecollectiondocuments/downloads/global/manuals/en-gb/handbook-drilling-threading-2009-en.pdf)
- **Full Catalog Library** — All Walter catalogs
  - [DirectIndustry Catalogs](https://pdf.directindustry.com/pdf/walter-tools-5602.html)

---

## 2. REFERENCE HANDBOOKS & STANDARDS

### Machinery's Handbook
- **Cutting Speed & Feed Tables** — Chapter on speeds/feeds with material-specific tables
  - [Machinery's Handbook PDF](https://www.tfgusa.com/wp-content/uploads/2023/11/Machinerys-Handbook.pdf)
  - 31st Edition (Industrial Press) — primary reference for PRISM speed/feed defaults

### ASM Handbook Vol 16: Machining
- **1,300 illustrations, 620 tables** — Process capabilities, cutting parameters
  - [ASM Vol 16 PDF](https://automaterials.files.wordpress.com/2019/01/16-Machining.pdf)
  - Covers: turning, milling, drilling, grinding, EDM, ECM with material-specific data

### SME Tool & Manufacturing Engineers Handbook Vol 1
- **Machining chapter** — Speed/feed selection, cutting forces, tool materials
  - [SME Manufacturing Guide PDF](https://www.sme.org/globalassets/sme.org/media/training-guides/manufacturing-processes-and-materials.pdf)

---

## 3. KIENZLE & TAYLOR CONSTANTS (Physics Validation)

### Kienzle kc1.1 / mc Database
- **Machining Doctor** — kc1.1 and mc values searchable by SAE/DIN material designation
  - [Specific Cutting Force Guide](https://www.machiningdoctor.com/glossary/specific-cutting-force-kc-kc1/)
  - [Machining Power Calculator](https://www.machiningdoctor.com/calculators/machining-power/)
- **ResearchGate — kc1 and mc tables for ISO P, M, K, N, S, H**
  - [Research Figure](https://www.researchgate.net/figure/alues-of-the-kc1-and-mc-parameters-for-the-materials-of-the-group-P-M-from-the-catalogue_fig6_270279219)
- **Sirris — Key to Model-Based Machining** — Kienzle formula explained with examples
  - [Sirris Article](https://www.sirris.be/en/inspiration/key-model-based-machining-kienzles-cutting-force-formula)
- **ScienceDirect — High Feed Rate kc1.1 determination**
  - [Research Paper](https://www.sciencedirect.com/science/article/pii/S2212827118310485)

### Taylor Tool Life Constants
- **Practical Machinist — Taylor Constants Discussion** — Community-sourced C and n values
  - [PM Thread](https://www.practicalmachinist.com/forum/threads/taylors-tool-life-equation-constants.284356/)
- **ResearchGate — Taylor Constants Table** — n and C for multiple tool-workpiece combinations
  - [Constants Table](https://www.researchgate.net/figure/4-Taylors-tool-life-equation-coefficients-for-several-tool-workpiece-combinations-in_tbl2_284510393)
  - [Tool Life Equation Values](https://www.researchgate.net/figure/Taylor-Tool-Life-Equation-Constant-Values_tbl6_354543111)
- **SS316L Carbide Insert Research** — Experimental Taylor determination
  - [ResearchGate Paper](https://www.researchgate.net/publication/349531598_Estimation_of_Tool_Life_by_Industrial_Method_and_Taylors_Method_Using_Coated_Carbide_Insert_in_Turning_of_Work-Material_Ss316l)
- **ScienceDirect — Tool Life During Turning** — Experimental n and C values
  - [Research PDF](https://www.sciencedirect.com/science/article/pii/S1877705814033062/pdf)

---

## 4. COMPLETE CNC PROGRAM EXAMPLES

### Haas Automation (FREE Official PDFs)
- **Lathe Programming Workbook** — Complete programs with G71, G72, G73, G74, G75, G76 cycles
  - [Haas Lathe Workbook PDF](https://www.haascnc.com/content/dam/haascnc/en/service/reference/programming-workbooks/lathe---programming-workbook.pdf)
- **Mill Programming Workbook** — Complete mill programs with canned cycles
  - [Haas Mill Workbook PDF](https://www.haascnc.com/content/dam/haascnc/en/service/reference/programming-workbooks/mill---programming-workbook.pdf)
- **Shop Notes — Machinist's CNC Reference Guide** — Quick reference for G/M codes
  - [Shop Notes PDF](https://www.haascnc.com/content/dam/haascnc/en/service/reference/programming-workbooks/shop-notes---machinist's-cnc-reference-guide.pdf)
- **Lathe Programming (Productivity Inc.)** — Extended examples with threading, grooving
  - [Productivity Lathe PDF](https://www.productivity.com/wp-content/uploads/2022/08/Haas-Lathe-Programming-8-2022.pdf)
- **Mill G&M Programming (Productivity Inc.)** — Extended mill examples
  - [Productivity Mill PDF](https://productivity.com/wp-content/uploads/2022/08/Haas-Mill-Programming-2022.pdf)

### Mazak
- **Mazatrol Matrix Programming Manual (Integrex IV)** — Multi-axis programs
  - [Mazatrol Manual PDF](https://victoriacaruk.com/Mazak%20Mazatrol%20Programing%20Manual%20for%20Mazatrol%20Matrix.pdf)
- **Integrex MkIV Programming Classbook** — Workbook with exercises
  - [Classbook PDF](https://victoriacaruk.com/Mazak%20Programming%20Class%20Workbook%20ofr%20Integrex%20MKIV%20with%20Matrix%20Control.pdf)
- **Mazak G-Code Reference** — Code tables and programming tips
  - [Premier Equipment Reference](https://premierequipment.com/cnc-blog/mazak-cnc-machine-code-reference/)

### DMG MORI
- **Technology Journal (Process Consolidation)** — Advanced machining strategies
  - [DMG MORI Technology PDF](https://en.dmgmori.com/resource/blob/339376/db71c3bc86aa5fba20a357708eada211/j191en-data.pdf)
- **Download Center** — Machine-specific documentation (requires account)
  - [Download Center](https://en.dmgmori.com/news-and-media/download-center)

### General G-Code Examples
- **CNC Programming Tutorials by Thanh Tran** — G&M code examples across operations
  - [Scribd Document](https://www.scribd.com/document/648850650/CNC-Programming-Tutorials-Examples-G-and-M-Codes-by-Thanh-Tran)

---

## 5. ONLINE CALCULATORS & DATABASES

- **CNC Optimization Feeds & Speeds Calculator** — 50+ materials, Machinery's Handbook 2026 data
  - [Calculator](https://www.cncoptimization.com/calculators/feeds-speeds/)
- **FSWizard** — Considers dozens of variables for milling, drilling, turning
  - [FSWizard](https://zero-divide.net/fswizard)
- **CNCCode Mega Database** — Complete parameters for Al, steel, SS, Ti, plastics
  - [Mega Database](https://cnccode.com/2026/03/12/the-ultimate-cnc-feeds-and-speeds-mega-database-complete-cutting-parameters-for-aluminum-steel-stainless-steel-titanium-and-plastics/)
- **CNCCookbook Feeds & Speeds** — Tutorial + reference tables
  - [Tutorial PDF](http://s3.cnccookbook.com/img/CNCCookbook/eBooks/CNCFeedsandSpeedsCookbook.pdf)
  - [Guide](https://www.cnccookbook.com/feeds-speeds/)
- **Harvey Performance — Speeds & Feeds 101** — Endmill parameter methodology
  - [Harvey Guide](https://www.harveyperformance.com/in-the-loupe/speeds-and-feeds-101/)

---

## 6. VIDEO LEARNING (Parameters on Camera)

### ProvenCut (GOLD STANDARD — verified video + data)
- **Video library of proven speeds/feeds recipes** — Each recipe includes video footage, chips, setup photos, cutting data (coolant, gauge length, HP), and Fusion 360 CAM operation links
  - [ProvenCut](https://provencut.com/)
  - [Autodesk/ProvenCut Partnership](https://www.autodesk.com/products/fusion-360/blog/provencut-cnc/)
  - Created at Saunders Machine Works on Haas, FANUC, DMG MORI machines

### Titans of CNC Academy (FREE)
- **Fundamentals of CNC Machining** — Complete textbook-length PDF
  - [Fundamentals PDF](https://academy.titansofcnc.com/files/Fundamentals_of_CNC_Machining.pdf)
- **Full machining project walkthroughs** — Design → Program → Machine with parameters
  - [Academy](https://academy.titansofcnc.com/)
  - [TITAN-1M Series](https://academy.titansofcnc.com/series/titan-1m/how-to-machine-the-titan-1m)
  - [Setup Tutorials](https://academy.titansofcnc.com/category/titan-tutorials)

### Haas Automation Videos
- **Tip of the Day** — Short focused videos on programming, setup, offsets, macros
  - [Haas Videos](https://www.haascnc.com/video.html)
  - [Learning Resources](https://www.haascnc.com/myhaas/Haas_Learning_Resources.html)

---

## 7. COLLEGE / ACADEMIC COURSES

### MIT OpenCourseWare
- **2.008 Design and Manufacturing II** — CAD/CAM labs, Mastercam, G-code, CNC lathe/mill
  - [Labs](https://ocw.mit.edu/courses/2-008-design-and-manufacturing-ii-spring-2004/pages/labs/)
  - [CAD/CAM Lab PDF](https://ocw.mit.edu/courses/2-008-design-and-manufacturing-ii-spring-2004/resources/thecad_camlabs/)
- **2.854 Introduction to Manufacturing Systems** — Probability, queuing, optimization models
  - [Course](https://ocw.mit.edu/courses/2-854-introduction-to-manufacturing-systems-fall-2016/)

### Georgia Tech
- **EPICS CNC Pathways** — Machining concepts, CAM, toolpaths, simulations
  - [CNC Pathways](https://epics.me.gatech.edu/education/cnc-pathways-at-georgia-tech/)
- **ME 6224 Machine Tool Analysis** — Mechanics/dynamics of machining

### Open Textbooks
- **Manufacturing Processes 4-5** — Speed and feed unit with formulas and tables
  - [OpenOregon Textbook](https://openoregon.pressbooks.pub/manufacturingprocesses45/chapter/unit-2-speed-and-feed/)
- **CNC Machining: The Complete Engineering Guide**
  - [Engineering Guide PDF](https://gab.wallawalla.edu/~ralph.stirling/classes/engr480/examples/nvx/NVX/Helpful%20Docs/CNC_Machining_The_Complete_Engineering_Guide.pdf)
- **Digital Notes: Manufacturing Technology (MRCET)**
  - [MT Digital Notes PDF](https://mrcet.com/downloads/digital_notes/ME/III%20year/MT%20Digital%20Notes.pdf)

### NIMS Certification
- **Milling Level I Prep Guide** — [PDF](https://www.nims-skills.org/sites/default/files/media/document/Milling%20Level%20I.pdf)
- **Turning Level I Prep Guide** — [PDF](https://www.nims-skills.org/sites/default/files/media/document/Turning%20Level%20I%20(manual).pdf)
- **Measurement, Materials, Safety** — [PDF](http://neme-s.org/CTHSS/NIMS%20info/study_mms.pdf)

---

## 8. 5-AXIS / MULTI-AXIS CASE STUDIES

- **Impeller CNC Process Planning & Toolpath Design** — Full case study with parameters
  - [C-YCNC Article](https://www.c-ycnc.com/blog/cnc-machining-process-planning-and-tool-path-design-for-a-multi-blade-part/)
- **5-Axis Impeller Review Paper (ScienceDirect)** — Toolpath generation & deformation control
  - [ScienceDirect Paper](https://www.sciencedirect.com/science/article/abs/pii/S1526612524008818)
- **5-Axis Toolpath Planning (CAD Journal)** — Discrete surface methodology
  - [CAD Journal PDF](https://www.cad-journal.net/files/vol_15/CAD_15(1)_2018_76-89.pdf)
- **MIT — Automatic 5-Axis NC Toolpath Generation** — Thesis with algorithms
  - [MIT Thesis PDF](https://dspace.mit.edu/bitstream/handle/1721.1/29225/50140264-MIT.pdf)
- **OPEN MIND hyperMILL — Impeller/Blisk** — Commercial 5-axis strategies
  - [OPEN MIND](https://www.openmind-tech.com/en-us/cam/5-axis-milling/impeller-blisk/)
- **Mastercam 5-Minute 5-Axis Impeller Challenge** — Timed machining demo
  - [CAMInstructor Blog](https://blog.caminstructor.com/5-minute-5-axis-impeller-challenge)

---

## Priority Download Queue (for /pdf-learn pipeline)

| # | Source | Type | Value to PRISM |
|---|--------|------|----------------|
| 1 | Haas Lathe Programming Workbook | PDF | G71/G72/G76 complete programs — validates TurningEngine |
| 2 | Haas Mill Programming Workbook | PDF | Canned cycles — validates HolePatternEngine |
| 3 | ISCAR Milling Applications Guide | PDF | Force/power/torque formulas — validates physics |
| 4 | Sandvik Metal Cutting Handbook | PDF | kc1.1/mc tables — calibrates Kienzle constants |
| 5 | ASM Handbook Vol 16 Machining | PDF | 620 tables — massive parameter validation |
| 6 | Walter Drilling & Threading | PDF | Tap/drill data — validates HolePatternEngine |
| 7 | Titans of CNC Fundamentals | PDF | End-to-end machining methodology |
| 8 | MIT 5-Axis Thesis | PDF | Toolpath algorithms — validates MultiAxisEngine |
| 9 | Machinery's Handbook | PDF | Speed/feed tables — master reference |
| 10 | ISCAR Titanium Guide | PDF | ISO-S parameters — validates exotic material handling |
