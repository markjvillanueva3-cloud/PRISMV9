---
name: reference_db_domain_categorization_audit_2026_06_01
description: DB-domain categorization audit (27 domains) + AlarmDB P0 axis + shared controller-family axis; the gold-standard categorization-module pattern.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.536Z
aliases: reference_db_domain_categorization_audit_2026_06_01
---


**DB-domain categorization audit** (slot:juliett, 2026-06-01). Operator: "ensure each database domain is properly categorized." A 54-agent classify→adversarial-verify Workflow over all 27 `DB_MANIFEST.json` domains. Durable punch-list: `state/shared/specs/DB-DOMAIN-CATEGORIZATION-AUDIT-2026-06-01.md`.

**The gold-standard pattern** (every "properly categorized" domain gets this shape, cross-CAM portable): a `src/data/<domain>-categorization.ts` module = `taxonomy const + normalize fn (free-text→canonical key, returns null on unknown, NEVER coerces) + zod schema + categorize fn`, wired into the consumers. Free-text columns ("1018", "FANUC 0i") = UNCATEGORIZED even with many rows. Three shipped: `tool-material-categorization.ts` (ISO 513), `holder-categorization.ts` (taper×contact, see [[reference_holder_taper_contact_categorization_2026_06_01]]), `controller-family.ts`+`alarm-categorization.ts`.

**AlarmDB P0** (commit `U-ALARMDB-CATEGORIZATION` on `cad-fusion-live-ms0`): was the worst gap — 2511 alarms, grouping keys (controller_family/category/severity) as raw free-text, **1210/2511 (48%) controller_family="undefined"**, 52 categories vs a 17-value schema. Built `controller-family.ts` (16 canonical families — the **superset** of `ALARM_SCHEMA.json`, which OMITTED DOOSAN + DMG_MORI that the data carries) + `alarm-categorization.ts` (category folds 52→closed set; severity/machine-stoppage ordinals; `categorizeAlarm` recovers controller via `controller_family→family→alarm_id`, folds the 48% undefined). Wired `AlarmRegistry` index + all 7 lookup paths to the canonical normalizers WITHOUT mutating raw stored fields (lane-respect — echo's PostProcessorPipelineEngine/completions.ts free-text args just resolve now, no edits to their files). 27 tests; 76 existing alarm tests still green.

**Shared controller-family axis**: `controller-family.ts` is the single source of truth for CNC controller BRAND — `normalizeControllerFamily` folds casing/separators/model-suffixes (DMG MORI→DMG_MORI, Fanuc 30i→FANUC, OSP-P300→OKUMA) + 3-letter alarm_id abbreviations (ALM-FAN-000→FANUC, **exact-keyed** to avoid `bro`⊂`brother` collisions). GCodeTemplateDB + MachineDB P1 axes MUST import it, not re-derive (ControllerDialectEngine's 6-value type should align to it too).

**Full 27-domain tally** (26/27 verified across 2 workflow passes — MaterialDB=ISO 513 known): **6 CATEGORIZED** (AlarmDB✦, MaterialDB, CoolantDB, CAMSystemDB, PrismReferenceDB-outer, DecisionTreeDB). **~14 P1** (build the sibling axis): MachineDB, ThreadDB, ToleranceDB, GCodeTemplateDB, ReportTemplateDB, ToolpathStrategyDB + ToolDB(material axis exists, ZERO importers — just wire it), WorkholdingDB, SpindleDB(reuse holder taper axis), CollisionDB, ProcessDataDB(wire ISO half), VendorCatalogDB, **JMDieDocuStrataDB**(juliett's OWN corpus — document-role axis). **4 P2** consolidation: CoolantDB/GenomeDB/PrismReferenceDB-inner/FormulaDB. **6 NA** (AI/internal): AlgorithmDB/KnowledgeDB/WorkflowDB/InferenceDB/CompoundActionDB/SourceCatalogDB. Logical-order pickup (R13): reuse-existing-axis P1s first (ToolDB/SpindleDB/ProcessDataDB — no new taxonomy), then new-taxonomy builds. The cross-CAM pattern is proven 3× (material/holder/alarm).

**CRLF hazard caught (R12):** the Edit tool flipped `AlarmRegistry.ts` LF→CRLF (repo convention is LF); caught via `git show --stat` showing 1504 changed lines on a 750-line file, fixed by LF-normalize + reset-soft re-commit. Always `git show --stat` after editing an existing file; if the line count ≈ whole file, it's a CRLF flip — normalize before committing.
