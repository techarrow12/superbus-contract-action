import type { AgentContract } from "./contract.js";
import { matchesAnyPattern, matchesPattern, normalizePath } from "./glob.js";

export type ComplianceStatus =
  | "within_contract"
  | "violated_contract"
  | "not_applicable";

export interface ScopeViolation {
  file: string;
  reason: string;
  severity: "blocker" | "warning";
  matched_pattern?: string;
  rule:
    | "inspect_only"
    | "approval_required"
    | "blocked_scope"
    | "outside_allowed_scope"
    | "max_files";
}

export interface ScopeComplianceResult {
  status: ComplianceStatus;
  summary: string;
  violations: ScopeViolation[];
  changed_file_count: number;
  blocked_files_touched: string[];
  out_of_scope_files: string[];
  recommendation: string;
}

export function checkCompliance(
  contract: AgentContract,
  changedFiles: string[],
): ScopeComplianceResult {
  const files = changedFiles.map(normalizePath);

  if (files.length === 0) {
    return {
      status: "not_applicable",
      summary: "No changed files were found for this pull request.",
      violations: [],
      changed_file_count: 0,
      blocked_files_touched: [],
      out_of_scope_files: [],
      recommendation: "No action required until the pull request changes files.",
    };
  }

  const violations: ScopeViolation[] = [];
  const blockedFilesTouched: string[] = [];
  const outOfScopeFiles: string[] = [];

  if (contract.mode === "inspect_only") {
    for (const file of files) {
      violations.push({
        file,
        reason: "Contract mode is inspect_only, so no files may be changed.",
        severity: "blocker",
        rule: "inspect_only",
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
        rule: "approval_required",
      });
    }
    return buildResult(files.length, violations, blockedFilesTouched, outOfScopeFiles);
  }

  const blockedScope = contract.blocked_scope ?? [];
  for (const file of files) {
    const matchedPattern = findMatchingPattern(file, blockedScope);
    if (matchedPattern) {
      blockedFilesTouched.push(file);
      violations.push({
        file,
        reason: `${file} matched blocked_scope: ${matchedPattern}.`,
        severity: "blocker",
        matched_pattern: matchedPattern,
        rule: "blocked_scope",
      });
    }
  }

  const blockedFileSet = new Set(blockedFilesTouched);
  for (const file of files) {
    if (blockedFileSet.has(file)) {
      continue;
    }
    if (!matchesAnyPattern(file, contract.allowed_scope)) {
      outOfScopeFiles.push(file);
      violations.push({
        file,
        reason: "File is outside allowed_scope.",
        severity: "blocker",
        rule: "outside_allowed_scope",
      });
    }
  }

  if (contract.max_files !== undefined && files.length > contract.max_files) {
    violations.push({
      file: `(${files.length} files total)`,
      reason: `Changed file count exceeds max_files (${contract.max_files}).`,
      severity: "blocker",
      rule: "max_files",
    });
  }

  return buildResult(files.length, violations, blockedFilesTouched, outOfScopeFiles);
}

function findMatchingPattern(file: string, patterns: string[]): string | undefined {
  return patterns.find((pattern) => matchesPattern(file, pattern));
}

function buildResult(
  changedFileCount: number,
  violations: ScopeViolation[],
  blockedFilesTouched: string[],
  outOfScopeFiles: string[],
): ScopeComplianceResult {
  if (violations.length === 0) {
    return {
      status: "within_contract",
      summary: `${changedFileCount} changed file${changedFileCount === 1 ? "" : "s"} stayed inside the contract.`,
      violations: [],
      changed_file_count: changedFileCount,
      blocked_files_touched: [],
      out_of_scope_files: [],
      recommendation: "The pull request stayed within the Agent Contract.",
    };
  }

  return {
    status: "violated_contract",
    summary: `${violations.length} contract violation${violations.length === 1 ? "" : "s"} found across ${changedFileCount} changed file${changedFileCount === 1 ? "" : "s"}.`,
    violations,
    changed_file_count: changedFileCount,
    blocked_files_touched: [...new Set(blockedFilesTouched)],
    out_of_scope_files: [...new Set(outOfScopeFiles)],
    recommendation: buildRecommendation(violations),
  };
}

function buildRecommendation(violations: ScopeViolation[]): string {
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
