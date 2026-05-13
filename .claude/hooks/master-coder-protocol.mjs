#!/usr/bin/env node
// tier: T4
/**
 * master-coder-protocol.mjs — UserPromptSubmit hook
 *
 * Injects a master-coder thinking protocol before any coding task.
 * Forces classification → technique selection → edge case enumeration
 * before writing a single line of code.
 *
 * FIRES ON: UserPromptSubmit
 * BLOCKING: never — adds context only
 */
import fs from "node:fs";



function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

// Keywords that indicate a coding task (vs pure conversation)
const CODING_TRIGGERS = [
  // Creation
  'create', 'build', 'implement', 'write', 'add', 'make', 'generate',
  // Modification
  'fix', 'refactor', 'update', 'change', 'modify', 'improve', 'optimize',
  // Analysis that leads to code
  'debug', 'solve', 'handle', 'parse', 'process', 'transform', 'convert',
  // Specific code artifacts
  'function', 'class', 'method', 'api', 'endpoint', 'hook', 'engine',
  'component', 'module', 'service', 'handler', 'middleware', 'schema',
  // Testing
  'test', 'spec', 'coverage', 'assert', 'mock',
];

// Problem type classification with optimal techniques
const PROBLEM_TECHNIQUES = {
  search: {
    patterns: ['find', 'search', 'lookup', 'query', 'filter', 'match'],
    techniques: [
      'Hash map for O(1) exact lookup',
      'Binary search for sorted data O(log n)',
      'Trie for prefix matching',
      'Bloom filter for membership with false positives OK',
      'Index for repeated queries on same dataset',
    ],
  },
  state: {
    patterns: ['state', 'status', 'workflow', 'lifecycle', 'transition', 'mode'],
    techniques: [
      'Finite State Machine for explicit states + transitions',
      'Reducer pattern for predictable state updates',
      'Event sourcing for audit trail requirements',
      'State chart for hierarchical/parallel states',
    ],
  },
  async: {
    patterns: ['async', 'parallel', 'concurrent', 'batch', 'queue', 'stream'],
    techniques: [
      'Promise.all for independent parallel ops',
      'Sequential await for dependent operations',
      'Semaphore for concurrency limiting',
      'Worker pool for CPU-bound parallelism',
      'Backpressure for producer-consumer balance',
    ],
  },
  parse: {
    patterns: ['parse', 'extract', 'tokenize', 'syntax', 'grammar', 'format'],
    techniques: [
      'Regex for simple patterns (but know the limits)',
      'Recursive descent for grammars',
      'State machine for streaming parse',
      'PEG parser for complex grammars',
      'Never regex for nested structures (HTML, JSON)',
    ],
  },
  cache: {
    patterns: ['cache', 'memoize', 'store', 'persist', 'remember'],
    techniques: [
      'LRU for bounded memory with recency bias',
      'TTL for time-sensitive data',
      'Write-through for consistency',
      'Write-behind for performance',
      'Invalidation strategy BEFORE implementation',
    ],
  },
  validate: {
    patterns: ['validate', 'verify', 'check', 'sanitize', 'guard', 'schema'],
    techniques: [
      'Zod/Yup for runtime schema validation',
      'Parse, don\'t validate (return typed result)',
      'Fail fast at system boundary',
      'Whitelist over blacklist',
      'Normalize before validate',
    ],
  },
  transform: {
    patterns: ['transform', 'convert', 'map', 'reduce', 'aggregate', 'project'],
    techniques: [
      'Map for 1:1 element transformation',
      'Reduce for aggregation to single value',
      'flatMap for 1:N with flattening',
      'Transducer for composable transforms',
      'Stream for memory-bounded processing',
    ],
  },
  error: {
    patterns: ['error', 'exception', 'fail', 'recover', 'retry', 'fallback'],
    techniques: [
      'Result type (Ok/Err) for expected failures',
      'Exception for unexpected/unrecoverable',
      'Retry with exponential backoff + jitter',
      'Circuit breaker for cascading failure prevention',
      'Bulkhead for isolation',
    ],
  },
};

// Edge cases that apply to most code
const UNIVERSAL_EDGE_CASES = [
  'Empty input ([], "", null, undefined)',
  'Single element / boundary case',
  'Maximum size / overflow',
  'Concurrent access / race conditions',
  'Invalid types (NaN, Infinity, wrong type)',
  'Unicode / special characters',
  'Timeout / slow operations',
];

function detectProblemTypes(prompt) {
  const lower = prompt.toLowerCase();
  const detected = [];

  for (const [type, config] of Object.entries(PROBLEM_TECHNIQUES)) {
    if (config.patterns.some(p => lower.includes(p))) {
      detected.push({ type, techniques: config.techniques });
    }
  }

  return detected;
}

function isCodingTask(prompt) {
  const lower = prompt.toLowerCase();
  return CODING_TRIGGERS.some(t => lower.includes(t));
}

async function main() {
  const input = readStdinSafe();
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const prompt = payload.prompt || payload.message || '';

  // Skip if not a coding task or too short
  if (!prompt || prompt.length < 15 || !isCodingTask(prompt)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Detect problem types
  const problemTypes = detectProblemTypes(prompt);

  // Build injection
  const lines = [];
  lines.push('━'.repeat(70));
  lines.push('MASTER CODER PROTOCOL — Think before coding');
  lines.push('━'.repeat(70));
  lines.push('');
  lines.push('**Before writing code, complete this mental checklist:**');
  lines.push('');
  lines.push('1. **CLASSIFY** — What type of problem is this?');

  if (problemTypes.length > 0) {
    lines.push('   Detected patterns suggest:');
    for (const pt of problemTypes.slice(0, 3)) {
      lines.push(`   • ${pt.type.toUpperCase()}`);
    }
  }

  lines.push('');
  lines.push('2. **TECHNIQUE** — What\'s the optimal approach?');

  if (problemTypes.length > 0) {
    for (const pt of problemTypes.slice(0, 2)) {
      lines.push(`   *${pt.type}*: ${pt.techniques[0]}`);
      if (pt.techniques[1]) lines.push(`   alt: ${pt.techniques[1]}`);
    }
  } else {
    lines.push('   Consider: algorithm complexity, data structure choice, design pattern');
  }

  lines.push('');
  lines.push('3. **EDGE CASES** — What inputs break naive implementations?');
  lines.push('   • ' + UNIVERSAL_EDGE_CASES.slice(0, 4).join('\n   • '));

  lines.push('');
  lines.push('4. **FAILURE MODES** — What can go wrong at runtime?');
  lines.push('   Network, disk, OOM, timeout, concurrent mutation, invalid state');

  lines.push('');
  lines.push('5. **THEN WRITE** — Code that handles all of the above from line 1');
  lines.push('');
  lines.push('**NEVER:** TODO, placeholder, stub, empty catch, magic number, "fix later"');
  lines.push('━'.repeat(70));

  console.log(JSON.stringify({
    continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: lines.join('\n'),
      }
    }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
