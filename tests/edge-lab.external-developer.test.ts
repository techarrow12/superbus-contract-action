import { describe, expect, it } from "vitest";
import { renderComment } from "../src/comment.js";
import { checkCompliance } from "../src/compliance.js";
import { parseAgentContract, type AgentContract } from "../src/contract.js";
import { getPRChangedFiles, type OctokitLike } from "../src/github.js";
import { run, type ActionCore } from "../src/main.js";

const baseContract: AgentContract = {
  schema_version: 1,
  allowed_scope: ["src/**", "README.md"],
  blocked_scope: ["src/payments/**", "src/auth/**", ".github/**"],
  max_files: 10,
  mode: "write_allowed",
};

describe("external developer edge lab", () => {
  it("blocks path traversal attempts into a blocked folder", () => {
    const result = checkCompliance(baseContract, ["../src/payments/stripe.ts"]);

    expect(result.status).toBe("violated_contract");
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: "src/payments/stripe.ts",
          matched_pattern: "src/payments/**",
          rule: "blocked_scope",
        }),
      ]),
    );
  });

  it("blocks leading slash, double slash, backslash, and mixed-case blocked paths", () => {
    const result = checkCompliance(baseContract, [
      "/src//payments\\Stripe.ts",
      ".github\\workflows\\deploy.yml",
      "SRC/AUTH/session.ts",
    ]);

    expect(result.status).toBe("violated_contract");
    expect(result.blocked_files_touched).toEqual([
      "src/payments/Stripe.ts",
      ".github/workflows/deploy.yml",
      "SRC/AUTH/session.ts",
    ]);
    expect(result.violations.filter((violation) => violation.rule === "blocked_scope")).toHaveLength(3);
  });

  it("lets blocked_scope override broad allowed_scope", () => {
    const result = checkCompliance(
      {
        schema_version: 1,
        allowed_scope: ["**/*"],
        blocked_scope: ["**/*.env", "src/secrets/**"],
      },
      [".env", "src/secrets/key.ts"],
    );

    expect(result.status).toBe("violated_contract");
    expect(result.violations.every((violation) => violation.rule === "blocked_scope")).toBe(true);
  });

  it("treats max_files zero as no writes allowed", () => {
    const result = checkCompliance(
      {
        schema_version: 1,
        allowed_scope: ["src/**"],
        max_files: 0,
      },
      ["src/index.ts"],
    );

    expect(result.status).toBe("violated_contract");
    expect(result.violations).toEqual([
      expect.objectContaining({
        file: "(1 files total)",
        rule: "max_files",
      }),
    ]);
  });

  it("fails malformed contracts clearly", () => {
    expect(() => parseAgentContract("{")).toThrow("valid JSON");
    expect(() => parseAgentContract(JSON.stringify({ schema_version: 1, allowed_scope: [] }))).toThrow(
      "allowed_scope must contain at least one pattern",
    );
    expect(() =>
      parseAgentContract(JSON.stringify({ schema_version: 1, allowed_scope: ["src/**"], max_files: -1 })),
    ).toThrow("max_files must be a non-negative integer");
    expect(() =>
      parseAgentContract(JSON.stringify({ schema_version: 1, allowed_scope: ["src/**"], mode: "auto_fix" })),
    ).toThrow("mode must be write_allowed, approval_required, or inspect_only");
  });

  it("renders blocked pattern once without duplicate outside-scope noise", () => {
    const result = checkCompliance(
      {
        schema_version: 1,
        allowed_scope: ["src/**"],
        blocked_scope: ["src/payments/**"],
      },
      ["src/payments/stripe.ts"],
    );
    const comment = renderComment({
      contract: baseContract,
      result,
      contractSource: ".superbus/agent-contract.json",
    });

    expect(comment).toContain("src/payments/stripe.ts matched blocked_scope: src/payments/**");
    expect(comment).not.toContain("File is outside allowed_scope");
  });

  it("fetches changed file names through pagination without reading patch contents", async () => {
    const pages = [
      Array.from({ length: 100 }, (_, index) => ({
        filename: `src/file-${index}.ts`,
        patch: "SECRET_SOURCE_DIFF_SHOULD_NOT_BE_USED",
      })),
      [{ filename: "src/final.ts", patch: "SECRET_SOURCE_DIFF_SHOULD_NOT_BE_USED" }],
    ];
    const octokit = {
      rest: {
        pulls: {
          listFiles: async ({ page }: { page: number }) => ({ data: pages[page - 1] ?? [] }),
        },
      },
    } as unknown as OctokitLike;

    const files = await getPRChangedFiles(octokit, {
      owner: "demo",
      repo: "repo",
      pullNumber: 1,
    });

    expect(files).toHaveLength(101);
    expect(files).toContain("src/final.ts");
    expect(files.join("\n")).not.toContain("SECRET_SOURCE_DIFF_SHOULD_NOT_BE_USED");
  });

  it("observe mode reports violation without failing CI when fail-on-violation is false", async () => {
    const core = fakeCore({
      "github-token": "ghs_secret",
      "contract-json": JSON.stringify({
        schema_version: 1,
        allowed_scope: ["src/**"],
        blocked_scope: ["src/payments/**"],
      }),
      "post-comment": "false",
      "fail-on-violation": "false",
    });

    await run({
      core,
      context: pullRequestContext(),
      getOctokit: () => singleFileOctokit("src/payments/stripe.ts"),
    });

    expect(core.outputs.contract_violated).toBe("true");
    expect(core.failedMessage).toBe("");
  });

  it("enforce mode fails CI when fail-on-violation is true", async () => {
    const core = fakeCore({
      "github-token": "ghs_secret",
      "contract-json": JSON.stringify({
        schema_version: 1,
        allowed_scope: ["src/**"],
        blocked_scope: ["src/payments/**"],
      }),
      "post-comment": "false",
      "fail-on-violation": "true",
    });

    await run({
      core,
      context: pullRequestContext(),
      getOctokit: () => singleFileOctokit("src/payments/stripe.ts"),
    });

    expect(core.outputs.contract_violated).toBe("true");
    expect(core.failedMessage).toContain("contract violation");
  });
});

function fakeCore(inputs: Record<string, string>) {
  const core = {
    outputs: {} as Record<string, string>,
    failedMessage: "",
    getInput(name: string) {
      return inputs[name] ?? "";
    },
    setOutput(name: string, value: string) {
      this.outputs[name] = value;
    },
    info() {},
    warning() {},
    setFailed(message: string) {
      this.failedMessage = message;
    },
  };
  return core as ActionCore & { outputs: Record<string, string>; failedMessage: string };
}

function pullRequestContext() {
  return {
    repo: { owner: "demo", repo: "repo" },
    payload: { pull_request: { number: 42 } },
  };
}

function singleFileOctokit(filename: string) {
  return {
    rest: {
      pulls: {
        listFiles: async () => ({ data: [{ filename }] }),
      },
      issues: {
        listComments: async () => ({ data: [] }),
        createComment: async () => ({ data: { html_url: "" } }),
        updateComment: async () => ({ data: { html_url: "" } }),
      },
    },
  } as unknown as OctokitLike;
}
