import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkCompliance } from "../src/compliance.js";
import { validateAgentContract, type AgentContract } from "../src/contract.js";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "demo");

async function loadJsonFixture<T>(name: string): Promise<T> {
  const raw = await readFile(join(fixtureDir, name), "utf8");
  return JSON.parse(raw) as T;
}

async function loadDemoContract(): Promise<AgentContract> {
  return validateAgentContract(await loadJsonFixture("settings-locale-contract.json"));
}

describe("settings locale demo validation", () => {
  it.each([
    {
      fixture: "safe-pr.json",
      expectedStatus: "within_contract",
      changedFileCount: 2,
      violationCount: 0,
    },
    {
      fixture: "payment-violation-pr.json",
      expectedStatus: "violated_contract",
      changedFileCount: 2,
      violationCount: 1,
    },
    {
      fixture: "auth-violation-pr.json",
      expectedStatus: "violated_contract",
      changedFileCount: 2,
      violationCount: 1,
    },
    {
      fixture: "max-files-violation-pr.json",
      expectedStatus: "violated_contract",
      changedFileCount: 3,
      violationCount: 2,
    },
  ])("checks $fixture", async ({ fixture, expectedStatus, changedFileCount, violationCount }) => {
    const contract = await loadDemoContract();
    const changedFiles = await loadJsonFixture<string[]>(fixture);
    const result = checkCompliance(contract, changedFiles);

    expect(result.status).toBe(expectedStatus);
    expect(result.changed_file_count).toBe(changedFileCount);
    expect(result.violations).toHaveLength(violationCount);

    if (expectedStatus === "violated_contract") {
      expect(result.recommendation).toMatch(/Do not merge|do not merge/i);
    }
  });
});
