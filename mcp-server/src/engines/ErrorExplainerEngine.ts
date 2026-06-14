/**
 * ErrorExplainerEngine — U-FORE-14 (New-Coder Safety Net)
 * =======================================================
 *
 * Takes a raw compiler / test / runtime error message and produces a
 * plain-language explanation with a minimal fix and an "unblock"
 * command. Designed to replace the standard "paste the error and pray"
 * loop with a deterministic first-pass triage.
 *
 * Inputs  → { source: "tsc"|"vitest"|"node"|"eslint"|"build", message, filePath? }
 * Outputs → {
 *   category,
 *   plainLanguage,   // what went wrong, in one sentence
 *   minimalFix,      // what to change, in one sentence
 *   unblockCommand,  // one-line command the user can run
 *   confidence       // 0..1 — how sure we are about this pattern
 * }
 *
 * NOT a general debugger. The explainer matches known signatures from
 * TypeScript, vitest, node, and build output. When no match is found,
 * returns category="unknown" with a generic guidance block rather than
 * hallucinating a fix.
 */

export type ErrorSource = "tsc" | "vitest" | "node" | "eslint" | "build" | "other";

export interface ErrorExplainInput {
  source: ErrorSource;
  message: string;
  filePath?: string;
}

export interface ErrorExplanation {
  category: string;
  plainLanguage: string;
  minimalFix: string;
  unblockCommand: string;
  confidence: number;
}

type Matcher = {
  category: string;
  source: ErrorSource[] | "any";
  test: (msg: string) => boolean;
  explain: (msg: string, filePath?: string) => Omit<ErrorExplanation, "category">;
};

const MATCHERS: Matcher[] = [
  {
    category: "module_not_found",
    source: "any",
    test: (m) => /Cannot find module/i.test(m) || /MODULE_NOT_FOUND/.test(m),
    explain: (m) => ({
      plainLanguage: "An import points to a file or package that does not exist.",
      minimalFix: "Fix the import path, install the package, or rebuild (`npm run build:fast`).",
      unblockCommand: "cd mcp-server && npm run build:fast",
      confidence: 0.9,
    }),
  },
  {
    category: "type_mismatch",
    source: ["tsc", "build"],
    test: (m) => /is not assignable to/i.test(m) || /Argument of type/.test(m),
    explain: () => ({
      plainLanguage: "You are passing a value whose type does not match what the function or variable expects.",
      minimalFix: "Inspect the interface at the referenced line and adjust the shape of the value — do NOT add `any`.",
      unblockCommand: "node node_modules/typescript/lib/tsc.js --noEmit",
      confidence: 0.85,
    }),
  },
  {
    category: "missing_property",
    source: ["tsc", "build"],
    test: (m) => /Property '.*' does not exist on type/i.test(m),
    explain: () => ({
      plainLanguage: "You are reading a property the compiler does not believe exists on this value.",
      minimalFix: "Check the object's interface; add the missing property to the type, or narrow the value with a type guard.",
      unblockCommand: "node node_modules/typescript/lib/tsc.js --noEmit",
      confidence: 0.85,
    }),
  },
  {
    category: "assertion_failed",
    source: ["vitest"],
    test: (m) => /AssertionError|expected .* to (be|equal|deep)/i.test(m),
    explain: () => ({
      plainLanguage: "A test assertion got a different value than it expected.",
      minimalFix: "Decide which is correct — the test or the code. Fix the wrong one. Never weaken the assertion just to pass.",
      unblockCommand: "node node_modules/vitest/vitest.mjs run",
      confidence: 0.9,
    }),
  },
  {
    category: "test_timeout",
    source: ["vitest"],
    test: (m) => /timeout|timed out/i.test(m),
    explain: () => ({
      plainLanguage: "A test did not finish within its time budget, usually because a promise never resolved.",
      minimalFix: "Look for a missing `await`, an unresolved mock, or an infinite loop in the system under test.",
      unblockCommand: "node node_modules/vitest/vitest.mjs run --reporter=verbose",
      confidence: 0.8,
    }),
  },
  {
    category: "enoent",
    source: "any",
    test: (m) => /ENOENT/.test(m),
    explain: (m) => {
      const pathMatch = /ENOENT.*'([^']+)'/.exec(m);
      const p = pathMatch?.[1] ?? "the path";
      return {
        plainLanguage: `Node cannot find ${p}.`,
        minimalFix: "Check the path, check the working directory, and confirm the file exists before the call.",
        unblockCommand: "ls",
        confidence: 0.9,
      };
    },
  },
  {
    category: "syntax_error",
    source: "any",
    test: (m) => /SyntaxError|Unexpected token|Unexpected end of input/.test(m),
    explain: () => ({
      plainLanguage: "The file is not valid JavaScript/TypeScript — the parser gave up.",
      minimalFix: "Open the file at the reported line and look for unmatched braces, quotes, or comment terminators.",
      unblockCommand: "node node_modules/typescript/lib/tsc.js --noEmit",
      confidence: 0.85,
    }),
  },
  {
    category: "null_access",
    source: "any",
    test: (m) => /Cannot read (?:property|properties)(?: [^\n]*?)? of (?:null|undefined)/.test(m),
    explain: () => ({
      plainLanguage: "You tried to read a property of something that was null or undefined at that moment.",
      minimalFix: "Guard the access with a null check, or fix the producer so the value is always present.",
      unblockCommand: "",
      confidence: 0.85,
    }),
  },
  {
    category: "port_in_use",
    source: "any",
    test: (m) => /EADDRINUSE/.test(m),
    explain: (m) => {
      const portMatch = /:(\d{2,5})/.exec(m);
      const port = portMatch?.[1] ?? "that port";
      return {
        plainLanguage: `Another process is already listening on ${port}.`,
        minimalFix: "Either stop the other process or run this server on a different port.",
        unblockCommand: port !== "that port" ? `netstat -ano | findstr :${port}` : "netstat -ano",
        confidence: 0.95,
      };
    },
  },
  {
    category: "heap_oom",
    source: ["build"],
    test: (m) => /heap out of memory|FATAL ERROR.*OOM/i.test(m),
    explain: () => ({
      plainLanguage: "Node ran out of heap. For PRISM builds this usually means the `--max-old-space-size` flag is missing.",
      minimalFix: "Use the project's `npm run build` (which sets 16GB) rather than raw `tsc`.",
      unblockCommand: "cd mcp-server && npm run build",
      confidence: 0.95,
    }),
  },
];

