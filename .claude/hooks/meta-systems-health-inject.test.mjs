#!/usr/bin/env node
// tier: T4
// Tests for .claude/hooks/meta-systems-health-inject.mjs
// Pure formatMetaHealthAdvisory(verdicts) -- fixture-driven, no IO. Importing the
// hook is side-effect-free (main() is gated behind _invokedDirectly).
// Run: node .claude/hooks/meta-systems-health-inject.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMetaHealthAdvisory } from "./meta-systems-health-inject.mjs";

const UTILIZED = (system) => ({ system, status: "UTILIZED", evidence: `${system} ok`, action: null });
const ALL_OK = [UTILIZED("ollama"), UTILIZED("hermes"), UTILIZED("octopus"), UTILIZED("obsidian")];

test("all UTILIZED -> null (silent when healthy)", () => {
  assert.equal(formatMetaHealthAdvisory(ALL_OK), null);
});

test("empty / null / non-array -> null (never throws)", () => {
  assert.equal(formatMetaHealthAdvisory([]), null);
  assert.equal(formatMetaHealthAdvisory(null), null);
  assert.equal(formatMetaHealthAdvisory(undefined), null);
  assert.equal(formatMetaHealthAdvisory("nope"), null);
});

test("a DOWN substrate surfaces with evidence, action, and self-heal command", () => {
  const v = [
    UTILIZED("ollama"),
    { system: "hermes", status: "DOWN", evidence: "proxy :8645 ECONNREFUSED", action: "verify Hermes proxy :8645 up" },
    UTILIZED("octopus"),
    UTILIZED("obsidian"),
  ];
  const out = formatMetaHealthAdvisory(v);
  assert.ok(out, "must produce an advisory when one substrate is DOWN");
  assert.match(out, /1\/4 substrate\(s\) degraded/);
  assert.match(out, /HERMES \[DOWN\]/);
  assert.match(out, /proxy :8645 ECONNREFUSED/);          // evidence surfaced
  assert.match(out, /verify Hermes proxy :8645 up/);       // action surfaced
  assert.match(out, /self-heal: `node H:\/prism\/scripts\/hermes-proxy-ensure\.mjs`/); // runnable fix
  // healthy substrates are NOT listed
  assert.ok(!/OLLAMA \[/.test(out), "UTILIZED substrates must not appear");
  assert.ok(!/OBSIDIAN \[/.test(out), "UTILIZED substrates must not appear");
});

test("DOWN sorts before UNDER-UTILIZED (worst-first)", () => {
  const v = [
    { system: "ollama", status: "UNDER-UTILIZED", evidence: "stale", action: "route via ask-ollama" },
    { system: "hermes", status: "DOWN", evidence: "dead", action: "fix proxy" },
  ];
  const out = formatMetaHealthAdvisory(v);
  assert.match(out, /2\/2 substrate\(s\) degraded/);
  const downIdx = out.indexOf("HERMES [DOWN]");
  const underIdx = out.indexOf("OLLAMA [UNDER-UTILIZED]");
  assert.ok(downIdx >= 0 && underIdx >= 0, "both surfaced");
  assert.ok(downIdx < underIdx, "DOWN must be listed before UNDER-UTILIZED");
});

test("UNDER-UTILIZED without a known self-heal still surfaces (action only)", () => {
  // an unknown system has no SELF_HEAL entry -> no self-heal line, but still listed
  const v = [{ system: "mystery", status: "UNDER-UTILIZED", evidence: "quiet", action: "do thing" }];
  const out = formatMetaHealthAdvisory(v);
  assert.match(out, /MYSTERY \[UNDER-UTILIZED\]/);
  assert.match(out, /-> do thing/);
  assert.ok(!/self-heal:/.test(out), "no self-heal line for an unknown system");
});

test("a verdict missing evidence/action degrades gracefully (no crash, placeholder)", () => {
  const v = [{ system: "octopus", status: "DOWN" }];
  const out = formatMetaHealthAdvisory(v);
  assert.match(out, /OCTOPUS \[DOWN\]/);
  assert.match(out, /\(no evidence\)/);
  // octopus has a self-heal mapping
  assert.match(out, /consensus-queue-drain\.mjs/);
});
