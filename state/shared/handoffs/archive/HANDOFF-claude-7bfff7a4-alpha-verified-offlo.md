---
session: claude-7bfff7a4
topic: alpha-verified-offload
slot: india
written_at: 2026-06-10T03:42:35.040Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-7bfff7a4
status: active
---

# HANDOFF: claude-7bfff7a4
Updated: 2026-06-10T03:42:35.040Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-7bfff7a4

## STATE
## SHIPPED this session (slot:alpha, verified-offload line) -- ALL 3-of-3 PASS
- 92301e5574 + 8119ab7cb6: U-VERIFIED-OFFLOAD-COMMITMSG(-HARDEN) -- commit-subject drafter. scripts/ollama-commit-msg.mjs+.test.mjs. 14/14, live gpt-oss:20b.
- 1175a6f26b + 8c57f02d77: U-VERIFIED-OFFLOAD-FILEDIGEST(-HARDEN) -- line-anchored file digest (THE free-token read lever). scripts/ollama-file-digest.mjs+.test.mjs. 16/16, live (100-line->10 verified claims). lineAnchoredVerifier keeps ONLY claims matching cited source line.
- 8c73bd5aaf: U-VERIFIED-OFFLOAD-DOCREFLECT -- wiki lesson [[verified-ollama-offload]] marks both consumers shipped.
- Prior keystone: 619a84197b (ollama-verified-offload.mjs) + 90bc181767 (ollama-offload.mjs classify/digest).

## THE PATTERN (build all offloads on this)
scripts/lib/ollama-verified-offload.mjs: verifiedOffload({run,verify,fallback}) -> model proposes, CODE verifies, fail-safe fallback = 100% NET. Verifiers: enumMember/jsonShape/nonEmptyText. Offload ONLY tasks with a code-writable verifier. callOllamaOnce(prompt,{model,timeoutMs,temperature})->{ok,text} from scripts/lib/ollama-fanout.mjs.

## QUEUE
1. [DONE] commit-msg drafter
2. [DONE] file-digest primitive
3. [DONE] doc-reflect
4. [NEXT/in-flight] /loop iteration-eval-narration consumer (scripts/ollama-loop-narrate.mjs)
5. wire file-digest to auto-fire consumer
6. retrofit advisory hooks to verified execution; scrutiny pre-screen

## DISCIPLINE: checkpoint BETWEEN units (auto-compact lands clean); 3-of-3 per unit; [MAIN] prefix; ASCII-only (String.fromCharCode for non-ASCII test strings); async fs in tests (soul refuses sync-fs-in-async); scoped pathspec commits (shared tree, clear stale index.lock >40s, peer interleaving expected); scrutinize --target HEAD after commit (working-tree diff ENOBUFS on this shared tree); ledger session-id db273e77.

## RESUME
NEXT UNIT (in-flight): /loop iteration-eval-narration consumer -- scripts/ollama-loop-narrate.mjs. When a /loop iteration completes, Ollama narrates the git-diff + test-output into a one-paragraph iteration summary; VERIFIER = the test EXIT CODE is ground truth (model narrates, code decides pass/fail), so narration is advisory text (nonEmptyText verifier) but the pass/fail decision is NEVER the model's. Build on verifiedOffload keystone. Pure narrateIteration({diff,testExit,testOutput,runImpl}) -> {summary, passed:boolean(from exit code), source}. Hermetic tests + live proof. Then 3-of-3 scrutiny + commit. AFTER: wire file-digest to auto-fire (advisory hook/skill, NOT sync Read interceptor).

## CONTEXT