/**
 * OLLAMA-DEV-02: Ollama escalation
 *
 * When the deterministic signature match returns category="unknown"
 * (no known pattern), call local Ollama qwen2.5-coder:32b for a
 * domain-specific minimalFix instead of giving up with generic
 * guidance. Ollama is opportunistic — if it's down or timed out we
 * keep the original generic block, never throw.
 */
const OLLAMA_TIMEOUT_MS = 6_000;
const OLLAMA_MAX_MESSAGE_CHARS = 2_000;

async function explainWithOllama(
  input: ErrorExplainInput,
): Promise<{ plainLanguage: string; minimalFix: string; unblockCommand: string; confidence: number } | null> {
  const ollamaUrl = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
  const ollamaModel = process.env.OLLAMA_ERROR_MODEL ?? "qwen2.5-coder:32b";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OLLAMA_TIMEOUT_MS);
  const message = input.message.slice(0, OLLAMA_MAX_MESSAGE_CHARS);
  const filePathHint = input.filePath ? `\nFile: ${input.filePath}` : "";
  const prompt = [
    `You are a concise compiler-error explainer. Given a ${input.source} error message, respond with JSON only:`,
    `{"plainLanguage":"<one sentence cause>","minimalFix":"<one sentence fix>","unblockCommand":"<one short shell command, may be empty>"}`,
    `Do not include any markdown, prose, or backticks. Just the JSON.`,
    `${filePathHint}`,
    "",
    `Error message:`,
    message,
  ].join("\n");
  try {
    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        prompt,
        stream: false,
        format: "json",
        options: { num_predict: 220, temperature: 0.1 },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const body = (await res.json()) as { response?: string };
    const raw = String(body?.response ?? "").trim();
    if (!raw) return null;
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return null; }
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    const plain = typeof obj.plainLanguage === "string" ? obj.plainLanguage.trim() : "";
    const fix = typeof obj.minimalFix === "string" ? obj.minimalFix.trim() : "";
    const cmd = typeof obj.unblockCommand === "string" ? obj.unblockCommand.trim() : "";
    if (!plain || !fix) return null;
    return {
      plainLanguage: plain.slice(0, 240),
      minimalFix: fix.slice(0, 240),
      unblockCommand: cmd.slice(0, 240),
      confidence: 0.5,
    };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export class ErrorExplainerEngine {
  readonly name = "ErrorExplainerEngine";

  explain(input: ErrorExplainInput): ErrorExplanation {
    if (!input || typeof input.message !== "string") {
      throw new Error("ErrorExplainerEngine.explain: message required");
    }
    const msg = input.message;
    for (const m of MATCHERS) {
      const sourceOk = m.source === "any" || (Array.isArray(m.source) && m.source.includes(input.source));
      if (!sourceOk) continue;
      if (m.test(msg)) {
        const body = m.explain(msg, input.filePath);
        return { category: m.category, ...body };
      }
    }
    return {
      category: "unknown",
      plainLanguage: "No known pattern matched this error.",
      minimalFix: "Read the first 3 lines of the stack trace carefully — they usually point to the true origin.",
      unblockCommand: "",
      confidence: 0.2,
    };
  }

  /**
   * Same as explain(), but escalates to local Ollama when the
   * deterministic match returns category="unknown". Falls back to
   * the sync result if Ollama is unreachable, returns malformed
   * JSON, or is otherwise unhelpful — never throws.
   *
   * @param input — same shape as explain()
   * @returns ErrorExplanation; category remains "unknown" when
   *          escalation succeeded so callers can tell the
   *          guidance came from Ollama, not a known pattern.
   */
  async explainEscalated(input: ErrorExplainInput): Promise<ErrorExplanation> {
    const sync = this.explain(input);
    if (sync.category !== "unknown") return sync;
    const ollama = await explainWithOllama(input);
    if (!ollama) return sync;
    return {
      category: "unknown",
      plainLanguage: ollama.plainLanguage,
      minimalFix: ollama.minimalFix,
      unblockCommand: ollama.unblockCommand,
      confidence: ollama.confidence,
    };
  }

  categories(): string[] {
    return Array.from(new Set(MATCHERS.map((m) => m.category))).concat("unknown");
  }
}

export const errorExplainerEngine = new ErrorExplainerEngine();
