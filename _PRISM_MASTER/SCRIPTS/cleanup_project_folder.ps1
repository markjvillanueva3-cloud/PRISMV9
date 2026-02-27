# PRISM Project Folder Cleanup Script v1.0
# Date: 2026-01-25
# Purpose: Clean up /mnt/project/ folder by archiving old files and identifying deletions
#
# INSTRUCTIONS:
# 1. Copy this script to your project folder or run from PowerShell
# 2. Review the file lists below before running
# 3. Run: .\cleanup_project_folder.ps1
# 4. Check the _ARCHIVED folder for moved files
# 5. Manually delete files in _TO_DELETE folder after review

# ============================================================================
# CONFIGURATION
# ============================================================================

# FIXED: Direct path to project folder
$ProjectFolder = "C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)"

# Create timestamp for archive folder
$Timestamp = Get-Date -Format "yyyy-MM-dd_HHmm"

# Archive and delete folders
$ArchiveFolder = Join-Path $ProjectFolder "_ARCHIVED_$Timestamp"
$ToDeleteFolder = Join-Path $ProjectFolder "_TO_DELETE_$Timestamp"

# ============================================================================
# FILE LISTS
# ============================================================================

# Files to ARCHIVE (move to archive folder - old versions, generators, etc.)
$FilesToArchive = @(
    # Old prompt versions (superseded by v8.0)
    "PRISM_BATTLE_READY_v11.md",
    "PRISM_BATTLE_READY_PROMPT_v10_5_PATCH.md",
    "PRISM_UNIFIED_SYSTEM_v10.md",
    "PRISM_UNIVERSAL_DEVELOPMENT_PROMPT_v8_0.md",
    "00_CONDENSED_PROTOCOL.md",
    "01_CORE_RULES.md",
    "06_CURRENT_PHASE.md",
    "07_REFERENCE_PATHS.md",
    "PRISM_PROJECT_SETTINGS_PROMPT_v1_0.md",
    "PRISM_v9_INTEGRATED_MASTER_ROADMAP.md",
    "PRISM_v9_MASTER_ROADMAP_v3.md",
    "TOOLKIT_ROADMAP.md",
    "UPDATE_SUMMARY.md",
    "SESSION_START_TEMPLATES.md",
    "API_INTEGRATION_GUIDE.md",
    "CLAUDE_CODE_PRISM_GUIDE.md",
    "CLAUDE_CODE_START.md",
    "PRISM_SKILL_UPLOAD.md",
    
    # Old skill versions
    "prism-skill-orchestrator_v4_SKILL.md",
    "prism-code-complete-integration_SKILL__1_.md",
    "SKILL.md",
    "SKILL__1_.md",
    "SKILL__2_.md",
    "SKILL__3_.md",
    
    # Old Python versions
    "prism_unified_system_v3.py",
    "prism_orchestrator.py",
    "prism_orchestrator_v2.py",
    "prism_orchestrator_cpython-312.pyc",
    "condition_variant_generator.py",
    "master_materials_generator.py",
    "regression_checker__1_.py",
    
    # Material generators (archive, may need later)
    "aluminum_alloy_data.py",
    "aluminum_materials_generator.py",
    "aluminum_tempers_generator.py",
    "carbon_alloy_steel_conditions_generator.py",
    "complete_condition_matrix_generator.py",
    "condition_variant_generator_v2.py",
    "copper_tempers_generator.py",
    "generate_free_machining_steels.py",
    "master_materials_generator_v3.py",
    "materials_scientific_builder.py",
    "prism_master_generator.py",
    "prism_materials_completion_v1.py",
    "prism_materials_enhance_expand_v1.py",
    "stainless_conditions_generator.py",
    "stainless_steels_part2.py",
    "steels_151_200.py",
    "steels_201_250.py",
    "steels_251_300.py",
    "steels_301_350.py",
    "steels_351_400.py",
    "tool_steel_hardness_generator.py",
    "tool_steels_101_150.py",
    
    # Validators and utilities (archive)
    "batch_validator.py",
    "build_level5_databases.py",
    "code_quality_scanner.py",
    "database_auditor.py",
    "dependency_mapper.py",
    "extraction_auditor.py",
    "gap_finder.py",
    "monolith_indexer.py",
    "physics_consistency.py",
    "progress_dashboard.py",
    "schema_checker.py",
    "skill_validator.py",
    "utilization_report.py",
    "verify_features.py",
    "workflow_validator.py",
    
    # Other utilities
    "analyze_conditions.py",
    "batch_processor.py",
    "consumer_tracker.py",
    "context_generator.py",
    "extract_module.py",
    "extraction_batch.py",
    "material_batch.py",
    "module_extractor.py",
    "report_generator.py",
    "test_validator.py",
    "update_state.py",
    
    # Templates
    "INDEX_TEMPLATE.js",
    "MODULE_TEMPLATE.js",
    
    # Batch files
    "get_context.bat",
    "setup_git.bat",
    
    # JSON files
    "extraction_index_machines_core.json"
)

