// scripts/ollama-embed-lane.test.mjs -- U-INDIA-EMBED-LANE guardian pure cores
// node --test scripts/ollama-embed-lane.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { laneHostPort, buildServeEnv, resolveOllamaExe, classifyAction } from "./ollama-embed-lane.mjs";

test("laneHostPort derives OLLAMA_HOST binding from the lane url", () => {
  assert.equal(laneHostPort("http://127.0.0.1:11435"), "127.0.0.1:11435");
  assert.equal(laneHostPort("http://localhost:9999"), "localhost:9999");
  assert.throws(() => laneHostPort("not a url"), "garbage lane url must fail loud, not bind a wrong port");
});

test("buildServeEnv pins the lane host + CPU-polite footprint, preserves base env", () => {
  const env = buildServeEnv({ OLLAMA_MODELS: "H:\\Tools\\ollama\\models", PATH: "x" }, "http://127.0.0.1:11435");
  assert.equal(env.OLLAMA_HOST, "127.0.0.1:11435");
  assert.equal(env.OLLAMA_MAX_LOADED_MODELS, "1");
  assert.equal(env.OLLAMA_NUM_PARALLEL, "4");
  assert.equal(env.OLLAMA_NUM_THREAD, "8");
  assert.equal(env.OLLAMA_CONTEXT_LENGTH, "2048");
  assert.equal(env.OLLAMA_MODELS, "H:\\Tools\\ollama\\models", "shared model store must pass through");
  assert.equal(env.PATH, "x");
});

test("buildServeEnv OVERRIDES an inherited OLLAMA_HOST (never rebind the main :11434)", () => {
  const env = buildServeEnv({ OLLAMA_HOST: "127.0.0.1:11434", OLLAMA_CONTEXT_LENGTH: "65536" }, "http://127.0.0.1:11435");
  assert.equal(env.OLLAMA_HOST, "127.0.0.1:11435");
  assert.equal(env.OLLAMA_CONTEXT_LENGTH, "2048", "main-instance ctx must not leak into the lane");
});

test("resolveOllamaExe: env override wins; else default install when present; else PATH", () => {
  assert.equal(resolveOllamaExe({ PRISM_OLLAMA_EXE: "D:/o.exe" }, () => true), "D:/o.exe");
  const dflt = resolveOllamaExe({ LOCALAPPDATA: "C:\\U\\x\\AppData\\Local" }, (p) => p.includes("Programs"));
  assert.match(dflt, /Programs[\\/]Ollama[\\/]ollama\.exe$/);
  assert.equal(resolveOllamaExe({ LOCALAPPDATA: "C:\\nope" }, () => false), "ollama");
  assert.equal(resolveOllamaExe({}, () => true), "ollama", "no LOCALAPPDATA -> PATH name, never a throw");
});

test("classifyAction covers every (laneWasUp, spawned, warmed) outcome", () => {
  assert.equal(classifyAction(true, false, true), "refreshed");
  assert.equal(classifyAction(false, true, true), "booted");
  assert.equal(classifyAction(false, false, true), "cold-recovered");
  assert.equal(classifyAction(true, false, false), "warm-failed");
  assert.equal(classifyAction(false, true, false), "boot-warm-failed");
  assert.equal(classifyAction(false, false, false), "boot-failed");
});
