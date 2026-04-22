"""Remove dead engine exports from index.ts barrel."""
import re

DEAD_ENGINES = [
    "AnodizeAllowanceEngine", "AuditEngine", "BatchOptimizationEngine",
    "BendAllowanceEngine", "CacheEngine", "ClampingSimEngine",
    "ConfigEngine", "CostEstimationEngine", "CryogenicTreatmentEngine",
    "DampingOptimizationEngine", "DigitalTwinEngine", "EnergyOptimizationEngine",
    "EventEngine", "FixtureDesignEngine",
    "GearHobbingEngine", "HardnessConversionEngine", "HarmonicAnalysisEngine",
    "HealthEngine", "HeatTreatmentResponseEngine", "HybridLaserMachineEngine",
    "LaserCutInterfaceEngine", "LaserMarkingEngine", "LearningPathEngine",
    "LoggingEngine", "MachinabilityRatingEngine", "MachineSelectionEngine",
    "MagneticChuckEngine", "MaskingCalculatorEngine", "MaterialEquivalenceEngine",
    "MaterialSelectionEngine", "MetricsEngine", "MicrostructureEffectEngine",
    "MigrationEngine", "NestingEngine", "NotificationEngine",
    "PassivationEngine", "PlatingAllowanceEngine", "PluginEngine",
    "ProbeRoutineEngine", "ProcessPlanEngine", "QueueEngine",
    "QuoteEngine", "RateLimitEngine", "RecastLayerEngine",
    "RegenerativeChatterPredictor", "ShotPeeningEngine",
    "SoftJawProfileEngine", "SplineMillingEngine", "SurfaceFinishEngine",
    "TensileToMachinabilityEngine", "ThermalSimEngine", "ThinFloorVibrationEngine",
    "ThreadMillingEngine", "ThreeDPrintedFixtureEngine", "TombstoneLayoutEngine",
    "ToolCribEngine", "ToolSelectionEngine", "ToolholderDynamicsEngine",
    "TribalKnowledgeEngine", "TroubleshootingEngine", "WaterjetTaperEngine",
    "WebhookEngine", "WeldPrepEngine", "WhiteLayerDetectionEngine",
]

INDEX_PATH = "C:/PRISM/mcp-server/src/engines/index.ts"

with open(INDEX_PATH, "r") as f:
    content = f.read()

lines = content.split("\n")
original_count = len(lines)

# Build set of dead module filenames (without .js)
dead_modules = set(DEAD_ENGINES)

# Find and remove export blocks for dead engines
# Pattern: either single-line `export { ... } from "./DeadEngine.js";`
# or multi-line `export {\n  ...\n} from "./DeadEngine.js";`

new_lines = []
skip_until_from = False
block_buffer = []

i = 0
removed_count = 0
while i < len(lines):
    line = lines[i]

    # Check if this line starts an export block
    # Single-line: export { foo } from "./Module.js";
    single_match = re.match(r'^export\s+\{[^}]*\}\s+from\s+"\.\/(\w+)\.js"', line)
    if single_match:
        module = single_match.group(1)
        if module in dead_modules:
            removed_count += 1
            # Skip this line and any preceding comment
            if new_lines and new_lines[-1].strip().startswith("//"):
                new_lines.pop()  # Remove preceding comment
            # Also skip blank line after if exists
            if i + 1 < len(lines) and lines[i + 1].strip() == "":
                i += 1
            i += 1
            continue
        else:
            new_lines.append(line)
            i += 1
            continue

    # Multi-line export: starts with `export {`
    multi_start = re.match(r'^export\s+\{', line)
    if multi_start and "from" not in line:
        # Collect the entire block until `} from "./Module.js";`
        block = [line]
        j = i + 1
        while j < len(lines):
            block.append(lines[j])
            from_match = re.match(r'^}\s+from\s+"\.\/(\w+)\.js"', lines[j])
            if from_match:
                module = from_match.group(1)
                if module in dead_modules:
                    removed_count += 1
                    # Remove preceding comment if any
                    if new_lines and new_lines[-1].strip().startswith("//"):
                        new_lines.pop()
                    # Skip blank line after
                    if j + 1 < len(lines) and lines[j + 1].strip() == "":
                        j += 1
                    i = j + 1
                    break
                else:
                    new_lines.extend(block)
                    i = j + 1
                    break
            j += 1
        else:
            # Didn't find closing, just add the line
            new_lines.append(line)
            i += 1
        continue

    new_lines.append(line)
    i += 1

new_content = "\n".join(new_lines)

with open(INDEX_PATH, "w") as f:
    f.write(new_content)

print(f"Removed {removed_count} dead engine export blocks")
print(f"Lines: {original_count} -> {len(new_lines)} ({original_count - len(new_lines)} lines removed)")
print(f"Dead engines targeted: {len(DEAD_ENGINES)}")
if removed_count != len(DEAD_ENGINES):
    missed = set(DEAD_ENGINES)
    # Check which ones were found
    for eng in DEAD_ENGINES:
        if f'"{eng}' in content or f"/{eng}.js" in content:
            missed.discard(eng)
    print(f"Note: {len(DEAD_ENGINES) - removed_count} engines may have been missed or had unexpected format")
