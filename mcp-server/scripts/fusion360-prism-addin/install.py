"""
PRISM Fusion 360 Add-In Installer
==================================
One-click installer that deploys the add-in to the correct Fusion 360 folder.

Usage:
    python install.py            Copy mode (default). Per-machine independent.
    python install.py --link     Junction mode. Deployed folder is a Windows
                                 directory junction that points back to this
                                 source folder, so edits on the source drive
                                 (e.g. H:) are visible to Fusion on every
                                 machine that has the same junction. No admin
                                 required (uses mklink /J).

Multi-computer note: Fusion does not sync add-ins via your Autodesk login.
If you bounce between PCs that all see the same source drive (e.g. H:),
run `python install.py --link` once on each machine. From then on the
add-in is in lock-step with whatever you commit to the source folder.
"""

import os
import sys
import shutil
import json
import subprocess


def find_fusion_addins_folder():
    """Find Fusion 360's add-ins folder."""
    candidates = []

    # Windows
    appdata = os.environ.get("APPDATA", "")
    if appdata:
        path = os.path.join(appdata, "Autodesk", "Autodesk Fusion 360", "API", "AddIns")
        candidates.append(path)
        # Alternative path format
        path2 = os.path.join(appdata, "Autodesk", "Autodesk Fusion", "API", "AddIns")
        candidates.append(path2)

    # Mac
    home = os.path.expanduser("~")
    mac_path = os.path.join(home, "Library", "Application Support",
                            "Autodesk", "Autodesk Fusion 360", "API", "AddIns")
    candidates.append(mac_path)

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


def _is_junction(path):
    """True if path is a Windows directory junction or symlink."""
    try:
        # On Windows, both junctions and symlinks report as reparse points.
        return os.path.isdir(path) and os.path.islink(path) or (
            os.name == "nt" and os.path.isdir(path) and bool(
                os.lstat(path).st_file_attributes & 0x400  # FILE_ATTRIBUTE_REPARSE_POINT
            )
        )
    except (AttributeError, OSError):
        return False


def _remove_target(target_dir):
    """Remove an existing target whether it is a real folder or a junction."""
    if not os.path.exists(target_dir) and not os.path.islink(target_dir):
        return True
    try:
        if _is_junction(target_dir):
            # rmdir removes a junction without touching the source.
            os.rmdir(target_dir)
        else:
            shutil.rmtree(target_dir)
        return True
    except Exception as e:
        print(f"[WARNING] Could not remove old version: {e}")
        print("Close Fusion 360 and try again.")
        return False


# Add-in folders that have been folded INTO the unified PRISM_CAM_Optimizer
# add-in and should be auto-disabled if found alongside it. Fusion lists each
# manifest it finds under AddIns/, so a leftover legacy folder (e.g. the old
# standalone PRISM-ExcelBridge) shows up as a phantom second add-in unless we
# rename it with the .disabled suffix that Fusion's scanner skips.
LEGACY_ADDIN_FOLDERS = (
    "PRISM-ExcelBridge",     # standalone CAD-from-Excel bridge — now a sub-module
    "PRISMBridge",           # earlier prototype bridge
)
LEGACY_ADDIN_IDS = (
    "prism_cam_optimizer",   # ours, but matches stale .bak/copy folders
    "prism_excel_bridge",    # ExcelBridge manifest id
    "prism_bridge",          # original PRISMBridge manifest id
)


