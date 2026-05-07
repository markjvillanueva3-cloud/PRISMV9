import process from "node:process";

function unique(items) {
  return [...new Set(items)];
}

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

// Read prompt from stdin (Claude Code pipes JSON {prompt: "..."} to hooks)
function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) { resolve(""); return; }
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
    setTimeout(() => resolve(data), 200);
  });
}

const stdinRaw = await readStdin();
let promptRaw = "";
try {
  const parsed = JSON.parse(stdinRaw);
  promptRaw = typeof parsed.prompt === "string" ? parsed.prompt : "";
} catch {
  // Fallback: env var or CLI args
  promptRaw = process.env.PROMPT ?? process.argv.slice(2).join(" ") ?? "";
}
const prompt = promptRaw.toLowerCase();
const promptLength = promptRaw.length;

const domainMatchers = [
  {
    name: "typescript",
    patterns: [
      /\btypescript\b/i,
      /\.ts\b/i,
      /\besbuild\b/i,
      /\btsc\b/i,
      /\bnpm\b/i,
      /\bnode\b/i,
      /\bvitest\b/i,
      /\beslint\b/i,
      /\bjavascript\b/i,
      /\.js\b/i,
      /\breact\b/i,
      /\bvue\b/i,
      /\bangular\b/i,
      /\bsvelte\b/i,
      /\bnext\.?js\b/i,
      /\bexpress\b/i,
      /\bdispatcher\b/i,
      /\bexecutor\b/i,
      /\bregistry\b/i,
      /\bmcp.?server\b/i,
    ],
  },
  {
    name: "python",
    patterns: [
      /\bpython\b/i,
      /\.py\b/i,
      /\bpip\b/i,
      /\bpytest\b/i,
      /\bdjango\b/i,
      /\bflask\b/i,
      /\bpandas\b/i,
      /\bnumpy\b/i,
      /\btorch\b/i,
      /\bvenv\b/i,
      /\bscript\b/i,
    ],
  },
  {
    name: "manufacturing",
    patterns: [
      /\bmanufactur/i,
      /\bmaterial\b/i,
      /\balloy\b/i,
      /\bcnc\b/i,
      /\bg.?code\b/i,
      /\blathe\b/i,
      /\bmill\b/i,
      /\btolerance\b/i,
      /\bcad\b/i,
      /\bcam\b/i,
      /\bmachining\b/i,
      /\bhardness\b/i,
      /\btensile\b/i,
      /\bsteel\b/i,
      /\baluminum\b/i,
      /\btitanium\b/i,
      /\bcomposite\b/i,
      /\binjection.?mold\b/i,
      /\b3d.?print\b/i,
      /\badditive\b/i,
      /\bweld\b/i,
      /\banneal\b/i,
      /\btemper\b/i,
      /\bforging\b/i,
      /\bcasting\b/i,
    ],
  },
  {
    name: "architecture",
    patterns: [
      /\barchitect/i,
      /\binfrastructure\b/i,
      /\bdevops\b/i,
      /\bdocker\b/i,
      /\bkubernetes\b/i,
      /\bk8s\b/i,
      /\bterraform\b/i,
      /\baws\b/i,
      /\bazure\b/i,
      /\bgcp\b/i,
      /\bci.?cd\b/i,
      /\bpipeline\b/i,
      /\bdeploy\b/i,
      /\bhelm\b/i,
      /\bnginx\b/i,
      /\bmicroservice\b/i,
      /\bmonolith\b/i,
      /\bscaling\b/i,
    ],
  },
  {
    name: "security",
    patterns: [
      /\bsecurity\b/i,
      /\bvulnerab/i,
      /\bexploit\b/i,
      /\bcve\b/i,
      /\bowasp\b/i,
      /\bpenetration\b/i,
      /\bpentest\b/i,
      /\bxss\b/i,
      /\binjection\b/i,
      /\bcsrf\b/i,
      /\bencrypt\b/i,
      /\bssl\b/i,
      /\btls\b/i,
      /\bfirewall\b/i,
      /\bthreat\b/i,
      /\battack\b/i,
      /\bprivilege\b/i,
      /\brbac\b/i,
    ],
  },
  {
    name: "data_ml",
    patterns: [
      /\bdata.?analy/i,
      /\bstatistic\b/i,
      /\bmachine.?learn\b/i,
      /\bml\b/i,
      /\bdeep.?learn\b/i,
      /\bneural\b/i,
      /\bmodel.?train\b/i,
      /\bdataset\b/i,
      /\bfeature.?eng\b/i,
      /\bregression\b/i,
      /\bclassif/i,
      /\bcluster\b/i,
      /\bnlp\b/i,
      /\bllm\b/i,
      /\bembedding\b/i,
      /\btransformer\b/i,
    ],
  },
  {
    name: "database",
    patterns: [
      /\bdatabase\b/i,
      /\bsql\b/i,
      /\bpostgres\b/i,
      /\bmysql\b/i,
      /\bsqlite\b/i,
      /\bmongo\b/i,
      /\bredis\b/i,
      /\bquery\b/i,
      /\bindex\b/i,
      /\bschema\b/i,
      /\bmigration\b/i,
      /\borm\b/i,
      /\bprisma\b/i,
      /\bdrizzle\b/i,
      /\bjoin\b/i,
      /\btable\b/i,
    ],
  },
  {
    name: "api",
    patterns: [
      /\bapi\b/i,
      /\bendpoint\b/i,
      /\brest\b/i,
      /\bgraphql\b/i,
      /\bgrpc\b/i,
      /\bwebsocket\b/i,
      /\bswagger\b/i,
      /\bopenapi\b/i,
      /\bwebhook\b/i,
      /\brate.?limit\b/i,
      /\bcors\b/i,
    ],
  },
  {
    name: "frontend",
    patterns: [
      /\bfrontend\b/i,
      /\bui\b/i,
      /\bux\b/i,
      /\bcss\b/i,
      /\btailwind\b/i,
      /\bhtml\b/i,
      /\bcomponent\b/i,
      /\blayout\b/i,
      /\bresponsive\b/i,
      /\baccessibility\b/i,
      /\ba11y\b/i,
      /\banimation\b/i,
      /\bdesign.?system\b/i,
      /\bfigma\b/i,
    ],
  },
  {
    name: "documentation",
    patterns: [
      /\bdocument/i,
      /\breadme\b/i,
      /\bjsdoc\b/i,
      /\btsdoc\b/i,
      /\bchangelog\b/i,
      /\bapi.?doc\b/i,
      /\btutorial\b/i,
      /\bguide\b/i,
      /\bwiki\b/i,
    ],
  },
  {
    name: "testing",
    patterns: [
      /\btest\b/i,
      /\bspec\b/i,
      /\btdd\b/i,
      /\bcoverage\b/i,
      /\bmock\b/i,
      /\bstub\b/i,
      /\bassert\b/i,
      /\bfixture\b/i,
      /\be2e\b/i,
      /\bintegration.?test\b/i,
      /\bunit.?test\b/i,
      /\bvitest\b/i,
      /\bjest\b/i,
      /\bcypress\b/i,
      /\bplaywright\b/i,
    ],
  },
  {
    name: "performance",
    patterns: [
      /\bperform/i,
      /\boptimi/i,
      /\bprofil/i,
      /\bbenchmark\b/i,
      /\blatency\b/i,
      /\bthroughput\b/i,
      /\bcache\b/i,
      /\bmemo\b/i,
      /\blazy\b/i,
      /\bspeed\b/i,
      /\bbottleneck\b/i,
      /\bmemory.?leak\b/i,
      /\bbundle.?size\b/i,
    ],
  },
  {
    name: "math_physics",
    patterns: [
      /\bmath\b/i,
      /\bformula\b/i,
      /\bequation\b/i,
      /\bcalculate\b/i,
      /\bcalculus\b/i,
      /\bphysics\b/i,
      /\bstatics\b/i,
      /\bdynamics\b/i,
      /\bthermo\b/i,
      /\bfluid\b/i,
      /\bstress\b/i,
      /\bstrain\b/i,
      /\btorque\b/i,
      /\bforce\b/i,
      /\bfriction\b/i,
      /\bheat.?transfer\b/i,
      /\bfea\b/i,
      /\bcfd\b/i,
      /\bdeflection\b/i,
      /\bbeam\b/i,
      /\bmoment\b/i,
      /\binertia\b/i,
    ],
  },
  {
    name: "business",
    patterns: [
      /\bbusiness\b/i,
      /\bstrategy\b/i,
      /\brevenue\b/i,
      /\bcost\b/i,
      /\broi\b/i,
      /\bmarket\b/i,
      /\bcompeti/i,
      /\bstakeholder\b/i,
      /\broadmap\b/i,
      /\bplanning\b/i,
      /\bbudget\b/i,
      /\bpricing\b/i,
    ],
  },
];

