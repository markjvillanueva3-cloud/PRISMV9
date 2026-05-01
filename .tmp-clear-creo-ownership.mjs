import { readFileSync, writeFileSync, existsSync } from "fs";
const path = ".claude/state/file-ownership.json";
if (!existsSync(path)) { console.log("no ownership file"); process.exit(0); }
const data = JSON.parse(readFileSync(path, "utf-8"));
const tokens = [
  "creo/mill_turn.json",
  "creo/milling.json",
  "creo/prismatic.json",
  "creo/turning.json",
  "patch-creo-fidx.mjs",
  "CreoFunctionIndexEngine.test.ts",
  "CreoFunctionIndexEngine.ts",
  "camDispatcher.ts",
];
let cleared = 0;
for (const k of Object.keys(data)) {
  const norm = k.replace(/\\/g, "/");
  for (const t of tokens) {
    if (norm.endsWith(t)) { delete data[k]; cleared++; break; }
  }
}
writeFileSync(path, JSON.stringify(data, null, 2));
console.log("cleared", cleared, "ownership entries");
