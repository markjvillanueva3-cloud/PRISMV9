// tier: T4
// ollama-fuse.mjs — fuse multiple advisory hook outputs into one local LLM call.
// When Ollama (qwen2.5-coder:7b) is healthy, sends one batched prompt asking
// for {antiPatterns, errorLearns, buildChecks} JSON. Falls back to running
// the original hooks via runBundle() when Ollama is unhealthy or returns
// invalid JSON.
//
// Wire-up: advisory bundle calls fuseAdvisory() FIRST. If it returns a usable
// result, skip the original hook stack. If it returns null, fall back.

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_HOOK_MODEL || "qwen2.5-coder:7b";
const OLLAMA_TIMEOUT_MS = 4000;

let healthCache = { ok: null, checkedAt: 0 };

/**
 * Check Ollama liveness with 60s cache.
 */
async function isOllamaUp() {
  const now = Date.now();
  if (healthCache.ok !== null && (now - healthCache.checkedAt) < 60_000) {
    return healthCache.ok;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1000);
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    healthCache = { ok: res.ok, checkedAt: now };
    return res.ok;
  } catch {
    healthCache = { ok: false, checkedAt: now };
    return false;
  }
}

/**
 * Fuse advisory checks for an Edit/Write tool call into one Ollama call.
 * @param {object} toolInput - {file_path, old_string, new_string} or {file_path, content}
 * @returns {Promise<{additionalContext: string} | null>} null on Ollama miss
 */
export async function fuseAdvisory(toolInput) {
  if (!await isOllamaUp()) return null;

  const filePath = toolInput.file_path || "(unknown)";
  const newContent = toolInput.new_string || toolInput.content || "";
  const oldContent = toolInput.old_string || "";

  // Bound the payload size — only send a digest
  const newDigest = newContent.slice(0, 1500);
  const oldDigest = oldContent.slice(0, 800);

  const prompt = `You are a code-quality reviewer for the PRISM manufacturing-intelligence codebase.
Analyze this file edit and report only ACTIONABLE findings. Skip nitpicks. Be terse.

File: ${filePath}

${oldContent ? `OLD (replaced):\n${oldDigest}\n\n` : ""}NEW (writing):
${newDigest}

Return JSON only, no prose:
{
  "antiPatterns": ["finding1", ...],   // Real bugs only: any-cast bypassing types, swallowed errors, race conditions, etc.
  "buildRisks": ["finding1", ...],     // Likely TS/build breakage: missing import, type mismatch, etc.
  "completeness": ["finding1", ...]    // Stub/placeholder/TODO that ships incomplete code
}
Empty arrays if clean. Max 3 findings per category.`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), OLLAMA_TIMEOUT_MS);
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        format: "json",
        stream: false,
        options: { temperature: 0.1, num_predict: 400 },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);

    if (!res.ok) return null;
    const data = await res.json();
    const findings = parseFindings(data.response);
    if (!findings) return null;

    return formatFindings(findings);
  } catch {
    return null;
  }
}

function parseFindings(jsonText) {
  if (!jsonText) return null;
  try {
    const obj = typeof jsonText === "string" ? JSON.parse(jsonText) : jsonText;
    return {
      antiPatterns: Array.isArray(obj.antiPatterns) ? obj.antiPatterns : [],
      buildRisks: Array.isArray(obj.buildRisks) ? obj.buildRisks : [],
      completeness: Array.isArray(obj.completeness) ? obj.completeness : [],
    };
  } catch {
    return null;
  }
}

function formatFindings(f) {
  const sections = [];
  if (f.antiPatterns.length > 0) {
    sections.push(`ANTI-PATTERNS:\n${f.antiPatterns.map(x => `  • ${x}`).join("\n")}`);
  }
  if (f.buildRisks.length > 0) {
    sections.push(`BUILD RISKS:\n${f.buildRisks.map(x => `  • ${x}`).join("\n")}`);
  }
  if (f.completeness.length > 0) {
    sections.push(`COMPLETENESS:\n${f.completeness.map(x => `  • ${x}`).join("\n")}`);
  }
  if (sections.length === 0) return { additionalContext: "" };
  return {
    additionalContext: `[Ollama fused advisory]\n${sections.join("\n\n")}`,
  };
}
