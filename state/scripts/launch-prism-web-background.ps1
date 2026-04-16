$env:SystemRoot = 'C:\Windows'
$env:windir = 'C:\Windows'
$env:ComSpec = 'C:\Windows\System32\cmd.exe'
$env:PATHEXT = '.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC;.CPL'

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'C:\Program Files\nodejs\npm.cmd'
$psi.Arguments = 'run dev -- --host 127.0.0.1 --port 3100'
$psi.WorkingDirectory = 'C:\PRISM\mcp-server\web'
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true

$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $psi
$null = $proc.Start()

$logPath = 'C:\PRISM\state\logs\web-dev-direct.log'
$stdout = [System.IO.StreamWriter]::new($logPath, $false)
$stderr = [System.IO.StreamWriter]::new($logPath + '.err', $false)

Register-ObjectEvent -InputObject $proc -EventName OutputDataReceived -Action {
  if ($EventArgs.Data) {
    Add-Content -Path 'C:\PRISM\state\logs\web-dev-direct.log' -Value $EventArgs.Data
  }
} | Out-Null

Register-ObjectEvent -InputObject $proc -EventName ErrorDataReceived -Action {
  if ($EventArgs.Data) {
    Add-Content -Path 'C:\PRISM\state\logs\web-dev-direct.log.err' -Value $EventArgs.Data
  }
} | Out-Null

$proc.BeginOutputReadLine()
$proc.BeginErrorReadLine()

Start-Sleep -Seconds 2
Write-Output "started_pid=$($proc.Id)"
