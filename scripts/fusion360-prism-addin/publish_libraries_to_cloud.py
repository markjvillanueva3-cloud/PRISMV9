# PRISM -- publish all Local PRISM_* tool libraries to the Fusion CLOUD so coworkers can access them.
#
# WHY (slot:romeo, 2026-06-21): JM Die's Fusion tool libraries are now all INCHES in the Local library
# (45 PRISM_* libraries). To share them with coworkers they must live in the team's CLOUD libraries
# (a Team/multi-user hub is REQUIRED -- a personal hub cannot share tool libraries, per Autodesk).
#
# HOW TO RUN (in YOUR signed-in Fusion, on a Team hub):
#   Fusion -> Utilities tab -> ADD-INS -> "Scripts and Add-Ins" -> Scripts -> green "+" -> add this
#   folder -> select "publish_libraries_to_cloud" -> Run. A dialog reports what was published.
#   (Cloud libraries must be enabled: Preferences -> General -> Manufacture -> "...cloud...".)
#
# API NOTES (verified against Fusion 2704, reference_fusion_live_tool_libraries_2026_06_15):
#   ToolLibraries has NO toolLibraryUrls; childAssetURLs returns a URLVector (iterate, NO .count);
#   URL has NO .clone(); importToolLibrary(url, ToolLibrary, name) imports a library OBJECT.
# This script is hardened against the two API details I could not verify offline (createFolder return
# type, URL.leafName): it falls back to the cloud root if a subfolder cannot be made, and parses the
# library name from the URL string if leafName is unavailable. It is idempotent-friendly -- re-running
# re-publishes (Fusion adds a counting suffix to a duplicate folder name).

import adsk.core
import adsk.cam
import traceback

CLOUD_FOLDER_NAME = "PRISM Tooling (inch)"
PREFIX = "PRISM_"


def _url_name(url):
    """Best-effort library/leaf name from a URL (URL.leafName, else parse toString())."""
    try:
        name = url.leafName
        if name:
            return name
    except Exception:
        pass
    try:
        return url.toString().rstrip("/").split("/")[-1]
    except Exception:
        return ""


def _walk_assets(tool_libs, folder_url):
    """All tool-library asset URLs under folder_url (recurses sub-folders). URLVector -> iterate."""
    found = []
    try:
        for asset_url in tool_libs.childAssetURLs(folder_url):
            found.append(asset_url)
    except Exception:
        pass
    try:
        for sub in tool_libs.childFolderURLs(folder_url):
            found.extend(_walk_assets(tool_libs, sub))
    except Exception:
        pass
    return found


def run(context):
    ui = None
    try:
        app = adsk.core.Application.get()
        ui = app.userInterface
        cam_mgr = adsk.cam.CAMManager.get()
        tool_libs = cam_mgr.libraryManager.toolLibraries

        local_root = tool_libs.urlByLocation(adsk.cam.LibraryLocations.LocalLibraryLocation)
        cloud_root = tool_libs.urlByLocation(adsk.cam.LibraryLocations.CloudLibraryLocation)
        if cloud_root is None:
            ui.messageBox(
                "No CLOUD tool-library location is available.\n\n"
                "Cloud libraries require a Team (multi-user) hub and must be enabled in\n"
                "Preferences -> General -> Manufacture. Sign in to your team hub and retry."
            )
            return

        # destination: a named cloud subfolder, falling back to the cloud root if unsupported.
        dest = cloud_root
        try:
            made = tool_libs.createFolder(cloud_root, CLOUD_FOLDER_NAME)
            if made is not None:
                dest = made
        except Exception:
            dest = cloud_root

        published, skipped, errors = [], [], []
        for lib_url in _walk_assets(tool_libs, local_root):
            name = _url_name(lib_url)
            if not name or not name.startswith(PREFIX):
                skipped.append(name)
                continue
            try:
                library = tool_libs.toolLibraryAtURL(lib_url)
                if library is None:
                    errors.append("{}: could not load".format(name))
                    continue
                tool_libs.importToolLibrary(dest, library, name)
                published.append(name)
            except Exception as exc:
                errors.append("{}: {}".format(name, exc))

        lines = [
            "PRISM tool libraries -> Cloud",
            "",
            "Published {} library(ies) to Cloud / '{}'.".format(len(published), CLOUD_FOLDER_NAME),
            "Skipped {} non-PRISM library(ies).".format(len(skipped)),
        ]
        if errors:
            lines.append("")
            lines.append("{} error(s):".format(len(errors)))
            lines.extend(errors[:12])
            if len(errors) > 12:
                lines.append("... +{} more".format(len(errors) - 12))
        lines.append("")
        lines.append("Open Manage -> Tool Library -> Cloud to confirm; coworkers on this hub now see them.")
        ui.messageBox("\n".join(lines))

    except Exception:
        if ui:
            ui.messageBox("PRISM cloud publish FAILED:\n\n{}".format(traceback.format_exc()))


def stop(context):
    pass
