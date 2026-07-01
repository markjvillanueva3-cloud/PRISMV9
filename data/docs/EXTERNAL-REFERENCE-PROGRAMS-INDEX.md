# External CNC Reference Programs Index

> Programs with BOTH engineering drawings/prints AND matching CNC programs.
> Use for validating PRISM program generation against known-correct output.
> Last updated: 2026-03-23

---

## Quality Rating Key

- **GOLD** = Official source, drawing + complete program, freely downloadable
- **SILVER** = Drawing + program available but requires registration or partial access
- **BRONZE** = Reference exists but program/drawing incomplete or behind paywall
- **TEXTBOOK** = Published book with examples (purchase required)

---

## 1. MILLING

### 1.1 Haas Mill Programming Workbook [GOLD]
- **Source**: Haas Automation, Inc.
- **URL**: https://www.haascnc.com/content/dam/haascnc/en/service/reference/programming-workbooks/mill---programming-workbook.pdf
- **Machine type**: 3-axis vertical mill
- **Controller**: Haas (Fanuc-compatible)
- **Part description**: Multiple exercise parts — pockets, contours, bolt circles, canned cycles
- **Complexity**: Simple to Medium
- **Has print/drawing**: YES (dimensioned part drawings for each exercise)
- **Has CNC program**: YES (complete G-code programs)
- **Material**: Aluminum (typical)
- **Format**: PDF workbook (~100+ pages)
- **Notes**: The gold standard for mill training. Exercises progress from basic positioning through cutter comp, canned cycles, and subprograms.

### 1.2 Haas Mill Advanced Programming Manual [GOLD]
- **Source**: Productivity Inc. (Haas Factory Outlet)
- **URL**: https://www.productivity.com/wp-content/uploads/2019/01/Advanced-Programming-Techniques-Mills-122214-40516.pdf
- **Machine type**: 3-axis vertical mill
- **Controller**: Haas (Fanuc-compatible)
- **Part description**: Advanced exercises — macro programming, probing, engraving
- **Complexity**: Medium to Complex
- **Has print/drawing**: YES
- **Has CNC program**: YES
- **Material**: Various
- **Format**: PDF manual

### 1.3 Haas Mill G&M Programming Manual (2022) [GOLD]
- **Source**: Productivity Inc.
- **URL**: https://productivity.com/wp-content/uploads/2022/08/Haas-Mill-Programming-2022.pdf
- **Machine type**: 3-axis vertical mill
- **Controller**: Haas NGC
- **Part description**: Training exercises with G/M code reference
- **Complexity**: Simple to Medium
- **Has print/drawing**: YES
- **Has CNC program**: YES
- **Material**: Various
- **Format**: PDF

### 1.4 Titans of CNC Academy — Mill Building Blocks [GOLD]
- **Source**: Titans of CNC Academy (Titan Gilroy)
- **URL**: https://academy.titansofcnc.com/category/mill-building-blocks
- **Machine type**: 3-axis vertical mill
- **Controller**: Haas (Fanuc-compatible)
- **Part description**: TITAN-1M through TITAN-10M progressive complexity parts. 10-part series teaching design, programming, and machining.
- **Complexity**: Simple (1M) to Complex (10M)
- **Has print/drawing**: YES (2D PDF prints with full GD&T)
- **Has CNC program**: YES (Fusion 360 CAM + manual G&M code programming tutorials)
- **Material**: 6061-T6 Aluminum
- **Format**: PDF prints + Fusion 360 files + video tutorials
- **Notes**: Free account required. Includes CAD models (Fusion 360), 2D prints, and video walkthroughs. TITAN-1M has manual G-code programming tutorial.

### 1.5 Titans of CNC — TITAN-1M Manual G&M Code [GOLD]
- **Source**: Titans of CNC Academy
- **URL**: https://academy.titansofcnc.com/series/program-g-m-code/g-m-code-programming
- **Machine type**: 3-axis mill
- **Controller**: Haas/Fanuc
- **Part description**: TITAN-1M manually programmed using G&M codes
- **Complexity**: Simple
- **Has print/drawing**: YES
- **Has CNC program**: YES (hand-written G-code)
- **Material**: 6061-T6 Aluminum
- **Format**: Video + downloadable files

### 1.6 CNC Cookbook G-Code Course [SILVER]
- **Source**: CNC Cookbook (Bob Warfield)
- **URL**: https://www.cnccookbook.com/cnc-programming-g-code/
- **Alt URL (eBook)**: http://s3.cnccookbook.com/Downloads/eBook/CNCCookbookGCodeCourse.pdf
- **Machine type**: 3-axis mill
- **Controller**: Fanuc-dialect (generic)
- **Part description**: Progressive examples — lines, arcs, pockets, drilling patterns
- **Complexity**: Simple to Medium
- **Has print/drawing**: YES (inline diagrams)
- **Has CNC program**: YES (G-code examples throughout)
- **Material**: Various
- **Format**: PDF eBook (16 chapters) + web tutorials

### 1.7 CNC Cookbook Free G-Code Files [GOLD]
- **Source**: CNC Cookbook
- **URL**: https://www.cnccookbook.com/g-code-examples-files/
- **Machine type**: Mill
- **Controller**: Generic Fanuc
- **Part description**: Warm-up programs, circle cutters, test programs
- **Complexity**: Simple
- **Has print/drawing**: YES (descriptions with diagrams)
- **Has CNC program**: YES (downloadable .nc files)
- **Material**: Various
- **Format**: Downloadable NC files

