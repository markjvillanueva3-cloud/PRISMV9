# Fix logger casing in all TypeScript files
$srcPath = "C:\PRISM\mcp-server\src"

# Get all .ts files
$files = Get-ChildItem -Path $srcPath -Recurse -Include "*.ts"

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $original = $content
    
    # Fix: from "./logger -> from "./Logger
    $content = $content -replace 'from "./logger\.js"', 'from "./Logger.js"'
    $content = $content -replace "from './logger\.js'", "from './Logger.js'"
    
    # Fix: from "../utils/logger -> from "../utils/Logger
    $content = $content -replace 'from "../utils/logger\.js"', 'from "../utils/Logger.js"'
    $content = $content -replace "from '../utils/logger\.js'", "from '../utils/Logger.js'"
    
    # Fix: from "../../utils/logger -> from "../../utils/Logger
    $content = $content -replace 'from "../../utils/logger\.js"', 'from "../../utils/Logger.js"'
    $content = $content -replace "from '../../utils/logger\.js'", "from '../../utils/Logger.js'"
    
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Fixed: $($file.FullName)"
    }
}

Write-Host "Done fixing logger imports!"
