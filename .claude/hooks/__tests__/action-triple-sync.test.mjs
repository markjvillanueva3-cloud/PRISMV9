// tier: T4
/**
 * Tests for action-triple-sync hook (Universal Phase 0.6)
 *
 * Runs the hook as a child process with stdin JSON input and parses
 * stdout JSON. Verifies allow/deny decisions across scenarios.
 */

import { spawn } from "node:child_process";
import { strict as assert } from "node:assert";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.resolve(__dirname, "..", "lib", "action-triple-sync.mjs");

let passed = 0;
let failed = 0;

async function runHook(input) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [HOOK], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      try {
        const parsed = stdout.trim() ? JSON.parse(stdout.trim()) : null;
        resolve({ code, stdout, stderr, parsed });
      } catch (err) {
        reject(new Error(`parse failed: ${err.message} (stdout=${stdout})`));
      }
    });
    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}

function test(name, fn) {
  return fn()
    .then(() => { console.log(`  ✓ ${name}`); passed++; })
    .catch((err) => { console.error(`  ✗ ${name}\n    ${err.message}`); failed++; });
}

async function main() {
  console.log("action-triple-sync.mjs");

  await test("allows non-dispatcher file edits", async () => {
    const r = await runHook({
      tool_name: "Edit",
      tool_input: {
        file_path: "H:/prism/mcp-server/src/engines/FooEngine.ts",
        old_string: `"nothing"`,
        new_string: `"something"`,
      },
    });
    // allow = no stdout (process.exit(0) path)
    assert.equal(r.parsed, null);
  });

  await test("allows dispatcher edit that adds no new actions", async () => {
    const r = await runHook({
      tool_name: "Edit",
      tool_input: {
        file_path: "H:/prism/mcp-server/src/tools/dispatchers/ppDispatcher.ts",
        old_string: "// comment",
        new_string: "// comment updated",
      },
    });
    assert.equal(r.parsed, null);
  });

  // Helper: a "block" in bootstrap mode shows as allow + BOOTSTRAP WARN-ONLY
  // prefix; post-bootstrap it shows as deny. Both are correct outcomes — what
  // matters is that the violation was detected and surfaced.
  function assertBlockedOrWarned(parsed, expectInReason) {
    const out = parsed?.hookSpecificOutput;
    assert.ok(out, "hook must emit output for a violating edit");
    const decision = out.permissionDecision;
    const reason = out.permissionDecisionReason ?? "";
    const blocked = decision === "deny";
    const warned = decision === "allow" && /BOOTSTRAP WARN-ONLY/.test(reason);
    assert.ok(blocked || warned, `expected deny or warn-only, got decision=${decision} reason=${reason.slice(0,120)}`);
    if (expectInReason) {
      assert.match(reason, expectInReason, `reason missing expected pattern`);
    }
  }

  await test("DETECTS dispatcher edit adding enum action without case or schema", async () => {
    const r = await runHook({
      tool_name: "Edit",
      tool_input: {
        file_path: "H:/prism/mcp-server/src/tools/dispatchers/ppDispatcher.ts",
        old_string: `  "pp_other",\n`,
        new_string: `  "pp_other",\n  "pp_new_action",\n`,
      },
    });
    assertBlockedOrWarned(r.parsed, /ACTION TRIPLE SYNC/);
    assertBlockedOrWarned(r.parsed, /pp_new_action/);
  });

  await test("ALLOWS dispatcher edit adding action WITH matching case AND schema", async () => {
    const r = await runHook({
      tool_name: "Edit",
      tool_input: {
        file_path: "H:/prism/mcp-server/src/tools/dispatchers/ppDispatcher.ts",
        old_string: `  "pp_other",\n`,
        new_string:
          `  "pp_other",\n  "pp_new_action",\n\n` +
          `// schema\npp_new_action: z.object({ foo: z.string() }),\n\n` +
          `// switch\ncase "pp_new_action":\n  result = engine.run(params);\n  break;\n`,
      },
    });
    // allow = no stdout
    assert.equal(r.parsed, null);
  });

  await test("DETECTS when case is present but schema missing", async () => {
    const r = await runHook({
      tool_name: "Edit",
      tool_input: {
        file_path: "H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts",
        old_string: `  "calc_a",\n`,
        new_string:
          `  "calc_a",\n  "calc_only_case",\n\n` +
          `case "calc_only_case":\n  result = engine.run(params);\n  break;\n`,
      },
    });
    assertBlockedOrWarned(r.parsed, /schema=MISSING/);
  });

  await test("DETECTS when schema is present but case missing", async () => {
    const r = await runHook({
      tool_name: "Edit",
      tool_input: {
        file_path: "H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts",
        old_string: `  "calc_a",\n`,
        new_string:
          `  "calc_a",\n  "calc_only_schema",\n\n` +
          `calc_only_schema: z.object({ foo: z.string() }),\n`,
      },
    });
    assertBlockedOrWarned(r.parsed, /case=MISSING/);
  });

  await test("MultiEdit aggregates edits before checking", async () => {
    const r = await runHook({
      tool_name: "MultiEdit",
      tool_input: {
        file_path: "H:/prism/mcp-server/src/tools/dispatchers/ppDispatcher.ts",
        edits: [
          {
            old_string: `  "pp_a",\n`,
            new_string: `  "pp_a",\n  "pp_multi_new",\n`,
          },
          {
            old_string: "// schemas end",
            new_string: "pp_multi_new: z.object({}),\n// schemas end",
          },
          {
            old_string: "// switch end",
            new_string: `case "pp_multi_new":\n  result = {};\n  break;\n// switch end`,
          },
        ],
      },
    });
    // allow = no stdout
    assert.equal(r.parsed, null);
  });

  await test("only fires on Edit/MultiEdit — ignores Write and Bash", async () => {
    const rWrite = await runHook({
      tool_name: "Write",
      tool_input: {
        file_path: "H:/prism/mcp-server/src/tools/dispatchers/ppDispatcher.ts",
        content: `"pp_foo"`,
      },
    });
    assert.equal(rWrite.parsed, null);

    const rBash = await runHook({
      tool_name: "Bash",
      tool_input: { command: "echo hi" },
    });
    assert.equal(rBash.parsed, null);
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
