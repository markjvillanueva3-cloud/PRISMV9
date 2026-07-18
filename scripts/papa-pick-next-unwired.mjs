// papa-pick-next-unwired.mjs — surface NEEDS_WIRING samples + skip already-wired.
// Owned by slot:papa for the WIRE-UNWIRED-PAPA /goal /loop. Tiny pure-read probe.
import fs from "node:fs";
import path from "node:path";

const BUILD_STATE = "H:/PRISM/state/shared/BUILD_STATE.json";
const DEV_DISPATCHER = "H:/PRISM/mcp-server/src/tools/dispatchers/devDispatcher.ts";
const ENGINES_DIR = "H:/PRISM/mcp-server/src/engines";

if (!fs.existsSync(BUILD_STATE)) { console.error("missing BUILD_STATE.json"); process.exit(2); }
const j = JSON.parse(fs.readFileSync(BUILD_STATE, "utf8"));
const samples = j.NEEDS_WIRING?.sample_engines || [];

const devSrc = fs.existsSync(DEV_DISPATCHER) ? fs.readFileSync(DEV_DISPATCHER, "utf8") : "";

const enriched = samples.map(s => {
  const filePath = path.join(ENGINES_DIR, s.name + ".ts");
  const exists = fs.existsSync(filePath);
  const alreadyWired = devSrc.includes(`engines/${s.name}.js`);
  return {
    name: s.name,
    suggestedDispatcher: s.suggestedDispatcher,
    sizeKB: s.sizeKB,
    mtime: s.mtime,
    exists,
    alreadyWiredInDev: alreadyWired,
  };
});

const candidates = enriched.filter(e => e.exists && !e.alreadyWiredInDev);
const skipped = enriched.filter(e => !e.exists || e.alreadyWiredInDev);

if (process.argv.includes("--names")) {
  for (const c of candidates) {
    console.log(`${c.name} | ${c.sizeKB}KB | ${c.suggestedDispatcher}`);
  }
} else {
  console.log(JSON.stringify({
    headline: j.headline,
    sample_total: samples.length,
    ready_to_wire: candidates.length,
    skipped: skipped.length,
    candidates,
    skipped,
  }, null, 2));
}
