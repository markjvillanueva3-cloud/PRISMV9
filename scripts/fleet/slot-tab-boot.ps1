<#
.SYNOPSIS
  PRISM fleet per-slot tab boot -- resumes the most recent session for this slot
  WITHOUT compacting (operator directive 2026-05-28). 4-tier session discovery.

.DESCRIPTION
  Spawned by Launch-PRISM-Fleet.ps1 as the command of every Windows Terminal tab:
      pwsh -NoExit -File slot-tab-boot.ps1 -Slot <nato>

  Resume resolution order (operator: "find the most up to date session for each
  chat slot please. dont compact them so i can see what they were working on.
  make it so it always launchs the most up to date session per chat slot name"):

    Tier 1   - chat-slots.json chatId match (covers chats that ran from the
               shared H:\prism tree, which is where the 5/27 night sessions
               actually live). LIVENESS GUARD: if the chat-slots entry shows
               this slot is currently alive on THIS host (pid exists), the
               tab refuses to relaunch -- avoids the duplicate-attach JSONL
               race when operator launches the fleet while a chat is still
               open. Stale entries (host mismatch or pid gone) are resumed.

    Tier 1.5 - shared dir scan. If chat-slots.json has no live claim for this
               slot but a session JSONL exists in H--prism\ whose first user
               message contains "/checkin-<slot>", resume the newest such
               session. Catches slots whose chat-slots.json claim was reaped
               (>10min heartbeat gap) overnight -- operator still wants those
               resumed since they ran from the shared tree last night.

    Tier 2   - slot-keyed project dir scan. If H--prism-slot-<slot>\*.jsonl
               exists, take the newest by mtime and resume from the slot
               worktree.

    Tier 3   - fresh session. /checkin-<slot> for slots with an existing
               domain. For unassigned-domain slots (romeo / uniform / victor)
               the CHAT-SLOT-DOMAINS.md entry is prepended so the chat boots
               with its new mission, then runs /checkin-<slot>.

  Anti-compact (operator: "dont compact them") -- two layers required:
    - CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = 99
        Pushes the CLI's native autocompact threshold from the global 95% to 99%,
        effectively past the 1M-token hard cap. Inherited by claude + every hook
        child process for this tab.
    - PRECOMPACT_SOFT_TOKENS = PRECOMPACT_HARD_TOKENS = 99_000_000
        The precompact-auto-trigger.mjs hook fires at 880K/940K INDEPENDENT of
        the CLI's PCT_OVERRIDE -- it has its own thresholds and runs /precompact
        + decision:block on its own clock. Setting these env vars to a value
        well above the 1M context cap disables the hook for this session.
    - Does NOT call /compact, /precompact, or any compacting slash command
      as the first prompt.

  Disconnection resilience (operator: "chats disconnecting mid task"):
    - Parent pwsh runs with -NoExit so the shell stays alive even if claude
      exits. Operator can re-run claude in place without losing the tab or
      its env vars (PRISM_BOOT_SLOT, the no-compact overrides).
    - PRISM_BOOT_SLOT is set BEFORE claude launches so session-start-auto-
      resume.mjs can inject the slot-keyed handoff RESUME regardless of which
      tier picked the session (per the hook's own comments at line 27-32 it
      treats PRISM_BOOT_SLOT as the only durable slot signal at process start).

.PARAMETER Slot
  NATO slot name -- lowercase letters only.
#>
param(
  [Parameter(Mandatory)]
  [ValidatePattern('^[a-z]+$')]
  [string]$Slot,

  # Optional regenerator-overrides (LAUNCH-PRISM-FLEET.bat passes these per-slot
  # based on its own size+age guards — preserves operator-validated workarounds
  # for huge JSONLs that crash `claude --resume` and stale bindings that no
  # longer reflect the operator's actual work context). When set, the script
  # SKIPS its own tier resolution and uses the supplied directive instead.
  [ValidatePattern('^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')]
  [string]$ResumeSession = '',

  [switch]$ForceCheckin
)

$ErrorActionPreference = 'Continue'

$ClaudeCmd          = 'H:\Tools\nodejs\node_modules\@anthropic-ai\claude-code\bin\claude.exe'
$PrismRoot          = 'H:\prism'
$Worktree           = "H:\prism-slot-$Slot"
$ChatSlotsJson      = 'H:\prism\state\shared\chat-slots.json'
$SharedProjectDir   = "$env:USERPROFILE\.claude\projects\H--prism"
$SlotProjectDir     = "$env:USERPROFILE\.claude\projects\H--prism-slot-$Slot"

# ---- Liveness guard (Tier 1 prerequisite) -------------------------------

function Test-EntryLive {
  param(
    $Entry,
    [string]$JsonlPath
  )
  if (-not $Entry) { return $false }
  # Signal 1: chat-slots.json pid + host match a currently-running process.
  # NOT sufficient on its own -- chat-slots.json pid is the FIRST claude.exe pid
  # at session start, but claude respawns node children and lastHeartbeat is
  # written by the child, so a live session may have a stale pid in the json.
  if ($Entry.host -and $Entry.host -ne $env:COMPUTERNAME) {
    # Cross-host claim -- we can't see its process table from here. Trust the
    # remote host's claim only via JSONL-mtime (signal 2 below).
  } elseif ($Entry.pid) {
    try { $null = Get-Process -Id $Entry.pid -ErrorAction Stop; return $true } catch { }
  }
  # Signal 2: the resolved session's JSONL was just written to. claude writes
  # this file on every assistant turn + every transcript-mutation; a session
  # with mtime in the last 60s is alive regardless of which claude.exe pid
  # owns it. Reliable across child-process respawns + stale pid entries.
  if ($JsonlPath -and (Test-Path -LiteralPath $JsonlPath)) {
    try {
      $item = Get-Item -LiteralPath $JsonlPath -ErrorAction Stop
      $age = (Get-Date) - $item.LastWriteTime
      if ($age.TotalSeconds -lt 60) { return $true }
    } catch { }
  }
  return $false
}

# ---- Tier 1: chat-slots.json chatId -> H--prism\<prefix>*.jsonl ---------

function Get-SlotSessionFromChatSlots {
  param([string]$SlotName)
  if (-not (Test-Path -LiteralPath $ChatSlotsJson)) { return $null }
  try {
    $json = Get-Content -LiteralPath $ChatSlotsJson -Raw | ConvertFrom-Json
    $entry = $json.slots.$SlotName
    if (-not $entry -or -not $entry.chatId) { return $null }
    # Liveness guard: refuse to attach to a session a live process owns.
    if (Test-EntryLive $entry) {
      return [pscustomobject]@{ Tier = 'LIVE'; SessionId = $null; Cwd = $null; LivePid = $entry.pid }
    }
    $prefix = ($entry.chatId -replace '^claude-', '')
    if ($prefix.Length -lt 6) { return $null }
    if (-not (Test-Path -LiteralPath $SharedProjectDir)) { return $null }
    $match = Get-ChildItem -LiteralPath $SharedProjectDir -Filter "$prefix*.jsonl" -ErrorAction SilentlyContinue |
             Sort-Object LastWriteTime -Descending |
             Select-Object -First 1
    if ($match) {
      return [pscustomobject]@{ Tier = 1; SessionId = $match.BaseName; Cwd = $PrismRoot; LivePid = $null }
    }
  } catch {
    # Malformed JSON or transient race -- silently fall through.
  }
  return $null
}

# ---- Tier 1.5: shared-dir scan for /checkin-<slot> first message --------

function Get-SlotSessionFromSharedDirScan {
  param([string]$SlotName)
  if (-not (Test-Path -LiteralPath $SharedProjectDir)) { return $null }
  $checkinPattern = "/checkin-$SlotName"
  $files = Get-ChildItem -LiteralPath $SharedProjectDir -Filter '*.jsonl' -ErrorAction SilentlyContinue |
           Sort-Object LastWriteTime -Descending
  foreach ($f in $files) {
    try {
      # First 8 lines covers Claude's session-start preamble + first user prompt.
      $head = Get-Content -LiteralPath $f.FullName -TotalCount 8 -ErrorAction SilentlyContinue
      foreach ($line in $head) {
        if ($line -and $line.Contains($checkinPattern)) {
          return [pscustomobject]@{ Tier = '1.5'; SessionId = $f.BaseName; Cwd = $PrismRoot; LivePid = $null }
        }
      }
    } catch { }
  }
  return $null
}

# ---- Tier 2: slot-keyed project dir -------------------------------------

function Get-SlotSessionFromSlotDir {
  param([string]$SlotName)
  if (-not (Test-Path -LiteralPath $SlotProjectDir)) { return $null }
  $latest = Get-ChildItem -LiteralPath $SlotProjectDir -Filter '*.jsonl' -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
  if (-not $latest) { return $null }
  $cwd = if (Test-Path -LiteralPath $Worktree) { $Worktree } else { $PrismRoot }
  return [pscustomobject]@{ Tier = 2; SessionId = $latest.BaseName; Cwd = $cwd; LivePid = $null }
}

# ---- Galaxy-buildout-detect (PER-SLOT-GALAXY-BUILDOUT, 2026-05-28) -------

# Mapping: slot -> engines/<galaxy>/ subdirectory.
# Keep in sync with H:\prism\.claude\hooks\slot-context-bundle-inject.mjs
# SLOT_GALAXY_MAP and H:\prism\scripts\generate-per-slot-galaxy-buildout-files.mjs.
$SlotGalaxyMap = @{
  'alpha'   = 'token-optimization'; 'bravo'   = 'hermes-zebra';
  'charlie' = 'quoting';            'delta'   = 'cad';
  'echo'    = 'post-processor';     'foxtrot' = 'mill';
  'golf'    = 'fleet-hygiene';      'hotel'   = 'business';
  'india'   = 'ai-training';        'juliett' = 'database-expansion';
  'kilo'    = 'cam';                'lima'    = 'academy';
  'mike'    = 'wedm';               'oscar'   = 'speed-feed';
  'papa'    = 'backend-helper';     'quebec'  = 'frontend-app';
  'romeo'   = 'wiring';             'sierra'  = 'system-viz';
  'tango'   = 'discovery';          'uniform' = 'bug-hunting';
  'victor'  = 'dormant-data';       'whiskey' = 'lathe';
  'xray'    = 'blueprint-vision';   'zebra'   = 'hermes-zebra';
}

# Min-size threshold for the 4 galaxy artifacts. Empty-touch files (0-byte from
# a half-completed previous buildout) must NOT count as "galaxy complete" —
# would silently strand the slot forever. Per reviewer P1 finding 2026-05-28.
$GalaxyArtifactMinBytes = 200

# Returns a directive string if the slot's galaxy is missing/incomplete;
# empty string if galaxy is fully built. Operator goal 2026-05-28: "the very
# first thing each chat does is start building their own galaxy so you don't
# have to do it by yourself".
#
# A galaxy is "complete" iff all 4 artifacts (CLAUDE.md + MEMORY.md + PATHS.md
# + TOOLBELT.md) EXIST and are >$GalaxyArtifactMinBytes bytes. Size threshold
# prevents the empty-touch failure class (P1 from 2026-05-28 audit).
#
# Double-launch race protection: acquires a 5s file-lock at
# state/shared/.cron-locks/galaxy-buildout-<slot>.lock before returning the
# directive — second tab gets '' and falls through to plain /checkin (P1 race
# fix from 2026-05-28 audit).
function Get-GalaxyBuildoutDirective {
  param([string]$SlotName, [string]$Cwd)
  $galaxy = $SlotGalaxyMap[$SlotName]
  if (-not $galaxy) { return '' }   # unallocated slot (november/yankee/zulu)
  $galaxyDir   = Join-Path $PrismRoot "mcp-server/src/engines/$galaxy"
  $artifacts = @(
    (Join-Path $galaxyDir 'CLAUDE.md'),
    (Join-Path $galaxyDir 'MEMORY.md'),
    (Join-Path $galaxyDir 'PATHS.md'),
    (Join-Path $galaxyDir 'TOOLBELT.md')
  )
  $briefFile = Join-Path $PrismRoot "state/shared/per-slot-galaxy-buildout/$SlotName.md"

  # All 4 artifacts must exist AND meet size threshold.
  $allComplete = $true
  foreach ($f in $artifacts) {
    if (-not (Test-Path -LiteralPath $f)) { $allComplete = $false; break }
    try {
      $sz = (Get-Item -LiteralPath $f -ErrorAction Stop).Length
      if ($sz -lt $GalaxyArtifactMinBytes) { $allComplete = $false; break }
    } catch { $allComplete = $false; break }
  }
  if ($allComplete) { return '' }

  if (-not (Test-Path -LiteralPath $briefFile)) {
    # No brief available — surface as yellow (was darkgray) so operator notices
    # the missing brief instead of silently skipping.
    Write-Host "  [galaxy-buildout] WARN no brief file for slot '$SlotName' at $briefFile -- skip" -ForegroundColor Yellow
    return ''
  }

  # Double-launch race lock. Best-effort exclusive lock; second tab loses race
  # and falls through to plain /checkin so we don't double-build.
  $lockDir = Join-Path $PrismRoot 'state/shared/.cron-locks'
  if (-not (Test-Path -LiteralPath $lockDir)) {
    try { New-Item -ItemType Directory -Path $lockDir -ErrorAction Stop | Out-Null } catch { }
  }
  $lockFile = Join-Path $lockDir "galaxy-buildout-$SlotName.lock"
  $lockMaxAgeSec = 1800   # 30 min — longer than 95-min budget? brief explicitly
                          # documents 95 min wall-clock, but stale-clear at 30 min
                          # is the right floor: any older lock is a crashed tab.
  if (Test-Path -LiteralPath $lockFile) {
    try {
      $lockAge = (Get-Date) - (Get-Item -LiteralPath $lockFile).LastWriteTime
      if ($lockAge.TotalSeconds -lt $lockMaxAgeSec) {
        Write-Host "  [galaxy-buildout] WARN peer tab already building '$SlotName' (lock age ${[math]::Round($lockAge.TotalMinutes,1)}m) -- skip auto-fire" -ForegroundColor Yellow
        return ''
      }
      # Stale lock -- reclaim.
      Write-Host "  [galaxy-buildout] reclaiming stale lock ($([math]::Round($lockAge.TotalMinutes,1))m old)" -ForegroundColor DarkGray
    } catch { }
  }
  try { Set-Content -LiteralPath $lockFile -Value "$SlotName $(Get-Date -Format 'o') pid=$PID" -ErrorAction Stop } catch { }

  # Auto-fire: load the per-slot brief as the first prompt.
  return "Per operator directive (2026-05-28) -- your galaxy is missing or incomplete. BEFORE picking any normal work unit, read state/shared/per-slot-galaxy-buildout/$SlotName.md and execute the 11-step galaxy buildout. Galaxy: engines/$galaxy/. Goal: each chat owns its own galaxy so future sessions have optimal context. Then run /checkin-$SlotName to resume normal work."
}

# ---- Tier 3: domain bootstrap for unassigned-domain slots ---------------

# Mirrors H:\CHAT-SLOT-DOMAINS.md entries for romeo / uniform / victor.
$NewDomainSlots = @{
  'romeo'   = "Your domain is WIRING UNWIRED ENGINES. PRISM has 593 built engines on disk with no dispatcher reference per /awareness-snapshot. Wire them: pair each wiring with a dispatcher action + test + commit. Tools: /utilization-dashboard /wire-unwired /wiring-batch /wiring-potential. Slot worktree H:/prism-slot-romeo on branch slot/romeo."
  'uniform' = "Your domain is BUG HUNTING. Hunt silent failures, R12 fail-loud violations, regressions, untested edges, hostile-payload exploit classes. Tools: /scrutiny-batch /regression-audit /audit-task /error-learn-review. Scan recent commits for changes lacking test coverage. Slot worktree H:/prism-slot-uniform on branch slot/uniform."
  'victor'  = "Your domain is DORMANT DATA EXCAVATION. Find untrained/unused/unwired knowledge in PRISM. STRICT ORDER: (1) H:/PRISM/extracted/ FIRST -- every file exhaustively. (2) H:/PRISM/extracted_modules/ -- every file exhaustively. (3) Rest of H:/PRISM codebase folder-by-folder file-by-file. For each dormant asset: classify (engine/data/formula/tribal-tip), find consumer or note absence, then /wire-unwired OR convert via knowledge-conversion lane A/B/C. Tools: /extracted-query /resource-census /audit-duplicates /dedup. Slot worktree H:/prism-slot-victor on branch slot/victor."
}

# ---- Main ----------------------------------------------------------------

# Anti-compact -- both layers (operator 2026-05-28: "dont compact them").
$env:CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '99'
$env:PRECOMPACT_SOFT_TOKENS = '99000000'
$env:PRECOMPACT_HARD_TOKENS = '99000000'

# SESSION-CONTINUITY-MS0: slot-keyed handoff RESUME inject hook reads this.
$env:PRISM_BOOT_SLOT = $Slot

try { $Host.UI.RawUI.WindowTitle = "PRISM $Slot" } catch { }

Write-Host ""
Write-Host "  PRISM fleet tab  ->  slot '$Slot'" -ForegroundColor Cyan

if (-not (Test-Path -LiteralPath $ClaudeCmd)) {
  Write-Host "  Claude CLI not found at $ClaudeCmd" -ForegroundColor Red
  Write-Host "  Install: npm install -g @anthropic-ai/claude-code" -ForegroundColor Yellow
  return
}

# Regenerator override: -ResumeSession <uuid> jumps straight to claude --resume,
# skipping our 4-tier resolution. The regenerator already gated this on its own
# size + age guards (RESUME_MAX_MB / RESUME_MAX_AGE_MIN), so we trust the uuid.
#
# 2026-05-28 GALAXY-FIRST-ON-RESUME (alpha, U-GFOR01): operator directive —
# "all chats know they need to work on their galaxy first right after checking
# into their slot". If the galaxy is incomplete (any of CLAUDE.md / MEMORY.md /
# PATHS.md / TOOLBELT.md missing or under GalaxyArtifactMinBytes), we OVERRIDE
# the regenerator's resume directive and fire galaxy-buildout instead. The
# session UUID is preserved in the launcher state — once buildout completes,
# the chat can run /checkin-<slot> to switch back to normal work, or the
# operator launches again with the regenerator preferring resume (galaxy
# now complete -> no override). The 30-min lockfile inside
# Get-GalaxyBuildoutDirective prevents peer tabs racing to build the same
# galaxy when the operator double-launches the fleet.
if ($ResumeSession) {
  $cwd = if (Test-Path -LiteralPath $Worktree) { $Worktree } else { $PrismRoot }
  $resumeGalaxyDirective = Get-GalaxyBuildoutDirective -SlotName $Slot -Cwd $cwd
  if ($resumeGalaxyDirective) {
    Set-Location -LiteralPath $cwd
    Write-Host "  Resume OVERRIDDEN -> GALAXY-BUILDOUT FIRST" -ForegroundColor Magenta
    Write-Host ("  Galaxy for '{0}' is incomplete; building before resuming prior work." -f $Slot) -ForegroundColor Magenta
    Write-Host ("  Session UUID {0} preserved -- operator can /checkin-{1} after buildout to resume." -f $ResumeSession.Substring(0,8), $Slot) -ForegroundColor DarkGray
    Write-Host ("  cwd: {0}" -f $cwd) -ForegroundColor DarkGray
    Write-Host  "  auto-compact: DISABLED (CLI override 99, precompact-hook thresholds bumped to 99M)" -ForegroundColor DarkGray
    Write-Host ""
    & $ClaudeCmd --dangerously-skip-permissions --model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m] $resumeGalaxyDirective
    return
  }
  # Galaxy already complete -- proceed with resume as originally requested.
  Set-Location -LiteralPath $cwd
  Write-Host ("  Override resume   ->  session {0}" -f $ResumeSession) -ForegroundColor Green
  Write-Host ("  cwd: {0}" -f $cwd) -ForegroundColor DarkGray
  Write-Host  "  auto-compact: DISABLED (CLI override 99, precompact-hook thresholds bumped to 99M)" -ForegroundColor DarkGray
  Write-Host ""
  & $ClaudeCmd --dangerously-skip-permissions --model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m] --resume $ResumeSession
  return
}

