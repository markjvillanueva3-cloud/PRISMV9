// OllamaClientEngineHost.test.ts
//
// Regression guard for the Windows localhost-IPv6 Ollama-unreachability bug
// (slot:bravo, 2026-06-09). On Windows, `localhost` resolves to IPv6 ::1 first,
// but Ollama binds IPv4 127.0.0.1 -- so the prior hardcoded default
// `http://localhost:11434` was UNREACHABLE (empirically: fetch failed in ~64ms;
// 127.0.0.1 connected in ~9ms). That silently broke EVERY engine routing through
// ollamaClientEngine (the MultiModelConsensusEngine octopus voice reported
// "ollama:unreachable" despite a live daemon + present models). The fix defaults
// the host to IPv4 127.0.0.1, env-overridable via OLLAMA_HOST.
//
// These tests FAIL against the pre-fix code (which returned "http://localhost:11434").
import { describe, it, expect } from "vitest";
import { OllamaClientEngine, ollamaClientEngine } from "../engines/OllamaClientEngine.js";

describe("OllamaClientEngine default host (Windows localhost-IPv6 regression)", () => {
  it("a fresh instance defaults to IPv4 127.0.0.1, never the IPv6-ambiguous localhost", () => {
    const engine = new OllamaClientEngine();
    // The default host is read from OLLAMA_HOST (when an http(s) URL) else 127.0.0.1.
    // In a normal dev/CI env OLLAMA_HOST is unset -> the IPv4 default must apply.
    if (!process.env.OLLAMA_HOST || !process.env.OLLAMA_HOST.startsWith("http")) {
      expect(engine.getHost()).toBe("http://127.0.0.1:11434");
    }
    // The localhost form is NEVER acceptable regardless of env (it is the bug).
    expect(engine.getHost()).not.toContain("localhost");
  });

  it("the exported singleton carries the same IPv4 default (the instance every caller shares)", () => {
    // ollamaClientEngine is the singleton MultiModelConsensusEngine.callOllama uses.
    expect(ollamaClientEngine.getHost()).not.toContain("localhost");
    if (!process.env.OLLAMA_HOST || !process.env.OLLAMA_HOST.startsWith("http")) {
      expect(ollamaClientEngine.getHost()).toBe("http://127.0.0.1:11434");
    }
  });

  it("connect() with an explicit host overrides the default (and is reflected by getHost)", async () => {
    const engine = new OllamaClientEngine();
    // A bogus but well-formed host: connect dynamically imports `ollama` and
    // constructs a client (no network until a request), so getHost reflects the
    // passed host even when the daemon is absent.
    const explicit = "http://127.0.0.1:65535";
    await engine.connect(explicit);
    expect(engine.getHost()).toBe(explicit);
  });
});
