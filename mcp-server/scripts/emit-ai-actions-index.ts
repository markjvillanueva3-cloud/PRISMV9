/**
 * Emit CAM_AI_ACTIONS_INDEX.json — U-CAM-ENRICH-03 deliverable.
 */
import { camAIActionLinkerEngine } from "../src/engines/CAMAIActionLinkerEngine.js";

console.log("[U-CAM-ENRICH-03] Loading CAM_PHYSICS_LINKS_INDEX.json...");
const idx = camAIActionLinkerEngine.linkAll();
console.log(`[U-CAM-ENRICH-03] Total params with actions: ${idx.total_params}`);
console.log(`[U-CAM-ENRICH-03] Total AI actions emitted:  ${idx.total_actions}`);
console.log(`[U-CAM-ENRICH-03] Per-CAM:`);
for (const [slug, n] of Object.entries(idx.summary.per_cam_count).sort((a, b) => b[1] - a[1])) {
  if (n === 0) continue;
  console.log(`  ${slug}: ${n}`);
}
console.log(`[U-CAM-ENRICH-03] Action usage:`);
for (const [a, n] of Object.entries(idx.summary.action_usage).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${a}: ${n}`);
}
