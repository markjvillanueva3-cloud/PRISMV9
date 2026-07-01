// Precise manifest of THIS migration's files, WITHOUT enumerating the 351k untracked.
// new+content via filesystem walk (zulu basename OR zulu content); deletions via git diff -D.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const ROOT = "H:/prism";
const roots = ["mcp-server/src", ".claude", "scripts", "state/shared", "knowledge"];
const EXCLUDE_DIR = /[/\\](node_modules|dist|\.git|chunks|\.cache)[/\\]/i;
const EXCLUDE_PATH = /(\.bak|\.archive\.|[/\\]handoffs[/\\]|[/\\]system-viz[/\\].*\.json$|\.jsonl$|\.heapsnapshot$|\.png$|\.gz$)/i;
const TEXT = /\.(ts|tsx|js|mjs|cjs|md|json|html|ps1|txt|ya?ml)$/i;
const add = new Set();
function walk(dir) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name).replace(/\\/g, "/");
    if (EXCLUDE_DIR.test(p + "/")) continue;
    if (e.isDirectory()) walk(p);
    else if (e.isFile() && !EXCLUDE_PATH.test(p)) {
      const rel = p.slice(ROOT.length + 1);
      if (/zulu/i.test(e.name)) { add.add(rel); continue; }       // renamed-new (or zulu-named)
      if (TEXT.test(e.name)) {
        try { const s = fs.statSync(p); if (s.size < 2 * 1024 * 1024 && /zulu/i.test(fs.readFileSync(p, "utf8"))) add.add(rel); } catch {}
      }
    }
  }
}
for (const r of roots) walk(path.join(ROOT, r).replace(/\\/g, "/"));
if (/zulu/i.test(fs.readFileSync(`${ROOT}/CLAUDE.md`, "utf8"))) add.add("CLAUDE.md");
// deletions (renamed-old zebra files) — fast, no untracked enumeration
let del = 0;
try {
  const d = execFileSync("git", ["-C", ROOT, "diff", "--name-only", "--diff-filter=D", "--", ...roots], { encoding: "utf8", maxBuffer: 64 << 20 });
  for (const f of d.split("\n").filter(Boolean)) if (/zebra/i.test(path.basename(f))) { add.add(f); del++; }
} catch (e) { console.log("diff-D warn:", String(e.message || e).slice(0, 80)); }
const manifest = `${ROOT}/state/shared/.zulu-migration-files.txt`;
fs.writeFileSync(manifest, [...add].join("\n") + "\n", "utf8");
console.log(`manifest: ${add.size} files (incl ${del} renamed-old deletions) -> ${manifest}`);
