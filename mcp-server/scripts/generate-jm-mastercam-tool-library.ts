/**
 * generate-jm-mastercam-tool-library.ts
 * [JM-FUSION-TOOLS-MS0]/U-JFT-MASTERCAM (slot:romeo)
 *
 * Emits a REAL, importable Mastercam X8 Tool Database (.tooldb = SQLite, schema
 * version 17) from JM Die's crib, gated to each tool's compatible ISO material
 * domains. This is the Mastercam leg of the goal "convert the Fusion tool DB to
 * hyperMILL and Mastercam"; it consumes the SAME shared tool model
 * (`lib/jm-tool-model`) as the hyperMILL generator (U-JFT-HYPERMILL), so
 * geometry, the compatibility gate, and the physics cutting data
 * (UltimateSpeedFeedEngine.lookupCuttingData) match the Fusion + hyperMILL
 * libraries tool-for-tool.
 *
 * STRATEGY — template clone (NOT a hand-built schema): we copy the REAL
 * DatabaseDefaults.tooldb (the genuine 47-table Mastercam X8 schema + its
 * reference rows: 20 TlToolType, 44 TlCoolant, the TlOpType/TlGrade/Manufacturer
 * data, and the per-MCToolType OpToolInfo binary op-default blobs), strip the 44
 * placeholder demo tools, then INSERT JM's tools. This guarantees the file is a
 * structurally-genuine Mastercam DB (it cannot diverge from a hand-written DDL),
 * reuses Mastercam's own TlToolType GUIDs, and carries a real op-default blob of
 * the matching tool type for each JM tool.
 *
 * SCHEMA (reverse-engineered from the real .tooldb, see scripts/_mcam-tooldb-probe):
 *   per tool: TlTool(ID, OpToolInfo blob, ToolNumber) -> TlToolMill(geometry +
 *   speeds/feeds + MCToolType discriminator) -> type subtable
 *   (TlToolEndmill | TlToolDrill (+TlToolReamer/Boring/CounterBore/CenterDrill) | TlToolSlotMill).
 *   per (tool x COMPATIBLE ISO group): TlCutParam (CutSpeed m/min, FPT mm) — the
 *   operator's "only populate compatible material domains" constraint as rows.
 *
 * MCToolType enum + subtable routing were extracted empirically from the real
 * DatabaseDefaults/DatabaseCatalog .tooldb (endmill=10, ball=11, bull=12, drill=3,
 * spot=2, center-drill=1, tap=4, reamer=6, bore=7, cbore=8, csink=9, face=13,
 * slot=14, radius=15, chamfer=16, taper=18, lollipop=19, engrave=21).
 *
 * UNITS: METRIC (mm, m/min) emitted directly from the shared model — no inch<->mm
 * conversion is performed here, so the 25.4x scale-error class cannot occur. The
 * template is metric; operators whose Mastercam session is inch get conversion on
 * import. GUIDs are deterministic (md5 of a stable tool key) — reproducible.
 *
 * Run: cd mcp-server && node scripts/generate-jm-mastercam-tool-library.ts
 */
