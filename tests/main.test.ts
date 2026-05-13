import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { run, type ActionCore } from "../src/main.js";
import type { OctokitLike } from "../src/github.js";

class MockCore implements ActionCore {
  outputs = new Map<string, string>();
  failed = "";
  infos: string[] = [];

  constructor(private readonly inputs: Record<string, string>) {}

  getInput(name: string): string {
    return this.inputs[name] ?? "";
  }

  setOutput(name: string, value: string): void {
    this.outputs.set(name, value);
  }

  info(message: string): void {
    this.infos.push(message);
  }

  warning(): void {}

  setFailed(message: string): void {
    this.failed = message;
  }
}

function createOctokit(files: string[]): OctokitLike {
  return {
    rest: {
      pulls: {
        async listFiles() {
          return { data: files.map((filename) => ({ filename })) };
        },
      },
      issues: {
        async listComments() {
          return { data: [] };
        },
        async createComment() {
          return { data: { html_url: "https://example.test/comment" } };
        },
        async updateComment() {
          return { data: { html_url: "https://example.test/comment" } };
        },
      },
    },
  };
}

function createReadOnlyOctokit(files: string[]): OctokitLike {
  return {
    rest: {
      pulls: {
        async listFiles() {
          return { data: files.map((filename) => ({ filename })) };
        },
      },
      issues: {
        async listComments() {
          throw new Error("comments API should not be called when post-comment=false");
        },
        async createComment() {
          throw new Error("comments API should not be called when post-comment=false");
        },
        async updateComment() {
          throw new Error("comments API should not be called when post-comment=false");
        },
      },
    },
  };
}

describe("action main", () => {
  it("sets outputs for a passing PR", async () => {
    const core = new MockCore({
      "github-token": "token",
      "contract-json": JSON.stringify({
        schema_version: 1,
        allowed_scope: ["src/**"],
        max_files: 2,
      }),
      "post-comment": "false",
    });

    await run({
      core,
      context: {
        repo: { owner: "acme", repo: "demo" },
        payload: { pull_request: { number: 10 } },
      },
      getOctokit: () => createOctokit(["src/index.ts"]),
    });

    expect(core.outputs.get("compliance_status")).toBe("within_contract");
    expect(core.outputs.get("contract_violated")).toBe("false");
    expect(core.failed).toBe("");
  });

  it("works with post-comment=false without comment write permission", async () => {
    const core = new MockCore({
      "github-token": "token",
      "contract-json": JSON.stringify({
        schema_version: 1,
        allowed_scope: ["src/**"],
      }),
      "post-comment": "false",
    });

    await run({
      core,
      context: {
        repo: { owner: "acme", repo: "demo" },
        payload: { pull_request: { number: 10 } },
      },
      getOctokit: () => createReadOnlyOctokit(["src/index.ts"]),
    });

    expect(core.outputs.get("compliance_status")).toBe("within_contract");
    expect(core.outputs.get("comment_url")).toBe("");
    expect(core.failed).toBe("");
  });

  it("does not fail on violations by default", async () => {
    const core = new MockCore({
      "github-token": "token",
      "contract-json": JSON.stringify({
        schema_version: 1,
        allowed_scope: ["docs/**"],
      }),
      "post-comment": "false",
    });

    await run({
      core,
      context: {
        repo: { owner: "acme", repo: "demo" },
        payload: { pull_request: { number: 10 } },
      },
      getOctokit: () => createOctokit(["src/index.ts"]),
    });

    expect(core.outputs.get("compliance_status")).toBe("violated_contract");
    expect(core.outputs.get("contract_violated")).toBe("true");
    expect(core.failed).toBe("");
  });

  it("does not fail when fail-on-violation is explicitly false", async () => {
    const core = new MockCore({
      "github-token": "token",
      "contract-json": JSON.stringify({
        schema_version: 1,
        allowed_scope: ["docs/**"],
      }),
      "fail-on-violation": "false",
      "post-comment": "false",
    });

    await run({
      core,
      context: {
        repo: { owner: "acme", repo: "demo" },
        payload: { pull_request: { number: 10 } },
      },
      getOctokit: () => createOctokit(["src/index.ts"]),
    });

    expect(core.outputs.get("compliance_status")).toBe("violated_contract");
    expect(core.outputs.get("contract_violated")).toBe("true");
    expect(core.failed).toBe("");
  });

  it("fails when fail-on-violation is true and the contract is violated", async () => {
    const core = new MockCore({
      "github-token": "token",
      "contract-json": JSON.stringify({
        schema_version: 1,
        allowed_scope: ["docs/**"],
      }),
      "fail-on-violation": "true",
      "post-comment": "false",
    });

    await run({
      core,
      context: {
        repo: { owner: "acme", repo: "demo" },
        payload: { pull_request: { number: 10 } },
      },
      getOctokit: () => createOctokit(["src/index.ts"]),
    });

    expect(core.outputs.get("compliance_status")).toBe("violated_contract");
    expect(core.failed).toContain("contract violation");
  });

  it("fails clearly when the default contract file is missing in enforce mode", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "superbus-contract-action-"));
    const core = new MockCore({
      "github-token": "token",
      "fail-on-violation": "true",
      "post-comment": "false",
    });

    try {
      await expect(run({
        core,
        workspace,
        context: {
          repo: { owner: "acme", repo: "demo" },
          payload: { pull_request: { number: 10 } },
        },
        getOctokit: () => createOctokit(["src/index.ts"]),
      })).rejects.toThrow(/Agent Contract file not found at \.superbus\/agent-contract\.json/);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });
});
