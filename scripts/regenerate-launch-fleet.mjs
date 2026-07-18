#!/usr/bin/env node
/**
 * regenerate-launch-fleet.mjs — HZD-followup
 *
 * Reads state/shared/chat-slots.json and emits a fresh LAUNCH-PRISM-FLEET.bat
 * to the user's Desktop. Layout: 4 Windows Terminal windows snapped to the
 * primary monitor's quadrants (NW/NE/SW/SE), each with N chats as tabs.
 * The 2 PRISM dashboards (system-viz :8765, hzp-dash-control :8767) ride in
 * the NW window as the first 2 tabs so they're always visible.
 *
 * Run: node H:/prism/scripts/regenerate-launch-fleet.mjs [--out PATH]
 *
 * Output defaults to: C:/Users/<user>/OneDrive/Desktop/LAUNCH-PRISM-FLEET.bat
 * (override with --out).
 *
 * The generated .bat itself is idempotent:
 *   - step 0a/0b start dashboards via launch-system-viz-dashboard.ps1 (skips if running)
 *   - step 1 spawns 4 wt windows with multi-tab chains
 *   - step 2 calls snap-wt-quadrants.ps1 to position them
 */

"use strict";

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, join } from "node:path";

const SLOTS_FILE = "H:/prism/state/shared/chat-slots.json";
const FLEET_STATUS_FILE = "H:/FLEET-STATUS.md";
// 2026-05-28 (slot alpha): H:/FLEET-STATUS.md is often absent; the operator-canonical
// roster lives in H:/CHAT-SLOT-DOMAINS.md. Both files share the same `SLOT - description`
// line format, so the existing parser works on either. We UNION both sources so a
// slot present in either file gets a launch tab.
const CHAT_SLOT_DOMAINS_FILE = "H:/CHAT-SLOT-DOMAINS.md";
// FLEET-LAUNCHER-IMPROVE-MS0/U-FLI04 (tango, 2026-06-10): the desktop entry is now a
// THIN self-regenerating wrapper (LAUNCH-PRISM-FLEET.bat); the heavy launcher this script
// builds is the GENERATED file the wrapper calls. The wrapper rebuilds the generated from
// the CURRENT chat-slots.json on every launch, so the .bat can never go stale (the frozen-
// decision class that caused the papa/sierra/tango bug). `--out` overrides the GENERATED path.
const DEFAULT_OUT = resolve(homedir(), "OneDrive/Desktop/LAUNCH-PRISM-FLEET.generated.bat");
const PROJECTS_DIR = resolve(homedir(), ".claude/projects/H--prism");

/**
 * Parse H:/FLEET-STATUS.md to extract the canonical slot list. This is the
 * authoritative slot ↔ domain map (operator-maintained). The regenerator
 * UNIONs chat-slots.json (binding state) with FLEET-STATUS.md (intended
 * roster) so a slot that's documented but not yet bound (e.g. CHARLIE with
 * `null` in chat-slots.json) still gets a launch tab — it just falls back to
 * fresh `claude '/checkin-<slot>'` instead of resume-by-UUID. Added 2026-05-26
 * (slot golf) closing the gap that left CHARLIE + ZULU out of the fleet
 * launcher when their chat-slots entries were null.
 *
 * Format expected: lines like "ALPHA - <domain text>" — slot name is the
 * upper-case ASCII token before the dash. Header lines (CURRENT...) are skipped.
 */
function parseFleetStatusSlots(filePath) {
  if (!existsSync(filePath)) return [];
  const text = readFileSync(filePath, "utf-8");
  const slots = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z]+)\s*-\s*(.+)$/);
    if (!m) continue;
    const slot = m[1].toLowerCase();
    if (slot === "current") continue; // header line
    if (!SLOT_NAME_RE.test(slot)) continue;
    slots.push(slot);
  }
  return slots;
}

// Strict UUID validation — full v4-style 8-4-4-4-12 hex. Rejects anything else.
// P1 fix (2026-05-25 scrutiny arm C): without this, a maliciously-named .jsonl
// filename could close the wt.exe quoted arg and inject extra commands.
const SESSION_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Slot names are NATO phonetic words — pure ASCII letters. Anything else is rejected.
const SLOT_NAME_RE = /^[a-z][a-z0-9_-]{0,32}$/i;

// Per-slot domain tags (short — fit in wt tab titles ~20 chars). Operator-curated
// from H:/FLEET-STATUS.md 2026-05-26. Falls back to "<slot>-work" if absent.
// Tab titles render as `<slot> | <tag>` so operators can see slot identity AND
// primary responsibility at a glance without enlarging the tab bar.
const DOMAIN_TAGS = {
  alpha:    "token-opt",
  bravo:    "hermes/zulu",
  charlie:  "quoting",
  delta:    "cad",
  echo:     "post-proc",
  foxtrot:  "milling",
  golf:     "fleet-reaper",
  hotel:    "erp/hr",
  india:    "ai-training",
  juliett:  "database",
  kilo:     "cam",
  lima:     "academy",
  mike:     "wire",
  november: "u-dea",
  oscar:    "sfc",
  papa:     "frontend",
  quebec:   "frontend",
  sierra:   "system-viz",
  tango:    "algo-discovery",
  whiskey:  "lathe",
  zulu:    "orchestrator",
};

