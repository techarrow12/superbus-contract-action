// src/main.ts
import * as core from "@actions/core";
import * as github from "@actions/github";

// src/comment.ts
var COMMENT_MARKER = "<!-- superbus-contract-action -->";
function renderComment(input) {
  const statusLabel = formatStatus(input.result.status);
  const lines = [
    COMMENT_MARKER,
    "## Superbus Contract Check",
    "",
    `### ${statusLabel}`,
    "",
    "| Field | Value |",
    "|---|---|",
    `| Status | ${statusLabel} |`,
    `| Contract source | ${escapeTableCell(input.contractSource)} |`,
    `| Changed files | ${input.result.changed_file_count} |`,
    `| Violations | ${input.result.violations.length} |`,
    `| Contract mode | \`${input.contract.mode ?? "write_allowed"}\` |`,
    `| Max files | ${input.contract.max_files ?? "not set"} |`,
    "",
    "### What Happened",
    "",
    input.result.summary,
    "",
    "### Allowed Scope",
    "",
    ...formatList(input.contract.allowed_scope),
    "",
    "### Blocked Scope",
    "",
    ...formatList(input.contract.blocked_scope ?? []),
    ""
  ];
  if (input.result.violations.length > 0) {
    lines.push("### Violations", "");
    lines.push("| File | Rule | Reason |");
    lines.push("|---|---|---|");
    for (const violation of input.result.violations) {
      lines.push(
        `| \`${escapeTableCell(violation.file)}\` | \`${violation.rule}\` | ${escapeTableCell(violation.reason)} |`
      );
    }
    lines.push("");
  }
  lines.push("### Recommendation");
  lines.push("");
  lines.push(input.result.recommendation);
  lines.push("");
  lines.push("_No source code was uploaded. This check used PR changed-file paths only._");
  return lines.join("\n");
}
function formatStatus(status) {
  switch (status) {
    case "within_contract":
      return "\u2705 Within Contract";
    case "violated_contract":
      return "\u{1F6AB} Contract Violated";
    case "not_applicable":
      return "\u2139\uFE0F Not Applicable";
  }
}
function formatList(items) {
  if (items.length === 0) {
    return ["- none"];
  }
  return items.map((item) => `- \`${item}\``);
}
function escapeTableCell(value) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

// src/glob.ts
function normalizePath(path) {
  const normalized = path.replace(/\\/g, "/").replace(/\/+/g, "/");
  const parts = normalized.split("/");
  const safeParts = [];
  for (const part of parts) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      const previous = safeParts.at(-1);
      if (previous && previous !== "**") {
        safeParts.pop();
      }
      continue;
    }
    safeParts.push(part);
  }
  return safeParts.join("/");
}
function matchesPattern(filePath, pattern) {
  const file = normalizePath(filePath);
  const normalizedPattern = normalizePath(pattern.trim());
  const fileForMatch = file.toLowerCase();
  const patternForMatch = normalizedPattern.toLowerCase();
  if (patternForMatch === "**" || patternForMatch === "**/*") {
    return true;
  }
  if (fileForMatch === patternForMatch) {
    return true;
  }
  if (patternForMatch.endsWith("/**") && !patternForMatch.slice(0, -3).includes("*") && !patternForMatch.includes("?")) {
    const prefix = patternForMatch.slice(0, -3);
    return fileForMatch === prefix || fileForMatch.startsWith(`${prefix}/`);
  }
  const regex = globToRegExp(patternForMatch);
  return regex.test(fileForMatch);
}
function matchesAnyPattern(filePath, patterns = []) {
  return patterns.some((pattern) => matchesPattern(filePath, pattern));
}
function globToRegExp(pattern) {
  let source = "^";
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    const next = pattern[i + 1];
    if (char === "*") {
      if (next === "*") {
        const after = pattern[i + 2];
        if (after === "/") {
          source += "(?:.*/)?";
          i += 2;
        } else {
          source += ".*";
          i += 1;
        }
      } else {
        source += "[^/]*";
      }
      continue;
    }
    if (char === "?") {
      source += "[^/]";
      continue;
    }
    source += escapeRegExp(char);
  }
  source += "$";
  return new RegExp(source);
}
function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

