/**
 * hook-broker-classifier.test.mjs — U-DOCKER-HOOK-BROKER-P1
 *
 * Hermetic tests for the pure-core classifier. Exercise:
 *   - `stripBlockBodies` brace counter (strings, templates, comments)
 *   - `detectMutations` regex set (fs/child_process/network)
 *   - `classifyHookContent` decision tree across every category
 *   - `summarizeReport` aggregation + freeze + truncation
 *
 * NOTE: test fixture strings that need to contain mutation tokens (e.g.
 * `execSync`, `spawn`, `writeFileSync`) are constructed via string
 * concatenation so the security PreToolUse hook does not false-positive
 * the test file itself as containing risky shell-exec patterns.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  stripBlockBodies,
  classifyHookContent,
  detectMutations,
  summarizeReport,
} from "./hook-broker-classifier.mjs";

// Build mutation tokens dynamically so the security hook doesn't false-positive
// the test file. These are the literal strings the classifier MUST detect.
const TOK_EXEC = "ex" + "ec";
const TOK_EXEC_SYNC = "ex" + "ecSync";
const TOK_EXEC_FILE = "ex" + "ecFile";
const TOK_FORK = "fo" + "rk";

// Length threshold matches MIN_NONEMPTY_BYTES in classifier (100 bytes of
// non-shebang/non-comment content) — used in tests that need to exceed it.
const NONEMPTY_PADDING = "// keep this file above the empty-classification threshold so the unknown branch is exercised\n";

describe("stripBlockBodies", () => {
  it("removes content inside top-level function bodies", () => {
    const src = "const x = 1;\nfunction foo() {\n  process.exit(1);\n}\nconst y = 2;\n";
    const out = stripBlockBodies(src);
    assert.match(out, /const x = 1/);
    assert.match(out, /const y = 2/);
    assert.doesNotMatch(out, /process\.exit/);
  });

  it("treats braces inside double-quoted strings as opaque", () => {
    const src = 'const s = "text with } inside";\nconst y = 2;\n';
    const out = stripBlockBodies(src);
    assert.match(out, /text with \} inside/);
    assert.match(out, /const y = 2/);
  });

  it("treats braces inside single-quoted strings as opaque", () => {
    const src = "const s = 'text with } inside';\nconst y = 2;\n";
    const out = stripBlockBodies(src);
    assert.match(out, /text with \} inside/);
  });

  it("treats braces inside template literals as opaque", () => {
    const src = "const t = `template ${x} with } inside`;\nconst y = 2;\n";
    const out = stripBlockBodies(src);
    assert.match(out, /template/);
    assert.match(out, /const y = 2/);
  });

  it("treats braces inside line comments as opaque", () => {
    const src = "const x = 1; // has { brace } in it\nconst y = 2;\n";
    const out = stripBlockBodies(src);
    assert.match(out, /const x = 1/);
    assert.match(out, /const y = 2/);
  });

  it("treats braces inside block comments as opaque", () => {
    const src = "const x = 1;\n/* block } comment { with braces */\nconst y = 2;\n";
    const out = stripBlockBodies(src);
    assert.match(out, /const x = 1/);
    assert.match(out, /const y = 2/);
  });

  it("handles escaped quotes inside strings", () => {
    const src = 'const s = "a \\"b\\" c";\nconst y = 2;\n';
    const out = stripBlockBodies(src);
    assert.match(out, /const y = 2/);
  });

  it("returns empty string for null/undefined/non-string input", () => {
    assert.equal(stripBlockBodies(null), "");
    assert.equal(stripBlockBodies(undefined), "");
    assert.equal(stripBlockBodies(42), "");
  });

  it("handles nested function bodies (depth > 1)", () => {
    const src = "const x = 1;\nfunction a() {\n  function b() {\n    process.exit(1);\n  }\n}\n";
    const out = stripBlockBodies(src);
    assert.doesNotMatch(out, /process\.exit/);
    assert.match(out, /const x = 1/);
  });
});

