/**
 * ollama-hook-fire-audit.test.mjs
 *
 * Pure-helper coverage for OLLAMA-OBSIDIAN-ROUTING-AUDIT/F1 META artifact.
 * Tests the 4 exported pure functions without spinning the real audit.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  extractWiredHooks,
  classifyHook,
  bodyMatchesOllama,
  parseFireLedger,
} from "./ollama-hook-fire-audit.mjs";

describe("extractWiredHooks", () => {
  it("happy: extracts .mjs basenames from a settings.json blob", () => {
    const txt = `{
      "hooks": {
        "PreToolUse": [
          { "command": "node H:/prism/.claude/hooks/ollama-route-pretooluse.mjs" },
          { "command": "node H:/prism/.claude/hooks/master-index-precheck-inject.mjs" }
        ]
      }
    }`;
    const out = extractWiredHooks(txt);
    assert.ok(out.has("ollama-route-pretooluse"));
    assert.ok(out.has("master-index-precheck-inject"));
    assert.strictEqual(out.size, 2);
  });

  it("dedupes across multiple matcher entries", () => {
    const txt = `[
      { "command": "x ollama-pipeline-injector.mjs" },
      { "command": "y ollama-pipeline-injector.mjs" }
    ]`;
    const out = extractWiredHooks(txt);
    assert.strictEqual(out.size, 1);
    assert.ok(out.has("ollama-pipeline-injector"));
  });

  it("failure: empty string returns empty Set", () => {
    assert.strictEqual(extractWiredHooks("").size, 0);
  });

  it("failure: null returns empty Set (no throw)", () => {
    assert.strictEqual(extractWiredHooks(null).size, 0);
  });

  it("failure: non-string returns empty Set (no throw)", () => {
    assert.strictEqual(extractWiredHooks(42).size, 0);
    assert.strictEqual(extractWiredHooks({}).size, 0);
  });

  it("adversarial: garbled text doesn't crash, extracts what it can", () => {
    const txt = "{{{ ollama-x.mjs malformed }}} foo-bar.mjs zzz";
    const out = extractWiredHooks(txt);
    assert.ok(out.has("ollama-x"));
    assert.ok(out.has("foo-bar"));
  });
});

describe("classifyHook", () => {
  it("WIRED_FIRING when wired and fires", () => {
    assert.strictEqual(classifyHook({
      hookBaseName: "x", wiredInC: true, wiredInH: true, firedInLedger: true, existsOnDisk: true,
    }), "WIRED_FIRING");
  });

  it("WIRED_SILENT when wired but no telemetry", () => {
    assert.strictEqual(classifyHook({
      hookBaseName: "x", wiredInC: true, wiredInH: true, firedInLedger: false, existsOnDisk: true,
    }), "WIRED_SILENT");
  });

  it("UNWIRED_ON_DISK when on disk but not wired in either", () => {
    assert.strictEqual(classifyHook({
      hookBaseName: "x", wiredInC: false, wiredInH: false, firedInLedger: false, existsOnDisk: true,
    }), "UNWIRED_ON_DISK");
  });

  it("WIRED_BUT_FILE_MISSING when wired but file gone", () => {
    assert.strictEqual(classifyHook({
      hookBaseName: "x", wiredInC: true, wiredInH: true, firedInLedger: false, existsOnDisk: false,
    }), "WIRED_BUT_FILE_MISSING");
  });

  it("ABSENT when neither on disk nor wired", () => {
    assert.strictEqual(classifyHook({
      hookBaseName: "x", wiredInC: false, wiredInH: false, firedInLedger: false, existsOnDisk: false,
    }), "ABSENT");
  });

  it("wired-only-in-C still counts as wired", () => {
    assert.strictEqual(classifyHook({
      hookBaseName: "x", wiredInC: true, wiredInH: false, firedInLedger: true, existsOnDisk: true,
    }), "WIRED_FIRING");
  });

  it("wired-only-in-H still counts as wired (mirror lag)", () => {
    assert.strictEqual(classifyHook({
      hookBaseName: "x", wiredInC: false, wiredInH: true, firedInLedger: false, existsOnDisk: true,
    }), "WIRED_SILENT");
  });
});

describe("bodyMatchesOllama", () => {
  it("matches ollama token", () => {
    assert.strictEqual(bodyMatchesOllama("import { x } from 'ollama-client'"), true);
  });

  it("matches qwen/deepseek/llama/nim/qdrant/nomic", () => {
    assert.strictEqual(bodyMatchesOllama("model: qwen2.5-coder:7b"), true);
    assert.strictEqual(bodyMatchesOllama("deepseek-r1:14b"), true);
    assert.strictEqual(bodyMatchesOllama("llama3.2-vision:11b"), true);
    assert.strictEqual(bodyMatchesOllama("NIM_MAX_MODEL_LEN=8192"), true);
    assert.strictEqual(bodyMatchesOllama("qdrant collection 'wiki'"), true);
    assert.strictEqual(bodyMatchesOllama("nomic-embed-text:latest"), true);
  });

  it("failure: body without any token returns false", () => {
    assert.strictEqual(bodyMatchesOllama("just some random code without llm refs"), false);
  });

  it("failure: empty/null/non-string returns false", () => {
    assert.strictEqual(bodyMatchesOllama(""), false);
    assert.strictEqual(bodyMatchesOllama(null), false);
    assert.strictEqual(bodyMatchesOllama(42), false);
  });

  it("adversarial: case-insensitive match", () => {
    assert.strictEqual(bodyMatchesOllama("OLLAMA_URL=..."), true);
    assert.strictEqual(bodyMatchesOllama("Qdrant"), true);
  });
});

describe("parseFireLedger", () => {
  it("happy: parses JSONL with hook field", () => {
    const txt = '{"hook":"foo","ts":1}\n{"hook":"bar","ts":2}\n';
    const out = parseFireLedger(txt);
    assert.ok(out.has("foo"));
    assert.ok(out.has("bar"));
    assert.strictEqual(out.size, 2);
  });

  it("happy: alternative field names (name, hookName)", () => {
    const txt = '{"name":"alpha"}\n{"hookName":"bravo"}\n';
    const out = parseFireLedger(txt);
    assert.ok(out.has("alpha"));
    assert.ok(out.has("bravo"));
  });

  it("failure: malformed lines are skipped, not thrown", () => {
    const txt = 'this is not json\n{"hook":"good","ts":1}\n{"broken json}\n';
    const out = parseFireLedger(txt);
    assert.ok(out.has("good"));
    assert.strictEqual(out.size, 1);
  });

  it("failure: empty string returns empty Set", () => {
    assert.strictEqual(parseFireLedger("").size, 0);
  });

  it("failure: null/non-string returns empty Set", () => {
    assert.strictEqual(parseFireLedger(null).size, 0);
    assert.strictEqual(parseFireLedger(42).size, 0);
  });

  it("adversarial: events without name/hook fields are skipped", () => {
    const txt = '{"only":"junk"}\n{"hook":"keeper"}\n';
    const out = parseFireLedger(txt);
    assert.strictEqual(out.size, 1);
    assert.ok(out.has("keeper"));
  });

  it("adversarial: empty/whitespace lines tolerated", () => {
    const txt = '\n\n{"hook":"x"}\n   \n';
    const out = parseFireLedger(txt);
    assert.strictEqual(out.size, 1);
  });
});