const roleMap = {
  typescript: "Senior TypeScript Engineer",
  python: "Senior Python Engineer",
  manufacturing: "Manufacturing Process Expert",
  architecture: "Principal Systems Architect",
  security: "Senior Security Auditor",
  data_ml: "Data Scientist & ML Engineer",
  database: "Database Architect",
  api: "API Design Specialist",
  frontend: "Senior Frontend Engineer",
  documentation: "Technical Documentation Lead",
  testing: "Senior QA & Reliability Engineer",
  performance: "Performance Optimization Specialist",
  math_physics: "Applied Mathematics & Physics Expert",
  business: "Strategic Business Analyst",
  general: "Research Specialist",
};

const skillMatchers = [
  { skill: "continue-roadmap", patterns: [/(continue roadmap|next unit|resume roadmap|what.s next)/i] },
  { skill: "generate-roadmap", patterns: [/(generate roadmap|create roadmap)/i] },
  { skill: "scrutinize", patterns: [/(scrutinize|review roadmap|validate roadmap)/i] },
  { skill: "context-budget", patterns: [/(context|token|compact|compaction|memory|survival|retention)/i] },
  { skill: "memory-prune", patterns: [/(memory prune|prune memory|trim memory|\/slim|compact context|token budget)/i] },
  { skill: "checkpoint", patterns: [/(checkpoint|handoff|resume point|save state|restore state)/i] },
  { skill: "feature-matrix", patterns: [/(hook|auto fire|autofire|automation layer|active features|feature matrix)/i] },
  { skill: "sparc:debug", patterns: [/(debug|fix|bug|error|exception|failing|broken|crash|null.?pointer|undefined|not working|doesn.t work|won.t)/i] },
  { skill: "sparc:security-review", patterns: [/(security|vulnerability|cve|audit)/i] },
  { skill: "sparc:tester", patterns: [/(test|tdd|spec|coverage)/i] },
  { skill: "sparc:optimizer", patterns: [/(refactor|optimize|clean up|simplify)/i] },
  { skill: "sparc:devops", patterns: [/(deploy|ci\/cd|pipeline|github action)/i] },
  { skill: "code-review:code-review", patterns: [/(review pr|code review|pull request)/i] },
];

