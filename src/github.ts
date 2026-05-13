import { COMMENT_MARKER } from "./comment.js";

export interface GitHubRepo {
  owner: string;
  repo: string;
}

export interface GitHubIssueContext extends GitHubRepo {
  issueNumber: number;
}

export interface PullRequestContext extends GitHubRepo {
  pullNumber: number;
}

export interface GitHubActionContext {
  repo: GitHubRepo;
  payload: {
    pull_request?: {
      number?: number;
    };
  };
}

export interface OctokitLike {
  rest: {
    pulls: {
      listFiles(input: {
        owner: string;
        repo: string;
        pull_number: number;
        per_page: number;
        page: number;
      }): Promise<{ data: Array<{ filename: string }> }>;
    };
    issues: {
      listComments(input: {
        owner: string;
        repo: string;
        issue_number: number;
        per_page: number;
        page: number;
      }): Promise<{ data: Array<{ id: number; body?: string | null }> }>;
      createComment(input: {
        owner: string;
        repo: string;
        issue_number: number;
        body: string;
      }): Promise<{ data: { html_url?: string } }>;
      updateComment(input: {
        owner: string;
        repo: string;
        comment_id: number;
        body: string;
      }): Promise<{ data: { html_url?: string } }>;
    };
  };
}

const PAGE_SIZE = 100;
const MAX_CHANGED_FILES = 500;

export function getPullRequestContext(context: GitHubActionContext): PullRequestContext | null {
  const pullNumber = context.payload.pull_request?.number;
  if (typeof pullNumber !== "number" || !Number.isSafeInteger(pullNumber) || pullNumber <= 0) {
    return null;
  }

  return {
    owner: context.repo.owner,
    repo: context.repo.repo,
    pullNumber,
  };
}

export async function getPRChangedFiles(
  octokit: OctokitLike,
  context: PullRequestContext,
  maxChangedFiles = MAX_CHANGED_FILES,
): Promise<string[]> {
  const filenames: string[] = [];

  for (let page = 1; filenames.length < maxChangedFiles; page += 1) {
    const { data } = await octokit.rest.pulls.listFiles({
      owner: context.owner,
      repo: context.repo,
      pull_number: context.pullNumber,
      per_page: PAGE_SIZE,
      page,
    });

    filenames.push(...data.map((file) => file.filename));
    if (data.length < PAGE_SIZE) {
      break;
    }
  }

  return filenames.slice(0, maxChangedFiles);
}

export async function postContractComment(input: {
  octokit: OctokitLike;
  context: GitHubIssueContext;
  body: string;
  updateComment: boolean;
}): Promise<string> {
  if (input.updateComment) {
    const existing = await findExistingContractComment(input.octokit, input.context);
    if (existing) {
      const { data } = await input.octokit.rest.issues.updateComment({
        owner: input.context.owner,
        repo: input.context.repo,
        comment_id: existing.id,
        body: input.body,
      });
      return data.html_url ?? "";
    }
  }

  const { data } = await input.octokit.rest.issues.createComment({
    owner: input.context.owner,
    repo: input.context.repo,
    issue_number: input.context.issueNumber,
    body: input.body,
  });
  return data.html_url ?? "";
}

async function findExistingContractComment(
  octokit: OctokitLike,
  context: GitHubIssueContext,
): Promise<{ id: number } | null> {
  for (let page = 1; page <= 5; page += 1) {
    const { data } = await octokit.rest.issues.listComments({
      owner: context.owner,
      repo: context.repo,
      issue_number: context.issueNumber,
      per_page: PAGE_SIZE,
      page,
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
