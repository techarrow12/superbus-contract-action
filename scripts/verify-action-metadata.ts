import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface MetadataVerificationResult {
  actionInputs: string[];
  actionOutputs: string[];
  readmeInputs: string[];
  readmeOutputs: string[];
  exampleInputs: string[];
  errors: string[];
}

const EXPECTED_INPUTS = [
  "github-token",
  "contract-path",
  "contract-json",
  "post-comment",
  "fail-on-violation",
  "update-comment",
];

const EXPECTED_OUTPUTS = [
  "compliance_status",
  "changed_file_count",
  "violation_count",
  "contract_violated",
  "comment_url",
];

export function verifyActionMetadata(rootDir = process.cwd()): MetadataVerificationResult {
  const actionText = read(rootDir, "action.yml");
  const readmeText = read(rootDir, "README.md");
  const exampleText = read(rootDir, "examples/basic-workflow.yml");

  const actionInputs = parseYamlSectionKeys(actionText, "inputs");
  const actionOutputs = parseYamlSectionKeys(actionText, "outputs");
  const readmeInputs = parseMarkdownTableKeys(readmeText, "Inputs");
  const readmeOutputs = parseMarkdownTableKeys(readmeText, "Outputs");
  const exampleInputs = parseWorkflowWithInputs(exampleText);
  const actionMain = parseYamlScalar(actionText, "main");
  const actionRuntime = parseYamlScalar(actionText, "using");

  const errors: string[] = [];

  expectSameSet(errors, "action.yml inputs", actionInputs, EXPECTED_INPUTS);
  expectSameSet(errors, "README inputs", readmeInputs, EXPECTED_INPUTS);
  expectSameSet(errors, "action.yml outputs", actionOutputs, EXPECTED_OUTPUTS);
  expectSameSet(errors, "README outputs", readmeOutputs, EXPECTED_OUTPUTS);

  for (const input of exampleInputs) {
    if (!actionInputs.includes(input)) {
      errors.push(`examples/basic-workflow.yml uses unknown input: ${input}`);
    }
  }

  if (!/^on:\s*\n\s+pull_request:/m.test(exampleText)) {
    errors.push("examples/basic-workflow.yml must run on pull_request");
  }

  if (!exampleText.includes("uses: techarrow12/superbus-contract-action@v0.1.0")) {
    errors.push("examples/basic-workflow.yml must use techarrow12/superbus-contract-action@v0.1.0");
  }

  if (!exampleInputs.includes("github-token")) {
    errors.push("examples/basic-workflow.yml must pass github-token");
  }

  if (actionRuntime !== "node20") {
    errors.push(`action.yml runs.using must be node20; got ${actionRuntime || "(missing)"}`);
  }

  if (actionMain !== "dist/main.js") {
    errors.push(`action.yml runs.main must be dist/main.js; got ${actionMain || "(missing)"}`);
  }

  if (!existsSync(resolve(rootDir, actionMain || ""))) {
    errors.push(`action.yml main file does not exist: ${actionMain || "(missing)"}`);
  }

  if (!readmeText.includes("`.superbus/agent-contract.json`")) {
    errors.push("README must document the default contract-path .superbus/agent-contract.json");
  }

  if (!readmeText.includes("fail-on-violation") || !readmeText.includes("`false`")) {
    errors.push("README must document fail-on-violation default false");
  }

  return {
    actionInputs,
    actionOutputs,
    readmeInputs,
    readmeOutputs,
    exampleInputs,
    errors,
  };
}

function read(rootDir: string, relativePath: string): string {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function parseYamlSectionKeys(text: string, section: string): string[] {
  const lines = text.split(/\r?\n/);
  const keys: string[] = [];
  let inSection = false;

  for (const line of lines) {
    if (line === `${section}:`) {
      inSection = true;
      continue;
    }

    if (inSection && /^\S/.test(line)) {
      break;
    }

    const match = /^  ([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (inSection && match) {
      keys.push(match[1]);
    }
  }

  return keys;
}

function parseYamlScalar(text: string, key: string): string | null {
  const match = new RegExp(`^\\s+${key}:\\s+"?([^"\\n]+)"?\\s*$`, "m").exec(text);
  return match?.[1]?.trim() ?? null;
}

function parseMarkdownTableKeys(text: string, heading: string): string[] {
  const headingIndex = text.indexOf(`## ${heading}`);
  if (headingIndex === -1) {
    return [];
  }

  const nextHeadingIndex = text.indexOf("\n## ", headingIndex + 1);
  const section = text.slice(headingIndex, nextHeadingIndex === -1 ? undefined : nextHeadingIndex);
  const keys: string[] = [];

  for (const line of section.split(/\r?\n/)) {
    const match = /^\|\s*`([^`]+)`\s*\|/.exec(line);
    if (match) {
      keys.push(match[1]);
    }
  }

  return keys;
}

function parseWorkflowWithInputs(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const inputs: string[] = [];
  let inWith = false;
  let withIndent = 0;

  for (const line of lines) {
    const withMatch = /^(\s*)with:\s*$/.exec(line);
    if (withMatch) {
      inWith = true;
      withIndent = withMatch[1].length;
      continue;
    }

    if (!inWith) {
      continue;
    }

    const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
    if (line.trim().length > 0 && indent <= withIndent) {
      inWith = false;
      continue;
    }

    const inputMatch = /^\s+([A-Za-z0-9_-]+):/.exec(line);
    if (inputMatch) {
      inputs.push(inputMatch[1]);
    }
  }

  return inputs;
}

function expectSameSet(errors: string[], label: string, actual: string[], expected: string[]): void {
  const missing = expected.filter((item) => !actual.includes(item));
  const extra = actual.filter((item) => !expected.includes(item));

  if (missing.length > 0) {
    errors.push(`${label} missing: ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    errors.push(`${label} has unexpected entries: ${extra.join(", ")}`);
  }
}

if (process.argv[1]?.endsWith("verify-action-metadata.ts")) {
  const result = verifyActionMetadata();
  if (result.errors.length > 0) {
    console.error(result.errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Action metadata verification passed.");
  }
}