function tabTitleFor(slot) {
  const tag = DOMAIN_TAGS[slot] || `${slot}-work`;
  return `${slot} | ${tag}`;
}

// 2026-05-27 (slot golf, LAUNCHER-RESUME-SIZE-GUARD): observed alpha failing to
// launch with the rest of the fleet -- its 53MB JSONL was too large for
// `claude --resume` to deserialize cleanly. delta (89MB), whiskey (68MB), and
// echo (49MB) likely silently failed the same way. Above this threshold we fall
// back to `/checkin-<slot>` (fresh session that auto-loads the slot's handoff).
// Override via env: MCP_RESUME_MAX_MB=N.
// 2026-06-10 (slot tango, OPEN-TODAYS-SESSIONS): default raised 40 -> 256. The 40MB
// ceiling was set on the PRE-UPGRADE 32GB box (the "alpha 53MB crash" observation);
// this host is now 128GB RAM + Blackwell (operator directive "build for Blackwell --
// raise low defaults"). At 40MB, 6 of 13 slots with TODAY's work (alpha 158MB,
// sierra 96MB, india 75MB, oscar 68MB, papa 63MB, echo 41MB) were kicked to a fresh
// /checkin instead of resuming today's session -- the exact opposite of the operator's
// "open the most recent sessions from today" directive. 256MB covers today's largest
// transcript with headroom while still falling back to fresh on a pathological (GB-scale)
// or corrupt transcript. Tune down with MCP_RESUME_MAX_MB if claude --resume strains.
const RESUME_MAX_MB = Math.max(1, Number(process.env.MCP_RESUME_MAX_MB) || 256);

// 2026-05-27 (slot golf, LAUNCHER-RESUME-STALENESS-GUARD): operator-reported
// "chats that launched are outdated". Diagnostic showed echo (129m) + foxtrot
// (120m) bound to JSONLs that were >2h old — chat-slots.json bindings can
// outlive the operator's actual workflow (chat closed, slot binding not
// refreshed). Resuming a stale UUID brings back a chat that's no longer the
// operator's current context for that slot. Above this threshold we fall back
// to `/checkin-<slot>` so the slot's handoff auto-loads into a fresh session.
// Default is 90m — operator directive 2026-05-27 "most up to date chats". A
// slot whose JSONL is >90m old likely has had additional work done in a chat
// the binding isn't tracking; /checkin-<slot> picks up the slot's handoff
// (which the Stop hooks keep current) instead of a stale resume. If you need
// to resume a long-running multi-hour chat, set MCP_RESUME_MAX_AGE_MIN=999
// before running the regenerator.
// 2026-05-31 (slot golf, DYNAMIC-CURRENT-SESSION): default raised 90 -> 99999 (effectively
// off). Operator directive REVERSED — they now want each slot's CURRENT session RESUMED
// regardless of idle age ("open to their current sessions ... so i can see what they were
// working on"), the opposite of the 2026-05-27 concern. The MCP_RESUME_MAX_AGE_MIN knob is
// preserved, so the old staleness-skip behavior is one env var away if ever wanted again.
const RESUME_MAX_AGE_MIN = Math.max(1, Number(process.env.MCP_RESUME_MAX_AGE_MIN) || 99999);

/**
 * Map each slot's chatId (e.g. "claude-ea80ce2f") to its full session UUID by
 * scanning the projects dir for matching JSONL transcript files. Returns the
 * NEWEST matching file's basename (sans .jsonl) ONLY when the basename matches
 * the strict UUID regex — anything weirdly-named is rejected as untrustworthy.
 * Returns { uuid, sizeMb } so the caller can decide between --resume vs /checkin
 * based on the JSONL size (huge transcripts crash claude --resume).
 */
function findSessionUuidForChatId(chatId) {
  if (!chatId || !existsSync(PROJECTS_DIR)) return null;
  const prefix = String(chatId).replace(/^claude-/, "").toLowerCase();
  if (prefix.length < 4) return null;
  let best = null;
  try {
    for (const f of readdirSync(PROJECTS_DIR)) {
      if (!f.endsWith(".jsonl")) continue;
      const base = f.slice(0, -".jsonl".length);
      if (!base.toLowerCase().startsWith(prefix)) continue;
      // Strict UUID gate — never embed a non-UUID basename into a shell command.
      if (!SESSION_UUID_RE.test(base)) continue;
      const fp = join(PROJECTS_DIR, f);
      const st = statSync(fp);
      if (!best || st.mtimeMs > best.mtime) {
        best = { uuid: base, mtime: st.mtimeMs, sizeMb: st.size / (1024 * 1024) };
      }
    }
  } catch { /* fall through */ }
  if (!best) return null;
  return {
    uuid: best.uuid,
    sizeMb: best.sizeMb,
    ageMin: (Date.now() - best.mtime) / 60000,
  };
}

const args = process.argv.slice(2);
let outPath = DEFAULT_OUT;
let noThin = false; // --no-thin: write ONLY the generated launcher. The thin wrapper passes
                    // this at launch so it never overwrites the file it is currently running.
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out" && args[i + 1]) { outPath = args[i + 1]; i++; }
  else if (args[i] === "--no-thin") { noThin = true; }
}
// The thin wrapper lives next to the generated file, named LAUNCH-PRISM-FLEET.bat.
const thinPath = join(outPath, "..", "LAUNCH-PRISM-FLEET.bat");

