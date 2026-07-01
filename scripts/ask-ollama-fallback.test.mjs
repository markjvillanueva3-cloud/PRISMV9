// Tests for the Docker Models fallback added in
// DOCKER-MCP-WIRE-MS0/U-MODELS-FALLBACK (scripts/ask-ollama.mjs).
// node:test — no real docker/ollama: every external call is an injected impl.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import {
  mapOllamaToDockerModel,
  callDockerModel,
  callLocalModel,
} from "./ask-ollama.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const runExec = promisify(execFile);

// ── mapOllamaToDockerModel ─────────────────────────────────────────────────

test("mapOllamaToDockerModel: known model maps to its Docker equivalent", () => {
  assert.equal(mapOllamaToDockerModel("qwen2.5-coder:32b"), "gemma3");
  assert.equal(mapOllamaToDockerModel("gpt-oss:120b"), "gemma3");
});

test("mapOllamaToDockerModel: unknown / empty model returns null (no guessing)", () => {
  assert.equal(mapOllamaToDockerModel("llama3:70b"), null);
  assert.equal(mapOllamaToDockerModel(""), null);
  assert.equal(mapOllamaToDockerModel(undefined), null);
  // explicitly-null mapping — embeddings have no Docker Models equivalent
  assert.equal(mapOllamaToDockerModel("nomic-embed-text"), null);
});

test("mapOllamaToDockerModel: PRISM_DOCKER_MODEL_MAP env replaces the defaults", () => {
  const saved = process.env.PRISM_DOCKER_MODEL_MAP;
  process.env.PRISM_DOCKER_MODEL_MAP = JSON.stringify({ "custom:1b": "phi3" });
  try {
    assert.equal(mapOllamaToDockerModel("custom:1b"), "phi3");
    // the override REPLACES the map — a built-in key is no longer present
    assert.equal(mapOllamaToDockerModel("qwen2.5-coder:32b"), null);
  } finally {
    if (saved === undefined) delete process.env.PRISM_DOCKER_MODEL_MAP;
    else process.env.PRISM_DOCKER_MODEL_MAP = saved;
  }
});

test("mapOllamaToDockerModel: malformed env is ignored, defaults stand (fail-soft)", () => {
  const saved = process.env.PRISM_DOCKER_MODEL_MAP;
  try {
    process.env.PRISM_DOCKER_MODEL_MAP = "{not valid json";
    assert.equal(mapOllamaToDockerModel("qwen2.5-coder:32b"), "gemma3");
    // a JSON array is the wrong shape — also ignored
    process.env.PRISM_DOCKER_MODEL_MAP = JSON.stringify(["a", "b"]);
    assert.equal(mapOllamaToDockerModel("qwen2.5-coder:32b"), "gemma3");
  } finally {
    if (saved === undefined) delete process.env.PRISM_DOCKER_MODEL_MAP;
    else process.env.PRISM_DOCKER_MODEL_MAP = saved;
  }
});

// ── callDockerModel ────────────────────────────────────────────────────────

test("callDockerModel: happy path returns trimmed stdout tagged docker-models", async () => {
  const execFileImpl = async (cmd, args) => {
    assert.equal(cmd, "docker");
    assert.deepEqual(args, ["model", "run", "gemma3", "hello?"]);
    return { stdout: "  the answer  \n", stderr: "" };
  };
  const r = await callDockerModel("gemma3", "hello?", { execFileImpl });
  assert.deepEqual(r, {
    ok: true,
    text: "the answer",
    evalCount: 0,
    source: "docker-models",
  });
});

test("callDockerModel: non-zero exit becomes an unreachable error", async () => {
  const execFileImpl = async () => {
    throw new Error("Command failed: docker model run gemma3 (exit 1)");
  };
  const r = await callDockerModel("gemma3", "x", { execFileImpl });
  assert.equal(r.ok, false);
  assert.match(r.error, /Docker Models unreachable/);
  assert.match(r.error, /exit 1/);
});

test("callDockerModel: a killed/timed-out child is reported as a timeout", async () => {
  const execFileImpl = async () => {
    throw Object.assign(new Error("timeout"), { killed: true, signal: "SIGTERM" });
  };
  const r = await callDockerModel("gemma3", "x", { execFileImpl, timeoutMs: 1234 });
  assert.equal(r.ok, false);
  assert.match(r.error, /timed out after 1234ms/);
});

test("callDockerModel: empty stdout is a failure, not a silent empty success", async () => {
  const execFileImpl = async () => ({ stdout: "   \n  ", stderr: "" });
  const r = await callDockerModel("gemma3", "x", { execFileImpl });
  assert.equal(r.ok, false);
  assert.match(r.error, /empty response/);
});

test("callDockerModel: stderr-only output (no stdout) is still an empty-response failure", async () => {
  const execFileImpl = async () => ({ stdout: "", stderr: "model warning: low memory" });
  const r = await callDockerModel("gemma3", "x", { execFileImpl });
  assert.equal(r.ok, false);
  assert.match(r.error, /empty response/);
});