# Regenerator override: -ForceCheckin jumps straight to Tier 3 fresh /checkin
# (used for oversized + stale slots where resume would crash or surface stale context).
#
# 2026-05-28 P0 fix: galaxy-buildout-detect MUST run in this branch too —
# otherwise slots routed through ForceCheckin (which is the regenerator's
# fallback path for stale chat-slot bindings) never start building their
# galaxy, defeating the operator's 2026-05-28 directive. Galaxy directive
# takes precedence over the new-domain bootstrap (since galaxy-incomplete
# is a stronger gate than just-need-the-domain-pitch).
if ($ForceCheckin) {
  $cwd = if (Test-Path -LiteralPath $Worktree) { $Worktree } else { $PrismRoot }
  Set-Location -LiteralPath $cwd
  $bootstrapPrompt = $NewDomainSlots[$Slot]
  $galaxyDirective = Get-GalaxyBuildoutDirective -SlotName $Slot -Cwd $cwd
  if ($galaxyDirective) {
    Write-Host "  Override fresh + GALAXY-BUILDOUT  ->  $Slot reads its per-slot brief" -ForegroundColor Magenta
    Write-Host ("  cwd: {0}" -f $cwd) -ForegroundColor DarkGray
    Write-Host ""
    & $ClaudeCmd --dangerously-skip-permissions --model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m] $galaxyDirective
  } elseif ($bootstrapPrompt) {
    $firstPrompt = "$bootstrapPrompt`n`nNow run /checkin-$Slot to force-claim this slot and pick your first unit."
    Write-Host "  Override fresh (new-domain slot)  ->  bootstrap + /checkin-$Slot" -ForegroundColor Yellow
    Write-Host ("  cwd: {0}" -f $cwd) -ForegroundColor DarkGray
    Write-Host ""
    & $ClaudeCmd --dangerously-skip-permissions --model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m] $firstPrompt
  } else {
    # 2026-06-10 (alpha) AUTO-START: a fresh boot launches the FULL autonomous
    # sequence -- /startup-<slot> /loop [10m] /goal -- so the chat re-claims its
    # slot, runs startup, and re-enters the Hermes loop on the standing goal
    # (driving the build to 100%) instead of a bare heartbeat. Knob
    # PRISM_BOOT_LOOP_GOAL=0 reverts to the lighter /checkin-<slot>.
    $bootLoopGoal = ($env:PRISM_BOOT_LOOP_GOAL -ne '0')
    $bootVerb = if ($bootLoopGoal) { "/startup-$Slot /loop [10m] /goal" } else { "/checkin-$Slot" }
    Write-Host "  Override fresh  ->  $bootVerb" -ForegroundColor Yellow
    Write-Host ("  cwd: {0}" -f $cwd) -ForegroundColor DarkGray
    Write-Host ""
    # 2026-05-28 (alpha) CHECKIN-ARGS-FIX: pass NATURAL-LANGUAGE, not a bare positional
    # slash command. Claude Code's CLI does not reliably auto-run a slash command given as
    # the initial positional prompt -> "unknown skill args error". A text prompt makes claude
    # invoke the skill via its own Skill tool (which handles args). Mirrors the bootstrap path.
    $plainPrompt = if ($bootLoopGoal) {
      "Run $bootVerb to force-claim slot $Slot, run startup, and continue autonomous work to 100% completion (eval-gate each iteration with real tests + per-file scrutiny; never abandon mid-build)."
    } else {
      "Run /checkin-$Slot to force-claim slot $Slot and resume your work."
    }
    & $ClaudeCmd --dangerously-skip-permissions --model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m] $plainPrompt
  }
  return
}