import Database from "better-sqlite3";
import { copyFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import {
  parseJmCribTools, cuttingDataForGroup, ALL_ISO,
  type JmTool, type IsoGroup, type ParseOpts,
} from "./lib/jm-tool-model.js";

const TEMPLATE =
  "H:/prism/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/common/ToolData/DatabaseDefaults.tooldb";
const OUT_DIR = "H:/prism/state/shared/jm-mastercam-tools";

// ── MCToolType int + named TlToolType + geometry-subtable routing ─────────────
// All three columns are grounded in the real DatabaseDefaults/DatabaseCatalog
// .tooldb (see header). subtables[] are the geometry tables to populate (in the
// TlTool -> TlToolMill -> {endmill|drill} -> specialized inheritance order).
interface TypeMap { mc: number; typeName: string; subtables: string[]; }
function mapType(prismType: string): TypeMap {
  const t = (prismType || "").toLowerCase();
  // Turning tools are NOT milling — they belong in a separate Mastercam LATHE
  // .tooldb (TlHolderLathe/TlInsert* schema). Caller filters them out; this is a
  // defensive fallback so a stray turning row never mis-maps to a rotating class.
  if (t.includes("turn") || t.includes("lathe")) return { mc: 0, typeName: "Undefined", subtables: [] };
  if (t.includes("ball")) return { mc: 11, typeName: "Endmill2 Sphere", subtables: ["TlToolEndmill"] };
  if (t.includes("bull") || t.includes("corner_radius") || t.includes("torus")) return { mc: 12, typeName: "Endmill3 Bull", subtables: ["TlToolEndmill"] };
  if (t.includes("radius")) return { mc: 15, typeName: "Radius Mill", subtables: ["TlToolEndmill"] };
  if (t.includes("chamfer")) return { mc: 16, typeName: "Chamfer Mill", subtables: ["TlToolEndmill"] };
  if (t.includes("countersink") || t.includes("csink")) return { mc: 9, typeName: "Csink", subtables: ["TlToolDrill"] };
  if (t.includes("center") && t.includes("drill")) return { mc: 1, typeName: "Center Drill", subtables: ["TlToolDrill", "TlToolCenterDrill"] };
  if (t.includes("spot")) return { mc: 2, typeName: "Spot Drill", subtables: ["TlToolDrill"] };
  if (t.includes("tap")) return { mc: 4, typeName: "Drill", subtables: ["TlToolDrill"] };
  if (t.includes("ream")) return { mc: 6, typeName: "Reamer", subtables: ["TlToolReamer"] };
  if (t.includes("counterbore") || t.includes("cbore")) return { mc: 8, typeName: "CBore", subtables: ["TlToolDrill", "TlToolCounterBore"] };
  if (t.includes("bore") || t.includes("boring")) return { mc: 7, typeName: "Bore", subtables: ["TlToolDrill", "TlToolBoring"] };
  if (t.includes("drill")) return { mc: 3, typeName: "Drill", subtables: ["TlToolDrill"] };
  if (t.includes("slot")) return { mc: 14, typeName: "Slot Mill", subtables: ["TlToolEndmill", "TlToolSlotMill"] };
  if (t.includes("taper")) return { mc: 18, typeName: "Taper Mill", subtables: ["TlToolEndmill"] };
  if (t.includes("lollipop")) return { mc: 19, typeName: "Lollipop Mill", subtables: ["TlToolEndmill"] };
  if (t.includes("engrav")) return { mc: 21, typeName: "Engrave Tool", subtables: ["TlToolEndmill"] };
  if (t.includes("thread")) return { mc: 10, typeName: "Endmill1 Flat", subtables: ["TlToolEndmill"] }; // no native thread-mill type in X8 legacy enum
  if (t.includes("face") || t.includes("shell")) return { mc: 13, typeName: "Endmill1 Flat", subtables: ["TlToolEndmill"] };
  // end mill (flat) is the default rotating cutter
  return { mc: 10, typeName: "Endmill1 Flat", subtables: ["TlToolEndmill"] };
}

/** Deterministic 16-byte GUID from a stable key (Mastercam treats GUIDs as opaque keys). */
function guid(key: string): Buffer {
  return createHash("md5").update(key).digest(); // 16 bytes
}

export interface McamStats {
  tools: number; skippedNoGeometry: number; skippedTurning: number;
  cutParamRows: number; gatedOutGroups: number; mcToolTypes: number[]; outPath: string;
}

export interface McamBuildOpts {
  tools: JmTool[];
  templatePath?: string;
  outPath?: string;
}

/**
 * Build a real Mastercam .tooldb from JM tools by cloning the template DB and
 * inserting tools. Returns stats. Exported for testing (the test points it at
 * the real template + a temp output, then re-opens the output to verify).
 */
export function buildMastercamToolDb(opts: McamBuildOpts): McamStats {
  const templatePath = opts.templatePath ?? TEMPLATE;
  const outPath = opts.outPath ?? join(OUT_DIR, "JM-CRIB-mastercam.tooldb");
  if (!existsSync(templatePath)) {
    throw new Error(`Mastercam template .tooldb not found: ${templatePath} (fail-loud — cannot fabricate the 47-table schema)`);
  }
  mkdirSync(join(outPath, ".."), { recursive: true });
  copyFileSync(templatePath, outPath);

  const db = new Database(outPath);
  db.pragma("foreign_keys = OFF"); // template tables are flat (no declared FKs); we manage integrity by construction

  // 1. Capture a real OpToolInfo op-default blob per MCToolType from the template
  //    placeholders BEFORE we delete them, so each JM tool carries a genuine
  //    type-matched op-default blob.
  const opBlobByMc = new Map<number, Buffer>();
  for (const r of db.prepare("SELECT m.MCToolType mc, t.OpToolInfo blob FROM TlToolMill m JOIN TlTool t ON t.ID=m.ID").all() as Array<{ mc: number; blob: Buffer }>) {
    if (r.blob && !opBlobByMc.has(r.mc)) opBlobByMc.set(r.mc, r.blob);
  }
  const fallbackBlob = opBlobByMc.get(10) ?? Buffer.alloc(0);

  // 2. Reference GUIDs from the template (reuse Mastercam's own).
  const typeIdByName = new Map<string, Buffer>();
  for (const r of db.prepare("SELECT Name, ID FROM TlToolType").all() as Array<{ Name: string; ID: Buffer }>) {
    typeIdByName.set(r.Name, r.ID);
  }
  const undefinedTypeId = typeIdByName.get("Undefined") ?? guid("type:Undefined");
  const gradeRow = db.prepare("SELECT ID FROM TlToolGrade LIMIT 1").get() as { ID: Buffer } | undefined;
  const gradeId = gradeRow?.ID ?? guid("grade:default");
  const mfgRow = db.prepare("SELECT ID FROM TlManufacturer LIMIT 1").get() as { ID: Buffer } | undefined;
  const mfgId = mfgRow?.ID ?? guid("mfg:PRISM-JM");
  const floodRow = db.prepare("SELECT ID FROM TlCoolant WHERE Flood>0 LIMIT 1").get() as { ID: Buffer } | undefined;
  const coolantId = floodRow?.ID ?? (db.prepare("SELECT ID FROM TlCoolant LIMIT 1").get() as { ID: Buffer } | undefined)?.ID ?? guid("coolant:flood");
  const zeroGuid = Buffer.alloc(16);

  // 3. Strip the 44 placeholder demo tools + their assemblies (KEEP all reference tables).
  for (const tbl of [
    "TlTool", "TlToolMill", "TlToolEndmill", "TlToolDrill", "TlToolReamer",
    "TlToolSlotMill", "TlToolBoring", "TlToolCounterBore", "TlToolCenterDrill",
    "TlAssembly", "TlAssemblyItem", "TlAssemblyComponent", "TlCutParam",
  ]) {
    try { db.exec(`DELETE FROM "${tbl}"`); } catch { /* table absent in this template */ }
  }

  // 4. Seed 6 ISO work materials (P=1..H=6) and capture their GUIDs for TlCutParam.
  db.exec("DELETE FROM TlWorkMaterial");
  const isoMatId = new Map<IsoGroup, Buffer>();
  const insWorkMat = db.prepare("INSERT INTO TlWorkMaterial (ID, ISOGroup, Density, HardnessUnit, HardnessValue) VALUES (?,?,?,?,?)");
  ALL_ISO.forEach((iso, i) => {
    const id = guid(`workmat:${iso}`);
    isoMatId.set(iso, id);
    insWorkMat.run(id, i + 1, 0, 0, 0);
  });

  // 5. Prepared inserts.
  const insTool = db.prepare("INSERT INTO TlTool (ID, OpToolInfo, ToolNumber, IsCustom, CustomDisplayType) VALUES (?,?,?,?,?)");
  const insMill = db.prepare(
    `INSERT INTO TlToolMill (ID, OverallLength, ShoulderLength, CuttingDepth, OverallDiameter, ArborDiameter,
      MCToolType, RequiredPilotDiameter, SpindleDir, MaterialSFMAdjust, MaterialFPTAdjust, MfgToolCode, Chuck,
      DiameterOffsetNum, LengthOffsetNum, FeedRate, RetractRate, SpindleSpeed, FluteCount, ToolFileName,
      TlGradeID, TlCoolantID, PlungeRate, IsVariablePitch, ShoulderDiameter, TaperLength, IsScalable)
     VALUES (?,?,?,?,?,?, ?,?,?,?,?,?,?, ?,?,?,?,?,?,?, ?,?,?,?,?,?,?)`,
  );
  const insEndmill = db.prepare(
    `INSERT INTO TlToolEndmill (ID, CornerRadius, IsFinish, IsRough, TlRadiusType, TaperAngle, TipDiameter,
      StepoverRoughXY, StepoverRoughZ, StepoverFinishXY, StepoverFinishZ, HelixAngle, HelixType, ChamferLength)
     VALUES (?,?,?,?,?,?,?, ?,?,?,?, ?,?,?)`,
  );
  const insDrill = db.prepare(
    "INSERT INTO TlToolDrill (ID, ShoulderAngle, TipAngle, CornerRadius, CannedCycleType, Peck1, Peck2, PeckClear, ChipBreak, Dwell) VALUES (?,?,?,?,?,?,?,?,?,?)",
  );
  const insReamer = db.prepare("INSERT INTO TlToolReamer (ID, CannedCycleType, PeckClear, ChipBreak, TipAngle, ChamferLength, Peck1, Peck2, Dwell) VALUES (?,?,?,?,?,?,?,?,?)");
  const insBoring = db.prepare("INSERT INTO TlToolBoring (ID, TaperAngle, TlRadiusType, Shift) VALUES (?,?,?,?)");
  const insCBore = db.prepare("INSERT INTO TlToolCounterBore (ID, PilotLength, PilotDiameter) VALUES (?,?,?)");
  const insCenterDrill = db.prepare("INSERT INTO TlToolCenterDrill (ID, DrillLength, DrillDiameter) VALUES (?,?,?)");
  const insSlot = db.prepare("INSERT INTO TlToolSlotMill (ID, SecondaryCornerRadius, SecondaryRadiusType, SecondaryChamferDistance, SecondaryChamferAngle) VALUES (?,?,?,?,?)");
  const insCut = db.prepare(
    `INSERT INTO TlCutParam (ID, TlToolGradeID, TlToolTypeID, TlOpTypeID, TlManufacturerID, Name, Description,
      MinDiameter, MaxDiameter, CutSpeed, FPT, SurfaceFinish, StepOver, Depth, ToolLifeLinear, ToolLifeMinutes,
      IsMetric, TlCutQuality, TlWorkMaterialID, TlCutSource, IsProven, TlFeedFactor, MinFPT, MaxFPT, MinCutSpeed, MaxCutSpeed)
     VALUES (?,?,?,?,?,?,?, ?,?,?,?,?,?,?,?,?, ?,?,?,?,?,?,?,?,?,?)`,
  );

  let toolNum = 0, skippedNoGeom = 0, skippedTurning = 0, cutRows = 0, gatedOut = 0;
  const mcTypesUsed = new Set<number>();
  const SHOULDER_FRACTION = 0.3; // fraction of (OAL - flute) reached by the shoulder

  const build = db.transaction((tools: JmTool[]) => {
    for (const t of tools) {
      if (t.opClass === "turning") { skippedTurning++; continue; }
      if (!(t.diameter_mm > 0)) { skippedNoGeom++; continue; } // R12 fail-loud: no zero-fill
      toolNum++;
      const tm = mapType(t.prismType);
      mcTypesUsed.add(tm.mc);
      const id = guid(`mcam:${toolNum}:${t.sourceFile}:${t.partNumber}:${t.name}`);
      const d = t.diameter_mm;
      const oal = t.overallLength_mm > 0 ? t.overallLength_mm : d * 6;
      const fl = t.fluteLength_mm > 0 ? t.fluteLength_mm : d * 3;
      const shank = t.shankDiameter_mm > 0 ? t.shankDiameter_mm : d;
      const isDrillFamily = tm.subtables.includes("TlToolDrill");
      const flutes = t.flutes > 0 ? t.flutes : (isDrillFamily ? 2 : 4);
      const shoulderLen = Math.min(fl + (oal - fl) * SHOULDER_FRACTION, oal);

      insTool.run(id, opBlobByMc.get(tm.mc) ?? fallbackBlob, toolNum, 0, 0);
      insMill.run(
        id, oal, shoulderLen, fl, d, shank,
        tm.mc, 0, 0, 100, 100, t.partNumber.slice(0, 64), "",
        1, 1, 0, 0, 0, flutes, "",
        gradeId, coolantId, 0, 0, shank, 0, 0,
      );

      const typeId = typeIdByName.get(tm.typeName) ?? undefinedTypeId;
      for (const sub of tm.subtables) {
        switch (sub) {
          case "TlToolEndmill": {
            const cr = t.cornerRadius_mm;
            const isBall = tm.mc === 11;
            insEndmill.run(id, isBall ? d / 2 : cr, 1, 1, isBall ? 1 : 0, 180, t.tipDiameter_mm ?? 0, 0, 0, 0, 0, 30, 0, 0);
            break;
          }
          case "TlToolDrill":
            insDrill.run(id, 0, t.pointAngle_deg ?? (t.toolMaterial === "hss" ? 118 : 140), t.cornerRadius_mm, 0, 0, 0, 0, 0, 0);
            break;
          case "TlToolReamer":
            insReamer.run(id, 0, 0, 0, 0, 0, 0, 0, 0);
            break;
          case "TlToolBoring":
            insBoring.run(id, 0, 0, 0);
            break;
          case "TlToolCounterBore":
            insCBore.run(id, fl, shank);
            break;
          case "TlToolCenterDrill":
            insCenterDrill.run(id, fl, d);
            break;
          case "TlToolSlotMill":
            insSlot.run(id, 0, 0, 0, 0);
            break;
        }
      }

      // CutParam — ONLY compatible ISO groups, only where physics resolves.
      for (const iso of ALL_ISO) {
        if (!t.compatibleGroups.includes(iso)) { gatedOut++; continue; }
        const cd = cuttingDataForGroup(t, iso);
        if (!cd) continue;
        cutRows++;
        const cpId = guid(`cut:${toolNum}:${iso}`);
        insCut.run(
          cpId, gradeId, typeId, zeroGuid, mfgId, `${iso} cutting data`, `JM crib (${t.sourceFile})`,
          Math.max(d * 0.5, 0), d * 2, cd.vc_mpm, cd.fz_mm, 0, cd.ae_mm, cd.ap_mm, 0, cd.toolLifeMin ?? 15,
          1, 0, isoMatId.get(iso), 1, 0, 1, cd.fz_mm * 0.7, cd.fz_mm * 1.3, cd.vc_mpm * 0.8, cd.vc_mpm * 1.2,
        );
      }
    }
  });
  build(tools);
  db.close();

  return {
    tools: toolNum, skippedNoGeometry: skippedNoGeom, skippedTurning,
    cutParamRows: cutRows, gatedOutGroups: gatedOut,
    mcToolTypes: [...mcTypesUsed].sort((a, b) => a - b), outPath,
  };
}

function writeReadme(stats: McamStats): void {
  const o: string[] = [];
  o.push("# JM Die — Mastercam X8 Tool Database (.tooldb)\n");
  o.push(`Real importable Mastercam tool DB: ${stats.tools} milling tools, ${stats.cutParamRows} compatibility-gated cutting rows.`);
  o.push(`Skipped ${stats.skippedNoGeometry} tool(s) with no usable geometry (fail-loud) and ${stats.skippedTurning} turning tool(s) (lathe .tooldb is a separate format — future leg).\n`);
  o.push("## Import into Mastercam");
  o.push("```\nCopy JM-CRIB-mastercam.tooldb into your Mastercam Tool Database folder, or\nMastercam -> Tool Manager -> open/import the .tooldb directly.\n```");
  o.push("Built by cloning the genuine Mastercam X8 `DatabaseDefaults.tooldb` (schema v17) and inserting JM's tools — it IS a real Mastercam database, not a reconstructed schema.\n");
  o.push("## What's inside");
  o.push("- **TlTool / TlToolMill** — geometry (mm) + flute count; each carries a real per-type `OpToolInfo` op-default blob copied from the matching Mastercam tool type.");
  o.push("- **TlToolEndmill / TlToolDrill / TlToolReamer / TlToolBoring / TlToolCounterBore / TlToolCenterDrill / TlToolSlotMill** — per-type geometry; MCToolType discriminator matches Mastercam's own enum (endmill=10, ball=11, bull=12, drill=3, etc.).");
  o.push("- **TlWorkMaterial** — 6 ISO groups (P/M/K/N/S/H).");
  o.push("- **TlCutParam** — per-tool x per-COMPATIBLE-material CutSpeed (m/min) + FPT (mm). Each tool carries cutting rows ONLY for the ISO groups its coating+substrate is metallurgically compatible with (the operator constraint). Sourced from UltimateSpeedFeedEngine.lookupCuttingData.\n");
  o.push(`MCToolType codes used: ${stats.mcToolTypes.join(", ")}.\n`);
  o.push("## Honest limitations (R12)");
  o.push("- UNITS are METRIC (mm / m per min); the `OpToolInfo` op-default blob is reused per tool type from the template (type-correct, not size-tuned) — verify the first program's defaults on the machine.");
  o.push("- Holder/assembly geometry (TlHolder/TlAssembly) is NOT populated — assign the holder in Mastercam Tool Manager. Tool geometry + cutting data are complete.");
  o.push("- Cutting data are physics starting points (Kienzle/Taylor) — verify on the machine for rigidity/coolant/finish.");
  o.push("- Turning/lathe tools are excluded (Mastercam lathe uses a different .tooldb schema: TlHolderLathe/TlInsert*) — a future leg.");
  o.push("\n_Generated by `scripts/generate-jm-mastercam-tool-library.ts` — JM-FUSION-TOOLS-MS0/U-JFT-MASTERCAM (slot:romeo). Template: Mastercam X8 DatabaseDefaults.tooldb (schema v17)._");
  writeFileSync(join(OUT_DIR, "README.md"), o.join("\n") + "\n", "utf-8");
}

function main(): void {
  const opts: ParseOpts = {};
  const tools = parseJmCribTools(opts);
  const stats = buildMastercamToolDb({ tools });
  writeReadme(stats);
  console.log(`GENERATED Mastercam .tooldb: ${stats.tools} tools, ${stats.cutParamRows} gated cutting rows, ${stats.skippedNoGeometry} skipped (no geometry), ${stats.skippedTurning} turning skipped.`);
  console.log(`MCToolType codes: ${stats.mcToolTypes.join(", ")}`);
  console.log(`Output: ${stats.outPath}`);
}

// Run only when invoked directly (not when imported by the test).
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").includes("generate-jm-mastercam-tool-library")) main();