const raw = readFileSync(SLOTS_FILE, "utf-8");
const data = JSON.parse(raw);

// Bound slots: those with a live chatId in chat-slots.json. These can
// `claude --resume <uuid>` if their JSONL transcript still exists on disk.
const boundSlots = Object.entries(data.slots || {})
  .filter(([slot, v]) => v && v.chatId && SLOT_NAME_RE.test(slot));
const boundMap = new Map(boundSlots.map(([slot, v]) => [slot, v]));

// Canonical roster from FLEET-STATUS.md. Slots listed there but not bound in
// chat-slots.json still get a launch tab — they fall back to fresh
// `claude '/checkin-<slot>'` so the operator can claim the slot from scratch.
const fleetRoster = parseFleetStatusSlots(FLEET_STATUS_FILE);
const chatSlotDomainsRoster = parseFleetStatusSlots(CHAT_SLOT_DOMAINS_FILE);
const allSlotNames = new Set([...boundMap.keys(), ...fleetRoster, ...chatSlotDomainsRoster]);

const liveSlots = [...allSlotNames]
  .filter(slot => SLOT_NAME_RE.test(slot))
  .map(slot => {
    const v = boundMap.get(slot);
    if (v) {
      const resolved = findSessionUuidForChatId(v.chatId);
      // LAUNCHER-RESUME-SIZE-GUARD (2026-05-27 slot golf): refuse --resume when
      // JSONL exceeds RESUME_MAX_MB — `claude --resume` of huge transcripts
      // crashes silently (observed alpha at 53MB failing to launch). Fall through
      // to /checkin-<slot> which spins a fresh session that auto-loads the
      // slot's handoff.
      const sizeMb = resolved ? resolved.sizeMb : 0;
      const ageMin = resolved ? resolved.ageMin : 0;
      const tooBigToResume = resolved && sizeMb > RESUME_MAX_MB;
      // LAUNCHER-RESUME-STALENESS-GUARD (2026-05-27 slot golf): refuse --resume
      // when the bound JSONL hasn't been touched in RESUME_MAX_AGE_MIN — the
      // operator likely moved on to a newer chat for that slot (or abandoned
      // the slot). Resuming a multi-hour-old binding brings back stale context
      // that the operator's mental model of the slot has already replaced.
      const tooStaleToResume = resolved && ageMin > RESUME_MAX_AGE_MIN;
      const skipResume = tooBigToResume || tooStaleToResume;
      return {
        slot,
        chatId: v.chatId,
        topic: v.topic || `${slot}-work`,
        branch: v.branch || "?",
        sessionUuid: skipResume ? null : (resolved ? resolved.uuid : null),
        jsonlSizeMb: Math.round(sizeMb),
        jsonlAgeMin: Math.round(ageMin),
        oversizedSkippedResume: tooBigToResume,
        staleSkippedResume: tooStaleToResume,
        source: "chat-slots",
      };
    }
    // Documented in FLEET-STATUS.md but not currently bound — launch fresh.
    return {
      slot,
      chatId: null,
      topic: `${slot}-work`,
      branch: "?",
      sessionUuid: null,
      jsonlSizeMb: 0,
      jsonlAgeMin: 0,
      oversizedSkippedResume: false,
      staleSkippedResume: false,
      source: "fleet-status",
    };
  })
  .sort((a, b) => a.slot.localeCompare(b.slot));
  // 2026-05-26 (slot:golf operator directive): strict alphabetical NW→NE→SW→SE,
  // no slot gets priority placement. The fleet-reaper guardian fires independently
  // of which corner golf lands in. Layout becomes: NW=alpha..echo, NE=foxtrot..juliett,
  // SW=kilo..oscar, SE=papa..whiskey (skipping romeo since it's not in FLEET-STATUS.md).

const n = liveSlots.length;
if (n === 0) {
  process.stderr.write("regenerate-launch-fleet: 0 live slots — refusing to write empty .bat\n");
  process.exit(2);
}

// 2026-05-26 (slot:golf, operator directive: "exact 4 windows with the exact
// 5 chat slots per window"). Zulu is launched separately by
// PRISM-Zulu-Chat.bat (orchestrator slot has its own lifecycle), and the
// dashboards open in the browser separately — neither belongs in the 4×5 grid.
// Pull zulu out so 4 quadrants × 5 slots = 20 chats land deterministically.
const zuluSlot = liveSlots.find((s) => s.slot === "zulu") || null;
const quadSlots = liveSlots.filter((s) => s.slot !== "zulu");

// Distribute into 4 quadrants — sequential 5-block fill so alphabetical input
// produces alphabetical-within-quadrant output: NW=[0..4], NE=[5..9], SW=[10..14], SE=[15..19].
// Round-robin would have interleaved (alpha→NW, bravo→NE, ...) which scatters
// alphabetical neighbors across windows. Sequential keeps them grouped.
const quads = { NW: [], NE: [], SW: [], SE: [] };
const order = ["NW", "NE", "SW", "SE"];
// 2026-05-28 (slot alpha): distribute base = floor(N/4) per quadrant, overflow
// goes to SE. This preserves operator's group-leader intent (alpha→NW, foxtrot→NE,
// kilo→SW, papa→SE) when N > 24: e.g. 25 slots -> 6/6/6/7 (xray lands in SE
// alphabetically anyway), 26 -> 6/6/6/8. Old perQuad=ceil(N/4) produced 7/7/7/4
// which broke the group-leader anchoring for any non-24 count.
const base = Math.floor(quadSlots.length / order.length);
const remainder = quadSlots.length % order.length;
const splits = order.map((_, i) => i < order.length - 1 ? base : base + remainder);
let _idx = 0;
order.forEach((q, qi) => {
  for (let k = 0; k < splits[qi] && _idx < quadSlots.length; k++) {
    quads[q].push(quadSlots[_idx++]);
  }
});

