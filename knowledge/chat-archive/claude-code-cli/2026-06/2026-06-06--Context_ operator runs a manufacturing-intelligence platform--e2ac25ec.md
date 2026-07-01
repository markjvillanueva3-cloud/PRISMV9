---
type: "chat-session"
source: "claude-code-cli"
session_id: "e2ac25ec-702e-441f-86f2-2344a5555e36"
title: "Context: operator runs a manufacturing-intelligence platform (PRISM) whose promp"
date: "2026-06-06"
first_ts: "2026-06-06T04:01:35.131Z"
last_ts: "2026-06-06T04:03:09.679Z"
cwd: "H:\\prism"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/e2ac25ec-702e-441f-86f2-2344a5555e36/subagents/workflows/wf_2ce1fd67-6c0/agent-aba4cc4f004390d2c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Context: operator runs a manufacturing-intelligence platform (PRISM) whose promp

> **claude-code-cli** | 2026-06-06 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e2ac25ec-702e-441f-86f2-2344a5555e36/subagents/workflows/wf_2ce1fd67-6c0/agent-aba4cc4f004390d2c.jsonl`

## Transcript

### User | 2026-06-06T04:01:35.131Z

Context: operator runs a manufacturing-intelligence platform (PRISM) whose prompts carry proprietary IP (JM Die customer data, CAM strategy, G-code, pricing). An internal decision already ruled out cloud LLMs because prompts would leave the machine, failing a "data can't be stolen" bar. The operator now asks specifically: is there a FREE option to use the CLOUD version of Kimi K2.6 (Moonshot AI) via Ollama? Today is June 2026 — prefer current sources.

Gather findings so far:
Yes — there is a free option, and Kimi K2.6 cloud is real. Concrete brief below.

---

## Answer: Yes — Ollama Cloud has a genuinely free tier, and `kimi-k2.6:cloud` runs on it

**The model is real and the command works.** Moonshot's Kimi K2.6 is hosted on Ollama Cloud as `kimi-k2.6:cloud` — run it with `ollama run kimi-k2.6:cloud` (or call it via `http://localhost:11434/api/chat` with `"model": "kimi-k2.6:cloud"`). The weights are NOT downloaded; inference runs on Ollama's datacenter GPUs. It's a 1.04T-parameter multimodal agentic model, 256K context, flagged **"High usage"** on Ollama's usage scale (verified fact, ollama.com/library/kimi-k2.6:cloud). The sibling `kimi-k2-thinking:cloud` is the reasoning variant (256K, also "High usage").

**The free tier (verified from ollama.com/pricing):**
- **Cost: $0.** Three plans: Free ($0), Pro ($20/mo or $200/yr), Max ($100/mo).
- **Account required, but no payment / no credit card.** `ollama signin` to sign in or create a free account on ollama.com (per docs.ollama.com/cloud: *"Ollama's cloud models require an account on ollama.com"*). For API use you set `OLLAMA_API_KEY`. No card is requested for Free — verified-absent: nothing on the pricing page or docs mentions a credit-card requirement for Free.
- **Concurrency: 1 cloud model at a time** on Free (Pro = 3, Max = 10). This matters for your 26-slot fleet — Free serializes/queues concurrent requests.
- **Rate limits: GPU-time based, not token-based.** *"Session limits that reset every 5 hours and we
... [+6003 chars truncated]

### Assistant | 2026-06-06T04:01:56.390Z

I'll verify this independently. The claim is about Ollama Cloud's free-tier data handling for Kimi models. Let me fetch the authoritative sources directly.

### Assistant | 2026-06-06T04:01:58.141Z

[tool_use: WebFetch]

### Assistant | 2026-06-06T04:01:59.085Z

[tool_use: WebFetch]

### User | 2026-06-06T04:02:01.904Z

[tool_result] # Privacy and Data Statements

Based on the provided documentation, there are **no statements** about data privacy, data retention, logging of prompts or responses, use of data for training, where cloud inference runs, or third-party providers and jurisdictions.

The documentation explains *how* to use Ollama's cloud models and API access, but does not address privacy, security, or data handling p
... [+175 chars truncated]

### User | 2026-06-06T04:02:03.400Z

[tool_result] # Ollama Privacy & Data Statements

