---
type: "chat-session"
source: "claude-code-cli"
session_id: "0f3a0c22-434c-4b12-9967-54ebbcb52788"
title: "Very thorough read-only census. The operator says \"check the resources folder, t"
date: "2026-05-29"
first_ts: "2026-05-29T19:15:46.031Z"
last_ts: "2026-05-29T19:41:16.538Z"
cwd: "H:\\prism-slot-foxtrot"
messages: 101
user_msgs: 36
assistant_msgs: 65
raw_file: "H:/.claude/projects/H--prism-slot-foxtrot/0f3a0c22-434c-4b12-9967-54ebbcb52788/subagents/agent-a0d8523979658cb90.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:44"
---

# Very thorough read-only census. The operator says "check the resources folder, t

> **claude-code-cli** | 2026-05-29 | 101 msgs (36 user / 65 assistant) | cwd: H:\prism-slot-foxtrot
> Raw: `H:/.claude/projects/H--prism-slot-foxtrot/0f3a0c22-434c-4b12-9967-54ebbcb52788/subagents/agent-a0d8523979658cb90.jsonl`

## Transcript

### User | 2026-05-29T19:15:46.031Z

Very thorough read-only census. The operator says "check the resources folder, there should be a bunch of tooling catalogs on there." The canonical resources folder is `H:/prism/resources` (163,906 files). Enumerate it and report TOOLING CATALOGS with hard counts — do NOT sample-and-extrapolate; count.

DO:
1. `ls H:/prism/resources` and map the top-level directory structure (depth 1-2) with per-dir file counts. Use `find H:/prism/resources -maxdepth 2 -type d` + `find <dir> -type f | wc -l` style counts.
2. Identify TOOLING / CUTTING-TOOL catalogs specifically (mill tools, end mills, drills, inserts, toolholders). Search by vendor name AND by content keywords. Known cutting-tool vendors to check for: Sandvik, Seco, Kennametal, Iscar, Walter, Mitsubishi, Tungaloy, Kyocera, OSG, Guhring, Harvey Tool, Helical, Niagara, SGS, Emuge, Ingersoll, Dormer, Pramet, Widia, Sumitomo, Horn, YG-1, Garr, Fullerton, Destiny, Hoffmann, Big Daishowa, Haimer, Rego-Fix, Schunk, Lyndex, Techniks. For each vendor present: file count + formats (PDF/CSV/JSON/xlsx) + a representative path.
3. Note file FORMATS overall: how many PDFs vs structured data (CSV/JSON/xlsx) — structured = machine-ingestable catalogs; PDF = needs extraction.
4. Flag any MATERIAL / HARDNESS data files you encounter in resources (material grades, hardness charts, Kienzle/cutting-data tables) — list paths.
5. Note any speed/feed data, post-processor, or machine-spec catalogs as a secondary finding (these matter to sibling domains lathe/wedm/cam/oscar/echo).

REPORT (structured, counts not prose):
- Total files + top-level dir breakdown with counts.
- Tooling-catalog inventory: per-vendor file count + format + sample path.
- Format split (PDF vs structured).
- Material/hardness data files found (paths).
- Secondary catalogs (speed-feed / post / machine) with paths.
Return the conclusion only — counts + paths, NOT file contents.

### Assistant | 2026-05-29T19:15:56.230Z

I'll conduct a thorough census of the resources folder to enumerate tooling catalogs and related materials. Let me start with the directory structure and file counting.

### Assistant | 2026-05-29T19:15:56.232Z

[tool_use: Bash]

### User | 2026-05-29T19:16:13.328Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: extglob.Name: command not found
/usr/bin/bash: line 1: ForEach-Object: command not found

### Assistant | 2026-05-29T19:16:15.370Z

Let me use the correct shell for this Windows environment.

### Assistant | 2026-05-29T19:16:15.528Z

[tool_use: PowerShell]

### User | 2026-05-29T19:16:24.046Z

