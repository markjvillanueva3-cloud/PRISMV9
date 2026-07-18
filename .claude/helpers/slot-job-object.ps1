#Requires -Version 5.1
<#
.SYNOPSIS
    PRISM slot Job Object -- OS-level fork-bomb containment per chat slot.
    REAPER-PERMFIX-MS1 / U-C1.

.DESCRIPTION
    Wraps a chat slot's process tree in a Windows Job Object so the kernel --
    not a userspace polling reaper -- enforces three hard limits:

      * JOB_OBJECT_LIMIT_ACTIVE_PROCESS  (-ActiveProcessLimit, default 50)
            A runaway forge/loop run that tries to spawn the 51st live
            descendant is denied by the kernel. Caps the fork storm at source.
      * JOB_OBJECT_LIMIT_JOB_MEMORY      (-JobMemoryGB, default 8)
            Total *committed* memory for every process in the slot is capped.
            Allocation past the cap fails in-process -- the host never reaches
            the global commit ceiling because of one slot. (This is a virtual-
            address commit limit, not a working-set/RSS limit.)
      * JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
            When the LAST handle to the job closes (the anchor below dies),
            every still-living member process is terminated by the kernel.
            No scheduled task, no heartbeat, no ancestry walk -- OS guarantees.

    CONTAINMENT REQUIRES A PERSISTENT HANDLE HOLDER. A Job Object enforces its
    limits only while at least one HANDLE to the kernel object stays open. A
    process *assigned* to a job does not itself hold a handle, so a transient
    "create job, assign, exit" call would have the job destroyed the instant it
    exits -- silently un-containing the slot. -Anchor is that handle holder: it
    blocks for the slot's lifetime.

    CONTAINMENT REQUIRES THE ANCHOR TO BE AN ANCESTOR OF THE TREE. A process is
    pulled into a job only when it is explicitly assigned, OR when it is created
    as a child of a process already in the job. Existing children of a target
    assigned after the fact are NOT retro-captured. So there are two honest
    modes -- and no third "guess my claude.exe by walking parents" mode, because
    a guessed pid is wrong when detached (no claude ancestor) and wrong across
    /compact (stale pid):

      -LaunchChild  FULL containment. The anchor self-assigns, then SPAWNS the
                    slot command as its own child. Every descendant the child
                    ever forks is a job member. This is the production wrapper.
      -TargetPid    RETROFIT containment. Assign an already-running pid. Catches
                    every FUTURE fork of it (fork-bomb prevention works) but not
                    its already-running children. Honest, partial, useful.

.MODES  (exactly one switch required)
    -Anchor    Create the slot job (all three limits), contain a target
               (-LaunchChild XOR -TargetPid), write a discovery sidecar, then
               BLOCK as the handle holder until the watched process exits.
               Refuses if the slot is already anchored by a live anchor.
    -Assign    Assign -ProcessId <pid> into an EXISTING anchor job. Fails loud
               if no anchor is running for the slot -- a transient create here
               would not contain anything (see DESCRIPTION).
    -Status    Report the slot job's live process count, peak committed memory,
               limits, and a derived state (no-job / anchored-active /
               anchored-empty / orphaned-job). Mutates nothing.
    -DryRun    Compile the Win32 interop, smoke-test it with a throwaway
               NON-kill-on-close job, print the intended config. Assigns
               nothing, spawns nothing, blocks on nothing, kills nothing.
               Combine with any mode switch.

.PARAMETER LaunchChild
    -Anchor only. Executable to spawn as the contained child (e.g. claude, pwsh).
.PARAMETER LaunchArgs
    -Anchor -LaunchChild only. Optional argument array for the child, passed
    verbatim to Start-Process -ArgumentList (each element is one argument).
.PARAMETER TargetPid
    -Anchor only. Pid of an already-running process to assign + watch.
.PARAMETER ProcessId
    -Assign only. Pid to assign into the existing anchor job. CAUTION: the
    assigned pid becomes a job member -- it is terminated when the anchor dies
    (kill-on-job-close; see SHARP EDGE in .NOTES).
.PARAMETER Json
    Suppress human-readable lines; emit only the machine result line.

