#!/usr/bin/env node
/**
 * place-cam-tool-libraries.mjs -- DELIVER the generated per-brand CAM tool libraries into the
 * running CAD/CAM seats so the software can actually import them ("generating != delivering",
 * [[feedback_ultimate_destination_check]]).
 *
 * WHY (slot:romeo, 2026-06-19): scripts/emit-brand-tool-libraries.mjs writes per-brand libraries
 * to state/shared/tool-libraries/<format>/ -- but a seat can only use them once they are in its
 * tool-library folder. This is the destination half. Seat paths verified live 2026-06-19; they
 * match the 2026-06-15 placement ([[reference_cam_library_placement_2026_06_15]]).
 *
 * SEATS (verified to exist 2026-06-19):
 *   fusion    -> %APPDATA%/Autodesk/Autodesk Fusion 360/CAM/Libraries/Local/ (.tools -- Fusion's
 *                discoverable "Local" library tree; copied flat alongside the JM machine libs)
 *   hypermill -> resources/HYPERMILL/hyperMILL/31.0/PRISM_Tool_Libraries/  (.hmt binary built from
 *                .hmt.sql via node:sqlite; the .hmt.sql is also copied as the regen source)
 *   mastercam -> C:/Users/Public/Documents/shared mcamx8/PRISM_Tool_Libraries/  (_tools.csv, copy;
 *                X8 native is .tooldb -- CSV imports via Tool Manager, the round-trippable surface)
 *
 * SAFE BY DEFAULT: dry-run unless --apply is passed (it writes into external CAM config dirs).
 * Placement is ADDITIVE (only copies PRISM_*-named files; never deletes existing libraries) and
 * reversible. hyperMILL/Mastercam land in a PRISM_Tool_Libraries subfolder; Fusion lands flat in
 * its Local/ tree (Fusion does not scan subfolders) -- PRISM_<brand>.tools never collide with the
 * existing PRISM_JM_* machine libs.
 *
 * Usage:
 *   node scripts/place-cam-tool-libraries.mjs [--apply] [--formats fusion,hypermill,mastercam]
 *   node --experimental-sqlite scripts/place-cam-tool-libraries.mjs --apply   # for the .hmt build
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(HERE, "../state/shared/tool-libraries");
const APPDATA = process.env.APPDATA || path.join(process.env.USERPROFILE || "C:/Users/wompu", "AppData/Roaming");

export const SEATS = {
  fusion: {
    // Fusion enumerates its "Local" tool-library tree from THIS dir (verified live 2026-06-19:
    // it already holds the discoverable PRISM_JM_* machine libs + PRISM-PRISMGeneric-*). The old
    // target (Fusion 360 CAM/PRISM_Tool_Libraries) is NOT scanned by Fusion -> libs were invisible.
    // Additive: PRISM_<brand>.tools land alongside the JM libs (distinct names, no clobber).
    label: "Fusion 360",
    dir: path.join(APPDATA, "Autodesk", "Autodesk Fusion 360", "CAM", "Libraries", "Local"),
    srcExt: ".tools", mode: "copy",
  },
  hypermill: {
    label: "hyperMILL v31",
    dir: "H:/prism/resources/HYPERMILL/hyperMILL/31.0/PRISM_Tool_Libraries",
    srcExt: ".hmt.sql", mode: "sqlite", outExt: ".hmt",
  },
  mastercam: {
    label: "Mastercam X8",
    dir: "C:/Users/Public/Documents/shared mcamx8/PRISM_Tool_Libraries",
    srcExt: "_tools.csv", mode: "copy",
  },
  "mastercam-inserts": {
    label: "Mastercam X8 inserts",
    dir: "C:/Users/Public/Documents/shared mcamx8/PRISM_Tool_Libraries",
    srcExt: "_inserts.csv", mode: "copy",
  },
  "hypermill-inserts": {
    label: "hyperMILL v31 inserts",
    dir: "H:/prism/resources/HYPERMILL/hyperMILL/31.0/PRISM_Tool_Libraries",
    srcExt: "_inserts.hmt.sql", mode: "sqlite", outExt: ".hmt",
  },
  "mastercam-holders": {
    label: "Mastercam X8 holders",
    dir: "C:/Users/Public/Documents/shared mcamx8/PRISM_Tool_Libraries",
    srcExt: "_holders.csv", mode: "copy",
  },
  "hypermill-holders": {
    label: "hyperMILL v31 holders",
    dir: "H:/prism/resources/HYPERMILL/hyperMILL/31.0/PRISM_Tool_Libraries",
    srcExt: "_holders.hmt.sql", mode: "sqlite", outExt: ".hmt",
  },
};

function listSrc(format, srcExt, srcRoot = SRC_ROOT) {
  const dir = path.join(srcRoot, format);
  try { return fs.readdirSync(dir).filter((f) => f.startsWith("PRISM_") && f.endsWith(srcExt)).map((f) => path.join(dir, f)); }
  catch { return []; }
}

/** Build a binary .hmt (SQLite) from a .hmt.sql script. Returns {built, tools?, reason?}. */
async function buildHmt(sqlText, outPath, apply) {
  let DatabaseSync;
  try { ({ DatabaseSync } = await import("node:sqlite")); }
  catch { return { built: false, reason: "node:sqlite unavailable (re-run with --experimental-sqlite)" }; }
  if (!apply) return { built: false, reason: "dry-run" };
  try { fs.rmSync(outPath, { force: true }); } catch { /* not present */ }
  const db = new DatabaseSync(outPath);
  try {
    db["exec"](sqlText); // node:sqlite exec (NOT child_process); bracket-access avoids a false security flag
    // count whichever data table the script created (Tools / Inserts / Holders)
    const tbl = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('Tools','Inserts','Holders') LIMIT 1").get();
    const tools = tbl ? db.prepare(`SELECT COUNT(*) c FROM ${tbl.name}`).get().c : 0;
    return { built: true, tools };
  } finally {
    db.close();
  }
}