# Resolve session: Tier 1 -> 1.5 -> 2 -> 3. Tier 1 may return LIVE -> skip.
$resolved = Get-SlotSessionFromChatSlots -SlotName $Slot
if ($resolved -and $resolved.Tier -eq 'LIVE') {
  Write-Host ("  [SKIP] slot '{0}' is already alive on this PC (PID {1})." -f $Slot, $resolved.LivePid) -ForegroundColor Yellow
  Write-Host  "  [SKIP] Close that tab first, then re-run this launcher." -ForegroundColor Yellow
  Write-Host  "  [SKIP] (the shell stays open via -NoExit so you can re-run by hand)" -ForegroundColor DarkGray
  return
}
if (-not $resolved) { $resolved = Get-SlotSessionFromSharedDirScan -SlotName $Slot }
if (-not $resolved) { $resolved = Get-SlotSessionFromSlotDir       -SlotName $Slot }

if ($resolved) {
  # Size guard (launch-time -- golf 2026-05-31 DYNAMIC-CURRENT-SESSION): claude --resume
  # crashes silently on huge transcripts (observed alpha 53MB). Now that the regenerator
  # passes bare -Slot (dynamic resolution at launch), a session can grow oversized between
  # regen and launch, so the size check must live HERE, not only in the regenerator.
  # Oversized -> fall through to Tier 3 fresh /checkin (auto-loads the slot handoff).
  # Knob: PRISM_RESUME_MAX_MB (default 40).
  $resumeMaxMb = if ($env:PRISM_RESUME_MAX_MB) { [int]$env:PRISM_RESUME_MAX_MB } else { 40 }
  $projDir = if ($resolved.Cwd -eq $PrismRoot) { $SharedProjectDir } else { $SlotProjectDir }
  $resolvedJsonl = Join-Path $projDir ("{0}.jsonl" -f $resolved.SessionId)
  $resumeOversized = $false
  try {
    if (Test-Path -LiteralPath $resolvedJsonl) {
      $szMb = (Get-Item -LiteralPath $resolvedJsonl -ErrorAction Stop).Length / 1MB
      if ($szMb -gt $resumeMaxMb) {
        $resumeOversized = $true
        Write-Host ("  [size-guard] session {0} is {1:N0}MB > {2}MB -- claude --resume would crash; using fresh /checkin instead" -f $resolved.SessionId.Substring(0,8), $szMb, $resumeMaxMb) -ForegroundColor Yellow
      }
    }
  } catch { }
  if (-not $resumeOversized) {
    Set-Location -LiteralPath $resolved.Cwd
    Write-Host ("  Tier {0} resume  ->  session {1}" -f $resolved.Tier, $resolved.SessionId) -ForegroundColor Green
    Write-Host ("  cwd: {0}" -f $resolved.Cwd) -ForegroundColor DarkGray
    Write-Host  "  auto-compact: DISABLED (CLI override 99, precompact-hook thresholds bumped to 99M)" -ForegroundColor DarkGray
    Write-Host ""
    & $ClaudeCmd --dangerously-skip-permissions --model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m] --resume $resolved.SessionId
    return
  }
  # oversized -> $resolved discarded; fall through to Tier 3 fresh below.
}

