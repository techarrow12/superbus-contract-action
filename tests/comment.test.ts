import { describe, expect, it } from "vitest";
import { COMMENT_MARKER, renderComment } from "../src/comment.js";
import { checkCompliance } from "../src/compliance.js";
import type { AgentContract } from "../src/contract.js";
import { DEFAULT_CONTRACT_PATH, parseInputs } from "../src/inputs.js";

describe("comment renderer", () => {
  const contract: AgentContract = {
    schema_version: 1,
    allowed_scope: ["src/**"],
    blocked_scope: ["src/auth/**"],
  };

  it("renders a safe result", () => {
    const result = checkCompliance(contract, ["src/profile/settings.ts"]);
    const markdown = renderComment({ contract, result, contractSource: DEFAULT_CONTRACT_PATH });

    expect(markdown).toContain("## Superbus Contract Check");
    expect(markdown).toContain("✅ Within Contract");
    expect(markdown).toContain("Contract source");
    expect(markdown).toContain(DEFAULT_CONTRACT_PATH);
    expect(markdown).toContain("### What Happened");
    expect(markdown).toContain("### Allowed Scope");
    expect(markdown).toContain("### Blocked Scope");
    expect(markdown).toContain("The pull request stayed within the Agent Contract.");
  });

  it("renders a violation", () => {
    const result = checkCompliance(contract, ["src/auth/session.ts"]);
    const markdown = renderComment({ contract, result, contractSource: "contract-json" });

    expect(markdown).toContain("🚫 Contract Violated");
    expect(markdown).toContain("src/auth/session.ts");
    expect(markdown).toContain("blocked_scope");
    expect(markdown).toContain("src/auth/session.ts matched blocked_scope: src/auth/**.");
    expect(markdown).toContain("Do not merge");
  });

  it("does not duplicate a blocked file as outside allowed scope", () => {
    const result = checkCompliance(contract, ["src/auth/session.ts"]);
    const markdown = renderComment({ contract, result, contractSource: "contract-json" });

    expect(result.violations).toHaveLength(1);
    expect(markdown).toContain("blocked_scope");
    expect(markdown).not.toContain("outside_allowed_scope");
  });

  it("includes the hidden marker", () => {
    const result = checkCompliance(contract, ["src/profile/settings.ts"]);
    const markdown = renderComment({ contract, result, contractSource: DEFAULT_CONTRACT_PATH });

    expect(markdown).toContain(COMMENT_MARKER);
  });

  it("mentions path-only privacy", () => {
    const contract: AgentContract = {
      schema_version: 1,
      allowed_scope: ["src/**"],
      blocked_scope: ["src/auth/**"],
    };
    const result = checkCompliance(contract, ["src/auth/session.ts"]);
    const markdown = renderComment({ contract, result, contractSource: "contract-json" });

    expect(markdown).toContain("No source code was uploaded");
  });
});

describe("input parsing", () => {
  it("defaults to contract-path and observe mode", () => {
    const inputs = parseInputs({
      getInput: (name) => ({
        "github-token": "token",
      })[name] ?? "",
    });

    expect(inputs.contractSource).toEqual({ kind: "path", path: DEFAULT_CONTRACT_PATH });
    expect(inputs.failOnViolation).toBe(false);
    expect(inputs.postComment).toBe(true);
    expect(inputs.updateComment).toBe(true);
  });

  it("accepts contract-json when default path is implicit", () => {
    const inputs = parseInputs({
      getInput: (name) => ({
        "contract-path": DEFAULT_CONTRACT_PATH,
        "contract-json": "{\"schema_version\":1,\"allowed_scope\":[\"src/**\"]}",
      })[name] ?? "",
    });

    expect(inputs.contractSource.kind).toBe("inline");
  });

  it("validates contract-path vs contract-json exclusivity", () => {
    expect(() => parseInputs({
      getInput: (name) => ({
        "contract-path": ".contracts/agent.json",
        "contract-json": "{\"schema_version\":1,\"allowed_scope\":[\"src/**\"]}",
      })[name] ?? "",
    })).toThrow(/either contract-path or contract-json/);
  });
});
