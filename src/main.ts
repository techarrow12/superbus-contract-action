import * as core from "@actions/core";
import * as github from "@actions/github";
import { renderComment } from "./comment.js";
import { checkCompliance } from "./compliance.js";
import { loadAgentContract } from "./contract.js";
import { getPRChangedFiles, getPullRequestContext, postContractComment, type GitHubActionContext, type OctokitLike } from "./github.js";
import { parseInputs, type CoreInputReader } from "./inputs.js";

export interface ActionCore extends CoreInputReader {
  setOutput(name: string, value: string): void;
  info(message: string): void;
  warning(message: string): void;
  setFailed(message: string): void;
}

export interface RunDeps {
  core?: ActionCore;
  context?: GitHubActionContext;
  getOctokit?: (token: string) => OctokitLike;
  workspace?: string;
}

export async function run(deps: RunDeps = {}): Promise<void> {
  const actionCore = deps.core ?? core;
  const context = deps.context ?? github.context;
  const getOctokit = deps.getOctokit ?? ((token: string) => github.getOctokit(token) as OctokitLike);

  const inputs = parseInputs(actionCore);
  const contract = await loadAgentContract(inputs.contractSource, deps.workspace);
  const prContext = getPullRequestContext(context);

  if (!prContext) {
    throw new Error("superbus-contract-action must run on a pull_request event.");
  }

  if (!inputs.githubToken) {
    throw new Error("github-token is required to fetch PR changed files.");
  }

  const octokit = getOctokit(inputs.githubToken);
  const changedFiles = await getPRChangedFiles(octokit, prContext);
  const result = checkCompliance(contract, changedFiles);
  const commentBody = renderComment({
    contract,
    result,
    contractSource: formatContractSource(inputs.contractSource),
  });

  let commentUrl = "";
  if (inputs.postComment) {
    commentUrl = await postContractComment({
      octokit,
      context: {
        owner: prContext.owner,
        repo: prContext.repo,
        issueNumber: prContext.pullNumber,
      },
      body: commentBody,
      updateComment: inputs.updateComment,
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
  run().catch((error: unknown) => {
    core.setFailed(error instanceof Error ? error.message : String(error));
  });
}

function formatContractSource(source: { kind: "path"; path: string } | { kind: "inline"; json: string }): string {
  return source.kind === "path" ? source.path : "contract-json";
}
