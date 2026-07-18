// ollama-task-offloader-nemotron-rung.test.mjs
// CLOUD-OVERFLOW (slot:papa 2026-06-17): the free Nemotron-3 cloud rung in the Ollama-down
// fallback ladder. Real reference-value asserts (R9) -- size-based rung pick + directive shape.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NEMOTRON_RUNG_MIN_CHARS,
  pickOllamaDownRung,
  buildNemotronFallbackDirective,
  buildClaudeFallbackDirective,
} from "../ollama-task-offloader.mjs";

test("pickOllamaDownRung: large task -> free cloud; small task -> cheap-Claude", () => {
  assert.equal(NEMOTRON_RUNG_MIN_CHARS, 1000);
  assert.equal(pickOllamaDownRung({ promptChars: 5000 }), "nemotron-free");
  assert.equal(pickOllamaDownRung({ promptChars: 1000 }), "nemotron-free");   // boundary inclusive
  assert.equal(pickOllamaDownRung({ promptChars: 999 }), "cheap-claude");
  assert.equal(pickOllamaDownRung({ promptChars: 0 }), "cheap-claude");
  assert.equal(pickOllamaDownRung({}), "cheap-claude");                        // default 0
});

test("pickOllamaDownRung: adversarial inputs default safe (cheap-claude)", () => {
  assert.equal(pickOllamaDownRung({ promptChars: NaN }), "cheap-claude");
  assert.equal(pickOllamaDownRung({ promptChars: -50 }), "cheap-claude");
  assert.equal(pickOllamaDownRung({ promptChars: "nope" }), "cheap-claude");
  // a custom minChars override is honored
  assert.equal(pickOllamaDownRung({ promptChars: 300, minChars: 200 }), "nemotron-free");
});

test("buildNemotronFallbackDirective: routes to the GUARDED ask-openrouter + names third-party risk", () => {
  const d = buildNemotronFallbackDirective("explanation", "claude-haiku-4-5-20251001");
  assert.match(d, /free Nemotron-3 cloud rung/);
  assert.match(d, /explanation/);                                  // category interpolated
  assert.match(d, /ask-openrouter\.mjs --ask/);                    // the guarded client + correct flag
  assert.equal(d.includes("openrouter-client"), false);           // never the raw client
  assert.match(d, /1M ctx, \$0/);                                  // free tier surfaced
  assert.match(d, /claude-haiku-4-5-20251001/);                    // cheap-Claude fallback carried
  assert.match(d, /POSTs prompt content to api\.openrouter\.ai \(third party\)/); // honest risk note
  assert.match(d, /refuses NC programs/);                          // safety guard named
});

test("buildClaudeFallbackDirective: UNCHANGED (back-compat regression guard)", () => {
  const d = buildClaudeFallbackDirective("summary", "claude-sonnet-4-6");
  assert.match(d, /OLLAMA DOWN -> cheap-Claude fallback/);
  assert.match(d, /claude-sonnet-4-6/);
  assert.equal(d.includes("ask-openrouter"), false);              // the cheap path stays Claude-only
});