## Data Privacy
"Keep your data private" (listed under Free tier features)

## Prompt/Response Logging
"Prompt or response data is never logged or trained on."

## Training Data Usage
"Prompt or response data is never logged or trained on."

## Data Retention
"When Ollama partners with providers, we require no logging, no training, and zero data retention polici
... [+347 chars truncated]

### Assistant | 2026-06-06T04:02:12.813Z

The pricing page makes the no-logging/no-training/zero-retention claims, but I need the actual Terms of Service and Privacy Policy — marketing pages are not binding terms. Let me find and verify the legal documents, which is where the "default to refuted unless explicitly guaranteed for the free tier" test gets decided.

### Assistant | 2026-06-06T04:02:13.265Z

[tool_use: WebSearch]

### Assistant | 2026-06-06T04:02:14.816Z

[tool_use: WebFetch]

### User | 2026-06-06T04:02:18.684Z

[tool_result] # Data Handling & Licensing Analysis

**Data Training:**
The Terms explicitly state: "We do not use your inputs or outputs to train AI models."

**Data Retention:**
No specific data retention clause is provided. The Terms reference the Privacy Policy for data handling post-termination: "Your data will be handled in accordance with our Privacy Policy."

**Prompt Logging:**
No mention of prompt logg
... [+507 chars truncated]

### User | 2026-06-06T04:02:36.596Z

[tool_result] Web search results for query: "Ollama Terms of Service privacy policy cloud data retention logging training 2026"

I'll search for information about Ollama's Terms of Service and privacy policy regarding cloud data handling.

Links: [{"title":"Privacy Policy","url":"https://ollama.com/privacy"},{"title":"Terms of Service","url":"https://ollama.com/terms"},{"title":"Why Ollama Data Stays Local: Pri
... [+5429 chars truncated]

### Assistant | 2026-06-06T04:02:45.405Z

I now have the binding documents. Let me verify the privacy policy directly for the exact retention/transfer language, since that is the load-bearing source.

### Assistant | 2026-06-06T04:02:46.751Z

[tool_use: WebFetch]

### User | 2026-06-06T04:02:53.076Z

[tool_result] # Ollama Privacy Policy Key Statements

**Last updated:** March 2026

## Cloud-Hosted Models & Transient Processing
"When using cloud-hosted models, we process your prompts and responses transiently to provide the service and never train on it."

"When using cloud-hosted models, we process this content transiently to provide the Service and this content is not stored beyond the time required to fu
... [+894 chars truncated]

### Assistant | 2026-06-06T04:03:09.679Z

I have enough verified evidence from the binding legal documents to render a verdict.

VERDICT: MIXED (leaning REFUTED against the operator's specific bar)

Ollama's binding documents — Privacy Policy (last updated March 2026) and Terms of Service (May 2026) — DO explicitly extend the no-training/transient-processing guarantee to ALL tiers, including Free: the policy states verbatim "When using cloud-hosted models, we process this content transiently to provide the Service and this content is not stored beyond the time required to fulfill the request" and "We do not use your inputs or outputs to train any AI models," with no Free-vs-paid distinction anywhere in either document. To that extent the "not retained, not used for training" half of the claim is independently CONFIRMED in binding terms, not just marketing.

However, the claim is REFUTED on two material points that defeat the operator's "data can't be stolen / not exposed to a foreign jurisdiction" bar: (1) the policy explicitly names third-party "model inference providers" as subprocessors and states "Data may be transferred to and processed in the United States" with only "appropriate safeguards... where required by law" — so the prompt provably leaves the machine, traverses third parties, and lands in a (US) jurisdiction the operator has no control over; and (2) "transiently / not stored beyond the time required to fulfill the request" is a best-effort policy promise with NO zero-retention SLA, NO contractual data-handling commitment to the customer, NO published subprocessor list, and a self-noted gap ("Ollama doesn't publish a complete list of what its background processes communicate"). A policy that says "we choose not to retain" is not the same as "your data cannot be exposed" — it is identical in architecture to the cloud LLM path the operator already rejected. Default-to-exposure holds: `kimi-k2.6:cloud` fails the operator's bar regardless of the favorable terms.

Source URLs:
- https://ollama.com/
... [+807 chars truncated]
