# GitHub Action

Superbus Contract Action runs on pull requests and checks changed-file paths against an Agent Contract.

It is intentionally narrow:

```text
Agent Contract -> GitHub PR file paths -> scope check -> PR comment / optional CI failure
```

## Fast Path

Start in observe mode. Create `.superbus/agent-contract.json`, then add `.github/workflows/superbus-contract-check.yml`:

```yaml
name: Superbus Contract Check

on:
  pull_request:
    types: [opened, synchronize, reopened, edited]

permissions:
  contents: read
  pull-requests: write

jobs:
  contract-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: techarrow12/superbus-contract-action@v0.1.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

By default, the action reads `.superbus/agent-contract.json`, posts or updates one PR comment, and does not fail CI.

## Observe Without Commenting

If you want outputs only and do not want the action to write PR comments:

```yaml
permissions:
  contents: read

jobs:
  contract-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: techarrow12/superbus-contract-action@v0.1.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          post-comment: "false"
```

With `post-comment=false`, the action does not call GitHub comment APIs.

## Switch To Enforce Mode

To fail CI when the contract is violated:

```yaml
with:
  github-token: ${{ secrets.GITHUB_TOKEN }}
  fail-on-violation: "true"
```

## Custom Contract Path

```yaml
with:
  contract-path: .github/superbus-contract.json
  github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inline Contract

Use `contract-json` when another step produced the contract:

```yaml
with:
  contract-json: |
    {
      "schema_version": 1,
      "allowed_scope": ["docs/**", "README.md"],
      "blocked_scope": ["src/**"],
      "max_files": 2
    }
  github-token: ${{ secrets.GITHUB_TOKEN }}
```

Use either a custom `contract-path` or `contract-json`, not both.

## Contract Examples

Copy-ready contract recipes live in [examples.md](examples.md).

Good starting points:

- docs-only changes
- feature-safe changes
- auth-blocked product work

## Inputs

| Input | Default | Description |
|---|---:|---|
| `github-token` | `${{ github.token }}` | Token used to fetch PR changed files and post comments. |
| `contract-path` | `.superbus/agent-contract.json` | Path to an Agent Contract JSON file. |
| `contract-json` | | Inline Agent Contract JSON. |
| `post-comment` | `true` | Post a PR comment. |
| `fail-on-violation` | `false` | Fail CI when the result is `violated_contract`. |
| `update-comment` | `true` | Update the existing Superbus comment instead of posting duplicates. |

## Outputs

| Output | Description |
|---|---|
| `compliance_status` | `within_contract`, `violated_contract`, or `not_applicable`. |
| `changed_file_count` | Number of changed file paths checked. |
| `violation_count` | Number of violations. |
| `contract_violated` | `true` when the PR violated the contract. |
| `comment_url` | URL of the PR comment when posted. |

## Permissions

Recommended:

```yaml
permissions:
  contents: read
  pull-requests: write
```

`pull-requests: write` is needed to post comments. The action fetches PR changed-file paths only.
