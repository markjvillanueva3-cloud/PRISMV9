// autostart-bus.test.mjs — pure tests for the audit-final/iter2 F3 lib.

import { test } from "node:test";
import assert from "node:assert/strict";

test("autostart-bus — PRISM_AUTOSTART_BUS_DISABLE=1 → recentlyProbed returns {skip:false}", async () => {
  process.env.PRISM_AUTOSTART_BUS_DISABLE = "1";
  const { recentlyProbed } = await import("./autostart-bus.mjs?disable=" + Date.now());
  assert.deepEqual(recentlyProbed("ollama"), { skip: false });
  delete process.env.PRISM_AUTOSTART_BUS_DISABLE;
});

test("autostart-bus — missing serviceName returns {skip:false}", async () => {
  const { recentlyProbed } = await import("./autostart-bus.mjs?empty=" + Date.now());
  assert.deepEqual(recentlyProbed(""), { skip: false });
  assert.deepEqual(recentlyProbed(undefined), { skip: false });
});

test("autostart-bus — markProbed is best-effort no-throw on any input", async () => {
  const { markProbed } = await import("./autostart-bus.mjs?mark=" + Date.now());
  // None of these should throw.
  markProbed("ollama", { running: true });
  markProbed("", null);
  markProbed(undefined, undefined);
  markProbed("nim", { running: false, started: true });
});

test("autostart-bus — readBus returns an object (possibly empty)", async () => {
  const { readBus } = await import("./autostart-bus.mjs?read=" + Date.now());
  const bus = readBus();
  assert.equal(typeof bus, "object");
  assert.ok(bus !== null);
});
