/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch20:
 *   U-LWB55: lathe_lora_ensemble_vote   → LatheLoRAEnsembleVoterEngine.vote
 *   U-LWB56: lathe_lora_embedding_stats → LatheLoRAEmbeddingCacheEngine.getStats
 *   U-LWB57: lathe_agi_kg_query         → LatheAGIKnowledgeUnificationEngine.query
 *
 * Three more previously-unwired Lathe LoRA/AGI engines:
 *   - Ensemble voter: combines ModelPrediction[] into VotingResult with consensus
 *   - Embedding cache: cosine-similarity embedding store with hit/miss stats
 *   - AGI knowledge graph: queries unified node + edge graph by type/filter
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch20 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_lora_ensemble_vote"');
    expect(src).toContain('"lathe_lora_embedding_stats"');
    expect(src).toContain('"lathe_agi_kg_query"');
  });

  it("the LATHE-WIRE-MS0/Batch20 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch20: ensemble voter + embedding cache + AGI knowledge graph");
  });
});

describe("U-LWB55 — lathe_lora_ensemble_vote wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAEnsembleVoterEngine and calls vote(predictions, strategy)", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_ensemble_vote"');
    expect(src).toContain("LatheLoRAEnsembleVoterEngine.js");
    expect(src).toContain("latheLoRAEnsembleVoterEngine.vote");
    expect(src).toMatch(/case "lathe_lora_ensemble_vote"[\s\S]{0,1500}latheLoRAEnsembleVoterEngine\.vote\(\s*predictions[\s\S]{0,200}input\.strategy/);
  });

  it("case validates input.predictions is array AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_ensemble_vote"[\s\S]{0,1500}input required \(\{predictions, strategy\?\}\)/);
    expect(src).toMatch(/case "lathe_lora_ensemble_vote"[\s\S]{0,1500}input\.predictions \(ModelPrediction\[\]\) required/);
    expect(src).toMatch(/case "lathe_lora_ensemble_vote"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_ensemble_vote with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_ensemble_vote:");
    expect(src).toMatch(/lathe_lora_ensemble_vote:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheLoRAEnsembleVoterEngine exports the singleton + vote method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAEnsembleVoterEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAEnsembleVoterEngine\s*=\s*new LatheLoRAEnsembleVoterEngine\(\)/);
    expect(src).toMatch(/vote\(\s*predictions:\s*ModelPrediction\[\][\s\S]{0,200}strategy\?:\s*VotingStrategy/);
  });
});

describe("U-LWB56 — lathe_lora_embedding_stats wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAEmbeddingCacheEngine and calls getStats", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_embedding_stats"');
    expect(src).toContain("LatheLoRAEmbeddingCacheEngine.js");
    expect(src).toContain("latheLoRAEmbeddingCacheEngine.getStats");
  });

  it("case wraps engine call in try/catch with stats wrapper", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_embedding_stats"[\s\S]{0,800}stats:\s*latheLoRAEmbeddingCacheEngine\.getStats/);
    expect(src).toMatch(/case "lathe_lora_embedding_stats"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_embedding_stats as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_embedding_stats:");
    expect(src).toMatch(/lathe_lora_embedding_stats:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: LatheLoRAEmbeddingCacheEngine exports the singleton + getStats method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAEmbeddingCacheEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAEmbeddingCacheEngine\s*=\s*new LatheLoRAEmbeddingCacheEngine\(\)/);
    expect(src).toMatch(/getStats\(\):\s*CacheStats/);
  });
});

describe("U-LWB57 — lathe_agi_kg_query wiring", () => {
  it("dispatcher case lazy-imports LatheAGIKnowledgeUnificationEngine and calls query", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_agi_kg_query"');
    expect(src).toContain("LatheAGIKnowledgeUnificationEngine.js");
    expect(src).toContain("latheAGIKnowledgeUnificationEngine.query");
  });

  it("case defaults input to {} when missing AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_agi_kg_query"[\s\S]{0,1500}typeof input === "object" \? input : \{\}/);
    expect(src).toMatch(/case "lathe_agi_kg_query"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_agi_kg_query with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_agi_kg_query:");
    expect(src).toMatch(/lathe_agi_kg_query:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheAGIKnowledgeUnificationEngine exports the singleton + query method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheAGIKnowledgeUnificationEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheAGIKnowledgeUnificationEngine\s*=\s*new LatheAGIKnowledgeUnificationEngine\(\)/);
    expect(src).toMatch(/query\(\s*input:\s*QueryInput[\s\S]{0,80}\):\s*QueryResult/);
  });
});
