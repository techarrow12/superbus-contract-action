import { describe, expect, it } from "vitest";
import { parseAgentContract, validateAgentContract } from "../src/contract.js";

describe("Agent Contract validation", () => {
  it("parses a valid contract and applies public defaults", () => {
    const contract = parseAgentContract(JSON.stringify({
      schema_version: 1,
      allowed_scope: ["src/**"],
      max_files: 2,
    }));

    expect(contract.allowed_scope).toEqual(["src/**"]);
    expect(contract.blocked_scope).toEqual([]);
    expect(contract.mode).toBe("write_allowed");
    expect(contract.max_files).toBe(2);
  });

  it("rejects invalid contracts with clear errors", () => {
    expect(() => validateAgentContract({ allowed_scope: ["src/**"] })).toThrow(/schema_version must be 1/);
    expect(() => validateAgentContract({ schema_version: 1 })).toThrow(/allowed_scope/);
    expect(() => validateAgentContract({ schema_version: 1, allowed_scope: [] })).toThrow(/at least one/);
    expect(() => validateAgentContract({ schema_version: 1, allowed_scope: ["src/**"], max_files: -1 })).toThrow(/max_files/);
    expect(() => validateAgentContract({ schema_version: 1, allowed_scope: ["src/**"], max_files: 1.5 })).toThrow(/max_files/);
    expect(() => parseAgentContract("{not-json")).toThrow("Agent Contract must be valid JSON.");
  });

  it("rejects unsupported modes", () => {
    expect(() => validateAgentContract({
      schema_version: 1,
      allowed_scope: ["src/**"],
      mode: "generate_contract",
    })).toThrow(/mode/);
  });
});