/**
 * Build the per-slot claude command. If a JSONL transcript exists for the
 * slot's chatId, use `claude --resume <full-uuid>` to reload the EXACT prior
 * session (transcript + tool history + slot-binding all intact — the first
 * UserPromptSubmit re-fires session-start hooks). Otherwise fall back to the
 * fresh `/checkin-<slot>` invocation which auto-resumes from the slot's
 * handoff.
 */
// 2026-05-26 (slot:golf, operator directive): every chat launches with the
// `--dangerously-skip-permissions` flag so the bypass-permissions mode is
// active from turn 1. The flag is also the default mode the operator's normal
// claude shortcuts use; mirroring it in the fleet launcher avoids per-chat
// "approve this tool" prompts that would block autonomous /loop iterations.
function bootArgsForSlot(s) {
  // 2026-05-28 (slot alpha, SEMICOLON-COLLISION-FIX): each tab now runs
  //   pwsh -File slot-tab-boot.ps1 -Slot <name> [-ResumeSession <uuid> | -ForceCheckin]
  // instead of the old -Command "$env:...; %CLAUDE% ..." form. Reason:
  // Windows Terminal's `;` action-separator parser does NOT honor pwsh's
  // -Command quote scope, so wt split tabs at the `;` between env-set and
  // claude invocation — treating "%CLAUDE% --dangerously-skip-permissions
  // '/checkin-X'" as a new tab's commandline, which CreateProcess rejected
  // with FILE_NOT_FOUND (0x80070002). -File argv has zero `;` chars, so wt's
  // separator parser cannot split mid-tab.
  //
  // The boot script (H:\Tools\prism-fleet\slot-tab-boot.ps1) handles:
  //   - PRISM_BOOT_SLOT export (for session-start-auto-resume.mjs hook)
  //   - anti-compact env (CLAUDE_AUTOCOMPACT_PCT_OVERRIDE + PRECOMPACT_*)
  //   - direct claude.exe call (bypasses broken claude.cmd indirection)
  //   - 4-tier session resolution when no override is supplied
  //   - liveness guard (PID + JSONL-mtime) to skip slots that are currently alive
  //
  // We pass our own size+age guard decision via -ResumeSession <uuid> (when safe)
  // or -ForceCheckin (when oversized/stale). Boot script honors these directives
  // and skips its own tier resolution — preserving operator-validated guards.
  // 2026-05-31 (slot golf, DYNAMIC-CURRENT-SESSION): pass BARE -Slot so the boot
  // script's 4-tier resolver picks each slot's CURRENT most-recent session AT
  // LAUNCH — not a UUID frozen at regen time, which goes stale the instant the
  // operator works more in that slot. Operator directive: "each chat slot window
  // opens to their current sessions". The boot script resumes the newest session
  // for the slot regardless of idle age (no staleness skip) and now size-guards
  // huge JSONLs at launch (claude --resume crashes on them) -> fresh fallback.
  // Oversized-AT-REGEN slots are pre-routed to -ForceCheckin as a fast path;
  // unbound roster-only slots have no session to resume.
  if (s.chatId && !s.oversizedSkippedResume) {
    return `-File "%BOOT%" -Slot ${s.slot}`;
  }
  return `-File "%BOOT%" -Slot ${s.slot} -ForceCheckin`;
}