const domains = unique(
  domainMatchers
    .filter((entry) => matchesAny(prompt, entry.patterns))
    .map((entry) => entry.name),
);

const finalDomains = domains.length > 0 ? domains : ["general"];
let roles = unique(finalDomains.map((domain) => roleMap[domain] ?? roleMap.general));
if (roles.length > 3) {
  roles = roles.slice(0, 3);
}

let tier = "SONNET";
let complexity = "MODERATE";
let reason = "standard engineering task";

if (/^\s*(status|what is|show me|list|how many|check|read|explain|count|where is|which file|help|what does)\b/i.test(promptRaw)) {
  tier = "HAIKU";
  complexity = "SIMPLE";
  reason = "lookup/info query";
}

if (promptLength < 40 && /\?$/.test(promptRaw.trim())) {
  tier = "HAIKU";
  complexity = "SIMPLE";
  reason = "brief question";
}

if (
  /\b(architect|design system|security audit|safety.?critical|multi.?system|integration|brainstorm|from scratch|refactor.*(entire|whole|all)|production.?ready|schema design|threat model)\b/i.test(prompt) ||
  /\b(scrutin|review.*(complex|entire|full)|roadmap.?generat|parallel.?execut|swarm|novel.?algorithm|implement.*(from|new).*(scratch|system))\b/i.test(prompt) ||
  finalDomains.includes("security") ||
  (finalDomains.includes("manufacturing") && /\b(tolerance|precision|critical|safety|spec)\b/i.test(prompt)) ||
  promptLength > 500
) {
  tier = "OPUS";
  complexity = "COMPLEX";
  reason = finalDomains.includes("security")
    ? "security-critical task"
    : finalDomains.includes("manufacturing") && /\b(tolerance|precision|critical|safety|spec)\b/i.test(prompt)
      ? "precision-critical manufacturing"
      : promptLength > 500
        ? "multi-concern detailed request"
        : /\b(scrutin|review.*(complex|entire|full)|roadmap.?generat|parallel.?execut|swarm|novel.?algorithm|implement.*(from|new).*(scratch|system))\b/i.test(prompt)
          ? "complex multi-step task"
          : "complex/critical architecture";
}

const effort = complexity === "COMPLEX" ? "HIGH" : complexity === "SIMPLE" ? "LOW" : "MEDIUM";
const skills = unique(
  skillMatchers
    .filter((entry) => matchesAny(prompt, entry.patterns))
    .map((entry) => entry.skill),
);

let execMode = "SEQUENTIAL";
if (/\b(swarm|multi.agent|distributed)\b/i.test(prompt)) {
  execMode = "SWARM";
} else if (/\b(parallel|multiple|batch|independent)\b/i.test(prompt)) {
  execMode = "PARALLEL";
}

const effortDirective =
  effort === "HIGH"
    ? "Read all relevant files, consider edge cases, validate approach, run builds/tests, explain thoroughly."
    : effort === "MEDIUM"
      ? "Read key files, implement efficiently, brief explanation."
      : "Answer directly, minimal exploration, no elaboration.";

const skillList = skills.length > 0 ? skills.join(", ") : "none";
const roleString = roles.join(" + ");
const context = `SMART CONFIG: Role=[${roleString}] Model=${tier} (${reason}) Effort=${effort} Mode=${execMode} Skills=[${skillList}] | DIRECTIVES: Adopt the role(s) above. At ${effort} effort: ${effortDirective}`;

process.stdout.write(
  JSON.stringify({ additionalContext: context }),
);
process.exit(0);
