import { describe, expect, it } from "vitest";
import { COMMENT_MARKER } from "../src/comment.js";
import { getPRChangedFiles, getPullRequestContext, postContractComment, type OctokitLike } from "../src/github.js";

function createOctokit(files: string[], comments: Array<{ id: number; body?: string | null }> = []): OctokitLike & {
  created: string[];
  updated: string[];
} {
  const created: string[] = [];
  const updated: string[] = [];
  return {
    created,
    updated,
    rest: {
      pulls: {
        async listFiles(input) {
          const start = (input.page - 1) * input.per_page;
          return { data: files.slice(start, start + input.per_page).map((filename) => ({ filename })) };
        },
      },
      issues: {
        async listComments() {
          return { data: comments };
        },
        async createComment(input) {
          created.push(input.body);
          return { data: { html_url: "https://example.test/new" } };
        },
        async updateComment(input) {
          updated.push(input.body);
          return { data: { html_url: `https://example.test/${input.comment_id}` } };
        },
      },
    },
  };
}

describe("GitHub helpers", () => {
  it("extracts pull request context", () => {
    expect(getPullRequestContext({
      repo: { owner: "acme", repo: "demo" },
      payload: { pull_request: { number: 12 } },
    })).toEqual({ owner: "acme", repo: "demo", pullNumber: 12 });
  });

  it("fetches changed files with pagination and cap", async () => {
    const octokit = createOctokit(Array.from({ length: 130 }, (_, index) => `file-${index}.ts`));
    const files = await getPRChangedFiles(octokit, { owner: "a", repo: "b", pullNumber: 1 }, 120);
    expect(files).toHaveLength(120);
    expect(files[119]).toBe("file-119.ts");
  });

  it("updates an existing comment when marker is present", async () => {
    const octokit = createOctokit([], [{ id: 99, body: `${COMMENT_MARKER}\nold` }]);
    const url = await postContractComment({
      octokit,
      context: { owner: "a", repo: "b", issueNumber: 1 },
      body: `${COMMENT_MARKER}\nnew`,
      updateComment: true,
    });

    expect(url).toBe("https://example.test/99");
    expect(octokit.updated).toHaveLength(1);
    expect(octokit.created).toHaveLength(0);
  });
});
