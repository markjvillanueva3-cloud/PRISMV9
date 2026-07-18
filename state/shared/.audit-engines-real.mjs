// Real engine wiring detector — parses dispatcher imports and compares to untracked engines
import fs from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const GREP_PATH = "C:/Users/wompu/.claude/projects/H--prism/88901d4c-78ff-47d2-9a01-c992989d78eb/tool-results/toolu_01RrEAxWiaqSYPGxD4Zteic8.txt";
const FILES_LIST = path.join(ROOT, "state/shared/.untracked-files-list.txt");

const grep = fs.readFileSync(GREP_PATH, "utf8");
const files = fs.readFileSync(FILES_LIST, "utf8").split(/\r?\n/).filter(Boolean);

// Parse: dispatcher -> Set<EngineName>
const dispatcherToEngines = {};
const engineToDispatchers = {};
const lines = grep.split(/\r?\n/);
for (const line of lines) {
  const m = line.match(/dispatchers[\\\/]([\w]+Dispatcher)\.ts.*?engines\/(\w+Engine)/);
  if (!m) continue;
  const disp = m[1];
  const eng = m[2];
  if (!dispatcherToEngines[disp]) dispatcherToEngines[disp] = new Set();
  dispatcherToEngines[disp].add(eng);
  if (!engineToDispatchers[eng]) engineToDispatchers[eng] = new Set();
  engineToDispatchers[eng].add(disp);
}
const wiredEngineNames = new Set(Object.keys(engineToDispatchers));
console.error(`Wired engine name set (across all 96 dispatchers): ${wiredEngineNames.size}`);
console.error(`Total dispatcher-engine refs: ${lines.length}`);

// Now intersect with untracked engines
const untrackedEngines = files.filter(f => /^mcp-server\/src\/engines\/.*\.ts$/.test(f) && !f.endsWith(".test.ts"));
console.error(`Untracked engines: ${untrackedEngines.length}`);

const wired = [];
const orphan = [];
for (const eng of untrackedEngines) {
  const base = path.basename(eng, ".ts");
  if (wiredEngineNames.has(base)) {
    wired.push({ rel: eng, base, dispatchers: [...engineToDispatchers[base]] });
  } else {
    orphan.push({ rel: eng, base });
  }
}
console.error(`Wired (dispatcher imports them): ${wired.length}`);
console.error(`Orphan (no dispatcher import): ${orphan.length}`);

// Sample some
console.log("\nWIRED SAMPLES (10):");
for (const w of wired.slice(0, 10)) {
  console.log(`  ${w.rel}`);
  console.log(`    dispatchers: ${w.dispatchers.join(", ")}`);
}
console.log("\nORPHAN SAMPLES (10):");
for (const o of orphan.slice(0, 10)) {
  console.log(`  ${o.rel}`);
}

// Save data for use in main report
fs.writeFileSync(path.join(ROOT, "state/shared/.untracked-engine-wiring.json"), JSON.stringify({
  wiredCount: wired.length,
  orphanCount: orphan.length,
  totalUntrackedEngines: untrackedEngines.length,
  totalRefsParsed: lines.length,
  wiredEngineNamesInDispatchers: wiredEngineNames.size,
  wired: wired,
  orphan: orphan,
}, null, 2));
console.error("\nWrote: state/shared/.untracked-engine-wiring.json");
