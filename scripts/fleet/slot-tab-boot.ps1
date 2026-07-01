<#
.SYNOPSIS
  PRISM fleet per-slot tab boot -- resumes the most recent session for this slot
  WITHOUT compacting (operator directive 2026-05-28). Scan-first recency
  resolution (operator 2026-06-17) with a 4-tier fallback.

.DESCRIPTION
  Spawned by Launch-PRISM-Fleet.ps1 as the command of every Windows Terminal tab:
      pwsh -NoExit -File slot-tab-boot.ps1 -Slot <nato>

  Resume resolution order (operator: "find the most up to date session for each
  chat slot please. dont compact them so i can see what they were working on.
  make it so it always launchs the most up to date session per chat slot name"):

    Tier 0   - SCAN-FIRST recency (operator 2026-06-17: "scan first to ensure it
               loads the most recent chats"). Get-MostRecentSlotSession gathers
               candidate sessions from ALL sources (shared-dir /checkin-<slot>,
               the chat-slots binding, the slot-keyed dir), then picks the
               NEWEST-mtime one whose identity is genuinely THIS slot -- so a
               STALE chat-slots binding can no longer shadow a newer session (the
               "checked into charlie" class). The tiers below are the defensive
               fallback used only when the scan finds no candidate.

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
      return [pscustomobject]@{ Tier = 1; SessionId = $match.BaseName; Cwd = $PrismRoot; ProjDir = $SharedProjectDir; LivePid = $null }
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
          return [pscustomobject]@{ Tier = '1.5'; SessionId = $f.BaseName; Cwd = $PrismRoot; ProjDir = $SharedProjectDir; LivePid = $null }
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
  return [pscustomobject]@{ Tier = 2; SessionId = $latest.BaseName; Cwd = $cwd; ProjDir = $SlotProjectDir; LivePid = $null }
}

# ---- Scan-first recency resolver (operator 2026-06-17) ------------------
# "find out why you checked into charlie ... the fleet launcher is not launching
#  the most recent, active chats for each chat slot, we need it to scan first to
#  ensure it loads the most recent chats."
#
# Root cause it replaces: the legacy Tier 1 -> 1.5 -> 2 cascade prioritized the
# chat-slots.json binding (Tier 1) OVER recency. A STALE binding therefore
# shadowed a newer session, and Tier 1.5 attributed a session to a slot by its
# FIRST /checkin message only. Net effect: a slot could boot an OLD transcript,
# or a transcript whose CURRENT slot differs from the one being booted (the
# 'checked into charlie' class -- a transient/foreign binding wins).
#
# This resolver gathers EVERY candidate session for the slot across all sources
# and picks the NEWEST-mtime one whose identity is genuinely THIS slot:
#   Source A  shared dir (H--prism) sessions whose head carries /checkin-<slot>
#   Source B  the chat-slots.json binding's session (resumed / re-checkin cover)
#   Source C  slot-keyed dir (H--prism-slot-<slot>) -- inherently this slot's
# Recency wins ACROSS sources (a stale binding can no longer shadow a newer
# session). The liveness guard (Test-EntryLive) still refuses to double-attach
# to a session a live process owns. Bounded for cost: only files modified within
# $scanMaxAgeDays count, and per-dir head scans cap at $scanHeadCap newest files.
# Knobs: PRISM_FLEET_SCAN_MAX_AGE_DAYS (default 30), PRISM_FLEET_SCAN_HEAD_CAP (50).
function Get-MostRecentSlotSession {
  param([string]$SlotName)

  # Safe-parse knobs: a non-numeric env value must NOT throw (it would abort the
  # resolver). TryParse keeps the default on bad input; clamp to a sane floor.
  $scanMaxAgeDays = 30
  if ($env:PRISM_FLEET_SCAN_MAX_AGE_DAYS) { $tmpAge = 0; if ([int]::TryParse($env:PRISM_FLEET_SCAN_MAX_AGE_DAYS, [ref]$tmpAge)) { $scanMaxAgeDays = $tmpAge } }
  $scanHeadCap = 50
  if ($env:PRISM_FLEET_SCAN_HEAD_CAP) { $tmpCap = 0; if ([int]::TryParse($env:PRISM_FLEET_SCAN_HEAD_CAP, [ref]$tmpCap)) { $scanHeadCap = $tmpCap } }
  if ($scanHeadCap -lt 1) { $scanHeadCap = 50 }
  if ($scanMaxAgeDays -lt 1) { $scanMaxAgeDays = 30 }
  $cutoff = (Get-Date).AddDays(-1 * [Math]::Abs($scanMaxAgeDays))
  $checkinPattern = "/checkin-$SlotName"

  # chat-slots entry -- feeds Source B and the liveness guard.
  $entry = $null
  if (Test-Path -LiteralPath $ChatSlotsJson) {
    try { $entry = (Get-Content -LiteralPath $ChatSlotsJson -Raw | ConvertFrom-Json).slots.$SlotName } catch { }
  }

  $candidates = New-Object System.Collections.Generic.List[object]
  $seen = @{}

  # Source A: shared-dir sessions whose head carries /checkin-<slot>.
  if (Test-Path -LiteralPath $SharedProjectDir) {
    $sharedFiles = Get-ChildItem -LiteralPath $SharedProjectDir -Filter '*.jsonl' -ErrorAction SilentlyContinue |
                   Where-Object { $_.LastWriteTime -ge $cutoff } |
                   Sort-Object LastWriteTime -Descending |
                   Select-Object -First $scanHeadCap
    foreach ($f in $sharedFiles) {
      try {
        $head = Get-Content -LiteralPath $f.FullName -TotalCount 8 -ErrorAction SilentlyContinue
        foreach ($line in $head) {
          if ($line -and $line.Contains($checkinPattern)) {
            if (-not $seen.ContainsKey($f.BaseName)) {
              $seen[$f.BaseName] = $true
              $candidates.Add([pscustomobject]@{ SessionId = $f.BaseName; Cwd = $PrismRoot; Mtime = $f.LastWriteTime; Source = 'shared'; Jsonl = $f.FullName })
            }
            break
          }
        }
      } catch { }
    }
  }

  # Source B: the chat-slots.json binding's session (covers a resumed/re-checkin
  # session whose head no longer matches, or one not caught by the head cap).
  if ($entry -and $entry.chatId) {
    $prefix = ($entry.chatId -replace '^claude-', '')
    if ($prefix.Length -ge 6 -and (Test-Path -LiteralPath $SharedProjectDir)) {
      $m = Get-ChildItem -LiteralPath $SharedProjectDir -Filter "$prefix*.jsonl" -ErrorAction SilentlyContinue |
           Sort-Object LastWriteTime -Descending | Select-Object -First 1
      if ($m -and -not $seen.ContainsKey($m.BaseName)) {
        $seen[$m.BaseName] = $true
        $candidates.Add([pscustomobject]@{ SessionId = $m.BaseName; Cwd = $PrismRoot; Mtime = $m.LastWriteTime; Source = 'chat-slots'; Jsonl = $m.FullName })
      }
    }
  }

  # Source C: slot-keyed dir -- every session there is inherently this slot's.
  if (Test-Path -LiteralPath $SlotProjectDir) {
    $cwdC = if (Test-Path -LiteralPath $Worktree) { $Worktree } else { $PrismRoot }
    $slotFiles = Get-ChildItem -LiteralPath $SlotProjectDir -Filter '*.jsonl' -ErrorAction SilentlyContinue |
                 Where-Object { $_.LastWriteTime -ge $cutoff } |
                 Sort-Object LastWriteTime -Descending |
                 Select-Object -First $scanHeadCap
    foreach ($f in $slotFiles) {
      if (-not $seen.ContainsKey($f.BaseName)) {
        $seen[$f.BaseName] = $true
        $candidates.Add([pscustomobject]@{ SessionId = $f.BaseName; Cwd = $cwdC; Mtime = $f.LastWriteTime; Source = 'slot-dir'; Jsonl = $f.FullName })
      }
    }
  }

  if ($candidates.Count -eq 0) { return $null }

  # RECENCY-FIRST: the newest-mtime candidate across ALL sources is the most
  # recent active chat for this slot (the operator's core requirement).
  $best = $candidates | Sort-Object Mtime -Descending | Select-Object -First 1

  # Liveness guard: do not double-attach to a session a live process owns
  # (signal 1: chat-slots pid alive on this host; signal 2: best JSONL mtime < 60s).
  if (Test-EntryLive $entry $best.Jsonl) {
    return [pscustomobject]@{ Tier = 'LIVE'; SessionId = $null; Cwd = $null; LivePid = $entry.pid }
  }

  # Explicit ProjDir so the downstream size-guard finds the JSONL in the RIGHT
  # project dir regardless of Cwd (a slot-dir session whose worktree is absent
  # still lives in $SlotProjectDir even though its Cwd falls back to $PrismRoot).
  $bestProjDir = if ($best.Source -eq 'slot-dir') { $SlotProjectDir } else { $SharedProjectDir }
  return [pscustomobject]@{ Tier = "scan:$($best.Source)"; SessionId = $best.SessionId; Cwd = $best.Cwd; ProjDir = $bestProjDir; LivePid = $null }
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
        Write-Host "  [galaxy-buildout] WARN peer tab already building '$SlotName' (lock age $([math]::Round($lockAge.TotalMinutes,1))m) -- skip auto-fire" -ForegroundColor Yellow
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

# ---- Launch outcome log (FLEET-LAUNCHER-IMPROVE-MS0/U-FLI01, 2026-06-10 tango) ----
# Each tab appends ONE decision line so scripts/fleet-launch-summary.mjs can show
# the operator an aggregate "which slots resumed / went fresh / were skipped" view
# at the end of a launch. ts is epoch-ms UTC (comparable to the JS Date.now() marker
# the thin launcher writes). FULLY FAIL-SOFT: a logging failure must NEVER affect
# the launch -- every path is wrapped and returns silently.
function Write-LaunchLog {
  param([string]$SlotName, [string]$Action, [string]$SessionId = '')
  try {
    $logDir = Join-Path $PrismRoot 'state\shared'
    if (-not (Test-Path -LiteralPath $logDir)) { return }
    $logFile = Join-Path $logDir '.fleet-launch-log.jsonl'
    $obj = [ordered]@{
      ts        = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
      slot      = $SlotName
      action    = $Action
      sessionId = $SessionId
      host      = $env:COMPUTERNAME
    }
    $line = $obj | ConvertTo-Json -Compress
    # 24 tabs may contend on the append -- brief retry, ConvertTo-Json escapes values.
    for ($i = 0; $i -lt 5; $i++) {
      try { Add-Content -LiteralPath $logFile -Value $line -Encoding utf8 -ErrorAction Stop; break }
      catch { Start-Sleep -Milliseconds 40 }
    }
  } catch { }
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
    Write-LaunchLog -SlotName $Slot -Action 'galaxy-buildout' -SessionId $ResumeSession
    & $ClaudeCmd --dangerously-skip-permissions --model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m] $resumeGalaxyDirective
    return
  }
  # Galaxy already complete -- proceed with resume as originally requested.
  Set-Location -LiteralPath $cwd
  Write-Host ("  Override resume   ->  session {0}" -f $ResumeSession) -ForegroundColor Green
  Write-Host ("  cwd: {0}" -f $cwd) -ForegroundColor DarkGray
  Write-Host  "  auto-compact: DISABLED (CLI override 99, precompact-hook thresholds bumped to 99M)" -ForegroundColor DarkGray
  Write-Host ""
  Write-LaunchLog -SlotName $Slot -Action 'override-resume' -SessionId $ResumeSession
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
    Write-LaunchLog -SlotName $Slot -Action 'galaxy-buildout'
    & $ClaudeCmd --dangerously-skip-permissions --model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m] $galaxyDirective
  } elseif ($bootstrapPrompt) {
    $firstPrompt = "$bootstrapPrompt`n`nNow run /checkin-$Slot to force-claim this slot and pick your first unit."
    Write-Host "  Override fresh (new-domain slot)  ->  bootstrap + /checkin-$Slot" -ForegroundColor Yellow
    Write-Host ("  cwd: {0}" -f $cwd) -ForegroundColor DarkGray
    Write-Host ""
    Write-LaunchLog -SlotName $Slot -Action 'fresh-new-domain'
    & $ClaudeCmd --dangerously-skip-permissions --model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m] $firstPrompt
  } else {
    Write-Host "  Override fresh  ->  /checkin-$Slot" -ForegroundColor Yellow
    Write-Host ("  cwd: {0}" -f $cwd) -ForegroundColor DarkGray
    Write-Host ""
    # 2026-05-28 (alpha) CHECKIN-ARGS-FIX: pass NATURAL-LANGUAGE, not a bare "/checkin-$Slot"
    # positional. Claude Code's CLI does not reliably auto-run a slash command given as the
    # initial positional prompt -> "unknown skill args error". A text prompt makes claude
    # invoke the skill via its own Skill tool (which handles args). Mirrors the bootstrap path.
    Write-LaunchLog -SlotName $Slot -Action 'override-fresh'
    & $ClaudeCmd --dangerously-skip-permissions --model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m] "Run /checkin-$Slot to force-claim slot $Slot and resume your work."
  }
  return
}

