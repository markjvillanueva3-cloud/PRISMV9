$path = 'C:\PRISM\mcp-server\data\docs\roadmap\PRISM_MASTER_INDEX.md'
$lines = [System.IO.File]::ReadAllLines($path)

for ($i = 0; $i -lt $lines.Length; $i++) {
    # Line ~82: "3. Load PRISM_PROTOCOLS_CORE.md"
    if ($lines[$i] -match '^\d+\.\s+Load PRISM_PROTOCOLS_CORE\.md') {
        $lines[$i] = '3. Load PRISM_PROTOCOLS_BOOT.md (laws/boot/recovery - ~3K tokens, split from CORE 2026-02-17)'
        Write-Host "Fixed line $($i+1): boot sequence step 3"
    }
    # Line ~102: "STEP 3: PROTOCOLS -> Load PRISM_PROTOCOLS_CORE"
    if ($lines[$i] -match 'STEP 3: PROTOCOLS.*Load PRISM_PROTOCOLS_CORE') {
        $lines[$i] = 'STEP 3: PROTOCOLS -> Load PRISM_PROTOCOLS_BOOT.md (+ SAFETY/CODING per phase type)'
        Write-Host "Fixed line $($i+1): session workflow step 3"
    }
    # Line ~103: "STEP 4: BOOT -> Execute Boot Protocol from PRISM_PROTOCOLS_CORE"
    if ($lines[$i] -match 'STEP 4: BOOT.*Execute Boot Protocol from PRISM_PROTOCOLS_CORE') {
        $lines[$i] = 'STEP 4: BOOT     -> Execute Boot Protocol from PRISM_PROTOCOLS_BOOT.md'
        Write-Host "Fixed line $($i+1): session workflow step 4"
    }
    # File table row for PROTOCOLS_CORE
    if ($lines[$i] -match '^\| \*\*PRISM_PROTOCOLS_CORE\.md\*\*') {
        $lines[$i] = '| **PRISM_PROTOCOLS_BOOT.md** | Laws, boot, recovery, session mgmt | 723 lines | EVERY session |'
        Write-Host "Fixed line $($i+1): file table entry"
    }
}

[System.IO.File]::WriteAllLines($path, $lines)
Write-Host 'MASTER_INDEX updated'
