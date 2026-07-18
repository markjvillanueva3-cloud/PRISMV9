#!/usr/bin/env node
/**
 * Tests for generate-ai-training-units.mjs — the AI-TRAINING-FIRST-MS0 enroller.
 * Real-value assertions (no toBeDefined stubs). Run: node --test scripts/generate-ai-training-units.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyEngineDomain,
  deriveUnits,
  buildEnvelope,
  DOMAINS,
  MILESTONE_ID,
} from "./generate-ai-training-units.mjs";

test("classifyEngineDomain: cam vendors win over generic mill token", () => {
  // "MastercamDeepLearningEngine" contains no "mill" but the failure mode is
  // a vendor like hyperMILL falling to mill — assert the cam rule fires first.
  assert.equal(classifyEngineDomain("HyperMillDeepLearningEngine"), "cam");
  assert.equal(classifyEngineDomain("MastercamDeepLearningEngine"), "cam");
  assert.equal(classifyEngineDomain("FusionDeepLearningEngine"), "cam");
  assert.equal(classifyEngineDomain("CAMDeepLearningEngine"), "cam");
});

test("classifyEngineDomain: lathe / mill / wire / speedfeed core domains", () => {
  assert.equal(classifyEngineDomain("LatheMetaLearningEngine"), "lathe");
  assert.equal(classifyEngineDomain("LatheKinematicsDeepLearningEngine"), "lathe");
  assert.equal(classifyEngineDomain("MillingAIUltraIntelligenceEngine"), "mill");
  assert.equal(classifyEngineDomain("FiveAxisDeepLearningEngine"), "mill");
  assert.equal(classifyEngineDomain("VirtualMachiningDeepLearningEngine"), "mill");
  assert.equal(classifyEngineDomain("ElectrodeDeepLearningEngine"), "wire");
  assert.equal(classifyEngineDomain("SpeedFeedDeepLearningEngine"), "speedfeed");
});

test("classifyEngineDomain: post / database / academy", () => {
  assert.equal(classifyEngineDomain("PostProcessorMetaLearningEngine"), "post");
  assert.equal(classifyEngineDomain("CNCControllerDeepLearningEngine"), "post");
  assert.equal(classifyEngineDomain("ToolDatabaseDeepLearningEngine"), "database");
  assert.equal(classifyEngineDomain("MITCourseDeepLearningEngine"), "academy");
  assert.equal(classifyEngineDomain("CrossDisciplinaryDeepLearningEngine"), "academy");
});

test("classifyEngineDomain: unknown → misc fallback (never throws, never empty)", () => {
  assert.equal(classifyEngineDomain("MetaLearningOptimizerEngine"), "misc");
  assert.equal(classifyEngineDomain("ZzzUnknownEngine"), "misc");
  assert.equal(classifyEngineDomain(""), "misc");
});

test("classifyEngineDomain: every output is a valid DOMAIN-PIPELINE domain", () => {
  const samples = [
    "LatheMetaLearningEngine", "MillingAIUltraIntelligenceEngine",
    "HyperMillDeepLearningEngine", "ElectrodeDeepLearningEngine",
    "MetaLearningOptimizerEngine", "ToolDatabaseDeepLearningEngine",
  ];
  for (const s of samples) {
    assert.ok(DOMAINS.includes(classifyEngineDomain(s)), `${s} → not a valid domain`);
  }
});

test("deriveUnits: one unit per engine, sorted by id, stable shape", () => {
  const files = [
    "MillDeepLearningEngine.ts",
    "LatheMetaLearningEngine.ts",
    "HyperMillDeepLearningEngine.ts",
  ];
  const units = deriveUnits(files);
  assert.equal(units.length, 3);
  // sorted ascending by id
  const ids = units.map(u => u.id);
  assert.deepEqual(ids, [...ids].sort((a, b) => a.localeCompare(b)));
  // every unit carries the required envelope fields
  for (const u of units) {
    assert.match(u.id, /^U-AITRAIN-[A-Z0-9]+-/);
    assert.equal(u.status, "pending");
    assert.ok(DOMAINS.includes(u.domain));
    assert.ok(u.engine.startsWith("mcp-server/src/engines/"));
    assert.equal(u.training_priority.length, 4);
    assert.equal(u.source_doctrine, "feedback_ai_training_first_before_revenue");
  }
});

test("deriveUnits: deterministic — same input yields byte-identical ids", () => {
  const files = ["MillDeepLearningEngine.ts", "LatheMetaLearningEngine.ts"];
  const a = deriveUnits(files).map(u => u.id);
  const b = deriveUnits([...files].reverse()).map(u => u.id); // order-independent
  assert.deepEqual(a, b);
});

test("deriveUnits: empty input → empty array (no throw)", () => {
  assert.deepEqual(deriveUnits([]), []);
});

test("MILESTONE_ID is the canonical envelope id", () => {
  assert.equal(MILESTONE_ID, "AI-TRAINING-FIRST-MS0");
});

test("buildEnvelope: carries all FEATURE-GAP-AUDIT-MS0 schema fields", () => {
  const env = buildEnvelope(deriveUnits(["MillDeepLearningEngine.ts"]));
  for (const f of [
    "id", "version", "title", "brief", "created_at", "created_by", "track",
    "roadmap_priority", "status", "total_units", "total_sessions",
    "source_audit", "advisory_only", "must_human_verify", "units",
  ]) {
    assert.ok(f in env, `envelope missing required field: ${f}`);
  }
  assert.equal(env.id, "AI-TRAINING-FIRST-MS0");
  assert.equal(env.advisory_only, true);
  assert.equal(env.must_human_verify, true);
  assert.equal(env.total_units, 1);
  assert.equal(env.units.length, 1);
});

test("buildEnvelope: uncovered_domains surfaces zero-engine domains (R12)", () => {
  // Only a mill engine → the other 12 domains are uncovered and must be named.
  const env = buildEnvelope(deriveUnits(["MillDeepLearningEngine.ts"]));
  assert.ok(Array.isArray(env.uncovered_domains));
  assert.ok(env.uncovered_domains.includes("cad"));
  assert.ok(env.uncovered_domains.includes("tribal"));
  assert.ok(!env.uncovered_domains.includes("mill"), "mill is covered, must not be listed");
  assert.match(env.gap_owner, /FEATURE-GAP-AUDIT-MS0/);
  assert.ok(env.registration && env.registration.auto_discovered_by);
});

test("buildEnvelope: gap_owner is null when every domain is covered", () => {
  // One engine per domain → zero uncovered → gap_owner must be null, not a string.
  const oneEnginePerDomain = [
    "MillDeepLearningEngine.ts", "LatheDeepLearningEngine.ts",
    "ElectrodeDeepLearningEngine.ts", "CadDeepLearningEngine.ts",
    "CAMDeepLearningEngine.ts", "TribalDeepLearningEngine.ts",
    "ErpDeepLearningEngine.ts", "PostProcessorDeepLearningEngine.ts",
    "SpeedFeedDeepLearningEngine.ts", "BlueprintDeepLearningEngine.ts",
    "MITCourseDeepLearningEngine.ts", "ToolDatabaseDeepLearningEngine.ts",
    "MetaLearningOptimizerEngine.ts",
  ];
  const env = buildEnvelope(deriveUnits(oneEnginePerDomain));
  assert.deepEqual(env.uncovered_domains, []);
  assert.equal(env.gap_owner, null);
});
