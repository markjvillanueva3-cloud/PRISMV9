"""
PRISM Fusion 360 Add-In Installer
==================================
One-click installer that copies the add-in to the correct Fusion 360 folder.

Usage: python install.py
"""

import os
import sys
import shutil
import json


def find_fusion_addins_folder():
    """Find Fusion 360's add-ins folder."""
    candidates = []

    # Windows — Standard release
    appdata = os.environ.get("APPDATA", "")
    if appdata:
        path = os.path.join(appdata, "Autodesk", "Autodesk Fusion 360", "API", "AddIns")
        candidates.append(path)
        # Alternative path format (newer Fusion)
        path2 = os.path.join(appdata, "Autodesk", "Autodesk Fusion", "API", "AddIns")
        candidates.append(path2)

    # Windows — Insider/Beta build
    localappdata = os.environ.get("LOCALAPPDATA", "")
    if localappdata:
        # Insider builds often use LocalAppData
        path3 = os.path.join(localappdata, "Autodesk", "webdeploy", "production")
        if os.path.exists(path3):
            # Find the most recent hash folder
            for item in sorted(os.listdir(path3), reverse=True):
                insider_path = os.path.join(path3, item, "API", "AddIns")
                if os.path.exists(os.path.dirname(insider_path)):
                    candidates.append(insider_path)
                    break

    # Windows — Common user API folder (works for all builds)
    if appdata:
        # This is the universal add-in path that works across all Fusion builds
        user_api = os.path.join(appdata, "Autodesk", "ApplicationPlugins")
        candidates.append(os.path.join(user_api))

    # Mac
    home = os.path.expanduser("~")
    mac_path = os.path.join(home, "Library", "Application Support",
                            "Autodesk", "Autodesk Fusion 360", "API", "AddIns")
    candidates.append(mac_path)
    mac_path2 = os.path.join(home, "Library", "Application Support",
                             "Autodesk", "Autodesk Fusion", "API", "AddIns")
    candidates.append(mac_path2)

    for path in candidates:
        if os.path.exists(path):
            return path
        # Try creating it
        try:
            os.makedirs(path, exist_ok=True)
            if os.path.exists(path):
                return path
        except Exception:
            pass

    return None


def install():
    """Install PRISM add-in to Fusion 360."""
    print("=" * 50)
    print("  PRISM Fusion 360 Add-In Installer")
    print("=" * 50)
    print()

    # Find source
    source_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Source: {source_dir}")

    # Find Fusion folder
    fusion_dir = find_fusion_addins_folder()
    if not fusion_dir:
        print("\n[ERROR] Could not find Fusion 360 Add-Ins folder.")
        print("Please manually copy this folder to:")
        print("  %APPDATA%\\Autodesk\\Autodesk Fusion 360\\API\\AddIns\\")
        return False

    target_dir = os.path.join(fusion_dir, "PRISM_CAM_Optimizer")
    print(f"Target: {target_dir}")

    # Check if already installed
    if os.path.exists(target_dir):
        print("\n[INFO] PRISM add-in already installed. Updating...")
        try:
            shutil.rmtree(target_dir)
        except Exception as e:
            print(f"[WARNING] Could not remove old version: {e}")
            print("Close Fusion 360 and try again.")
            return False

    # Copy files
    print("\nCopying files...")
    files_to_copy = [
        "prism_addin.py",
        "prism_api_client.py",
        "prism_bridge.py",
        "prism_operation_writer.py",
        "panel.html",
        "tool_library_sync.py",
        "auto_cam.py",
        "prism_cam_optimizer.manifest",
        "PRISM.cps",
        "FUSION_INTEGRATION_GUIDE.md",
    ]

    try:
        os.makedirs(target_dir, exist_ok=True)

        for filename in files_to_copy:
            src = os.path.join(source_dir, filename)
            dst = os.path.join(target_dir, filename)
            if os.path.exists(src):
                shutil.copy2(src, dst)
                print(f"  ✓ {filename}")
            else:
                print(f"  ⚠ {filename} (not found, skipping)")

        # Copy settings if they exist
        settings_src = os.path.join(source_dir, "prism_settings.json")
        if os.path.exists(settings_src):
            shutil.copy2(settings_src, os.path.join(target_dir, "prism_settings.json"))

    except Exception as e:
        print(f"\n[ERROR] Copy failed: {e}")
        return False

    print("\n" + "=" * 50)
    print("  INSTALLATION COMPLETE!")
    print("=" * 50)
    print()
    print("Next steps:")
    print("  1. Start PRISM server: cd C:\\PRISM\\mcp-server && npm start")
    print("  2. Open Fusion 360")
    print("  3. Go to Utilities > ADD-INS (or press Shift+S)")
    print("  4. Find 'PRISM CAM Optimizer' in Add-Ins tab")
    print("  5. Check 'Run on Startup'")
    print("  6. Click 'Run'")
    print("  7. Switch to Manufacturing workspace")
    print("  8. Click 'PRISM' in the toolbar")
    print()
    print("First time: Select material → Click Optimize All → Done!")
    print()

    return True


if __name__ == "__main__":
    success = install()
    if not success:
        input("\nPress Enter to exit...")
    else:
        input("\nInstallation successful! Press Enter to exit...")