### 1.8 Helman CNC Programming Examples [SILVER]
- **Source**: Helman CNC (helmancnc.com)
- **URL**: https://www.helmancnc.com/cnc-programming-for-beginners-a-simple-cnc-programming-example/
- **Machine type**: Mill and Lathe
- **Controller**: Fanuc
- **Part description**: Multiple exercise parts with drawings and complete programs. Covers G02/G03 arcs, pockets, cutter comp, chamfers, radii.
- **Complexity**: Simple to Medium
- **Has print/drawing**: YES (part drawings with dimensions)
- **Has CNC program**: YES (complete G-code with line-by-line explanation)
- **Material**: Various
- **Format**: Web pages with embedded drawings and code

### 1.9 Fagor CNC 8055 Programming Examples [GOLD]
- **Source**: Fagor Automation / DMS CNC Routers
- **URL**: https://dmscncrouters.com/wp-content/uploads/2016/05/Fagor-CNC-8055-Examples-Manual-English.pdf
- **Machine type**: 3-axis mill
- **Controller**: Fagor 8055
- **Part description**: Comprehensive examples — contour milling, pocket milling, canned cycles, subroutines
- **Complexity**: Simple to Complex
- **Has print/drawing**: YES (detailed part drawings)
- **Has CNC program**: YES (complete programs in Fagor ISO dialect)
- **Material**: Various
- **Format**: PDF manual

### 1.10 Mastercam Basics Tutorial [SILVER]
- **Source**: Mastercam (CNC Software, Inc.) / colla.lv
- **URL**: http://colla.lv/wp-content/uploads/2018/07/Mastercam-Basics-Tutorial.pdf
- **Machine type**: 3-axis mill
- **Controller**: Fanuc-compatible (via post processor)
- **Part description**: Tutorial parts demonstrating 2D and 3D toolpaths
- **Complexity**: Simple to Medium
- **Has print/drawing**: YES (CAD models shown)
- **Has CNC program**: YES (post-processed G-code output)
- **Material**: Various
- **Format**: PDF tutorial

### 1.11 GCodeTutor Fusion 360 Tutorials [SILVER]
- **Source**: GCodeTutor
- **URL**: https://gcodetutor.com/fusion-360-cnc-machinist.html
- **Machine type**: 3-axis mill
- **Controller**: Fanuc/Generic
- **Part description**: Step-by-step CAD-to-G-code tutorials
- **Complexity**: Simple to Medium
- **Has print/drawing**: YES (CAD models)
- **Has CNC program**: YES (post-processed output)
- **Material**: Various
- **Format**: Web tutorials

### 1.12 CNCTraining.gr Programming Examples [SILVER]
- **Source**: CNC Training Greece
- **URL**: https://www.cnctraining.gr/en/activities/blog/271-cnc-programming-examples
- **Machine type**: Mill and Lathe
- **Controller**: Fanuc
- **Part description**: Contour milling, face milling, profile finishing with dimensioned drawings
- **Complexity**: Medium
- **Has print/drawing**: YES
- **Has CNC program**: YES
- **Material**: Various
- **Format**: Web page

### 1.13 CIMCO Basic ISO Programming Tutorials [GOLD]
- **Source**: CIMCO A/S
- **URL (Turning example)**: https://www.cimco.com/documentation/documents/cimco_edit/courses/en/cimco-edit-basic-iso-programming-tutorial-3-en.pdf
- **Machine type**: Mill and Lathe
- **Controller**: ISO/Fanuc
- **Part description**: Progressive exercises — housing with taper bore, contour parts
- **Complexity**: Simple to Medium
- **Has print/drawing**: YES (detailed dimensioned drawings)
- **Has CNC program**: YES (complete ISO programs)
- **Material**: Various
- **Format**: PDF tutorials

---

## 2. TURNING

### 2.1 Haas Lathe Programming Workbook [GOLD]
- **Source**: Haas Automation, Inc.
- **URL**: https://www.haascnc.com/content/dam/haascnc/en/service/reference/programming-workbooks/lathe---programming-workbook.pdf
- **Machine type**: 2-axis CNC lathe
- **Controller**: Haas (Fanuc-compatible)
- **Part description**: Multiple turning exercises — OD turning, boring, threading, grooving, taper turning
- **Complexity**: Simple to Medium
- **Has print/drawing**: YES (dimensioned part drawings for each exercise)
- **Has CNC program**: YES (complete G-code programs)
- **Material**: Various
- **Format**: PDF workbook

### 2.2 Haas Lathe Programming Manual (Productivity Inc.) [GOLD]
- **Source**: Productivity Inc.
- **URL**: https://productivity.com/wp-content/uploads/2019/01/Haas-Lathe-Programming.pdf
- **Machine type**: 2-axis CNC lathe
- **Controller**: Haas NGC
- **Part description**: Training exercises for lathe operations
- **Complexity**: Simple to Medium
- **Has print/drawing**: YES
- **Has CNC program**: YES
- **Material**: Various
- **Format**: PDF manual

### 2.3 Fanuc CNC Lathe Programming Examples (Helman CNC) [SILVER]
- **Source**: Helman CNC
- **URL**: https://www.helmancnc.com/fanuc-cnc-lathe-programming-example/
- **Alt URL**: https://www.helmancnc.com/cnc-turning-center-programming-example/
- **Machine type**: 2-axis CNC lathe
- **Controller**: Fanuc
- **Part description**: OD/ID turning, G71 roughing cycles, G70 finishing, threading, grooving
- **Complexity**: Simple to Medium
- **Has print/drawing**: YES (part drawings with dimensions)
- **Has CNC program**: YES (complete programs with explanations)
- **Material**: Various
- **Format**: Web pages