# Resolve session: SCAN-FIRST recency (operator 2026-06-17) -> legacy tiers -> fresh.
# Get-MostRecentSlotSession picks the newest-mtime session whose identity is genuinely
# THIS slot across all sources, so a stale chat-slots binding can no longer shadow a
# newer session ("load the most recent chats" + the "checked into charlie" fix). The
# legacy Tier 1/1.5/2 calls remain as a defensive fallback if the scan finds nothing.
# Any resolver may return Tier 'LIVE' (a live process owns the session) -> skip below.
$resolved = Get-MostRecentSlotSession -SlotName $Slot
if (-not $resolved) { $resolved = Get-SlotSessionFromChatSlots -SlotName $Slot }
if ($resolved -and $resolved.Tier -eq 'LIVE') {
  # Smarter liveness-skip (FLEET-LAUNCHER-IMPROVE-MS0/U-FLI02): never relaunch a
  # slot that's already open (avoids the duplicate-attach race on the transcript),
  # but don't leave a confusing dead tab. Default: clear message + a cancellable
  # 15s countdown, then auto-close THIS redundant tab. Press any key to keep it
  # open for manual action. Knob PRISM_LAUNCH_SKIP_NO_AUTOCLOSE=1 keeps the old
  # keep-open behavior. Fully fail-soft: any console error -> leave the shell open.
  Write-LaunchLog -SlotName $Slot -Action 'skip-live' -SessionId ([string]$resolved.LivePid)
  Write-Host ("  [SKIP] slot '{0}' is already open in another tab (PID {1})." -f $Slot, $resolved.LivePid) -ForegroundColor Yellow
  Write-Host  "  [SKIP] Not relaunching -- avoids a duplicate-attach race on the session transcript." -ForegroundColor Yellow
  $forceCmd = ("pwsh -NoExit -File '{0}' -Slot {1} -ForceCheckin" -f $PSCommandPath, $Slot)
  if ($env:PRISM_LAUNCH_SKIP_NO_AUTOCLOSE -eq '1') {
    Write-Host  "  [SKIP] Shell left open (PRISM_LAUNCH_SKIP_NO_AUTOCLOSE=1). Force a fresh relaunch with:" -ForegroundColor DarkGray
    Write-Host ("           {0}" -f $forceCmd) -ForegroundColor DarkGray
    return
  }
  Write-Host  "  [SKIP] Closing this redundant tab in 15s -- press any key to keep it open." -ForegroundColor DarkGray
  Write-Host ("           (to force a fresh relaunch instead: {0})" -f $forceCmd) -ForegroundColor DarkGray
  $keep = $false
  try {
    $deadline = (Get-Date).AddSeconds(15)
    while ((Get-Date) -lt $deadline) {
      if ([Console]::KeyAvailable) { $null = [Console]::ReadKey($true); $keep = $true; break }
      Start-Sleep -Milliseconds 200
    }
  } catch { $keep = $true }  # non-interactive / no console -> safe default: keep open
  if ($keep) {
    Write-Host  "  [SKIP] Kept open." -ForegroundColor DarkGray
    return
  }
  [Environment]::Exit(0)
}
if (-not $resolved) { $resolved = Get-SlotSessionFromSharedDirScan -SlotName $Slot }
if (-not $resolved) { $resolved = Get-SlotSessionFromSlotDir       -SlotName $Slot }

