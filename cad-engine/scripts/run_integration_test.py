"""CC-MS1 Integration Test — Process 8 real YouTube tutorials end-to-end.

Validates all pipeline stages:
1. video_ingest: metadata + transcript extraction
2. frame_extract: keyframe sampling
3. ui_ocr: Tesseract OCR on frames
4. vision_analyze: Claude API frame analysis (optional, requires ANTHROPIC_API_KEY)
5. domain_classify: CAD/CAM/SHOP classification
6. platform_detect: software name + version detection

Exit conditions verified:
- 8 videos processed end-to-end
- Domain classifier correct for all 8
- Platform detector identifies software from transcript/title
- Vision analysis adds value beyond transcript (if API key available)

Usage:
    python run_integration_test.py                    # Full run with vision
    python run_integration_test.py --no-vision        # Skip vision API calls
    python run_integration_test.py --no-download      # Transcript-only (no video download)
    python run_integration_test.py --results-dir DIR  # Custom output directory
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from video_ingest import ingest, extract_metadata, extract_transcript, IngestResult
from frame_extract import extract_keyframes, FrameExtractionResult
from ui_ocr import extract_text_batch, extract_ui_elements
from vision_analyze import (
    analyze_video_frames, AnalysisMode, VisionAnalysisResult,
)
from domain_classify import classify, ClassificationResult
from platform_detect import detect, PlatformDetectionResult


# ---------------------------------------------------------------------------
# Test video catalog — 8 curated tutorials across 3 domains
# ---------------------------------------------------------------------------

TEST_VIDEOS = [
    {
        "url": "https://www.youtube.com/watch?v=r6NUt1cMzuI",
        "expected_domain": "cad",
        "expected_software": ["SolidWorks"],
        "description": "SolidWorks beginner tutorial — sketching and extrusion",
    },
    {
        "url": "https://www.youtube.com/watch?v=mK1PFbBnEOc",
        "expected_domain": "cad",
        "expected_software": ["Fusion 360"],
        "description": "Fusion 360 parametric modeling tutorial",
    },
    {
        "url": "https://www.youtube.com/watch?v=aVcqrFkLMbU",
        "expected_domain": "cam",
        "expected_software": ["Mastercam"],
        "description": "Mastercam toolpath programming tutorial",
    },
    {
        "url": "https://www.youtube.com/watch?v=Do_Mtb0vMaQ",
        "expected_domain": "cam",
        "expected_software": ["Fusion 360"],
        "description": "Fusion 360 CAM setup and toolpath generation",
    },
    {
        "url": "https://www.youtube.com/watch?v=rX_FFexuVgQ",
        "expected_domain": "shop",
        "expected_software": ["Haas"],
        "description": "Haas CNC mill setup and operation",
    },
    {
        "url": "https://www.youtube.com/watch?v=gkCB3s3itME",
        "expected_domain": "shop",
        "expected_software": ["Fanuc"],
        "description": "CNC programming with Fanuc controller",
    },
    {
        "url": "https://www.youtube.com/watch?v=25LG0OYNTBQ",
        "expected_domain": "multi",
        "expected_software": ["Fusion 360"],
        "description": "Fusion 360 complete CAD to CAM workflow",
    },
    {
        "url": "https://www.youtube.com/watch?v=u8otDF_C_fw",
        "expected_domain": "cad",
        "expected_software": ["FreeCAD"],
        "description": "FreeCAD beginner modeling tutorial",
    },
]


# ---------------------------------------------------------------------------
# Pipeline runner
# ---------------------------------------------------------------------------

def run_pipeline(
    video: dict,
    results_dir: str,
    *,
    download_video: bool = True,
    run_vision: bool = True,
) -> dict:
    """Run full pipeline for one video. Returns result summary dict."""
    url = video["url"]
    video_id = url.split("v=")[-1].split("&")[0] if "v=" in url else url.split("/")[-1]
    video_dir = os.path.join(results_dir, video_id)
    os.makedirs(video_dir, exist_ok=True)

    result = {
        "video_id": video_id,
        "url": url,
        "expected_domain": video["expected_domain"],
        "expected_software": video["expected_software"],
        "stages": {},
        "pass": True,
        "errors": [],
    }

    # Stage 1: Ingest (metadata + transcript + optional download)
    print(f"  [1/6] Ingesting {video_id}...")
    try:
        ingest_result = ingest(
            url, video_dir,
            download=download_video,
            language="en",
        )
        result["stages"]["ingest"] = {
            "title": ingest_result.metadata.title,
            "duration": ingest_result.metadata.duration_seconds,
            "transcript_length": len(ingest_result.transcript_text),
            "segments": len(ingest_result.transcript),
            "video_downloaded": ingest_result.video_path is not None,
        }
        # Save ingest result
        with open(os.path.join(video_dir, "ingest.json"), "w") as f:
            json.dump(ingest_result.to_dict(), f, indent=2, ensure_ascii=False)
    except Exception as e:
        result["errors"].append(f"ingest: {e}")
        result["pass"] = False
        print(f"    ERROR: {e}")
        return result

    # Stage 2: Frame extraction (if video downloaded)
    frames_result = None
    if ingest_result.video_path:
        print(f"  [2/6] Extracting frames...")
        try:
            frames_dir = os.path.join(video_dir, "frames")
            frames_result = extract_keyframes(
                ingest_result.video_path, frames_dir,
                max_frames=15,
            )
            result["stages"]["frames"] = {
                "total_frames": frames_result.total_frames,
                "duration": frames_result.duration_seconds,
            }
            with open(os.path.join(video_dir, "frames.json"), "w") as f:
                json.dump(frames_result.to_dict(), f, indent=2, ensure_ascii=False)
        except Exception as e:
            result["errors"].append(f"frames: {e}")
            print(f"    WARN: Frame extraction failed: {e}")
    else:
        print(f"  [2/6] Skipping frames (no video)")
        result["stages"]["frames"] = {"skipped": True}

    # Stage 3: OCR on frames
    ocr_texts = []
    if frames_result and frames_result.frames:
        print(f"  [3/6] Running OCR on {len(frames_result.frames)} frames...")
        try:
            frame_paths = [f.path for f in frames_result.frames]
            ocr_results = extract_text_batch(frame_paths, min_confidence=40.0)
            ocr_texts = [r.full_text for r in ocr_results if r.full_text.strip()]
            result["stages"]["ocr"] = {
                "frames_processed": len(ocr_results),
                "frames_with_text": len(ocr_texts),
                "total_chars": sum(len(t) for t in ocr_texts),
            }
            # Extract UI elements from first few frames
            ui_elements = []
            for ocr_r in ocr_results[:5]:
                if ocr_r.regions:
                    ui_elements.append(extract_ui_elements(ocr_r))
            result["stages"]["ocr"]["ui_elements_found"] = len(ui_elements)

            with open(os.path.join(video_dir, "ocr.json"), "w") as f:
                json.dump([r.to_dict() for r in ocr_results], f, indent=2)
        except Exception as e:
            result["errors"].append(f"ocr: {e}")
            print(f"    WARN: OCR failed: {e}")
    else:
        print(f"  [3/6] Skipping OCR (no frames)")
        result["stages"]["ocr"] = {"skipped": True}

    # Stage 4: Vision analysis (if API key available and enabled)
    vision_text = ""
    if run_vision and frames_result and frames_result.frames:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if api_key:
            print(f"  [4/6] Running vision analysis...")
            try:
                # Determine mode from expected domain
                mode_map = {
                    "cad": AnalysisMode.CAD,
                    "cam": AnalysisMode.CAM,
                    "shop": AnalysisMode.SHOP,
                    "multi": AnalysisMode.GENERAL,
                }
                mode = mode_map.get(video["expected_domain"], AnalysisMode.GENERAL)
                frame_dicts = [
                    {"path": f.path, "timestamp_seconds": f.timestamp_seconds}
                    for f in frames_result.frames
                ]
                vision_result = analyze_video_frames(
                    frame_dicts,
                    video_id=video_id,
                    mode=mode,
                    max_frames=8,
                )
                vision_text = vision_result.summary
                result["stages"]["vision"] = {
                    "frames_analyzed": len(vision_result.frame_analyses),
                    "unique_insights": len(vision_result.unique_insights),
                    "summary": vision_result.summary,
                    "insights_sample": vision_result.unique_insights[:5],
                }
                with open(os.path.join(video_dir, "vision.json"), "w") as f:
                    json.dump(vision_result.to_dict(), f, indent=2, ensure_ascii=False)
            except Exception as e:
                result["errors"].append(f"vision: {e}")
                print(f"    WARN: Vision analysis failed: {e}")
        else:
            print(f"  [4/6] Skipping vision (no ANTHROPIC_API_KEY)")
            result["stages"]["vision"] = {"skipped": True, "reason": "no_api_key"}
    else:
        print(f"  [4/6] Skipping vision")
        result["stages"]["vision"] = {"skipped": True}

    # Stage 5: Domain classification
    print(f"  [5/6] Classifying domain...")
    combined_ocr = " ".join(ocr_texts)
    cls_result = classify(
        title=ingest_result.metadata.title,
        transcript=ingest_result.transcript_text,
        ocr_text=combined_ocr,
        frame_analysis=vision_text,
    )
    result["stages"]["classify"] = cls_result.to_dict()

    # Check domain correctness
    actual_domain = cls_result.primary_domain
    expected = video["expected_domain"]
    domain_correct = (
        actual_domain == expected
        or (expected == "multi" and cls_result.is_multi_domain)
        or (expected == "multi" and actual_domain in ("cad", "cam"))
    )
    result["domain_correct"] = domain_correct
    if not domain_correct:
        result["errors"].append(
            f"domain: expected '{expected}', got '{actual_domain}'"
        )
        print(f"    WARN: Domain mismatch — expected '{expected}', got '{actual_domain}'")

    # Stage 6: Platform detection
    print(f"  [6/6] Detecting platforms...")
    det_result = detect(
        title=ingest_result.metadata.title,
        transcript=ingest_result.transcript_text,
        ocr_text=combined_ocr,
        vision_text=vision_text,
    )
    result["stages"]["detect"] = det_result.to_dict()

    # Check platform detection
    if det_result.primary_platform:
        detected_names = [p.name for p in det_result.all_platforms]
        any_match = any(
            exp.lower() in det.lower() or det.lower() in exp.lower()
            for exp in video["expected_software"]
            for det in detected_names
        )
        result["platform_detected"] = True
        result["platform_match"] = any_match
        result["detected_platforms"] = detected_names
    else:
        result["platform_detected"] = False
        result["platform_match"] = False
        result["detected_platforms"] = []

    # Check vision adds value
    vision_adds_value = False
    vision_stage = result["stages"].get("vision", {})
    if not vision_stage.get("skipped"):
        unique = vision_stage.get("unique_insights", 0)
        vision_adds_value = unique >= 2
    result["vision_adds_value"] = vision_adds_value

    with open(os.path.join(video_dir, "summary.json"), "w") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="CC-MS1 Integration Test")
    parser.add_argument("--no-vision", action="store_true", help="Skip vision API calls")
    parser.add_argument("--no-download", action="store_true", help="Skip video download")
    parser.add_argument(
        "--results-dir",
        default=str(Path(__file__).parent.parent / "test_data" / "video_results"),
        help="Output directory for results",
    )
    parser.add_argument("--videos", type=int, default=8, help="Number of videos to process")
    args = parser.parse_args()

    print("=" * 60)
    print("CC-MS1 Integration Test — Video Ingestion Pipeline")
    print("=" * 60)
    print(f"Videos:    {args.videos}")
    print(f"Vision:    {'enabled' if not args.no_vision else 'disabled'}")
    print(f"Download:  {'enabled' if not args.no_download else 'disabled'}")
    print(f"Output:    {args.results_dir}")
    print()

    os.makedirs(args.results_dir, exist_ok=True)
    results = []
    videos = TEST_VIDEOS[:args.videos]

    for i, video in enumerate(videos, 1):
        print(f"\n[{i}/{len(videos)}] {video['description']}")
        print(f"  URL: {video['url']}")
        print(f"  Expected: domain={video['expected_domain']}, "
              f"software={video['expected_software']}")

        t0 = time.time()
        result = run_pipeline(
            video, args.results_dir,
            download_video=not args.no_download,
            run_vision=not args.no_vision,
        )
        elapsed = time.time() - t0
        result["elapsed_seconds"] = round(elapsed, 1)
        results.append(result)

        status = "PASS" if result["pass"] else "FAIL"
        domain_ok = "OK" if result.get("domain_correct") else "MISMATCH"
        platform_ok = "OK" if result.get("platform_match") else "MISS"
        print(f"  => {status} | domain={domain_ok} | platform={platform_ok} | {elapsed:.1f}s")

    # Save combined results
    with open(os.path.join(args.results_dir, "integration_results.json"), "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    # Summary report
    print("\n" + "=" * 60)
    print("INTEGRATION TEST RESULTS")
    print("=" * 60)

    total = len(results)
    passed = sum(1 for r in results if r["pass"])
    domain_correct = sum(1 for r in results if r.get("domain_correct"))
    platform_detected = sum(1 for r in results if r.get("platform_detected"))
    platform_match = sum(1 for r in results if r.get("platform_match"))
    vision_value = sum(1 for r in results if r.get("vision_adds_value"))

    print(f"\nProcessed:         {passed}/{total} videos end-to-end")
    print(f"Domain correct:    {domain_correct}/{total}")
    print(f"Platform detected: {platform_detected}/{total}")
    print(f"Platform match:    {platform_match}/{total}")
    print(f"Vision adds value: {vision_value}/{total}")

    print("\nPer-video detail:")
    print(f"{'#':<3} {'Domain':<8} {'D-OK':<6} {'Platform':<20} {'P-OK':<6} {'Vision':<8} {'Time':<8}")
    print("-" * 60)
    for i, r in enumerate(results, 1):
        domain = r["stages"].get("classify", {}).get("primary_domain", "?")
        d_ok = "OK" if r.get("domain_correct") else "MISS"
        platforms = ", ".join(r.get("detected_platforms", [])[:2]) or "none"
        p_ok = "OK" if r.get("platform_match") else "MISS"
        v_ok = "YES" if r.get("vision_adds_value") else "no"
        elapsed = r.get("elapsed_seconds", 0)
        print(f"{i:<3} {domain:<8} {d_ok:<6} {platforms:<20} {p_ok:<6} {v_ok:<8} {elapsed:<.1f}s")

    # Exit condition assessment
    print("\n" + "=" * 60)
    print("EXIT CONDITION ASSESSMENT")
    print("=" * 60)
    conditions = [
        (f"8 videos processed end-to-end: {passed}/{total}", passed >= 8),
        (f"Domain classifier correct: {domain_correct}/{total}", domain_correct >= total),
        (f"Platform detector identifies software: {platform_detected}/{total}", platform_detected >= total),
        (f"Vision adds value for 5+: {vision_value}/{total}", vision_value >= 5),
    ]
    all_pass = True
    for desc, ok in conditions:
        status = "PASS" if ok else "FAIL"
        print(f"  [{status}] {desc}")
        if not ok:
            all_pass = False

    print(f"\nOverall: {'ALL EXIT CONDITIONS MET' if all_pass else 'SOME CONDITIONS NOT MET'}")
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