.OUTPUTS
    Non-blocking modes print exactly one final line:  PRISM_JOB_RESULT <json>
    -Anchor prints  PRISM_JOB_ANCHOR_UP <json>  when live, then a final
    PRISM_JOB_RESULT <json> when the watched process exits.
    Exit codes: 0 ok | 1 operational failure | 2 usage error.

.EXAMPLE
    # production: launch a slot's chat fully contained (blocks)
    powershell -NoProfile -ExecutionPolicy Bypass -File slot-job-object.ps1 `
        -Anchor -Slot alpha -LaunchChild claude

.EXAMPLE
    # retrofit: contain an already-running chat (partial -- future forks only)
    powershell ... -File slot-job-object.ps1 -Anchor -Slot alpha -TargetPid 12345

.EXAMPLE
    # add a stray pid into an already-anchored slot -- NOTE: the pid is then
    # reaped when slot alpha's anchor dies (see SHARP EDGE in .NOTES)
    powershell ... -File slot-job-object.ps1 -Assign -Slot alpha -ProcessId 6789

.EXAMPLE
    # query, mutate nothing
    powershell ... -File slot-job-object.ps1 -Status -Slot alpha -Json

.NOTES
    REAPER-PERMFIX-MS1/U-C1. Sister to scripts/fleet-reaper-sweep.mjs (userspace
    ancestry reaper) -- this is the kernel-enforced layer the reaper cannot be.

    SHARP EDGE -- killing the anchor reaps EVERY process in the job. With
    kill-on-job-close set, terminating the anchor closes the last handle and the
    kernel kills every job member: the launched child tree (-LaunchChild) AND
    any pid added later with -Assign. A pid you -Assign into a slot becomes
    hostage to that slot's anchor lifetime. That IS the containment, by design
    -- the anchor is the slot's kill switch.

    Reversal: do not launch with -Anchor; the slot runs exactly as before.
    Kill switch: PRISM_SLOT_JOB_DISABLE=1 makes -Anchor / -Assign refuse to
    create or assign (Status / DryRun still work for diagnostics).
#>
[CmdletBinding()]
param(
    [string]$Slot = "",
    [int]$ProcessId = 0,
    [int]$TargetPid = 0,
    [string]$LaunchChild = "",
    [string[]]$LaunchArgs = @(),
    [int]$ActiveProcessLimit = 50,
    [int]$JobMemoryGB = 8,
    [switch]$Anchor,
    [switch]$Assign,
    [switch]$Status,
    [switch]$DryRun,
    [switch]$Json,
    [int]$PollSeconds = 30
)

$ErrorActionPreference = "Stop"
$SchemaVersion = "1.1.0"

# -- repo-root-relative sidecar dir (anchor discovery) -----------------------
$RepoRoot   = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$SidecarDir = Join-Path $RepoRoot "state\shared\slot-job-objects"

# -- result emission (single source of truth for the stdout contract) --------
function Emit-Result {
    param([hashtable]$Obj, [int]$ExitCode)
    $Obj["tool"]          = "slot-job-object"
    $Obj["schemaVersion"] = $SchemaVersion
    if (-not $Obj.ContainsKey("ok"))     { $Obj["ok"] = ($ExitCode -eq 0) }
    if (-not $Obj.ContainsKey("dryRun")) { $Obj["dryRun"] = [bool]$DryRun }
    $json = $Obj | ConvertTo-Json -Compress -Depth 6
    if (-not $Json) {
        Write-Host "[slot-job-object] mode=$($Obj.mode) slot=$($Obj.slot) ok=$($Obj.ok) -- $($Obj.message)"
    }
    Write-Host "PRISM_JOB_RESULT $json"
    exit $ExitCode
}

# -- slot name validation ----------------------------------------------------
function Test-SlotName {
    param([string]$Name)
    # Lower-kebab, no leading/trailing/double dash, 1..31 chars. Rejects every
    # kernel-namespace separator ('\', 'Global\', 'Local\'), path separators,
    # ':' and '..' -- so it is safe both as a job-object name suffix and as the
    # sidecar filename stem.
    if (($null -eq $Name) -or $Name.Length -lt 1 -or $Name.Length -gt 31) { return $false }
    # -cmatch (case-SENSITIVE) -- PowerShell's -match ignores case, which would
    # admit 'Alpha'/'BAD' and collide case-folded sidecar filenames on NTFS.
    return ($Name -cmatch '^[a-z][a-z0-9]*(-[a-z0-9]+)*$')
}

function Test-PidAlive {
    param([int]$P)
    if ($P -lt 1) { return $false }
    return [bool](Get-Process -Id $P -ErrorAction SilentlyContinue)
}

# -- Win32 Job Object interop (P/Invoke) -------------------------------------
# Guarded so a re-run inside the same PowerShell session does not throw
# "type already exists".
if (-not ([System.Management.Automation.PSTypeName]'PrismJobObject').Type) {
Add-Type @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class PrismJobObject {
    // ---- LimitFlags ----
    public const uint JOB_OBJECT_LIMIT_ACTIVE_PROCESS   = 0x00000008;
    public const uint JOB_OBJECT_LIMIT_JOB_MEMORY       = 0x00000200;
    public const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE= 0x00002000;
    // ---- JOBOBJECTINFOCLASS ----
    public const int  JobObjectBasicAccountingInformation = 1;
    public const int  JobObjectExtendedLimitInformation   = 9;
    // ---- access rights ----
    public const uint JOB_OBJECT_ASSIGN_PROCESS = 0x0001;
    public const uint JOB_OBJECT_QUERY          = 0x0004;
    public const uint PROCESS_TERMINATE         = 0x0001;
    public const uint PROCESS_SET_QUOTA         = 0x0100;
    public const int  ERROR_ALREADY_EXISTS      = 183;

    public static bool LastCreateAlreadyExisted = false;

    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
        public Int64  PerProcessUserTimeLimit;
        public Int64  PerJobUserTimeLimit;
        public UInt32 LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public UInt32 ActiveProcessLimit;
        public UIntPtr Affinity;
        public UInt32 PriorityClass;
        public UInt32 SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct IO_COUNTERS {
        public UInt64 ReadOperationCount;
        public UInt64 WriteOperationCount;
        public UInt64 OtherOperationCount;
        public UInt64 ReadTransferCount;
        public UInt64 WriteTransferCount;
        public UInt64 OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_BASIC_ACCOUNTING_INFORMATION {
        public Int64  TotalUserTime;
        public Int64  TotalKernelTime;
        public Int64  ThisPeriodTotalUserTime;
        public Int64  ThisPeriodTotalKernelTime;
        public UInt32 TotalPageFaultCount;
        public UInt32 TotalProcesses;
        public UInt32 ActiveProcesses;
        public UInt32 TotalTerminatedProcesses;
    }

    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern IntPtr OpenJobObject(uint dwDesiredAccess, bool bInheritHandle, string lpName);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern bool SetInformationJobObject(IntPtr hJob, int infoClass, IntPtr lpInfo, uint cbInfo);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern bool QueryInformationJobObject(IntPtr hJob, int infoClass, IntPtr lpInfo, uint cbInfo, IntPtr lpReturnLength);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, uint dwProcessId);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern bool CloseHandle(IntPtr hObject);

    // Create-or-open a named job and (re)apply the requested limits.
    public static IntPtr CreateConfigured(string name, uint activeLimit, ulong jobMemBytes, bool killOnClose) {
        LastCreateAlreadyExisted = false;
        IntPtr h = CreateJobObject(IntPtr.Zero, name);
        int gle = Marshal.GetLastWin32Error();
        if (h == IntPtr.Zero) throw new Win32Exception(gle, "CreateJobObject failed for '" + name + "'");
        LastCreateAlreadyExisted = (gle == ERROR_ALREADY_EXISTS);

        var ext = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        uint flags = 0;
        if (activeLimit > 0) { flags |= JOB_OBJECT_LIMIT_ACTIVE_PROCESS; ext.BasicLimitInformation.ActiveProcessLimit = activeLimit; }
        if (jobMemBytes > 0) { flags |= JOB_OBJECT_LIMIT_JOB_MEMORY;     ext.JobMemoryLimit = new UIntPtr(jobMemBytes); }
        if (killOnClose)     { flags |= JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE; }
        ext.BasicLimitInformation.LimitFlags = flags;

        int len = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
        IntPtr p = Marshal.AllocHGlobal(len);
        try {
            Marshal.StructureToPtr(ext, p, false);
            if (!SetInformationJobObject(h, JobObjectExtendedLimitInformation, p, (uint)len)) {
                int err = Marshal.GetLastWin32Error();
                CloseHandle(h);
                throw new Win32Exception(err, "SetInformationJobObject failed for '" + name + "'");
            }
        } finally { Marshal.FreeHGlobal(p); }
        return h;
    }

    // Open an existing named job. Returns IntPtr.Zero when it does not exist.
    public static IntPtr OpenExisting(string name, uint access) {
        return OpenJobObject(access, false, name);
    }

    // Assign one pid into a job. Throws Win32Exception on any failure (fail loud).
    public static void AssignPid(IntPtr hJob, uint pid) {
        IntPtr hProc = OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, false, pid);
        if (hProc == IntPtr.Zero)
            throw new Win32Exception(Marshal.GetLastWin32Error(), "OpenProcess failed for pid " + pid);
        try {
            if (!AssignProcessToJobObject(hJob, hProc))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "AssignProcessToJobObject failed for pid " + pid);
        } finally { CloseHandle(hProc); }
    }

    public static JOBOBJECT_BASIC_ACCOUNTING_INFORMATION QueryAccounting(IntPtr hJob) {
        int len = Marshal.SizeOf(typeof(JOBOBJECT_BASIC_ACCOUNTING_INFORMATION));
        IntPtr p = Marshal.AllocHGlobal(len);
        try {
            if (!QueryInformationJobObject(hJob, JobObjectBasicAccountingInformation, p, (uint)len, IntPtr.Zero))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "QueryInformationJobObject(accounting) failed");
            return (JOBOBJECT_BASIC_ACCOUNTING_INFORMATION)Marshal.PtrToStructure(p, typeof(JOBOBJECT_BASIC_ACCOUNTING_INFORMATION));
        } finally { Marshal.FreeHGlobal(p); }
    }

    public static JOBOBJECT_EXTENDED_LIMIT_INFORMATION QueryExtendedLimit(IntPtr hJob) {
        int len = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
        IntPtr p = Marshal.AllocHGlobal(len);
        try {
            if (!QueryInformationJobObject(hJob, JobObjectExtendedLimitInformation, p, (uint)len, IntPtr.Zero))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "QueryInformationJobObject(extlimit) failed");
            return (JOBOBJECT_EXTENDED_LIMIT_INFORMATION)Marshal.PtrToStructure(p, typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
        } finally { Marshal.FreeHGlobal(p); }
    }

    public static void Close(IntPtr h) { if (h != IntPtr.Zero) CloseHandle(h); }
}
"@
}

# -- shared helpers ----------------------------------------------------------
function Get-JobName   { param([string]$S) "prism-slot-$S" }
function Test-Disabled { return ($env:PRISM_SLOT_JOB_DISABLE -eq "1") }

function Write-SidecarAtomic {
    param([string]$S, [hashtable]$Data)
    $tmp = $null
    try {
        if (-not (Test-Path $SidecarDir)) { New-Item -ItemType Directory -Path $SidecarDir -Force | Out-Null }
        $Data["schemaVersion"] = $SchemaVersion
        $final = Join-Path $SidecarDir "$S.json"
        $tmp   = "$final.$PID.tmp"
        $json  = $Data | ConvertTo-Json -Compress -Depth 6
        # BOM-free UTF-8 -- a Node consumer's JSON.parse rejects a leading BOM.
        [System.IO.File]::WriteAllText($tmp, $json, (New-Object System.Text.UTF8Encoding $false))
        Move-Item -Path $tmp -Destination $final -Force
        $tmp = $null
    } catch {
        # Sidecar is discovery sugar, never load-bearing -- never fail the run on
        # it. But do not leave the .tmp behind (orphan-tmp accumulation class).
        if ($tmp -and (Test-Path $tmp)) { Remove-Item -Path $tmp -Force -ErrorAction SilentlyContinue }
        Write-Host "[slot-job-object] WARN: sidecar write failed: $_"
    }
}
function Remove-Sidecar {
    param([string]$S)
    try {
        $f = Join-Path $SidecarDir "$S.json"
        if (Test-Path $f) { Remove-Item $f -Force -ErrorAction SilentlyContinue }
    } catch { }
}
function Read-Sidecar {
    param([string]$S)
    try {
        $f = Join-Path $SidecarDir "$S.json"
        if (-not (Test-Path $f)) { return $null }
        return (Get-Content $f -Raw -ErrorAction Stop | ConvertFrom-Json)
    } catch { return $null }
}

# ------------------------------- mode dispatch ------------------------------

# Usage / mutual-exclusion guards.
$modes = @($Anchor, $Assign, $Status) | Where-Object { $_ }
if ($modes.Count -ne 1) {
    Emit-Result @{ mode = "usage"; slot = $Slot
        message = "exactly one of -Anchor / -Assign / -Status is required (got $($modes.Count))" } 2
}
if (-not (Test-SlotName $Slot)) {
    Emit-Result @{ mode = "usage"; slot = $Slot
        message = "invalid -Slot '$Slot' -- expected lower-kebab ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ (1..31 chars)" } 2
}
if ($ActiveProcessLimit -lt 1 -or $ActiveProcessLimit -gt 500) {
    Emit-Result @{ mode = "usage"; slot = $Slot; message = "-ActiveProcessLimit must be 1..500 (got $ActiveProcessLimit)" } 2
}
if ($JobMemoryGB -lt 1 -or $JobMemoryGB -gt 64) {
    Emit-Result @{ mode = "usage"; slot = $Slot; message = "-JobMemoryGB must be 1..64 (got $JobMemoryGB)" } 2
}
if ($PollSeconds -lt 5 -or $PollSeconds -gt 3600) {
    Emit-Result @{ mode = "usage"; slot = $Slot; message = "-PollSeconds must be 5..3600 (got $PollSeconds)" } 2
}

$jobName    = Get-JobName $Slot
$jobMemByte = [uint64]$JobMemoryGB * 1024 * 1024 * 1024
$limits     = @{ activeProcessLimit = $ActiveProcessLimit; jobMemoryGB = $JobMemoryGB; killOnJobClose = $true }

# -- STATUS ------------------------------------------------------------------
if ($Status) {
    try {
        $sc = Read-Sidecar $Slot
        $anchorPid = $(if ($sc -and $sc.anchorPid) { [int]$sc.anchorPid } else { 0 })
        $anchorAlive = (($anchorPid -gt 0) -and (Test-PidAlive $anchorPid))

        $hJob = [PrismJobObject]::OpenExisting($jobName, [PrismJobObject]::JOB_OBJECT_QUERY)
        if ($hJob -eq [IntPtr]::Zero) {
            Emit-Result @{
                mode = "status"; slot = $Slot; jobName = $jobName; exists = $false
                state = "no-job"; anchorPid = $anchorPid; anchorAlive = $anchorAlive
                message = "no live job object for slot '$Slot'" + $(if ($sc) { " (stale sidecar present)" } else { "" })
            } 0
        }
        try {
            $acct   = [PrismJobObject]::QueryAccounting($hJob)
            $ext    = [PrismJobObject]::QueryExtendedLimit($hJob)
            $active = [int]$acct.ActiveProcesses
            $peakMB = [math]::Round([double]([uint64]$ext.PeakJobMemoryUsed.ToUInt64()) / 1MB, 1)
            # Derived state so a reaper consumer never has to infer from raw
            # counts + a possibly-stale sidecar.
            $state = if (-not $anchorAlive) { "orphaned-job" }
                     elseif ($active -gt 0)  { "anchored-active" }
                     else                    { "anchored-empty" }
            Emit-Result @{
                mode = "status"; slot = $Slot; jobName = $jobName; exists = $true
                state = $state
                activeProcesses = $active
                totalProcesses  = [int]$acct.TotalProcesses
                peakJobMemoryMB = $peakMB
                anchorPid = $anchorPid; anchorAlive = $anchorAlive
                assignedClaudePid = $(if ($sc -and $sc.claudePid) { [int]$sc.claudePid } else { 0 })
                message = "slot '$Slot' job=$state -- $active active proc(s), peak $peakMB MB committed"
            } 0
        } finally { [PrismJobObject]::Close($hJob) }
    } catch {
        # The job can vanish between OpenExisting and the query -- never break
        # the PRISM_JOB_RESULT contract.
        Emit-Result @{ mode = "status"; slot = $Slot; jobName = $jobName; ok = $false
            state = "query-failed"; message = "status query failed: $_" } 1
    }
}

# -- ASSIGN ------------------------------------------------------------------
if ($Assign) {
    if ($ProcessId -lt 1) {
        Emit-Result @{ mode = "assign"; slot = $Slot; message = "-Assign requires -ProcessId <pid>" } 2
    }
    if ($DryRun) {
        $h = [PrismJobObject]::OpenExisting($jobName, [PrismJobObject]::JOB_OBJECT_QUERY)
        $exists = ($h -ne [IntPtr]::Zero)
        if ($exists) { [PrismJobObject]::Close($h) }   # close -- never leak the probe handle
        Emit-Result @{
            mode = "assign"; slot = $Slot; jobName = $jobName
            assignTargetPid = $ProcessId; anchorJobExists = $exists
            message = "dry-run -- would assign pid $ProcessId into '$jobName' (anchor present: $exists)"
        } 0
    }
    if (Test-Disabled) {
        Emit-Result @{ mode = "assign"; slot = $Slot; ok = $false; message = "PRISM_SLOT_JOB_DISABLE=1 -- assign refused" } 1
    }
    # Honest containment: -Assign only works against a live anchor job. A
    # transient create here would be destroyed on exit (see DESCRIPTION).
    $hJob = [PrismJobObject]::OpenExisting($jobName,
        ([PrismJobObject]::JOB_OBJECT_ASSIGN_PROCESS -bor [PrismJobObject]::JOB_OBJECT_QUERY))
    if ($hJob -eq [IntPtr]::Zero) {
        Emit-Result @{
            mode = "assign"; slot = $Slot; jobName = $jobName; ok = $false
            assignTargetPid = $ProcessId
            message = "no anchor job for slot '$Slot' -- run -Anchor first (a transient assign would not contain anything)"
        } 1
    }
    # The named job exists -- but a kill-on-job-close job whose anchor is no
    # longer alive is moments from kernel collection. Assigning a pid into it
    # (or becoming its last handle holder ourselves) gets that pid reaped the
    # instant this process exits. Refuse unless a LIVE anchor owns the job.
    $asc = Read-Sidecar $Slot
    if (-not ($asc -and $asc.anchorPid -and (Test-PidAlive ([int]$asc.anchorPid)))) {
        [PrismJobObject]::Close($hJob)
        Emit-Result @{
            mode = "assign"; slot = $Slot; jobName = $jobName; ok = $false; state = "orphaned-job"
            assignTargetPid = $ProcessId
            message = "slot '$Slot' job exists but no live anchor owns it (orphaned-job) -- refusing to assign into a job about to be reaped; run -Anchor first"
        } 1
    }
    try {
        [PrismJobObject]::AssignPid($hJob, [uint32]$ProcessId)
        $acct = [PrismJobObject]::QueryAccounting($hJob)
        Emit-Result @{
            mode = "assign"; slot = $Slot; jobName = $jobName
            assignedPid = $ProcessId; activeProcesses = [int]$acct.ActiveProcesses
            message = "pid $ProcessId assigned to slot '$Slot' job ($([int]$acct.ActiveProcesses) active)"
        } 0
    } catch {
        Emit-Result @{ mode = "assign"; slot = $Slot; ok = $false; message = "assign failed: $_" } 1
    } finally { [PrismJobObject]::Close($hJob) }
}

# -- ANCHOR ------------------------------------------------------------------
if ($Anchor) {
    # Exactly one containment target.
    $hasLaunch = -not [string]::IsNullOrWhiteSpace($LaunchChild)
    $hasTarget = ($TargetPid -ge 1)
    if ($hasLaunch -eq $hasTarget) {
        Emit-Result @{ mode = "anchor"; slot = $Slot
            message = "-Anchor requires exactly one of -LaunchChild <exe> or -TargetPid <pid>" } 2
    }

    if ($DryRun) {
        # Smoke-test the interop with a throwaway NON-kill-on-close job so a
        # dry run can never terminate a real process.
        $probeName = "$jobName-dryrun-$PID-" + ([guid]::NewGuid().ToString("N").Substring(0,8))
        $err = $null; $probeActive = -1
        try {
            $hProbe = [PrismJobObject]::CreateConfigured($probeName, [uint32]$ActiveProcessLimit, [uint64]$jobMemByte, $false)
            try   { $probeActive = [int]([PrismJobObject]::QueryAccounting($hProbe)).ActiveProcesses }
            finally { [PrismJobObject]::Close($hProbe) }
        } catch { $err = "$_" }
        if ($err) {
            Emit-Result @{ mode = "anchor"; slot = $Slot; jobName = $jobName; ok = $false
                message = "dry-run interop smoke test FAILED: $err" } 1
        }
        Emit-Result @{
            mode = "anchor"; slot = $Slot; jobName = $jobName; limits = $limits
            interopOk = $true; probeActiveProcesses = $probeActive
            containment = $(if ($hasLaunch) { "launch-child:$LaunchChild" } else { "target-pid:$TargetPid" })
            message = "dry-run ok -- interop verified; would create '$jobName' (active<=$ActiveProcessLimit, mem<=${JobMemoryGB}GB, kill-on-close) and block as anchor"
        } 0
    }
    if (Test-Disabled) {
        Emit-Result @{ mode = "anchor"; slot = $Slot; ok = $false; message = "PRISM_SLOT_JOB_DISABLE=1 -- anchor refused" } 1
    }

    # Conflict guard (best-effort) -- refuse if the slot is already anchored by a
    # LIVE anchor. A stale sidecar from a crashed anchor does not block (we
    # recover it). The sub-millisecond create-race window is closed post-create.
    $sc = Read-Sidecar $Slot
    if ($sc -and $sc.anchorPid -and (Test-PidAlive ([int]$sc.anchorPid))) {
        Emit-Result @{
            mode = "anchor"; slot = $Slot; jobName = $jobName; ok = $false
            message = "slot '$Slot' is already anchored by live pid $([int]$sc.anchorPid) -- refusing to double-anchor"
        } 1
    }

    $hJob = $null
    $errObj = $null
    try {
        $hJob = [PrismJobObject]::CreateConfigured($jobName, [uint32]$ActiveProcessLimit, [uint64]$jobMemByte, $true)
        $alreadyExisted = [PrismJobObject]::LastCreateAlreadyExisted

        # TOCTOU close-out: another anchor may have won CreateJobObject between
        # the conflict-guard read above and here. If the job already existed AND
        # a DIFFERENT live anchor now owns the sidecar, stand down cleanly.
        if ($alreadyExisted) {
            $scRace = Read-Sidecar $Slot
            if ($scRace -and $scRace.anchorPid -and
                ([int]$scRace.anchorPid -ne $PID) -and (Test-PidAlive ([int]$scRace.anchorPid))) {
                [PrismJobObject]::Close($hJob); $hJob = $null
                Emit-Result @{
                    mode = "anchor"; slot = $Slot; jobName = $jobName; ok = $false
                    message = "slot '$Slot' won by live anchor pid $([int]$scRace.anchorPid) during a startup race -- standing down"
                } 1
            }
        }

        $childPid = 0
        if ($hasLaunch) {
            # FULL containment: self-assign so any child this anchor spawns is a
            # job member, then spawn the slot command as that child.
            [PrismJobObject]::AssignPid($hJob, [uint32]$PID)
            $spArgs = @{ FilePath = $LaunchChild; PassThru = $true; NoNewWindow = $true; ErrorAction = "Stop" }
            if ($LaunchArgs -and $LaunchArgs.Count -gt 0) { $spArgs["ArgumentList"] = $LaunchArgs }
            $child = Start-Process @spArgs
            $childPid = [int]$child.Id
            # Belt-and-suspenders: the child is already a member by parentage;
            # an explicit assign of an in-job pid is a harmless idempotent op.
            [PrismJobObject]::AssignPid($hJob, [uint32]$childPid)
        } else {
            # RETROFIT containment: assign an already-running pid. OpenProcess
            # failure (dead/forbidden pid) throws -- surfaced loud below.
            [PrismJobObject]::AssignPid($hJob, [uint32]$TargetPid)
            $childPid = $TargetPid
        }

        Write-SidecarAtomic $Slot @{
            slot = $Slot; jobName = $jobName; anchorPid = $PID
            claudePid = $childPid; mode = $(if ($hasLaunch) { "launch-child" } else { "target-pid" })
            limits = $limits; alreadyExisted = $alreadyExisted
            startedAt = (Get-Date).ToUniversalTime().ToString("o")
        }

        # Up-front liveness signal -- a programmatic launcher reads this without
        # waiting for the (intentionally unbounded) anchor block below.
        $upObj = @{
            tool = "slot-job-object"; schemaVersion = $SchemaVersion; ok = $true; dryRun = $false
            mode = "anchor"; slot = $Slot; jobName = $jobName
            anchorPid = $PID; watchedPid = $childPid; alreadyExisted = $alreadyExisted
            containment = $(if ($hasLaunch) { "launch-child" } else { "target-pid" }); limits = $limits
            message = "anchor live for slot '$Slot' (job '$jobName'); blocking as handle holder"
        }
        if (-not $Json) {
            Write-Host "[slot-job-object] ANCHOR live -- slot '$Slot', job '$jobName'"
            Write-Host "[slot-job-object]   limits: active<=$ActiveProcessLimit, mem<=${JobMemoryGB}GB, kill-on-job-close"
            Write-Host "[slot-job-object]   watching pid $childPid ($(if ($hasLaunch) { "launched child" } else { "retrofit target" }))"
            Write-Host "[slot-job-object]   blocking as handle holder; killing pid $PID releases + reaps the job"
        }
        Write-Host ("PRISM_JOB_ANCHOR_UP " + ($upObj | ConvertTo-Json -Compress -Depth 6))

        # Block. When the watched process exits the chat is gone, so the anchor
        # exits, the handle closes, and kill-on-job-close reaps any strays.
        while (Test-PidAlive $childPid) {
            Start-Sleep -Seconds $PollSeconds
        }

        # Happy-path teardown, explicit ordering: emit the final result line and
        # remove the sidecar BEFORE closing the handle -- in -LaunchChild mode the
        # anchor is itself a job member, so the CloseHandle below may terminate
        # this very process via kill-on-job-close.
        if (-not $Json) { Write-Host "[slot-job-object] watched pid $childPid exited -- releasing slot '$Slot' job" }
        Remove-Sidecar $Slot
        $finalObj = @{
            tool = "slot-job-object"; schemaVersion = $SchemaVersion; ok = $true; dryRun = $false
            mode = "anchor"; slot = $Slot; jobName = $jobName; anchorPid = $PID; watchedPid = $childPid
            message = "watched pid $childPid exited; closing handle -- kill-on-job-close reaps any strays"
        }
        Write-Host ("PRISM_JOB_RESULT " + ($finalObj | ConvertTo-Json -Compress -Depth 6))
        [PrismJobObject]::Close($hJob); $hJob = $null
        exit 0
    } catch {
        $errObj = @{ mode = "anchor"; slot = $Slot; jobName = $jobName; ok = $false; message = "anchor failed: $_" }
    } finally {
        # Only reached with $hJob non-null on the exception path (the happy path
        # nulls it after an explicit Close). Backstop cleanup.
        if ($hJob) {
            Remove-Sidecar $Slot
            [PrismJobObject]::Close($hJob)
        }
    }
    # Exception path only -- happy path exited above.
    Emit-Result $errObj 1
}

# Unreachable -- every mode branch Emit-Result/exit's.
Emit-Result @{ mode = "usage"; slot = $Slot; message = "no mode executed" } 2
