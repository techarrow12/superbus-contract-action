import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface AgentContract {
  schema_version: 1;
  allowed_scope: string[];
  blocked_scope?: string[];
  max_files?: number;
  mode?: "write_allowed" | "approval_required" | "inspect_only";
  stop_conditions?: string[];
}

export type ContractSource =
  | { kind: "path"; path: string }
  | { kind: "inline"; json: string };

export function parseAgentContract(raw: string): AgentContract {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Agent Contract must be valid JSON.");
  }

  return validateAgentContract(parsed);
}

export async function loadAgentContract(
  source: ContractSource,
  workspace = process.env["GITHUB_WORKSPACE"] ?? process.cwd(),
): Promise<AgentContract> {
  if (source.kind === "inline") {
    return parseAgentContract(source.json);
  }

  const filePath = resolve(workspace, source.path);
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new Error(
        `Agent Contract file not found at ${source.path}. Create that file or pass contract-json.`,
      );
    }
    throw new Error(`Could not read Agent Contract file at ${source.path}.`);
  }
  return parseAgentContract(raw);
}

export function validateAgentContract(value: unknown): AgentContract {
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
    ...(maxFiles === undefined ? {} : { max_files: maxFiles }),
    mode: mode ?? "write_allowed",
    ...(stopConditions === undefined ? {} : { stop_conditions: stopConditions }),
  };
}

function readStringArray(value: unknown, name: string, required: boolean): string[] | undefined {
  if (value === undefined && !required) {
    return undefined;
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

function readRequiredStringArray(value: unknown, name: string): string[] {
  const result = readStringArray(value, name, true);
  if (!result) {
    throw new Error(`Agent Contract ${name} must contain at least one pattern.`);
  }
  return result;
}

function readOptionalMaxFiles(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("Agent Contract max_files must be a non-negative integer.");
  }
  return value;
}

function readOptionalMode(value: unknown): AgentContract["mode"] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === "write_allowed" || value === "approval_required" || value === "inspect_only") {
    return value;
  }
  throw new Error("Agent Contract mode must be write_allowed, approval_required, or inspect_only.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
