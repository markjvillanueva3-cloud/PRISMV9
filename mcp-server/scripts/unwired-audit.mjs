#!/usr/bin/env node
/**
 * Unwired Engine Audit (refined)
 *
 * For each Engine.ts file, check whether its class name OR singleton name
 * appears anywhere in dispatchers/ or routes/ (literal string search).
 *
 * Output: state/shared/UNWIRED-REFINED-2026-05-07.json
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Derive the repo root from THIS script's location (mcp-server/scripts/) instead
// of the old hardcoded "H:/prism" literal -- that broke every worktree (e.g. a
// slot worktree at H:/prism-slot-tango wrote its audit into the WRONG repo).
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ROOT = join(REPO_ROOT, "mcp-server", "src");
const ENGINES_DIR = join(ROOT, "engines");
const DISPATCHERS_DIR = join(ROOT, "tools/dispatchers");
const ROUTES_DIR = join(ROOT, "routes");

const engines = readdirSync(ENGINES_DIR).filter(
  (f) => f.endsWith("Engine.ts") && !f.includes("-1") && !f.includes("Engi-1"),
);

let combined = "";
for (const f of readdirSync(DISPATCHERS_DIR).filter((f) => f.endsWith(".ts"))) {
  combined += readFileSync(join(DISPATCHERS_DIR, f), "utf8") + "\n";
}
if (existsSync(ROUTES_DIR)) {
  for (const f of readdirSync(ROUTES_DIR).filter((f) => f.endsWith(".ts"))) {
    combined += readFileSync(join(ROUTES_DIR, f), "utf8") + "\n";
  }
}
const indexPath = join(ENGINES_DIR, "index.ts");
if (existsSync(indexPath)) combined += readFileSync(indexPath, "utf8") + "\n";

const unwired = [];
for (const engineFile of engines) {
  const className = engineFile.replace(".ts", "");
  const singletonName = className[0].toLowerCase() + className.slice(1);
  const filePath = join(ENGINES_DIR, engineFile);
  const content = readFileSync(filePath, "utf8");
  if (/\/\/\s*WIRE-EXEMPT/i.test(content) || /\/\*\s*WIRE-EXEMPT/i.test(content)) continue;

  const hasClass = combined.includes(className);
  const hasSingleton = combined.includes(singletonName);

  if (!hasClass && !hasSingleton) {
    unwired.push({ className, singletonName, file: engineFile });
  }
}

const cat = { ai: [], cad: [], cam: [], lathe: [], mill: [], wedm: [], post: [], other: [] };
for (const u of unwired) {
  const lc = u.className.toLowerCase();
  if (
    /^(ai[a-z]|agi|neural|cognitive|reasoning|wisdom|llm|deeplearn|mlmodel|knowledgegraph|memory|consciousness|reinforcement|bayes|metalearning|federatedlearning|attentionmech|transferlearning|ensemble)/.test(
      lc,
    )
  )
    cat.ai.push(u);
  else if (
    /^(cad|sketch|geometry|nurbs|bspline|surface(?!finish|integrity|treat)|mesh|brep|stl|step(?!nc)|iges|dxf|loft|extrude|fillet|chamfer|primitive|solid[a-z])/.test(
      lc,
    )
  )
    cat.cad.push(u);
  else if (
    /^(cam[a-z]|toolpath|adaptive|trochoidal|hsm|pocket|contour|profileengine|engagement|chip(thin|load)|imachining|vortex|opti|sketchcam|cycle)/.test(
      lc,
    )
  )
    cat.cam.push(u);
  else if (
    /^(lathe|turning|swiss|millturn|boring|grooving|parting|chuck|tailstock|barfeeder|hardturn)/.test(
      lc,
    )
  )
    cat.lathe.push(u);
  else if (/^mill[a-z]|^milling/.test(lc) && !lc.includes("millturn")) cat.mill.push(u);
  else if (/^(wedm|wireedm|edm|spark|sinker|laser|waterjet|plasma|nontrad)/.test(lc))
    cat.wedm.push(u);
  else if (/^(post[a-z]|gcode|controller|fanuc|siemens|haas|okuma|hurco|mazak|heidenhain|hsm[a-z]*post|fadal|brother)/.test(lc))
    cat.post.push(u);
  else cat.other.push(u);
}

console.log("Total unwired:", unwired.length);
for (const [k, v] of Object.entries(cat)) {
  console.log("  " + k.padEnd(8) + ": " + v.length);
}

// Date-stamp the output (was frozen at 2026-05-07, so re-runs overwrote the same
// stale-named file). PRISM_UNWIRED_AUDIT_DATE overrides for frozen-time runs.
const AUDIT_DATE = process.env.PRISM_UNWIRED_AUDIT_DATE || new Date().toISOString().slice(0, 10);
const OUT_PATH = join(REPO_ROOT, "state", "shared", `UNWIRED-REFINED-${AUDIT_DATE}.json`);
writeFileSync(
  OUT_PATH,
  JSON.stringify({ generated_at: new Date().toISOString(), total_unwired: unwired.length, by_domain: cat }, null, 2),
);
console.log("Saved: " + OUT_PATH);