### 2.4 Fanuc Lathe Programming Examples (Scribd) [SILVER]
- **Source**: Community upload
- **URL**: https://www.scribd.com/document/443307402/U-W-CNC-Lathe-CNC-Program-Examples
- **Machine type**: 2-axis CNC lathe
- **Controller**: Fanuc
- **Part description**: U/W incremental programming examples with drawings
- **Complexity**: Simple to Medium
- **Has print/drawing**: YES
- **Has CNC program**: YES
- **Material**: Various
- **Format**: PDF (Scribd)

### 2.5 Okuma Lathe Programming Examples [SILVER]
- **Source**: Various (Scribd, Practical Machinist, CNC Manual)
- **URL**: https://www.scribd.com/document/490767961/Okuma-Program-Example
- **Manual URL**: http://douglasrudd.com/manuals/Okuma-OSP-P200L-Programming.pdf
- **Machine type**: 2-axis CNC lathe
- **Controller**: Okuma OSP-P200L
- **Part description**: OD turning, bar turning cycles, roughing/finishing
- **Complexity**: Simple to Medium
- **Has print/drawing**: YES (some examples)
- **Has CNC program**: YES
- **Material**: Various
- **Format**: PDF manual + web examples

### 2.6 Titans of CNC — Lathe Series [GOLD]
- **Source**: Titans of CNC Academy
- **URL**: https://academy.titansofcnc.com/category/lathe-mill-aerospace-connections
- **Machine type**: CNC lathe / live-tooling lathe
- **Controller**: Haas/Fanuc
- **Part description**: TITAN-127LM through TITAN-131LM aerospace connection parts. Actual rocket/flight vehicle components.
- **Complexity**: Medium to Complex
- **Has print/drawing**: YES (2D prints with GD&T, per AMS specs)
- **Has CNC program**: YES (Fusion 360 CAM tutorials)
- **Material**: 316/316L Stainless Steel (AMS-5653/5648)
- **Format**: PDF prints + video + CAD files

### 2.7 Mastercam Lathe Tutorial [SILVER]
- **Source**: CNC Software, Inc. / colla.lv
- **URL**: http://colla.lv/wp-content/uploads/2016/07/GettingStartedwithMastercamLatheCompressed.pdf
- **Machine type**: 2-axis CNC lathe
- **Controller**: Fanuc-compatible (via post)
- **Part description**: Getting started tutorial parts
- **Complexity**: Simple
- **Has print/drawing**: YES (CAD geometry)
- **Has CNC program**: YES (post-processed output)
- **Material**: Various
- **Format**: PDF tutorial

### 2.8 G-W Publisher Lathe Contour Programming Sample [SILVER]
- **Source**: Goodheart-Willcox Publisher
- **URL**: https://www.g-w.com/assets/files/pdf/sampchap/9781637767023_Ch19.pdf
- **Machine type**: 2-axis CNC lathe
- **Controller**: Fanuc
- **Part description**: Contour programming with G71 rough turning cycle
- **Complexity**: Medium
- **Has print/drawing**: YES (detailed drawings with dimensions)
- **Has CNC program**: YES (complete programs)
- **Material**: Various
- **Format**: PDF sample chapter

---

## 3. 5-AXIS MILLING

### 3.1 Titans of CNC — 5-Axis Series [GOLD]
- **Source**: Titans of CNC Academy
- **URL**: https://academy.titansofcnc.com/series/mill-5-axis-status
- **Machine type**: 5-axis mill (trunnion style)
- **Controller**: Haas UMC (Fanuc-compatible)
- **Part description**: TITAN-110M through TITAN-117M 5-axis parts. Seven of eight parts machinable from 3.0" diameter rod.
- **Complexity**: Complex to Extreme
- **Has print/drawing**: YES (fully-dimensioned prints with GD&T)
- **Has CNC program**: YES (Fusion 360 CAM)
- **Material**: 6061-T6 Aluminum
- **Format**: PDF prints + Fusion 360 files + video
- **Notes**: Level 4 series. Free account required.

### 3.2 Haas UMC-750 Operator's Manual Supplement [SILVER]
- **Source**: Haas Automation
- **URL**: https://www.haascnc.com/content/dam/haascnc/en/service/manual/supplement/english---umc-operator's-manual-supplement---2020.pdf
- **Machine type**: 5-axis mill (UMC-750)
- **Controller**: Haas NGC
- **Part description**: G234 TCPC examples, 5-axis probing, coordinate rotation
- **Complexity**: Medium to Complex
- **Has print/drawing**: YES (conceptual diagrams)
- **Has CNC program**: YES (sample programs — run in Graphics mode first)
- **Material**: N/A (illustrative)
- **Format**: PDF manual

### 3.3 Siemens SINUMERIK 840D 5-Axis Programming Guide [SILVER]
- **Source**: Siemens AG
- **URL**: https://itscnc.com/pub/media/documents/fadal_manuals/siemansmanuals/Advanced_Programming.pdf
- **Alt URL (Transformations)**: https://cache.industry.siemens.com/dl/files/453/109767453/att_991396/v1/840Dsl_transformations_fct_man_0619_en-US.pdf
- **Machine type**: 5-axis mill
- **Controller**: Siemens SINUMERIK 840D/840Dsl
- **Part description**: TRAORI transformation examples, 5-axis orientation programming, tool vector programming
- **Complexity**: Complex to Extreme
- **Has print/drawing**: YES (diagrams and orientation illustrations)
- **Has CNC program**: YES (TRAORI program examples with A3=, B3=, C3= vectors)
- **Material**: Various
- **Format**: PDF manuals
- **Notes**: Includes both conversational and ISO programming. TRAORI activates 5-axis transformation.

