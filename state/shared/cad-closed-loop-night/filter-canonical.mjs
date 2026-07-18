// filter-canonical.mjs -- one-shot: reduce raw H:-drive modality manifests to the canonical
// training corpus (H:\prism tree only; excludes generated/staging outputs + slot-worktree copies).
// Part of the 2026-07-02 closed-loop night setup (slot:delta).
import fs from "node:fs";
import path from "node:path";

const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const mods = ["brep", "cnc", "pdf", "mcad", "f3d", "mcam", "vec2d", "tif"];
const EXCLUDE = /\\state\\shared\\(cad-regen-output|cad-gen-loop|cad-closed-loop-night|cad-fusion-live)\\|\\tmp\\|\.bak/i;
const out = {};
for (const m of mods) {
  const lines = fs.readFileSync(path.join(dir, `manifest-${m}.txt`), "utf8").split(/\r?\n/).filter(Boolean);
  const canon = lines.filter((p) => {
    const lp = p.toLowerCase();
    if (!lp.startsWith("h:\\prism\\")) return false;
    if (EXCLUDE.test(lp)) return false;
    return true;
  });
  fs.writeFileSync(path.join(dir, `manifest-${m}.canonical.txt`), canon.join("\n") + "\n");
  out[m] = canon.length;
}
out.deltaGeneratedBrep = fs.readFileSync(path.join(dir, "manifest-brep.txt"), "utf8")
  .split(/\r?\n/).filter((p) => p.toLowerCase().startsWith("h:\\prism-slot-delta\\")).length;
fs.writeFileSync(path.join(dir, "canonical-counts.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
