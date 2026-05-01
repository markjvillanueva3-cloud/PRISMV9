# Fix remaining integrity issues
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

# 1. R11 naming: PHASE_R11_PRODUCT.md exists, create a PHASE_R11_PACKAGING.md alias
#    Actually, the file is R11_PRODUCT which is the canonical name. Update MASTER_INDEX instead.
#    Check what MASTER_INDEX references:
$mi = Get-Content (Join-Path $dir "PRISM_MASTER_INDEX.md") -Raw
if ($mi -match "R11_PACKAGING") {
    Write-Output "MASTER_INDEX references R11_PACKAGING - need to check actual file name"
}
if ($mi -match "R11_PRODUCT") {
    Write-Output "MASTER_INDEX references R11_PRODUCT - matches actual file"
}
Write-Output "Actual R11 file: PHASE_R11_PRODUCT.md"

# Check R11 has required sections
$r11path = Join-Path $dir "PHASE_R11_PRODUCT.md"
$r11 = Get-Content $r11path
$has_depends = ($r11 | Select-String "DEPENDS ON" -SimpleMatch | Measure-Object).Count
$has_quick = ($r11 | Select-String "QUICK REFERENCE" -SimpleMatch | Measure-Object).Count
$has_bridge = ($r11 | Select-String "CONTEXT BRIDGE" -SimpleMatch | Measure-Object).Count
Write-Output "R11 status: DEPENDS_ON=$has_depends QUICK_REF=$has_quick CONTEXT_BRIDGE=$has_bridge lines=$($r11.Count)"

# Add DEPENDS ON if missing
if ($has_depends -eq 0) {
    $r11 = [System.Collections.ArrayList]@($r11)
    # Insert after first line
    $r11.Insert(1, "# DEPENDS ON: R8 complete (experience layer), R9 complete (integrations), R10 complete (advanced intelligence)")
    [System.IO.File]::WriteAllLines($r11path, $r11.ToArray())
    Write-Output "R11: DEPENDS ON header added"
}

# Add QUICK REFERENCE if missing
if ($has_quick -eq 0) {
    $r11text = [System.IO.File]::ReadAllText($r11path)
    $qr = @"

---

## QUICK REFERENCE (standalone after compaction -- no other doc needed)
``````
BUILD:      npm run build (NEVER standalone tsc -- OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit -> git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails -> try different approach. 6 total -> skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R11 = Code primary. Product Manager role.
``````

"@
    # Insert after the header block (find first ---)
    $r11text = $r11text -replace "(^# PHASE R11.*?\n)(---)", "`$1$qr`$2"
    if ($r11text -notmatch "QUICK REFERENCE") {
        # Fallback: prepend after first line
        $lines = [System.Collections.ArrayList]@(Get-Content $r11path)
        $insertAt = 2
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match "^---") { $insertAt = $i; break }
        }
        $qrLines = $qr -split "`n"
        for ($j = 0; $j -lt $qrLines.Count; $j++) {
            $lines.Insert($insertAt + $j, $qrLines[$j])
        }
        [System.IO.File]::WriteAllLines($r11path, $lines.ToArray())
    } else {
        [System.IO.File]::WriteAllText($r11path, $r11text)
    }
    Write-Output "R11: QUICK REFERENCE added"
}

# Add CONTEXT BRIDGE if missing
if ($has_bridge -eq 0) {
    $r11text = [System.IO.File]::ReadAllText($r11path)
    $cb = @"

## CONTEXT BRIDGE

WHAT CAME BEFORE: R8 (Experience) made intelligence accessible, R9 (Integration) connected to
machines and CAM systems, R10 (Revolution) added advanced AI capabilities.

WHAT THIS PHASE DOES: Packages PRISM into deliverable products -- Speed & Feed Calculator,
Post Processor Generator, Shop Manager, Auto CNC Programmer. User-facing applications with
installation, documentation, and support infrastructure.

WHAT COMES AFTER: Production deployment, user onboarding, feedback cycles, continuous improvement.

"@
    # Insert before first MS heading
    $r11text = $r11text -replace "(## MS0)", "$cb`$1"
    [System.IO.File]::WriteAllText($r11path, $r11text)
    Write-Output "R11: CONTEXT BRIDGE added"
}

# 2. Create SKILL_ATOMIZATION_SPEC.md stub
$specPath = Join-Path $dir "SKILL_ATOMIZATION_SPEC.md"
if (-not (Test-Path $specPath)) {
    $spec = @"
# SKILL ATOMIZATION SPECIFICATION — v14.5
# Status: Planned | Phase: DA-MS9, DA-MS10 | Role: Context Engineer

---

## OVERVIEW

Decompose multi-function skills into single-function skills for token efficiency,
and create new skills derived from MIT/college course content.

## SCOPE

### Existing Skill Decomposition
- 34 existing skills requiring decomposition (15 priority skills over 20KB, 19 at 10-20KB)
- Target: 300-500 single-function skills from decomposition
- Each atomic skill: <2KB, single purpose, auto-loadable by trigger

### Course-Derived Skills
- Source: 206 MIT OpenCourseWare courses + ~25 CNC/CAM resources
- Location: C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\
- Target: ~3,880 skills from course material extraction
- Tier structure:
  T1 (DA parallel): Core manufacturing + materials science (50 courses)
  T2 (R1 parallel): Algorithms + optimization (40 courses)
  T3 (R3 parallel): Advanced manufacturing + controls (50 courses)
  T4 (R7 parallel): Physics + math foundations (66 courses)

## SKILL FORMAT

Each atomic skill follows:
``````
SKILL.md:
  # [Skill Name]
  WHEN TO USE: [trigger conditions]
  FUNCTION: [what this skill teaches Claude to do]
  RELATED: [linked skills]
  SOURCE: [phase + MS that created it, or course ID]
  
  [Content: <2KB of focused instruction]
``````

## INDEX STRUCTURE

Skills tracked in SKILL_INDEX.json and SKILL_PHASE_MAP.json.
Auto-loaded by trigger matching during session boot and on-demand.

## PARALLEL TRACK CHECKPOINTS

| Gate | Minimum Skill Count | Source |
|------|---------------------|--------|
| R1-MS9 | >= 300 | Decomposed + T1/T2 course skills |
| R3-MS5 | >= 1200 | + T3/T4 + CNC/CAM |
| R7 gate | >= 3500 | All tiers complete |

## VERIFICATION

- No duplicate skills (check by trigger + content hash)
- Each skill <2KB (token budget constraint)
- Dependency graph validates (no circular refs)
- Skill loading verified via prism_knowledge stats
"@
    [System.IO.File]::WriteAllText($specPath, $spec)
    Write-Output "SKILL_ATOMIZATION_SPEC.md created ($((Get-Content $specPath).Count) lines)"
}

Write-Output "`n--- All fixes applied ---"