### 3.4 Siemens SINUMERIK 5-Axis Milling Manual [GOLD]
- **Source**: Siemens AG
- **URL**: https://cache.industry.siemens.com/dl/files/454/37335454/att_110322/v1/SIN_WF5_0509_en.pdf
- **Machine type**: 5-axis mill
- **Controller**: Siemens SINUMERIK 840D
- **Part description**: Training manual for 5-axis milling with TRAORI
- **Complexity**: Medium to Complex
- **Has print/drawing**: YES
- **Has CNC program**: YES
- **Material**: Various
- **Format**: PDF training manual

### 3.5 Heidenhain TNC 640 5-Axis Training [SILVER]
- **Source**: Heidenhain
- **URL**: https://training.heidenhain.com/en_US/details/seminare/30039/
- **Reference (PLANE SPATIAL)**: https://www.manualslib.com/manual/1372445/Heidenhain-Tnc-640.html?page=558
- **Machine type**: 5-axis mill
- **Controller**: Heidenhain TNC 640
- **Part description**: PLANE SPATIAL tilted working plane examples, TCPM tool center point management
- **Complexity**: Complex
- **Has print/drawing**: YES (in manuals)
- **Has CNC program**: YES (Heidenhain conversational format: PLANE SPATIAL SPA+45 SPB+0 SPC+90)
- **Material**: Various
- **Format**: PDF manuals + training courses
- **Notes**: Heidenhain uses its own conversational programming language, not standard G-code.

---

## 4. MILL-TURN / MULTITASKING

### 4.1 Mazak Integrex Programming Classbook [GOLD]
- **Source**: Yamazaki Mazak Corporation
- **URL**: https://victoriacaruk.com/Mazak%20Programming%20Class%20Workbook%20ofr%20Integrex%20MKIV%20with%20Matrix%20Control.pdf
- **Machine type**: Mill-turn (Integrex Mk IV)
- **Controller**: Mazatrol Matrix
- **Part description**: Mill-turn exercises with both turning and milling operations
- **Complexity**: Medium to Complex
- **Has print/drawing**: YES (exercise part drawings)
- **Has CNC program**: YES (Mazatrol + EIA/ISO programs)
- **Material**: Various
- **Format**: PDF classbook

### 4.2 Mazak Integrex EIA Programming Manual [GOLD]
- **Source**: Yamazaki Mazak Corporation
- **URL**: https://victoriacaruk.com/Mazak%20EIA%20-%20Programming%20Manula%20for%20Mazatrol%20Matrix.pdf
- **Machine type**: Mill-turn (Integrex)
- **Controller**: Mazatrol Matrix (EIA/ISO mode)
- **Part description**: EIA/ISO programming for mill-turn operations. G-code series T for turning, series M for milling.
- **Complexity**: Medium to Complex
- **Has print/drawing**: YES (reference drawings)
- **Has CNC program**: YES (complete EIA programs)
- **Material**: Various
- **Format**: PDF manual
- **Notes**: M610 activates mill-turn mode, M611 sets milling spindle speed, M612 ends milling mode.

### 4.3 Mazak Mazatrol Matrix Programming Manual (Integrex IV) [GOLD]
- **Source**: Yamazaki Mazak Corporation
- **URL**: https://victoriacaruk.com/Mazak%20Mazatrol%20Programing%20Manual%20for%20Mazatrol%20Matrix.pdf
- **Machine type**: Mill-turn (Integrex IV)
- **Controller**: Mazatrol Matrix
- **Part description**: Full Mazatrol conversational programming reference
- **Complexity**: Medium to Complex
- **Has print/drawing**: YES
- **Has CNC program**: YES (Mazatrol format)
- **Material**: Various
- **Format**: PDF manual

### 4.4 Mastercam Mill-Turn Tutorial [SILVER]
- **Source**: CNC Software, Inc. / colla.lv
- **URL**: http://colla.lv/wp-content/uploads/2018/02/MastercamMill-TurnTutorial.pdf
- **Machine type**: Mill-turn
- **Controller**: Generic (via post processor)
- **Part description**: Mill-turn tutorial part demonstrating combined operations
- **Complexity**: Medium
- **Has print/drawing**: YES (CAD model)
- **Has CNC program**: YES (post-processed)
- **Material**: Various
- **Format**: PDF tutorial

### 4.5 Okuma Multus Programming [BRONZE]
- **Source**: Okuma / CNC Manual
- **URL**: https://cncmanual.com/okuma/okuma-programming/
- **Machine type**: Mill-turn (Multus series)
- **Controller**: Okuma OSP
- **Part description**: Multi-tasking mill-turn programs
- **Complexity**: Medium to Complex
- **Has print/drawing**: Partial
- **Has CNC program**: YES (reference programs)
- **Material**: Various
- **Format**: Web + PDF manuals

---

## 5. STANDARDS-BASED TEST ARTIFACTS

### 5.1 NAS 979 Circle-Diamond-Square Test Part [GOLD]
- **Source**: Aerospace Industries Association (AIA)
- **Standard**: NAS 979 — Uniform Cutting Tests
- **URL (drawing reference)**: https://www.researchgate.net/figure/Standard-drawing-of-NAS-979-part-unit-inch-10_fig3_348174876
- **URL (standard info)**: https://standards.globalspec.com/std/1603751/NAS979
- **Machine type**: 3-axis machining center / 5-axis (cone frustum variant)
- **Controller**: Any
- **Part description**: Square-Circle-Diamond test piece. Outer square, inscribed circle, 45-degree canted diamond, two 5-degree ramp cuts, two taper cuts. Developed in 1966 as the original CNC test part.
- **Complexity**: Medium (3-axis) / Complex (5-axis cone)
- **Has print/drawing**: YES (standardized drawing with dimensions in inches)
- **Has CNC program**: YES (programs can be derived from standardized dimensions)
- **Material**: Aluminum 7075-T6 (per NAS specification)
- **Format**: Standard specification document
- **Notes**: The cone frustum variant tests 5-axis simultaneous capability. Evaluated on CMM post-machining.