function quadCmd(_quadrant, slots, extraTabsBefore) {
  // Each wt invocation is one line; tabs are chained with ` ; nt …`. Single-line so cmd.exe doesn't choke.
  // 2026-05-26 (slot:golf, operator directive): every tab uses %PWSH% = PowerShell 7
  // (full path C:\Program Files\PowerShell\7\pwsh.exe). The bat's prologue
  // self-elevates so every spawned wt window inherits admin tokens — Windows
  // Terminal cannot make individual tabs elevated; inheritance from the
  // launching shell is the only path.
  // Tab titles are bare `<slot> | <domain-tag>` so operators see slot identity
  // and primary responsibility per tab. The snap script (snap-wt-quadrants.ps1)
  // matches by the FIRST tab's slot name per quadrant (alpha=NW, foxtrot=NE,
  // kilo=SW, papa=SE), so we no longer need a `prism-<quadrant>-` title prefix.
  // 2026-05-27 (slot golf, B3-PWSH-QUOTING-FIX): %PWSH% MUST be quoted in the
  // wt arg list — the resolved path is `C:\Program Files\PowerShell\7\pwsh.exe`
  // (space in "Program Files"). Without quotes, wt.exe tokenizes the arg list
  // by whitespace and sees `C:\Program` as the executable and
  // `Files\PowerShell\7\pwsh.exe` as the first arg — that's a non-existent
  // process, so the tab either crashes immediately OR (Windows Terminal default
  // behavior with bad commands) opens with the user's DEFAULT profile, which
  // on most installs is cmd.exe — matches operator-reported "some tabs
  // launched in cmd instead of powershell 7". The fix is purely additive:
  // quoting a path that doesn't contain quotes never breaks parsing.
  const parts = [];
  // 2026-05-28: extraTabsBefore was used by the old dashboards-in-tabs codepath
  // (already removed upstream). Now-unused but kept for back-compat with any
  // future caller that wants to prepend dashboards. extraTabsBefore[i] is
  // expected to expose .tabTitle + .bootArgs (the -File/-Slot/... arg string).
  if (extraTabsBefore && extraTabsBefore.length > 0) {
    const first = extraTabsBefore[0];
    parts.push(`-w new --title "${first.tabTitle}" -d "%PRISM%" "%PWSH%" -NoExit -NoLogo -NoProfile ${first.bootArgs}`);
    for (let i = 1; i < extraTabsBefore.length; i++) {
      const t = extraTabsBefore[i];
      parts.push(`nt --title "${t.tabTitle}" -d "%PRISM%" "%PWSH%" -NoExit -NoLogo -NoProfile ${t.bootArgs}`);
    }
    for (const s of slots) {
      parts.push(`nt --title "${tabTitleFor(s.slot)}" -d "%PRISM%" "%PWSH%" -NoExit -NoLogo -NoProfile ${bootArgsForSlot(s)}`);
    }
  } else if (slots.length > 0) {
    const first = slots[0];
    parts.push(`-w new --title "${tabTitleFor(first.slot)}" -d "%PRISM%" "%PWSH%" -NoExit -NoLogo -NoProfile ${bootArgsForSlot(first)}`);
    for (let i = 1; i < slots.length; i++) {
      const s = slots[i];
      parts.push(`nt --title "${tabTitleFor(s.slot)}" -d "%PRISM%" "%PWSH%" -NoExit -NoLogo -NoProfile ${bootArgsForSlot(s)}`);
    }
  }
  // wt syntax: arguments separated by ` ; ` (with literal spaces around the semicolon).
  return `start "" "%WT%" ${parts.join(" ; ")}`;
}

// 2026-05-26 (slot:golf): dashboards no longer share quadrant tabs — exact 5 chats
// per window per operator directive. Dashboards open as browser tabs after the
// system-viz scheduled task / hzp-dash-control daemon is running. The
// `dashboardTabs` template the old codepath used is intentionally removed; if
// it returns, restore the array literal and pass it as quadCmd's third arg.
const nwCmd = quadCmd("NW", quads.NW, null);
const neCmd = quadCmd("NE", quads.NE, null);
const swCmd = quadCmd("SW", quads.SW, null);
const seCmd = quadCmd("SE", quads.SE, null);

const banner = `Generated: ${new Date().toISOString()}`;
const totalWindows = 4;
const totalChats = quadSlots.length; // 20 expected per FLEET-STATUS.md (excl. zulu)
const quadSummary = [
  `NW: ${quads.NW.map(s=>s.slot).join(", ") || "(empty)"}`,
  `NE: ${quads.NE.map(s=>s.slot).join(", ") || "(empty)"}`,
  `SW: ${quads.SW.map(s=>s.slot).join(", ") || "(empty)"}`,
  `SE: ${quads.SE.map(s=>s.slot).join(", ") || "(empty)"}`,
].join("\nREM   ");

