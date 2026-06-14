---
title: UI/UX — AI-proposed visual mutations are flag-gated
type: code-tribal
domain: frontend
created: 2026-05-26
slot: quebec
unit: U-F2-FEATURE-FLAG-GUARD
spec: state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md §6 / §9
status: doctrine
---

# UI/UX — AI-proposed visual mutations are flag-gated

Doctrine that pairs with [[frontend-codex]]'s "don't duplicate Codex pages" rule. Closes the silent-deploy class of bug where an agent's plausible-but-wrong UI lands directly in front of the customer.

## Rule

Every AI-proposed visual mutation ships **behind a feature flag that defaults to OFF**. The operator activates the flag after reviewing both rendered states; the default branch ships with the flag off, so the live experience is unchanged until the operator opts in.

## Why

- An AI agent can generate plausible-but-wrong UI: broken state coverage (missing loading/empty/error branches), off-design-language vs Calculator Studio, accessibility regressions, layout breaks on the shop-floor tablet/gloves/glare profile.
- Without a flag, the customer becomes the first reviewer — that is the failure mode this rule prevents.
- It also closes the **silent-collision class**: two parallel chats both auto-deploying competing visual mutations cancel each other out at runtime; behind flags both can coexist and the operator picks the winner.

## Implementation pattern

Vite-style env + localStorage hot-toggle (no new flag library; both already work in `web/`):

```tsx
// web/src/lib/feature-flags.ts (sketch)
export function flagOn(name: string): boolean {
  const ls = typeof window !== "undefined" ? window.localStorage : null;
  if (ls?.getItem(`prism.feature.${name}`) === "on") return true;
  const envKey = `VITE_FEATURE_${name.replace(/-/g, "_").toUpperCase()}`;
  return import.meta.env[envKey] === "on";
}

// at the call site
{flagOn("partprofile-redesign") ? <NewPartProfile /> : <PartProfile />}
```

Build-time activation: `.env.production` adds `VITE_FEATURE_PARTPROFILE_REDESIGN=on` once the operator approves.

## Scope

| Type | Flag-gated? | Why |
|------|-------------|-----|
| New page | yes | High-blast-radius surface change |
| Redesigned component | yes | Visual mutation of existing surface |
| New dashboard widget | yes | Visual addition |
| New modal/drawer | yes | New surface |
| Copy rewrite that changes UX intent | yes | Soft visual mutation |
| Bug fix (broken loading state, wrong color, off-by-one padding) | no | Restoring intent, not mutating it |
| Pure-text typo fix | no | No UX change |
| Internal-only / admin routes | no | Operator IS the customer |
| Chat changes inside an already-flagged surface | no | Parent flag IS the gate |
| Operator hand-typed code | no | Operator IS the gate |

## Workflow

1. Search `web/` for existing pages matching the requested change → if found, apply [[frontend-codex]] (improve existing, don't duplicate).
2. Wrap the new surface in `flagOn("<name>")`.
3. Ship both code paths; flag defaults OFF.
4. PR description names the flag, what it touches, and how to toggle it on (DevTools → Application → localStorage → set `prism.feature.<name>` = `'on'`).
5. Operator validates the flagged-on render in dev/staging/prod-with-localStorage-override BEFORE flipping `VITE_FEATURE_*` to `'on'` at build time.
6. After a quiet activation week, a separate cleanup PR deletes the flag and the old code path.

## Anti-regression

- A PR that adds a new visual surface without a `flagOn(...)` wrapper is a doctrine violation. The 3-of-3 scrutiny gate's arm-A/B/C is expected to flag this; the existing `pre-frontend-page-create-audit` hook continues to handle the duplicate-existing-page class.
- An LLM that proposes a visual mutation without naming the flag in its plan has skipped step 2 — ask it to re-plan with the flag.

## Verification

- Grep new `web/src/` commits for `VITE_FEATURE_*` or `prism.feature.*` — any new visual surface should be findable by one of those tokens.
- Operator toggles the flag on in DevTools localStorage and reviews the flagged-on render before any build-time activation.

## Provenance

Codified from `state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md` (quebec iter6) §6 U-F2-FEATURE-FLAG-GUARD, P0, 1h documentation-only. Lands as doctrine alongside the spec (no code change in this unit; the doctrine sets the contract for every subsequent visual-mutation unit).

## Related

- [[frontend-codex]] — don't duplicate Codex pages; flag-gating sits ABOVE this rule.
- `state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md` §6 — atomic units, including U-F2.
- `state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md` §9.2-9.3 — micro-frontend timing + 2026 SE practices that this doctrine front-runs.
- [[feedback_backend_before_frontend]] — operator-gated frontend doctrine that this doctrine inherits from.
