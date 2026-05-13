import { describe, expect, it } from "vitest";
import { matchesPattern, normalizePath } from "../src/glob.js";

describe("glob matching", () => {
  it("normalizes Windows paths", () => {
    expect(normalizePath(".\\src\\profile\\settings.ts")).toBe("src/profile/settings.ts");
  });

  it("normalizes traversal, leading slash, and duplicate slashes deterministically", () => {
    expect(normalizePath("../src/payments/stripe.ts")).toBe("src/payments/stripe.ts");
    expect(normalizePath("/src/payments/stripe.ts")).toBe("src/payments/stripe.ts");
    expect(normalizePath("src//payments///stripe.ts")).toBe("src/payments/stripe.ts");
    expect(normalizePath("src/checkout/../payments/stripe.ts")).toBe("src/payments/stripe.ts");
  });

  it("matches recursive directory patterns", () => {
    expect(matchesPattern("src/profile/settings.ts", "src/profile/**")).toBe(true);
    expect(matchesPattern("src/profile/nested/settings.ts", "src/**")).toBe(true);
    expect(matchesPattern("docs/reference/setup.md", "docs/**")).toBe(true);
    expect(matchesPattern("src/auth/session.ts", "src/profile/**")).toBe(false);
  });

  it("matches mixed-case paths without allowing case bypasses", () => {
    expect(matchesPattern("SRC/PAYMENTS/stripe.ts", "src/payments/**")).toBe(true);
    expect(matchesPattern("Docs/Setup.md", "docs/**")).toBe(true);
  });

  it("matches exact file paths", () => {
    expect(matchesPattern("src/profile/settings.ts", "src/profile/settings.ts")).toBe(true);
    expect(matchesPattern("src/profile/other.ts", "src/profile/settings.ts")).toBe(false);
  });

  it("matches files at any depth", () => {
    expect(matchesPattern("docs/setup/agent.md", "**/*.md")).toBe(true);
    expect(matchesPattern("README.md", "**/*.md")).toBe(true);
    expect(matchesPattern("docs/setup.md", "**/*.md")).toBe(true);
    expect(matchesPattern("src/index.ts", "**/*.md")).toBe(false);
  });

  it("normalizes weird glob traversal patterns before matching", () => {
    expect(matchesPattern("src/payments/stripe.ts", "src/**/../payments/**")).toBe(true);
  });

  it("matches root-level star patterns without crossing directories", () => {
    expect(matchesPattern("README.md", "*.md")).toBe(true);
    expect(matchesPattern("docs/README.md", "*.md")).toBe(false);
  });

  it("matches all paths", () => {
    expect(matchesPattern("src/index.ts", "**/*")).toBe(true);
  });
});
