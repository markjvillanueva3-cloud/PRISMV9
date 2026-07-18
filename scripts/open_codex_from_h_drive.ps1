$ErrorActionPreference = 'Stop'

$driveRoot = 'H:\'
$userHome = 'C:\Users\Mark Villanueva'

$candidates = @(
  (Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\OpenAI.Codex.exe'),
  (Join-Path $env:LOCALAPPDATA 'Programs\OpenAI Codex\Codex.exe'),
  'C:\Program Files\OpenAI Codex\Codex.exe'
) | Where-Object { $_ -and (Test-Path $_) }

foreach ($candidate in $candidates) {
  try {
    Start-Process -FilePath $candidate -WorkingDirectory $driveRoot
    exit 0
  } catch {
  }
}

try {
  $package = Get-AppxPackage | Where-Object { $_.Name -like 'OpenAI.Codex*' } | Select-Object -First 1
  if ($package) {
    $appRef = "shell:AppsFolder\$($package.PackageFamilyName)!App"
    Start-Process -FilePath 'explorer.exe' -ArgumentList $appRef -WorkingDirectory $driveRoot
    exit 0
  }
} catch {
}

try {
  $cmdShim = Join-Path $userHome 'powershell.cmd'
  if (Test-Path $cmdShim) {
    Start-Process -FilePath $cmdShim -ArgumentList '-NoProfile', '-WindowStyle', 'Hidden', '-Command', "Start-Process -FilePath 'explorer.exe' -ArgumentList 'shell:AppsFolder'" -WorkingDirectory $driveRoot
    exit 0
  }
} catch {
}

throw 'Unable to locate a Codex app launcher on this machine.'
