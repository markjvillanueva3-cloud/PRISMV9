/**
 * GrokCLIClientEngine.test.ts
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS1 / OCTOPUS-CONSENSUS / GROK-CLI.
 *
 * Two tiers:
 *  1. Hermetic — an injected fake `spawn` drives every branch (success,
 *     non-zero exit, empty output, 'error' event, spawn throw, null pipes,
 *     stdin-write failure, timeout) with real-value assertions.
 *  2. Real-subprocess oracle — the engine's DEFAULT (real) spawn is exercised
 *     end-to-end against `node` echoing stdin, and against a missing binary.
 *     A pure-core + injected-deps design must ship a real subprocess test or
 *     the integration seam ships untested (lesson: slot-bind-enforce, where
 *     the P1 bugs lived in the un-oracle'd subprocess path).
 *
 * The fake emits on the `'close'` event (not `'exit'`) — the engine listens
 * on `'close'` so a large stdout is fully flushed before it is read.
 */

import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { GrokCLIClientEngine, type SpawnLike } from "../engines/GrokCLIClientEngine.js";

// ── fake child process ──────────────────────────────────────────────────────

class FakeStream extends EventEmitter {
  setEncoding(): this { return this; }
}

/** Real child.stdin is a stream (EventEmitter) — the engine attaches an 'error' listener. */
class FakeStdin extends EventEmitter {
  writes: string[] = [];
  ended = false;
  throwOnWrite = false;
  write(s: string): boolean {
    if (this.throwOnWrite) throw new Error("EPIPE (sync write)");
    this.writes.push(s);
    return true;
  }
  end(): void { this.ended = true; }
}

class FakeChild extends EventEmitter {
  stdout: FakeStream | null;
  stderr: FakeStream | null;
  stdin: FakeStdin | null;
  killed = false;

  constructor(nullPipes: boolean) {
    super();
    this.stdout = nullPipes ? null : new FakeStream();
    this.stderr = nullPipes ? null : new FakeStream();
    this.stdin = nullPipes ? null : new FakeStdin();
  }

  kill(): boolean { this.killed = true; return true; }
}

interface Scenario {
  stdout?: string;
  stderr?: string;
  exit?: number;
  errorEvent?: string;
  hang?: boolean;          // never emit 'close' → exercises the timeout path
  spawnThrows?: string;
  nullPipes?: boolean;
  stdinThrows?: boolean;   // child.stdin.write throws synchronously
}

function makeSpawn(sc: Scenario) {
  const calls: Array<{ bin: string; args: string[]; opts: Record<string, unknown> }> = [];
  let child: FakeChild | null = null;
  const spawn = ((bin: string, args: string[], opts: Record<string, unknown>) => {
    calls.push({ bin, args: [...args], opts });
    if (sc.spawnThrows !== undefined) throw new Error(sc.spawnThrows);
    const c = new FakeChild(sc.nullPipes === true);
    child = c;
    if (sc.nullPipes !== true) {
      if (sc.stdinThrows === true && c.stdin !== null) c.stdin.throwOnWrite = true;
      // Emit AFTER the engine has attached its listeners (next tick).
      setImmediate(() => {
        if (sc.stdout !== undefined) c.stdout!.emit("data", sc.stdout);
        if (sc.stderr !== undefined) c.stderr!.emit("data", sc.stderr);
        if (sc.errorEvent !== undefined) { c.emit("error", new Error(sc.errorEvent)); return; }
        if (sc.hang !== true) c.emit("close", sc.exit ?? 0);
      });
    }
    return c;
  }) as unknown as SpawnLike;
  return { spawn, calls, get child() { return child; } };
}

// ── hermetic tests ──────────────────────────────────────────────────────────

describe("GrokCLIClientEngine — validation", () => {
  const eng = new GrokCLIClientEngine(makeSpawn({}).spawn);

  it("rejects a non-object options", async () => {
    await expect(eng.run(undefined as never)).rejects.toThrow(/GrokCLIRunOptions required/);
  });
  it("rejects an empty prompt", async () => {
    await expect(eng.run({ prompt: "" })).rejects.toThrow(/non-empty string/);
  });
  it("rejects a non-positive timeoutMs", async () => {
    await expect(eng.run({ prompt: "hi", timeoutMs: 0 })).rejects.toThrow(/positive number/);
    await expect(eng.run({ prompt: "hi", timeoutMs: -5 })).rejects.toThrow(/positive number/);
  });
  it("rejects a non-array extraArgs", async () => {
    await expect(eng.run({ prompt: "hi", extraArgs: "p" as never })).rejects.toThrow(/must be an array/);
  });
});