# Files to KEEP (essential, current versions)
$FilesToKeep = @(
    # Current API orchestrator
    "prism_unified_system_v4.py",
    
    # Level 0 Always-On Skills
    "prism-life-safety-mindset_SKILLv2.md",
    "prism-maximum-completeness_SKILL.md",
    "prism-predictive-thinking_SKILL.md",
    "prism-skill-orchestrator_v5_SKILL.md",
    "regression_skill_v2.md",
    
    # Level 2 Quality Skills
    "prism-tdd-enhanced_SKILL.md",
    "prism-root-cause-tracing_SKILL.md",
    "prism-codebase-packaging_SKILL.md",
    "prism-code-complete-integration_SKILL.md",
    
    # Essential Python modules
    "material_schema.py",
    "material_validator.py",
    "prism_api_worker.py",
    "prism_toolkit.py",
    "swarm_trigger.py",
    "regression_checker.py",
    "checkpoint_system.py",
    "progress_tracker.py",
    "session_logger.py",
    "session_manager.py",
    "state_manager.py",
    "config.py",
    "logger.py",
    "utils.py",
    
    # Essential files
    "__init__.py",
    "README.md",
    "requirements.txt",
    "session_handoff_template.json"
)

# ============================================================================
# FUNCTIONS
# ============================================================================

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Get-FileSize {
    param([string]$Path)
    if (Test-Path $Path) {
        $size = (Get-Item $Path).Length
        if ($size -gt 1MB) { return "{0:N2} MB" -f ($size / 1MB) }
        elseif ($size -gt 1KB) { return "{0:N2} KB" -f ($size / 1KB) }
        else { return "$size bytes" }
    }
    return "N/A"
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

Write-ColorOutput "`n========================================" "Cyan"
Write-ColorOutput "  PRISM PROJECT FOLDER CLEANUP v1.0" "Cyan"
Write-ColorOutput "========================================`n" "Cyan"

# Check if project folder exists
if (-not (Test-Path $ProjectFolder)) {
    Write-ColorOutput "ERROR: Project folder not found at: $ProjectFolder" "Red"
    Write-ColorOutput "Please edit the script and set the correct path." "Yellow"
    exit 1
}

Write-ColorOutput "Project folder: $ProjectFolder" "White"
Write-ColorOutput "Archive folder: $ArchiveFolder" "White"
Write-ColorOutput "`n"

# ============================================================================
# PHASE 1: Analysis
# ============================================================================

Write-ColorOutput "PHASE 1: Analyzing files..." "Yellow"

$archiveCount = 0
$archiveSize = 0
$keepCount = 0
$keepSize = 0
$unknownFiles = @()

# Check files to archive
foreach ($file in $FilesToArchive) {
    $path = Join-Path $ProjectFolder $file
    if (Test-Path $path) {
        $archiveCount++
        $archiveSize += (Get-Item $path).Length
    }
}

# Check files to keep
foreach ($file in $FilesToKeep) {
    $path = Join-Path $ProjectFolder $file
    if (Test-Path $path) {
        $keepCount++
        $keepSize += (Get-Item $path).Length
    }
}

# Find unknown files (not in either list)
$allFiles = Get-ChildItem -Path $ProjectFolder -File -ErrorAction SilentlyContinue
foreach ($file in $allFiles) {
    if ($file.Name -notin $FilesToArchive -and $file.Name -notin $FilesToKeep) {
        $unknownFiles += $file.Name
    }
}

Write-ColorOutput "`nAnalysis Results:" "Green"
Write-ColorOutput "  Files to archive: $archiveCount ({0:N2} MB)" -f ($archiveSize / 1MB) "Yellow"
Write-ColorOutput "  Files to keep:    $keepCount ({0:N2} MB)" -f ($keepSize / 1MB) "Green"
Write-ColorOutput "  Unknown files:    $($unknownFiles.Count)" "Cyan"

if ($unknownFiles.Count -gt 0) {
    Write-ColorOutput "`n  Unknown files (will be left in place):" "Cyan"
    foreach ($f in $unknownFiles) {
        Write-ColorOutput "    - $f" "Gray"
    }
}

# ============================================================================
# PHASE 2: Confirmation
# ============================================================================

Write-ColorOutput "`n========================================" "Yellow"
Write-ColorOutput "  READY TO ARCHIVE $archiveCount FILES" "Yellow"
Write-ColorOutput "========================================`n" "Yellow"

$confirm = Read-Host "Proceed with archiving? (yes/no)"

if ($confirm -ne "yes") {
    Write-ColorOutput "`nOperation cancelled." "Red"
    exit 0
}

# ============================================================================
# PHASE 3: Create folders and move files
# ============================================================================

Write-ColorOutput "`nPHASE 2: Creating archive folder..." "Yellow"

# Create archive folder
if (-not (Test-Path $ArchiveFolder)) {
    New-Item -ItemType Directory -Path $ArchiveFolder -Force | Out-Null
    Write-ColorOutput "  Created: $ArchiveFolder" "Green"
}

# Create subfolders for organization
$subfolders = @(
    "prompts_old",
    "skills_old",
    "python_old",
    "generators",
    "validators",
    "utilities",
    "templates"
)

foreach ($sub in $subfolders) {
    $subPath = Join-Path $ArchiveFolder $sub
    if (-not (Test-Path $subPath)) {
        New-Item -ItemType Directory -Path $subPath -Force | Out-Null
    }
}

Write-ColorOutput "`nPHASE 3: Moving files to archive..." "Yellow"

$movedCount = 0
$errorCount = 0

foreach ($file in $FilesToArchive) {
    $sourcePath = Join-Path $ProjectFolder $file
    
    if (Test-Path $sourcePath) {
        # Determine destination subfolder
        $destSubfolder = "utilities"
        if ($file -match "PRISM_|PROTOCOL|RULES|PHASE|PATHS|ROADMAP|UPDATE|SESSION_START|API_INTEGRATION|CLAUDE_CODE|SKILL_UPLOAD") {
            $destSubfolder = "prompts_old"
        }
        elseif ($file -match "SKILL|skill") {
            $destSubfolder = "skills_old"
        }
        elseif ($file -match "orchestrator|unified_system.*v[0-3]") {
            $destSubfolder = "python_old"
        }
        elseif ($file -match "generator|steels_|materials_") {
            $destSubfolder = "generators"
        }
        elseif ($file -match "validator|checker|auditor|scanner") {
            $destSubfolder = "validators"
        }
        elseif ($file -match "TEMPLATE|\.bat$|\.json$") {
            $destSubfolder = "templates"
        }
        
        $destPath = Join-Path (Join-Path $ArchiveFolder $destSubfolder) $file
        
        try {
            Move-Item -Path $sourcePath -Destination $destPath -Force
            Write-ColorOutput "  MOVED: $file -> _ARCHIVED/$destSubfolder/" "Green"
            $movedCount++
        }
        catch {
            Write-ColorOutput "  ERROR: Failed to move $file - $_" "Red"
            $errorCount++
        }
    }
}

# ============================================================================
# PHASE 4: Summary
# ============================================================================

Write-ColorOutput "`n========================================" "Cyan"
Write-ColorOutput "  CLEANUP COMPLETE" "Cyan"
Write-ColorOutput "========================================`n" "Cyan"

Write-ColorOutput "Results:" "White"
Write-ColorOutput "  Files moved:    $movedCount" "Green"
Write-ColorOutput "  Errors:         $errorCount" "Red"
Write-ColorOutput "  Files kept:     $keepCount" "Green"

Write-ColorOutput "`nArchive location:" "White"
Write-ColorOutput "  $ArchiveFolder" "Cyan"

Write-ColorOutput "`n========================================" "Yellow"
Write-ColorOutput "  NEXT STEPS" "Yellow"
Write-ColorOutput "========================================`n" "Yellow"

Write-ColorOutput "1. Upload to Claude Project Knowledge:" "White"
Write-ColorOutput "   _PRISM_MASTER\PROJECT_KNOWLEDGE_UPLOAD\PRISM_COMPLETE_SYSTEM_v8.md" "Cyan"

Write-ColorOutput "`n2. Remove from Project Knowledge (if uploaded):" "White"
Write-ColorOutput "   - PRISM_BATTLE_READY_v11.md" "Gray"
Write-ColorOutput "   - PRISM_UNIFIED_SYSTEM_v10.md" "Gray"
Write-ColorOutput "   - Any other old prompt versions" "Gray"

Write-ColorOutput "`n3. Keep these Level 0 skills in Project Knowledge:" "White"
Write-ColorOutput "   - prism-life-safety-mindset_SKILLv2.md" "Green"
Write-ColorOutput "   - prism-maximum-completeness_SKILL.md" "Green"
Write-ColorOutput "   - prism-predictive-thinking_SKILL.md" "Green"
Write-ColorOutput "   - prism-skill-orchestrator_v5_SKILL.md" "Green"
Write-ColorOutput "   - regression_skill_v2.md" "Green"

Write-ColorOutput "`n4. Review archive folder and delete if not needed after 30 days" "Yellow"

Write-ColorOutput "`nDone!" "Green"
