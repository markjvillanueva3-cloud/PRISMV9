/**
 * PPAGIReportGeneratorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPAGIReportGeneratorEngine,
  ppAGIReportGeneratorEngine,
} from "../engines/PPAGIReportGeneratorEngine.js";
import { ppJobScenarioAdvisorEngine } from "../engines/PPJobScenarioAdvisorEngine.js";
import { ppGCodeProgramAnalyzerEngine } from "../engines/PPGCodeProgramAnalyzerEngine.js";
import { ppAGIProgramLibraryAuditorEngine } from "../engines/PPAGIProgramLibraryAuditorEngine.js";
import { ppAGISystemDashboardEngine } from "../engines/PPAGISystemDashboardEngine.js";
import { ppAGIReasoningWorkflowEngine } from "../engines/PPAGIReasoningWorkflowEngine.js";
import { ppControllerEmbeddingEngine } from "../engines/PPControllerEmbeddingEngine.js";
import { ppMachineVectorEncoderEngine } from "../engines/PPMachineVectorEncoderEngine.js";
import { ppMaterialPropertyVectorEngine } from "../engines/PPMaterialPropertyVectorEngine.js";

function scenario() {
  const c = ppControllerEmbeddingEngine.embedAll();
  const m = ppMachineVectorEncoderEngine.embedAll();
  const mat = ppMaterialPropertyVectorEngine.embedAll();
  if (!c.length || !m.length || !mat.length) return null;
  return {
    controller_id: c[0].controller_id,
    machine_id: m[0].machine_id,
    material_id: mat[0].material_id,
  };
}

const SAMPLE_GCODE = `%
O1001
G90 G21 G17
T1 M6
S5000 M3 M8
G0 X0 Y0 Z5
G1 Z-2 F200
G1 X50 F500
M30
%`;

describe("PPAGIReportGeneratorEngine", () => {
  it("exports singleton", () => {
    expect(ppAGIReportGeneratorEngine).toBeInstanceOf(PPAGIReportGeneratorEngine);
  });

  describe("jobAdviceReport", () => {
    it("generates markdown report from advice", () => {
      const s = scenario();
      if (!s) return;
      const advice = ppJobScenarioAdvisorEngine.advise(s);
      const report = ppAGIReportGeneratorEngine.jobAdviceReport(advice);
      expect(report).toContain("# Job Advice Report");
      expect(report).toContain("Confidence");
      expect(report).toContain("Controller Advice");
      expect(report).toContain("Material");
      expect(report).toContain("Next Actions");
    });

    it("includes job ID", () => {
      const s = scenario();
      if (!s) return;
      const advice = ppJobScenarioAdvisorEngine.advise(s);
      const report = ppAGIReportGeneratorEngine.jobAdviceReport(advice);
      expect(report).toContain(advice.job_id);
    });

    it("includes tracker ID", () => {
      const s = scenario();
      if (!s) return;
      const advice = ppJobScenarioAdvisorEngine.advise(s);
      const report = ppAGIReportGeneratorEngine.jobAdviceReport(advice);
      expect(report).toContain(advice.tracker_id);
    });

    it("formats risks with severity icons", () => {
      const s = scenario();
      if (!s) return;
      const advice = ppJobScenarioAdvisorEngine.advise({
        ...s,
        safety: { machine_category: "lathe", has_sub_spindle: true },
      });
      const report = ppAGIReportGeneratorEngine.jobAdviceReport(advice);
      if (advice.risks.length > 0) {
        expect(report).toMatch(/🔴|🟡|ℹ️/);
      }
    });
  });

  describe("programAnalysisReport", () => {
    it("generates markdown from program report", () => {
      const rep = ppGCodeProgramAnalyzerEngine.analyze(SAMPLE_GCODE);
      const md = ppAGIReportGeneratorEngine.programAnalysisReport(rep);
      expect(md).toContain("# G-Code Program Analysis");
      expect(md).toContain("Program Metrics");
      expect(md).toContain("Controller Inference");
    });

    it("includes quality score", () => {
      const rep = ppGCodeProgramAnalyzerEngine.analyze(SAMPLE_GCODE);
      const md = ppAGIReportGeneratorEngine.programAnalysisReport(rep);
      expect(md).toContain("Quality");
    });

    it("includes source file when provided", () => {
      const rep = ppGCodeProgramAnalyzerEngine.analyze(SAMPLE_GCODE, "test.nc");
      const md = ppAGIReportGeneratorEngine.programAnalysisReport(rep);
      expect(md).toContain("test.nc");
    });

    it("formats metrics as table", () => {
      const rep = ppGCodeProgramAnalyzerEngine.analyze(SAMPLE_GCODE);
      const md = ppAGIReportGeneratorEngine.programAnalysisReport(rep);
      expect(md).toContain("| Metric |");
      expect(md).toContain("| Lines |");
    });
  });

  describe("libraryAuditReport", () => {
    it("generates markdown from audit", () => {
      const audit = ppAGIProgramLibraryAuditorEngine.audit([
        { source_file: "a.nc", gcode: SAMPLE_GCODE },
        { source_file: "b.nc", gcode: SAMPLE_GCODE },
      ]);
      const md = ppAGIReportGeneratorEngine.libraryAuditReport(audit);
      expect(md).toContain("# Program Library Audit");
      expect(md).toContain("Controller Distribution");
      expect(md).toContain("Quality Statistics");
    });

    it("shows quality stats in table", () => {
      const audit = ppAGIProgramLibraryAuditorEngine.audit([
        { source_file: "a.nc", gcode: SAMPLE_GCODE },
      ]);
      const md = ppAGIReportGeneratorEngine.libraryAuditReport(audit);
      expect(md).toContain("| Min |");
      expect(md).toContain("| Max |");
    });
  });

  describe("dashboardReport", () => {
    it("generates markdown from dashboard", () => {
      const dash = ppAGISystemDashboardEngine.getDashboard();
      const md = ppAGIReportGeneratorEngine.dashboardReport(dash);
      expect(md).toContain("# PP-AGI System Dashboard");
      expect(md).toContain("Embedding Engines");
      expect(md).toContain("Learning State");
    });

    it("shows all 7 embedding engines in table", () => {
      const dash = ppAGISystemDashboardEngine.getDashboard();
      const md = ppAGIReportGeneratorEngine.dashboardReport(dash);
      expect(md).toContain("Controller");
      expect(md).toContain("Machine");
      expect(md).toContain("Material");
      expect(md).toContain("Tool");
      expect(md).toContain("Physics");
      expect(md).toContain("Safety");
      expect(md).toContain("Toolpath");
    });

    it("includes capabilities section", () => {
      const dash = ppAGISystemDashboardEngine.getDashboard();
      const md = ppAGIReportGeneratorEngine.dashboardReport(dash);
      expect(md).toContain("Capabilities");
    });
  });

  describe("workflowReport", () => {
    it("generates markdown from workflow", () => {
      const s = scenario();
      if (!s) return;
      const wf = ppAGIReasoningWorkflowEngine.run("risk_assessment", { scenario: s });
      const md = ppAGIReportGeneratorEngine.workflowReport(wf);
      expect(md).toContain("# Workflow Report");
      expect(md).toContain(wf.workflow_type);
    });

    it("shows execution trace", () => {
      const s = scenario();
      if (!s) return;
      const wf = ppAGIReasoningWorkflowEngine.run("new_job_setup", { job: s });
      const md = ppAGIReportGeneratorEngine.workflowReport(wf);
      expect(md).toContain("Execution Trace");
      expect(md).toContain("Step 1");
    });

    it("shows recommendation", () => {
      const s = scenario();
      if (!s) return;
      const wf = ppAGIReasoningWorkflowEngine.run("risk_assessment", { scenario: s });
      const md = ppAGIReportGeneratorEngine.workflowReport(wf);
      expect(md).toContain("Recommendation");
    });

    it("shows duration", () => {
      const s = scenario();
      if (!s) return;
      const wf = ppAGIReasoningWorkflowEngine.run("program_review", { gcode: SAMPLE_GCODE });
      const md = ppAGIReportGeneratorEngine.workflowReport(wf);
      expect(md).toContain("Duration");
    });
  });

  describe("executiveSummary", () => {
    it("returns a single paragraph", () => {
      const s = scenario();
      if (!s) return;
      const advice = ppJobScenarioAdvisorEngine.advise(s);
      const summary = ppAGIReportGeneratorEngine.executiveSummary(advice);
      expect(summary.length).toBeGreaterThan(0);
      expect(summary).toContain("confidence");
      expect(summary).toContain("recommendation");
    });

    it("is concise (under 500 chars)", () => {
      const s = scenario();
      if (!s) return;
      const advice = ppJobScenarioAdvisorEngine.advise(s);
      const summary = ppAGIReportGeneratorEngine.executiveSummary(advice);
      expect(summary.length).toBeLessThan(500);
    });
  });
});