if ($resolved) {
  # Size guard (launch-time -- golf 2026-05-31 DYNAMIC-CURRENT-SESSION): claude --resume
  # crashes silently on huge transcripts (observed alpha 53MB on the PRE-UPGRADE 32GB box).
  # Now that the regenerator passes bare -Slot (dynamic resolution at launch), a session can
  # grow oversized between regen and launch, so the size check must live HERE, not only in
  # the regenerator. Oversized -> fall through to Tier 3 fresh /checkin (auto-loads handoff).
  # Knob: PRISM_RESUME_MAX_MB.
  # 2026-06-10 (slot tango, OPEN-TODAYS-SESSIONS): default raised 40 -> 256, matching the
  # regenerator's RESUME_MAX_MB. This host is 128GB RAM + Blackwell (operator "build for
  # Blackwell / raise low defaults"); the 40MB cap was kicking 6 of 13 slots with TODAY's
  # work (alpha 158MB ... echo 41MB) to a fresh /checkin instead of resuming today's session,
  # defeating the operator's "open the most recent sessions from today" directive. Keep the
  # two gates in lockstep so the .bat's bare-vs-ForceCheckin decision matches the launch guard.
  $resumeMaxMb = if ($env:PRISM_RESUME_MAX_MB) { [int]$env:PRISM_RESUME_MAX_MB } else { 256 }
  # Prefer the resolver's explicit ProjDir (set by every tier); fall back to the
  # Cwd heuristic only for a resolver that predates the ProjDir field.
  $projDir = if ($resolved.PSObject.Properties.Name -contains 'ProjDir' -and $resolved.ProjDir) { $resolved.ProjDir } elseif ($resolved.Cwd -eq $PrismRoot) { $SharedProjectDir } else { $SlotProjectDir }
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
    Write-LaunchLog -SlotName $Slot -Action ("resume-tier{0}" -f $resolved.Tier) -SessionId $resolved.SessionId
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
  Write-LaunchLog -SlotName $Slot -Action 'galaxy-buildout'
  & $ClaudeCmd --dangerously-skip-permissions --model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m] $firstPrompt
} elseif ($bootstrapPrompt) {
  $firstPrompt = "$bootstrapPrompt`n`nNow run /checkin-$Slot to force-claim this slot and pick your first unit."
  Write-Host "  Tier 3 fresh (new-domain slot)  ->  bootstrap + /checkin-$Slot" -ForegroundColor Yellow
  Write-Host ("  cwd: {0}" -f $cwd) -ForegroundColor DarkGray
  Write-Host ""
  Write-LaunchLog -SlotName $Slot -Action 'fresh-new-domain'
  & $ClaudeCmd --dangerously-skip-permissions --model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m] $firstPrompt
} else {
  Write-Host "  Tier 3 fresh  ->  /checkin-$Slot" -ForegroundColor Yellow
  Write-Host ("  cwd: {0}" -f $cwd) -ForegroundColor DarkGray
  Write-Host ""
  # 2026-05-28 (alpha) CHECKIN-ARGS-FIX: natural-language, not a bare "/checkin-$Slot"
  # positional (Claude CLI emits "unknown skill args" on a positional slash command — see above).
  # 'oversized-fresh' when this fresh /checkin is the size-guard fallback (today's session was
  # too big to resume); plain 'fresh-checkin' when no resumable session existed at all.
  Write-LaunchLog -SlotName $Slot -Action $(if ($resumeOversized) { 'oversized-fresh' } else { 'fresh-checkin' })
  & $ClaudeCmd --dangerously-skip-permissions --model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m] "Run /checkin-$Slot to force-claim slot $Slot and pick your first unit."
}
