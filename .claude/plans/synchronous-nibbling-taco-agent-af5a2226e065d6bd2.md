# HyperMILL Extraction Audit — Data Engineer Assessment
## Date: 2026-04-03

## Confirmed Source Files at H:/prism/HYPERMILL/

### Databases Available (both v31 and v33):
- Tool Database/{version}/databases/materials.db — 2544 Materials, 48 Subgroups, 134 Qualities, 29 ChippingClasses
- Tool Database/{version}/databases/demo/english/demo.db — 547 Tools, 486 NCTools, 2706 Technologies, 2491 CuttingProfiles, 65 Holders
- Tool Database/{version}/databases/InternalTDB.db — (not yet audited)
- hyperMILL/{version}/AddIns/.../INTELLIGENT_MACRO/IM_Macro_DB.db — 7 Macros, 8 Jobs
- hyperMILL/{version}/AddIns/.../INTELLIGENT_MACRO/IM_Tool_DB.db — 282 Tools, 1211 Tech, 5893 CuttingProfiles, 155 Holders
- hyperMILL/{version}/AddIns/.../INTELLIGENT_MACRO/IM_Tool_DB_V2023.1.db — IDENTICAL to v1 (same row counts)
- hyperMILL/{version}/AddIns/.../OPEN MIND/Automation_Center_Standard_ToolDB.db — 110 Tools, 297 Tech, 21 Holders
- hyperMILL/{version}/AddIns/.../OPEN MIND/Automation_Center_Standard_MacroDB.db — 4 Macros, 39 Jobs
- resources/Training Tools.db — (not yet audited)

### Key Finding: IM_Tool_DB vs IM_Tool_DB_V2023.1
Identical row counts (282 tools, 1211 tech, 5893 CuttingProfiles, 155 Holders).
V2023.1 has a DocNCTools table (not in v1) and slightly different Couplings (318 vs 396).
Current extraction (hypermill-speed-feed-catalog.ts) was from "default2022.2.db" at
C:/Users/Public/Documents/OPEN MIND/tooldb/ — this is a USER DB, NOT the installed IM_Tool_DB_V2023.1!

### omPP XML Files
- 172 total across v31 and v33
- ALL are binary/compressed (not text XML) — confirmed via hex header 93f01276
- Current extraction: 16 named configs via filename inference only
- Post-config data is NOT decoded — just named

### Feature2Job Catalogs (v33):
- omFeature2JobCatalog.xml: 552 mappings, 15 groups, 13 feature types
- omFeature2JobCatalog_Drill.xml: 116 mappings
- omFeature2JobCatalog_Tire.xml: 126 mappings
- omFeature2JobCatalog_UDF.xml: 133 mappings
- omFeature2JobCatalog_Blade.xml, Impeller.xml, Turn.xml — smaller
- NONE of these are extracted

### Training Manual full_text.txt:
- 4 files totaling 986KB at H:/prism/cad-engine/output/hypermill-en-{1-4}/
- Only partially mined into hypermill-cam-tips-ext.ts (43 tips, 1402 lines)
- Additional knowledge.json files in hypermill-manual-en-{1-4} directories

## Score Assessment

### 1. Material Data Completeness: 82/100
- 2544 materials extracted: YES, count correct
- Hardness (HB, HV, HRC): YES
- Tensile strength (rm_min/max): YES
- All milling/drilling/insert factors: YES
- Trademarks (1-4): YES (1450/2544 have them)
- DIN EN name: MISSING — 70 have it in DB, not in JSON
- CSN designation: MISSING — 414 records have it in DB, not exported
- SS (Swedish standard): MISSING — 228 records have it in DB
- GOST: MISSING — 254 records partially extracted (field exists but labeled 'gost' only in some)
- Cost: -18 points (4 missing designation standards that are present in source)

### 2. Tool/Cutting Tech Data: 12/100
- Current cutting-tech source: "default2022.2.db" from user profile (NOT from installation)
  Only 40 tools, 510 technologies, 589 cutting profiles — from a thin custom DB
- demo.db has 547 tools, 486 NCTools, 2706 Technologies, 2491 CuttingProfiles — NOT extracted
- IM_Tool_DB has 282 tools, 1371 NCTools, 1211 Technologies, 5893 CuttingProfiles — source confirmed but...
  the current hypermill-speed-feed-catalog.ts is from default2022.2.db at user profile, NOT IM_Tool_DB_V2023.1
- IM_Tool_DB NCTools (1371) vs demo.db NCTools (486): IM is the richer manufacturer dataset
- hypermill-tools.json has 587 tools: 547 from demo_english_33.0 + 40 from default2022.2
  BUT the tools are listed without holder_id data (no holder field populated)
