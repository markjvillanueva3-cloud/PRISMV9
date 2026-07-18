// Throwaway probe v3: empirical MCToolType int -> geometry-subtable mapping, and
// CutParam unit sanity, from the real populated DatabaseCatalog.tooldb.
import { DatabaseSync } from "node:sqlite";
const ROOT = "H:/prism/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults";

for (const [label, file] of [["Catalog", `${ROOT}/common/ToolData/DatabaseCatalog.tooldb`], ["Defaults", `${ROOT}/common/ToolData/DatabaseDefaults.tooldb`]]) {
  console.log("\n===== " + label + " =====");
  const db = new DatabaseSync(file, { readOnly: true });
  // MCToolType distribution
  try {
    const dist = db.prepare("SELECT MCToolType, COUNT(*) n FROM TlToolMill GROUP BY MCToolType ORDER BY MCToolType").all();
    console.log("MCToolType dist:", dist.map((r) => `${r.MCToolType}:${r.n}`).join("  "));
  } catch (e) { console.log("milldist err", e.message); }
  // For each geometry subtable, which MCToolType ints appear
  for (const sub of ["TlToolEndmill", "TlToolDrill", "TlToolReamer", "TlToolSlotMill", "TlToolBoring", "TlToolCounterBore", "TlToolCenterDrill"]) {
    try {
      const rows = db.prepare(`SELECT DISTINCT m.MCToolType t FROM ${sub} s JOIN TlToolMill m ON m.ID=s.ID ORDER BY t`).all();
      if (rows.length) console.log(`  ${sub}: MCToolType in [${rows.map((r) => r.t).join(",")}]`);
    } catch {}
  }
  // TlToolType names (the 20 standard types) with implied codes
  try {
    const tt = db.prepare("SELECT Name FROM TlToolType ORDER BY Name").all();
    console.log("TlToolType names:", tt.map((r) => r.Name).join(" | "));
  } catch {}
  // Coolant: find the 'flood' style row
  try {
    const c = db.prepare("SELECT COUNT(*) n FROM TlCoolant WHERE Flood>0").get();
    console.log("coolant rows with Flood>0:", c.n);
  } catch {}
  db.close();
}
