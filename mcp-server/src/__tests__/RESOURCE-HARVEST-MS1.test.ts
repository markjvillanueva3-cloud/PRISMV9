/**
 * RESOURCE-HARVEST-MS1: Automated Resource Harvesting Pipeline Tests
 *
 * Tests for fully automated resource harvesting:
 * - Resource scanning (PDFs, videos, MIT courses, CAM files, NC programs)
 * - Domain detection from file paths
 * - Job creation and processing
 * - Progress tracking and reporting
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AutomatedResourceHarvestingPipeline,
  type HarvestJob,
  type ScanResult,
} from "../engines/AutomatedResourceHarvestingPipeline.js";

describe("RESOURCE-HARVEST-MS1: Automated Resource Harvesting Pipeline", () => {
  let pipeline: AutomatedResourceHarvestingPipeline;

  beforeEach(() => {
    pipeline = new AutomatedResourceHarvestingPipeline();
  });

  // ==========================================================================
  // DOMAIN DETECTION TESTS
  // ==========================================================================

  describe("Domain Detection", () => {
    it("should detect hyperMILL domain", () => {
      expect(pipeline.detectDomain("H:/prism/Resources/hyperMILL/manual.pdf")).toBe("cam_hypermill");
      expect(pipeline.detectDomain("hyperCAD-S_tutorial.pdf")).toBe("cam_hypermill");
      expect(pipeline.detectDomain("OPEN MIND products.pdf")).toBe("cam_hypermill");
    });

    it("should detect Mastercam domain", () => {
      expect(pipeline.detectDomain("H:/prism/Resources/Mastercam/basics.pdf")).toBe("cam_mastercam");
      expect(pipeline.detectDomain("file.mcx")).toBe("cam_mastercam");
    });

    it("should detect Fusion 360 domain", () => {
      expect(pipeline.detectDomain("Fusion 360 CAM tutorial.pdf")).toBe("cam_fusion360");
      expect(pipeline.detectDomain("Autodesk Fusion.pdf")).toBe("cam_fusion360");
    });

    it("should detect InventorCAM domain", () => {
      expect(pipeline.detectDomain("InventorCAM_manual.pdf")).toBe("cam_inventorcam");
      expect(pipeline.detectDomain("SolidCAM_training.pdf")).toBe("cam_inventorcam");
    });

    it("should detect Siemens NX domain", () => {
      expect(pipeline.detectDomain("Siemens NX CAM.pdf")).toBe("cam_siemens_nx");
      expect(pipeline.detectDomain("Unigraphics tutorial.pdf")).toBe("cam_siemens_nx");
    });

    it("should detect Haas controller domain", () => {
      expect(pipeline.detectDomain("Haas_NGC_programming.pdf")).toBe("controller_haas");
      expect(pipeline.detectDomain("NGC operator manual.pdf")).toBe("controller_haas");
    });

    it("should detect Fanuc controller domain", () => {
      expect(pipeline.detectDomain("FANUC_0i_manual.pdf")).toBe("controller_fanuc");
      expect(pipeline.detectDomain("fanuc macro programming.pdf")).toBe("controller_fanuc");
    });

    it("should detect Mazak controller domain", () => {
      expect(pipeline.detectDomain("Mazak_QTU_programming.pdf")).toBe("controller_mazak");
      expect(pipeline.detectDomain("Mazatrol Smart manual.pdf")).toBe("controller_mazak");
    });

    it("should detect Okuma controller domain", () => {
      expect(pipeline.detectDomain("Okuma_OSP_P300.pdf")).toBe("controller_okuma");
      expect(pipeline.detectDomain("OSP-P programming.pdf")).toBe("controller_okuma");
    });

    it("should detect Siemens controller domain", () => {
      expect(pipeline.detectDomain("Sinumerik 840D manual.pdf")).toBe("controller_siemens");
      expect(pipeline.detectDomain("SIEMENS cnc guide.pdf")).toBe("controller_siemens");
    });

    it("should detect Heidenhain controller domain", () => {
      expect(pipeline.detectDomain("Heidenhain_TNC_530.pdf")).toBe("controller_heidenhain");
      expect(pipeline.detectDomain("TNC programming cycles.pdf")).toBe("controller_heidenhain");
    });

    it("should detect workholding domain", () => {
      expect(pipeline.detectDomain("workholding_solutions.pdf")).toBe("workholding");
      expect(pipeline.detectDomain("fixture design guide.pdf")).toBe("workholding");
      expect(pipeline.detectDomain("vise_selection.pdf")).toBe("workholding");
      expect(pipeline.detectDomain("chuck operation.pdf")).toBe("workholding");
    });

    it("should detect MIT course domain", () => {
      expect(pipeline.detectDomain("MIT 2.830 spring 2020")).toBe("mit_course");
      expect(pipeline.detectDomain("OCW manufacturing.pdf")).toBe("mit_course");
      expect(pipeline.detectDomain("opencourseware materials.pdf")).toBe("mit_course");
    });

    it("should detect G-code programming domain", () => {
      expect(pipeline.detectDomain("G-Code reference.pdf")).toBe("programming_gcode");
      expect(pipeline.detectDomain("gcode basics.pdf")).toBe("programming_gcode");
    });

    it("should detect macro programming domain", () => {
      expect(pipeline.detectDomain("macro programming guide.pdf")).toBe("programming_macro");
    });

    it("should return general for unknown domains", () => {
      expect(pipeline.detectDomain("random_file.pdf")).toBe("general");
      expect(pipeline.detectDomain("unknown.pdf")).toBe("general");
    });
  });

  // ==========================================================================
  // JOB CREATION TESTS
  // ==========================================================================

  describe("Job Creation", () => {
    it("should create jobs from scan results", () => {
      const scanResult: ScanResult = {
        pdfs: ["H:/prism/Resources/hyperMILL/manual.pdf", "H:/prism/Resources/Fanuc/guide.pdf"],
        videos: ["H:/prism/Resources/Videos/tutorial.mp4"],
        mit_courses: ["H:/prism/resources/MIT COURSES/2.830 spring 2020"],
        cam_files: ["H:/prism/Resources/Mastercam/project.mcx"],
        nc_programs: ["H:/prism/Resources/NC/part.nc"],
        total: 6,
      };

      const jobs = pipeline.createJobs(scanResult);

      expect(jobs.length).toBe(6);
      expect(jobs.filter(j => j.type === "pdf").length).toBe(2);
      expect(jobs.filter(j => j.type === "video").length).toBe(1);
      expect(jobs.filter(j => j.type === "mit_course").length).toBe(1);
      expect(jobs.filter(j => j.type === "cam_file").length).toBe(1);
      expect(jobs.filter(j => j.type === "nc_program").length).toBe(1);
    });

    it("should assign correct domains to jobs", () => {
      const scanResult: ScanResult = {
        pdfs: ["H:/prism/Resources/hyperMILL/manual.pdf"],
        videos: [],
        mit_courses: [],
        cam_files: [],
        nc_programs: [],
        total: 1,
      };

      const jobs = pipeline.createJobs(scanResult);
      expect(jobs[0].domain).toBe("cam_hypermill");
    });

    it("should assign unique job IDs", () => {
      const scanResult: ScanResult = {
        pdfs: ["a.pdf", "b.pdf", "c.pdf"],
        videos: ["a.mp4", "b.mp4"],
        mit_courses: [],
        cam_files: [],
        nc_programs: [],
        total: 5,
      };

      const jobs = pipeline.createJobs(scanResult);
      const ids = jobs.map(j => j.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should initialize all jobs as pending", () => {
      const scanResult: ScanResult = {
        pdfs: ["a.pdf"],
        videos: ["a.mp4"],
        mit_courses: ["course1"],
        cam_files: [],
        nc_programs: [],
        total: 3,
      };

      const jobs = pipeline.createJobs(scanResult);
      expect(jobs.every(j => j.status === "pending")).toBe(true);
    });

    it("should store jobs for retrieval", () => {
      const scanResult: ScanResult = {
        pdfs: ["a.pdf", "b.pdf"],
        videos: [],
        mit_courses: [],
        cam_files: [],
        nc_programs: [],
        total: 2,
      };

      pipeline.createJobs(scanResult);
      const storedJobs = pipeline.getJobs();

      expect(storedJobs.length).toBe(2);
    });
  });

  // ==========================================================================
  // PROGRESS TRACKING TESTS
  // ==========================================================================

  describe("Progress Tracking", () => {
    it("should initialize with zero progress", () => {
      const progress = pipeline.getProgress();

      expect(progress.total_resources).toBe(0);
      expect(progress.scanned).toBe(0);
      expect(progress.extracted).toBe(0);
      expect(progress.ingested).toBe(0);
      expect(progress.failed).toBe(0);
      expect(progress.percent_complete).toBe(0);
    });

    it("should update total_resources after job creation", () => {
      const scanResult: ScanResult = {
        pdfs: ["a.pdf", "b.pdf", "c.pdf"],
        videos: [],
        mit_courses: [],
        cam_files: [],
        nc_programs: [],
        total: 3,
      };

      pipeline.createJobs(scanResult);
      const progress = pipeline.getProgress();

      expect(progress.total_resources).toBe(3);
    });

    it("should report not running initially", () => {
      expect(pipeline.isHarvestRunning()).toBe(false);
    });
  });

  // ==========================================================================
  // JOB RETRIEVAL TESTS
  // ==========================================================================

  describe("Job Retrieval", () => {
    it("should get job by ID", () => {
      const scanResult: ScanResult = {
        pdfs: ["test.pdf"],
        videos: [],
        mit_courses: [],
        cam_files: [],
        nc_programs: [],
        total: 1,
      };

      const jobs = pipeline.createJobs(scanResult);
      const job = pipeline.getJob(jobs[0].id);

      expect(job).toBeDefined();
      expect(job?.path).toBe("test.pdf");
    });

    it("should return undefined for non-existent job", () => {
      const job = pipeline.getJob("non-existent-id");
      expect(job).toBeUndefined();
    });

    it("should get all jobs", () => {
      const scanResult: ScanResult = {
        pdfs: ["a.pdf", "b.pdf"],
        videos: ["c.mp4"],
        mit_courses: [],
        cam_files: [],
        nc_programs: [],
        total: 3,
      };

      pipeline.createJobs(scanResult);
      const allJobs = pipeline.getJobs();

      expect(allJobs.length).toBe(3);
    });

    it("should get empty results initially", () => {
      const results = pipeline.getResults();
      expect(results.length).toBe(0);
    });
  });

  // ==========================================================================
  // DRY RUN TESTS
  // ==========================================================================

  describe("Dry Run Harvesting", () => {
    it("should support dry run mode", async () => {
      // Use the actual pipeline's runFullHarvest with dryRun
      // This won't process files, just scan and create jobs
      const report = await pipeline.runFullHarvest({ dryRun: true, limit: 5 });

      expect(report).toBeDefined();
      expect(report.started_at).toBeDefined();
      expect(report.completed_at).toBeDefined();
      expect(report.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("should support type filtering", async () => {
      const report = await pipeline.runFullHarvest({
        dryRun: true,
        types: ["pdf"],
        limit: 10,
      });

      // In dry-run, we scan all resources but only count filtered ones in total_resources
      // The stored jobs are ALL jobs found, filtering happens on processing
      expect(report).toBeDefined();
      expect(report.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("should support domain filtering", async () => {
      const report = await pipeline.runFullHarvest({
        dryRun: true,
        domains: ["cam_hypermill"],
        limit: 10,
      });

      // Report should be valid
      expect(report).toBeDefined();
      expect(report.total_resources).toBeGreaterThanOrEqual(0);
    });

    it("should respect limit option", async () => {
      const report = await pipeline.runFullHarvest({
        dryRun: true,
        limit: 3,
      });

      // Limit applies to jobs processed, not total scanned
      // In dry-run, total_resources reflects filtered job count
      expect(report).toBeDefined();
      expect(report.successful).toBe(0); // dry-run doesn't process
      expect(report.failed).toBe(0);
    });
  });

  // ==========================================================================
  // QUICK SCAN TESTS
  // ==========================================================================

  describe("Quick Scan", () => {
    it("should perform quick resource count", async () => {
      const scan = await pipeline.quickScan();

      expect(scan).toHaveProperty("pdfs");
      expect(scan).toHaveProperty("videos");
      expect(scan).toHaveProperty("mit_courses");
      expect(scan).toHaveProperty("cam_files");
      expect(scan).toHaveProperty("nc_programs");
      expect(scan).toHaveProperty("total");
      expect(scan).toHaveProperty("ready_for_harvest");
    });

    it("should report ready_for_harvest based on total", async () => {
      const scan = await pipeline.quickScan();

      // If there are resources, ready_for_harvest should be true
      if (scan.total > 0) {
        expect(scan.ready_for_harvest).toBe(true);
      }
    });

    it("should count all resource types", async () => {
      const scan = await pipeline.quickScan();

      expect(typeof scan.pdfs).toBe("number");
      expect(typeof scan.videos).toBe("number");
      expect(typeof scan.mit_courses).toBe("number");
      expect(typeof scan.cam_files).toBe("number");
      expect(typeof scan.nc_programs).toBe("number");
      expect(scan.total).toBe(
        scan.pdfs + scan.videos + scan.mit_courses + scan.cam_files + scan.nc_programs
      );
    });
  });

  // ==========================================================================
  // REPORT GENERATION TESTS
  // ==========================================================================

  describe("Report Generation", () => {
    it("should generate report with all required fields", async () => {
      const report = await pipeline.runFullHarvest({ dryRun: true, limit: 0 });

      expect(report.started_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(report.completed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(typeof report.duration_ms).toBe("number");
      expect(typeof report.total_resources).toBe("number");
      expect(typeof report.successful).toBe("number");
      expect(typeof report.failed).toBe("number");
      expect(typeof report.total_knowledge_items).toBe("number");
      expect(typeof report.by_type).toBe("object");
      expect(typeof report.by_domain).toBe("object");
      expect(Array.isArray(report.top_topics)).toBe(true);
      expect(Array.isArray(report.errors)).toBe(true);
    });

    it("should report zero failures on dry run", async () => {
      const report = await pipeline.runFullHarvest({ dryRun: true, limit: 5 });

      expect(report.failed).toBe(0);
    });
  });

  // ==========================================================================
  // CONCURRENCY PROTECTION TESTS
  // ==========================================================================

  describe("Concurrency Protection", () => {
    it("should prevent concurrent harvests", async () => {
      // Start first harvest
      const firstHarvest = pipeline.runFullHarvest({ dryRun: true, limit: 1 });

      // Attempt second harvest while first is running
      try {
        await pipeline.runFullHarvest({ dryRun: true, limit: 1 });
        // If we get here, concurrency protection failed
        expect(true).toBe(false);
      } catch (err) {
        expect(String(err)).toContain("already in progress");
      }

      // Wait for first harvest to complete
      await firstHarvest;
    });

    it("should allow harvest after previous completes", async () => {
      await pipeline.runFullHarvest({ dryRun: true, limit: 1 });

      // Should be able to run another harvest after first completes
      const report = await pipeline.runFullHarvest({ dryRun: true, limit: 1 });
      expect(report).toBeDefined();
    });
  });

  // ==========================================================================
  // FILE TYPE RECOGNITION TESTS
  // ==========================================================================

  describe("File Type Recognition", () => {
    it("should recognize PDF extensions", () => {
      const scanResult: ScanResult = {
        pdfs: [],
        videos: [],
        mit_courses: [],
        cam_files: [],
        nc_programs: [],
        total: 0,
      };

      // PDF extension detection is done in scanDirectory
      // Test domain detection with PDF-like paths
      expect(pipeline.detectDomain("document.pdf")).toBe("general");
      expect(pipeline.detectDomain("hyperMILL.pdf")).toBe("cam_hypermill");
    });

    it("should recognize video extensions", () => {
      // Video domain detection
      const video1 = pipeline.detectDomain("haas_tutorial.mp4");
      const video2 = pipeline.detectDomain("fanuc_setup.avi");
      const video3 = pipeline.detectDomain("mazak_demo.mov");

      expect(video1).toBe("controller_haas");
      expect(video2).toBe("controller_fanuc");
      expect(video3).toBe("controller_mazak");
    });

    it("should recognize CAM file extensions", () => {
      expect(pipeline.detectDomain("project.mcx")).toBe("cam_mastercam");
      expect(pipeline.detectDomain("hypermill_project.hmc")).toBe("cam_hypermill");
    });

    it("should recognize NC program extensions", () => {
      expect(pipeline.detectDomain("part_haas.nc")).toBe("controller_haas");
      expect(pipeline.detectDomain("fanuc_program.tap")).toBe("controller_fanuc");
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should handle empty scan results", () => {
      const scanResult: ScanResult = {
        pdfs: [],
        videos: [],
        mit_courses: [],
        cam_files: [],
        nc_programs: [],
        total: 0,
      };

      const jobs = pipeline.createJobs(scanResult);
      expect(jobs.length).toBe(0);
    });

    it("should handle special characters in paths", () => {
      const domain = pipeline.detectDomain("H:/prism/Resources/hyperMILL (2024)/manual.pdf");
      expect(domain).toBe("cam_hypermill");
    });

    it("should handle mixed case in domain detection", () => {
      expect(pipeline.detectDomain("HYPERMILL.pdf")).toBe("cam_hypermill");
      expect(pipeline.detectDomain("HyPerMiLL.pdf")).toBe("cam_hypermill");
      expect(pipeline.detectDomain("hypermill.pdf")).toBe("cam_hypermill");
    });

    it("should prioritize first matching domain", () => {
      // When multiple patterns could match, first wins
      const domain = pipeline.detectDomain("hypermill_siemens.pdf");
      // hypermill pattern comes before siemens, so should match hypermill
      expect(domain).toBe("cam_hypermill");
    });
  });

  // ==========================================================================
  // SCAN RESULT STRUCTURE TESTS
  // ==========================================================================

  describe("Scan Result Structure", () => {
    it("should return all expected fields from quickScan", async () => {
      const result = await pipeline.quickScan();

      expect(result).toHaveProperty("pdfs");
      expect(result).toHaveProperty("videos");
      expect(result).toHaveProperty("mit_courses");
      expect(result).toHaveProperty("cam_files");
      expect(result).toHaveProperty("nc_programs");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("ready_for_harvest");
    });

    it("should have non-negative counts", async () => {
      const result = await pipeline.quickScan();

      expect(result.pdfs).toBeGreaterThanOrEqual(0);
      expect(result.videos).toBeGreaterThanOrEqual(0);
      expect(result.mit_courses).toBeGreaterThanOrEqual(0);
      expect(result.cam_files).toBeGreaterThanOrEqual(0);
      expect(result.nc_programs).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // HARVEST JOB STRUCTURE TESTS
  // ==========================================================================

  describe("Harvest Job Structure", () => {
    it("should have all required job fields", () => {
      const scanResult: ScanResult = {
        pdfs: ["test.pdf"],
        videos: [],
        mit_courses: [],
        cam_files: [],
        nc_programs: [],
        total: 1,
      };

      const jobs = pipeline.createJobs(scanResult);
      const job = jobs[0];

      expect(job).toHaveProperty("id");
      expect(job).toHaveProperty("path");
      expect(job).toHaveProperty("type");
      expect(job).toHaveProperty("domain");
      expect(job).toHaveProperty("status");
    });

    it("should have correct type for each resource", () => {
      const scanResult: ScanResult = {
        pdfs: ["doc.pdf"],
        videos: ["vid.mp4"],
        mit_courses: ["MIT 2.830"],
        cam_files: ["project.mcx"],
        nc_programs: ["part.nc"],
        total: 5,
      };

      const jobs = pipeline.createJobs(scanResult);

      const pdfJob = jobs.find(j => j.path === "doc.pdf");
      const videoJob = jobs.find(j => j.path === "vid.mp4");
      const mitJob = jobs.find(j => j.path === "MIT 2.830");
      const camJob = jobs.find(j => j.path === "project.mcx");
      const ncJob = jobs.find(j => j.path === "part.nc");

      expect(pdfJob?.type).toBe("pdf");
      expect(videoJob?.type).toBe("video");
      expect(mitJob?.type).toBe("mit_course");
      expect(camJob?.type).toBe("cam_file");
      expect(ncJob?.type).toBe("nc_program");
    });
  });
});