- Technologies in hypermill-tools.json: present via embedded array in each tool (good)
- CuttingProfiles (2491 in demo.db): NOT separately extracted as optimization data
- Holders (65 in demo.db): recorded in JSON but no 'holder' field exists in hypermill-tools.json
- NCTools assembly data (tool_length, holder_reach, usable_length): NOT extracted
- Score: 12 because demo tools are captured but cutting profiles/NC assembly data missing,
  and the source for speed-feed is wrong db

### 3. Macro/Feature Data: 15/100
- IM_Macro_DB.db: 7 macro types (HOLE, SINK1-3, BACKSINK1-3) — NOT extracted
  FSGTCode contains rich parameter strings like "Catalog#openmind|Type#Generic_Hole|SNUM#3|..."
  These define automated drilling feature recognition
- AC Standard MacroDB: 4 macros, 39 jobs — NOT extracted
- Feature2Job catalogs: 960+ total mappings across 11 XML files — NOT extracted
  omFeature2JobCatalog.xml alone has 552 mappings covering 13 feature types
- Job_Parameter table: blob-encoded (carriage-return separated) parameter lists — not yet parsed
- Score: 15 (some macro type names known from Agent 7 audit, but nothing actually extracted)

### 4. Holder Geometry Data: 8/100
- demo.db: 65 holders with geometry — NOT extracted to separate catalog
- IM_Tool_DB: 155 holders — NOT extracted
- AC_ToolDB: 21 holders — NOT extracted
- Geometries table: binary polyline data (blob) representing 2D revolution profiles for collision
- Holders table: has name, coupling type, spindle_speed_factor, feedrate_factor, max_spindle_speed
  This metadata IS accessible but NOT extracted
- hypermill-tools.json 'holder' field: completely absent (0 tools have holder data)
- NCTools in demo.db links holder_id + holder_geometry_id — NOT extracted
- Score: 8 (holder names known from DB inspection but no catalog created)

### 5. Post-Processor Config Data: 18/100
- 172 omPP*.xml files across v31 and v33 — ALL BINARY (not text XML)
- Binary format: custom compressed/encrypted binary, not standard ZIP/zlib
- Current extraction: 16 configs inferred from filenames only (naming conventions)
- Full v33 set has ~86 unique configs (excluding defaults subfolder duplicates)
- The meaningful PP codes (Heidenhain=Hh, Fanuc=F/Fi, Siemens=Sin, Okuma=Ok, Haas=Haas,
  Mazak=Mz, Brother=Br, DMG=HhDMG) ARE inferable from names
- Missing: axis count, RIP capability, CD (contouring direction), AM (additive),
  CP (CYCLEPOS), CT (CYCLETURN), MT (multi-turret) flags per config
- Score: 18 (naming inference is partial; no binary decode; v33 adds ~25 new configs vs current 16)

### 6. Training Manual Text: 35/100
- full_text.txt: 986KB total across 4 parts — EXISTS and is mined
- hypermill-cam-tips-ext.ts: 43 tips extracted (hm-118 to hm-160)
- TribalKnowledgeEngine.ts has 117 embedded tips — these are the primary set
- hypermill-manual-en-{1-4}: additional knowledge.json files (36KB+) — NOT confirmed ingested
- Missing: systematic extraction of cycle parameter tables, toolpath strategy specs,
  MAXX Machining parameter ranges, Virtual Machining setup procedures
- The cad-engine output dirs also have 4OWT-O4oN8E, aVcqrFkLMbU, etc. (video transcripts) —
  status unclear
- Score: 35 (986KB extracted to text but only ~160 tips distilled from it)

## Required Extraction Scripts

### SCRIPT 1: extract-demo-db-cutting-tech.ts
**Priority: CRITICAL**
Source: H:/prism/HYPERMILL/Tool Database/33.0/databases/demo/english/demo.db
Target: hypermill-demo-cutting-tech.json
Extract: Technologies (2706), CuttingProfiles (2491), NCTools (486), Formulas (13)
Join: Technologies → CuttingMaterials, Tools → GeometryClasses, NCTools → Holders
Output: Per-NCTool array of {spindle_speed, feedrate, cutting_speed, coolants, dbl_params[]}
Note: dbl_params map to ae, ap, fz, etc. by technology_type — need type decoder

