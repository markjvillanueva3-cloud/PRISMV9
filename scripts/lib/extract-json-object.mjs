/**
 * extract-json-object.mjs -- pull the first balanced JSON object out of a (possibly
 * prose-wrapped, code-fenced, truncated) local-LLM response. Fail-soft: returns null on
 * anything unparseable, NEVER throws. Shared by every local-Ollama-JSON consumer
 * (audit-galaxy-soul-claude-quality, generate-galaxy-soul-enrichment, ...) so the
 * brace-walking + fence-stripping logic lives in ONE place (slot:charlie, 2026-06-11).
 *
 * Local models reliably emit JSON but wrap it: ```json fences, a "Here is my answer:"
 * preamble, a trailing "Hope that helps!", or braces inside string values. A naive
 * indexOf("{")/lastIndexOf("}") + JSON.parse breaks on all of those. This walks the first
 * balanced object, string-aware (braces inside quoted strings don't count), so it survives
 * real local-LLM output.
 */

/**
 * Extract + parse the first balanced JSON object in `text`. PURE.
 * @param {string} text
 * @returns {object|null} the parsed object, or null if none/unparseable
 */
export function extractJsonObject(text) {
  if (typeof text !== "string" || !text.trim()) return null;
  const body = text.replace(/```[a-z]*\n?/gi, ""); // drop code fences
  const start = body.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let i = start; i < body.length; i++) {
    const ch = body[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') {
      inStr = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null; // unterminated
  try {
    const obj = JSON.parse(body.slice(start, end + 1));
    return obj && typeof obj === "object" && !Array.isArray(obj) ? obj : null;
  } catch {
    return null;
  }
}
