# Superbus Contract Action v0.1.0

Initial public release of Superbus Contract Action.

## What's Included

- Agent Contract v1 schema for declaring allowed scope, blocked scope, max files, mode, and stop conditions.
- GitHub Action checker that runs on pull requests.
- PR changed-file compliance checks against a supplied Agent Contract.
- Observe mode with `fail-on-violation: "false"` so teams can start without failing CI.
- Enforce mode with `fail-on-violation: "true"` so teams can block PRs that violate the contract.
- Privacy-first path-only checks: the action fetches changed file paths, not source contents or diffs.
- Markdown PR comments with status, changed file count, violations, allowed scope, blocked scope, and recommendation.
- Examples, documentation, schema, and tests for local validation.

## Install

```yaml
- uses: techarrow12/superbus-contract-action@v0.1.0
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Notes

The open-source action checks supplied contracts. It does not generate contracts.