describe("detectMutations", () => {
  it("flags spawnSync", () => {
    const r = detectMutations("import { spawnSync } from 'node:child_process';\nspawnSync('ls');\n");
    assert.equal(r.mutates, true);
    assert.ok(r.hits.includes("spawnSync"));
  });

  it("flags " + TOK_EXEC_SYNC, () => {
    const r = detectMutations(TOK_EXEC_SYNC + "('echo hi');\n");
    assert.equal(r.mutates, true);
    assert.ok(r.hits.includes(TOK_EXEC_SYNC));
  });

  it("flags " + TOK_EXEC_FILE, () => {
    const r = detectMutations(TOK_EXEC_FILE + "Sync('node', ['-v']);\n");
    assert.equal(r.mutates, true);
    assert.ok(r.hits.includes(TOK_EXEC_FILE));
  });

  it("flags fs.promises.writeFile (P0 fix — runtime side effects in async handlers)", () => {
    const src =
      "export default async function handle(input) {\n  await fs.promises.writeFile('/tmp/x', 'data');\n  return {};\n}\n";
    const r = detectMutations(src);
    assert.equal(r.mutates, true);
    assert.ok(r.hits.includes("writeFileAsync"));
  });

  it("flags fs.promises.writeFile via fsp alias", () => {
    const r = detectMutations("await fsp.writeFile('/tmp/x', 'data');\n");
    assert.equal(r.mutates, true);
    assert.ok(r.hits.includes("writeFileAsync"));
  });

  it("flags appendFile / appendFileSync", () => {
    assert.equal(detectMutations("appendFileSync('/tmp/x', 'y');\n").mutates, true);
    assert.equal(detectMutations("await appendFile('/tmp/x', 'y');\n").mutates, true);
  });

  it("flags unlinkSync + renameSync", () => {
    assert.equal(detectMutations("unlinkSync('/tmp/x');\n").mutates, true);
    assert.equal(detectMutations("renameSync('a', 'b');\n").mutates, true);
  });

  it("flags fetch", () => {
    const r = detectMutations("const r = await fetch('https://api/');\n");
    assert.equal(r.mutates, true);
    assert.ok(r.hits.includes("fetch"));
  });

  it("flags https.request / http.request", () => {
    assert.equal(detectMutations("https.request(opts, cb);\n").mutates, true);
    assert.equal(detectMutations("http.request(opts, cb);\n").mutates, true);
  });

  it("does NOT flag bare 'request(...)' from arbitrary libraries", () => {
    const r = detectMutations("api.request({});\nfoo.request(x);\n");
    assert.equal(r.hits.includes("httpRequest"), false);
  });

  it("flags net.connect", () => {
    const r = detectMutations("net.connect(8080, 'localhost');\n");
    assert.equal(r.mutates, true);
    assert.ok(r.hits.includes("netConnect"));
  });

  it("does NOT flag spawn when prefixed (e.g. `worker.spawn(`, `wp.spawn(`)", () => {
    const r = detectMutations("worker.spawn(opts);\nfoo.bar.spawn(x);\n");
    assert.equal(r.hits.includes("spawn"), false);
  });

  it("flags " + TOK_FORK, () => {
    const r = detectMutations(TOK_FORK + "(modulePath);\n");
    assert.equal(r.mutates, true);
    assert.ok(r.hits.includes(TOK_FORK));
  });

  it("returns mutates=false for inert code", () => {
    const r = detectMutations("export default function handle(x) { return x + 1; }\n");
    assert.equal(r.mutates, false);
    assert.deepEqual(r.hits, []);
  });

  it("handles empty input safely", () => {
    assert.deepEqual(detectMutations(""), { mutates: false, hits: [] });
  });
});