// ── callLocalModel ─────────────────────────────────────────────────────────

const OLLAMA_OK = async () => ({ ok: true, text: "ollama said hi", evalCount: 7 });
const DOCKER_OK = async () => ({
  ok: true,
  text: "docker said hi",
  evalCount: 0,
  source: "docker-models",
});

/** A callDockerModel stand-in that counts invocations. */
function dockerSpy() {
  let calls = 0;
  const impl = async (...a) => {
    calls++;
    return DOCKER_OK(...a);
  };
  impl.calls = () => calls;
  return impl;
}

test("callLocalModel: Ollama success returns immediately, tagged source:ollama", async () => {
  const docker = dockerSpy();
  const r = await callLocalModel("qwen2.5-coder:32b", "q", {
    callOllamaImpl: OLLAMA_OK,
    callDockerModelImpl: docker,
  });
  assert.deepEqual(r, {
    ok: true,
    text: "ollama said hi",
    evalCount: 7,
    source: "ollama",
  });
  assert.equal(docker.calls(), 0, "Docker Models must not be called when Ollama succeeds");
});

test("callLocalModel: Ollama daemon-down error falls back to Docker Models", async () => {
  const r = await callLocalModel("qwen2.5-coder:32b", "q", {
    callOllamaImpl: async () => ({
      ok: false,
      error: "Ollama unreachable: connect ECONNREFUSED 127.0.0.1:11434",
    }),
    callDockerModelImpl: DOCKER_OK,
  });
  assert.equal(r.ok, true);
  assert.equal(r.source, "docker-models");
  assert.equal(r.text, "docker said hi");
});

test("callLocalModel: Ollama timeout also triggers the fallback", async () => {
  const r = await callLocalModel("qwen2.5-coder:32b", "q", {
    callOllamaImpl: async () => ({
      ok: false,
      error: "Ollama timed out after 180000ms (model cold-loading)",
    }),
    callDockerModelImpl: DOCKER_OK,
  });
  assert.equal(r.ok, true);
  assert.equal(r.source, "docker-models");
});

test("callLocalModel: both paths fail — the original Ollama error is preserved", async () => {
  const r = await callLocalModel("qwen2.5-coder:32b", "q", {
    callOllamaImpl: async () => ({
      ok: false,
      error: "Ollama HTTP 503: service unavailable",
    }),
    callDockerModelImpl: async () => ({
      ok: false,
      error: "Docker Models unreachable: docker not found",
    }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.error, "Ollama HTTP 503: service unavailable");
  assert.equal(r.source, "ollama");
});

test("callLocalModel: fallbackToDockerModels:false short-circuits the fallback", async () => {
  const docker = dockerSpy();
  const r = await callLocalModel("qwen2.5-coder:32b", "q", {
    fallbackToDockerModels: false,
    callOllamaImpl: async () => ({ ok: false, error: "Ollama unreachable: ECONNREFUSED" }),
    callDockerModelImpl: docker,
  });
  assert.equal(r.ok, false);
  assert.equal(r.source, "ollama");
  assert.equal(docker.calls(), 0, "fallback disabled — Docker Models must not be called");
});

test("callLocalModel: an unmappable model skips the fallback entirely", async () => {
  const docker = dockerSpy();
  const r = await callLocalModel("llama3:70b", "q", {
    callOllamaImpl: async () => ({ ok: false, error: "Ollama unreachable: ECONNREFUSED" }),
    callDockerModelImpl: docker,
  });
  assert.equal(r.ok, false);
  assert.equal(r.source, "ollama");
  assert.equal(docker.calls(), 0, "no Docker Models mapping — fallback skipped");
});

test("callLocalModel: a non-daemon Ollama error is real and is NOT masked by a fallback", async () => {
  const docker = dockerSpy();
  const r = await callLocalModel("qwen2.5-coder:32b", "q", {
    callOllamaImpl: async () => ({ ok: false, error: "Ollama returned an empty response" }),
    callDockerModelImpl: docker,
  });
  assert.equal(r.ok, false);
  assert.equal(r.error, "Ollama returned an empty response");
  assert.equal(docker.calls(), 0, "empty-response is a real error — fallback must not fire");
});

// ── main() / import-safety oracle ──────────────────────────────────────────

test("oracle: ask-ollama.mjs imports cleanly and exports all 3 fallback fns", async () => {
  const target = pathToFileURL(resolve(HERE, "ask-ollama.mjs")).href;
  const { stdout } = await runExec(
    process.execPath,
    [
      "-e",
      `import(${JSON.stringify(target)}).then(` +
        `m=>console.log([typeof m.callLocalModel,typeof m.callDockerModel,typeof m.mapOllamaToDockerModel].join(" ")),` +
        `e=>{console.log("IMPORT_FAILED:"+(e&&e.message));process.exit(1);})`,
    ],
    { timeout: 20000 },
  );
  assert.equal(stdout.trim(), "function function function");
});