const bat = `@echo off
REM ============================================================
REM  PRISM Fleet Launcher (QUADRANT LAYOUT — exact 4×5)
REM  ${banner}
REM  Captures: ${totalChats} active chat slots from chat-slots.json ∪ FLEET-STATUS.md
REM            (zulu excluded — launches via PRISM-Zulu-Chat.bat separately)
REM
REM  LAYOUT:
REM    ${quadSummary}
REM
REM  WHAT THIS DOES:
REM  - SELF-ELEVATES if not already running as admin (operator directive 2026-05-26)
REM  - Spawns 4 Windows Terminal windows (one per quadrant), 5 chat tabs each
REM  - Every tab launches: pwsh 7 -> claude --dangerously-skip-permissions
REM  - Bound slots resume their CURRENT most-recent session DYNAMICALLY at launch
REM    (boot script 4-tier resolver, size-guarded, no-compact) -- NOT a frozen UUID
REM  - Roster-only / oversized slots fall back to 'claude /checkin-<slot>' (fresh)
REM  - After spawn, snap-wt-quadrants.ps1 positions windows via Win32 SetWindowPos
REM
REM  DASHBOARDS: open in browser separately (not occupying tab real-estate):
REM    http://127.0.0.1:8765/                        (system-viz 3D map)
REM    http://127.0.0.1:8765/hermes-zulu-ops.html   (Hermes/Zulu Ops)
REM
REM  TO REGENERATE (when chat-slots.json or FLEET-STATUS.md changes):
REM    node H:/prism/scripts/regenerate-launch-fleet.mjs
REM ============================================================

REM Self-elevate (2026-05-26 operator directive). Windows Terminal cannot
REM make individual tabs elevated; inheritance from the launching shell is
REM the only path. The 'net session' probe is a reliable admin-check on Win10/11.
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [self-elevate] re-launching as admin via UAC prompt...
    REM 2026-05-26 (slot golf): drop the -ArgumentList entirely when invoked without
    REM args (the common case — operator double-clicks). Passing -ArgumentList ''
    REM throws a red PowerShell ParameterBindingValidationException visible briefly
    REM before the cmd window closes. Start-Process with no args is what we want.
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b 0
)

REM 2026-05-26 (slot golf): bypass PATH entirely with absolute paths. Earlier
REM versions used \`where wt.exe / where pwsh.exe / where claude\` checks that
REM all depended on the elevated process inheriting a PATH containing
REM WindowsApps + H:\\Tools\\nodejs. Elevated sessions on Win11 frequently have
REM stale PATH snapshots (read at logon, not refreshed by user-PATH-edits),
REM so each \`where\` call failed → pause → user dismisses → window closes,
REM looking like the bat "opens and closes immediately". Hardcoded paths
REM eliminate that failure mode entirely.
set "WT=C:\\Users\\wompu\\AppData\\Local\\Microsoft\\WindowsApps\\wt.exe"
set "PWSH=C:\\Program Files\\PowerShell\\7\\pwsh.exe"
REM 2026-05-28 (slot alpha, SEMICOLON-COLLISION-FIX): each tab runs
REM   pwsh -File %BOOT% -Slot <name> [-ResumeSession <uuid> | -ForceCheckin]
REM instead of -Command "...; %CLAUDE% ...". Reason: wt's \`;\` action separator
REM cannot see pwsh's -Command quote scope and was splitting tabs mid-command,
REM trying to launch "%CLAUDE% --dangerously-skip-permissions '/checkin-X'" as
REM a tab executable -> CreateProcess FILE_NOT_FOUND 0x80070002. The boot script
REM handles claude.exe launch internally (and bypasses the broken claude.cmd
REM -> cmd.exe -> claude.exe indirection that 2.1.152 was failing on).
set "BOOT=H:\\Tools\\prism-fleet\\slot-tab-boot.ps1"
REM 2026-05-26 (slot golf, MCP-PREFLIGHT): portable node for the supervisor spawn.
REM Without this, 20 wt windows spawn 20 bridges in <1s; each bridge probes :3100,
REM finds it dead, and individually spawns the supervisor → 20-way race on the
REM supervisor's O_EXCL PID lock. The bridge recovers eventually (60s initialize
REM retry budget) but the operator perceives it as flaky. Single preflight spawn
REM here means bridges connect to an already-warm daemon.
set "NODE=H:\\Tools\\nodejs\\node.exe"

if not exist "%WT%" (
    echo Windows Terminal not at %WT%
    echo Install: winget install --id Microsoft.WindowsTerminal -e
    pause
    exit /b 1
)
if not exist "%PWSH%" (
    echo PowerShell 7 not at %PWSH%
    echo Install: winget install --id Microsoft.PowerShell -e
    pause
    exit /b 1
)
if not exist "%BOOT%" (
    echo Slot boot script not at %BOOT%
    echo Required: H:\\Tools\\prism-fleet\\slot-tab-boot.ps1
    echo This script is what each tab runs; without it the fleet cannot launch.
    pause
    exit /b 1
)
if not exist "%NODE%" (
    echo Portable node not at %NODE%
    echo MCP preflight will be skipped — bridges will self-heal on demand ^(slower first-launch^)
    set "SKIP_MCP_PREFLIGHT=1"
)

set "PRISM=H:\\PRISM"

title PRISM Fleet Launcher (4 windows x 5 chats)
color 0B
echo ================================================================
echo   PRISM FLEET LAUNCHER -- ${banner}
echo   ${totalWindows} windows, ${totalChats} chats total (5 per window, elevated pwsh 7, bypass-permissions)
echo   NW: ${quads.NW.length} chats
echo   NE: ${quads.NE.length} chats
echo   SW: ${quads.SW.length} chats
echo   SE: ${quads.SE.length} chats
echo.
echo   Dashboards (open in browser after launch — not tab-occupying):
echo     http://127.0.0.1:8765/                        (system-viz 3D map)
echo     http://127.0.0.1:8765/hermes-zulu-ops.html   (Hermes/Zulu Ops)
echo ================================================================
echo.

REM ============================================================
REM --- 0c. MCP DAEMON PREFLIGHT (MCP-PREFLIGHT, slot golf, 2026-05-26)
REM ============================================================
REM Problem: all 20 wt windows spawn their stdio bridges in <1s. If :3100 is
REM down, each bridge individually spawns the supervisor (20-way race on the
REM supervisor's O_EXCL PID lock). The bridge survives this (60s initialize
REM retry budget per mcp-http-bridge.mjs:215), but the operator sees flaky
REM first-connect behavior and stale-state /mcp banners.
REM
REM Fix: single supervisor spawn here, gated on :3100/health, BEFORE any wt
REM window. Bridges then connect to an already-warm daemon. If preflight
REM fails to bring the daemon up in 60s, we proceed anyway — the bridges'
REM self-heal path is the safety net (this preflight is an optimization).
REM ============================================================
if defined SKIP_MCP_PREFLIGHT goto :_mcpready
echo [preflight] Checking MCP daemon at http://127.0.0.1:3100/health...
"%PWSH%" -NoLogo -NoProfile -Command "try { $null = Invoke-WebRequest -Uri 'http://127.0.0.1:3100/health' -UseBasicParsing -TimeoutSec 3; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [preflight] OK — MCP daemon already warm
    goto :_mcpready
)
echo [preflight] MCP daemon down — spawning supervisor ^(detached^)...
start /min "" "%PWSH%" -NoLogo -NoProfile -Command "& '%NODE%' '%PRISM%\\scripts\\mcp-server-supervisor.mjs'"
echo [preflight] Waiting up to 60s for daemon to become healthy...
set /a _mcp_waited=0
:_mcpwait
timeout /t 5 /nobreak >nul
"%PWSH%" -NoLogo -NoProfile -Command "try { $null = Invoke-WebRequest -Uri 'http://127.0.0.1:3100/health' -UseBasicParsing -TimeoutSec 3; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [preflight] OK — MCP daemon healthy after %_mcp_waited%s
    goto :_mcpready
)
set /a _mcp_waited+=5
if %_mcp_waited% LSS 60 goto :_mcpwait
echo [preflight] WARN — MCP daemon did not come up in 60s; bridges will self-heal on demand
:_mcpready
echo.

REM ============================================================
REM Inter-quadrant stagger — 15s between quadrants (was 2-3s).
REM ============================================================
REM Why: 20 \`claude --resume <uuid>\` in <2s = 20 simultaneous Anthropic Messages
REM API calls (resume re-injects context). That hits the per-org RPM /
REM concurrent-connection cap and surfaces as "rate-limited" / "overloaded"
REM banners in fresh chats. Stretching the ramp to ~60s keeps every 5-chat
REM burst inside the bursty-call threshold.
REM Knob: set MCP_QUAD_STAGGER_SEC=N before running the bat to override.
REM ============================================================
if not defined MCP_QUAD_STAGGER_SEC set "MCP_QUAD_STAGGER_SEC=15"

REM --- 1a. Launch NW (${quads.NW.length} chats) ---
echo [1/4]  Launching NW window (${quads.NW.length} chats)...
${nwCmd}
echo [stagger] Sleeping %MCP_QUAD_STAGGER_SEC%s before NE to space out API calls...
timeout /t %MCP_QUAD_STAGGER_SEC% /nobreak >nul

REM --- 1b. Launch NE ---
echo [2/4]  Launching NE window (${quads.NE.length} chats)...
${neCmd}
echo [stagger] Sleeping %MCP_QUAD_STAGGER_SEC%s before SW...
timeout /t %MCP_QUAD_STAGGER_SEC% /nobreak >nul

REM --- 1c. Launch SW ---
echo [3/4]  Launching SW window (${quads.SW.length} chats)...
${swCmd}
echo [stagger] Sleeping %MCP_QUAD_STAGGER_SEC%s before SE...
timeout /t %MCP_QUAD_STAGGER_SEC% /nobreak >nul

REM --- 1d. Launch SE ---
echo [4/4]  Launching SE window (${quads.SE.length} chats)...
${seCmd}
timeout /t 3 /nobreak >nul

REM --- 2. Snap to quadrants via Win32 SetWindowPos ---
echo.
echo Snapping windows to monitor quadrants...
powershell -NoProfile -ExecutionPolicy Bypass -File "%PRISM%\\scripts\\snap-wt-quadrants.ps1"

REM --- 3. Launch outcome summary (FLEET-LAUNCHER-IMPROVE-MS0/U-FLI03) ---
REM Each boot tab logged its decision (resumed / fresh / skipped) to
REM state/shared/.fleet-launch-log.jsonl; this aggregates THIS launch's entries
REM (scoped by the start marker the thin wrapper wrote). Best-effort -- skipped
REM if portable node is unavailable.
echo.
if exist "%NODE%" "%NODE%" "%PRISM%\\scripts\\fleet-launch-summary.mjs" --expected ${totalChats}

echo.
echo ================================================================
echo   Fleet launched: 4 wt windows in quadrants, ${totalChats} chats total.
echo   System-viz:       http://127.0.0.1:8765/
echo   Hermes/Zulu Ops: http://127.0.0.1:8765/hermes-zulu-ops.html
echo ================================================================
echo.
REM 2026-05-26 (slot golf): pause instead of timeout — the elevated cmd window
REM previously auto-closed after 5s, hiding any red errors from wt.exe / snap
REM script / claude --resume failures. Operator dismisses with any key.
pause
`;

