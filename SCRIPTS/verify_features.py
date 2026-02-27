"""
PRISM Feature Verifier v1.0
Verifies that all required UI features exist in build files

Usage:
    python verify_features.py <build_file_or_dir>
    python verify_features.py <build_file_or_dir> --manifest <manifest_json>
"""

import sys
import os
import json
import re
from datetime import datetime

# Default 85+ UI Features to verify
DEFAULT_FEATURES = [
    # Core Calculator Features
    "speedFeedCalculator",
    "materialSelector",
    "toolSelector", 
    "machineSelector",
    "operationSelector",
    "depthOfCutInput",
    "widthOfCutInput",
    "spindleSpeedOutput",
    "feedRateOutput",
    "chipLoadOutput",
    "mrr_output",
    "powerConsumption",
    "torqueOutput",
    
    # Tool Database Features
    "toolLibrary",
    "toolSearch",
    "toolFilter",
    "toolDetails",
    "addCustomTool",
    "editTool",
    "deleteTool",
    "toolImport",
    "toolExport",
    
    # Material Database Features
    "materialLibrary",
    "materialSearch",
    "materialProperties",
    "addCustomMaterial",
    "materialGrades",
    "hardnessInput",
    
    # Machine Features
    "machineLibrary",
    "machineSpecs",
    "machineEnvelope",
    "spindleTorqueCurve",
    "rapidRates",
    "axisLimits",
    
    # AI/ML Features
    "aiRecommendations",
    "confidenceInterval",
    "learningFeedback",
    "optimizationSuggestions",
    "xaiExplanation",
    "predictionHistory",
    
    # Physics Engine Features
    "chatterPrediction",
    "thermalAnalysis",
    "forceCalculation",
    "deflectionAnalysis",
    "wearPrediction",
    "surfaceFinishPrediction",
    
    # Post Processor Features
    "postSelector",
    "gCodePreview",
    "postCustomization",
    "macroSupport",
    "cycleGeneration",
    
    # Business Features
    "quotingEngine",
    "costEstimator",
    "cycleTimePredictor",
    "setupTimeEstimator",
    "profitMargin",
    
    # UI Components
    "darkModeToggle",
    "unitToggle",
    "saveSettings",
    "loadSettings",
    "exportResults",
    "printReport",
    "helpTooltips",
    "inputValidation",
    "errorHandling",
    "loadingIndicator",
    "progressBar",
    "tabNavigation",
    "modalDialogs",
    "dropdownMenus",
    "searchBar",
    "filterPanel",
    "sortOptions",
    "paginationControls",
    
    # Data Visualization
    "chartDisplay",
    "graphRendering",
    "3dVisualization",
    "torqueCurveChart",
    "stabilityLobeDiagram",
    
    # Import/Export
    "csvImport",
    "csvExport",
    "jsonExport",
    "pdfExport",
    "stepFileImport",
    
    # Collaboration
    "saveProject",
    "loadProject",
    "shareResults",
    "userPreferences"
]

def load_manifest(manifest_path):
    """Load feature manifest from JSON"""
    with open(manifest_path, 'r') as f:
        return json.load(f)

def scan_file(file_path, features):
    """Scan single file for feature references"""
    found = set()
    missing = set(features)
    
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    for feature in features:
        # Check for various patterns: id, class, function name, variable
        patterns = [
            f'id="{feature}"',
            f"id='{feature}'",
            f'class="{feature}"',
            f"class='{feature}'",
            f'function {feature}',
            f'const {feature}',
            f'let {feature}',
            f'var {feature}',
            f'"{feature}"',
            f"'{feature}'",
            f'.{feature}',
            f'#{feature}',
            feature  # Raw string match as fallback
        ]
        
        for pattern in patterns:
            if pattern in content:
                found.add(feature)
                missing.discard(feature)
                break
    
    return found, missing

def scan_directory(dir_path, features):
    """Scan all HTML/JS files in directory"""
    all_found = set()
    
    for root, dirs, files in os.walk(dir_path):
        # Skip node_modules and hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'node_modules']
        
        for file in files:
            if file.endswith(('.html', '.js', '.jsx', '.ts', '.tsx', '.vue')):
                file_path = os.path.join(root, file)
                found, _ = scan_file(file_path, features)
                all_found.update(found)
    
    missing = set(features) - all_found
    return all_found, missing

def generate_report(found, missing, output_path=None):
    """Generate verification report"""
    total = len(found) + len(missing)
    percentage = (len(found) / total * 100) if total > 0 else 0
    
    report = f"""
╔══════════════════════════════════════════════════════════════╗
║            PRISM FEATURE VERIFICATION REPORT                  ║
╠══════════════════════════════════════════════════════════════╣
║  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                            ║
╠══════════════════════════════════════════════════════════════╣
║  SUMMARY                                                      ║
║  ────────────────────────────────────────────────────────────║
║  Total Features:    {total:4d}                                     ║
║  Found:             {len(found):4d}  ✅                                ║
║  Missing:           {len(missing):4d}  ❌                                ║
║  Coverage:          {percentage:5.1f}%                                  ║
╠══════════════════════════════════════════════════════════════╣
"""
    
    if missing:
        report += "║  MISSING FEATURES                                             ║\n"
        report += "║  ────────────────────────────────────────────────────────────║\n"
        for feature in sorted(missing):
            report += f"║  ❌ {feature:<56} ║\n"
    else:
        report += "║  ✅ ALL FEATURES VERIFIED!                                    ║\n"
    
    report += "╚══════════════════════════════════════════════════════════════╝\n"
    
    if output_path:
        with open(output_path, 'w') as f:
            f.write(report)
        print(f"Report saved to {output_path}")
    
    return report

def console_check(build_path):
    """Generate browser console verification code"""
    code = """
// PRISM Feature Manifest Verification
// Paste this into browser console to verify features

(function() {
    const features = %s;
    
    const results = {found: [], missing: []};
    
    features.forEach(f => {
        const exists = 
            document.getElementById(f) ||
            document.querySelector('.' + f) ||
            document.querySelector('[data-feature="' + f + '"]') ||
            typeof window[f] !== 'undefined';
        
        if (exists) {
            results.found.push(f);
        } else {
            results.missing.push(f);
        }
    });
    
    console.log('=== PRISM Feature Verification ===');
    console.log('Found:', results.found.length);
    console.log('Missing:', results.missing.length);
    console.log('Coverage:', (results.found.length / features.length * 100).toFixed(1) + '%%');
    
    if (results.missing.length > 0) {
        console.warn('Missing features:', results.missing);
    }
    
    return results;
})();
""" % json.dumps(DEFAULT_FEATURES[:20])  # First 20 for console snippet
    
    return code

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    target = sys.argv[1]
    features = DEFAULT_FEATURES
    
    # Check for custom manifest
    if '--manifest' in sys.argv:
        manifest_idx = sys.argv.index('--manifest')
        if manifest_idx + 1 < len(sys.argv):
            manifest_data = load_manifest(sys.argv[manifest_idx + 1])
            features = manifest_data.get('features', DEFAULT_FEATURES)
    
    # Scan target
    if os.path.isfile(target):
        found, missing = scan_file(target, features)
    elif os.path.isdir(target):
        found, missing = scan_directory(target, features)
    else:
        print(f"Error: {target} not found")
        sys.exit(1)
    
    # Generate and print report
    report = generate_report(found, missing)
    print(report)
    
    # Exit with error code if features missing
    sys.exit(0 if len(missing) == 0 else 1)
