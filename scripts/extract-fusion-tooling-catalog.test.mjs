/**
 * extract-fusion-tooling-catalog.test.mjs - vitest suite
 * =======================================================
 * Locks pure-function contract for the Fusion .hsmlib XML extractor.
 * @unit U-MIKE-FUSION-TOOLING-CATALOG
 * @slot mike
 */

import { describe, it, expect } from "vitest";
import {
  attr,
  textElem,
  selfElem,
  extractPresets,
  parseToolXml,
  extractTools,
  summarizeLibrary,
  buildCatalog,
} from "./extract-fusion-tooling-catalog.mjs";

const SAMPLE_TOOL_XML = `
    <description>3/16 End Mill</description>
    <comment>.94" L.O.C.</comment>
    <manufacturer>OSG</manufacturer>
    <nc break-control="0" diameter-offset="5" length-offset="5" live-tool="1" manual-tool-change="0" number="5" turret="0"/>
    <coolant mode="flood"/>
    <material name="carbide"/>
    <body body-length="3" coolant-support="no" corner-radius="0" diameter="0.1875" flute-length="0.94" number-of-flutes="3" overall-length="3" shaft-diameter="0.1875" shoulder-length="0.94" thread-pitch="0" thread-profile-angle="60"/>
    <holder description="ER20 Collet" comment="High-speed"/>
    <presets>
      <preset description="" id="{abc-123}" name="Default Preset">
        <parameter key="tool_coolant" value="flood"/>
        <parameter key="tool_spindleSpeed" value="12000"/>
        <parameter key="tool_feedCutting" value="40"/>
        <parameter key="tool_feedEntry" value="40"/>
        <parameter key="tool_feedExit" value="40"/>
        <parameter key="tool_feedPlunge" value="20"/>
        <parameter key="tool_feedRamp" value="20"/>
      </preset>
    </presets>
`;

const SAMPLE_LIBRARY_XML = `<?xml version="1.0" encoding="UTF-16" standalone="no"?>
<tool-library xmlns="http://www.hsmworks.com/xml/2004/cnc/tool-library" guid="{lib-guid}" version="14">
  <tool guid="{tool-1}" type="end mill" unit="inches" version="1.5">${SAMPLE_TOOL_XML}</tool>
  <tool guid="{tool-2}" type="face mill" unit="inches" version="1.5">
    <description>.75 Face Mill</description>
    <body diameter="0.75" number-of-flutes="5" flute-length="0.3" overall-length="5"/>
    <coolant mode="disabled"/>
    <presets>
      <preset id="{def-456}" name="Default Preset">
        <parameter key="tool_spindleSpeed" value="2190"/>
        <parameter key="tool_feedCutting" value="1016"/>
        <parameter key="tool_feedPlunge" value="1270"/>
      </preset>
    </presets>
  </tool>
</tool-library>`;

describe("attr", () => {
  it("extracts a single attribute value", () => {
    expect(attr(' guid="{abc}" type="end mill"', "guid")).toBe("{abc}");
    expect(attr(' guid="{abc}" type="end mill"', "type")).toBe("end mill");
  });
  it("returns null when attribute is absent", () => {
    expect(attr(' guid="{abc}"', "type")).toBeNull();
  });
});

describe("textElem", () => {
  it("returns the text content of a simple element", () => {
    expect(textElem(SAMPLE_TOOL_XML, "description")).toBe("3/16 End Mill");
    expect(textElem(SAMPLE_TOOL_XML, "comment")).toBe('.94" L.O.C.');
    expect(textElem(SAMPLE_TOOL_XML, "manufacturer")).toBe("OSG");
  });
  it("decodes common XML entities", () => {
    const x = `<description>3/4 &quot;rough&quot; cut &amp; finish</description>`;
    expect(textElem(x, "description")).toBe('3/4 "rough" cut & finish');
  });
  it("returns null when element is absent", () => {
    expect(textElem(SAMPLE_TOOL_XML, "nonexistent")).toBeNull();
  });
});

describe("selfElem", () => {
  it("parses all attributes of a self-closing element", () => {
    const body = selfElem(SAMPLE_TOOL_XML, "body");
    expect(body).not.toBeNull();
    expect(body.diameter).toBe("0.1875");
    expect(body["number-of-flutes"]).toBe("3");
    expect(body["flute-length"]).toBe("0.94");
  });
  it("returns null when element is absent", () => {
    expect(selfElem(SAMPLE_TOOL_XML, "nonexistent")).toBeNull();
  });
});

