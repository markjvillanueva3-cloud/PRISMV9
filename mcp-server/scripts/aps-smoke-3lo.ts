/**
 * APS 3LO smoke test — runs the full real-world browser flow.
 *
 * Usage:  cd H:/prism && npx tsx mcp-server/scripts/aps-smoke-3lo.ts
 *
 * Loads .env, calls APSOAuthEngine.begin3LO(), opens browser, waits for
 * user to click "Allow" in their Autodesk account, exchanges code for
 * tokens, persists to data/state/aps-tokens.json, prints status.
 *
 * Exit codes:
 *   0 — success (token cached, ready for hub crawls)
 *   1 — failure (network, scope, user-denied, timeout, etc.)
 *   2 — already authenticated (no-op; clear cache to retest)
 */

import { config } from "dotenv";
import { resolve } from "node:path";

// Load .env from project root + mcp-server/ (mcp-server takes precedence)
config({ path: resolve(process.cwd(), ".env"), override: false });
config({ path: resolve(process.cwd(), "mcp-server/.env"), override: true });

async function main(): Promise<number> {
  const { apsOAuthEngine } = await import("../src/engines/APSOAuthEngine.js");

  console.log("[smoke] === APS 3LO smoke test ===");
  console.log("[smoke] Initial status:");
  const initial = await apsOAuthEngine.getStatus();
  console.log(JSON.stringify(initial, null, 2));

  if (!initial.configured) {
    console.error("\n[smoke] ❌ Engine reports configured:false — check .env has APS_CLIENT_ID + APS_CLIENT_SECRET");
    return 1;
  }

  if (initial.authenticated3LO && initial.expiresIn3LO && initial.expiresIn3LO > 300) {
    console.log(`\n[smoke] ℹ Already authenticated (3LO token valid for ${initial.expiresIn3LO}s).`);
    console.log("[smoke] To re-test, delete the token cache:");
    console.log(`[smoke]   rm mcp-server/data/state/aps-tokens.json`);
    return 2;
  }

  console.log("\n[smoke] Starting 3LO browser flow...");
  console.log("[smoke] Your browser should open at https://developer.api.autodesk.com/authentication/v2/authorize?...");
  console.log("[smoke] Click 'Allow access' on the Autodesk consent page.");
  console.log("[smoke] (If browser doesn't open, copy the URL from the line above.)\n");

  try {
    const result = await apsOAuthEngine.begin3LO();
    console.log(`\n[smoke] ✅ 3LO complete — obtained: ${result.obtained}`);
    console.log("[smoke] Final status:");
    const final = await apsOAuthEngine.getStatus();
    console.log(JSON.stringify(final, null, 2));
    if (!final.authenticated3LO) {
      console.error("[smoke] ❌ Engine still reports authenticated3LO=false despite successful exchange — investigate");
      return 1;
    }
    console.log("\n[smoke] ✅ Token cached. Ready for Phase 3 (Data Management + Model Derivative).");
    return 0;
  } catch (e) {
    const err = e as Error & { code?: string; detail?: string };
    console.error(`\n[smoke] ❌ 3LO failed: ${err.message}`);
    if (err.code) console.error(`[smoke]    code: ${err.code}`);
    if (err.detail) console.error(`[smoke]    detail: ${err.detail}`);
    return 1;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error("[smoke] uncaught:", e);
    process.exit(1);
  });
