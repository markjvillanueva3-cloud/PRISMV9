/**
 * live-test-rotor.ts — Drive Fusion 360 LIVE through Fusion360LiveBridgeEngine.
 *
 * Requires: PRISMBridge add-in running in Fusion 360 (HTTP server on :18360).
 *
 * Run:  npx tsx mcp-server/scripts/live-test-rotor.ts
 */
import { fusion360LiveBridgeEngine as fb } from "../src/engines/Fusion360LiveBridgeEngine.js";

function log(label: string, r: unknown): void {
  const j = JSON.stringify(r, null, 2);
  console.log(`\n── ${label} ──\n${j.length > 400 ? j.slice(0, 400) + "…" : j}`);
}

async function main(): Promise<void> {
  // 1. Health check
  const ok = await fb.healthCheck();
  log("health", { ok });
  if (!ok) {
    console.error("\nFAIL: Fusion bridge not reachable");
    process.exit(1);
  }

  // 2. Fresh document
  log("new_doc", await fb.newDocument("PRISM_LiveTest"));

  // 3. Hub disk sketch (Ø50 circle on XY)
  log(
    "sketch hub",
    await fb.createSketch({
      plane: "xy",
      shapes: [{ type: "circle", center_x_mm: 0, center_y_mm: 0, radius_mm: 25 }],
    }),
  );

  // 4. Extrude 20mm
  log(
    "extrude hub",
    await fb.extrude({ depth_mm: 20, operation: "new" }),
  );

  // 5. Geometry summary
  log("geometry", await fb.getGeometry());
}

main().catch((e: unknown) => {
  console.error("\nLIVE TEST CRASHED:", e instanceof Error ? e.message : e);
  process.exit(2);
});
