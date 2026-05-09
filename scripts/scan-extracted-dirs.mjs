import fs from "node:fs";
import path from "node:path";

function walk(dir, depth, results) {
  if (depth > 5) return;
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", ".git", "dist", ".next", "build"].includes(e.name)) continue;
      if (!e.isDirectory()) continue;
      const full = path.join(dir, e.name);
      const lo = e.name.toLowerCase();
      if (
        lo === "extracted" ||
        lo === "extraction" ||
        lo === "extracts" ||
        lo.startsWith("extract-") ||
        lo.startsWith("extracted-") ||
        lo === "knowledge-extracted" ||
        lo === "formulas-extracted"
      ) {
        results.push(full);
      }
      walk(full, depth + 1, results);
    }
  } catch {}
}

const r = [];
for (const root of ["H:/prism", "H:/PRISM", "H:/"]) {
  if (fs.existsSync(root)) walk(root, 0, r);
}
const seen = new Set();
const unique = r.filter((p) => {
  const k = p.toLowerCase();
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

console.log("EXTRACTED DIRS:", unique.length);
for (const d of unique.sort()) {
  const counts = { ts: 0, json: 0, md: 0, js: 0, total: 0 };
  try {
    const stack = [d];
    while (stack.length && counts.total < 5000) {
      const cur = stack.pop();
      for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
        if (e.isDirectory() && !["node_modules", ".git"].includes(e.name))
          stack.push(path.join(cur, e.name));
        else if (e.isFile()) {
          counts.total++;
          if (e.name.endsWith(".ts")) counts.ts++;
          else if (e.name.endsWith(".json")) counts.json++;
          else if (e.name.endsWith(".md")) counts.md++;
          else if (e.name.endsWith(".js")) counts.js++;
        }
      }
    }
  } catch {}
  console.log(
    `  ts=${counts.ts} json=${counts.json} md=${counts.md} js=${counts.js} total=${counts.total}  ${d}`,
  );
}
