// ZULU-ORCHESTRATOR-MS3 / U-ZPSN03 — pure PSN-tag parser library.
//
// Closes the U-ZPSN02 closed-loop value gap: U-ZPSN01 + U-ZPSN02 made the
// [psn:domain=X,role=Y,queue=Z,tribal=W] tag actuate fleet-wide in every
// zulu-orchestrator SendKeys directive, but the target chat had no parser
// for it. This lib is the parser; psn-tag-parser-inject.mjs is the
// UserPromptSubmit hook that consumes it.
//
// Pure functions; tested via node:test.
//
// Safety contract (load-bearing):
//   • Values are stripped to `[a-z0-9+\-_]` — matches U-ZPSN01's sanitiser
//     in zulu-bd-priority.buildAwarenessHint. A hostile fingerprint
//     cannot inject markdown / shell / slash-command chars through this
//     parser.
//   • Per-tag inner content capped at 256 chars — oversize → null.
//   • Multiple [psn:...] tags in the same prompt → first wins (the zulu
//     SendKeys actuator emits exactly one per directive; >1 means
//     duplicated/injected, treat skeptically).

export const SCHEMA_VERSION = "1.0.0";

// Max chars INSIDE the brackets (the k=v list). Anything longer is a smell —
// the canonical zulu-emitted tag is ~80 chars (4 fields * ~20 chars each).
export const MAX_INNER_LEN = 256;

// Known keys — only these are surfaced in the brief; unknown keys are
// preserved in `extras` for future expansion but NOT injected into context.
export const KNOWN_KEYS = Object.freeze(["domain", "role", "queue", "tribal"]);

// Single-tag regex. Greedy on body; `[^\]]` prevents crossing a closing
// bracket of an outer construct. Anchored neither way — matches anywhere
// in the prompt. Case-insensitive on the literal `psn` prefix.
const TAG_RE = /\[psn:([^\]]*)\]/i;

// Value-character allowlist. Matches U-ZPSN01's sanitiser exactly.
const VALUE_ALLOWLIST = /^[a-z0-9+\-_]+$/;

/**
 * Extract the first [psn:...] tag from `text` and parse its `k=v,k=v,...`
 * inner list into a structured object. Returns null when:
 *   • text is not a string / is empty
 *   • no [psn:...] tag is found
 *   • the tag's inner content exceeds MAX_INNER_LEN
 *   • the tag's inner content is empty or only whitespace
 *
 * The returned object is shaped:
 *   {
 *     raw: "[psn:domain=mill,role=specialist-mill,queue=80,tribal=mill]",
 *     fields: { domain?: string, role?: string, queue?: string, tribal?: string },
 *     extras: { [unknownKey: string]: string },  // only sanitised entries
 *     malformed: string[],                       // unparseable kv segments (for telemetry)
 *   }
 *
 * Values that fail the allowlist are DROPPED — never silently lowercased
 * or quoted. The corresponding key simply doesn't appear in `fields`.
 */
export function parsePsnTag(text) {
  if (typeof text !== "string" || text.length === 0) return null;
  const m = text.match(TAG_RE);
  if (!m) return null;
  const inner = m[1] || "";
  if (inner.length === 0 || inner.length > MAX_INNER_LEN) return null;

  const fields = {};
  const extras = {};
  const malformed = [];

  for (const segment of inner.split(",")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0 || eq === trimmed.length - 1) {
      // No `=`, leading `=`, or trailing `=` with no value — malformed.
      malformed.push(trimmed);
      continue;
    }
    const key = trimmed.slice(0, eq).toLowerCase().trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!key || !value) {
      malformed.push(trimmed);
      continue;
    }
    // Sanitiser: must match allowlist exactly. No lowercase coercion — the
    // upstream emitter already lowercases; if we see uppercase, treat as
    // adversarial and drop.
    if (!VALUE_ALLOWLIST.test(value)) {
      malformed.push(`${key}=<filtered>`);
      continue;
    }
    if (KNOWN_KEYS.includes(key)) {
      // First write wins (mirrors first-tag-wins on duplicates).
      if (!(key in fields)) fields[key] = value;
    } else {
      // Sanitised key for `extras`. Key must also match the allowlist
      // (no shell/markdown injection via the key name).
      if (VALUE_ALLOWLIST.test(key) && !(key in extras)) extras[key] = value;
    }
  }

  return { raw: m[0], fields, extras, malformed };
}

/**
 * Render a one-line capability brief from a parsed PSN tag. Pure formatter;
 * never reads any environment / disk. Returns "" when `parsed` is null or
 * has zero recognised fields (no brief = no inject).
 *
 * Output shape:
 *   ## 🎭 PSN frame (slot capability from zulu directive)
 *   - domain: cam · role: specialist-cam · queue: 196 · tribal: cam
 *   _(Source: zulu-awareness-pipeline → composeSendKeysText [psn:...] tag)_
 *
 * Order is deterministic (domain → role → queue → tribal) regardless of
 * the input field order; missing keys are omitted (no "(unknown)" placeholders).
 */
export function buildBriefFromPsn(parsed) {
  if (!parsed || !parsed.fields) return "";
  const f = parsed.fields;
  const parts = [];
  if (f.domain) parts.push(`domain: ${f.domain}`);
  if (f.role) parts.push(`role: ${f.role}`);
  if (f.queue) parts.push(`queue: ${f.queue}`);
  if (f.tribal) parts.push(`tribal: ${f.tribal}`);
  if (parts.length === 0) return "";
  const header = "## 🎭 PSN frame (slot capability from zulu directive)";
  const body = `- ${parts.join(" · ")}`;
  const source = "_(Source: zulu-awareness-pipeline → composeSendKeysText [psn:...] tag — U-ZPSN03 parser)_";
  return `${header}\n\n${body}\n\n${source}`;
}