### 5.2 ISO 10791-7 Machining Center Test Pieces [BRONZE]
- **Source**: International Organization for Standardization
- **URL**: https://www.iso.org/standard/73814.html
- **Alt URL (preview)**: https://cdn.standards.iteh.ai/samples/73814/f826d5aa833349848d7b675b5144013d/ISO-10791-7-2020.pdf
- **Machine type**: Machining centers (3-axis and 5-axis)
- **Controller**: Any
- **Part description**: Two tests — complex end-mill test piece (circle-diamond-square derivative) and flat surface face milling test. S-shape test piece for 5-axis evaluation.
- **Complexity**: Medium to Complex
- **Has print/drawing**: YES (standardized in ISO document)
- **Has CNC program**: Derivable from standard dimensions
- **Material**: Per specification
- **Format**: ISO standard (purchase required for full document)

### 5.3 NIST SMS Test Bed Technical Data Packages [GOLD]
- **Source**: National Institute of Standards and Technology
- **URL**: https://smstestbed.nist.gov/tdp/d2mi/
- **GitHub**: https://github.com/usnistgov/smstestbed
- **Machine type**: CNC milling, CNC turning
- **Controller**: Fanuc (via Mastercam post)
- **Part description**: Complete manufacturing data packages including CAD (Siemens NX), CAM (Mastercam), G-code programs (ISO 6983), setup sheets, and MTConnect data.
- **Complexity**: Medium
- **Has print/drawing**: YES (CAD models in STEP/NX format)
- **Has CNC program**: YES (ISO 6983 G-code from Mastercam)
- **Material**: Various
- **Format**: STEP, NX, G-code, setup sheets, MTConnect data
- **Notes**: EXCEPTIONAL resource. Complete digital thread from design to machining to inspection. Collaborative effort with NIST, Mastercam, Mitutoyo, and industry partners.

### 5.4 NIST Additive Manufacturing Test Artifact [BRONZE]
- **Source**: NIST
- **URL**: https://www.nist.gov/el/intelligent-systems-division-73500/production-systems-group/nist-additive-manufacturing-test
- **Machine type**: Additive (but design derived from CNC test parts)
- **Controller**: N/A (AM)
- **Part description**: Test artifact with features derived from CNC circle-diamond-square heritage. Includes STL, AMF, STEP files.
- **Complexity**: Medium
- **Has print/drawing**: YES (engineering drawing with GD&T)
- **Has CNC program**: NO (AM-focused, but STEP file usable for CNC CAM)
- **Material**: Various (AM materials)
- **Format**: STL, AMF, STEP, inspection spreadsheet

---

## 6. WIRE EDM

### 6.1 Sodick Wire EDM Programming Example (Helman CNC) [SILVER]
- **Source**: Helman CNC
- **URL**: https://www.helmancnc.com/sodick-wire-cutting-edm-cnc-programming-example/
- **G/M Code ref**: https://www.helmancnc.com/sodick-wire-edm-g-codes-m-codes/
- **Machine type**: Wire EDM
- **Controller**: Sodick Mark 21/Mark 25
- **Part description**: Wire cutting example with G54 coordinate system, G42 wire offset, automatic wire threading
- **Complexity**: Medium
- **Has print/drawing**: YES (part drawing with cut path)
- **Has CNC program**: YES (complete program with T-codes and condition codes)
- **Material**: Various
- **Format**: Web page

### 6.2 Wire EDM Programming Example (Helman CNC — General) [SILVER]
- **Source**: Helman CNC
- **URL**: https://www.helmancnc.com/wire-edm-programming-example/
- **Machine type**: Wire EDM
- **Controller**: Generic (Fanuc/Mitsubishi-style)
- **Part description**: General wire EDM cutting example
- **Complexity**: Medium
- **Has print/drawing**: YES
- **Has CNC program**: YES
- **Material**: Various
- **Format**: Web page

### 6.3 Sodick EDM G-Codes Reference (MIT Fab Lab) [SILVER]
- **Source**: MIT Center for Bits and Atoms
- **URL**: https://fab.cba.mit.edu/content/tools/sodick_edm/gcodes.pdf
- **Machine page**: https://fab.cba.mit.edu/content/tools/sodick_edm/index.html
- **Machine type**: Wire EDM (Sodick SL400G)
- **Controller**: Sodick
- **Part description**: G/T/M code reference with programming structure
- **Complexity**: Reference
- **Has print/drawing**: NO (reference only)
- **Has CNC program**: Partial (code structure reference)
- **Material**: N/A
- **Format**: PDF

### 6.4 Fanuc Robocut Wire EDM [BRONZE]
- **Source**: Fanuc / Practical Machinist forums
- **URL**: https://www.practicalmachinist.com/forum/threads/new-fanuc-robocut-post-example.418233/
- **Machine type**: Wire EDM
- **Controller**: Fanuc 31i-WB
- **Part description**: Forum examples of Robocut programming with post processor output
- **Complexity**: Medium
- **Has print/drawing**: Partial (forum posts)
- **Has CNC program**: YES (post examples)
- **Material**: Various
- **Format**: Forum posts

