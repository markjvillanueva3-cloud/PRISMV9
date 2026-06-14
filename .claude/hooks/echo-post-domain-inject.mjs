#!/usr/bin/env node
// tier: T2 (injector — UserPromptSubmit, suggest-only, fail-soft)
// echo-post-domain-inject.mjs — custom post-processor domain-awareness surface (slot:echo galaxy)
// PER-SLOT-GALAXY-BUILDOUT / U-PSGB-ECHO (2026-05-28, slot:echo). KB ref added 2026-05-29 (U-ECHO-NCLINT/KB).
// Karpathy 5-step: CLASSIFY UserPromptSubmit injector; TECHNIQUE bounded-stdin + keyword regex + static digest;
// EDGE empty/non-JSON/no-keyword skip; FAILURE stdin-hang(1s)/parse/throw -> exit 0 NEVER block; WRITE fail-soft.
// Additive, domain-gated, suggest-only. Disable: PRISM_ECHO_POST_DOMAIN_INJECT_DISABLE=1.

// HIGHVALUE-DISCOVERY #1 (2026-06-08, slot:alpha): session-keyed dedup so the
// static post-processor DIGEST isn't re-injected byte-identically every prompt.
import { dedupedContext } from "../../scripts/lib/injection-dedup-emit.mjs";

const DISABLE = process.env.PRISM_ECHO_POST_DOMAIN_INJECT_DISABLE === '1';
const KW = /\b(post[-\s]?process|post[-\s]?processor|postproc|g[-\s]?code|gcode|dialect|masterpost|master[-\s]?post|\.cps|cps\b|ppg\b|controller|fanuc|okuma|haas|hurco|siemens|mitsubishi|mazak|heidenhain|rtcp|nurbs|canned cycle)\b/i;

const DIGEST = [
  '## post-processor domain context (echo galaxy)',
  '_Auto-injected by echo-post-domain-inject on post-processor-domain prompts. Disable: PRISM_ECHO_POST_DOMAIN_INJECT_DISABLE=1._',
  '',
  '- 📚 Canonical domain KB (compiled wiki+tribal, READ FIRST): knowledge/wiki/architecture/post-processor-knowledge-base.md',
  '- Quality gate: node scripts/post-nc-dialect-lint.mjs <file> --dialect <x> (skill /post-nc-lint); 8 dialect rules; auto-runs on NC edits via post-nc-dialect-guard.',
  '- Galaxy doctrine: mcp-server/src/engines/post-processor/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md (PATHS=O(1) file lookup; TOOLBELT=tool patterns).',
  '- Leverage (wire-it-now): 8 stub-wired dark engines WEDMPost{Mitsubishi,Sodick,Makino,Agie,Fanuc} + LathePostProcessorAI(73K) + LathePostGeneratorActiveLearning + JMDiePostProcessorLearning; single engine.method?.() case = dark. ~14 AGI-tier fully dark = MS-MASTERPOST anchor.',
  '- Emit: route through PostProcessorPipelineEngine 7-phase (P1 physics + P5 safety NON-NEGOTIABLE); never string-concat. Pre-emit cam_post_emit_safety_gate.',
  '- Dialect gotchas: G93 inverse-time vs G94 ipm vs G95 ipr; M8 AFTER M3-at-speed (mill; lathe M8-before-M3 OK); M50/M51=aux NOT coolant; Okuma OSP [] vs Fanuc (); Siemens MCALL vs Fanuc G84.',
  '- Constants (never inline): dialect->src/data/controller-dialects/<vendor>.ts; feed/speed->cam_speedfeed_compute; physics->src/physics/constants.ts.',
  '- Legal: MS-MASTERPOST gated on U-LEGAL-13 (public manuals only). Lane: claim chat-bus before HurcoV11*/WEDMPost* (16 in-flight handoffs).',
  '- JM .cps fleet: 12 posts (Haas/Hurco/Okuma/Fanuc); wire-EDM post absent (gen via WEDMPostMitsubishiEngine).',
].join('\n');

function readStdin(timeoutMs = 1000) {
  return new Promise((resolve) => {
    let buf = ''; let done = false;
    const finish = () => { if (!done) { done = true; resolve(buf); } };
    try {
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (c) => { buf += c; if (buf.length > 1000000) finish(); });
      process.stdin.on('end', finish);
      process.stdin.on('error', finish);
    } catch { finish(); }
    setTimeout(finish, timeoutMs);
  });
}

async function main() {
  if (DISABLE) return;
  let prompt = '';
  let sid = '';
  try {
    const raw = await readStdin();
    if (raw) {
      const j = JSON.parse(raw);
      prompt = typeof j?.prompt === 'string' ? j.prompt : (typeof j?.user_prompt === 'string' ? j.user_prompt : '');
      sid = typeof j?.session_id === 'string' ? j.session_id : '';
    }
  } catch { /* skip */ }
  if (!prompt || !KW.test(prompt)) return;
  const out = { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: dedupedContext("echo-post-domain", DIGEST, sid) } };
  try { process.stdout.write(JSON.stringify(out)); } catch { /* ignore */ }
}

main().then(() => process.exit(0)).catch(() => process.exit(0));