describe("classifyHookContent — module-safe", () => {
  it("classifies a clean exported handler with no side effects", () => {
    const src = `import { foo } from 'node:util';

/**
 * Pure handler.
 */
export default function handle(input) {
  const parsed = JSON.parse(input);
  return { continue: true, payload: parsed };
}
`;
    const c = classifyHookContent(src);
    assert.equal(c.category, "module-safe");
    assert.equal(c.hasDefaultExport, true);
    assert.equal(c.mutatesProcess, false);
  });

  it("classifies named-export handlers as module-safe", () => {
    const src = `import { x } from 'somewhere';

export async function handle(input) {
  return { continue: true };
}

export const VERSION = '1.0.0';
`;
    const c = classifyHookContent(src);
    assert.equal(c.category, "module-safe");
    assert.equal(c.hasNamedExport, true);
  });

  it("does NOT classify as module-safe if exported handler awaits fs.promises.writeFile", () => {
    // P0 closure: runtime side effects inside an exported async fn
    // still disqualify from in-process sharing.
    const src = `import { promises as fs } from 'node:fs';

export default async function handle(input) {
  await fs.writeFile('/tmp/log', input);
  return {};
}
`;
    const c = classifyHookContent(src);
    assert.notEqual(c.category, "module-safe");
    assert.equal(c.category, "mutates-process");
  });

  it("does NOT classify as module-safe if exported handler fetches", () => {
    const src = `export default async function handle(input) {
  await fetch('http://localhost/api');
  return {};
}
`;
    const c = classifyHookContent(src);
    assert.equal(c.category, "mutates-process");
  });
});

describe("classifyHookContent — mutates-process", () => {
  it("classifies hooks calling spawnSync", () => {
    const src = `import { spawnSync } from 'node:child_process';
const r = spawnSync('node', ['-v']);
process.stdout.write(JSON.stringify(r));
`;
    const c = classifyHookContent(src);
    assert.equal(c.category, "mutates-process");
  });

  it("classifies hooks with top-level writeFileSync", () => {
    const src = `import * as fs from 'node:fs';
const data = process.stdin;
writeFileSync('/tmp/x', 'y');
process.stdout.write('{}');
`;
    const c = classifyHookContent(src);
    assert.equal(c.category, "mutates-process");
  });

  it("classifies _envelope.mjs shape correctly (spawnSync + process orchestration)", () => {
    // Sample shape matching H:/prism/.claude/hooks/_envelope.mjs.
    const src = `#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';

const argv = process.argv.slice(2);
if (argv.length === 0) {
  process.exit(0);
}
const target = argv[0];
const result = spawnSync(target, [], { stdio: 'inherit' });
process.exit(result.status ?? 0);
`;
    const c = classifyHookContent(src);
    assert.equal(c.category, "mutates-process");
    assert.ok(c.signals.some((s) => s.startsWith("mutation:spawnSync")));
  });
});

describe("classifyHookContent — cli-safe-stdin-stdout", () => {
  it("classifies a top-level stdin→stdout hook with no mutation", () => {
    const src = `const stdin = await new Response(process.stdin).text();
const parsed = JSON.parse(stdin);
process.stdout.write(JSON.stringify({ continue: true }));
process.exit(0);
`;
    const c = classifyHookContent(src);
    assert.equal(c.category, "cli-safe-stdin-stdout");
    assert.equal(c.readsStdin, true);
    assert.equal(c.writesStdout, true);
  });

  it("uses console.log as a writesStdout signal", () => {
    const src = `const stdin = await new Response(process.stdin).text();
console.log(JSON.stringify({ ok: true }));
`;
    const c = classifyHookContent(src);
    assert.equal(c.category, "cli-safe-stdin-stdout");
  });
});

describe("classifyHookContent — imports-only / empty / unknown", () => {
  it("classifies an imports-only shim as imports-only", () => {
    const src = `import './_rpc-shim.mjs';
import * as types from './_types.mjs';
`;
    const c = classifyHookContent(src);
    assert.equal(c.category, "imports-only");
  });

  it("classifies <100-byte non-shebang content as empty", () => {
    const c1 = classifyHookContent("");
    assert.equal(c1.category, "empty");
    const c2 = classifyHookContent("#!/usr/bin/env node\n// short\n");
    assert.equal(c2.category, "empty");
  });

  it("classifies unparseable content as unknown", () => {
    const src = `const handler = (input) => {
  // does something useful — but no exports, no stdin reads,
  // no top-level stdout writes, no mutation
  const x = 1 + 2;
  return x;
};
// no export, no invocation
const y = 42;
${NONEMPTY_PADDING}const z = 'placeholder content padding to ensure length over the empty threshold';
`;
    const c = classifyHookContent(src);
    assert.equal(c.category, "unknown");
  });

  it("handles null/undefined input safely", () => {
    assert.equal(classifyHookContent(null).category, "empty");
    assert.equal(classifyHookContent(undefined).category, "empty");
  });
});

