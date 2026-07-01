// U-PSN-QDRANT-REVIVE-2026-05-24 — tests for qdrant-revive.mjs
// node:test — no real docker/Qdrant: all external calls use injected spawnImpl.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  checkDockerPresent,
  findQdrantContainer,
  startQdrantContainer,
  createQdrantContainer,
  pollUntilHealthy,
  runRevive,
} from "./qdrant-revive.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const runExec = promisify(execFile);

// ── helpers ────────────────────────────────────────────────────────────────────

/** spawnImpl that succeeds for docker --version */
function spawnDockerVersion(stdout = "Docker version 24.0.5, build ced0996") {
  return (_cmd, args, _opts) => {
    if (args[0] === "--version") return { status: 0, stdout, stderr: "", error: null };
    return { status: 0, stdout: "", stderr: "", error: null };
  };
}

/** spawnImpl that makes docker absent (ENOENT) */
function spawnNoDocker() {
  return (_cmd, _args, _opts) => ({
    status: null,
    stdout: "",
    stderr: "",
    error: Object.assign(new Error("spawn docker ENOENT"), { code: "ENOENT" }),
  });
}

// ── checkDockerPresent ─────────────────────────────────────────────────────────

test("checkDockerPresent: returns present=true when docker --version succeeds", () => {
  const r = checkDockerPresent({ spawnImpl: spawnDockerVersion() });
  assert.equal(r.present, true);
  assert.match(r.version, /Docker version/);
});

test("checkDockerPresent: returns present=false when docker not on PATH (ENOENT)", () => {
  const r = checkDockerPresent({ spawnImpl: spawnNoDocker() });
  assert.equal(r.present, false);
  assert.ok(r.error && r.error.length > 0);
});

test("checkDockerPresent: dry-run prints log line and returns present=true without spawning", () => {
  let spawned = false;
  const spawnImpl = (_cmd, _args, _opts) => { spawned = true; return { status: 0, stdout: "", stderr: "", error: null }; };
  const r = checkDockerPresent({ dryRun: true, spawnImpl });
  assert.equal(r.present, true);
  assert.equal(spawned, false, "dry-run must not spawn");
});

// ── findQdrantContainer ────────────────────────────────────────────────────────

test("findQdrantContainer: found+running when docker ps -a shows Up status", () => {
  const spawnImpl = (_cmd, args, _opts) => {
    if (args[0] === "ps") {
      return { status: 0, stdout: "abc123def456|Up 2 hours\n", stderr: "", error: null };
    }
    return { status: 0, stdout: "", stderr: "", error: null };
  };
  const r = findQdrantContainer({ spawnImpl });
  assert.equal(r.found, true);
  assert.equal(r.running, true);
});

test("findQdrantContainer: found+stopped when docker ps -a shows Exited status", () => {
  const spawnImpl = (_cmd, args, _opts) => {
    if (args[0] === "ps") {
      return { status: 0, stdout: "deadbeef1234|Exited (0) 3 hours ago\n", stderr: "", error: null };
    }
    return { status: 0, stdout: "", stderr: "", error: null };
  };
  const r = findQdrantContainer({ spawnImpl });
  assert.equal(r.found, true);
  assert.equal(r.running, false);
});

test("findQdrantContainer: not found when docker ps -a returns empty output", () => {
  const spawnImpl = (_cmd, args, _opts) => {
    if (args[0] === "ps") return { status: 0, stdout: "\n", stderr: "", error: null };
    return { status: 0, stdout: "", stderr: "", error: null };
  };
  const r = findQdrantContainer({ spawnImpl });
  assert.equal(r.found, false);
  assert.equal(r.running, false);
});

// ── startQdrantContainer / createQdrantContainer ───────────────────────────────

test("startQdrantContainer: calls docker start and returns ok=true on success", () => {
  const calls = [];
  const spawnImpl = (_cmd, args, _opts) => {
    calls.push(args[0]);
    return { status: 0, stdout: "qdrant\n", stderr: "", error: null };
  };
  const r = startQdrantContainer({ spawnImpl });
  assert.equal(r.ok, true);
  assert.ok(calls.includes("start"), "docker start must be called");
});

test("startQdrantContainer: returns ok=false when docker start fails", () => {
  const spawnImpl = (_cmd, _args, _opts) => ({
    status: 1,
    stdout: "",
    stderr: "Error: No such container: qdrant",
    error: null,
  });
  const r = startQdrantContainer({ spawnImpl });
  assert.equal(r.ok, false);
  assert.ok(r.error && r.error.length > 0);
});

test("createQdrantContainer: dry-run never spawns and returns ok=true", () => {
  let spawned = false;
  const spawnImpl = (_cmd, _args, _opts) => { spawned = true; return { status: 0, stdout: "", stderr: "", error: null }; };
  const r = createQdrantContainer({ dryRun: true, spawnImpl });
  assert.equal(r.ok, true);
  assert.equal(spawned, false, "dry-run must not spawn docker run");
});

test("createQdrantContainer: passes -p 6333:6333 and -v mount in docker run args", () => {
  const capturedArgs = [];
  const spawnImpl = (_cmd, args, _opts) => {
    capturedArgs.push(...args);
    return { status: 0, stdout: "newcontainerid\n", stderr: "", error: null };
  };
  const r = createQdrantContainer({ spawnImpl });
  assert.equal(r.ok, true);
  assert.ok(capturedArgs.includes("-p"), "must include -p flag");
  assert.ok(capturedArgs.some((a) => a.startsWith("6333")), "must include port 6333");
  assert.ok(capturedArgs.includes("-v"), "must include -v flag");
  assert.ok(capturedArgs.some((a) => a.includes("qdrant/storage")), "must include qdrant/storage mount");
});

