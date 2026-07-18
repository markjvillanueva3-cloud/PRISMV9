/**
 * INFRA Phases 2, 4, 8, 9: Remaining Infrastructure Tests
 *
 * Phase 2: pgvector embeddings (U-VEC1, U-VEC2, U-VEC3)
 * Phase 4: Event bus + job queue (U-QUEUE1, U-QUEUE2, U-EVT1, U-EVT2)
 * Phase 8: K8s deployment (U-DEP1, U-DEP2)
 * Phase 9: ML model registry + feature store (U-ML1, U-ML2)
 */
import { describe, it, expect, beforeEach } from "vitest";

// ─── Phase 2: Embedding Pipeline ────────────────────────────────────────────

describe("EmbeddingPipeline — in-memory search (U-VEC2/3)", () => {
  let engine: any;

  beforeEach(async () => {
    const mod = await import("../engines/EmbeddingPipelineEngine.js");
    engine = new mod.EmbeddingPipelineEngine();
  });

  it("should add and search records", async () => {
    engine.addRecord("tips", "tip-1", "Use carbide endmill for titanium roughing at low speeds");
    engine.addRecord("tips", "tip-2", "Flood coolant recommended for stainless steel");
    engine.addRecord("tips", "tip-3", "HSS drill bits work for aluminum at high feeds");

    const results = await engine.search({ query: "titanium roughing carbide", entity_type: "tips" });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("tip-1");
    expect(results[0].score).toBeGreaterThan(0);
  });

  it("should return empty for no matches", async () => {
    engine.addRecord("tips", "tip-1", "flood coolant for steel");
    const results = await engine.search({ query: "quantum physics", entity_type: "tips" });
    expect(results).toHaveLength(0);
  });

  it("should respect limit parameter", async () => {
    for (let i = 0; i < 20; i++) {
      engine.addRecord("tools", `tool-${i}`, `Carbide endmill ${i}mm for steel milling roughing`);
    }
    const results = await engine.search({ query: "carbide endmill steel", entity_type: "tools", limit: 5 });
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("should report stats", () => {
    engine.addRecord("tips", "t1", "tip one");
    engine.addRecord("tools", "t2", "tool two");
    const stats = engine.getStats();
    expect(stats.model).toBe("all-mpnet-base-v2");
    expect(stats.dimensions).toBe(768);
    expect(stats.entities.tips.total).toBe(1);
    expect(stats.entities.tools.total).toBe(1);
  });
});

describe("Migration 016 — pgvector embeddings SQL", () => {
  it("should have correct SQL structure", async () => {
    const { readFile } = await import("fs/promises");
    const sql = await readFile("H:/prism/src/db/migrations/016-pgvector-embeddings.sql", "utf8");
    expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS vector");
    expect(sql).toContain("tool_embeddings");
    expect(sql).toContain("tip_embeddings");
    expect(sql).toContain("material_embeddings");
    expect(sql).toContain("strategy_embeddings");
    expect(sql).toContain("vector(768)");
    expect(sql).toContain("ivfflat");
    expect(sql).toContain("hybrid_search_tips");
    expect(sql).toContain("embedding_stats");
    expect(sql).toContain("vector_cosine_ops");
  });
});

// ─── Phase 4: Job Queue ─────────────────────────────────────────────────────

describe("DurableJobQueue — enqueue and process (U-QUEUE1/2)", () => {
  let engine: any;

  beforeEach(async () => {
    const mod = await import("../engines/DurableJobQueueEngine.js");
    engine = new mod.DurableJobQueueEngine();
  });

  it("should enqueue a job", async () => {
    const job = await engine.enqueue("test-queue", { value: 42 });
    expect(job.id).toBeDefined();
    expect(job.status).toBe("pending");
    expect(job.data.value).toBe(42);
  });

  it("should process job with registered handler", async () => {
    let processed = false;
    engine.registerHandler("test", async (data: any) => {
      processed = true;
      return { result: data.value * 2 };
    });

    const job = await engine.enqueue("test", { value: 21 });
    // Wait for async processing
    await new Promise(r => setTimeout(r, 50));
    const updated = engine.getJob(job.id);
    expect(updated.status).toBe("completed");
    expect(processed).toBe(true);
  });

  it("should enforce idempotency", async () => {
    const job1 = await engine.enqueue("q", { v: 1 }, { idempotency_key: "unique-123" });
    const job2 = await engine.enqueue("q", { v: 2 }, { idempotency_key: "unique-123" });
    expect(job1.id).toBe(job2.id); // Same job returned
  });

  it("should move failed jobs to dead letter queue", async () => {
    engine.registerHandler("failing", async () => {
      throw new Error("Intentional failure");
    });

    const job = await engine.enqueue("failing", {}, { max_retries: 1 });
    await new Promise(r => setTimeout(r, 200));

    const updated = engine.getJob(job.id);
    expect(updated.status).toBe("dead_letter");
    expect(updated.error).toContain("Intentional failure");
  });

  it("should report queue stats", async () => {
    await engine.enqueue("stats-q", { a: 1 });
    await engine.enqueue("stats-q", { b: 2 });
    const stats = engine.getQueueStats("stats-q");
    expect(stats.queue).toBe("stats-q");
    expect(stats.pending + stats.active + stats.completed).toBeGreaterThanOrEqual(2);
  });

  it("should retry dead-lettered jobs", async () => {
    let shouldSucceed = false;
    engine.registerHandler("retry-test", async () => {
      if (!shouldSucceed) throw new Error("Not yet");
      return "success";
    });

    const job = await engine.enqueue("retry-test", {}, { max_retries: 1 });
    await new Promise(r => setTimeout(r, 200));
    expect(engine.getJob(job.id).status).toBe("dead_letter");

    // Now make handler succeed
    shouldSucceed = true;
    const result = await engine.retryJob(job.id);
    expect(result.ok).toBe(true);

    await new Promise(r => setTimeout(r, 200));
    expect(engine.getJob(job.id).status).toBe("completed");
  });
});

// ─── Phase 4: Event Bus ─────────────────────────────────────────────────────

describe("EventBus — publish and subscribe (U-EVT1/2)", () => {
  let bus: any;

  beforeEach(async () => {
    const mod = await import("../engines/EventBusEngine.js");
    bus = new mod.EventBusEngine();
    await bus.init();
  });

  it("should publish an event", async () => {
    const id = await bus.publish({
      type: "machine.status_change",
      version: 1,
      source: "opc-ua",
      data: { machine_id: "haas-vf2", status: "running" },
    });
    expect(id).toMatch(/^evt_/);
  });

  it("should deliver to subscribers", async () => {
    let received: any = null;
    bus.subscribe("machine.alarm", async (event: any) => {
      received = event;
    });

    await bus.publish({
      type: "machine.alarm",
      version: 1,
      source: "opc-ua",
      data: { alarm_code: "E0100", severity: "critical" },
    });

    expect(received).not.toBeNull();
    expect(received.data.alarm_code).toBe("E0100");
    expect(received.version).toBe(1);
  });

  it("should support wildcard subscriptions", async () => {
    const events: any[] = [];
    bus.subscribe("*", async (event: any) => { events.push(event); });

    await bus.publish({ type: "a", version: 1, source: "test", data: {} });
    await bus.publish({ type: "b", version: 1, source: "test", data: {} });

    expect(events).toHaveLength(2);
  });

  it("should move failed events to dead letter", async () => {
    bus.subscribe("fail-type", async () => { throw new Error("handler crash"); });
    await bus.publish({ type: "fail-type", version: 1, source: "test", data: {} });

    const dlq = bus.getDeadLetterQueue();
    expect(dlq.length).toBeGreaterThan(0);
  });

  it("should replay recent events", async () => {
    await bus.publish({ type: "x", version: 1, source: "test", data: { n: 1 } });
    await bus.publish({ type: "x", version: 1, source: "test", data: { n: 2 } });
    await bus.publish({ type: "y", version: 1, source: "test", data: { n: 3 } });

    const xEvents = bus.getRecentEvents("x");
    expect(xEvents).toHaveLength(2);

    const allEvents = bus.getRecentEvents();
    expect(allEvents).toHaveLength(3);
  });

  it("should report stats", () => {
    const stats = bus.getStats();
    expect(stats.mode).toBe("memory");
    expect(stats.total_events).toBe(0);
  });
});

// ─── Phase 8: Deployment ────────────────────────────────────────────────────

describe("Deployment — Docker + K8s (U-DEP1/2)", () => {
  it("should have production stage in Dockerfile", async () => {
    const { readFile } = await import("fs/promises");
    const dockerfile = await readFile("H:/prism/Dockerfile", "utf8");
    expect(dockerfile).toContain("AS production");
    expect(dockerfile).not.toMatch(/AS runtime\b/);
    expect(dockerfile).toContain("HEALTHCHECK");
    expect(dockerfile).toContain("NODE_ENV=production");
  });

  it("should use env vars for passwords in docker-compose", async () => {
    const { readFile } = await import("fs/promises");
    const compose = await readFile("H:/prism/docker-compose.dev.yml", "utf8");
    expect(compose).toContain("${POSTGRES_PASSWORD:-prism-dev}");
    expect(compose).not.toMatch(/POSTGRES_PASSWORD:\s+prism-dev\s*$/m);
  });

  it("should have K8s manifests", async () => {
    const { readFile } = await import("fs/promises");
    const k8s = await readFile("H:/prism/deploy/k8s/prism-deployment.yaml", "utf8");
    expect(k8s).toContain("kind: Deployment");
    expect(k8s).toContain("kind: StatefulSet");
    expect(k8s).toContain("kind: Secret");
    expect(k8s).toContain("kind: ConfigMap");
    expect(k8s).toContain("kind: Ingress");
    expect(k8s).toContain("kind: HorizontalPodAutoscaler");
    expect(k8s).toContain("kind: Service");
    // PVC for Postgres
    expect(k8s).toContain("volumeClaimTemplates");
    // Resource limits
    expect(k8s).toContain("resources:");
    expect(k8s).toContain("limits:");
    // Health probes
    expect(k8s).toContain("readinessProbe");
    expect(k8s).toContain("livenessProbe");
    expect(k8s).toContain("/health");
    expect(k8s).toContain("/ready");
    // Secrets from env
    expect(k8s).toContain("secretKeyRef");
    expect(k8s).not.toContain("prism-dev-only");
    expect(k8s).not.toContain("prism-admin");
  });
});

// ─── Phase 9: ML Model Registry ─────────────────────────────────────────────

describe("ModelRegistry — model lifecycle (U-ML1)", () => {
  let engine: any;

  beforeEach(async () => {
    const mod = await import("../engines/ModelRegistryEngine.js");
    engine = new mod.ModelRegistryEngine();
  });

  it("should register a model", () => {
    const model = engine.registerModel({
      id: "cycle-time-v1",
      name: "Cycle Time Predictor",
      version: "1.0.0",
      model_type: "cycle_time",
      format: "onnx",
      input_schema: { cutting_speed: "float", feed_rate: "float" },
      output_schema: { cycle_time_s: "float" },
    });
    expect(model.id).toBe("cycle-time-v1");
    expect(model.status).toBe("registered");
  });

  it("should list models", () => {
    engine.registerModel({ id: "m1", name: "M1", version: "1.0.0", model_type: "tool_life", format: "onnx", input_schema: {}, output_schema: {} });
    engine.registerModel({ id: "m2", name: "M2", version: "1.0.0", model_type: "surface_finish", format: "onnx", input_schema: {}, output_schema: {} });
    expect(engine.listModels()).toHaveLength(2);
  });

  it("should filter by model type", () => {
    engine.registerModel({ id: "m1", name: "M1", version: "1.0.0", model_type: "tool_life", format: "onnx", input_schema: {}, output_schema: {} });
    engine.registerModel({ id: "m2", name: "M2", version: "1.0.0", model_type: "surface_finish", format: "onnx", input_schema: {}, output_schema: {} });
    const toolLife = engine.listModels({ model_type: "tool_life" });
    expect(toolLife).toHaveLength(1);
    expect(toolLife[0].id).toBe("m1");
  });

  it("should deprecate a model", () => {
    engine.registerModel({ id: "old", name: "Old", version: "0.1.0", model_type: "cycle_time", format: "onnx", input_schema: {}, output_schema: {} });
    const result = engine.deprecateModel("old");
    expect(result.ok).toBe(true);
    expect(engine.getModel("old").status).toBe("deprecated");
  });

  it("should set A/B traffic split", () => {
    engine.registerModel({ id: "ab-test", name: "AB", version: "1.0.0", model_type: "cycle_time", format: "onnx", input_schema: {}, output_schema: {} });
    engine.setTrafficSplit("ab-test", 30);
    expect(engine.getModel("ab-test").ab_traffic_pct).toBe(30);
  });

  it("should reject invalid traffic split", () => {
    engine.registerModel({ id: "bad", name: "Bad", version: "1.0.0", model_type: "cycle_time", format: "onnx", input_schema: {}, output_schema: {} });
    expect(engine.setTrafficSplit("bad", 150).ok).toBe(false);
    expect(engine.setTrafficSplit("bad", -10).ok).toBe(false);
  });

  it("should register feature sets", () => {
    const fs = engine.registerFeatureSet({
      id: "sf-features",
      name: "Speed/Feed Features",
      features: ["cutting_speed", "feed_rate", "depth_of_cut", "material_kc1_1"],
      model_versions: ["cycle-time-v1"],
      lineage: { source_table: "prediction_outcomes", transform: "SELECT ...", last_computed: new Date().toISOString() },
    });
    expect(fs.id).toBe("sf-features");
    expect(fs.features).toHaveLength(4);
  });

  it("should check retraining triggers", () => {
    engine.setRetrainingThreshold("model-a", 1000);
    const triggers = engine.checkRetrainingTriggers(500);
    expect(triggers).toHaveLength(1);
    expect(triggers[0].triggered).toBe(false);

    const triggered = engine.checkRetrainingTriggers(1500);
    expect(triggered[0].triggered).toBe(true);
  });
});

describe("Migration 017 — feature store SQL", () => {
  it("should have correct SQL structure", async () => {
    const { readFile } = await import("fs/promises");
    const sql = await readFile("H:/prism/src/db/migrations/017-feature-store.sql", "utf8");
    expect(sql).toContain("feature_sets");
    expect(sql).toContain("feature_values");
    expect(sql).toContain("feature_lineage");
    expect(sql).toContain("model_versions");
    expect(sql).toContain("retraining_triggers");
    expect(sql).toContain("training_data_summary");
    expect(sql).toContain("JSONB");
    expect(sql).toContain("auto_retrain");
  });
});
