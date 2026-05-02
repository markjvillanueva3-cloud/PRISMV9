/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch14:
 *   U-LWB37: lathe_p2p_reasoning_explain        → LathePrintToProgramReasoningEngine.explain
 *   U-LWB38: lathe_p2p_knowledge_graph_ingest   → LathePrintToProgramKnowledgeGraphEngine.ingest
 *   U-LWB39: lathe_p2p_dl_predict               → LathePrintToProgramDLIntelligenceEngine.predict
 *
 * Three sister AI engines in the print-to-program pipeline:
 *   - Reasoning: emits a step-by-step reasoning trace explaining decisions
 *   - Knowledge Graph: ingests jobs/customers/tools/outcomes into a graph
 *   - DL Intelligence: predicts failure probability from feature vectors
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch14 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_p2p_reasoning_explain"');
    expect(src).toContain('"lathe_p2p_knowledge_graph_ingest"');
    expect(src).toContain('"lathe_p2p_dl_predict"');
  });

  it("the LATHE-WIRE-MS0/Batch14 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch14: print-to-program AI trio (reasoning + knowledge graph + DL prediction)");
  });
});

describe("U-LWB37 — lathe_p2p_reasoning_explain wiring", () => {
  it("dispatcher case lazy-imports LathePrintToProgramReasoningEngine and calls explain", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_p2p_reasoning_explain"');
    expect(src).toContain("LathePrintToProgramReasoningEngine.js");
    expect(src).toContain("lathePrintToProgramReasoningEngine.explain");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_p2p_reasoning_explain"[\s\S]{0,800}input required \(ReasoningInput\)/);
    expect(src).toMatch(/case "lathe_p2p_reasoning_explain"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_p2p_reasoning_explain"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_p2p_reasoning_explain with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_p2p_reasoning_explain:");
    expect(src).toMatch(/lathe_p2p_reasoning_explain:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LathePrintToProgramReasoningEngine exports the singleton + explain method", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePrintToProgramReasoningEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePrintToProgramReasoningEngine\s*=\s*new LathePrintToProgramReasoningEngine\(\)/);
    expect(src).toMatch(/explain\(\s*input:\s*ReasoningInput\s*\):\s*ReasoningTrace/);
  });
});

describe("U-LWB38 — lathe_p2p_knowledge_graph_ingest wiring", () => {
  it("dispatcher case lazy-imports LathePrintToProgramKnowledgeGraphEngine and calls ingest", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_p2p_knowledge_graph_ingest"');
    expect(src).toContain("LathePrintToProgramKnowledgeGraphEngine.js");
    expect(src).toContain("lathePrintToProgramKnowledgeGraphEngine.ingest");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_p2p_knowledge_graph_ingest"[\s\S]{0,800}input required \(IngestionInput\)/);
    expect(src).toMatch(/case "lathe_p2p_knowledge_graph_ingest"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_p2p_knowledge_graph_ingest"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_p2p_knowledge_graph_ingest with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_p2p_knowledge_graph_ingest:");
    expect(src).toMatch(/lathe_p2p_knowledge_graph_ingest:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LathePrintToProgramKnowledgeGraphEngine exports the singleton + ingest method", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePrintToProgramKnowledgeGraphEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePrintToProgramKnowledgeGraphEngine\s*=\s*new LathePrintToProgramKnowledgeGraphEngine\(\)/);
    expect(src).toMatch(/ingest\(\s*input:\s*IngestionInput\s*\):/);
  });
});

describe("U-LWB39 — lathe_p2p_dl_predict wiring", () => {
  it("dispatcher case lazy-imports LathePrintToProgramDLIntelligenceEngine and calls predict", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_p2p_dl_predict"');
    expect(src).toContain("LathePrintToProgramDLIntelligenceEngine.js");
    expect(src).toContain("lathePrintToProgramDLIntelligenceEngine.predict");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_p2p_dl_predict"[\s\S]{0,800}input required \(DLInput\)/);
    expect(src).toMatch(/case "lathe_p2p_dl_predict"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_p2p_dl_predict"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_p2p_dl_predict with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_p2p_dl_predict:");
    expect(src).toMatch(/lathe_p2p_dl_predict:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LathePrintToProgramDLIntelligenceEngine exports the singleton + predict method", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePrintToProgramDLIntelligenceEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePrintToProgramDLIntelligenceEngine\s*=\s*new LathePrintToProgramDLIntelligenceEngine\(\)/);
    expect(src).toMatch(/predict\(\s*input:\s*DLInput\s*\):\s*FailurePrediction/);
  });
});
