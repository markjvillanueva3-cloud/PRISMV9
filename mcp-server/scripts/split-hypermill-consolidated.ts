/**
 * Fan out hypermill/5axis-maxx-millturn-catalog.json into per-unit
 * deliverables for U-CAM04 (5-Axis), U-CAM05 (MAXX), U-CAM07 (Mill-Turn).
 */
import { camCatalogSplitterEngine } from "../src/engines/CAMCatalogSplitterEngine.js";

const r = camCatalogSplitterEngine.split({
  consolidated_path: "H:/PRISM/mcp-server/data/cam-functions/hypermill/5axis-maxx-millturn-catalog.json",
  out_dir: "H:/PRISM/mcp-server/data/cam-functions/hypermill",
  rules: [
    { module_id: "5axis",   out_basename: "5axis-operations.json" },
    { module_id: "maxx",    out_basename: "maxx-machining.json" },
    { module_id: "millturn", out_basename: "turning-operations.json" },
  ],
  system_id: "hypermill",
});

console.log(`[split-hm] Found modules  : ${r.modules_found.join(", ")}`);
console.log(`[split-hm] Missing modules: ${r.modules_missing.join(", ") || "none"}`);
console.log(`[split-hm] Total ops      : ${r.total_operations}`);
console.log(`[split-hm] Total params   : ${r.total_parameters}`);
console.log(`[split-hm] Files written  :`);
for (const f of r.files_written) console.log(`  ${f}`);
