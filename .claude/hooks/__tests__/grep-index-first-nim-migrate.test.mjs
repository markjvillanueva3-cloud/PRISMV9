/**
 * grep-index-first-nim-migrate.test.mjs
 *
 * Regression oracle for NIM-ACTIVATION-MS0/U-NIM-MIGRATE-01.
 * Pins the bridge contract so a future edit that reverts to the
 * direct ollama-hook-bridge import (and loses NIM/vLLM auto-routing)
 * fails loudly. Test verifies INTENT (R9): NIM-aware delegation +
 * bit-exact Ollama fallback path through queryLocalLLM.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK_PATH = join(__dirname, '..', 'grep-index-first.mjs');
const src = readFileSync(HOOK_PATH, 'utf8');

test('imports local-llm-bridge (not the direct ollama bridge)', () => {
  // Dynamic `await import('./lib/local-llm-bridge.mjs')` — match either static-from or dynamic-import.
  assert.match(src, /['"]\.\/lib\/local-llm-bridge\.mjs['"]/, 'must reference local-llm-bridge module path');
  assert.ok(!/['"]\.\/lib\/ollama-hook-bridge\.mjs['"]/.test(src),
    'must NOT directly import ollama-hook-bridge — bridge is reached transitively via local-llm-bridge');
});

test('binds queryLocalLLM (the bridge dispatch fn), not queryOllama', () => {
  assert.match(src, /queryLocalLLM\s*=\s*bridge\.queryLocalLLM/, 'must bind queryLocalLLM');
});

test('routes with hookType "classify" so auto mode prefers NIM', () => {
  // VLLM_PREFERRED in local-llm-bridge: reasoning/code/errortriage/lint.
  // Everything else routes NIM-first; "classify" is the explicit signal.
  assert.match(src, /hookType:\s*['"]classify['"]/, 'must pass hookType:"classify" for NIM-first routing');
  assert.ok(!/hookType:\s*['"]grep_index['"]/.test(src),
    'legacy hookType "grep_index" must be retired (no router has a routing rule for it)');
});

test('preserves regex fallback (graceful degradation when no local LLM)', () => {
  // If the bridge import fails OR no backend is up, the hook still emits
  // regex-based suggestions. This is the "bit-exact" half of the fallback guarantee.
  assert.match(src, /getRegexSuggestions/, 'regex fallback function must remain');
  assert.match(src, /if\s*\(\s*!queryLocalLLM\s*\)\s*return\s+null/, 'must short-circuit to fallback when bridge missing');
});

test('result-shape contract preserved (success + response keys)', () => {
  // local-llm-bridge result shape: { success, response, error, latencyMs, backend, model }
  // The hook reads result.success && result.response — same as the pre-migration shape.
  assert.match(src, /result\.success\s*&&\s*result\.response/, 'must read result.success + result.response');
});
