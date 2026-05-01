import { readFileSync, writeFileSync, existsSync } from "fs";
const path = "mcp-server/data/state/session-file-ownership.json";
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

function tryClear(obj) {
  if (!obj || typeof obj !== "object") return;
  for (const k of Object.keys(obj)) {
    const norm = k.replace(/\\/g, "/");
    let matched = false;
    for (const t of tokens) {
      if (norm.endsWith(t)) { delete obj[k]; cleared++; matched = true; break; }
    }
    if (!matched && obj[k] && typeof obj[k] === "object") tryClear(obj[k]);
  }
}
tryClear(data);
writeFileSync(path, JSON.stringify(data, null, 2));
console.log("cleared", cleared, "ownership entries from", path);