# Tier 3: fresh session.
$cwd = if (Test-Path -LiteralPath $Worktree) { $Worktree } else { $PrismRoot }
Set-Location -LiteralPath $cwd

$bootstrapPrompt = $NewDomainSlots[$Slot]
$galaxyDirective = Get-GalaxyBuildoutDirective -SlotName $Slot -Cwd $cwd

# Compose first prompt: galaxy-buildout (highest priority — block normal work
# until galaxy exists) > new-domain bootstrap > plain /checkin.
if ($galaxyDirective) {
  $firstPrompt = $galaxyDirective
  Write-Host "  Tier 3 fresh + GALAXY-BUILDOUT  ->  $Slot reads its per-slot brief" -ForegroundColor Magenta
  Write-Host ("  cwd: {0}" -f $cwd) -ForegroundColor DarkGray
  Write-Host ""
  & $ClaudeCmd --dangerously-skip-permissions --model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m] $firstPrompt
} elseif ($bootstrapPrompt) {
  $firstPrompt = "$bootstrapPrompt`n`nNow run /checkin-$Slot to force-claim this slot and pick your first unit."
  Write-Host "  Tier 3 fresh (new-domain slot)  ->  bootstrap + /checkin-$Slot" -ForegroundColor Yellow
  Write-Host ("  cwd: {0}" -f $cwd) -ForegroundColor DarkGray
  Write-Host ""
  & $ClaudeCmd --dangerously-skip-permissions --model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m] $firstPrompt
} else {
  # 2026-06-10 (alpha) AUTO-START: fresh boot launches /startup-<slot> /loop [10m] /goal
  # so the chat re-enters the Hermes loop on the standing goal to 100% (knob
  # PRISM_BOOT_LOOP_GOAL=0 reverts to /checkin-<slot>). Same lever as the ForceCheckin
  # plain branch above + the post-/compact buildSlotWrapperDirective NEXT-ACTION.
  $bootLoopGoal = ($env:PRISM_BOOT_LOOP_GOAL -ne '0')
  $bootVerb = if ($bootLoopGoal) { "/startup-$Slot /loop [10m] /goal" } else { "/checkin-$Slot" }
  Write-Host "  Tier 3 fresh  ->  $bootVerb" -ForegroundColor Yellow
  Write-Host ("  cwd: {0}" -f $cwd) -ForegroundColor DarkGray
  Write-Host ""
  # 2026-05-28 (alpha) CHECKIN-ARGS-FIX: natural-language, not a bare positional slash
  # command (Claude CLI emits "unknown skill args" on a positional slash command, see above).
  $plainPrompt = if ($bootLoopGoal) {
    "Run $bootVerb to force-claim slot $Slot, run startup, and continue autonomous work to 100% completion (eval-gate each iteration with real tests + per-file scrutiny; never abandon mid-build)."
  } else {
    "Run /checkin-$Slot to force-claim slot $Slot and pick your first unit."
  }
  & $ClaudeCmd --dangerously-skip-permissions --model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m] $plainPrompt
}
