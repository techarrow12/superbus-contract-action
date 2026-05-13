import { describe, expect, it } from "vitest";
import { checkCompliance } from "../src/compliance.js";
import type { AgentContract } from "../src/contract.js";

const baseContract: AgentContract = {
  schema_version: 1,
  mode: "write_allowed",
  allowed_scope: ["src/profile/**", "tests/**"],
  blocked_scope: ["src/payments/**"],
  max_files: 3,
};

describe("scope compliance", () => {
  it("returns not_applicable for empty changed files", () => {
    const result = checkCompliance(baseContract, []);
    expect(result.status).toBe("not_applicable");
    expect(result.changed_file_count).toBe(0);
    expect(result.violations).toEqual([]);
  });

  it("passes an exact allowed file", () => {
    const result = checkCompliance({
      schema_version: 1,
      allowed_scope: ["src/profile/settings.ts"],
    }, ["src/profile/settings.ts"]);
    expect(result.status).toBe("within_contract");
  });

  it("passes a nested source file with src/**", () => {
    const result = checkCompliance({
      schema_version: 1,
      allowed_scope: ["src/**"],
    }, ["src/profile/nested/settings.ts"]);
    expect(result.status).toBe("within_contract");
  });

  it("passes a docs file with docs/**", () => {
    const result = checkCompliance({
      schema_version: 1,
      allowed_scope: ["docs/**"],
    }, ["docs/reference/setup.md"]);
    expect(result.status).toBe("within_contract");
  });

  it("passes a markdown file with **/*.md", () => {
    const result = checkCompliance({
      schema_version: 1,
      allowed_scope: ["**/*.md"],
    }, ["README.md", "docs/setup.md"]);
    expect(result.status).toBe("within_contract");
    expect(result.changed_file_count).toBe(2);
  });

  it("allows files inside allowed_scope", () => {
    const result = checkCompliance(baseContract, [
      "src/profile/settings.ts",
      "tests/profile.test.ts",
    ]);
    expect(result.status).toBe("within_contract");
    expect(result.recommendation).toMatch(/stayed within/);
  });

  it("fails inspect_only on writes", () => {
    const result = checkCompliance({ ...baseContract, mode: "inspect_only" }, ["README.md"]);
    expect(result.status).toBe("violated_contract");
    expect(result.violations[0]?.rule).toBe("inspect_only");
    expect(result.violations[0]?.severity).toBe("blocker");
  });

  it("fails approval_required on writes", () => {
    const result = checkCompliance({ ...baseContract, mode: "approval_required" }, ["README.md"]);
    expect(result.status).toBe("violated_contract");
    expect(result.violations[0]?.rule).toBe("approval_required");
  });

  it("fails blocked payment paths", () => {
    const result = checkCompliance(baseContract, ["src/payments/stripe.ts"]);
    expect(result.status).toBe("violated_contract");
    expect(result.violations).toEqual([
      expect.objectContaining({
        file: "src/payments/stripe.ts",
        rule: "blocked_scope",
        matched_pattern: "src/payments/**",
        reason: "src/payments/stripe.ts matched blocked_scope: src/payments/**.",
      }),
    ]);
    expect(result.blocked_files_touched).toEqual(["src/payments/stripe.ts"]);
    expect(result.out_of_scope_files).toEqual([]);
  });

  it("fails blocked payment paths with traversal, leading slash, double slash, and case formatting", () => {
    const contract: AgentContract = {
      schema_version: 1,
      allowed_scope: ["**/*"],
      blocked_scope: ["src/payments/**"],
    };
    const changedFiles = [
      "../src/payments/stripe.ts",
      "/src/payments/stripe.ts",
      "src//payments//stripe.ts",
      "SRC/PAYMENTS/stripe.ts",
      "src/checkout/../payments/stripe.ts",
    ];

    const result = checkCompliance(contract, changedFiles);

    expect(result.status).toBe("violated_contract");
    expect(result.changed_file_count).toBe(5);
    expect(result.violations).toHaveLength(5);
    expect(result.blocked_files_touched).toEqual([
      "src/payments/stripe.ts",
      "SRC/PAYMENTS/stripe.ts",
    ]);
  });

  it("fails blocked auth paths", () => {
    const result = checkCompliance({
      ...baseContract,
      blocked_scope: ["src/auth/**"],
    }, ["src/auth/session.ts"]);
    expect(result.status).toBe("violated_contract");
    expect(result.blocked_files_touched).toEqual(["src/auth/session.ts"]);
  });

  it("fails blocked GitHub config paths", () => {
    const result = checkCompliance({
      schema_version: 1,
      allowed_scope: ["**/*"],
      blocked_scope: [".github/**"],
    }, [".github/workflows/ci.yml"]);

    expect(result.status).toBe("violated_contract");
    expect(result.blocked_files_touched).toEqual([".github/workflows/ci.yml"]);
    expect(result.violations).toContainEqual(expect.objectContaining({
      file: ".github/workflows/ci.yml",
      rule: "blocked_scope",
      severity: "blocker",
    }));
  });

  it("lets blocked_scope override allowed_scope", () => {
    const result = checkCompliance({
      schema_version: 1,
      allowed_scope: ["src/**"],
      blocked_scope: ["src/payments/**"],
    }, ["src/payments/checkout.ts"]);

    expect(result.status).toBe("violated_contract");
    expect(result.blocked_files_touched).toEqual(["src/payments/checkout.ts"]);
    expect(result.out_of_scope_files).toEqual([]);
    expect(result.violations).toEqual([
      expect.objectContaining({
        file: "src/payments/checkout.ts",
        rule: "blocked_scope",
        matched_pattern: "src/payments/**",
      }),
    ]);
  });

  it("fails every changed file when blocked_scope is **/*", () => {
    const result = checkCompliance({
      schema_version: 1,
      allowed_scope: ["**/*"],
      blocked_scope: ["**/*"],
    }, ["src/profile/settings.ts", "README.md"]);

    expect(result.status).toBe("violated_contract");
    expect(result.blocked_files_touched).toEqual(["src/profile/settings.ts", "README.md"]);
    expect(result.violations).toHaveLength(2);
  });

  it("fails outside allowed scope", () => {
    const result = checkCompliance(baseContract, ["src/other/file.ts"]);
    expect(result.status).toBe("violated_contract");
    expect(result.violations.some((violation) => violation.rule === "outside_allowed_scope")).toBe(true);
    expect(result.out_of_scope_files).toEqual(["src/other/file.ts"]);
  });

  it("fails when max_files is exceeded", () => {
    const result = checkCompliance(baseContract, [
      "src/profile/a.ts",
      "src/profile/b.ts",
      "src/profile/c.ts",
      "tests/profile.test.ts",
    ]);
    expect(result.status).toBe("violated_contract");
    expect(result.violations.some((violation) => violation.rule === "max_files")).toBe(true);
  });

  it("does not enforce max_files when omitted", () => {
    const result = checkCompliance({
      schema_version: 1,
      allowed_scope: ["src/**"],
    }, ["src/a.ts", "src/b.ts", "src/c.ts"]);
    expect(result.status).toBe("within_contract");
  });

  it("allows all changed files when allowed_scope is **/* and no block applies", () => {
    const result = checkCompliance({
      schema_version: 1,
      allowed_scope: ["**/*"],
    }, ["src/profile/settings.ts", ".env", ".github/workflows/test.yml"]);

    expect(result.status).toBe("within_contract");
  });

  it("fails writes when max_files is zero", () => {
    const result = checkCompliance({
      schema_version: 1,
      allowed_scope: ["**/*"],
      max_files: 0,
    }, ["README.md"]);

    expect(result.status).toBe("violated_contract");
    expect(result.violations).toContainEqual(expect.objectContaining({ rule: "max_files" }));
  });

  it("defaults omitted blocked_scope and mode safely", () => {
    const result = checkCompliance({
      schema_version: 1,
      allowed_scope: ["src/**"],
    }, ["src/profile/settings.ts"]);

    expect(result.status).toBe("within_contract");
  });

  it("handles a giant changed file list deterministically", () => {
    const changedFiles = Array.from({ length: 1001 }, (_, index) => `src/generated/file-${index}.ts`);
    const result = checkCompliance({
      schema_version: 1,
      allowed_scope: ["src/**"],
      max_files: 1000,
    }, changedFiles);

    expect(result.status).toBe("violated_contract");
    expect(result.changed_file_count).toBe(1001);
    expect(result.violations).toEqual([
      expect.objectContaining({
        file: "(1001 files total)",
        rule: "max_files",
      }),
    ]);
  });

  it("matches markdown files under nested directories", () => {
    const result = checkCompliance({
      schema_version: 1,
      allowed_scope: ["**/*.md"],
    }, ["docs/deep/path/setup.md"]);

    expect(result.status).toBe("within_contract");
  });

  it("handles dotfiles and blocked workflow files", () => {
    const result = checkCompliance({
      schema_version: 1,
      allowed_scope: ["**/*"],
      blocked_scope: [".env", ".github/**"],
    }, [".env", ".github/workflows/test.yml"]);

    expect(result.status).toBe("violated_contract");
    expect(result.blocked_files_touched).toEqual([".env", ".github/workflows/test.yml"]);
  });

  it("normalizes Windows path separators before checking scope", () => {
    const result = checkCompliance({
      schema_version: 1,
      allowed_scope: ["src/profile/**"],
      blocked_scope: ["src/payments/**"],
    }, ["src\\profile\\settings.ts"]);

    expect(result.status).toBe("within_contract");
    expect(result.changed_file_count).toBe(1);
  });

  it("handles duplicate changed files without breaking output", () => {
    const result = checkCompliance({
      schema_version: 1,
      allowed_scope: ["src/**"],
      blocked_scope: ["src/payments/**"],
    }, ["src/payments/checkout.ts", "src/payments/checkout.ts"]);

    expect(result.status).toBe("violated_contract");
    expect(result.changed_file_count).toBe(2);
    expect(result.blocked_files_touched).toEqual(["src/payments/checkout.ts"]);
    expect(result.violations).toHaveLength(2);
  });
});
