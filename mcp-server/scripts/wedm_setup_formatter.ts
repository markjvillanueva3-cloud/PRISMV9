#!/usr/bin/env npx ts-node
/**
 * WEDM Setup Sheet Formatter Script
 * Phase 0.2 - WEDM AGI Roadmap
 *
 * Formats setup sheets for Wire EDM jobs in PDF/HTML.
 * Leverages: WEDMSetupSheetEngine, WEDMDocumentationEngine
 *
 * Usage: npx ts-node scripts/wedm_setup_formatter.ts --job O1234 --format html
 */

import * as fs from "fs";

interface SetupData {
  jobId: string;
  partName: string;
  customer: string;
  material: string;
  hardness?: string;
  thickness: number;
  quantity: number;
  dueDate: string;
  operator?: string;
  machine: string;
  ecode: string;
  wireType: string;
  wireDiameter: number;
  passes: number;
  estimatedTime: number;
  specialInstructions?: string[];
  qualityRequirements: {
    ra?: number;
    tolerance?: number;
    inspection?: string[];
  };
}

interface FormattedSetup {
  html: string;
  text: string;
  json: SetupData;
}

function formatSetupSheet(data: SetupData): FormattedSetup {
  const now = new Date().toISOString().split("T")[0];

  // Generate HTML
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>WEDM Setup Sheet - ${data.jobId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .section { margin: 15px 0; }
    .section-title { font-weight: bold; background: #eee; padding: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    td, th { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    .warning { color: #d63031; font-weight: bold; }
    .note { background: #ffeaa7; padding: 10px; border-radius: 5px; }
    .signature-line { border-top: 1px solid #333; width: 200px; margin-top: 30px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>WIRE EDM SETUP SHEET</h1>
    <h2>JM Die Company</h2>
    <p>Date: ${now} | Job: ${data.jobId}</p>
  </div>

  <div class="section">
    <div class="section-title">JOB INFORMATION</div>
    <table>
      <tr><th>Part Name</th><td>${data.partName}</td><th>Customer</th><td>${data.customer}</td></tr>
      <tr><th>Material</th><td>${data.material}${data.hardness ? ` (${data.hardness})` : ""}</td><th>Thickness</th><td>${data.thickness} mm</td></tr>
      <tr><th>Quantity</th><td>${data.quantity}</td><th>Due Date</th><td>${data.dueDate}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">MACHINE SETUP</div>
    <table>
      <tr><th>Machine</th><td>${data.machine}</td><th>E-Code</th><td>${data.ecode}</td></tr>
      <tr><th>Wire Type</th><td>${data.wireType}</td><th>Wire Diameter</th><td>${data.wireDiameter} mm</td></tr>
      <tr><th>Number of Passes</th><td>${data.passes}</td><th>Est. Cycle Time</th><td>${data.estimatedTime} min</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">QUALITY REQUIREMENTS</div>
    <table>
      <tr><th>Surface Finish (Ra)</th><td>${data.qualityRequirements.ra ? data.qualityRequirements.ra + " µm max" : "Per print"}</td></tr>
      <tr><th>Tolerance</th><td>${data.qualityRequirements.tolerance ? "±" + data.qualityRequirements.tolerance + " mm" : "Per print"}</td></tr>
      <tr><th>Inspection</th><td>${data.qualityRequirements.inspection?.join(", ") ?? "Standard inspection"}</td></tr>
    </table>
  </div>

  ${data.specialInstructions?.length ? `
  <div class="section">
    <div class="section-title warning">SPECIAL INSTRUCTIONS</div>
    <div class="note">
      <ul>
        ${data.specialInstructions.map((i) => `<li>${i}</li>`).join("\n")}
      </ul>
    </div>
  </div>
  ` : ""}

  <div class="section">
    <div class="section-title">SETUP CHECKLIST</div>
    <table>
      <tr><td>☐ Wire threaded and tensioned</td><td>☐ Workpiece squared and leveled</td></tr>
      <tr><td>☐ Reference point established</td><td>☐ Start hole(s) verified</td></tr>
      <tr><td>☐ Flushing nozzles positioned</td><td>☐ E-code verified for material</td></tr>
      <tr><td>☐ Program dry run complete</td><td>☐ First cut inspection plan ready</td></tr>
    </table>
  </div>

  <div class="section">
    <p>Setup Completed By: ______________________ Date: ________ Time: ________</p>
    <p>First Part Approved By: __________________ Date: ________ Time: ________</p>
  </div>

  <div class="no-print" style="margin-top: 30px; text-align: center;">
    <button onclick="window.print()">Print Setup Sheet</button>
  </div>
</body>
</html>
`;

  // Generate text version
  const text = `
================================================================================
                         WIRE EDM SETUP SHEET
                           JM Die Company
================================================================================
Date: ${now}
Job: ${data.jobId}

--- JOB INFORMATION ---
Part Name: ${data.partName}
Customer: ${data.customer}
Material: ${data.material}${data.hardness ? ` (${data.hardness})` : ""}
Thickness: ${data.thickness} mm
Quantity: ${data.quantity}
Due Date: ${data.dueDate}

--- MACHINE SETUP ---
Machine: ${data.machine}
E-Code: ${data.ecode}
Wire Type: ${data.wireType}
Wire Diameter: ${data.wireDiameter} mm
Number of Passes: ${data.passes}
Estimated Cycle Time: ${data.estimatedTime} min

--- QUALITY REQUIREMENTS ---
Surface Finish (Ra): ${data.qualityRequirements.ra ? data.qualityRequirements.ra + " µm max" : "Per print"}
Tolerance: ${data.qualityRequirements.tolerance ? "±" + data.qualityRequirements.tolerance + " mm" : "Per print"}
Inspection: ${data.qualityRequirements.inspection?.join(", ") ?? "Standard inspection"}

${data.specialInstructions?.length ? `--- SPECIAL INSTRUCTIONS ---
${data.specialInstructions.map((i) => `* ${i}`).join("\n")}
` : ""}
--- SETUP CHECKLIST ---
[ ] Wire threaded and tensioned
[ ] Workpiece squared and leveled
[ ] Reference point established
[ ] Start hole(s) verified
[ ] Flushing nozzles positioned
[ ] E-code verified for material
[ ] Program dry run complete
[ ] First cut inspection plan ready

Setup Completed By: _________________________ Date: ________ Time: ________
First Part Approved By: _____________________ Date: ________ Time: ________

================================================================================
`;

  return { html, text, json: data };
}

function parseArgs(args: string[]): { jobId: string; format: string; output?: string; data?: Partial<SetupData> } {
  const result: { jobId: string; format: string; output?: string; data: Partial<SetupData> } = {
    jobId: "O1234",
    format: "html",
    data: {},
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--job":
      case "-j":
        result.jobId = args[++i];
        break;
      case "--format":
      case "-f":
        result.format = args[++i];
        break;
      case "--output":
      case "-o":
        result.output = args[++i];
        break;
      case "--part":
        result.data.partName = args[++i];
        break;
      case "--customer":
        result.data.customer = args[++i];
        break;
      case "--material":
        result.data.material = args[++i];
        break;
      case "--thickness":
        result.data.thickness = parseFloat(args[++i]);
        break;
    }
  }

  return result;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: npx ts-node scripts/wedm_setup_formatter.ts [options]");
    console.log("\nOptions:");
    console.log("  --job, -j       Job ID (default: O1234)");
    console.log("  --format, -f    Output format: html, text, json (default: html)");
    console.log("  --output, -o    Output file path");
    console.log("  --part          Part name");
    console.log("  --customer      Customer name");
    console.log("  --material      Material type");
    console.log("  --thickness     Workpiece thickness in mm");
    process.exit(0);
  }

  try {
    const { jobId, format, output, data } = parseArgs(args);

    // Merge with defaults
    const setupData: SetupData = {
      jobId,
      partName: data.partName ?? "Punch Insert",
      customer: data.customer ?? "ALCOA",
      material: data.material ?? "D2",
      hardness: "58-60 HRC",
      thickness: data.thickness ?? 25,
      quantity: 10,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      machine: "Mitsubishi FA-20S",
      ecode: "E1847",
      wireType: "Brass",
      wireDiameter: 0.25,
      passes: 4,
      estimatedTime: 52,
      specialInstructions: [
        "Check for burrs on internal features after roughing pass",
        "Notify supervisor if wire breaks more than twice",
      ],
      qualityRequirements: {
        ra: 0.8,
        tolerance: 0.005,
        inspection: ["Dimensional check on CMM", "Surface finish profilometer"],
      },
    };

    const formatted = formatSetupSheet(setupData);

    // Output based on format
    let outputContent: string;
    let extension: string;

    switch (format) {
      case "html":
        outputContent = formatted.html;
        extension = "html";
        break;
      case "text":
        outputContent = formatted.text;
        extension = "txt";
        break;
      case "json":
        outputContent = JSON.stringify(formatted.json, null, 2);
        extension = "json";
        break;
      default:
        throw new Error(`Unknown format: ${format}`);
    }

    const outputPath = output ?? `setup_${jobId}.${extension}`;
    fs.writeFileSync(outputPath, outputContent);
    console.log(`Setup sheet saved: ${outputPath}`);

    if (format === "text") {
      console.log(formatted.text);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