def _disable_duplicate_siblings(fusion_dir, keep):
    """Rename sibling add-in folders that conflict with our unified add-in.

    Two strategies, both required:
      1. Manifest id check — case-insensitive match against LEGACY_ADDIN_IDS
         catches stale .bak folders + copies that still expose a manifest.
      2. Folder name check — catches legacy add-ins whose manifest id is fine
         on its own, but whose function we've absorbed (Excel Bridge, etc).

    The .disabled suffix is Fusion's standard skip-this-folder marker, so the
    files are preserved (not deleted) but Fusion ignores them on next launch.
    """
    if not os.path.isdir(fusion_dir):
        return
    for entry in os.listdir(fusion_dir):
        if entry == keep or entry.endswith(".disabled"):
            continue
        full = os.path.join(fusion_dir, entry)
        if not os.path.isdir(full):
            continue

        should_disable = False
        reason = ""

        # Strategy 2 (cheap, no I/O): exact name match on legacy folders.
        if entry in LEGACY_ADDIN_FOLDERS:
            should_disable = True
            reason = "legacy add-in folded into PRISM_CAM_Optimizer"

        # Strategy 1: open any *.manifest inside and check the id.
        if not should_disable:
            try:
                manifests = [f for f in os.listdir(full)
                             if f.lower().endswith(".manifest")]
            except OSError:
                continue
            for mf in manifests:
                try:
                    with open(os.path.join(full, mf), "r", encoding="utf-8") as fp:
                        data = json.load(fp)
                except (OSError, json.JSONDecodeError):
                    continue
                addin_id = str(data.get("id", "")).lower()
                if addin_id in LEGACY_ADDIN_IDS:
                    should_disable = True
                    reason = f"manifest id={addin_id}"
                    break

        if not should_disable:
            continue

        new_name = entry + ".disabled"
        try:
            os.rename(full, os.path.join(fusion_dir, new_name))
            print(f"  [disabled] {entry} -> {new_name}  ({reason})")
        except OSError as e:
            print(f"  [WARNING] could not disable {entry}: {e}")


def _create_junction(source_dir, target_dir):
    """Create a Windows directory junction. No admin required."""
    if os.name != "nt":
        print("[ERROR] --link mode is Windows-only (uses mklink /J).")
        return False
    # mklink target source — order is opposite of `ln -s`.
    result = subprocess.run(
        ["cmd", "/c", "mklink", "/J", target_dir, source_dir],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"[ERROR] mklink failed: {result.stderr.strip() or result.stdout.strip()}")
        return False
    print(result.stdout.strip())
    return True