### 6.5 Mitsubishi Wire EDM Examples [SILVER]
- **Source**: SkillsCommons / Practical Machinist
- **URL**: https://moodle.skillscommons.org/mod/resource/view.php?id=4735
- **Machine type**: Wire EDM (Mitsubishi FA-10S Advanced)
- **Controller**: Mitsubishi
- **Part description**: Wire EDM programming with M20 wire threading, M78 tank fill, G01/G02/G03 cut paths
- **Complexity**: Medium
- **Has print/drawing**: YES (cut path drawings)
- **Has CNC program**: YES (complete programs)
- **Material**: Various
- **Format**: PDF courseware

---

## 7. GRINDING

### 7.1 Studer Grinding Software (StuderWIN / StuderTechnology) [BRONZE]
- **Source**: Fritz Studer AG (United Grinding Group)
- **URL**: https://cdn.studer.com/fileadmin/content_live_2019/www.studer.com/01_pdf/01_brochures/englisch/machine-software-brochure_studer_en.pdf
- **Machine type**: Cylindrical grinding
- **Controller**: Studer (Fanuc-based)
- **Part description**: StuderPictogramming visual programming examples. StuderTechnology auto-generates programs from workpiece dimensions.
- **Complexity**: Medium to Complex
- **Has print/drawing**: YES (workpiece dimension inputs)
- **Has CNC program**: YES (auto-generated from dimensions, Pictogramming format)
- **Material**: Various
- **Format**: PDF brochure + proprietary software
- **Notes**: Programming uses visual "Pictogramming" language. 300+ machine parameters in technology database.

### 7.2 Kellenberger CNC Grinding [BRONZE]
- **Source**: Kellenberger (Hardinge)
- **URL**: https://www.machinetoolsonline.com/doc/kellenberger-kel-vista-cnc-cylindrical-grindi-0001
- **Machine type**: Cylindrical grinding
- **Controller**: Fanuc 31i (Kellenberger 100) / GE Fanuc 21i (Kel-Vista)
- **Part description**: "Kel-Easy" teach programming, Blue Solution touch programming, Red Solution graphic programming
- **Complexity**: Medium
- **Has print/drawing**: Partial
- **Has CNC program**: YES (proprietary format)
- **Material**: Various
- **Format**: Product documentation

### 7.3 Allen-Bradley 9/Series CNC Grinder Manual [SILVER]
- **Source**: Rockwell Automation
- **URL**: https://literature.rockwellautomation.com/idc/groups/literature/documents/um/8520gm-um514_-en-p.pdf
- **Machine type**: CNC grinder
- **Controller**: Allen-Bradley 8520
- **Part description**: Operation and programming manual with examples
- **Complexity**: Medium
- **Has print/drawing**: YES (in manual)
- **Has CNC program**: YES (AB format)
- **Material**: Various
- **Format**: PDF manual

---

## 8. LASER CUTTING

### 8.1 TRUMPF Laser Programming Manual [SILVER]
- **Source**: TRUMPF GmbH
- **URL**: http://www.apasi.net/system/files/9999/2014/P338EN.pdf
- **Machine type**: 2D laser cutting (TC L series)
- **Controller**: TRUMPF (proprietary)
- **Part description**: Programming manual for TC L 2530/3020/3050/4050/6050. Includes TC_LASER_ON/OFF commands, arc cutting (G02), linear cutting (G01).
- **Complexity**: Medium
- **Has print/drawing**: YES (cut path diagrams)
- **Has CNC program**: YES (TRUMPF NC format with TC_LASER commands)
- **Material**: Sheet metal
- **Format**: PDF manual
- **Notes**: Uses proprietary TC_LASER_ON/TC_LASER_OFF commands mixed with standard G-codes.

### 8.2 Bystronic BySoft Programming [BRONZE]
- **Source**: Bystronic AG
- **URL**: https://www.bystronic.com/usa/en-us/sw/bysoft-suite
- **Machine type**: 2D laser cutting
- **Controller**: Bystronic (proprietary)
- **Part description**: BySoft CAD/CAM system — automatic nesting, technology selection, cut path optimization
- **Complexity**: Medium
- **Has print/drawing**: YES (DXF/DWG import)
- **Has CNC program**: YES (auto-generated, proprietary format)
- **Material**: Sheet metal
- **Format**: Software-generated (BySoft 7 / BySoft Suite)
- **Notes**: Programming is primarily software-driven. Limited publicly available program examples.

---

## 9. WATERJET

### 9.1 OMAX IntelliMAX / FlowPath [SILVER]
- **Source**: OMAX Corporation
- **URL (FlowPath guide)**: https://web.mae.ufl.edu/designlab/Advanced%20Manufacturing/AWJ/FlowPATH6_0.pdf
- **Alt URL**: https://omax.com/media-center/tips/abrasive-waterjet-software-matters
- **Machine type**: Abrasive waterjet
- **Controller**: OMAX (IntelliMAX)
- **Part description**: 2D cutting with automatic lead-in/lead-out generation. Sample files included in c:\FlowMaster6.0\examples folder.
- **Complexity**: Simple to Medium
- **Has print/drawing**: YES (DXF import)
- **Has CNC program**: YES (auto-generated, ORD format + sample files)
- **Material**: Various (multi-material capability)
- **Format**: Software + PDF user guide
- **Notes**: OMAX Scripting allows custom programming extensions. Over 2,000 pages of built-in tutorials.

### 9.2 Flow Waterjet FlowPath/FlowNest [SILVER]
- **Source**: Flow International Corporation
- **URL (FlowPath)**: https://web.mae.ufl.edu/designlab/Advanced%20Manufacturing/AWJ/FlowPATH6_0.pdf
- **URL (FlowNest)**: https://web.mae.ufl.edu/designlab/Advanced%20Manufacturing/AWJ/FlowNEST6_0.pdf
- **Machine type**: Abrasive waterjet
- **Controller**: Flow (proprietary)
- **Part description**: 2D waterjet cutting with CAD tools, auto-pathing, nesting
- **Complexity**: Simple to Medium
- **Has print/drawing**: YES (built-in CAD)
- **Has CNC program**: YES (auto-generated)
- **Material**: Various
- **Format**: PDF user guides

