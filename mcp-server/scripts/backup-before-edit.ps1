# Pre-Write Backup Script
# Usage: .\backup-before-edit.ps1 <filepath>
# Creates timestamped backup before any dangerous file edit
# MANDATORY before editing any file >100 lines

param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

$backupDir = "C:\PRISM\mcp-server\backups"
if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir -Force | Out-Null }

if (-not (Test-Path $FilePath)) {
    Write-Host "ERROR: File not found: $FilePath" -ForegroundColor Red
    exit 1
}

$fileName = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
$ext = [System.IO.Path]::GetExtension($FilePath)
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$lineCount = (Get-Content $FilePath).Count
$backupName = "${fileName}_${timestamp}_${lineCount}L${ext}"
$backupPath = Join-Path $backupDir $backupName

Copy-Item $FilePath $backupPath -Force
$size = (Get-Item $backupPath).Length

Write-Host "BACKUP CREATED: $backupPath" -ForegroundColor Green
Write-Host "  Original: $FilePath ($lineCount lines, $size bytes)" -ForegroundColor Cyan
Write-Host "  Backup: $backupPath" -ForegroundColor Cyan

# Also maintain a backup log
$logPath = Join-Path $backupDir "backup_log.txt"
$logEntry = "$timestamp | $FilePath | $lineCount lines | $size bytes | $backupPath"
Add-Content -Path $logPath -Value $logEntry

exit 0
