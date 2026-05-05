# Gemini 3 Pro — One-Time Account Verification

> Status when this doc was created (2026-05-05): Gemini CLI fails with
> HTTP 403 `Verify your account to continue` for `maysoncarsonbryanna3@gmail.com`.
> Free-tier API key is `limit: 0` on Pro models, so the CLI/OAuth path is the
> only way to reach `gemini-3-pro-preview` without paying.

## Step 1 — Trigger the verification URL

Run this to capture a fresh validation link (the link expires quickly, so
do steps 1 + 2 back-to-back):

```powershell
H:\Tools\nodejs\gemini.cmd --skip-trust -m gemini-3-pro-preview -p "ping"
```

You'll see an error block ending in:

```
validationLink: 'https://accounts.google.com/signin/continue?...&plt=AKgnsbX...'
validationDescription: 'Verify your account'
```

Copy the **full validationLink URL** (one line, very long).

## Step 2 — Open the link in your default browser

```powershell
Start-Process "<paste validationLink here>"
```

Or just paste the URL into a browser tab.

Google will walk you through one of:

- **SMS verification** — sends a 6-digit code to your phone
- **Recovery email check** — confirms a code sent to your recovery address
- **Identity check** — answer a security question / confirm device

The flow ends on a page that says
`https://developers.google.com/gemini-code-assist/auth/auth_success_gemini`
with a green "Verified" banner.

## Step 3 — Re-run the CLI

```powershell
H:\Tools\nodejs\gemini.cmd --skip-trust -m gemini-3-pro-preview -p "Reply with just the integer 1800"
```

Expected output: `1800` (no error block).

If you see the same 403 again:

- The link expired between step 1 and step 3 — restart from step 1
- Google requested a different verification method — follow the alternate
  link Google sent
- The account doesn't have Gemini Advanced — see "alternative" below

## Step 4 — Lock 3-pro as the default consensus model

Once the CLI returns clean output, set this once in your shell profile so
PRISM's `MultiModelConsensusEngine` picks 3-pro by default:

```powershell
[System.Environment]::SetEnvironmentVariable("PRISM_GEMINI_MODEL", "gemini-3-pro-preview", "User")
```

Then verify the consensus pool:

```powershell
H:\prism-iooms0\mcp-server\node_modules\.bin\tsx.cmd `
  H:\prism-iooms0\mcp-server\scripts\smoke-gemini-3-pro.mts
```

## Alternative — paid API tier (skip OAuth entirely)

If verification keeps failing, the other unblock is to enable billing on
your existing API key project at <https://aistudio.google.com/billing>.
Pro models then become available via the REST API immediately, no CLI
involved. Pay-as-you-go pricing.

After billing is enabled:

```powershell
H:\prism-iooms0\mcp-server\node_modules\.bin\tsx.cmd `
  H:\prism-iooms0\mcp-server\scripts\smoke-gemini-3-pro.mts
```

The smoke test prefers REST when the key has Pro quota and falls back to
CLI/OAuth otherwise — same script tests both paths.

## Why this happens (background)

Google's identity-verification system flags accounts that:

- Sign in from new devices or new IP ranges
- Hit the API/CLI from automated tooling
- Have unusual recent activity

The flag is account-wide — once verified, all models become reachable
again. Verification typically lasts 30–90 days before re-prompting.

The PRISM `GeminiClientEngine` defaults to `gemini-3-pro-preview` already
(see `mcp-server/src/engines/GeminiClientEngine.ts` line 70: `DEFAULT_MODEL`).
It falls back gracefully to `gemini-2.5-flash` when the user passes an
override or when the engine detects a Pro-quota error in the future
(roadmap item — not implemented yet).