[tool_result] [32;1mName[0m
[32;1m----[0m
1- Basic Training Day 1
2- Basic Training Day 2
3- Basic Training Day 3
CAD FILES
cam-acquired-2026-05-27
DWG TrueView 2027 - English
excel_extract
Freecad
FUSION 360 PROGRAMS
FUSION BASIC POSTS
FUSION POSTS
fusion-addin
FUSION360
GENERIC MACHINE MODELS
GENERIC_MACHINE_MODELS
HSMWorks 2026
HSMWorks 2027
HYPERMILL
Inventor
Inventor 2027
inventor
... [+568 chars truncated]

### Assistant | 2026-05-29T19:16:27.752Z

Good, I can see the structure. Let me now drill into the most relevant folders for tooling catalogs: `MANUFACTURER_CATALOGS`, `WORKHOLDING AND FIXTURE CATALOGS`, and others. I'll count files in each top-level directory first.

### Assistant | 2026-05-29T19:16:29.140Z

[tool_use: PowerShell]

### User | 2026-05-29T19:16:39.752Z

[tool_result] 1- Basic Training Day 1: 17 files
2- Basic Training Day 2: 1579 files
3- Basic Training Day 3: 11 files
CAD FILES: 40 files
cam-acquired-2026-05-27: 0 files
DWG TrueView 2027 - English: 1571 files
excel_extract: 35 files
Freecad: 30348 files
FUSION 360 PROGRAMS: 0 files
FUSION BASIC POSTS: 180 files
FUSION POSTS: 0 files
fusion-addin: 7 files
FUSION360: 275 files
GENERIC MACHINE MODEL
... [+1013 chars truncated]

### Assistant | 2026-05-29T19:16:43.200Z

Now let me dive into the key folders for tooling catalogs: `MANUFACTURER_CATALOGS`, `WORKHOLDING AND FIXTURE CATALOGS`, and check `RESOURCE PDFS` for tool/material data.

### Assistant | 2026-05-29T19:16:44.729Z

[tool_use: PowerShell]

### User | 2026-05-29T19:17:14.049Z

[tool_result] === MANUFACTURER_CATALOGS ===
  .pdf: 46 files
  .078: 1 files
  .077: 1 files
  .076: 1 files
  .075: 1 files
  .074: 1 files
  .073: 1 files
  .072: 1 files
  .079: 1 files
  .071: 1 files
  .069: 1 files
  .068: 1 files
  .067: 1 files
  .066: 1 files
  .065: 1 files
  .064: 1 files
  .063: 1 files
  .070: 1 files
  .062: 1 files
  .080: 1 files
  .082: 1 files
  .098: 1 f
... [+993 chars truncated]

### Assistant | 2026-05-29T19:17:20.749Z

The detailed listing output was cut off. Let me get the file names directly.

### Assistant | 2026-05-29T19:17:20.765Z

[tool_use: Bash]

### User | 2026-05-29T19:21:17.907Z

[tool_result] uploaded/

### Assistant | 2026-05-29T19:21:21.707Z

Let me use PowerShell to get the actual file names in MANUFACTURER_CATALOGS:

### Assistant | 2026-05-29T19:21:21.709Z

[tool_use: PowerShell]

### User | 2026-05-29T19:22:01.633Z

[tool_result] === MANUFACTURER_CATALOGS FILES ===

### Assistant | 2026-05-29T19:22:04.462Z

The immediate directory is empty. Let me check subdirectories:

### Assistant | 2026-05-29T19:22:04.806Z

[tool_use: PowerShell]

### User | 2026-05-29T19:22:34.471Z

[tool_result] === MANUFACTURER_CATALOGS subdirectories ===

    Directory: H:\PRISM\resources\MANUFACTURER_CATALOGS

[32;1mMode   [0m[32;1m              LastWriteTime[0m [32;1;3m        Length[0m[32;1m Name[0m
[32;1m----   [0m [32;1m             -------------[0m [32;1m        ------[0m [32;1m----[0m
d----           5/26/2026  1:52 PM                [44;1muploaded[0m

### Assistant | 2026-05-29T19:22:36.264Z

Now let's check the uploaded subdirectory:

### Assistant | 2026-05-29T19:22:38.293Z

[tool_use: PowerShell]

### User | 2026-05-29T19:23:00.914Z

[tool_result] === FILES IN MANUFACTURER_CATALOGS/uploaded ===

[32;1mName                                                      [0m[32;1m Ext[0m
[32;1m----                                                      [0m [32;1m---[0m
YU25_America.zip.001                                       .001
YU25_America.zip.002                                       .002
YU25_America.zip.003                           
... [+7361 chars truncated]

### Assistant | 2026-05-29T19:23:03.409Z

Excellent! Now let me check the WORKHOLDING AND FIXTURE CATALOGS folder:

### Assistant | 2026-05-29T19:23:04.204Z

[tool_use: PowerShell]

### User | 2026-05-29T19:23:30.399Z

[tool_result] === WORKHOLDING AND FIXTURE CATALOGS ===

### Assistant | 2026-05-29T19:23:33.001Z

Let me check subdirectories in WORKHOLDING:

### Assistant | 2026-05-29T19:23:33.146Z

[tool_use: PowerShell]

### User | 2026-05-29T19:15:46.031Z

Very thorough read-only census. The operator says "check the resources folder, there should be a bunch of tooling catalogs on there." The canonical resources folder is `H:/prism/resources` (163,906 files). Enumerate it and report TOOLING CATALOGS with hard counts — do NOT sample-and-extrapolate; count.

DO:
1. `ls H:/prism/resources` and map the top-level directory structure (depth 1-2) with per-dir file counts. Use `find H:/prism/resources -maxdepth 2 -type d` + `find <dir> -type f | wc -l` style counts.
2. Identify TOOLING / CUTTING-TOOL catalogs specifically (mill tools, end mills, drills, inserts, toolholders). Search by vendor name AND by content keywords. Known cutting-tool vendors to check for: Sandvik, Seco, Kennametal, Iscar, Walter, Mitsubishi, Tungaloy, Kyocera, OSG, Guhring, Harvey Tool, Helical, Niagara, SGS, Emuge, Ingersoll, Dormer, Pramet, Widia, Sumitomo, Horn, YG-1, Garr, Fullerton, Destiny, Hoffmann, Big Daishowa, Haimer, Rego-Fix, Schunk, Lyndex, Techniks. For each vendor present: file count + formats (PDF/CSV/JSON/xlsx) + a representative path.
3. Note file FORMATS overall: how many PDFs vs structured data (CSV/JSON/xlsx) — structured = machine-ingestable catalogs; PDF = needs extraction.
4. Flag any MATERIAL / HARDNESS data files you encounter in resources (material grades, hardness charts, Kienzle/cutting-data tables) — list paths.
5. Note any speed/feed data, post-processor, or machine-spec catalogs as a secondary finding (these matter to sibling domains lathe/wedm/cam/oscar/echo).

REPORT (structured, counts not prose):
- Total files + top-level dir breakdown with counts.
- Tooling-catalog inventory: per-vendor file count + format + sample path.
- Format split (PDF vs structured).
- Material/hardness data files found (paths).
- Secondary catalogs (speed-feed / post / machine) with paths.
Return the conclusion only — counts + paths, NOT file contents.

### Assistant | 2026-05-29T19:24:38.014Z

I'll conduct a thorough census of the resources folder, focusing on tooling catalogs and related data. Let me start by mapping the directory structure and counting files.

### Assistant | 2026-05-29T19:24:38.129Z

[tool_use: Bash]

### User | 2026-05-29T19:28:04.897Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect

### Assistant | 2026-05-29T19:28:07.760Z

Let me use PowerShell instead for better compatibility on Windows:

### Assistant | 2026-05-29T19:28:08.298Z

[tool_use: PowerShell]

### User | 2026-05-29T19:28:37.342Z

[tool_result] Exit code 1
[31;1mhead: [31;1mThe term 'head' is not recognized as a name of a cmdlet, function, script file, or executable program.[0m
[31;1m[31;1mCheck the spelling of the name, or if a path was included, verify that the path is correct and try again.[0m

### Assistant | 2026-05-29T19:28:41.085Z

[tool_use: PowerShell]

### User | 2026-05-29T19:29:19.733Z

[tool_result] [32;1mName                                                            [0m[32;1m Type[0m
[32;1m----                                                            [0m [32;1m----[0m
1- Basic Training Day 1                                          DIR
2- Basic Training Day 2                                          DIR
3- Basic Training Day 3                                          DIR
CAD 
... [+3998 chars truncated]

### Assistant | 2026-05-29T19:29:21.541Z

Now let me count total files and get a deeper structure analysis, focusing on tooling catalogs:

### system

... [21 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-29T19:35:32.769Z

[tool_use: PowerShell]

### User | 2026-05-29T19:36:12.135Z

[tool_result] WORKHOLDING AND FIXTURE CATALOGS:
Total files: 36
PDFs: 21
CSVs: 0
JSONs: 0
XLSX: 0
Others: 15

### Assistant | 2026-05-29T19:36:14.802Z

[tool_use: PowerShell]

### User | 2026-05-29T19:36:19.893Z

[tool_result] [32;1mName[0m
[32;1m----[0m
2022-Summer-5th-Axis-Catalog.pdf
Bison-Live-Dead-Centers-2022.pdf
Bison-Manual-Chucks-2022.pdf
Bison-Power-Chucks-2022.pdf
Bison-Toolholders-2022.pdf
Chapter-3-Stationary-Workholding-2022.pdf
JERGENS-1.pdf
JERGENS-2.pdf
JERGENS-3.pdf
JERGENS.pdf
KITAGAWA.pdf
Kurt_US_Catalog_2022-1.pdf
Kurt_US_Catalog_2022-2.pdf
Kurt_US_Catalog_2022-3.pdf
LANG.pdf
LI
... [+121 chars truncated]

### Assistant | 2026-05-29T19:36:26.492Z

[tool_use: PowerShell]

### User | 2026-05-29T19:36:37.184Z

[tool_result] TOOL_HOLDER_CAD_FILES:
Total files: 25
DXF: 0
STEP: 0
STP: 25
DWG: 0
IGES: 0
PDFs: 0

### Assistant | 2026-05-29T19:36:41.167Z

[tool_use: PowerShell]

### User | 2026-05-29T19:36:50.038Z

[tool_result] RESOURCE PDFS:
Total files: 2929
PDFs: 513
Others: 2416

Sample files:

[32;1mName[0m
[32;1m----[0m
1.124j-fall-2000.zip
1.204-spring-2010.zip
15.773-spring-2024.zip
16.355j-fall-2005.zip
18.03-spring-2010.zip
18.409-spring-2002.zip
18.409-spring-2015.zip
2.008-spring-2004.zip
2.830j-spring-2008.zip
3.012-fall-2005.zip
6.005-fall-2008.zip
6.006-spring-2020.zip
6.046j-spring
... [+493 chars truncated]

### Assistant | 2026-05-29T19:36:56.504Z

[tool_use: PowerShell]

### User | 2026-05-29T19:37:14.892Z

[tool_result] POSTS AND MACHINES:
Total files: 3057
Post processors (.cps/.pst): 0
PDFs: 7
Machine files (.xml/.json): 0
Others: 3050

Sample post processors:

### Assistant | 2026-05-29T19:37:19.676Z

[tool_use: PowerShell]

### User | 2026-05-29T19:37:26.613Z

[tool_result] File types in POSTS AND MACHINES:

[32;1mName [0m[32;1m Count[0m
[32;1m---- [0m [32;1m-----[0m
.cyc   2877
.txt    105
.def     43
.xlsx     9
.pdf      7
.oma      4
.FNC      3
.cfg      2
.stp      2
.bin      1
.IGS      1
.mmb      1
.STEP     1
.xls      1

### Assistant | 2026-05-29T19:37:28.939Z

Now let me search for material/hardness data and cutting data tables:

### Assistant | 2026-05-29T19:37:30.090Z

[tool_use: Grep]

### User | 2026-05-29T19:37:54.375Z

[tool_result] No files found

### Assistant | 2026-05-29T19:37:56.021Z

Let me search more broadly for material data:

### Assistant | 2026-05-29T19:37:56.147Z

[tool_use: Glob]

### User | 2026-05-29T19:38:34.646Z

[tool_result] H:/prism/resources\MasterCam\MASTERCAM\mcamX8\compressed\common\compressed\catiadata\NT_VC11_64_DLL\resources\msgcatalog\DbcsTest\mia_phen_material.CATNls
H:/prism/resources\MasterCam\MASTERCAM\mcamX8\compressed\common\compressed\catiadata\NT_VC11_64_DLL\resources\msgcatalog\mia_phen_material.CATNls
H:/prism/resources\MasterCam\MASTERCAM\mcamX8\compressed\common\compressed\catiadata\NT_VC11_64_DLL
... [+9430 chars truncated]

### Assistant | 2026-05-29T19:38:37.321Z

Let me narrow down and check the OPEN MIND tool database which likely has material data:

### Assistant | 2026-05-29T19:38:39.020Z

[tool_use: PowerShell]

### User | 2026-05-29T19:39:01.073Z

[tool_result] OPEN MIND Tool Database (31.0) file types:

[32;1mName [0m[32;1m Count[0m
[32;1m---- [0m [32;1m-----[0m
.loc     81
.png     71
.svg     28
.db      18
.qm      16
.bmp      9
.exe      6
.dll      4
.sql      3
.xml      3
.mdb      2
.cfg      1
.tlb      1
.tms      1
.xslt     1


Total files: 245

Database files (.db): 18
H:\PRISM\resources\OPEN MIND\Tool Databas
... [+1383 chars truncated]

### Assistant | 2026-05-29T19:39:03.280Z

Good! Now let me check for speed/feed and machining data in MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS:

### Assistant | 2026-05-29T19:39:03.819Z

[tool_use: PowerShell]

### User | 2026-05-29T19:39:15.404Z

[tool_result] MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS:
Total files: 3

[32;1mName                                   [0m[32;1m FullName[0m
[32;1m----                                   [0m [32;1m--------[0m
PRISM_ADVANCED_CROSS_DOMAIN_v1.js       H:\PRISM\resources\MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS\PRISM_ADVANCED_CROSS_DOMAIN_v1.js
PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js H:\PRISM\resou
... [+222 chars truncated]

### Assistant | 2026-05-29T19:39:17.567Z

Now let me get a complete breakdown by counting all structured data files (CSV, JSON, XLSX) across the whole resources folder:

### Assistant | 2026-05-29T19:39:19.324Z

[tool_use: PowerShell]

### User | 2026-05-29T19:39:42.478Z

[tool_result] OVERALL FORMAT SUMMARY (H:/prism/resources):
============================================
PDFs: 947
CSV: 124
JSON: 1469
XLSX: 186
XLS: 44
---
Structured data (CSV+JSON+XLSX+XLS): 1823
Total files indexed: 163,906

### Assistant | 2026-05-29T19:39:44.331Z

Perfect. Now let me compile the vendor breakdown for MANUFACTURER_CATALOGS with clear vendor attribution:

### Assistant | 2026-05-29T19:39:53.980Z

[tool_use: PowerShell]

### User | 2026-05-29T19:40:08.106Z

[tool_result] TOOLING CATALOG VENDOR INVENTORY:
==================================
Accupro	: 1 PDF(s)
	  - Accupro 2013.pdf
Big Daishowa	: 1 PDF(s)
	  - BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf
Emuge	: 1 PDF(s)
	  - ZK12023_DEGB RevA EMUGE Katalog 160.pdf
Flash	: 1 PDF(s)
	  - Flash_Solid_catalog_INCH.pdf
Ford	: 1 PDF(s)
	  - MA_Ford_US_Product_Catalog_vol105interactiveweb.pdf
Guhri
... [+1646 chars truncated]

### Assistant | 2026-05-29T19:40:11.851Z

Now let me get the exact paths for all workholding vendors:

### Assistant | 2026-05-29T19:40:13.416Z

[tool_use: PowerShell]

### User | 2026-05-29T19:40:33.181Z

[tool_result] WORKHOLDING CATALOG VENDORS (21 PDFs):
========================================
2022-Summer-5th-Axis-Catalog.pdf
  Path: H:\PRISM\resources\WORKHOLDING AND FIXTURE CATALOGS\5th AXIS\2022-Summer-5th-Axis-Catalog.pdf
Bison-Live-Dead-Centers-2022.pdf
  Path: H:\PRISM\resources\WORKHOLDING AND FIXTURE CATALOGS\BISON\Bison-Live-Dead-Centers-2022.pdf
Bison-Manual-Chucks-2022.pdf
  Path: H:\PRISM\
... [+2083 chars truncated]

### Assistant | 2026-05-29T19:40:35.493Z

Perfect. Now let me create a final summary by checking secondary data (machine specs, speed/feed, posts):

### Assistant | 2026-05-29T19:40:38.155Z

[tool_use: PowerShell]

### User | 2026-05-29T19:40:45.331Z

[tool_result] POSTS AND MACHINES - Subdirectories:
5-Axis-Post-Package_Cope_2015: 7 files
Haas_VF-2__H-VF_R12c_E19: 731 files
Hurco_VMX_30 i__Max_R02g_E07: 726 files
Okuma_Genos_M460V-5AX__OSP_R01w_E03: 938 files
Roku-Roku_HC-658__F_R10b_E20: 652 files
zip files: 0 files

Sample .CYC files (Okuma macro programs):

[32;1mName[0m
[32;1m----[0m
file_end_probing.cyc
MeasureAdjustCircleIn.cyc
Measur
... [+176 chars truncated]

### Assistant | 2026-05-29T19:40:47.615Z

Excellent. Let me do one more check for machine models and simulation data:

### Assistant | 2026-05-29T19:40:48.874Z

[tool_use: PowerShell]

### User | 2026-05-29T19:40:57.005Z

[tool_result] H:/prism/resources/GENERIC MACHINE MODELS: 34 files
  .step: 34
H:/prism/resources/MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION: 272 files
  .step: 234
  .zip: 37
  .mch: 1

### Assistant | 2026-05-29T19:41:16.538Z

Perfect. Now let me generate the final report:

## RESOURCES CENSUS REPORT - H:/PRISM/RESOURCES

### TOTALS & DIRECTORY BREAKDOWN
- **Total Files**: 163,906
- **Top-Level Directories** (by file count):
  - OPEN MIND: 54,100
  - Freecad: 30,348
  - MasterCam: 29,280
  - HYPERMILL: 18,846
  - SOLIDWORKS: 14,429
  - Inventor 2027: 3,243
  - POSTS AND MACHINES: 3,057
  - RESOURCE PDFS: 2,929

---

### TOOLING CATALOGS INVENTORY

**MANUFACTURER_CATALOGS (46 PDFs + 78 ZIP archive fragments)**
Path: `H:/prism/resources/MANUFACTURER_CATALOGS/uploaded`

**Vendors Present (counted):**
- Sandvik (Coromant): **10 PDFs** — GC 2023-2024 series (Drilling, Milling, Tooling, Turning-Grooving) in Global & US variants + 2018 Master Catalogs
- Guhring: **2 PDFs** — Full catalog + Tool holders
- Ingersoll: **2 PDFs** — Insert master + Turning catalog
- Korloy: **2 PDFs** — Solid + Turning
- Sumitomo: **2 PDFs** — AC5000S + AC8000P
- Tungaloy: **2 PDFs** — AH725 + Grade 2023
- Accupro: **1 PDF**
- Big Daishowa: **1 PDF**
- Emuge: **1 PDF**
- Flash: **1 PDF**
- Ford: **1 PDF**
- Iscar: **1 PDF** — Grade chart (material hardness data)
- OSG: **1 PDF**
- Rapidkut: **1 PDF**
- Rego-Fix: **1 PDF** — 2026 catalog
- SGS: **1 PDF**
- Walter: **1 PDF**
- Yalishanda/YU: **1 PDF**
- Zeni: **1 PDF**

**Generic/Multi-Vendor Catalogs (12 PDFs):**
- 01-Global-CNC-Full-Catalog-2023
- AMPC_US-EN
- CAMFIX_Catalog
- catalog_c010b_full
- Milling 2018.1
- Solid End Mills
- Threading 2018.1
- Tooling Systems (2 versions)
- Turning 2018.1 + TURNING_CATALOG_PART 1
- Metalmorphosis-2021

---

### WORKHOLDING & FIXTURE CATALOGS
Path: `H:/prism/resources/WORKHOLDING AND FIXTURE CATALOGS`
- **Total**: 36 files (21 PDFs + 15 others)

**Vendors:**
- Bison: 6 PDFs — (Live-Dead Centers, Manual Chucks, Power Chucks, Toolholders, Workholding)
- Kurt: 3 PDFs — US Catalog 2022 (3-part)
- Jergens: 4 PDFs
- Schunk: 3 PDFs — (2 full catalogs + 1 variant)
- Kitagawa: 1 PDF
- Lang: 1 PDF
- Mate Precision Technologies: 1 PDF
- R
... [+2439 chars truncated]
