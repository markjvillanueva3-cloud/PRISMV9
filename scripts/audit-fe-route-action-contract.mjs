#!/usr/bin/env node
/**
 * audit-fe-route-action-contract.mjs -- CLI for the FE-route to dispatcher-action verifier.
 *
 * U-FE-ROUTE-ACTION-CONTRACT (slot:sierra). Reports every REST route that calls a
 * dispatcher action that does not resolve -- the silent 200+{error} footgun the SPA's
 * `if (!res.ok)` cannot catch. P0 = a MOUNTED router with such a call (live breakage).
 *
 * Usage:
 *   node scripts/audit-fe-route-action-contract.mjs            # human report
 *   node scripts/audit-fe-route-action-contract.mjs --json     # machine-readable
 *   node scripts/audit-fe-route-action-contract.mjs --p0-only  # only live (mounted) breakage
 *   node scripts/audit-fe-route-action-contract.mjs --fail-on-p0  # exit 1 if any P0 (CI gate)
 *   node scripts/audit-fe-route-action-contract.mjs --out <path> # write the JSON report to disk
 *
 * Pure logic lives in scripts/lib/fe-route-action-contract.mjs (tested).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditContract } from "./lib/fe-route-action-contract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const p0Only = args.includes("--p0-only");
const failOnP0 = args.includes("--fail-on-p0");
const outIdx = args.indexOf("--out");
const outPath = outIdx >= 0 ? args[outIdx + 1] : null;

const result = auditContract({
  routesDir: path.join(REPO, "mcp-server/src/routes"),
  dispatchersDir: path.join(REPO, "mcp-server/src/tools/dispatchers"),
  indexPath: path.join(REPO, "mcp-server/src/routes/index.ts"),
});

const { summary, findings } = result;

if (outPath) {
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");
  console.log(`wrote ${findings.length} findings (${summary.p0Mounted} P0) to ${outPath}`);
}

if (asJson) {
  const out = p0Only ? { ...result, findings: findings.filter((f) => f.severity === "P0") } : result;
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
} else {
  const order = { P0: 0, INFO: 1, UNVERIFIABLE: 2, DYNAMIC: 3 };
  const shown = (p0Only ? findings.filter((f) => f.severity === "P0") : findings)
    .sort((a, b) => (order[a.severity] - order[b.severity]) || a.file.localeCompare(b.file));

  console.log("FE-route <-> dispatcher-action contract audit");
  console.log("=============================================");
  console.log(`route files scanned : ${summary.routeFiles}`);
  console.log(`dispatchers parsed  : ${summary.dispatchers}`);
  console.log(`literal callTool pairs: ${summary.literalPairs}  (resolved ${summary.resolved})`);
  console.log(`dynamic (non-literal): ${summary.dynamic}`);
  console.log(`unverifiable dispatchers: ${summary.unparsableDispatchers.length}` +
    (summary.unparsableDispatchers.length ? ` [${summary.unparsableDispatchers.join(", ")}]` : ""));
  console.log("");
  console.log(`P0 (mounted, broken): ${summary.p0Mounted}`);
  console.log(`INFO (unmounted, broken): ${summary.infoUnmounted}`);
  console.log(`UNVERIFIABLE calls  : ${summary.unverifiable}`);
  console.log(`CLEAN (no live P0)  : ${summary.clean}`);
  console.log("");
  for (const f of shown) {
    const tag = f.severity.padEnd(12);
    const mnt = f.mounted ? "MOUNTED" : "unmounted";
    console.log(`[${tag}] ${f.file} (${mnt}) ${f.tool}:${f.action ?? "<dyn>"} -- ${f.reason}`);
  }
}

if (failOnP0 && summary.p0Mounted > 0) {
  console.error(`\nFAIL: ${summary.p0Mounted} mounted route(s) call non-resolving dispatcher actions.`);
  process.exit(1);
}
