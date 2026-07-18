#!/usr/bin/env node
// tier: T3
/**
 * stop-close-fusion-scratch.mjs — Stop hook (advisory, fail-soft).
 *
 * Auto-closes PRISM throwaway "scratch" Fusion documents at session end so a long
 * CAM/CAD drive session never leaves hundreds of windows open burning RAM/CPU/GPU.
 * This is R14 ("close your tool calls") applied to Fusion documents — the operator no
 * longer has to remember to close them; it happens automatically on Stop.
 *
 * SAFETY: acts ONLY on :18365 (kilo/CAM scratch bridge) by default. The add-in closes
 * ONLY documents it itself registered as scratch (discard-only) — delta's live CAD docs
 * on :18362 are never registered and never touched, so CAD work can never be lost.
 *
 * Never blocks Stop (advisory). No-op when Fusion is down or running an OLD add-in
 * without /doc/close (surfaces a one-line "restart Fusion" hint in that case).
 *
 * Knobs:
 *   PRISM_FUSION_CLOSE_DISABLE=1            — disable entirely
 *   PRISM_FUSION_CLOSE_PORTS=18365,18362   — override ports (comma-separated)
 */
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function out(obj) {
  try { process.stdout.write(JSON.stringify(obj || {})); } catch { /* ignore */ }
}

async function main() {
  // Drain stdin per the hook protocol; we don't need its content.
  try { for await (const _chunk of process.stdin) { /* drain */ } } catch { /* ignore */ }

  if (process.env.PRISM_FUSION_CLOSE_DISABLE === "1") { out({}); return; }

  // Import the shared lib by path. Pre-merge (file not yet in the main worktree the hook
  // is wired against) this throws → silent no-op, never an error spam fleet-wide.
  let lib;
  try {
    // pathToFileURL: on Windows, import() of a bare absolute path (H:\...) throws
    // ERR_UNSUPPORTED_ESM_URL_SCHEME — dynamic import needs a file:// URL.
    const libUrl = pathToFileURL(resolve(__dirname, "../../scripts/lib/fusion-scratch-close.mjs")).href;
    lib = await import(libUrl);
  } catch { out({}); return; }

  const ports = lib.parsePorts(process.env.PRISM_FUSION_CLOSE_PORTS, lib.DEFAULT_PORTS);
  let res;
  try { res = await lib.closeFusionScratch({ ports }); }
  catch { out({}); return; }

  const closed = res.totalClosed || 0;
  if (closed > 0) {
    out({
      systemMessage:
        `🧹 Fusion auto-cleanup (R14): closed ${closed} scratch document(s) to free ` +
        `RAM/CPU/GPU [${res.byPort.map((p) => `:${p.port}=${p.closed || 0}`).join(" ")}].`,
    });
    return;
  }

  const needRestart = res.byPort.find((p) => p.up && !p.capable && /restart/i.test(p.error || ""));
  if (needRestart) {
    out({
      systemMessage:
        `⚠ Fusion :${needRestart.port} is running an OLD PRISM_Fusion_Drive add-in without ` +
        `/doc/close — restart Fusion to enable automatic scratch-document cleanup.`,
    });
    return;
  }

  // R12: an up-but-broken endpoint (e.g. /documents returned an error envelope) must be
  // loud, not a silent no-op — that masking is what hid the _nav_safe defect.
  const broken = res.byPort.find((p) => p.up && !p.capable && p.error);
  if (broken) {
    out({
      systemMessage:
        `⚠ Fusion :${broken.port} /documents endpoint error (${broken.error}) — scratch ` +
        `auto-cleanup could not run; check the PRISM_Fusion_Drive add-in.`,
    });
    return;
  }
  out({});
}

main();
