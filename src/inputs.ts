import type { ContractSource } from "./contract.js";

export interface CoreInputReader {
  getInput(name: string): string;
}

export interface ActionInputs {
  githubToken: string;
  contractSource: ContractSource;
  postComment: boolean;
  failOnViolation: boolean;
  updateComment: boolean;
}

export const DEFAULT_CONTRACT_PATH = ".superbus/agent-contract.json";

export function parseInputs(core: CoreInputReader): ActionInputs {
  const githubToken = core.getInput("github-token").trim();
  const rawContractPath = core.getInput("contract-path").trim();
  const contractJson = core.getInput("contract-json").trim();
  const hasCustomContractPath = rawContractPath.length > 0 && rawContractPath !== DEFAULT_CONTRACT_PATH;

  if (hasCustomContractPath && contractJson) {
    throw new Error("Use either contract-path or contract-json, not both.");
  }

  const contractPath = rawContractPath || DEFAULT_CONTRACT_PATH;

  return {
    githubToken,
    contractSource: contractJson
      ? { kind: "inline", json: contractJson }
      : { kind: "path", path: contractPath },
    postComment: parseBoolean(core.getInput("post-comment"), true, "post-comment"),
    failOnViolation: parseBoolean(core.getInput("fail-on-violation"), false, "fail-on-violation"),
    updateComment: parseBoolean(core.getInput("update-comment"), true, "update-comment"),
  };
}

function parseBoolean(raw: string, fallback: boolean, name: string): boolean {
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
