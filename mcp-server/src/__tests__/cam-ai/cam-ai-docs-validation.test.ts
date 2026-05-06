/**
 * U-CAM126 — docs/cam-ai/ behavior validation
 *
 * Asserts that the behaviors described in docs/cam-ai/*.md actually
 * hold when you invoke the documented APIs. Each test drives real
 * engine state and asserts real outputs match what the docs claim.
 * If a doc says "weight 1.0 for corrections", the test exports
 * training pairs and asserts the literal float.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { CAMFeedbackLoopEngine } from "../../engines/CAMFeedbackLoopEngine.js";
import { CAMTransferLearningEngine } from "../../engines/CAMTransferLearningEngine.js";
import { CAMModelServingEngine } from "../../engines/CAMModelServingEngine.js";
import type { AGIDecisionTask, SourceKind } from "../../engines/CAMDeepLearningOrchestratorEngine.js";

// ── Path constants ───────────────────────────────────────────────────────
const REPO_ROOT = resolve(__dirname, "../../../..");
const DOCS_DIR = join(REPO_ROOT, "docs", "cam-ai");
const ENGINES_DIR = join(REPO_ROOT, "mcp-server", "src", "engines");
const ROUTES_FILE = join(REPO_ROOT, "mcp-server", "src", "routes", "cam.ts");
const ALERTS_FILE = join(REPO_ROOT, "mcp-server", "web", "src", "data", "camAiAlerts.ts");
const K8S_DIR = join(REPO_ROOT, "k8s", "model-serving");

const EXPECTED_DOCS = [
  "README.md",
  "architecture.md",
  "lora-training.md",
  "docker-deployment.md",
  "model-serving.md",
  "monitoring.md",
];

const TRACKED_ENGINES = [
  "CAMReasoningChainEngine",
  "CAMConfidenceCalibrationEngine",
  "CAMFeedbackLoopEngine",
  "CAMTransferLearningEngine",
  "CAMModelServingEngine",
];

// ── Behavior constants ───────────────────────────────────────────────────
const TASK: AGIDecisionTask = "strategy_recommend";
const SOURCE_OLLAMA: SourceKind = "ollama";

const HOEFFDING_EPSILON_PRODUCTION = 0.05;
const HOEFFDING_FLOOR_PRODUCTION_N = 738;        // ⌈ln(2/0.05)/(2·0.05²)⌉
const HOEFFDING_EPSILON_TEST = 0.20;
const TEST_MIN_SAMPLES_FLOOR = 100;
const HOEFFDING_FLOOR_TEST_N = 47;               // ⌈ln(40)/(2·0.04)⌉
const SAMPLES_TEST_ABOVE_FLOOR = 250;
const SAMPLES_TEST_BELOW_FLOOR = 30;

const CORRECTION_WEIGHT = 1.0;
const CONFIRMATION_WEIGHT = 0.5;
const ROUTING_DETERMINISM_TRIALS = 25;

const TIER1_SLUGS = ["hypermill", "mastercam", "fusion360", "inventor-hsm", "solidcam", "nx"];

const P95_LATENCY_WARN_MS = 200;
const P95_LATENCY_CRIT_MS = 500;

const MIN_ARCH_METHOD_CITATIONS = 5;     // 5 unique calls in arch.md flow + DI examples
const MIN_SERVE_ROUTES = 6;
const MIN_ALERT_LABELS = 5;
const MIN_K8S_MANIFESTS = 5;
const MIN_HEADING_PAYLOAD_LEN = 4;
const VERSION_TAG = "0.1.0";

function readDoc(name: string): string {
  return readFileSync(join(DOCS_DIR, name), "utf8");
}

describe("U-CAM126: docs/cam-ai/ behavior validation", () => {
  beforeEach(() => {
    CAMFeedbackLoopEngine.clearAll();
    CAMTransferLearningEngine.clearAll();
    CAMModelServingEngine.clearAll();
  });
  afterEach(() => {
    CAMModelServingEngine.clearAll();
    CAMTransferLearningEngine.clearAll();
    CAMFeedbackLoopEngine.clearAll();
  });

  // ── Doc-set integrity ────────────────────────────────────────────────

  it("docs/cam-ai/ contains all expected files with non-empty H1 headings and milestone tag", () => {
    const present = readdirSync(DOCS_DIR);
    for (const f of EXPECTED_DOCS) {
      expect(present).toContain(f);
      const txt = readDoc(f);
      const firstHeading = txt.split("\n").find((l) => l.startsWith("# ")) ?? "";
      expect(firstHeading.length).toBeGreaterThan(MIN_HEADING_PAYLOAD_LEN);
      const tagged = txt.includes("CAM AI") || txt.includes("U-CAM");
      expect(tagged).toBe(true);
    }
  });

  // ── lora-training.md behavior claims ─────────────────────────────────

  it("lora-training.md correction-weight claim — recordCorrection → loraTrainingExport produces weight 1.0", () => {
    CAMFeedbackLoopEngine.recordCorrection({
      decisionId: "dec_corr_1",
      task: TASK,
      originalValue: { strategy: "adaptive_clearing" },
      correctedValue: { strategy: "trochoidal" },
      originalSource: SOURCE_OLLAMA,
      reason: "test",
    });
    const pairs = CAMFeedbackLoopEngine.loraTrainingExport({
      task: TASK,
      includeConfirmed: false,
    });
    expect(pairs.length).toBe(1);
    expect(pairs[0].weight).toBe(CORRECTION_WEIGHT);
    expect(pairs[0].source).toBe("correction");
    const docTxt = readDoc("lora-training.md");
    expect(docTxt).toMatch(/Correction.*\|\s*1\.0/);
  });

  it("lora-training.md confirmation-weight claim — recordOutcome(wasCorrect=true) → loraTrainingExport produces weight 0.5", () => {
    CAMFeedbackLoopEngine.recordCorrection({
      decisionId: "dec_mix_a",
      task: TASK,
      originalValue: "x",
      correctedValue: "y",
      originalSource: SOURCE_OLLAMA,
    });
    CAMFeedbackLoopEngine.recordOutcome({
      decisionId: "dec_mix_b",
      task: TASK,
      wasCorrect: true,
      predictedConfidence: 0.9,
    });
    const pairs = CAMFeedbackLoopEngine.loraTrainingExport({
      task: TASK,
      includeConfirmed: true,
    });
    const weights = pairs.map((p) => p.weight).sort();
    expect(weights).toContain(CORRECTION_WEIGHT);
    expect(weights).toContain(CONFIRMATION_WEIGHT);
    const docTxt = readDoc("lora-training.md");
    expect(docTxt).toMatch(/Confirmation.*\|\s*0\.5/);
  });

  it("lora-training.md drift verdict ladder — engine emits insufficient_data with no outcomes", () => {
    const drift = CAMFeedbackLoopEngine.accuracyDrift({ task: TASK });
    expect(drift.verdict).toBe("insufficient_data");
    const docTxt = readDoc("lora-training.md");
    expect(docTxt).toContain("insufficient_data");
    expect(docTxt).toContain("degrading");
    expect(docTxt).toContain("improving");
    expect(docTxt).toContain("no_trend");
  });

  // ── architecture.md tier-1 CAM domain claims ─────────────────────────

  it("architecture.md tier-1 table — every documented slug resolves via CAMTransferLearningEngine.getDomain()", () => {
    const doc = readDoc("architecture.md");
    for (const slug of TIER1_SLUGS) {
      const domain = CAMTransferLearningEngine.getDomain(slug);
      // Real value assertion — no toBeTruthy/toBeDefined.
      expect(domain?.slug).toBe(slug);
      const tableCellRe = new RegExp(`\\|\\s*\`?${slug}\`?\\s*\\|`);
      expect(tableCellRe.test(doc)).toBe(true);
    }
    const supported = new Set(CAMTransferLearningEngine.listSupportedCAMs());
    for (const slug of TIER1_SLUGS) {
      expect(supported.has(slug)).toBe(true);
    }
  });

  // ── model-serving.md Hoeffding gate claims ───────────────────────────

  it("model-serving.md Hoeffding gate claim — promotion is REFUSED below floor", () => {
    // Bring an "active" baseline up through the FSM (pending→shadow→canary→active).
    CAMModelServingEngine.registerModel({
      id: "active_lo",
      name: "active baseline (lo)",
      version: VERSION_TAG,
      backend: "ollama",
      endpoint_url: "http://stub/active-lo",
      cam_systems: ["hypermill"],
      tasks: [TASK],
    });
    CAMModelServingEngine.deployShadow("active_lo");
    CAMModelServingEngine.promoteToCanary("active_lo", 1.0);
    // Set policy with the test ε so the active baseline can reach active.
    CAMModelServingEngine.setRoutingPolicy("hypermill", TASK, "weighted", {
      epsilon: HOEFFDING_EPSILON_TEST,
      min_samples_for_promotion: TEST_MIN_SAMPLES_FLOOR,
    });
    // Feed the baseline above-floor metrics so it can promote to active uncontested.
    for (let i = 0; i < SAMPLES_TEST_ABOVE_FLOOR; i++) {
      CAMModelServingEngine.recordMetric("active_lo", { success: true, latency_ms: 50 });
    }
    CAMModelServingEngine.promoteToActive("active_lo");

    // Now the actual gate test: candidate stays below floor, gate must REFUSE.
    CAMModelServingEngine.registerModel({
      id: "candidate_lo",
      name: "challenger (lo)",
      version: VERSION_TAG,
      backend: "ollama",
      endpoint_url: "http://stub/candidate-lo",
      cam_systems: ["hypermill"],
      tasks: [TASK],
    });
    CAMModelServingEngine.deployShadow("candidate_lo");
    CAMModelServingEngine.promoteToCanary("candidate_lo", 0.10);
    for (let i = 0; i < SAMPLES_TEST_BELOW_FLOOR; i++) {
      CAMModelServingEngine.recordMetric("candidate_lo", { success: true, latency_ms: 50 });
    }
    const env = CAMModelServingEngine.promoteToActive("candidate_lo");
    expect(env.applied).toBe(false);
    expect(env.requires_human_approval).toBe(true);

    const docTxt = readDoc("model-serving.md");
    expect(docTxt).toContain(String(HOEFFDING_FLOOR_PRODUCTION_N));
    expect(docTxt).toContain(String(HOEFFDING_EPSILON_PRODUCTION));
    expect(docTxt).toContain("min_samples_for_promotion");

    expect(SAMPLES_TEST_BELOW_FLOOR).toBeLessThan(HOEFFDING_FLOOR_TEST_N);
    expect(SAMPLES_TEST_BELOW_FLOOR).toBeLessThan(TEST_MIN_SAMPLES_FLOOR);
  });

  it("model-serving.md Hoeffding gate claim — promotion is APPLIED above floor with clean canary", () => {
    CAMModelServingEngine.registerModel({
      id: "active_hi",
      name: "active baseline (hi)",
      version: VERSION_TAG,
      backend: "ollama",
      endpoint_url: "http://stub/active-hi",
      cam_systems: ["hypermill"],
      tasks: [TASK],
    });
    CAMModelServingEngine.deployShadow("active_hi");
    CAMModelServingEngine.promoteToCanary("active_hi", 1.0);
    CAMModelServingEngine.setRoutingPolicy("hypermill", TASK, "weighted", {
      epsilon: HOEFFDING_EPSILON_TEST,
      min_samples_for_promotion: TEST_MIN_SAMPLES_FLOOR,
    });
    // Active baseline must stay clean during canary — auto-rollback fires
    // when error_rate > max_error_rate or canary p95 > active p95 · rollMult.
    // Keep the baseline at 100% success and high latency so it promotes cleanly.
    for (let i = 0; i < SAMPLES_TEST_ABOVE_FLOOR; i++) {
      CAMModelServingEngine.recordMetric("active_hi", { success: true, latency_ms: 80 });
    }
    CAMModelServingEngine.promoteToActive("active_hi");

    CAMModelServingEngine.registerModel({
      id: "candidate_hi",
      name: "challenger (hi)",
      version: VERSION_TAG,
      backend: "ollama",
      endpoint_url: "http://stub/candidate-hi",
      cam_systems: ["hypermill"],
      tasks: [TASK],
    });
    CAMModelServingEngine.deployShadow("candidate_hi");
    CAMModelServingEngine.promoteToCanary("candidate_hi", 0.10);
    // Candidate: 100% success, FASTER than baseline (40ms vs 80ms) — clear
    // Wilson-lower-bound margin and well within p95 latency tolerance.
    for (let i = 0; i < SAMPLES_TEST_ABOVE_FLOOR; i++) {
      CAMModelServingEngine.recordMetric("candidate_hi", { success: true, latency_ms: 40 });
    }
    // Candidate must still be in canary status (no auto-rollback fired).
    const candidateBeforePromote = CAMModelServingEngine.getModel("candidate_hi");
    expect(candidateBeforePromote?.status).toBe("canary");

    const env = CAMModelServingEngine.promoteToActive("candidate_hi");
    expect(env.applied).toBe(true);
    expect(env.requires_human_approval).toBe(false);

    expect(SAMPLES_TEST_ABOVE_FLOOR).toBeGreaterThan(HOEFFDING_FLOOR_TEST_N);
    expect(SAMPLES_TEST_ABOVE_FLOOR).toBeGreaterThan(TEST_MIN_SAMPLES_FLOOR);
  });

  // ── model-serving.md routing determinism claim ───────────────────────

  it("model-serving.md determinism claim — same request_key always hashes to same bucket", () => {
    // Bring an active baseline up so routeRequest has a primary to return.
    CAMModelServingEngine.registerModel({
      id: "active_det",
      name: "active determinism",
      version: VERSION_TAG,
      backend: "ollama",
      endpoint_url: "http://stub/active-det",
      cam_systems: ["hypermill"],
      tasks: [TASK],
    });
    CAMModelServingEngine.deployShadow("active_det");
    CAMModelServingEngine.promoteToCanary("active_det", 1.0);
    CAMModelServingEngine.setRoutingPolicy("hypermill", TASK, "weighted", {
      epsilon: HOEFFDING_EPSILON_TEST,
      min_samples_for_promotion: TEST_MIN_SAMPLES_FLOOR,
    });
    for (let i = 0; i < SAMPLES_TEST_ABOVE_FLOOR; i++) {
      CAMModelServingEngine.recordMetric("active_det", { success: true, latency_ms: 50 });
    }
    CAMModelServingEngine.promoteToActive("active_det");

    // A canary alongside, so the policy could in principle split traffic — but
    // the determinism claim is that the SAME request_key always lands the
    // same way, regardless of canary fraction.
    CAMModelServingEngine.registerModel({
      id: "canary_det",
      name: "canary determinism",
      version: VERSION_TAG,
      backend: "ollama",
      endpoint_url: "http://stub/canary-det",
      cam_systems: ["hypermill"],
      tasks: [TASK],
    });
    CAMModelServingEngine.deployShadow("canary_det");
    CAMModelServingEngine.promoteToCanary("canary_det", 0.5);

    const requestKey = "deterministic_key_xyz";
    const decisions: Array<string | null> = [];
    const buckets: number[] = [];
    for (let i = 0; i < ROUTING_DETERMINISM_TRIALS; i++) {
      const d = CAMModelServingEngine.routeRequest({
        cam_system: "hypermill",
        task: TASK,
        request_key: requestKey,
      });
      decisions.push(d.primary_model_id);
      buckets.push(d.bucket);
    }
    // Every trial returns the SAME primary and the SAME bucket.
    const uniquePrimary = new Set(decisions);
    const uniqueBucket = new Set(buckets);
    expect(uniquePrimary.size).toBe(1);
    expect(uniqueBucket.size).toBe(1);
    expect(decisions.length).toBe(ROUTING_DETERMINISM_TRIALS);

    const docTxt = readDoc("model-serving.md");
    expect(docTxt).toContain("FNV-1a");
  });

  // ── monitoring.md HTTP route surface ─────────────────────────────────

  it("monitoring.md route surface — every cited /serve/ route exists in cam.ts", () => {
    const doc = readDoc("monitoring.md");
    const routes = readFileSync(ROUTES_FILE, "utf8");
    const routeRe = /POST\s+(\/api\/v1\/cam\/serve\/[a-z0-9-]+)/gi;
    const cited = new Set<string>();
    for (const m of doc.matchAll(routeRe)) cited.add(m[1].toLowerCase());
    expect(cited.size).toBeGreaterThanOrEqual(MIN_SERVE_ROUTES);

    const missing: string[] = [];
    for (const path of cited) {
      const relPath = path.replace(/^\/api\/v1\/cam/, "");
      const re = new RegExp(`router\\.post\\(\\s*"${relPath.replace(/\//g, "\\/")}"`);
      if (!re.test(routes)) missing.push(path);
    }
    expect(missing).toEqual([]);
  });

  it("monitoring.md route surface — every cam.ts /serve/ route is documented", () => {
    const doc = readDoc("monitoring.md");
    const routes = readFileSync(ROUTES_FILE, "utf8");
    const reverseRe = /router\.post\(\s*"(\/serve\/[a-z0-9-]+)"/g;
    const inSource = new Set<string>();
    for (const m of routes.matchAll(reverseRe)) {
      inSource.add(`/api/v1/cam${m[1]}`);
    }
    const docRouteRe = /POST\s+(\/api\/v1\/cam\/serve\/[a-z0-9-]+)/gi;
    const cited = new Set<string>();
    for (const m of doc.matchAll(docRouteRe)) cited.add(m[1].toLowerCase());

    const undocumented: string[] = [];
    for (const path of inSource) {
      if (!cited.has(path)) undocumented.push(path);
    }
    expect(undocumented).toEqual([]);
    expect(inSource.size).toBeGreaterThanOrEqual(MIN_SERVE_ROUTES);
  });

  // ── monitoring.md alert table parity ─────────────────────────────────

  it("monitoring.md alert table — every threshold metric label and warn/crit pair matches camAiAlerts.ts", () => {
    const doc = readDoc("monitoring.md");
    const alerts = readFileSync(ALERTS_FILE, "utf8");
    const labelRe = /metric:\s*"([^"]+)"/g;
    const labels: string[] = [];
    for (const m of alerts.matchAll(labelRe)) labels.push(m[1]);
    expect(labels.length).toBeGreaterThanOrEqual(MIN_ALERT_LABELS);

    const missing: string[] = [];
    for (const label of labels) {
      if (!doc.includes(label)) missing.push(label);
    }
    expect(missing).toEqual([]);

    const latencyBlockRe = /id:\s*"p95_latency_ms"[\s\S]*?warn:\s*(\d+)[\s\S]*?crit:\s*(\d+)/;
    const latencyMatch = alerts.match(latencyBlockRe);
    const latencyWarnInSrc = latencyMatch === null ? -1 : Number(latencyMatch[1]);
    const latencyCritInSrc = latencyMatch === null ? -1 : Number(latencyMatch[2]);
    expect(latencyWarnInSrc).toBe(P95_LATENCY_WARN_MS);
    expect(latencyCritInSrc).toBe(P95_LATENCY_CRIT_MS);

    const docTableRe = new RegExp(`p95 Latency[\\s\\S]*?\\|\\s*${P95_LATENCY_WARN_MS}\\s*\\|\\s*${P95_LATENCY_CRIT_MS}\\s*\\|`);
    expect(docTableRe.test(doc)).toBe(true);
  });

  // ── docker-deployment.md k8s manifest set ────────────────────────────

  it("docker-deployment.md k8s manifest set — every cited manifest exists and every actual manifest is cited", () => {
    const doc = readDoc("docker-deployment.md");
    const manifestRe = /k8s\/model-serving\/([a-z0-9-]+\.(yaml|md))/gi;
    const cited = new Set<string>();
    for (const m of doc.matchAll(manifestRe)) cited.add(m[1]);
    expect(cited.size).toBeGreaterThanOrEqual(MIN_K8S_MANIFESTS);

    const missing: string[] = [];
    for (const f of cited) {
      if (!existsSync(join(K8S_DIR, f))) missing.push(f);
    }
    expect(missing).toEqual([]);

    const actualYaml = readdirSync(K8S_DIR).filter((f) => f.endsWith(".yaml"));
    const uncited: string[] = [];
    for (const f of actualYaml) {
      if (!cited.has(f)) uncited.push(f);
    }
    expect(uncited).toEqual([]);
  });

  // ── tracked engine source files ──────────────────────────────────────

  it("every tracked engine source file declares its class", () => {
    for (const name of TRACKED_ENGINES) {
      const path = join(ENGINES_DIR, `${name}.ts`);
      expect(existsSync(path)).toBe(true);
      const src = readFileSync(path, "utf8");
      const re = new RegExp(`export\\s+class\\s+${name}\\b`);
      expect(re.test(src)).toBe(true);
    }
  });

  // ── doc example-block field-name parity (catches API drift in code samples) ──

  // Strips // line comments and extracts top-level (depth-1) object keys
  // from the argument to a function call. Returns null if the call is
  // not present in `block`. Handles nested objects correctly (only
  // returns keys at the call's argument depth).
  function extractTopLevelKeys(block: string, callRegex: RegExp): string[] | null {
    // Strip line comments line-by-line.
    const lines = block.split("\n").map((l) => {
      const idx = l.indexOf("//");
      return idx >= 0 ? l.slice(0, idx) : l;
    });
    const stripped = lines.join("\n");
    const m = callRegex.exec(stripped);
    if (m === null) return null;
    // Find the opening `{` after the match end and walk until matching `}`.
    let i = m.index + m[0].length;
    while (i < stripped.length && stripped[i] !== "{") i++;
    if (i >= stripped.length) return null;
    const start = i + 1;
    let depth = 1;
    i++;
    while (i < stripped.length && depth > 0) {
      const c = stripped[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      if (depth > 0) i++;
    }
    const argBody = stripped.slice(start, i);
    // Now extract keys at the OUTERMOST depth only — walk the argBody and
    // record `(\w+)?:` matches that occur at depth 0 within argBody itself.
    const keys: string[] = [];
    let d = 0;
    let buf = "";
    for (let k = 0; k < argBody.length; k++) {
      const c = argBody[k];
      if (c === "{") { if (d === 0) { /* about to nest a value */ } d++; buf = ""; continue; }
      if (c === "}") { d--; buf = ""; continue; }
      if (c === "[") { d++; buf = ""; continue; }
      if (c === "]") { d--; buf = ""; continue; }
      if (d !== 0) continue;
      if (c === ",") { buf = ""; continue; }
      if (c === ":") {
        const name = buf.trim().replace(/\?$/, "");
        if (/^\w+$/.test(name)) keys.push(name);
        buf = "";
        continue;
      }
      buf += c;
    }
    return keys;
  }

  it("lora-training.md TypeScript example blocks use real RecordCorrectionInput / RecordOutcomeInput / LoRAExportOptions fields", () => {
    // Anti-rot guard: parse every ```ts...``` block and assert that
    // top-level field identifiers used as object keys match the engine's
    // input interfaces. Catches the class of bug where a doc example
    // invents fields the API does not accept (e.g. `success: true` when
    // engine wants `wasCorrect`).
    const doc = readDoc("lora-training.md");
    const fenceRe = /```ts\n([\s\S]*?)\n```/g;
    const validRecordCorrectionFields = new Set([
      "decisionId", "task", "originalValue", "correctedValue",
      "originalSource", "originalConfidence", "reason", "operatorId",
      "prompt", "recordedAt",
    ]);
    const validRecordOutcomeFields = new Set([
      "decisionId", "task", "wasCorrect", "predictedConfidence", "recordedAt",
    ]);
    const validLoraExportFields = new Set(["task", "includeConfirmed", "limit"]);

    let corrChecked = 0;
    let outChecked = 0;
    let expChecked = 0;

    for (const match of doc.matchAll(fenceRe)) {
      const block = match[1];

      const corrKeys = extractTopLevelKeys(block, /recordCorrection\s*\(\s*/);
      if (corrKeys !== null) {
        const invalid = corrKeys.filter((f) => !validRecordCorrectionFields.has(f));
        expect(invalid).toEqual([]);
        corrChecked++;
      }

      const outKeys = extractTopLevelKeys(block, /recordOutcome\s*\(\s*/);
      if (outKeys !== null) {
        const invalid = outKeys.filter((f) => !validRecordOutcomeFields.has(f));
        expect(invalid).toEqual([]);
        outChecked++;
      }

      const expKeys = extractTopLevelKeys(block, /loraTrainingExport\s*\(\s*/);
      if (expKeys !== null) {
        const invalid = expKeys.filter((f) => !validLoraExportFields.has(f));
        expect(invalid).toEqual([]);
        expChecked++;
      }
    }
    // Doc must have at least one example of each — guards against silent
    // example removal that would let the parity test become a no-op.
    expect(corrChecked).toBeGreaterThanOrEqual(1);
    expect(outChecked).toBeGreaterThanOrEqual(1);
    expect(expChecked).toBeGreaterThanOrEqual(1);
  });

  it("model-serving.md TypeScript example blocks use real ModelSpec / RouteRequest / MetricSample fields", () => {
    const doc = readDoc("model-serving.md");
    const fenceRe = /```ts\n([\s\S]*?)\n```/g;
    const validModelSpecFields = new Set([
      "id", "name", "version", "backend", "endpoint_url", "cam_systems",
      "tasks", "weight", "rate_capacity", "rate_refill_per_sec",
      "max_batch_size", "max_batch_wait_ms", "metadata",
    ]);
    const validRouteRequestFields = new Set([
      "cam_system", "task", "request_key", "priority",
    ]);
    const validMetricSampleFields = new Set([
      "ts", "latency_ms", "success", "error_class",
    ]);

    let specChecked = 0;
    let routeChecked = 0;
    let metricChecked = 0;

    for (const match of doc.matchAll(fenceRe)) {
      const block = match[1];

      const specKeys = extractTopLevelKeys(block, /interface\s+ModelSpec\s*/);
      if (specKeys !== null) {
        const invalid = specKeys.filter((f) => !validModelSpecFields.has(f));
        expect(invalid).toEqual([]);
        specChecked++;
      }

      const routeKeys = extractTopLevelKeys(block, /routeRequest\s*\(\s*/);
      if (routeKeys !== null) {
        const invalid = routeKeys.filter((f) => !validRouteRequestFields.has(f));
        expect(invalid).toEqual([]);
        routeChecked++;
      }

      const metricKeys = extractTopLevelKeys(block, /recordMetric\s*\([^,]+,\s*/);
      if (metricKeys !== null) {
        const invalid = metricKeys.filter((f) => !validMetricSampleFields.has(f));
        expect(invalid).toEqual([]);
        metricChecked++;
      }
    }
    expect(specChecked).toBeGreaterThanOrEqual(1);
    expect(routeChecked).toBeGreaterThanOrEqual(1);
    expect(metricChecked).toBeGreaterThanOrEqual(1);
  });

  // ── architecture.md API table parity ─────────────────────────────────

  it("architecture.md Public API block — every cited Engine.method exists as a static method in source", () => {
    const arch = readDoc("architecture.md");
    const sources = new Map<string, string>();
    for (const name of TRACKED_ENGINES) {
      sources.set(name, readFileSync(join(ENGINES_DIR, `${name}.ts`), "utf8"));
    }
    const callRe = /\b(CAM[A-Z][A-Za-z]+Engine)\.([a-zA-Z_][a-zA-Z0-9_]*)\(/g;
    const missing: string[] = [];
    const seen = new Set<string>();
    for (const m of arch.matchAll(callRe)) {
      const engine = m[1];
      const method = m[2];
      if (!TRACKED_ENGINES.includes(engine)) continue;
      const tag = `${engine}.${method}`;
      if (seen.has(tag)) continue;
      seen.add(tag);
      const src = sources.get(engine) ?? "";
      const sigRe = new RegExp(`\\bstatic\\s+(async\\s+)?${method}\\b`);
      if (!sigRe.test(src)) missing.push(tag);
    }
    expect(seen.size).toBeGreaterThanOrEqual(MIN_ARCH_METHOD_CITATIONS);
    expect(missing).toEqual([]);
  });
});