// ── pollUntilHealthy ───────────────────────────────────────────────────────────

test("pollUntilHealthy: returns healthy=true when healthz responds immediately", async () => {
  const spawnImpl = (_cmd, _args, _opts) => ({
    status: 0,
    stdout: '{"title":"qdrant","version":"1.9.0"}',
    stderr: "",
    error: null,
  });
  const result = await pollUntilHealthy({ spawnImpl, pollIntervalMs: 10, pollTimeoutMs: 5000 });
  assert.equal(result.healthy, true);
  assert.ok(result.elapsedMs >= 0);
});

test("pollUntilHealthy: dry-run returns healthy=true without spawning", async () => {
  let spawned = false;
  const spawnImpl = (_cmd, _args, _opts) => { spawned = true; return { status: 0, stdout: "", stderr: "", error: null }; };
  const result = await pollUntilHealthy({ dryRun: true, spawnImpl });
  assert.equal(result.healthy, true);
  assert.equal(spawned, false, "dry-run must not spawn");
});

test("pollUntilHealthy: returns healthy=false when Qdrant never comes up within timeout", async () => {
  const spawnImpl = (_cmd, _args, _opts) => ({
    status: 7,
    stdout: "",
    stderr: "Connection refused",
    error: null,
  });
  const result = await pollUntilHealthy({ spawnImpl, pollIntervalMs: 10, pollTimeoutMs: 80 });
  assert.equal(result.healthy, false);
});

// ── runRevive integration ──────────────────────────────────────────────────────

test("runRevive: dry-run prints plan lines and returns ok=true without side-effects", async () => {
  let spawned = false;
  const spawnImpl = (_cmd, _args, _opts) => { spawned = true; return { status: 0, stdout: "", stderr: "", error: null }; };
  const r = await runRevive({ dryRun: true, spawnImpl });
  assert.equal(r.ok, true);
  assert.equal(spawned, false, "dry-run must not execute any real docker command");
});

test("runRevive: returns ok=false immediately when docker is absent", async () => {
  const r = await runRevive({ spawnImpl: spawnNoDocker() });
  assert.equal(r.ok, false);
  assert.equal(r.action, "no-docker");
  assert.equal(r.healthy, false);
});

test("runRevive: idempotent — already-running Qdrant returns action=already-running", async () => {
  // healthz responds immediately (Qdrant already up)
  const spawnImpl = (_cmd, args, _opts) => {
    // docker --version check
    if (args[0] === "--version") return { status: 0, stdout: "Docker version 24.0.5", stderr: "", error: null };
    // healthz probe via curl
    if (args.includes("/healthz")) {
      return { status: 0, stdout: '{"title":"qdrant","version":"1.9.0"}', stderr: "", error: null };
    }
    return { status: 0, stdout: "", stderr: "", error: null };
  };
  const r = await runRevive({ spawnImpl, pollIntervalMs: 10, pollTimeoutMs: 2000 });
  assert.equal(r.ok, true);
  assert.equal(r.action, "already-running");
  assert.equal(r.healthy, true);
});

test("runRevive: stopped container → start action → poll healthy", async () => {
  let healthzCalls = 0;
  const spawnImpl = (_cmd, args, _opts) => {
    if (args[0] === "--version") return { status: 0, stdout: "Docker version 24.0.5", stderr: "", error: null };
    // First healthz probe (pre-start check): down. Subsequent: up.
    if (Array.isArray(args) && args.some((a) => typeof a === "string" && a.includes("healthz"))) {
      healthzCalls++;
      if (healthzCalls <= 1) return { status: 7, stdout: "", stderr: "refused", error: null };
      return { status: 0, stdout: '{"title":"qdrant","version":"1.9.0"}', stderr: "", error: null };
    }
    // docker ps -a → stopped container
    if (args[0] === "ps") return { status: 0, stdout: "abc123|Exited (0) 1 hour ago\n", stderr: "", error: null };
    // docker start → success
    if (args[0] === "start") return { status: 0, stdout: "qdrant\n", stderr: "", error: null };
    return { status: 0, stdout: "", stderr: "", error: null };
  };
  const r = await runRevive({ spawnImpl, pollIntervalMs: 10, pollTimeoutMs: 3000 });
  assert.equal(r.ok, true);
  assert.equal(r.action, "start");
  assert.equal(r.healthy, true);
});

// ── import oracle ──────────────────────────────────────────────────────────────

test("oracle: qdrant-revive.mjs imports cleanly and exports required symbols", async () => {
  const target = pathToFileURL(resolve(HERE, "qdrant-revive.mjs")).href;
  const { stdout } = await runExec(
    process.execPath,
    [
      "-e",
      `import(${JSON.stringify(target)}).then(` +
        `m=>console.log([typeof m.checkDockerPresent,typeof m.findQdrantContainer,` +
        `typeof m.startQdrantContainer,typeof m.createQdrantContainer,` +
        `typeof m.pollUntilHealthy,typeof m.runRevive].join(" ")),` +
        `e=>{console.error("IMPORT_FAILED:"+(e&&e.message));process.exit(1);})`,
    ],
    { timeout: 20000 }
  );
  assert.equal(stdout.trim(), "function function function function function function");
});
