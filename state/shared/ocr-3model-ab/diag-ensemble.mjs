// One-shot ensemble dropout diagnostic -- why does a model fail to survive?
import { tmpdir } from "node:os";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { generateSyntheticPrint } from "../../../scripts/lib/vision-ab-compare.mjs";
import { runEnsembleOverImage } from "../../../scripts/lib/vision-ensemble-fuse.mjs";

const PY = "H:/Tools/python/python.exe";
const GEN = "H:/prism/scripts/lib/synthetic-print-gen.py";
const OLLAMA = "http://127.0.0.1:11434";
const MODELS = ["qwen3-vl:8b-instruct", "qwen2.5vl:7b", "llama3.2-vision:11b"];

const wd = join(tmpdir(), `diag-ens-${process.pid}`);
mkdirSync(wd, { recursive: true });

for (const difficulty of ["easy", "hard"]) {
  for (let i = 0; i < 2; i++) {
    const seed = 7000 + (difficulty === "hard" ? 100 : 0) + i;
    const g = generateSyntheticPrint({ seed, workDir: wd, difficulty, python: PY, gen: GEN });
    if (g.error) { console.log(`seed ${seed}: gen FAIL ${g.error}`); continue; }
    const res = await runEnsembleOverImage({ png: g.png, models: MODELS, assumeUnits: "in", ollamaUrl: OLLAMA, maxTimeSec: 90, workDir: wd });
    console.log(`\nseed ${seed} [${difficulty}] models_ok=${res.models_ok} models_failed=${res.models_failed}`);
    for (const r of res.per_model_runs) {
      console.log(`  ${r.model.padEnd(24)} ok=${r.ok} ms=${r.ms} dims=${r.dim_count} err=${r.error || "-"}`);
    }
  }
}