writeFileSync(outPath, bat, "utf-8");

// FLEET-LAUNCHER-IMPROVE-MS0/U-FLI04: (re)write the THIN self-regenerating wrapper
// unless --no-thin. The wrapper is what the operator double-clicks; it rebuilds THIS
// generated file from current chat-slots.json, refreshes today's context-recovery,
// marks the launch (for the summary), then `call`s the generated launcher. Passing
// --no-thin at launch means the wrapper never overwrites the file it is running.
const genBase = outPath.split(/[\\/]/).pop();
const thinBat = `@echo off
REM ============================================================
REM  PRISM Fleet -- THIN self-regenerating launcher (double-click THIS)
REM  Generated by scripts/regenerate-launch-fleet.mjs (FLEET-LAUNCHER-IMPROVE-MS0).
REM  On every launch it: (1) rebuilds ${genBase} from the CURRENT chat-slots.json
REM  (so per-slot resume/fresh decisions can never go stale), (2) refreshes today's
REM  context-recovery files, (3) marks the launch for the outcome summary, then
REM  (4) calls the generated launcher (which self-elevates + spawns the fleet).
REM  Regenerate by hand: node H:/prism/scripts/regenerate-launch-fleet.mjs
REM ============================================================
set "PRISM=H:\\PRISM"
set "NODE=H:\\Tools\\nodejs\\node.exe"
set "GENPATH=%~dp0${genBase}"

if not exist "%NODE%" (
    echo [thin] Portable node not at %NODE% -- skipping regen/recovery refresh.
    goto :launch
)

echo [thin] Rebuilding fleet launcher from current chat-slots.json...
"%NODE%" "%PRISM%\\scripts\\regenerate-launch-fleet.mjs" --out "%GENPATH%" --no-thin
if errorlevel 1 echo [thin] WARN regen failed -- using the existing generated launcher if present.

echo [thin] Refreshing today's context-recovery files...
"%NODE%" "%PRISM%\\scripts\\recover-today-context.mjs" --all
if errorlevel 1 echo [thin] WARN recovery refresh failed -- resume pointers may be stale.

echo [thin] Marking launch start ^(for the outcome summary^)...
"%NODE%" "%PRISM%\\scripts\\fleet-launch-summary.mjs" --mark

REM FLEET-LAUNCHER-IMPROVE-MS0/U-FLI05: strategically pre-warm the local compute
REM stack -- launch Docker Desktop (if off) + the compose services + ensure native
REM Ollama (:11434). DETACHED (start /min) so the 24-chat spawn is NOT blocked by
REM Docker's 30-60s cold start; the launcher is idempotent (skips already-running)
REM and writes state/shared/DOCKER_RUNTIME_STATE.json.
echo [thin] Warming local compute ^(Docker Desktop + stack + native Ollama^) in the background...
start "" /min "%NODE%" "%PRISM%\\mcp-server\\scripts\\ollama-docker-launcher.mjs" --skip-pull --ensure-native-ollama

:launch
if not exist "%GENPATH%" (
    echo [thin] No generated launcher at %GENPATH% and regen unavailable.
    echo [thin] Run: node H:/prism/scripts/regenerate-launch-fleet.mjs
    pause
    exit /b 1
)
call "%GENPATH%"
`;
if (!noThin) {
  writeFileSync(thinPath, thinBat, "utf-8");
}