describe("extractPresets", () => {
  it("extracts all <parameter key=... value=.../> entries inside <preset>", () => {
    const presets = extractPresets(SAMPLE_TOOL_XML);
    expect(presets.length).toBe(1);
    expect(presets[0].name).toBe("Default Preset");
    expect(presets[0].parameters.tool_spindleSpeed).toBe("12000");
    expect(presets[0].parameters.tool_feedCutting).toBe("40");
    expect(presets[0].parameters.tool_feedPlunge).toBe("20");
    expect(presets[0].parameters.tool_coolant).toBe("flood");
  });
  it("returns empty array when there are no presets", () => {
    expect(extractPresets("<tool><description>X</description></tool>")).toEqual([]);
  });
});

describe("parseToolXml", () => {
  it("builds a complete tool record from open-tag attrs + inner XML", () => {
    const openAttrs = ' guid="{tool-1}" type="end mill" unit="inches" version="1.5"';
    const tool = parseToolXml(openAttrs, SAMPLE_TOOL_XML);
    expect(tool.guid).toBe("{tool-1}");
    expect(tool.type).toBe("end mill");
    expect(tool.unit).toBe("inches");
    expect(tool.description).toBe("3/16 End Mill");
    expect(tool.manufacturer).toBe("OSG");
    expect(tool.geometry.diameter_in).toBe(0.1875);
    expect(tool.geometry.num_flutes).toBe(3);
    expect(tool.geometry.flute_length_in).toBe(0.94);
    expect(tool.geometry.material).toBe("carbide");
    expect(tool.coolant_mode).toBe("flood");
    expect(tool.nc.number).toBe(5);
    expect(tool.presets.length).toBe(1);
  });
});

describe("extractTools", () => {
  it("extracts every <tool> from a multi-tool library", () => {
    const tools = extractTools(SAMPLE_LIBRARY_XML);
    expect(tools.length).toBe(2);
    expect(tools[0].type).toBe("end mill");
    expect(tools[1].type).toBe("face mill");
    expect(tools[1].geometry.diameter_in).toBe(0.75);
  });
  it("returns empty array on empty input (R12 fail-soft)", () => {
    expect(extractTools("")).toEqual([]);
  });
});

describe("summarizeLibrary", () => {
  it("bins tools by type with min/median/max for spindle and feed", () => {
    const tools = extractTools(SAMPLE_LIBRARY_XML);
    const stats = summarizeLibrary({ tools });
    expect(stats["end mill"].count).toBe(1);
    expect(stats["end mill"].spindle_rpm.min).toBe(12000);
    expect(stats["end mill"].feed_cutting.median).toBe(40);
    expect(stats["face mill"].count).toBe(1);
    expect(stats["face mill"].spindle_rpm.median).toBe(2190);
  });
});

describe("buildCatalog", () => {
  it("produces the full report with required top-level keys", () => {
    const lib = {
      library_file: "TEST.hsmlib",
      library_guid: "{lib-guid}",
      library_version: "14",
      tool_count: 2,
      tools: extractTools(SAMPLE_LIBRARY_XML),
    };
    const cat = buildCatalog({ libraries: [lib], generatedAt: "2026-05-23T00:00:00Z" });
    expect(cat.schemaVersion).toBe("1.0.0");
    expect(cat.advisoryOnly).toBe(true);
    expect(cat.must_human_verify).toBe(true);
    expect(cat.summary.library_count).toBe(1);
    expect(cat.summary.total_tools).toBe(2);
    expect(cat.summary.total_presets).toBe(2);
    expect(cat.summary.distinct_tool_types).toBe(2);
  });
  it("pools speed/feed across libs per tool type", () => {
    const lib = {
      library_file: "TEST.hsmlib",
      library_guid: "{lib-guid}",
      library_version: "14",
      tool_count: 2,
      tools: extractTools(SAMPLE_LIBRARY_XML),
    };
    const cat = buildCatalog({ libraries: [lib, lib] });
    expect(cat.speed_feed_backbone_by_type["end mill"].count).toBe(2);
    expect(cat.speed_feed_backbone_by_type["end mill"].spindle_rpm.n).toBe(2);
    expect(cat.speed_feed_backbone_by_type["end mill"].spindle_rpm.median).toBe(12000);
  });
  it("annotates each raw tool with its source_library", () => {
    const lib = {
      library_file: "TEST.hsmlib",
      library_guid: "{lib-guid}",
      library_version: "14",
      tool_count: 2,
      tools: extractTools(SAMPLE_LIBRARY_XML),
    };
    const cat = buildCatalog({ libraries: [lib] });
    for (const t of cat.raw_tools) expect(t.source_library).toBe("TEST.hsmlib");
  });
});
