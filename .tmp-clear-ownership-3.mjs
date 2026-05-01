import { readFileSync, writeFileSync } from "fs";
const path = "mcp-server/data/state/session-file-ownership.json";
const d = JSON.parse(readFileSync(path, "utf-8"));
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
for (const k of Object.keys(d.files || {})) {
  const norm = k.replace(/\\/g, "/");
  for (const t of tokens) {
    if (norm.endsWith(t)) { delete d.files[k]; cleared++; break; }
  }
}
writeFileSync(path, JSON.stringify(d, null, 2));
console.log("cleared", cleared, "entries from files{}");
