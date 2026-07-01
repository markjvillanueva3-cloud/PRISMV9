# setup-phone-ssh.ps1 - one-shot Windows-side setup for "SSH from iPhone to this PC"
# Targets Windows PowerShell 5.1: no '&&' operator, ASCII-only (no Unicode).
$ErrorActionPreference = 'Stop'

function Step($n, $msg) { Write-Host ""; Write-Host "[$n] $msg" -ForegroundColor Cyan }
function Done($msg) { Write-Host "    [OK]   $msg" -ForegroundColor Green }
function Skip($msg) { Write-Host "    [SKIP] $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "    [FAIL] $msg" -ForegroundColor Red }

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Fail "Run as Administrator. Right-click Terminal -> Run as administrator."
    exit 1
}

Step 1 "Install OpenSSH Server feature"
$cap = Get-WindowsCapability -Online -Name OpenSSH.Server*
if ($cap.State -eq 'Installed') {
    Skip "Already installed"
} else {
    Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0 | Out-Null
    Done "Installed"
}

Step 2 "Start sshd service + auto-start on boot"
$svc = Get-Service sshd
if ($svc.StartType -ne 'Automatic') { Set-Service -Name sshd -StartupType Automatic; Done "Set startup type to Automatic" } else { Skip "Already Automatic" }
$svc = Get-Service sshd
if ($svc.Status -ne 'Running') { Start-Service sshd; Done "Service started" } else { Skip "Already running" }

Step 3 "Firewall - verify OpenSSH-Server-In-TCP rule"
$rule = Get-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -ErrorAction SilentlyContinue
if (-not $rule) {
    New-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
    Done "Created OpenSSH-Server-In-TCP rule"
} elseif (-not $rule.Enabled) {
    Enable-NetFirewallRule -Name 'OpenSSH-Server-In-TCP'
    Done "Enabled existing rule"
} else { Skip "Already enabled" }

Step 4 "Set default SSH shell to PowerShell (not cmd.exe)"
$key = 'HKLM:\SOFTWARE\OpenSSH'
if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
$current = (Get-ItemProperty -Path $key -Name DefaultShell -ErrorAction SilentlyContinue).DefaultShell
$want = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
if ($current -ne $want) {
    New-ItemProperty -Path $key -Name DefaultShell -Value $want -PropertyType String -Force | Out-Null
    Done "DefaultShell set to PowerShell 5.1"
} else { Skip "Already PowerShell" }

Step 5 "Install Tailscale (for over-internet access from anywhere)"
$ts = Get-Command tailscale -ErrorAction SilentlyContinue
if ($ts) {
    Skip "Already installed at $($ts.Source)"
} else {
    Write-Host "    Running: winget install tailscale.tailscale --silent --accept-package-agreements --accept-source-agreements"
    & winget install tailscale.tailscale --silent --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -eq 0) { Done "Installed" } else { Fail "winget install failed (exit $LASTEXITCODE) - install manually from https://tailscale.com/download/windows" }
}

Step 6 "Install tmux inside WSL Ubuntu"
$tmuxCheck = wsl -d Ubuntu -- bash -c 'command -v tmux' 2>$null
if ($LASTEXITCODE -eq 0 -and $tmuxCheck) {
    Skip "tmux already installed"
} else {
    Write-Host "    Running: wsl -d Ubuntu -- bash -c 'sudo apt update -qq; sudo apt install -y tmux'"
    Write-Host "    (You may be prompted for your WSL sudo password.)"
    wsl -d Ubuntu -- bash -c "sudo apt update -qq; sudo apt install -y tmux"
    if ($LASTEXITCODE -eq 0) { Done "tmux installed" } else { Fail "tmux install failed - run manually: wsl -d Ubuntu -- sudo apt install tmux" }
}

Step 7 "Connection details for your iPhone"
Write-Host ""
Write-Host "  LAN connection (same Wi-Fi):" -ForegroundColor White
Write-Host "    Host:     192.168.50.233" -ForegroundColor White
Write-Host "    Port:     22" -ForegroundColor White
Write-Host "    Username: wompu" -ForegroundColor White
Write-Host ""
Write-Host "  Tailscale connection (over-internet, after 'tailscale up'):" -ForegroundColor White
$tsStatus = & tailscale status 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "    Tailscale is running. Your tailnet IP appears in 'tailscale ip -4'."
} else {
    Write-Host "    Run 'tailscale up' next (it opens a browser to sign in)." -ForegroundColor Yellow
    Write-Host "    Then your phone uses the 100.x.y.z IP that 'tailscale ip -4' prints." -ForegroundColor Yellow
}
Write-Host ""
Write-Host "  Verify sshd is reachable from this PC:" -ForegroundColor White
$test = Test-NetConnection -ComputerName 127.0.0.1 -Port 22 -InformationLevel Quiet
if ($test) { Done "Port 22 listens locally" } else { Fail "Port 22 not listening" }

Step 8 "Tmux session bootstrap helper"
$bootstrap = "# Run THIS in PowerShell once you've SSHed into the PC from your phone:`r`nwsl -d Ubuntu -- bash -c 'tmux new -d -s prism-fleet 2>/dev/null; tmux attach -t prism-fleet'`r`n# Inside tmux: Ctrl-b c (new pane) | Ctrl-b n / p (next/prev) | Ctrl-b d (detach)"
$bootstrapPath = Join-Path $env:USERPROFILE 'Documents\prism-tmux-bootstrap.txt'
Set-Content -Path $bootstrapPath -Value $bootstrap -Encoding UTF8
Done "Bootstrap doc written to $bootstrapPath"

Write-Host ""
Write-Host "===================================================================="
Write-Host "  WINDOWS SIDE DONE. iPhone side next." -ForegroundColor Green
Write-Host "===================================================================="
Write-Host ""
Write-Host "  Next on iPhone:" -ForegroundColor Cyan
Write-Host "  1. App Store -> install 'Termius'"
Write-Host "  2. Open Termius -> Hosts -> + (add host)"
Write-Host "       Alias:    PRISM PC"
Write-Host "       Hostname: 192.168.50.233"
Write-Host "       Port:     22"
Write-Host "       Username: wompu"
Write-Host "       Password: <your Windows password>"
Write-Host "  3. Tap the host -> connects"
Write-Host "  4. Once in: run 'wsl -d Ubuntu' then 'tmux attach -t prism-fleet || tmux new -s prism-fleet'"
Write-Host ""
Write-Host "  For over-internet access (anywhere, not just home Wi-Fi):"
Write-Host "  1. Run on this PC:   tailscale up        (opens browser to sign in to a free account)"
Write-Host "  2. Install Tailscale on iPhone via App Store, sign in with same account"
Write-Host "  3. In Termius, change the Hostname from 192.168.50.233 to the 100.x.y.z IP"
Write-Host "     (find it with: tailscale ip -4)"
Write-Host ""
Write-Host "Press Enter to close this window..."
Read-Host