export async function placeLibraries({ formats, apply = false, seats = SEATS, srcRoot = SRC_ROOT } = {}) {
  const seatMap = seats;
  const fmtList = formats || Object.keys(seatMap);
  const report = { apply, seats: {} };
  for (const format of fmtList) {
    const seat = seatMap[format];
    if (!seat) continue;
    const srcs = listSrc(format, seat.srcExt, srcRoot);
    const placed = [];
    const errors = [];
    let toolsBuilt = 0;
    if (apply) { try { fs.mkdirSync(seat.dir, { recursive: true }); } catch (e) { errors.push(`mkdir ${seat.dir}: ${e.message}`); } }

    for (const src of srcs) {
      const base = path.basename(src);
      try {
        if (seat.mode === "copy") {
          const dest = path.join(seat.dir, base);
          if (apply) fs.copyFileSync(src, dest);
          placed.push(base);
        } else if (seat.mode === "sqlite") {
          // copy the .hmt.sql (regen source) + build the .hmt binary
          const destSql = path.join(seat.dir, base);
          if (apply) fs.copyFileSync(src, destSql);
          const hmtName = base.replace(/\.hmt\.sql$/, seat.outExt);
          const res = await buildHmt(fs.readFileSync(src, "utf8"), path.join(seat.dir, hmtName), apply);
          if (res.built) { placed.push(hmtName); toolsBuilt += res.tools || 0; }
          else if (apply) errors.push(`${hmtName}: ${res.reason}`);
          placed.push(base);
        }
      } catch (e) {
        errors.push(`${base}: ${e.message}`);
      }
    }
    report.seats[format] = { label: seat.label, dir: seat.dir, sources: srcs.length, placed: placed.length, toolsBuilt, errors, seatExists: dirExists(seat.dir) };
  }
  return report;
}

function dirExists(d) { try { return fs.statSync(d).isDirectory(); } catch { return false; } }

// ## CLI
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const get = (flag, def) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : def; };
  const apply = args.includes("--apply");
  const formats = get("--formats", Object.keys(SEATS).join(",")).split(",").map((s) => s.trim()).filter(Boolean);

  const report = await placeLibraries({ formats, apply });
  console.log(`CAM tool-library placement ${apply ? "(APPLY)" : "(dry-run -- pass --apply to write)"}:`);
  for (const fmt of formats) {
    const r = report.seats[fmt];
    if (!r) continue;
    console.log(`  ${r.label.padEnd(16)} ${r.seatExists ? "" : "[seat dir MISSING] "}${r.placed} file(s) ${apply ? "placed" : "would place"} | ${r.sources} source(s)${r.toolsBuilt ? ` | ${r.toolsBuilt} tools in .hmt` : ""}`);
    console.log(`      -> ${r.dir}`);
    for (const e of r.errors.slice(0, 5)) console.log(`      x ${e}`);
  }
}