### SCRIPT 2: extract-im-tool-db-full.ts
**Priority: CRITICAL**
Source: H:/prism/HYPERMILL/hyperMILL/33.0/AddIns/.../IM_Tool_DB_V2023.1.db
Target: hypermill-im-tools-catalog.json
Extract: 282 Tools, 1371 NCTools, 1211 Technologies, 5893 CuttingProfiles, 155 Holders
Join: Tools → NCTools → Technologies → CuttingProfiles (the real speed-feed chain)
Join: Holders → HolderGeometries → Geometries (for collision data)
Note: This replaces/augments hypermill-speed-feed-catalog.ts which used wrong source DB

### SCRIPT 3: extract-holder-catalog.ts
**Priority: HIGH**
Sources: demo.db + IM_Tool_DB_V2023.1.db + AC_Standard_ToolDB.db
Target: hypermill-holder-catalog.json
Extract per holder: name, coupling_type (iso_code), max_spindle_speed, factor overrides,
  coolant_through flag, geometry polyline blob (decode as r,z coordinate pairs @ 24 bytes each)
Join: Holders → HolderGeometries → Geometries (polyline BLOB)
Geometry decode: BLOB = sequence of (type_byte, r_double, z_double) tuples
Total: 65 + 155 + 21 = 241 holders across three sources

### SCRIPT 4: extract-feature2job-catalogs.ts
**Priority: HIGH**
Sources: H:/prism/HYPERMILL/hyperMILL/33.0/feattech/omFeature2JobCatalog*.xml (11 files)
Target: hypermill-feature2job-catalog.json
Extract: Feature2Job_Definition elements with Feature_Catalog, Feature_Type, Job_Group,
  Job_Name, Job_Type, Frame_Enable, Frame_Active attributes
Total: ~960 mappings across all files
Schema: { feature_type: string, job_type: string, job_name: string, group: string,
          catalog: string, frame_enable: boolean }
Note: These drive AUTOMATION Center feature recognition — critical for auto-programming

### SCRIPT 5: extract-macro-db.ts
**Priority: HIGH**
Sources: IM_Macro_DB.db (7 macros) + AC_Standard_MacroDB.db (4 macros, 39 jobs)
Target: hypermill-macro-catalog.json
Extract from IM_Macro_DB.db Macro table:
  - ID (GUID), Name, Type (HOLE/SINK1-3/BACKSINK1-3), FSGTCode (pipe-delimited params)
  Parse FSGTCode: "Catalog#openmind|Type#Generic_Hole|SNUM#3|ST1#Counterbore|..."
  into structured: { catalog, hole_type, step_count, step_types[], bore_depth_type }
Extract from AC_Standard_MacroDB.db:
  - Macro names, MacroType (Drilling/Pocket/CAD_model_specific)
  - Job records with Job_Parameter (Usage=Drilling/Pocket, ParaName, ParaValue)

### SCRIPT 6: extend-post-config-catalog.ts
**Priority: MEDIUM**
Sources: All 86 unique omPP*.xml filenames in v33 + comparison with v31
Target: Update hypermill-post-configs.json
Action: Cannot decode binary — but CAN expand filename inference to cover all 86 configs
Missing from current 16: Brother (Br), DMG-Heidenhain (HhDMG), GF (GF), Hermle (Hh),
  Hurco (HuWmx), Röders (RoeRMS6), Fanuc-RIP (FRIP), Siemens-CP (SinCP),
  Siemens-MT (SinMT), Siemens-PM (SinPM), Siemens-T (SinT), Deckel (DeZ32)
Add per config: axis_count (3x/CD=3+1/I=indexed/S=5axis), has_rip, has_am, is_sim,
  controller_family, supported_cycles (infer from PP code pattern)

### SCRIPT 7: patch-materials-designations.ts
**Priority: MEDIUM**
Source: materials.db
Target: Patch hypermill-materials.json
Add missing fields per material:
  - din_en_name (70 populated)
  - csn_name (Czech standard — 414 populated)
  - ss_name (Swedish standard — 228 populated)
  - gost_name (Russian standard — 254 populated)
  - bs_name (already in source, verify in JSON)
These are in the DB but not exported in current JSON

### SCRIPT 8: extract-manual-knowledge.ts
**Priority: MEDIUM**
Sources: H:/prism/cad-engine/output/hypermill-en-{1-4}/full_text.txt (986KB)
         H:/prism/cad-engine/output/hypermill-manual-en-{1-4}/knowledge.json
Target: hypermill-manual-knowledge.json + extend hypermill-cam-tips-ext.ts
Mine: Cycle parameter tables (drilling depths, feed reductions),
  MAXX Machining parameter ranges, 5-axis tilt angle rules,
  Virtual Machining setup procedures, collision distance thresholds
Current coverage: 43 tips from web sources + 117 embedded = 160 total
Target: Extract structured parameter tables → at minimum 50 more actionable tips
