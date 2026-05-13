# Security And Privacy

Superbus Contract Action is path-only.

It fetches pull request changed-file paths from GitHub and compares those paths to an Agent Contract. It does not fetch file contents, inspect diffs, scan repository source, upload source code, or call external APIs other than GitHub.

## Data Access

The action uses GitHub APIs to read:

- repository owner and name from the workflow context
- pull request number from the workflow context
- changed file paths for that pull request
- existing PR comments when `update-comment` is true

The action writes:

- one PR comment when `post-comment` is true
- action outputs
- CI failure state only when `fail-on-violation` is true and the PR violates the contract

## Recommended Permissions

```yaml
permissions:
  contents: read
  pull-requests: write
```

`pull-requests: write` is needed for PR comments. If `post-comment` is false, your workflow may be able to use narrower permissions depending on repository settings.

## Contract Safety

Review contracts before asking an AI agent to implement them. The open-source action checks whether a PR stayed inside a supplied contract; it does not decide whether the contract itself is safe or complete.

Hosted Superbus will add contract generation, policy templates, approvals, history, and audit.
