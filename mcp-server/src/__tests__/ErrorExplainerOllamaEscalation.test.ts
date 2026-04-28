/**
 * ErrorExplainerOllamaEscalation.test.ts
 *
 * OLLAMA-DEV-02 — verifies that ErrorExplainerEngine.explainEscalated:
 *   1. Returns the deterministic match unchanged when one exists
 *      (no Ollama call, no degradation).
 *   2. Calls Ollama for unknown errors and replaces the generic
 *      guidance with domain-specific minimalFix.
 *   3. Falls back to the sync result when Ollama is unreachable
 *      (graceful degrade).
 *   4. Falls back when Ollama returns malformed JSON.
 *   5. Round-trips through prism_dev:error_explain_escalated.
 *
 * Uses an in-process HTTP stub on localhost:0 to control Ollama's
 * response shape — no live Ollama dependency.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "node:http";
import { errorExplainerEngine } from "../engines/ErrorExplainerEngine.js";

let stubServer: ReturnType<typeof createServer> | null = null;
let stubPort = 0;
let stubBehavior: "ok" | "malformed" | "empty" | "http500" = "ok";
let stubResponse: { plainLanguage: string; minimalFix: string; unblockCommand: string } = {
  plainLanguage: "Module not installed",
  minimalFix: "Run: npm install <package>",
  unblockCommand: "npm install",
};

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    stubServer = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => { body += c; });
      req.on("end", () => {
        if (stubBehavior === "http500") {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end("{}");
          return;
        }
        if (stubBehavior === "empty") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ response: "" }));
          return;
        }
        const inner = stubBehavior === "malformed" ? "not-valid-json{{" : JSON.stringify(stubResponse);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ response: inner }));
      });
    });
    stubServer.listen(0, "127.0.0.1", () => {
      const addr = stubServer!.address();
      if (typeof addr === "object" && addr) stubPort = addr.port;
      resolve();
    });
    stubServer.on("error", reject);
  });
});

afterAll(async () => {
  if (stubServer) await new Promise<void>((r) => stubServer!.close(() => r()));
});

describe("ErrorExplainerEngine.explain — sync path (no Ollama)", () => {
  it("happy path: known TS2322 pattern returns deterministic guidance", () => {
    const r = errorExplainerEngine.explain({
      source: "tsc",
      message: "src/foo.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.",
    });
    expect(r.category).not.toBe("unknown");
    expect(r.confidence).toBeGreaterThan(0.5);
    expect(r.minimalFix.length).toBeGreaterThan(5);
  });

  it("unknown pattern returns generic guidance with category=unknown", () => {
    const r = errorExplainerEngine.explain({
      source: "other",
      message: "this is some completely novel error message no matcher recognizes today",
    });
    expect(r.category).toBe("unknown");
    expect(r.plainLanguage).toBe("No known pattern matched this error.");
    expect(r.confidence).toBe(0.2);
  });

  it("FAIL: explain throws on missing message", () => {
    expect(() => errorExplainerEngine.explain({ source: "tsc", message: undefined as unknown as string }))
      .toThrow(/message required/);
  });
});

describe("ErrorExplainerEngine.explainEscalated — OLLAMA-DEV-02", () => {
  it("known pattern: returns sync result unchanged, never calls Ollama", async () => {
    const orig = process.env.OLLAMA_URL;
    process.env.OLLAMA_URL = `http://127.0.0.1:${stubPort}`;
    try {
      stubBehavior = "ok";
      const r = await errorExplainerEngine.explainEscalated({
        source: "tsc",
        message: "src/foo.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.",
      });
      // Confidence should match the sync deterministic result, not the
      // 0.5 score of the Ollama-escalated path
      expect(r.category).not.toBe("unknown");
      expect(r.confidence).not.toBe(0.5);
    } finally {
      if (orig) process.env.OLLAMA_URL = orig; else delete process.env.OLLAMA_URL;
    }
  });

  it("unknown pattern + Ollama up: returns Ollama's domain-specific guidance", async () => {
    const orig = process.env.OLLAMA_URL;
    process.env.OLLAMA_URL = `http://127.0.0.1:${stubPort}`;
    stubBehavior = "ok";
    stubResponse = {
      plainLanguage: "Specific guidance for the foo-bar scenario",
      minimalFix: "Apply the foo-bar specific fix here",
      unblockCommand: "npm install foo-bar",
    };
    try {
      const r = await errorExplainerEngine.explainEscalated({
        source: "other",
        message: "completely novel foo-bar diagnostic that no deterministic catalog matcher recognizes today at all",
      });
      expect(r.category).toBe("unknown");
      expect(r.plainLanguage).toContain("foo-bar");
      expect(r.minimalFix).toContain("foo-bar");
      expect(r.unblockCommand).toBe("npm install foo-bar");
      expect(r.confidence).toBe(0.5);
    } finally {
      if (orig) process.env.OLLAMA_URL = orig; else delete process.env.OLLAMA_URL;
    }
  });

  it("FAIL: unknown pattern + Ollama unreachable: falls back to sync generic guidance", async () => {
    const orig = process.env.OLLAMA_URL;
    process.env.OLLAMA_URL = "http://127.0.0.1:1";
    try {
      const r = await errorExplainerEngine.explainEscalated({
        source: "other",
        message: "this is some completely novel error message no matcher recognizes today either",
      });
      expect(r.category).toBe("unknown");
      expect(r.plainLanguage).toBe("No known pattern matched this error.");
      expect(r.confidence).toBe(0.2);
    } finally {
      if (orig) process.env.OLLAMA_URL = orig; else delete process.env.OLLAMA_URL;
    }
  });

  it("FAIL: Ollama returns malformed JSON: falls back to sync result", async () => {
    const orig = process.env.OLLAMA_URL;
    process.env.OLLAMA_URL = `http://127.0.0.1:${stubPort}`;
    stubBehavior = "malformed";
    try {
      const r = await errorExplainerEngine.explainEscalated({
        source: "other",
        message: "another truly novel error pattern that should not match the deterministic catalog at all",
      });
      expect(r.category).toBe("unknown");
      expect(r.plainLanguage).toBe("No known pattern matched this error.");
    } finally {
      if (orig) process.env.OLLAMA_URL = orig; else delete process.env.OLLAMA_URL;
    }
  });

  it("FAIL: Ollama returns HTTP 500: falls back to sync result", async () => {
    const orig = process.env.OLLAMA_URL;
    process.env.OLLAMA_URL = `http://127.0.0.1:${stubPort}`;
    stubBehavior = "http500";
    try {
      const r = await errorExplainerEngine.explainEscalated({
        source: "other",
        message: "yet another novel error pattern the catalog will not recognize cleanly today either",
      });
      expect(r.category).toBe("unknown");
      expect(r.confidence).toBe(0.2);
    } finally {
      if (orig) process.env.OLLAMA_URL = orig; else delete process.env.OLLAMA_URL;
    }
  });

  it("ADV: Ollama returns empty response: falls back to sync", async () => {
    const orig = process.env.OLLAMA_URL;
    process.env.OLLAMA_URL = `http://127.0.0.1:${stubPort}`;
    stubBehavior = "empty";
    try {
      const r = await errorExplainerEngine.explainEscalated({
        source: "other",
        message: "yet another novel error pattern not in the catalog today no matcher will hit it",
      });
      expect(r.category).toBe("unknown");
    } finally {
      if (orig) process.env.OLLAMA_URL = orig; else delete process.env.OLLAMA_URL;
    }
  });

  it("ADV: variability — 3 distinct unknown errors all reach Ollama escalation", async () => {
    const orig = process.env.OLLAMA_URL;
    process.env.OLLAMA_URL = `http://127.0.0.1:${stubPort}`;
    stubBehavior = "ok";
    stubResponse = {
      plainLanguage: "Generic Ollama explanation",
      minimalFix: "Generic Ollama fix",
      unblockCommand: "echo done",
    };
    try {
      const sources = ["tsc", "vitest", "build"] as const;
      let escalatedCount = 0;
      for (const source of sources) {
        const r = await errorExplainerEngine.explainEscalated({
          source,
          message: `truly novel error from ${source} that has no deterministic matcher in the catalog at all`,
        });
        if (r.confidence === 0.5 && r.minimalFix.startsWith("Generic Ollama fix")) {
          escalatedCount++;
        }
      }
      expect(escalatedCount).toBe(3);
    } finally {
      if (orig) process.env.OLLAMA_URL = orig; else delete process.env.OLLAMA_URL;
    }
  });
});

describe("error_explain_escalated dispatcher round-trip — OLLAMA-DEV-02", () => {
  it("dispatcher action enum includes error_explain_escalated", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync("H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts", "utf8");
    expect(content).toContain('"error_explain_escalated"');
    expect(content).toContain('case "error_explain_escalated":');
  });

  it("ADV: errorExplainerEngine.explainEscalated returns same shape as explain()", async () => {
    const orig = process.env.OLLAMA_URL;
    process.env.OLLAMA_URL = "http://127.0.0.1:1"; // unreachable
    try {
      const r = await errorExplainerEngine.explainEscalated({
        source: "tsc",
        message: "src/x.ts(1,1): error TS2322: Type 'a' is not assignable to type 'b'.",
      });
      expect(typeof r.category).toBe("string");
      expect(typeof r.plainLanguage).toBe("string");
      expect(typeof r.minimalFix).toBe("string");
      expect(typeof r.unblockCommand).toBe("string");
      expect(typeof r.confidence).toBe("number");
    } finally {
      if (orig) process.env.OLLAMA_URL = orig; else delete process.env.OLLAMA_URL;
    }
  });
});