// src/compliance.ts
function checkCompliance(contract, changedFiles) {
  const files = changedFiles.map(normalizePath);
  if (files.length === 0) {
    return {
      status: "not_applicable",
      summary: "No changed files were found for this pull request.",
      violations: [],
      changed_file_count: 0,
      blocked_files_touched: [],
      out_of_scope_files: [],
      recommendation: "No action required until the pull request changes files."
    };
  }
  const violations = [];
  const blockedFilesTouched = [];
  const outOfScopeFiles = [];
  if (contract.mode === "inspect_only") {
    for (const file of files) {
      violations.push({
        file,
        reason: "Contract mode is inspect_only, so no files may be changed.",
        severity: "blocker",
        rule: "inspect_only"
      });
    }
    return buildResult(files.length, violations, blockedFilesTouched, outOfScopeFiles);
  }
  if (contract.mode === "approval_required") {
    for (const file of files) {
      violations.push({
        file,
        reason: "Contract mode is approval_required, so changes require explicit approval before merge.",
        severity: "blocker",
        rule: "approval_required"
      });
    }
    return buildResult(files.length, violations, blockedFilesTouched, outOfScopeFiles);
  }
  const blockedScope = contract.blocked_scope ?? [];
  for (const file of files) {
    if (matchesAnyPattern(file, blockedScope)) {
      blockedFilesTouched.push(file);
      violations.push({
        file,
        reason: "File matches blocked_scope.",
        severity: "blocker",
        rule: "blocked_scope"
      });
    }
  }
  for (const file of files) {
    if (!matchesAnyPattern(file, contract.allowed_scope)) {
      outOfScopeFiles.push(file);
      violations.push({
        file,
        reason: "File is outside allowed_scope.",
        severity: "blocker",
        rule: "outside_allowed_scope"
      });
    }
  }
  if (contract.max_files !== void 0 && files.length > contract.max_files) {
    violations.push({
      file: `(${files.length} files total)`,
      reason: `Changed file count exceeds max_files (${contract.max_files}).`,
      severity: "blocker",
      rule: "max_files"
    });
  }
  return buildResult(files.length, violations, blockedFilesTouched, outOfScopeFiles);
}
function buildResult(changedFileCount, violations, blockedFilesTouched, outOfScopeFiles) {
  if (violations.length === 0) {
    return {
      status: "within_contract",
      summary: `${changedFileCount} changed file${changedFileCount === 1 ? "" : "s"} stayed inside the contract.`,
      violations: [],
      changed_file_count: changedFileCount,
      blocked_files_touched: [],
      out_of_scope_files: [],
      recommendation: "The pull request stayed within the Agent Contract."
    };
  }
  return {
    status: "violated_contract",
    summary: `${violations.length} contract violation${violations.length === 1 ? "" : "s"} found across ${changedFileCount} changed file${changedFileCount === 1 ? "" : "s"}.`,
    violations,
    changed_file_count: changedFileCount,
    blocked_files_touched: [...new Set(blockedFilesTouched)],
    out_of_scope_files: [...new Set(outOfScopeFiles)],
    recommendation: buildRecommendation(violations)
  };
}
function buildRecommendation(violations) {
  if (violations.some((violation) => violation.rule === "inspect_only")) {
    return "Revert the file changes or use a write_allowed contract before modifying files.";
  }
  if (violations.some((violation) => violation.rule === "approval_required")) {
    return "Get explicit approval before merging or rerun with a write_allowed contract.";
  }
  if (violations.some((violation) => violation.rule === "blocked_scope")) {
    return "Do not merge until blocked-scope changes are removed from this PR or a new contract explicitly permits them.";
  }
  if (violations.some((violation) => violation.rule === "outside_allowed_scope")) {
    return "Do not merge until out-of-scope changes are moved into a separate PR or the contract is updated.";
  }
  if (violations.some((violation) => violation.rule === "max_files")) {
    return "Do not merge until the work is split into smaller PRs or max_files is raised in the contract.";
  }
  return "Review the contract violations before merging.";
}

