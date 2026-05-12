/**
 * MILL-AI-MS2: JM Die Program Archive Integration Tests
 *
 * Tests MillingAIIntegrationEngine for:
 * - Archive scanning and metadata extraction
 * - Natural language query parsing
 * - Program similarity search
 * - Historical parameter learning
 * - Customer pattern recognition
 * - Deep learning feature extraction
 * - AI recommendation generation
 * - Machine configuration
 */

import { describe, it, expect } from "vitest";
import {
  MillingAIIntegrationEngine,
  millingAIIntegrationEngine,
  type JMDieProgramMetadata,
  type ProgramSimilarityMatch,
  type HistoricalParameterLearning,
  type CustomerPatternRecognition,
  type ProgramFeatureVector,
  type MillingAIQuery,
  type MillingAIResponse,
  type MillingNLQueryParse,
  type MillingNLResponse,
  type MaterialCategory,
  type PartCategory,
  type MillingMachineType,
} from "../engines/MillingAIIntegrationEngine.js";

describe("MILL-AI-MS2: JM Die Program Archive Integration", () => {
  // ==========================================================================
  // ARCHIVE STATISTICS
  // ==========================================================================

  describe("Archive Statistics", () => {
    it("should return correct total program count", () => {
      const stats = millingAIIntegrationEngine.getArchiveStats();
      expect(stats.total_programs).toBe(24114);
      expect(stats.mastercam_files).toBe(7091);
      expect(stats.nc_files).toBe(17023);
    });

    it("should reflect that lathe programs dominate (punch + die > electrode)", () => {
      const stats = millingAIIntegrationEngine.getArchiveStats();
      const latheWork = stats.part_distribution.punch + stats.part_distribution.die + stats.part_distribution.quill;
      const millWork = stats.part_distribution.electrode + stats.part_distribution.case + stats.part_distribution.fixture;
      expect(latheWork).toBeGreaterThan(millWork);
    });

    it("should have tool steel as dominant material", () => {
      const stats = millingAIIntegrationEngine.getArchiveStats();
      expect(stats.material_distribution.tool_steel).toBeGreaterThan(stats.material_distribution.graphite);
      expect(stats.material_distribution.tool_steel).toBeGreaterThan(stats.material_distribution.carbide);
    });

    it("should list all known customers", () => {
      const stats = millingAIIntegrationEngine.getArchiveStats();
      expect(stats.customer_count).toBeGreaterThan(10);
      expect(stats.customers).toContain("ITW");
      expect(stats.customers).toContain("ALCOA");
      expect(stats.customers).toContain("OPTIMAS");
    });

    it("should list milling machines", () => {
      const stats = millingAIIntegrationEngine.getArchiveStats();
      expect(stats.machines).toContain("haas_vf2");
      expect(stats.machines).toContain("roku_roku_sng");
    });
  });

  // ==========================================================================
  // PROGRAM METADATA PARSING
  // ==========================================================================

  describe("Program Metadata Parsing", () => {
    it("should detect Mastercam file type", () => {
      const meta = millingAIIntegrationEngine.parseProgramMetadata(
        "H:/PRISM/JM DIE/ROKU-ROKU/ITW/B-12345.mcx-8"
      );
      expect(meta.file_type).toBe("mastercam_mcx8");
      expect(meta.file_name).toBe("B-12345.mcx-8");
    });

    it("should detect NC MIN file type", () => {
      const meta = millingAIIntegrationEngine.parseProgramMetadata(
        "H:/PRISM/JM DIE/CNC LATHE/OPTIMAS/PNCH-5678.MIN"
      );
      expect(meta.file_type).toBe("nc_min");
    });

    it("should extract customer from path", () => {
      const meta = millingAIIntegrationEngine.parseProgramMetadata(
        "H:/PRISM/JM DIE/CNC MILL HAAS/ITW/DIE-CASE-001.mcx-8"
      );
      expect(meta.customer).toBe("ITW");
    });

    it("should detect graphite material from path", () => {
      const meta = millingAIIntegrationEngine.parseProgramMetadata(
        "H:/PRISM/JM DIE/ROKU-ROKU/GRAPHITE/ELEC-001.mcx-8"
      );
      expect(meta.material_category).toBe("graphite");
    });

    it("should detect electrode part type", () => {
      const meta = millingAIIntegrationEngine.parseProgramMetadata(
        "H:/PRISM/JM DIE/ROKU-ROKU/SFS/ELECTRODE-HEX-001.mcx-8"
      );
      expect(meta.part_category).toBe("electrode");
    });

    it("should detect punch part type", () => {
      const meta = millingAIIntegrationEngine.parseProgramMetadata(
        "H:/PRISM/JM DIE/CNC LATHE/HOLO-KROME/FIRST-PUNCH-001.MIN"
      );
      expect(meta.part_category).toBe("punch");
    });

    it("should detect Roku-Roku machine from path", () => {
      const meta = millingAIIntegrationEngine.parseProgramMetadata(
        "H:/PRISM/JM DIE/ROKU-ROKU/AGRATI/ELEC-TRI-001.mcx-8"
      );
      expect(meta.machine_target).toBe("roku_roku_sng");
    });

    it("should extract part number from filename", () => {
      const meta = millingAIIntegrationEngine.parseProgramMetadata(
        "H:/PRISM/JM DIE/HAAS-HURCO/FONTANA/B-98765.mcx-8"
      );
      expect(meta.part_number).toBe("B-98765");
    });

    it("should handle customer aliases", () => {
      // Test ITW SHAKERPROOF → ITW
      const meta1 = millingAIIntegrationEngine.parseProgramMetadata(
        "H:/PRISM/JM DIE/CNC LATHE/ITW SHAKERPROOF/PNCH-001.MIN"
      );
      expect(meta1.customer).toBe("ITW");

      // Test ARCONIC → ALCOA
      const meta2 = millingAIIntegrationEngine.parseProgramMetadata(
        "H:/PRISM/JM DIE/HAAS-HURCO/ARCONIC FASTENING/DIE-001.mcx-8"
      );
      expect(meta2.customer).toBe("ALCOA");
    });
  });

  // ==========================================================================
  // NATURAL LANGUAGE PARSING
  // ==========================================================================

  describe("Natural Language Query Parsing", () => {
    it("should detect search intent", () => {
      const parse = millingAIIntegrationEngine.parseNaturalLanguageQuery(
        "Find similar programs to this D2 punch"
      );
      expect(parse.intent).toBe("search");
      expect(parse.entities.materials).toContain("tool_steel");
      expect(parse.entities.part_types).toContain("punch");
    });

    it("should detect recommend intent", () => {
      const parse = millingAIIntegrationEngine.parseNaturalLanguageQuery(
        "Recommend parameters for graphite electrode"
      );
      expect(parse.intent).toBe("recommend");
      expect(parse.entities.materials).toContain("graphite");
      expect(parse.entities.part_types).toContain("electrode");
    });

    it("should detect troubleshoot intent", () => {
      const parse = millingAIIntegrationEngine.parseNaturalLanguageQuery(
        "I'm having trouble with chatter on this D2 die"
      );
      expect(parse.intent).toBe("troubleshoot");
    });

    it("should extract customer names", () => {
      const parse = millingAIIntegrationEngine.parseNaturalLanguageQuery(
        "What speeds did we use for ITW hex dies?"
      );
      expect(parse.entities.customers).toContain("ITW");
    });

    it("should extract parameter keywords", () => {
      const parse = millingAIIntegrationEngine.parseNaturalLanguageQuery(
        "What feed rate and depth of cut for carbide?"
      );
      expect(parse.entities.parameters).toContain("feed");
      expect(parse.entities.parameters).toContain("depth");
      expect(parse.entities.materials).toContain("carbide");
    });

    it("should request clarification when material missing", () => {
      const parse = millingAIIntegrationEngine.parseNaturalLanguageQuery(
        "Find programs for this part"
      );
      expect(parse.clarifications_needed.length).toBeGreaterThan(0);
      expect(parse.clarifications_needed[0]).toContain("material");
    });

    it("should have higher confidence with more entities", () => {
      const vagueParse = millingAIIntegrationEngine.parseNaturalLanguageQuery(
        "Find something"
      );
      const specificParse = millingAIIntegrationEngine.parseNaturalLanguageQuery(
        "Find D2 punch programs for ITW"
      );
      expect(specificParse.confidence).toBeGreaterThan(vagueParse.confidence);
    });

    it("should extract keywords excluding stop words", () => {
      const parse = millingAIIntegrationEngine.parseNaturalLanguageQuery(
        "What is the best speed for graphite electrodes"
      );
      expect(parse.keywords).toContain("best");
      expect(parse.keywords).toContain("speed");
      expect(parse.keywords).toContain("graphite");
      expect(parse.keywords).not.toContain("the");
      expect(parse.keywords).not.toContain("for");
    });
  });

  // ==========================================================================
  // SIMILARITY SEARCH
  // ==========================================================================

  describe("Program Similarity Search", () => {
    it("should find similar programs by material", () => {
      const matches = millingAIIntegrationEngine.findSimilarPrograms({
        material: "graphite",
        part_type: "electrode",
        limit: 5,
      });
      expect(matches.length).toBe(5);
      expect(matches[0].match_factors.material_match).toBe(true);
    });

    it("should return programs sorted by similarity score", () => {
      const matches = millingAIIntegrationEngine.findSimilarPrograms({
        material: "tool_steel",
        part_type: "punch",
        customer: "ITW",
      });
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].similarity_score).toBeGreaterThanOrEqual(matches[i].similarity_score);
      }
    });

    it("should boost score for customer match", () => {
      const withCustomer = millingAIIntegrationEngine.findSimilarPrograms({
        material: "tool_steel",
        part_type: "die",
        customer: "ITW",
      });
      // First result should have customer match
      expect(withCustomer[0].match_factors.customer_match).toBe(true);
    });

    it("should include geometry similarity factor", () => {
      const matches = millingAIIntegrationEngine.findSimilarPrograms({
        material: "graphite",
        geometry_description: "hex electrode",
      });
      expect(matches[0].match_factors.geometry_similarity).toBeGreaterThan(0);
    });

    it("should respect limit parameter", () => {
      const matches3 = millingAIIntegrationEngine.findSimilarPrograms({ limit: 3 });
      const matches10 = millingAIIntegrationEngine.findSimilarPrograms({ limit: 10 });
      expect(matches3.length).toBe(3);
      expect(matches10.length).toBe(10);
    });

    it("should return confidence scores", () => {
      const matches = millingAIIntegrationEngine.findSimilarPrograms({
        material: "tool_steel",
      });
      for (const match of matches) {
        expect(match.confidence).toBeGreaterThan(0);
        expect(match.confidence).toBeLessThanOrEqual(100);
      }
    });
  });

  // ==========================================================================
  // HISTORICAL PARAMETER LEARNING
  // ==========================================================================

  describe("Historical Parameter Learning", () => {
    it("should learn speed parameters for tool steel", () => {
      const learned = millingAIIntegrationEngine.learnParametersFromHistory(
        "tool_steel",
        "punch",
        "speed"
      );
      expect(learned.parameter_type).toBe("speed");
      expect(learned.learned_value).toBeGreaterThan(100); // SFM
      expect(learned.sample_count).toBeGreaterThan(0);
    });

    it("should learn higher speed for graphite", () => {
      const toolSteel = millingAIIntegrationEngine.learnParametersFromHistory(
        "tool_steel",
        "electrode",
        "speed"
      );
      const graphite = millingAIIntegrationEngine.learnParametersFromHistory(
        "graphite",
        "electrode",
        "speed"
      );
      expect(graphite.learned_value).toBeGreaterThan(toolSteel.learned_value as number);
    });

    it("should include physics validation", () => {
      const learned = millingAIIntegrationEngine.learnParametersFromHistory(
        "tool_steel",
        "die",
        "feed"
      );
      expect(learned.physics_validation.within_limits).toBe(true);
      expect(learned.physics_validation.physics_basis).toContain("Kienzle");
    });

    it("should include source programs", () => {
      const learned = millingAIIntegrationEngine.learnParametersFromHistory(
        "graphite",
        "electrode",
        "depth"
      );
      expect(learned.source_programs.length).toBeGreaterThan(0);
    });

    it("should learn strategy preferences", () => {
      const strategy = millingAIIntegrationEngine.learnParametersFromHistory(
        "graphite",
        "electrode",
        "strategy"
      );
      expect(strategy.learned_value).toBe("high_speed_machining");
    });

    it("should have confidence based on sample count", () => {
      const learned = millingAIIntegrationEngine.learnParametersFromHistory(
        "tool_steel",
        "punch",
        "speed"
      );
      expect(learned.confidence).toBeGreaterThan(60);
      expect(learned.confidence).toBeLessThanOrEqual(95);
    });

    it("should include variance for numeric parameters", () => {
      const learned = millingAIIntegrationEngine.learnParametersFromHistory(
        "carbide",
        "insert",
        "feed"
      );
      expect(learned.variance).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // CUSTOMER PATTERN RECOGNITION
  // ==========================================================================

  describe("Customer Pattern Recognition", () => {
    it("should return program count for customer", () => {
      const patterns = millingAIIntegrationEngine.analyzeCustomerPatterns("ITW");
      expect(patterns.program_count).toBeGreaterThan(0);
      expect(patterns.customer).toBe("ITW");
    });

    it("should identify ITW as high quality priority", () => {
      const patterns = millingAIIntegrationEngine.analyzeCustomerPatterns("ITW");
      expect(patterns.quality_priority).toBe("high");
    });

    it("should identify ALCOA as critical quality priority", () => {
      const patterns = millingAIIntegrationEngine.analyzeCustomerPatterns("ALCOA");
      expect(patterns.quality_priority).toBe("critical");
      expect(patterns.typical_tolerances).toContain("0.0003");
    });

    it("should identify HOLO-KROME tight tolerances", () => {
      const patterns = millingAIIntegrationEngine.analyzeCustomerPatterns("HOLO-KROME");
      expect(patterns.quality_priority).toBe("critical");
      expect(patterns.typical_tolerances).toContain("0.0002");
    });

    it("should return common materials for customer", () => {
      const patterns = millingAIIntegrationEngine.analyzeCustomerPatterns("SFS");
      expect(patterns.common_materials).toContain("tool_steel");
      expect(patterns.common_materials).toContain("graphite");
    });

    it("should return common part types for customer", () => {
      const patterns = millingAIIntegrationEngine.analyzeCustomerPatterns("ITW");
      expect(patterns.common_part_types).toContain("punch");
      expect(patterns.common_part_types).toContain("die");
    });

    it("should include customer-specific notes", () => {
      const patterns = millingAIIntegrationEngine.analyzeCustomerPatterns("ALCOA");
      expect(patterns.notes.length).toBeGreaterThan(0);
      expect(patterns.notes.some(n => n.toLowerCase().includes("aerospace"))).toBe(true);
    });

    it("should handle unknown customers gracefully", () => {
      const patterns = millingAIIntegrationEngine.analyzeCustomerPatterns("UNKNOWN_CUSTOMER");
      expect(patterns.quality_priority).toBe("standard");
      expect(patterns.common_materials.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // DEEP LEARNING FEATURES
  // ==========================================================================

  describe("Deep Learning Feature Extraction", () => {
    it("should extract feature vector from program", () => {
      const program: JMDieProgramMetadata = {
        file_path: "H:/PRISM/JM DIE/ROKU-ROKU/ITW/ELEC-001.mcx-8",
        file_name: "ELEC-001.mcx-8",
        file_type: "mastercam_mcx8",
        customer: "ITW",
        part_number: "ELEC-001",
        material_category: "graphite",
        part_category: "electrode",
        machine_target: "roku_roku_sng",
        file_size_bytes: 2000000,
        modified_date: "2024-06-15",
        folder_depth: 4,
      };

      const features = millingAIIntegrationEngine.extractFeatureVector(program);
      expect(features.program_id).toBe(program.file_path);
      expect(features.features.material_hardness).toBeLessThan(0.5); // Graphite is soft
      expect(features.features.material_machinability).toBeGreaterThan(0.8); // Graphite machines easily
    });

    it("should assign higher hardness to tool steel", () => {
      const graphiteProgram: JMDieProgramMetadata = {
        file_path: "graphite.mcx-8",
        file_name: "graphite.mcx-8",
        file_type: "mastercam_mcx8",
        customer: "ITW",
        material_category: "graphite",
        part_category: "electrode",
        machine_target: "roku_roku_sng",
        file_size_bytes: 1000000,
        modified_date: "2024-01-01",
        folder_depth: 4,
      };

      const toolSteelProgram: JMDieProgramMetadata = {
        ...graphiteProgram,
        file_path: "toolsteel.mcx-8",
        file_name: "toolsteel.mcx-8",
        material_category: "tool_steel",
        part_category: "die",
      };

      const graphiteFeatures = millingAIIntegrationEngine.extractFeatureVector(graphiteProgram);
      const toolSteelFeatures = millingAIIntegrationEngine.extractFeatureVector(toolSteelProgram);

      expect(toolSteelFeatures.features.material_hardness).toBeGreaterThan(
        graphiteFeatures.features.material_hardness
      );
    });

    it("should assign complexity based on part type", () => {
      const dieProgram: JMDieProgramMetadata = {
        file_path: "die.mcx-8",
        file_name: "die.mcx-8",
        file_type: "mastercam_mcx8",
        customer: "ITW",
        material_category: "tool_steel",
        part_category: "die",
        machine_target: "haas_vf2",
        file_size_bytes: 1000000,
        modified_date: "2024-01-01",
        folder_depth: 4,
      };

      const quillProgram: JMDieProgramMetadata = {
        ...dieProgram,
        file_path: "quill.mcx-8",
        file_name: "quill.mcx-8",
        part_category: "quill",
      };

      const dieFeatures = millingAIIntegrationEngine.extractFeatureVector(dieProgram);
      const quillFeatures = millingAIIntegrationEngine.extractFeatureVector(quillProgram);

      expect(dieFeatures.features.complexity_score).toBeGreaterThan(quillFeatures.features.complexity_score);
    });

    it("should calculate cosine similarity between feature vectors", () => {
      const program1: JMDieProgramMetadata = {
        file_path: "p1.mcx-8",
        file_name: "p1.mcx-8",
        file_type: "mastercam_mcx8",
        customer: "ITW",
        material_category: "graphite",
        part_category: "electrode",
        machine_target: "roku_roku_sng",
        file_size_bytes: 1000000,
        modified_date: "2024-01-01",
        folder_depth: 4,
      };

      const program2: JMDieProgramMetadata = {
        ...program1,
        file_path: "p2.mcx-8",
        file_name: "p2.mcx-8",
      };

      const features1 = millingAIIntegrationEngine.extractFeatureVector(program1);
      const features2 = millingAIIntegrationEngine.extractFeatureVector(program2);

      const similarity = millingAIIntegrationEngine.calculateCosineSimilarity(features1, features2);
      expect(similarity).toBeCloseTo(1, 2); // Identical programs should be 1.0
    });

    it("should have lower similarity for different materials", () => {
      const graphiteProgram: JMDieProgramMetadata = {
        file_path: "graphite.mcx-8",
        file_name: "graphite.mcx-8",
        file_type: "mastercam_mcx8",
        customer: "ITW",
        material_category: "graphite",
        part_category: "electrode",
        machine_target: "roku_roku_sng",
        file_size_bytes: 1000000,
        modified_date: "2024-01-01",
        folder_depth: 4,
      };

      const carbideProgram: JMDieProgramMetadata = {
        ...graphiteProgram,
        file_path: "carbide.mcx-8",
        file_name: "carbide.mcx-8",
        material_category: "carbide",
      };

      const graphiteFeatures = millingAIIntegrationEngine.extractFeatureVector(graphiteProgram);
      const carbideFeatures = millingAIIntegrationEngine.extractFeatureVector(carbideProgram);

      const similarity = millingAIIntegrationEngine.calculateCosineSimilarity(graphiteFeatures, carbideFeatures);
      expect(similarity).toBeLessThan(1); // Different materials should be less similar
      expect(similarity).toBeGreaterThan(0); // But still somewhat similar (same part type, etc.)
    });

    it("should assign higher quality level for critical customers", () => {
      const alcoaProgram: JMDieProgramMetadata = {
        file_path: "alcoa.mcx-8",
        file_name: "alcoa.mcx-8",
        file_type: "mastercam_mcx8",
        customer: "ALCOA",
        material_category: "tool_steel",
        part_category: "die",
        machine_target: "haas_vf2",
        file_size_bytes: 1000000,
        modified_date: "2024-01-01",
        folder_depth: 4,
      };

      const optimasProgram: JMDieProgramMetadata = {
        ...alcoaProgram,
        file_path: "optimas.mcx-8",
        file_name: "optimas.mcx-8",
        customer: "OPTIMAS",
      };

      const alcoaFeatures = millingAIIntegrationEngine.extractFeatureVector(alcoaProgram);
      const optimasFeatures = millingAIIntegrationEngine.extractFeatureVector(optimasProgram);

      expect(alcoaFeatures.features.customer_quality_level).toBeGreaterThan(
        optimasFeatures.features.customer_quality_level
      );
    });
  });

  // ==========================================================================
  // AI RECOMMENDATIONS
  // ==========================================================================

  describe("AI Recommendation Generation", () => {
    it("should generate recommendations for material/part type query", () => {
      const response = millingAIIntegrationEngine.generateRecommendations({
        query_type: "find_similar",
        material: "graphite",
        part_type: "electrode",
      });

      expect(response.results.length).toBeGreaterThan(0);
      expect(response.similar_programs.length).toBeGreaterThan(0);
      expect(response.learned_parameters.length).toBeGreaterThan(0);
    });

    it("should include similar program recommendations", () => {
      const response = millingAIIntegrationEngine.generateRecommendations({
        query_type: "find_similar",
        material: "tool_steel",
        part_type: "die",
      });

      const similarRec = response.results.find(r => r.recommendation_type === "similar_program");
      expect(similarRec).toBeDefined();
      expect(similarRec!.supporting_programs.length).toBeGreaterThan(0);
    });

    it("should include parameter suggestions", () => {
      const response = millingAIIntegrationEngine.generateRecommendations({
        query_type: "parameter_history",
        material: "graphite",
      });

      const paramRec = response.results.find(r => r.recommendation_type === "parameter_suggestion");
      expect(paramRec).toBeDefined();
      expect(paramRec!.title).toContain("SFM");
    });

    it("should include strategy suggestions", () => {
      const response = millingAIIntegrationEngine.generateRecommendations({
        query_type: "strategy_suggestions",
        material: "tool_steel",
        part_type: "punch",
      });

      const strategyRec = response.results.find(r => r.recommendation_type === "strategy_suggestion");
      expect(strategyRec).toBeDefined();
    });

    it("should include customer warnings for critical customers", () => {
      const response = millingAIIntegrationEngine.generateRecommendations({
        query_type: "find_similar",
        material: "tool_steel",
        customer: "HOLO-KROME",
      });

      const warning = response.results.find(r => r.recommendation_type === "warning");
      expect(warning).toBeDefined();
      expect(warning!.title).toContain("critical");
    });

    it("should include reasoning chains in recommendations", () => {
      const response = millingAIIntegrationEngine.generateRecommendations({
        query_type: "find_similar",
        material: "graphite",
      });

      for (const rec of response.results) {
        expect(rec.reasoning_chain.length).toBeGreaterThan(0);
        expect(rec.reasoning_chain[0].step_type).toBe("observation");
      }
    });

    it("should generate reasoning summary", () => {
      const response = millingAIIntegrationEngine.generateRecommendations({
        query_type: "find_similar",
        material: "graphite",
        part_type: "electrode",
      });

      expect(response.reasoning_summary).toContain("JM Die archive");
      expect(response.reasoning_summary.length).toBeGreaterThan(50);
    });

    it("should track processing time", () => {
      const response = millingAIIntegrationEngine.generateRecommendations({
        query_type: "find_similar",
        material: "tool_steel",
      });

      expect(response.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(response.processing_time_ms).toBeLessThan(1000); // Should be fast
    });
  });

  // ==========================================================================
  // NATURAL LANGUAGE RESPONSE
  // ==========================================================================

  describe("Natural Language Response Generation", () => {
    it("should process natural language query end-to-end", () => {
      const response = millingAIIntegrationEngine.processNaturalLanguageQuery(
        "Find similar programs for D2 punch"
      );

      expect(response.query_parse.intent).toBe("search");
      expect(response.response.results.length).toBeGreaterThan(0);
      expect(response.natural_language_summary.length).toBeGreaterThan(0);
    });

    it("should generate natural language summary", () => {
      const response = millingAIIntegrationEngine.processNaturalLanguageQuery(
        "What speeds did we use for ITW electrodes?"
      );

      expect(response.natural_language_summary).toContain("JM Die archive");
    });

    it("should suggest follow-up questions", () => {
      const response = millingAIIntegrationEngine.processNaturalLanguageQuery(
        "Find graphite electrode programs"
      );

      expect(response.suggested_follow_ups.length).toBeGreaterThan(0);
    });

    it("should include parsed query in response", () => {
      const response = millingAIIntegrationEngine.processNaturalLanguageQuery(
        "Recommend parameters for carbide inserts for ALCOA"
      );

      expect(response.query_parse.entities.materials).toContain("carbide");
      expect(response.query_parse.entities.customers).toContain("ALCOA");
    });

    it("should handle troubleshooting queries", () => {
      const response = millingAIIntegrationEngine.processNaturalLanguageQuery(
        "I'm having trouble with tool life on D2 dies"
      );

      expect(response.query_parse.intent).toBe("troubleshoot");
    });

    it("should handle customer pattern queries", () => {
      const response = millingAIIntegrationEngine.processNaturalLanguageQuery(
        "What are the patterns for HOLO-KROME jobs?"
      );

      expect(response.query_parse.intent).toBe("learn");
      expect(response.query_parse.entities.customers).toContain("HOLO-KROME");
    });
  });

  // ==========================================================================
  // MACHINE CONFIGURATION
  // ==========================================================================

  describe("Machine Configuration", () => {
    it("should return Roku-Roku config for graphite", () => {
      const config = millingAIIntegrationEngine.getMachineConfig("roku_roku_sng");
      expect(config.name).toContain("Roku-Roku");
      expect(config.max_rpm).toBe(40000);
      expect(config.primary_use).toContain("graphite_electrodes");
    });

    it("should return Haas config", () => {
      const config = millingAIIntegrationEngine.getMachineConfig("haas_vf2");
      expect(config.name).toContain("Haas");
      expect(config.controller).toContain("Haas");
    });

    it("should list all shop milling machines", () => {
      const machines = millingAIIntegrationEngine.getShopMillingMachines();
      expect(machines.length).toBeGreaterThan(3);
      expect(machines.map(m => m.type)).toContain("roku_roku_sng");
      expect(machines.map(m => m.type)).toContain("haas_vf2");
      expect(machines.map(m => m.type)).not.toContain("unknown");
    });

    it("should recommend Roku-Roku for graphite electrodes", () => {
      const rec = millingAIIntegrationEngine.recommendMachine("electrode", "graphite");
      expect(rec.machine).toBe("roku_roku_sng");
      expect(rec.reason).toContain("40,000 RPM");
      expect(rec.confidence).toBeGreaterThan(90);
    });

    it("should recommend Hurco for precision work", () => {
      const rec = millingAIIntegrationEngine.recommendMachine("gauge", "tool_steel");
      expect(rec.machine).toBe("hurco_vmx42");
      expect(rec.reason).toContain("precision");
    });

    it("should recommend Haas VF-3 for large die cases", () => {
      const rec = millingAIIntegrationEngine.recommendMachine("case", "tool_steel");
      expect(rec.machine).toBe("haas_vf3");
      expect(rec.reason).toContain("Large");
    });

    it("should default to Haas VF-2 for general work", () => {
      const rec = millingAIIntegrationEngine.recommendMachine("custom", "aluminum");
      expect(rec.machine).toBe("haas_vf2");
    });
  });

  // ==========================================================================
  // MODULE EXPORTS
  // ==========================================================================

  describe("Module Exports", () => {
    it("should export MillingAIIntegrationEngine class", () => {
      expect(MillingAIIntegrationEngine).toBeDefined();
      const instance = new MillingAIIntegrationEngine();
      expect(instance.getArchiveStats).toBeDefined();
    });

    it("should export singleton instance", () => {
      expect(millingAIIntegrationEngine).toBeDefined();
      expect(millingAIIntegrationEngine).toBeInstanceOf(MillingAIIntegrationEngine);
    });
  });
});
