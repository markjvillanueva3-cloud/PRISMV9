# Intake Defense Wiring Plan — improvement B (DESIGN, not yet implemented)

> **Status:** DESIGN COMPLETE / IMPLEMENTATION PENDING OPERATOR GREEN-LIGHT.
> Slot:alpha, 2026-06-17. Part of the article-driven cross-substrate pass (improvement B).
> Improvement A (octopus consensus routing) shipped: commits `1516b6a896` + `5714ecddc9`.
>
> **Why this needs a green-light before implementing:** this wires **fail-CLOSED** input-defense
> gates onto the LIVE untrusted-intake path (webhook + email). A false-positive could reject/quarantine
> legitimate traffic. That is an outward-facing, behavior-changing, hard-to-reverse change — confirm the
> fail-mode policy (below) before it goes live.

## The verified gap (R8/dedup — NOT a greenfield build)

The defense engines already EXIST and are already exposed via `prism_security` actions
(`securityDispatcher.ts:76-81` lazy-imports `inputSanitizationEngine`; PIICompliance likewise) — but the
**untrusted-intake path calls NONE of them** (grep of `intakeDispatcher.ts` / `IntakeWebhookEngine.ts` /
`emailIntakeSingleton.ts` / `intakeProcessorSingleton.ts` = zero PII/sanitize/injection refs; the lone hit
is an unrelated "test injection" doc-comment). So B is a **WIRING** unit: route the existing gates into intake.

## Gate-engine APIs (verify exact export names before implementing — flagged below)

| Engine | Singleton (VERIFY) | Method | Returns | Sync? Throws? |
|--------|--------------------|--------|---------|---------------|
| `InputSanitizationEngine.ts` | `inputSanitizationEngine` (~:564) | `sanitize(input, type, opts?)` — type ∈ html/javascript/sql/nosql/path/command/url/filename/alphanumeric | `{sanitized, modified, removedPatterns[], warnings[]}` | sync, never throws |
| `PIIComplianceEngine.ts` | `piiComplianceEngine` (~:802) | `detectPII(text, tenantId)` | `{redacted, matches[], containsPII, riskLevel: none/low/medium/high/critical}` | sync, never throws |
| `SourcePoisoningSanitizerEngine.ts` | **VERIFY: `sourcePoisoningEngine` vs `sourcePoisoningSanitizerEngine` (~:430)** | `sanitize(items[])` — 6-gate ladder (schema/allowlist/oversize/hash/prompt-injection/malformed) | `{clean[], quarantined[{reason}], counts, passRate}` | sync, never throws |

**MUST-VERIFY before writing code (HONESTY rule — do not implement against unread signatures):**
1. Exact `SourcePoisoningSanitizerEngine` singleton export name + the `SanitizeInput` shape (needs a `source` matching its allowlist — confirm what slugs the allowlist accepts, else every webhook item quarantines as `not_allowlisted`).
2. `InputSanitizationEngine.validateEmail()` exists (the design assumes it; confirm or use `sanitize(...,"filename"/"url")`).
3. `EmailPrintIntakeEngine` real ingest method + line numbers (Explore estimated ~250-275; READ it).
4. `IntakeArtifactProcessorEngine.process()` real body + where it persists (estimated ~307; READ it).
5. Whether `prism_security` already wraps these as actions you can call instead of importing the singletons directly (clone the established pattern — R8).

## Insertion points + fail-mode matrix (per surface)

| Surface | File / insertion | Gate sequence | Fail mode | Why |
|---------|------------------|---------------|-----------|-----|
| **Webhook** (most hostile) | `IntakeWebhookEngine.ingest()` after content-validation (~:146) | sanitize(html) -> detectPII -> poison-check | **FAIL-CLOSED** (reject 400/403); auto-redact medium/low PII, reject critical/high | external untrusted; reject structural attacks outright |
| **Email** | `EmailPrintIntakeEngine` attachment loop (pre-sink) | filename-sanitize -> subject-sanitize -> email-validate -> subject-PII-flag | **FAIL-SOFT per-attachment** (skip+log one bad attachment; flag PII) | IMAP-authed; one bad email must not block the batch |
| **Processor** | `IntakeArtifactProcessorEngine.process()` pre-`sink.persist()` | path-sanitize(output_path) -> final-PII-scan | **FAIL-CLOSED on path traversal**, redact on PII | file-write security non-negotiable; defense-in-depth |
| **Dispatcher** | `intakeDispatcher.ts` before `ingest()` (~:72) | base64-decode guard + size pre-check + JSON-object shape | **FAIL-CLOSED** (dispatcherError) | fast-path reject before engine |

## R15 acceptance (when B is DONE)

- WIRE: all four surfaces, same commit, no orphan; clone the `prism_security` call pattern if it exists.
- TEST: 4 new test files (webhook/email/processor/dispatcher) round-tripped THROUGH `intakeDispatcher` where applicable; happy path + >=3 failure modes + >=2 adversarial per surface — XSS (`<script>`, `javascript:`), SQL, path-traversal (`../`, null-byte), PII (SSN/CC = critical reject; email/phone = redact), prompt-injection (`<|im_start|>`, `System:` role marker, control-char clusters). >=3 spanning intake sources (readwise/telegram/rss/manual + email).
- VALIDATE: run a real adversarial payload through the live dispatcher and show the reject/redact verdict with numbers.
- Per-file 2-arm scrutiny after each file + the 3-of-3 Stop gate.

## Open follow-ups (separate from B)
- Improvement C (queued): cheap audit-digest for the review class (Review Paradox).
- The ~11 unread submitted X articles: BLOCKED on the Playwright MCP being reconnected (separate server from prism; Grok cannot browse X live).
- Dead `prism_memory:consensus_recall` still in tracked wiki octopus.md mirrors + `MultiModelConsensusEngine.ts:124,671` comments (from improvement A).