---

## 10. TEXTBOOK REFERENCES

### 10.1 Peter Smid — CNC Programming Handbook (3rd Ed.) [TEXTBOOK]
- **Source**: Industrial Press Inc.
- **ISBN**: 978-0-8311-3347-4
- **URL**: https://books.industrialpress.com/9780831133474/cnc-programming-handbook/
- **Machine type**: Mill and Lathe
- **Controller**: Fanuc
- **Part description**: 1000+ illustrations, extensive programming examples for milling and turning. CD-ROM includes interactive PDF example projects and NCPlot simulator.
- **Complexity**: Simple to Extreme
- **Has print/drawing**: YES (detailed part drawings throughout)
- **Has CNC program**: YES (complete programs with explanation)
- **Material**: Various
- **Format**: Hardcover book + CD-ROM
- **Notes**: Industry-standard reference. Used in hundreds of educational institutions worldwide. The most comprehensive single CNC programming reference available.

### 10.2 Krar & Gill — CNC: Technology and Programming [TEXTBOOK]
- **Source**: McGraw-Hill / Industrial Press
- **ISBN**: 978-0-0702-3333-1
- **URL (PDF basics)**: https://www.engr.uvic.ca/~mech410/CAM_references/CNC_Computer_Numerical_Control_Programmig_Basics.pdf
- **Machine type**: Mill and Lathe
- **Controller**: Fanuc-compatible
- **Part description**: Cartesian coordinate system, point-to-point, contouring, interpolation examples. Companion lab manual available.
- **Complexity**: Simple to Medium
- **Has print/drawing**: YES
- **Has CNC program**: YES
- **Material**: Various
- **Format**: Textbook + lab manual
- **Notes**: Classic academic textbook. CNC Simplified lab manual (with Peter Smid) provides hands-on exercises.

### 10.3 G-W Publisher CNC Mill Programming (Sample Chapter) [SILVER]
- **Source**: Goodheart-Willcox Publisher
- **URL**: https://www.g-w.com/assets/files/pdf/sampchap/9798888174418_ch09.pdf
- **Machine type**: Mill
- **Controller**: Fanuc
- **Part description**: Chapter 9 sample — milling programming with drawings
- **Complexity**: Medium
- **Has print/drawing**: YES
- **Has CNC program**: YES
- **Material**: Various
- **Format**: PDF sample chapter

### 10.4 Sandvik Coromant Metal Cutting Technology Handbook [SILVER]
- **Source**: Sandvik Coromant
- **URL**: https://www.sandvik.coromant.com/en-us/knowledge
- **Training URL**: https://www.sandvik.coromant.com/en-us/services/sandvik-coromant-academy/e-learning
- **Machine type**: All (turning, milling, drilling, threading)
- **Controller**: N/A (cutting technology focus, not controller-specific)
- **Part description**: Turning theory, milling methods, drilling parameters, threading. Focus on cutting data and tool selection rather than G-code programming.
- **Complexity**: Medium to Complex (technology depth)
- **Has print/drawing**: YES (application illustrations)
- **Has CNC program**: NO (cutting parameter focus)
- **Material**: Comprehensive material coverage
- **Format**: PDF catalogs + e-learning + web knowledge base
- **Notes**: Excellent for cutting parameter validation but not for G-code verification. Use for feeds/speeds/depth-of-cut validation.

---

## 11. COMPREHENSIVE ONLINE RESOURCES

### 11.1 Haas Learning Resources Portal [GOLD]
- **Source**: Haas Automation
- **URL**: https://www.haascnc.com/myhaas/Haas_Learning_Resources.html
- **Machine type**: Mill, Lathe, UMC (5-axis)
- **Controller**: Haas NGC
- **Part description**: Central hub for all Haas training materials — workbooks, Tip of the Day videos, operator manuals
- **Complexity**: All levels
- **Has print/drawing**: YES (in workbooks)
- **Has CNC program**: YES (in workbooks and manuals)
- **Format**: Web portal with PDF downloads

### 11.2 Haas Tip of the Day Video Series [SILVER]
- **Source**: Haas Automation
- **URL**: https://www.haascnc.com/video/tipoftheday/hzijet0bma4.html
- **Machine type**: Mill and Lathe
- **Controller**: Haas NGC
- **Part description**: Short-form video tutorials on specific G-code topics — tool length offsets, work offsets, canned cycles, macro programming
- **Complexity**: Simple to Complex
- **Has print/drawing**: YES (in-video callouts)
- **Has CNC program**: YES (in-video code examples)
- **Format**: Video (YouTube/Haas website)

### 11.3 Titans of CNC Aerospace Academy [GOLD]
- **Source**: Titans of CNC
- **URL**: https://aerospaceacademy.com/
- **Machine type**: Mill, Lathe, 5-axis, Mill-turn
- **Controller**: Haas/Fanuc
- **Part description**: Actual aerospace components — turbo pump rings (TITAN-512L), fuel chamber inlets (TITAN-509LM), and more. Made from aerospace-grade materials.
- **Complexity**: Complex to Extreme
- **Has print/drawing**: YES (full aerospace-grade prints with GD&T)
- **Has CNC program**: YES (Fusion 360 CAM)
- **Material**: Inconel 625, Ti-6Al-4V, 316L SS, 7075-T6 Al
- **Format**: PDF prints + video + CAD/CAM files
- **Notes**: Premium content. Real flight-hardware designs.

