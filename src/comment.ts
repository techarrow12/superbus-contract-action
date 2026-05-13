import type { AgentContract } from "./contract.js";
import type { ScopeComplianceResult } from "./compliance.js";

export const COMMENT_MARKER = "<!-- superbus-contract-action -->";

export function renderComment(input: {
  contract: AgentContract;
  result: ScopeComplianceResult;
  contractSource: string;
}): string {
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
    "",
  ];

  if (input.result.violations.length > 0) {
    lines.push("### Violations", "");
    lines.push("| File | Rule | Reason |");
    lines.push("|---|---|---|");
    for (const violation of input.result.violations) {
      lines.push(
        `| \`${escapeTableCell(violation.file)}\` | \`${violation.rule}\` | ${escapeTableCell(violation.reason)} |`,
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

function formatStatus(status: ScopeComplianceResult["status"]): string {
  switch (status) {
    case "within_contract":
      return "✅ Within Contract";
    case "violated_contract":
      return "🚫 Contract Violated";
    case "not_applicable":
      return "ℹ️ Not Applicable";
  }
}

function formatList(items: string[]): string[] {
  if (items.length === 0) {
    return ["- none"];
  }
  return items.map((item) => `- \`${item}\``);
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
