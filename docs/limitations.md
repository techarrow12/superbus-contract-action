# Limitations

Superbus Contract Action is a minimal open-source scope checker.

- v1 checks supplied contracts only.
- v1 does not generate contracts.
- v1 checks file paths, not semantic behavior.
- v1 does not detect every unsafe AI code change.
- v1 does not inspect diffs or source file contents.
- v1 does not know whether a contract is too broad.
- v1 does not replace human review.

Hosted Superbus will add generation, policy, approvals, history, and advanced review.

Use the open-source action as a simple CI guardrail: the PR should stay inside the contract it was given.

The open-source action is still useful without hosted Superbus when you already know the expected file scope and can write the contract manually.