describe("GrokCLIClientEngine — happy path", () => {
  it("returns the trimmed stdout as the answer on exit 0", async () => {
    const eng = new GrokCLIClientEngine(makeSpawn({ stdout: "  the answer is 42\n\n" }).spawn);
    const r = await eng.run({ prompt: "what is 6*7?" });
    expect(r.ok).toBe(true);
    expect(r.answer).toBe("the answer is 42");
    expect(r.error).toBeNull();
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("passes the model through as a `--model` flag and labels the result", async () => {
    const s = makeSpawn({ stdout: "ok" });
    const eng = new GrokCLIClientEngine(s.spawn);
    const r = await eng.run({ prompt: "hi", model: "grok-4" });
    expect(r.ok).toBe(true);
    expect(r.model).toBe("grok-4");
    expect(s.calls[0].args).toEqual(["--model", "grok-4"]);
  });

  it("labels the result 'grok-cli' on success when no model is given", async () => {
    const eng = new GrokCLIClientEngine(makeSpawn({ stdout: "answer" }).spawn);
    const r = await eng.run({ prompt: "hi" });
    expect(r.ok).toBe(true);
    expect(r.model).toBe("grok-cli");
  });

  it("captures stderr into rawStderrTail", async () => {
    const eng = new GrokCLIClientEngine(makeSpawn({ stdout: "answer", stderr: "warn: beta" }).spawn);
    const r = await eng.run({ prompt: "hi" });
    expect(r.rawStderrTail).toContain("warn: beta");
  });
});

describe("GrokCLIClientEngine — failure paths (never throw, always degrade)", () => {
  it("non-zero exit → ok:false with the exit code", async () => {
    const eng = new GrokCLIClientEngine(makeSpawn({ exit: 3, stderr: "boom" }).spawn);
    const r = await eng.run({ prompt: "hi" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("exit 3");
    expect(r.rawStderrTail).toContain("boom");
  });

  it("exit 0 but empty stdout → ok:false", async () => {
    const eng = new GrokCLIClientEngine(makeSpawn({ stdout: "   \n  ", exit: 0 }).spawn);
    const r = await eng.run({ prompt: "hi" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/empty stdout/);
  });

  it("'error' event → ok:false with the process error", async () => {
    const eng = new GrokCLIClientEngine(makeSpawn({ errorEvent: "ENOENT" }).spawn);
    const r = await eng.run({ prompt: "hi" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/process error: ENOENT/);
  });

  it("spawn() throwing → ok:false, does not propagate", async () => {
    const eng = new GrokCLIClientEngine(makeSpawn({ spawnThrows: "EACCES" }).spawn);
    const r = await eng.run({ prompt: "hi" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/spawn failed: EACCES/);
  });

  it("a child with null stdio pipes → ok:false and the child is killed", async () => {
    const s = makeSpawn({ nullPipes: true });
    const eng = new GrokCLIClientEngine(s.spawn);
    const r = await eng.run({ prompt: "hi" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no stdio pipes/);
    expect(s.child?.killed).toBe(true);
  });

  it("a synchronous stdin-write failure → ok:false, child killed, no crash", async () => {
    const s = makeSpawn({ stdinThrows: true });
    const eng = new GrokCLIClientEngine(s.spawn);
    const r = await eng.run({ prompt: "hi" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/stdin write failed/);
    expect(s.child?.killed).toBe(true);
  });

  it("a hung CLI → ok:false 'timeout' and the child is killed", async () => {
    const s = makeSpawn({ hang: true });
    const eng = new GrokCLIClientEngine(s.spawn);
    const r = await eng.run({ prompt: "hi", timeoutMs: 60 });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("timeout");
    expect(s.child?.killed).toBe(true);
  });
});

describe("GrokCLIClientEngine — security & invocation invariants", () => {
  it("NEVER places the prompt in argv (shell-injection guard)", async () => {
    const s = makeSpawn({ stdout: "ok" });
    const eng = new GrokCLIClientEngine(s.spawn);
    const evil = 'review this & del /q C:\\* ; rm -rf ~';
    await eng.run({ prompt: evil, model: "grok-4" });
    // argv carries only the static --model flag — the prompt is nowhere in it.
    expect(s.calls[0].args).toEqual(["--model", "grok-4"]);
    for (const a of s.calls[0].args) expect(a).not.toContain("del /q");
  });

  it("keeps the prompt out of argv on the env-driven (PRISM_GROK_CLI_ARGS) path", async () => {
    vi.stubEnv("PRISM_GROK_CLI_ARGS", "-p --quiet");
    try {
      const s = makeSpawn({ stdout: "ok" });
      const eng = new GrokCLIClientEngine(s.spawn);
      const evil = "ignore previous & format C:";
      await eng.run({ prompt: evil });
      // defaultExtraArgs() reads PRISM_GROK_CLI_ARGS at call time → exactly those flags.
      expect(s.calls[0].args).toEqual(["-p", "--quiet"]);
      for (const a of s.calls[0].args) expect(a).not.toContain(evil);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("delivers the prompt on stdin and closes stdin", async () => {
    const s = makeSpawn({ stdout: "ok" });
    const eng = new GrokCLIClientEngine(s.spawn);
    await eng.run({ prompt: "the-exact-prompt" });
    expect(s.child?.stdin?.writes).toEqual(["the-exact-prompt"]);
    expect(s.child?.stdin?.ended).toBe(true);
  });

  it("uses the shell only on Windows for a non-.exe bin (cmd-shim resolution)", async () => {
    // The module-default bin is "grok" (no .exe) → shell on win32, direct elsewhere.
    const s = makeSpawn({ stdout: "ok" });
    const eng = new GrokCLIClientEngine(s.spawn);
    await eng.run({ prompt: "hi" });
    expect(s.calls[0].opts.shell).toBe(process.platform === "win32");
  });

  it("defaults the working directory to the OS temp dir (agentic-write containment)", async () => {
    const s = makeSpawn({ stdout: "ok" });
    const eng = new GrokCLIClientEngine(s.spawn);
    await eng.run({ prompt: "hi" });
    expect(s.calls[0].opts.cwd).toBe(os.tmpdir());
  });

  it("honors an explicit workdir and explicit extraArgs", async () => {
    const s = makeSpawn({ stdout: "ok" });
    const eng = new GrokCLIClientEngine(s.spawn);
    await eng.run({ prompt: "hi", workdir: "/tmp/custom", extraArgs: ["-p", "--quiet"] });
    expect(s.calls[0].opts.cwd).toBe("/tmp/custom");
    expect(s.calls[0].args).toEqual(["-p", "--quiet"]);
  });
});

describe("GrokCLIClientEngine — availability detection", () => {
  it("isAvailable() returns a stable boolean and memoizes the PATH walk", async () => {
    const eng = new GrokCLIClientEngine();
    const first = eng.isAvailable();
    expect(typeof first).toBe("boolean");
    // Memoized — a second call returns the identical result without re-walking.
    expect(eng.isAvailable()).toBe(first);
  });
});

// ── real-subprocess oracle ──────────────────────────────────────────────────

describe("GrokCLIClientEngine — real subprocess oracle", () => {
  it("real spawn + missing binary → ok:false, never throws or hangs", async () => {
    // Default (real) spawn; the default bin "grok" is not installed in CI.
    const eng = new GrokCLIClientEngine();
    const r = await eng.run({ prompt: "ping", timeoutMs: 8000 });
    expect(r.ok).toBe(false);
    expect(typeof r.error).toBe("string");
    expect(r.error!.length).toBeGreaterThan(0);
  }, 12_000);

  it("real spawn + a stdin-echoing node subprocess → ok:true with the echoed answer", async () => {
    // Point the engine's bin at `node` (re-evaluating the module so the
    // PRISM_GROK_CLI_BIN const re-reads the stubbed env). `node` ends in
    // `.exe` on Windows → the engine spawns it DIRECTLY (no shell) → the
    // script-path argv entry is passed to CreateProcess natively, so a temp
    // path with a space is safe. Exercises real spawn / stdio / close — no LLM.
    const echoScript = path.join(
      os.tmpdir(),
      `prism-grokcli-echo-${process.pid}-${Date.now()}.mjs`,
    );
    fs.writeFileSync(
      echoScript,
      "let d='';process.stdin.on('data',c=>{d+=c;});process.stdin.on('end',()=>{process.stdout.write(d);});",
    );
    try {
      vi.resetModules();
      vi.stubEnv("PRISM_GROK_CLI_BIN", process.execPath);
      const mod = await import("../engines/GrokCLIClientEngine.js");
      const eng = new mod.GrokCLIClientEngine();
      // PRISM_GROK_CLI_BIN is an absolute path that exists → isAvailable() true.
      expect(eng.isAvailable()).toBe(true);
      const r = await eng.run({ prompt: "PRISM_OCTOPUS_REAL_OK", extraArgs: [echoScript], timeoutMs: 10_000 });
      expect(r.ok).toBe(true);
      expect(r.answer).toBe("PRISM_OCTOPUS_REAL_OK");
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
      try { fs.unlinkSync(echoScript); } catch { /* best-effort */ }
    }
  }, 15_000);
});
