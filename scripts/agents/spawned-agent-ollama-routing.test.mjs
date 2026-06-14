// Tests for the Ollama-offload routing rules in the spawned-agent context
// bundle (U-SUBAGENT-OLLAMA-PARITY, slot:zulu 2026-06-12).
// WHY (R9): subagents receive NO UserPromptSubmit hooks, so the SubagentStart
// bundle is the ONLY surface giving a spawned agent the same Ollama-first
// routing the parent chat gets injected every prompt (task-start-substrate,
// ollama-pipeline-injector, MODEL-ROUTING -- none fire in a subagent). Pins:
//  (1) the rule is present and names the EXECUTABLE CLI (a bash-capable agent
//      cannot call aiSystemRouterEngine.route -- a .ts engine API),
//  (2) every mode the bundle advertises EXISTS in ask-ollama.mjs (drift guard),
//  (3) the safety boundary (judgment + safety stays on Claude) is stated,
//  (4) Ollama-down behavior is fail-loud and the PARENT owns the fallback
//      ladder (a subagent must never silently absorb a mechanical batch),
//  (5) ADVERSARIAL: no retired model tags (:3b/:7b/:14b, Blackwell 2026-06-04).

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSpawnedAgentAdditionalContext } from "./spawned-agent-context-lib.mjs";
import { ALL_MODES } from "../ask-ollama.mjs";

// Empty taskNote -> per-task presearch sections skip cleanly (back-compat
// contract from subagent-per-task-presearch) -- keeps the test fast and
// independent of the big graph/tribal sidecars.
const bundlePromise = buildSpawnedAgentAdditionalContext({
  parentFamily: "Claude",
  parentInstance: "claude-test0000",
  subagentType: "reviewer",
  taskNote: "",
});

function offloadLines(bundle) {
  return bundle.split("\n").filter((l) => /Ollama (offload|down)/.test(l));
}

test("bundle carries the Ollama-offload rule with the executable CLI path + default model", async () => {
  const b = await bundlePromise;
  assert.match(b, /Ollama offload \(LOCAL first/, "the routing rule section is missing");
  assert.match(b, /scripts\/ask-ollama\.mjs/, "must name the executable CLI, not only an engine API");
  assert.match(b, /qwen2\.5-coder:32b/, "must name the live default model");
});

test("every mode the bundle advertises exists in ask-ollama.mjs (drift guard)", async () => {
  const b = await bundlePromise;
  const [ruleLine] = offloadLines(b);
  assert.ok(ruleLine, "offload rule line present");
  const groups = [...ruleLine.matchAll(/\{([a-z|]+)\}/g)].map((m) => m[1]);
  assert.ok(groups.length >= 2, "rule advertises both file-mode and text-mode groups");
  for (const mode of groups.flatMap((g) => g.split("|"))) {
    assert.ok(ALL_MODES.has(mode), `bundle advertises mode '${mode}' that ask-ollama.mjs does not export`);
  }
});

test("safety boundary + fail-loud Ollama-down contract are stated", async () => {
  const b = await bundlePromise;
  assert.match(b, /judgment \+ safety-critical/, "Claude-for-judgment boundary missing");
  assert.match(b, /:11434/, "down-detection signal (port) missing");
  assert.match(b, /PARENT owns the sonnet-agent fallback ladder/, "ladder ownership must stay with the parent");
});

test("rule is unconditional: explore-type subagent bundle carries it too (read-only agents summarize most)", async () => {
  const b = await buildSpawnedAgentAdditionalContext({
    parentFamily: "Claude",
    parentInstance: "claude-test0000",
    subagentType: "Explore",
    taskNote: "",
  });
  assert.match(b, /Ollama offload \(LOCAL first/);
});

test("ADVERSARIAL: no retired Ollama tags on the routing lines (:3b/:7b/:14b retired 2026-06-04)", async () => {
  const b = await bundlePromise;
  for (const line of offloadLines(b)) {
    for (const dead of [":3b", ":7b", ":14b"]) {
      assert.ok(!line.includes(dead), `retired tag ${dead} on routing line: ${line.slice(0, 120)}`);
    }
  }
});