def install(link_mode=False):
    """Install PRISM add-in to Fusion 360.

    link_mode=False: copy all listed files into the deployed folder (default).
    link_mode=True:  create a directory junction so the deployed folder IS the
                     source folder. Edits to the source are visible to Fusion
                     immediately on every machine that has the same junction.
    """
    print("=" * 50)
    print("  PRISM Fusion 360 Add-In Installer")
    if link_mode:
        print("  MODE: --link (junction to source)")
    print("=" * 50)
    print()

    # Find source
    source_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Source: {source_dir}")

    # In link mode, the source MUST contain the two REQUIRED files up front,
    # otherwise the junction will publish a non-loadable add-in to Fusion.
    if link_mode:
        for required in ("PRISM_CAM_Optimizer.py", "PRISM_CAM_Optimizer.manifest"):
            if not os.path.exists(os.path.join(source_dir, required)):
                print(f"[ERROR] Source folder missing required file: {required}")
                print("Cannot create junction — fix source first, then re-run.")
                return False

    # Find Fusion folder
    fusion_dir = find_fusion_addins_folder()
    if not fusion_dir:
        print("\n[ERROR] Could not find Fusion 360 Add-Ins folder.")
        print("Please manually copy this folder to:")
        print("  %APPDATA%\\Autodesk\\Autodesk Fusion 360\\API\\AddIns\\")
        return False

    target_dir = os.path.join(fusion_dir, "PRISM_CAM_Optimizer")
    print(f"Target: {target_dir}")

    # Disable any sibling folders whose manifest declares the same add-in id.
    # Fusion lists each manifest it finds, so a leftover .bak folder will show
    # up as a phantom second copy of "PRISM CAM Optimizer".
    _disable_duplicate_siblings(fusion_dir, keep=os.path.basename(target_dir))

    # Check if already installed
    if os.path.exists(target_dir) or os.path.islink(target_dir):
        kind = "junction" if _is_junction(target_dir) else "folder"
        print(f"\n[INFO] PRISM add-in already installed ({kind}). Replacing...")
        if not _remove_target(target_dir):
            return False

    # ── Junction mode: link target -> source, done ─────────────────
    if link_mode:
        print("\nCreating directory junction...")
        if not _create_junction(source_dir, target_dir):
            return False
        print(f"  [OK] junction: {target_dir} -> {source_dir}")
        print("\n" + "=" * 50)
        print("  JUNCTION INSTALL COMPLETE!")
        print("=" * 50)
        print()
        print("The deployed add-in IS the source folder. Edits on the source")
        print("drive are seen by Fusion immediately (after restart). Run this")
        print("same command once on each PC to keep all of them in sync.")
        print()
        print("Next: open Fusion -> Utilities > ADD-INS, find 'PRISM CAM")
        print("Optimizer', check 'Run on Startup', click Run.")
        print()
        return True

    # ── Copy mode: deploy individual files ─────────────────────────
    # Copy files
    # Fusion 360 loads <FolderName>.py + <FolderName>.manifest from the deployed
    # add-in folder. Both files MUST match the folder name exactly (the folder
    # is created as "PRISM_CAM_Optimizer" above), or the add-in will not appear
    # in Utilities → ADD-INS.
    print("\nCopying files...")
    files_to_copy = [
        "PRISM_CAM_Optimizer.py",        # entry-point shim (REQUIRED by Fusion loader)
        "PRISM_CAM_Optimizer.manifest",  # manifest (REQUIRED, must match .py basename)
        "prism_addin.py",                # implementation (delegated to by the shim)
        "prism_api_client.py",
        "prism_bridge.py",
        "prism_operation_writer.py",
        "tool_library_sync.py",
        "auto_cam.py",
        "panel.html",
        "PRISM.cps",
        "FUSION_INTEGRATION_GUIDE.md",
    ]

    try:
        os.makedirs(target_dir, exist_ok=True)

        # These two MUST be deployed for Fusion to register the add-in.
        REQUIRED = {"PRISM_CAM_Optimizer.py", "PRISM_CAM_Optimizer.manifest"}
        missing_required = []

        for filename in files_to_copy:
            src = os.path.join(source_dir, filename)
            dst = os.path.join(target_dir, filename)
            if os.path.exists(src):
                shutil.copy2(src, dst)
                print(f"  [OK] {filename}")
            else:
                if filename in REQUIRED:
                    missing_required.append(filename)
                    print(f"  [MISSING] {filename} (REQUIRED, not found in source)")
                else:
                    print(f"  [skip] {filename} (not found)")

        if missing_required:
            print(f"\n[ERROR] Required files missing from source: {missing_required}")
            print("Fusion will NOT show the add-in without these files.")
            return False

        # Copy settings if they exist
        settings_src = os.path.join(source_dir, "prism_settings.json")
        if os.path.exists(settings_src):
            shutil.copy2(settings_src, os.path.join(target_dir, "prism_settings.json"))

        # Copy the excel_bridge sub-package (CAD-from-Excel watcher folded
        # into the unified add-in). copytree doesn't merge into existing
        # dirs on older Pythons, but target_dir was just rmtree'd above.
        excel_src = os.path.join(source_dir, "excel_bridge")
        excel_dst = os.path.join(target_dir, "excel_bridge")
        if os.path.isdir(excel_src):
            shutil.copytree(excel_src, excel_dst)
            print(f"  [OK] excel_bridge/ ({sum(len(f) for _, _, f in os.walk(excel_src))} files)")

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
    print("First time: Select material -> Click Optimize All -> Done!")
    print()

    return True


if __name__ == "__main__":
    link_mode = "--link" in sys.argv
    success = install(link_mode=link_mode)
    # Pause so users running by double-click see the result. Tolerate
    # non-interactive stdin (Git Bash, CI, piped runs).
    try:
        if sys.stdin.isatty():
            input("\n" + (
                "Installation successful! Press Enter to exit..."
                if success else "Press Enter to exit..."
            ))
    except (EOFError, KeyboardInterrupt):
        pass
    sys.exit(0 if success else 1)
