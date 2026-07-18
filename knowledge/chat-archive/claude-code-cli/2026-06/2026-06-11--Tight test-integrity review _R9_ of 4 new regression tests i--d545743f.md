---
type: "chat-session"
source: "claude-code-cli"
session_id: "d545743f-8fad-47d7-a7de-1716a4be5839"
title: "Tight test-integrity review (R9) of 4 new regression tests in H:/prism-slot-hote"
date: "2026-06-11"
first_ts: "2026-06-11T19:31:20.465Z"
last_ts: "2026-06-11T19:32:12.370Z"
cwd: "H:\\prism-slot-hotel\\mcp-server\\web"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d545743f-8fad-47d7-a7de-1716a4be5839/subagents/agent-ab3e9d419d1a09f78.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:52"
---

# Tight test-integrity review (R9) of 4 new regression tests in H:/prism-slot-hote

> **claude-code-cli** | 2026-06-11 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism-slot-hotel\mcp-server\web
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d545743f-8fad-47d7-a7de-1716a4be5839/subagents/agent-ab3e9d419d1a09f78.jsonl`

## Transcript

### User | 2026-06-11T19:31:20.465Z

Tight test-integrity review (R9) of 4 new regression tests in H:/prism-slot-hotel/mcp-server/web/src/__tests__/WorkspacePrimitives.test.tsx (unit U-HOTEL-UI-IOS-CYAN-ACCENT). All 32 tests in the file currently PASS.

Read the file. Focus on the two NEW describe blocks (search "U-CYAN-ACCENT"):
1. `WorkspaceHero — decorative chrome is accent-driven` (2 tests): asserts the eyebrow chip className contains `border-accent/16` + `bg-accent/8` + `text-accent` and NOT `cyan-300`/`cyan-100`; asserts the hero `<section>` border contains `border-accent/10` not `border-cyan-300`.
2. `SummaryTile — emphasis hierarchy + accent glow` (3 tests, 2 new): asserts the DEFAULT glow gradient innerHTML contains `from-accent/22` + `via-accent/10` not `from-cyan-400`; asserts a caller-supplied `accent` prop overrides the default (innerHTML has `from-emerald-400/22`, not `from-accent/22`).

VERIFY (flag P0/P1):
- Real-value assertions, not stubs — each WOULD FAIL if the component reverted to hardcoded cyan (the regression these lock out).
- The selectors are correct: `screen.getByText('Live')` returns the eyebrow span (is "Live" unique in the render?); `container.querySelector('section')` returns the hero root; the SummaryTile default-vs-prop-override distinction is genuinely exercised (the `?? default` fallback path).
- Convention match with the existing accent tests in the same file (e.g. the TabButton/Stepper `bg-accent` + `.not.toContain('bg-cyan-300')` pattern).
- No network; matches the file's testing-library style.

Output P0/P1 with line numbers, then "VERDICT: PASS" or "VERDICT: FAIL".

### Assistant | 2026-06-11T19:31:31.013Z

I'll read the test file and verify the two new describe blocks for test integrity.

### Assistant | 2026-06-11T19:31:31.142Z

[tool_use: Read]

### User | 2026-06-11T19:31:56.330Z

[tool_result] 1	/**
2	 * WorkspacePrimitives — FLEET-IOS-REDESIGN U2 regression lock (slot:hotel, 2026-06-09).
3	 *
4	 * These primitives back 106 pages, so the tests assert the BEHAVIORAL contracts
5	 * the iOS upgrade fixed — each is written to FAIL if the specific bug returns
6	 * (R9 intent, not presence): the ActionButton ghost-tone no-op (it used to fall
7	 * through to cyan), the missing TabButton aria-p
... [+14542 chars truncated]

### Assistant | 2026-06-11T19:32:12.370Z

I'll verify the test integrity of the two new describe blocks for U-CYAN-ACCENT.

## Test Integrity Review

### Block 1: WorkspaceHero — decorative chrome is accent-driven (lines 255–274)

**Test 1.1 (lines 256–266): "the eyebrow chip border/bg/text follow the accent token"**

✓ **Real-value assertion** — The test checks for presence of `border-accent/16`, `bg-accent/8`, `text-accent` and ABSENCE of `cyan-300`/`cyan-100`. This would FAIL if the component reverted to hardcoded cyan classes.

✓ **Selector correctness** — `screen.getByText('Live')` returns the eyebrow span. "Live" is unique in the render (title="Dashboard" and description="ERP overview" are separate, so no collision).

✓ **Convention match** — Identical pattern to lines 30–32 (ActionButton) and 154–160 (TabButton): `.toContain('className')` + `.not.toContain('old-hardcoded-class')`.

✓ **No network** — Pure DOM assertion, uses testing-library.

**Test 1.2 (lines 268–273): "the hero frame border is accent-driven"**

✓ **Real-value assertion** — `container.querySelector('section')` returns the hero `<section>` root (unique). Checks for `border-accent/10` and absence of `border-cyan-300`.

✓ **Selector correctness** — The hero component wraps its chrome in a `<section>`, so the selector is precise.

✓ **Convention match** — Same pattern as 1.1; follows the file's pattern of testing both `className` (for individual elements) and `innerHTML`/`querySelector` (for container structure).

---

### Block 2: SummaryTile — emphasis hierarchy + accent glow (lines 276–299)

**Test 2.1 (lines 277–283): "emphasis='high' enlarges the value"**

⚠️ **NOT a new test for U-CYAN-ACCENT** — This is an existing test for emphasis levels. **This should not be flagged as a new regression test** (it doesn't lock the cyan→accent refactor). However, it does verify that the component accepts the `emphasis` prop and applies the correct size class, so it's a pre-existing lock on component shape. PASS as a regression lock (unrelated to
... [+2348 chars truncated]