// 2026-05-31 (slot golf): count by the ACTUAL boot-arg decision (chatId bound &&
// not-oversized => bare -Slot => boot script resolves+resumes dynamically), NOT by
// sessionUuid. findSessionUuidForChatId only scans the SHARED H--prism project dir, so
// it misses sessions in per-slot worktree project dirs that the boot script's Tier 2
// DOES find — undercounting dynamic-resume slots if we keyed the report on sessionUuid.
const resumedCount = quadSlots.filter((s) => s.chatId && !s.oversizedSkippedResume).length;
const oversizedCount = quadSlots.filter((s) => s.oversizedSkippedResume).length;
const staleCount = quadSlots.filter((s) => s.staleSkippedResume).length;
const freshCount = quadSlots.length - resumedCount;
process.stdout.write(`regenerate-launch-fleet: wrote ${outPath} (${quadSlots.length} chats in 4 quadrants, 5 per window; elevated pwsh 7; bypass-permissions)\n`);
if (!noThin) process.stdout.write(`  + thin self-regenerating wrapper -> ${thinPath} (double-click THIS; it rebuilds the generated launcher + refreshes recovery each launch)\n`);
process.stdout.write(`  Resume mode: ${resumedCount} DYNAMIC current-session resume (boot script resolves newest at launch) + ${freshCount} forced-fresh (/checkin-<slot>)\n`);
if (oversizedCount > 0) {
  const oversized = quadSlots.filter((s) => s.oversizedSkippedResume).map((s) => `${s.slot}(${s.jsonlSizeMb}MB)`).join(", ");
  process.stdout.write(`  Size-guard: ${oversizedCount} slot(s) > ${RESUME_MAX_MB}MB JSONL forced to fresh /checkin: ${oversized}\n`);
  process.stdout.write(`  (claude --resume crashes silently on huge transcripts. Override: MCP_RESUME_MAX_MB=N node scripts/regenerate-launch-fleet.mjs)\n`);
}
if (staleCount > 0) {
  const stale = quadSlots.filter((s) => s.staleSkippedResume).map((s) => `${s.slot}(${s.jsonlAgeMin}m)`).join(", ");
  process.stdout.write(`  Staleness-guard: ${staleCount} slot(s) > ${RESUME_MAX_AGE_MIN}m JSONL forced to fresh /checkin: ${stale}\n`);
  process.stdout.write(`  (bound chatId is stale — operator likely moved on. Override: MCP_RESUME_MAX_AGE_MIN=N node scripts/regenerate-launch-fleet.mjs)\n`);
}
if (zuluSlot) {
  process.stdout.write(`  Excluded:    zulu (orchestrator slot — launches via PRISM-Zulu-Chat.bat separately)\n`);
}
for (const q of order) {
  const labels = quads[q].map((s) => (s.chatId && !s.oversizedSkippedResume) ? `${s.slot}*` : s.slot);
  process.stdout.write(`  ${q}: ${labels.join(", ")}\n`);
}
process.stdout.write(`  (* = dynamic current-session resume via boot script 4-tier resolver; bare = fresh /checkin-<slot>)\n`);
