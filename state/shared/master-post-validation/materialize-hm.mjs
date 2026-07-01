import fs from "fs";
const OUT = "H:/prism/state/shared/master-post-validation/exports/hypermill/";
const raw = JSON.parse(fs.readFileSync(OUT + "_raw-drive-output.json", "utf8"));

// 1) TOOL DB (job) -> .hmt.sql (SQLite load script) — the uploadable artifact
const j = raw.tool_export_job;
const sql = j.sqlite_schema + "\n\n" + j.insert_statements.join("\n") + "\n";
fs.writeFileSync(OUT + "prism-base-job-tools.hmt.sql", sql);
console.log("tool_export_job: tools=%d nctool=%d depot=%d mat=%d classes=%s",
  j.summary.tools, j.summary.nctool_entries, j.summary.depot_slots, j.summary.materials, j.summary.geometry_classes_used.join(","));

// 2) full-catalog tool export
const f = raw.tool_export;
if (f && f.sqlite_schema) {
  fs.writeFileSync(OUT + "prism-catalog-tools.hmt.sql", f.sqlite_schema + "\n\n" + f.insert_statements.join("\n") + "\n");
  console.log("tool_export(catalog): tools=%d", f.tool_count);
}

// 3) build_tool_install envelope
const b = raw.build_tool_install;
console.log("build_tool_install keys:", b && typeof b === "object" ? Object.keys(b).join(",") : typeof b);
fs.writeFileSync(OUT + "_build-tool-install-envelope.json", JSON.stringify(b, null, 2));