### 11.4 CNC Manual (cncmanual.com) [SILVER]
- **Source**: CNC Manual community
- **URL**: https://cncmanual.com/
- **Machine type**: All types
- **Controller**: Fanuc, Okuma, Mazak, Haas, Siemens, Heidenhain, and more
- **Part description**: Thousands of programming and operator manuals for all major CNC brands
- **Complexity**: All levels
- **Has print/drawing**: Varies by manual
- **Has CNC program**: Varies by manual
- **Format**: PDF downloads

### 11.5 Practical Machinist Forum [BRONZE]
- **Source**: Community forum
- **URL**: https://www.practicalmachinist.com/forum/
- **Machine type**: All types
- **Controller**: All types
- **Part description**: Community-shared programs, troubleshooting, tips. Scattered across thousands of threads.
- **Complexity**: All levels
- **Has print/drawing**: Occasional (user uploads)
- **Has CNC program**: YES (frequent code sharing)
- **Format**: Forum posts
- **Notes**: Largest manufacturing forum on the web. Good for finding obscure machine-specific examples. Search by machine brand + "sample program".

---

## 12. CAM SOFTWARE SAMPLE FILES

### 12.1 Fusion 360 Sample Files [SILVER]
- **Source**: Autodesk
- **URL**: https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/Does-Fusion-360-Write-G-code.html
- **Machine type**: Mill, Lathe, Mill-turn
- **Controller**: Via post processor (Fanuc, Haas, Siemens, etc.)
- **Part description**: Sample CAD/CAM projects with post-processed G-code output
- **Complexity**: Simple to Complex
- **Has print/drawing**: YES (3D models)
- **Has CNC program**: YES (post-processed G-code)
- **Format**: F3D files + NC output

### 12.2 Stepcraft Sample Files (Fusion 360 + Vectric) [SILVER]
- **Source**: Stepcraft Inc.
- **URL**: https://stepcraft.us/samplefile/
- **Machine type**: Mill/Router
- **Controller**: GRBL/Mach3
- **Part description**: Logo cutting, 2.5D parts
- **Complexity**: Simple
- **Has print/drawing**: YES (DXF files)
- **Has CNC program**: YES (G-code files)
- **Format**: DXF + NC files

### 12.3 Mastercam Tech Exchange [SILVER]
- **Source**: CNC Software, Inc.
- **URL**: https://community.mastercam.com/techexchange
- **Machine type**: Mill, Lathe, Mill-turn, Router
- **Controller**: Via post processor
- **Part description**: Community-shared sample files, tool libraries, post processors
- **Complexity**: All levels
- **Has print/drawing**: YES (MCX files with geometry)
- **Has CNC program**: YES (via post processing)
- **Format**: MCX/MCAM files

---

## PRIORITY ACQUISITION LIST

Ranked by validation value for PRISM:

| Priority | Source | Type | Why |
|----------|--------|------|-----|
| 1 | Haas Mill Workbook | Mill | Complete programs + prints, Fanuc-compatible, free PDF |
| 2 | Haas Lathe Workbook | Lathe | Complete programs + prints, Fanuc-compatible, free PDF |
| 3 | Titans of CNC Building Blocks | Mill/5-axis | Full GD&T prints + Fusion CAM, progressive complexity |
| 4 | NIST SMS Test Bed TDPs | Mill/Lathe | Complete digital thread: CAD→CAM→G-code→inspection |
| 5 | NAS 979 Test Part | Mill/5-axis | Aerospace industry standard, well-defined geometry |
| 6 | Mazak Integrex Classbook | Mill-turn | Complete mill-turn programs with drawings |
| 7 | Siemens 840D 5-Axis Manual | 5-axis | TRAORI examples for Siemens controller validation |
| 8 | Fagor 8055 Examples Manual | Mill | Non-Fanuc controller validation |
| 9 | Helman CNC Examples | Mill/Lathe | Fanuc examples with drawings, free web access |
| 10 | Sodick Wire EDM Example | Wire EDM | Complete wire EDM program with cut path |
| 11 | TRUMPF Laser Manual | Laser | TC_LASER command format documentation |
| 12 | Smid CNC Handbook | All | 1000+ illustrations, industry-standard reference |

---

## NOTES

### Already Acquired
- `haas-lathe-workbook-full.txt` — Haas Lathe Programming Workbook (already in PRISM)

### Access Requirements
- **Titans of CNC**: Free account registration required at academy.titansofcnc.com
- **ISO 10791**: Purchase required from ISO or ANSI webstore
- **NAS 979**: Purchase required from AIA or engineer standards stores
- **NIST SMS Test Bed**: Freely accessible at smstestbed.nist.gov
- **Haas Workbooks**: Freely downloadable from haascnc.com
- **Mazak Manuals**: Hosted on third-party site (victoriacaruk.com)

### Controller Coverage Matrix

| Controller | Sources Available |
|------------|------------------|
| Fanuc | Haas, Helman, CNC Cookbook, Smid, G-W, CIMCO, NIST |
| Haas NGC | Haas Workbooks, Tip of the Day, UMC Manual |
| Siemens 840D | Siemens Manuals, TRAORI guides |
| Heidenhain | TNC 640 manuals, PLANE SPATIAL reference |
| Mazatrol | Mazak Integrex manuals (EIA + conversational) |
| Okuma OSP | Okuma manuals, Practical Machinist examples |
| Fagor | Fagor 8055 examples manual |
| Sodick | Helman CNC, MIT Fab Lab reference |
| Mitsubishi (EDM) | SkillsCommons courseware |
| TRUMPF | TC L programming manual |
| OMAX | FlowPath user guide, scripting reference |