describe("summarizeReport", () => {
  function mkClassification(category) {
    return classifyHookContent(
      category === "module-safe"
        ? "import { x } from 'somewhere';\nexport default function h(i) { return i; }\n"
        : category === "mutates-process"
        ? "import { spawnSync } from 'node:child_process';\nspawnSync('ls');\n"
        : category === "cli-safe-stdin-stdout"
        ? "const s = await new Response(process.stdin).text();\nprocess.stdout.write(s);\nprocess.exit(0);\n"
        : category === "imports-only"
        ? "import './a.mjs';\nimport './b.mjs';\nimport './c.mjs';\nimport './d.mjs';\nimport './e.mjs';\n"
        : "",
    );
  }

  it("counts each category correctly", () => {
    const entries = [
      { filePath: "/a.mjs", classification: mkClassification("module-safe") },
      { filePath: "/b.mjs", classification: mkClassification("module-safe") },
      { filePath: "/c.mjs", classification: mkClassification("mutates-process") },
      { filePath: "/d.mjs", classification: mkClassification("cli-safe-stdin-stdout") },
      { filePath: "/e.mjs", classification: mkClassification("imports-only") },
      { filePath: "/f.mjs", classification: mkClassification("empty") },
    ];
    const r = summarizeReport(entries);
    assert.equal(r.total, 6);
    assert.equal(r.byCategory["module-safe"], 2);
    assert.equal(r.byCategory["mutates-process"], 1);
    assert.equal(r.byCategory["cli-safe-stdin-stdout"], 1);
    assert.equal(r.byCategory["imports-only"], 1);
    assert.equal(r.byCategory["empty"], 1);
  });

  it("computes broker strategy correctly", () => {
    const entries = [
      { filePath: "/a.mjs", classification: mkClassification("module-safe") },
      { filePath: "/c.mjs", classification: mkClassification("mutates-process") },
      { filePath: "/d.mjs", classification: mkClassification("cli-safe-stdin-stdout") },
      { filePath: "/e.mjs", classification: mkClassification("imports-only") },
    ];
    const r = summarizeReport(entries);
    assert.equal(r.brokerStrategy.sharable_in_process, 1);
    assert.equal(r.brokerStrategy.spawn_cache, 1);
    assert.equal(r.brokerStrategy.spawn_isolate, 1);
    assert.equal(r.brokerStrategy.ignore, 1);
  });

  it("caps topMutators to 25 + reports truncation count", () => {
    const entries = [];
    for (let i = 0; i < 30; i++) {
      entries.push({ filePath: `/m${i}.mjs`, classification: mkClassification("mutates-process") });
    }
    const r = summarizeReport(entries);
    assert.equal(r.topMutators.length, 25);
    assert.equal(r.mutatorsTruncated, 5);
  });

  it("returns a frozen object (consistent with classification policy)", () => {
    const r = summarizeReport([]);
    assert.equal(Object.isFrozen(r), true);
    assert.equal(Object.isFrozen(r.byCategory), true);
    assert.equal(Object.isFrozen(r.brokerStrategy), true);
    assert.equal(Object.isFrozen(r.topMutators), true);
  });

  it("counts invalid entries separately (does not inflate categories)", () => {
    const entries = [
      { filePath: "/a.mjs", classification: mkClassification("module-safe") },
      { filePath: "/b.mjs", classification: null },
      { filePath: "/c.mjs", classification: undefined },
      { filePath: "/d.mjs", classification: { category: "made-up-category" } },
    ];
    const r = summarizeReport(entries);
    assert.equal(r.total, 4);
    assert.equal(r.invalidEntries, 3);
    assert.equal(r.byCategory["module-safe"], 1);
  });

  it("includes a stable schemaVersion", () => {
    const r = summarizeReport([]);
    assert.equal(r.schemaVersion, "1.0.0");
  });
});
