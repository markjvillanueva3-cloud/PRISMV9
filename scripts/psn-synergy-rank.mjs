#!/usr/bin/env node
/**
 * PSN-Synergy ranker — reads state/shared/psn-synergy-snapshot.json,
 * pipes through PSNSynergyInspectorEngine, prints the top under-wired
 * bridge candidates with ROI bands + suggestion text.
 *
 * This is the eat-your-own-dog-food driver: the meta-engine ranks
 * itself against the live PSN snapshot.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

const SNAP = resolve(REPO, "state/shared/psn-synergy-snapshot.json");
const snap = JSON.parse(readFileSync(SNAP, "utf8"));

// pathToFileURL is REQUIRED on Windows: a bare absolute path like "H:/…" makes ESM
// import() treat "H:" as a URL scheme → ERR_UNSUPPORTED_ESM_URL_SCHEME (swallowed by the
// .catch below). Before this fix the dist import silently always failed on Windows and the
// (now-removed) inline fallback ran instead — hence the engine-vs-fallback ROI divergence.
const mod = await import(
  pathToFileURL(resolve(REPO, "mcp-server/dist/engines/PSNSynergyInspectorEngine.js")).href,
).catch(() => null);

const psnSynergyInspectorEngine = mod?.psnSynergyInspectorEngine ?? null;

if (!psnSynergyInspectorEngine) {
  // No inline fallback BY DESIGN. A second copy of the ranking algorithm drifts from the
  // engine — it did: the fallback removed here still used the pre-MS1 absolute density-floor
  // (density<1e-6→0.9, …) that PSN-SYNERGY-INSPECT-MS1 replaced with scale-invariant
  // quantile ranking, so the script and the engine reported divergent ROI bands depending on
  // whether dist/ was built. Single source of truth: require the built engine, fail loud.
  console.error(
    "[psn-synergy-rank] PSNSynergyInspectorEngine not found at " +
    "mcp-server/dist/engines/PSNSynergyInspectorEngine.js.\n" +
    "  Build it first:  cd mcp-server && npm run build:fast\n" +
    "  (No inline fallback — a copy would drift from the engine's ROI banding.)",
  );
  process.exit(1);
}

const report = psnSynergyInspectorEngine.inspect(snap.inventories, { topK: 10 });
const summary = psnSynergyInspectorEngine.summarize(report);

console.log(JSON.stringify({ report, summary }, null, 2));
