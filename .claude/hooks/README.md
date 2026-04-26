# PRISM Hook System

## Overview
Hooks provide pre/post-tool advice and enforcement. They run on tool events (PreToolUse, PostToolUse, SessionStart, Stop, etc.) and can block, warn, or inject context.

## Hook Migration Status (LOCAL-LLM-MS0)

### Local Inference (Zero API Tokens)
These hooks use local validation or Ollama — no Claude API consumption:

| Hook | Method | Replaces |
|------|--------|----------|
| `unified-local-validation.mjs` | Local regex | 6 validation hooks (naming, complexity, type, magic, async, performance) |
| `grep-index-first.mjs` | Ollama + regex fallback | — |
| `mcp-route-suggest.mjs` | Ollama + regex fallback | — |
| `lib/ollama-hook-bridge.mjs` | Shared Ollama helper | — |

### Disabled for Token Economy
These hooks have `DISABLED_TOKEN_REDUX` markers — functionality preserved but not firing to save tokens:
- `naming-convention-enforcer.mjs` → replaced by unified-local-validation
- `complexity-gate.mjs` → replaced by unified-local-validation
- `type-safety-checker.mjs` → replaced by unified-local-validation
- `magic-number-detector.mjs` → replaced by unified-local-validation
- `async-pattern-checker.mjs` → replaced by unified-local-validation
- `performance-pattern-detector.mjs` → replaced by unified-local-validation
- `reference-inject.mjs`, `discipline-expert-inject.mjs`, etc. → future migration candidates

### Active Hooks (API-consuming)
Core enforcement hooks that still use Claude API context injection:
- `code-completeness-gate.mjs` — blocks incomplete code
- `anti-pattern-detector.mjs` — security pattern enforcement
- `test-legitimacy-guard.mjs` — blocks placeholder tests
- `always-build-guard.mjs` — enforces build verification

## Ollama Bridge
Hooks can call local Ollama via `lib/ollama-hook-bridge.mjs`:

```javascript
import { queryOllama, isOllamaAvailable } from './lib/ollama-hook-bridge.mjs';

const result = await queryOllama(prompt, {
  hookType: 'grep_index',  // Model selection
  timeoutMs: 300,          // Fast timeout for hooks
  maxTokens: 50,           // Keep responses short
});

if (result.success) {
  // Use result.response
} else {
  // Fall back to regex-based suggestion
}
```

### Hook Types → Models
| hookType | Model | Use Case |
|----------|-------|----------|
| grep_index | qwen2.5-coder:7b | Index suggestions |
| mcp_route | qwen2.5-coder:7b | MCP routing |
| ai_feature | qwen2.5-coder:14b | Feature recommendations |
| code_explain | qwen2.5-coder:14b | Code explanations |
| validation | qwen2.5-coder:7b | Code validation |
| general | qwen2.5-coder:7b | Default |

## Token Savings
- **Before**: ~1200 tokens/edit (6 validation hooks @ 200 each)
- **After**: 0 tokens (local regex + Ollama)
- **Reduction**: 100% for migrated hooks
