/**
 * verify-hurco-winmax-lathe.ts -- source-level NC verification for the Hurco WinMax lathe post.
 * (U-PP-HURCO-WINMAX-LATHE-GENERATOR, slot:echo 2026-06-27)
 *
 * Generates NC for each corpus latheJob through the new engine and writes it to disk so the dialect
 * linter can score it. Used because the live :3100 caches a stale build -- this proves the engine at
 * source. Run: npx tsx scripts/verify-hurco-winmax-lathe.ts
 */
import { hurcoWinMaxLatheMasterPostEngine } from "../mcp-server/src/engines/HurcoWinMaxLatheMasterPostEngine.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const corpus = JSON.parse(readFileSync("state/shared/post-training/post-training-corpus.json", "utf8"));
const outDir = "state/shared/post-training/nc-hurco-lathe-verify";
mkdirSync(outDir, { recursive: true });

const written: string[] = [];
for (const job of corpus.latheJobs as Array<{ id: string; operations: unknown[]; config?: unknown }>) {
  const out = hurcoWinMaxLatheMasterPostEngine.generateProgram(job.operations as never, job.config as never);
  const f = `${outDir}/hurco-winmax-lathe-${job.id}.nc`;
  writeFileSync(f, out.gcode.join("\n") + "\n");
  written.push(f);
  console.log(`${job.id}: ${out.total_lines} lines, skipped=${out.skipped_operations}, warnings=${out.warnings.length}, dialect=${out.dialect} -> ${f}`);
}
console.log("FILES:" + written.join(" "));