// src/contract.ts
import { readFile } from "fs/promises";
import { resolve } from "path";
function parseAgentContract(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Agent Contract must be valid JSON.");
  }
  return validateAgentContract(parsed);
}
async function loadAgentContract(source, workspace = process.env["GITHUB_WORKSPACE"] ?? process.cwd()) {
  if (source.kind === "inline") {
    return parseAgentContract(source.json);
  }
  const filePath = resolve(workspace, source.path);
  let raw;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new Error(
        `Agent Contract file not found at ${source.path}. Create that file or pass contract-json.`
      );
    }
    throw new Error(`Could not read Agent Contract file at ${source.path}.`);
  }
  return parseAgentContract(raw);
}
function validateAgentContract(value) {
  if (!isRecord(value)) {
    throw new Error("Agent Contract must be a JSON object.");
  }
  if (value.schema_version !== 1) {
    throw new Error("Agent Contract schema_version must be 1.");
  }
  const allowedScope = readRequiredStringArray(value.allowed_scope, "allowed_scope");
  const blockedScope = readStringArray(value.blocked_scope, "blocked_scope", false);
  const stopConditions = readStringArray(value.stop_conditions, "stop_conditions", false);
  const maxFiles = readOptionalMaxFiles(value.max_files);
  const mode = readOptionalMode(value.mode);
  return {
    schema_version: 1,
    allowed_scope: allowedScope,
    blocked_scope: blockedScope ?? [],
    ...maxFiles === void 0 ? {} : { max_files: maxFiles },
    mode: mode ?? "write_allowed",
    ...stopConditions === void 0 ? {} : { stop_conditions: stopConditions }
  };
}
function readStringArray(value, name, required) {
  if (value === void 0 && !required) {
    return void 0;
  }
  if (!Array.isArray(value)) {
    throw new Error(`Agent Contract ${name} must be an array of strings.`);
  }
  const strings = value.map((item) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error(`Agent Contract ${name} must contain only non-empty strings.`);
    }
    return item.trim();
  });
  if (required && strings.length === 0) {
    throw new Error(`Agent Contract ${name} must contain at least one pattern.`);
  }
  return strings;
}
function readRequiredStringArray(value, name) {
  const result = readStringArray(value, name, true);
  if (!result) {
    throw new Error(`Agent Contract ${name} must contain at least one pattern.`);
  }
  return result;
}
function readOptionalMaxFiles(value) {
  if (value === void 0) {
    return void 0;
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("Agent Contract max_files must be a non-negative integer.");
  }
  return value;
}
function readOptionalMode(value) {
  if (value === void 0) {
    return void 0;
  }
  if (value === "write_allowed" || value === "approval_required" || value === "inspect_only") {
    return value;
  }
  throw new Error("Agent Contract mode must be write_allowed, approval_required, or inspect_only.");
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNodeError(error) {
  return error instanceof Error && "code" in error;
}

// src/github.ts
var PAGE_SIZE = 100;
var MAX_CHANGED_FILES = 500;
function getPullRequestContext(context2) {
  const pullNumber = context2.payload.pull_request?.number;
  if (typeof pullNumber !== "number" || !Number.isSafeInteger(pullNumber) || pullNumber <= 0) {
    return null;
  }
  return {
    owner: context2.repo.owner,
    repo: context2.repo.repo,
    pullNumber
  };
}
async function getPRChangedFiles(octokit, context2, maxChangedFiles = MAX_CHANGED_FILES) {
  const filenames = [];
  for (let page = 1; filenames.length < maxChangedFiles; page += 1) {
    const { data } = await octokit.rest.pulls.listFiles({
      owner: context2.owner,
      repo: context2.repo,
      pull_number: context2.pullNumber,
      per_page: PAGE_SIZE,
      page
    });
    filenames.push(...data.map((file) => file.filename));
    if (data.length < PAGE_SIZE) {
      break;
    }
  }
  return filenames.slice(0, maxChangedFiles);
}
async function postContractComment(input) {
  if (input.updateComment) {
    const existing = await findExistingContractComment(input.octokit, input.context);
    if (existing) {
      const { data: data2 } = await input.octokit.rest.issues.updateComment({
        owner: input.context.owner,
        repo: input.context.repo,
        comment_id: existing.id,
        body: input.body
      });
      return data2.html_url ?? "";
    }
  }
  const { data } = await input.octokit.rest.issues.createComment({
    owner: input.context.owner,
    repo: input.context.repo,
    issue_number: input.context.issueNumber,
    body: input.body
  });
  return data.html_url ?? "";
}
async function findExistingContractComment(octokit, context2) {
  for (let page = 1; page <= 5; page += 1) {
    const { data } = await octokit.rest.issues.listComments({
      owner: context2.owner,
      repo: context2.repo,
      issue_number: context2.issueNumber,
      per_page: PAGE_SIZE,
      page
    });
    const match = data.find((comment) => comment.body?.includes(COMMENT_MARKER));
    if (match) {
      return { id: match.id };
    }
    if (data.length < PAGE_SIZE) {
      break;
    }
  }
  return null;
}

// src/inputs.ts
var DEFAULT_CONTRACT_PATH = ".superbus/agent-contract.json";
function parseInputs(core2) {
  const githubToken = core2.getInput("github-token").trim();
  const rawContractPath = core2.getInput("contract-path").trim();
  const contractJson = core2.getInput("contract-json").trim();
  const hasCustomContractPath = rawContractPath.length > 0 && rawContractPath !== DEFAULT_CONTRACT_PATH;
  if (hasCustomContractPath && contractJson) {
    throw new Error("Use either contract-path or contract-json, not both.");
  }
  const contractPath = rawContractPath || DEFAULT_CONTRACT_PATH;
  return {
    githubToken,
    contractSource: contractJson ? { kind: "inline", json: contractJson } : { kind: "path", path: contractPath },
    postComment: parseBoolean(core2.getInput("post-comment"), true, "post-comment"),
    failOnViolation: parseBoolean(core2.getInput("fail-on-violation"), false, "fail-on-violation"),
    updateComment: parseBoolean(core2.getInput("update-comment"), true, "update-comment")
  };
}
function parseBoolean(raw, fallback, name) {
  const value = raw.trim().toLowerCase();
  if (!value) {
    return fallback;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`Input ${name} must be true or false.`);
}

// src/main.ts
async function run(deps = {}) {
  const actionCore = deps.core ?? core;
  const context2 = deps.context ?? github.context;
  const getOctokit2 = deps.getOctokit ?? ((token) => github.getOctokit(token));
  const inputs = parseInputs(actionCore);
  const contract = await loadAgentContract(inputs.contractSource, deps.workspace);
  const prContext = getPullRequestContext(context2);
  if (!prContext) {
    throw new Error("superbus-contract-action must run on a pull_request event.");
  }
  if (!inputs.githubToken) {
    throw new Error("github-token is required to fetch PR changed files.");
  }
  const octokit = getOctokit2(inputs.githubToken);
  const changedFiles = await getPRChangedFiles(octokit, prContext);
  const result = checkCompliance(contract, changedFiles);
  const commentBody = renderComment({
    contract,
    result,
    contractSource: formatContractSource(inputs.contractSource)
  });
  let commentUrl = "";
  if (inputs.postComment) {
    commentUrl = await postContractComment({
      octokit,
      context: {
        owner: prContext.owner,
        repo: prContext.repo,
        issueNumber: prContext.pullNumber
      },
      body: commentBody,
      updateComment: inputs.updateComment
    });
  }
  actionCore.setOutput("compliance_status", result.status);
  actionCore.setOutput("changed_file_count", String(result.changed_file_count));
  actionCore.setOutput("violation_count", String(result.violations.length));
  actionCore.setOutput("contract_violated", String(result.status === "violated_contract"));
  actionCore.setOutput("comment_url", commentUrl);
  actionCore.info(result.summary);
  if (result.status === "violated_contract" && inputs.failOnViolation) {
    actionCore.setFailed(result.summary);
  }
}
if (process.env["NODE_ENV"] !== "test") {
  run().catch((error) => {
    core.setFailed(error instanceof Error ? error.message : String(error));
  });
}
function formatContractSource(source) {
  return source.kind === "path" ? source.path : "contract-json";
}
export {
  run
};
//# sourceMappingURL=main.js.map