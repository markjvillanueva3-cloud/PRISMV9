#!/bin/bash
# PRISM Fusion 360 Bridge — Install Script (macOS/Linux)
# Copies the add-in to Fusion 360's AddIns directory

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# macOS default path
ADDIN_DIR="$HOME/Library/Application Support/Autodesk/Autodesk Fusion 360/API/AddIns/PRISMBridge"

# Check if running on Linux (Fusion 360 not natively supported but for WSL)
if [[ "$(uname)" == "Linux" ]]; then
    ADDIN_DIR="$HOME/.local/share/Autodesk/Autodesk Fusion 360/API/AddIns/PRISMBridge"
fi

echo "============================================"
echo " PRISM Fusion 360 Bridge Installer"
echo "============================================"
echo

# Create directory
mkdir -p "$ADDIN_DIR"

# Copy files
cp "$SCRIPT_DIR/fusion360_api_server.py" "$ADDIN_DIR/"
cp "$SCRIPT_DIR/fusion360_api_server.manifest" "$ADDIN_DIR/"

echo "Files installed to:"
echo "  $ADDIN_DIR"
echo
echo "Next steps:"
echo "  1. Open Fusion 360"
echo "  2. Utilities > Add-Ins > PRISMBridge > Run"
echo "  3. Server starts on http://localhost:18360"
echo
echo "Use in PRISM: /fusion-export-tools --live"
