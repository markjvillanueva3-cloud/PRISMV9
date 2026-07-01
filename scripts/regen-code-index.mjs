import { readdirSync, existsSync, statSync, writeFileSync } from "fs";
import { join } from "path";

const root = ".";
const cats = {
  E: { label: "Engine", prefix: "E", dir: "src/engines", ext: ".ts", count: 0 },
  D: { label: "Dispatcher", prefix: "D", dir: "src/tools/dispatchers", ext: ".ts", count: 0 },
  A: { label: "Algorithm", prefix: "A", dir: "src/algorithms", ext: ".ts", count: 0 },
  S: { label: "Schema", prefix: "S", dir: "src/schemas", ext: ".ts", count: 0 },
  H: { label: "Hook", prefix: "H", dir: "src/hooks", ext: ".ts", count: 0 },
  U: { label: "Util", prefix: "U", dir: "src/utils", ext: ".ts", count: 0 },
  RG: { label: "Registry", prefix: "RG", dir: "src/registries", ext: ".ts", count: 0 },
  SV: { label: "Service", prefix: "SV", dir: "src/services", ext: ".ts", count: 0 },
  T: { label: "Test", prefix: "T", dir: "src/__tests__", ext: ".ts", count: 0 },
  C: { label: "Catalog", prefix: "C", dir: "src/data", ext: ".ts", count: 0 },
  M: { label: "Milestone", prefix: "M", dir: "data/milestones", ext: ".json", count: 0 },
  DOC: { label: "Doc", prefix: "DOC", dir: "data/docs", ext: ".md", count: 0 },
  R: { label: "Root", prefix: "R", dir: "src", ext: ".ts", count: 0, topOnly: true },
};

const codes = {};
const reverse = {};

for (const [catKey, cat] of Object.entries(cats)) {
  const dirPath = join(root, cat.dir);
  if (!existsSync(dirPath)) continue;
  let files;
  if (cat.topOnly) {
    files = readdirSync(dirPath).filter(f => f.endsWith(cat.ext) && !statSync(join(dirPath, f)).isDirectory());
  } else {
    files = readdirSync(dirPath).filter(f => f.endsWith(cat.ext));
  }
  files.sort();
  let idx = 1;
  for (const f of files) {
    if (f === "index.ts" && catKey !== "R") continue;
    const name = f.replace(/\.ts$/, "").replace(/\.json$/, "").replace(/\.md$/, "")
      .replace(/Engine$/, "").replace(/Dispatcher$/, "");
    const padLen = (catKey === "E" || catKey === "T") ? 4 : 2;
    const code = cat.prefix + String(idx).padStart(padLen, "0");
    const filePath = cat.dir + "/" + f;
    codes[code] = { code, path: filePath, name, category: catKey };
    reverse[filePath] = code;
    idx++;
  }
  cat.count = idx - 1;
}

// External codes
const externals = [
  { code: "X01", path: "data/roadmap-index.json", name: "ROADMAP" },
  { code: "X02", path: "data/quick-ref.json", name: "QUICK_REF" },
  { code: "X03", path: "tsconfig.json", name: "TSCONFIG" },
  { code: "X04", path: "vitest.config.ts", name: "VITEST_CONFIG" },
  { code: "X05", path: "package.json", name: "PACKAGE" },
  { code: "X06", path: "data/docs/MEMORY.md", name: "MEMORY" },
];
for (const ext of externals) {
  codes[ext.code] = { ...ext, category: "X" };
  reverse[ext.path] = ext.code;
}

const total = Object.keys(codes).length;
const data = {
  _meta: { version: "2.0.0", generated: new Date().toISOString(), total_codes: total, root: "mcp-server/" },
  categories: Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, { label: v.label, prefix: v.prefix, count: v.count, dir: v.dir }])),
  codes,
  reverse,
};

writeFileSync("data/docs/CODE_SYSTEM_INDEX.json", JSON.stringify(data, null, 2));
console.log("Generated CODE_SYSTEM_INDEX.json with " + total + " codes");
for (const [k, v] of Object.entries(cats)) {
  if (v.count > 0) console.log("  " + k + "=" + v.label + ": " + v.count);
}
