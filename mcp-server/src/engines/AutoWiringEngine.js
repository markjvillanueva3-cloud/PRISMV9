import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MCP_ROOT = path.resolve(__dirname, "../..");
const SRC_DIR = path.join(MCP_ROOT, "src");
const ENGINES_DIR = path.join(SRC_DIR, "engines");
const DISPATCHERS_DIR = path.join(SRC_DIR, "tools", "dispatchers");
const SCHEMAS_DIR = path.join(SRC_DIR, "schemas");
const ROUTES_DIR = path.join(SRC_DIR, "routes");
const TESTS_DIR = path.join(SRC_DIR, "__tests__");

function safeRead(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
  } catch {
    return "";
  }
}

function safeList(dirPath) {
  try {
    return fs.existsSync(dirPath) ? fs.readdirSync(dirPath) : [];
  } catch {
    return [];
  }
}

function findRefs(dirPath, matcher) {
  const matches = [];
  for (const file of safeList(dirPath)) {
    if (!file.endsWith(".ts")) continue;
    const fullPath = path.join(dirPath, file);
    const content = safeRead(fullPath);
    if (matcher(content, file)) matches.push(fullPath);
  }
  return matches;
}

function classNameFor(engineFile) {
  return path.basename(engineFile).replace(/\.(ts|js)$/, "");
}

function suggestionArtifact(type, target, content) {
  return {
    artifact_type: type,
    target_file: target,
    content,
  };
}

class AutoWiringEngine {
  async analyze(engineFile, dryRun = true) {
    const fullPath = path.isAbsolute(engineFile) ? engineFile : path.join(MCP_ROOT, engineFile);
    const className = classNameFor(fullPath);
    const lower = className.toLowerCase();

    const dispatcherRefs = findRefs(DISPATCHERS_DIR, (content) => content.toLowerCase().includes(`engines/${lower}`));
    const schemaRefs = findRefs(SCHEMAS_DIR, (content, file) => {
      const lowerContent = content.toLowerCase();
      return lowerContent.includes(lower) || file.toLowerCase().includes(lower.replace(/engine$/, ""));
    });
    const routeRefs = findRefs(ROUTES_DIR, (content) => content.toLowerCase().includes(`engines/${lower}`));
    const testRefs = findRefs(TESTS_DIR, (content, file) => {
      const lowerContent = content.toLowerCase();
      return lowerContent.includes(className.toLowerCase()) || file.toLowerCase().includes(lower.replace(/engine$/, ""));
    });

    const currentWiring = {
      dispatcher_refs: dispatcherRefs.map((file) => file.replace(/\\/g, "/")),
      schema_refs: schemaRefs.map((file) => file.replace(/\\/g, "/")),
      route_refs: routeRefs.map((file) => file.replace(/\\/g, "/")),
      test_refs: testRefs.map((file) => file.replace(/\\/g, "/")),
      has_dispatcher_case: dispatcherRefs.length > 0,
      has_schema: schemaRefs.length > 0,
      has_route_ref: routeRefs.length > 0,
      has_test: testRefs.length > 0,
    };

    const gaps = [];
    const artifacts = [];

    if (!currentWiring.has_dispatcher_case) {
      gaps.push({
        dimension: "dispatcher",
        reason: `No dispatcher references found for ${className}`,
        expected_file: path.join(SRC_DIR, "tools", "dispatchers"),
      });
      artifacts.push(
        suggestionArtifact(
          "dispatcher_hint",
          path.join(SRC_DIR, "tools", "dispatchers"),
          `Add a case or import path referencing "../../engines/${className}.js" where this engine should be invoked.`,
        ),
      );
    }

    if (!currentWiring.has_schema) {
      gaps.push({
        dimension: "schema",
        reason: `No schema references found for ${className}`,
        expected_file: path.join(SRC_DIR, "schemas"),
      });
      artifacts.push(
        suggestionArtifact(
          "schema_hint",
          path.join(SRC_DIR, "schemas"),
          `Add schema coverage for actions backed by ${className}.`,
        ),
      );
    }

    if (!currentWiring.has_test) {
      gaps.push({
        dimension: "tests",
        reason: `No test coverage found for ${className}`,
        expected_file: path.join(SRC_DIR, "__tests__"),
      });
      artifacts.push(
        suggestionArtifact(
          "test_hint",
          path.join(SRC_DIR, "__tests__"),
          `Add or extend a test file that exercises ${className}.`,
        ),
      );
    }

    return {
      engine: {
        class_name: className,
        file_path: fullPath.replace(/\\/g, "/"),
      },
      gaps,
      artifacts,
      current_wiring: currentWiring,
      dry_run: !!dryRun,
    };
  }

  async scanAll() {
    const engineFiles = safeList(ENGINES_DIR).filter(
      (file) =>
        file.endsWith(".ts") &&
        !file.endsWith(".test.ts") &&
        !file.endsWith(".d.ts") &&
        file !== "index.ts",
    );

    const plans = [];
    for (const file of engineFiles) {
      plans.push(await this.analyze(path.join(ENGINES_DIR, file), true));
    }

    return {
      total: plans.length,
      with_gaps: plans.filter((plan) => plan.gaps.length > 0).length,
      plans: plans.sort((a, b) => b.gaps.length - a.gaps.length),
    };
  }
}

export const autoWiringEngine = new AutoWiringEngine();
export { AutoWiringEngine };
