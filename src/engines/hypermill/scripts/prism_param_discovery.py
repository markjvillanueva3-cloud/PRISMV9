"""
PRISM Parameter Discovery Script for hyperMILL v33+
Run this script inside hyperMILL's Python window to discover actual CfgParameter keys
for speed, feed, ap, ae, and all other cutting parameters.

Usage:
1. Open hyperMILL with a project that has at least one machining job
2. Go to Python window (View > Python)
3. Create a new project, paste this script, and run it
"""
import om
import om.cam.core as cam
import om.cam.gui as gui
import json
import os

OUTPUT_DIR = os.path.join(os.environ.get("USERPROFILE", "C:/Users/Default"), "PRISM_discovery")


def ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def discover_job_parameters():
    """Dump all CfgParameters from every job in the project."""
    app = om.GetApplication()
    cam_model = app.CurrentDocument.CamModel

    if cam_model is None:
        gui.ShowMessageBox("No CAM model found. Open a project with machining jobs first.",
                           gui.Severity.WARNING)
        return

    jobs = cam.GetCamEntities(cam.CamEntityFilter.ALL_CYCLE_JOBS)
    if not jobs:
        gui.ShowMessageBox("No cycle jobs found in this project.", gui.Severity.WARNING)
        return

    results = []
    for job in jobs:
        job_info = {
            "name": job.Name,
            "id": job.ID,
            "uuid": job.UUID,
            "jobType": job.JobType,
            "cycleName": getattr(job, "CycleName", "unknown"),
        }

        # Get all config parameters
        try:
            cfg_params = job.GetCfgParameters()
            job_info["cfgParameterCount"] = len(cfg_params)
            job_info["cfgParameters"] = dict(cfg_params)
        except Exception as e:
            job_info["cfgParameterError"] = str(e)

        # Get tool info
        try:
            tool = job.GetTool()
            if tool:
                job_info["tool"] = {
                    "name": tool.Name,
                    "id": tool.ID,
                    "uuid": tool.UUID,
                }
                try:
                    tool_cfg = tool.GetCfgParameters()
                    job_info["tool"]["cfgParameters"] = dict(tool_cfg)
                except Exception as e:
                    job_info["tool"]["cfgParameterError"] = str(e)
        except Exception as e:
            job_info["toolError"] = str(e)

        results.append(job_info)
        gui.Write(f"Discovered job: {job.Name} ({job.JobType}) - {len(job_info.get('cfgParameters', {}))} params")

    # Write results to file
    ensure_output_dir()
    output_path = os.path.join(OUTPUT_DIR, "job_parameters.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, default=str)

    gui.ShowMessageBox(
        f"Discovery complete!\n\n"
        f"Found {len(results)} jobs\n"
        f"Results saved to:\n{output_path}\n\n"
        f"Share this file with PRISM for parameter mapping.",
        gui.Severity.MESSAGE
    )
    return results


def discover_tools():
    """Dump all tools and their properties from the tool set."""
    app = om.GetApplication()
    cam_model = app.CurrentDocument.CamModel

    if cam_model is None:
        gui.ShowMessageBox("No CAM model found.", gui.Severity.WARNING)
        return

    tool_set = cam_model.ToolSet
    tools = tool_set.GetTools()

    results = []
    for tool in tools:
        tool_info = {
            "name": tool.Name,
            "id": tool.ID,
            "uuid": tool.UUID,
            "isMilling": tool.IsMillingTool(),
            "isDrilling": tool.IsDrillingTool(),
            "isTurning": tool.IsTurningTool(),
        }
        try:
            tool_cfg = tool.GetCfgParameters()
            tool_info["cfgParameters"] = dict(tool_cfg)
        except Exception as e:
            tool_info["cfgParameterError"] = str(e)

        results.append(tool_info)
        gui.Write(f"Discovered tool: {tool.Name} (ID={tool.ID})")

    ensure_output_dir()
    output_path = os.path.join(OUTPUT_DIR, "tool_parameters.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, default=str)

    gui.ShowMessageBox(
        f"Tool discovery complete!\n\n"
        f"Found {len(results)} tools\n"
        f"Results saved to:\n{output_path}",
        gui.Severity.MESSAGE
    )
    return results


def discover_features():
    """Dump all features from the feature list set."""
    app = om.GetApplication()
    cam_model = app.CurrentDocument.CamModel

    if cam_model is None:
        gui.ShowMessageBox("No CAM model found.", gui.Severity.WARNING)
        return

    features = cam.GetCamEntities(cam.CamEntityFilter.ALL_FEATURES)

    results = []
    for feat in features:
        feat_info = {
            "name": feat.Name,
            "uuid": feat.UUID,
        }
        try:
            feat_cfg = feat.GetCfgParameters()
            feat_info["cfgParameters"] = dict(feat_cfg)
        except Exception as e:
            feat_info["cfgParameterError"] = str(e)

        results.append(feat_info)

    ensure_output_dir()
    output_path = os.path.join(OUTPUT_DIR, "feature_parameters.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, default=str)

    gui.Write(f"Feature discovery complete: {len(results)} features")
    return results


def discover_system_info():
    """Dump system info and available macros."""
    app = om.GetApplication()
    sys_info = app.SystemInfo

    info = {
        "camVersion": sys_info.CamVersion,
        "camLanguage": sys_info.CamLanguage,
        "camGlobalWorkingSpace": sys_info.CamGlobalWorkingSpace,
        "camProjectsDirectory": sys_info.CamProjectsDirectory,
        "applicationFolder": sys_info.ApplicationFolder,
        "userFolder": sys_info.UserFolder,
        "productFolder": sys_info.ProductFolder,
    }

    ensure_output_dir()
    output_path = os.path.join(OUTPUT_DIR, "system_info.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(info, f, indent=2, default=str)

    gui.Write(f"System info: hyperMILL {info.get('camVersion', 'unknown')}")
    return info


if __name__ == "__main__":
    gui.Write("=" * 60)
    gui.Write("PRISM Parameter Discovery - Starting...")
    gui.Write("=" * 60)

    discover_system_info()
    discover_job_parameters()
    discover_tools()
    discover_features()

    gui.Write("=" * 60)
    gui.Write(f"All results saved to: {OUTPUT_DIR}")
    gui.Write("=" * 60)
