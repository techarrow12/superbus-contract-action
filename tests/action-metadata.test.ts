import { describe, expect, it } from "vitest";
import { verifyActionMetadata } from "../scripts/verify-action-metadata.js";

describe("action metadata", () => {
  it("keeps action.yml, README, and example workflow aligned", () => {
    const result = verifyActionMetadata();
    expect(result.errors).toEqual([]);
    expect(result.actionInputs).toEqual([
      "github-token",
      "contract-path",
      "contract-json",
      "post-comment",
      "fail-on-violation",
      "update-comment",
    ]);
    expect(result.exampleInputs).toEqual(["github-token"]);
  });
});
