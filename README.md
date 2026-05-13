# Superbus Contract Action

No AI PR without a contract.

Superbus Contract Action checks whether an AI-generated PR stayed inside its Agent Contract.

## Why

AI coding agents are fast, but vague prompts like "refactor checkout flow" can touch payments, auth, tests, configs, and database files.

That is the trust gap: the agent may do useful work, but reviewers still need to know whether the PR stayed inside the scope it was allowed to change.

Superbus Contract Action adds a small, auditable CI check:

```text
Contract file -> PR changed files -> scope check -> comment/fail CI
```

## How It Works

1. You provide an Agent Contract.
2. The action fetches changed file paths from the pull request.
3. It checks those paths against `allowed_scope`, `blocked_scope`, and `max_files`.
4. It posts one PR comment.
5. It can fail CI when the PR violates the contract.

The open-source action checks contracts. It does not generate them.

## 5-Minute Quickstart

You do not need hosted Superbus to use the open-source action. Start with a manual contract.

### 1. Create `.superbus/agent-contract.json`

```json
{
  "schema_version": 1,
  "mode": "write_allowed",
  "allowed_scope": ["src/profile/**", "tests/profile.test.ts"],
  "blocked_scope": ["src/payments/**", "src/auth/**"],
  "max_files": 4,
  "stop_conditions": [
    "Stop if payment or auth files need changes",
    "Stop if more than four files need changes"
  ]
}
```

### 2. Add `.github/workflows/superbus-contract-check.yml`

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

### 3. Open a PR

Superbus will post one PR comment:

- `Within Contract` when all changed files match the contract
- `Contract Violated` when a changed file is blocked, out of scope, or above `max_files`
- `Not Applicable` when the PR has no changed files

By default the action observes and comments. To fail CI on violations:

```yaml
with:
  github-token: ${{ secrets.GITHUB_TOKEN }}
  fail-on-violation: "true"
```

## Agent Contract Example

```ts
export interface AgentContract {
  schema_version: 1;
  allowed_scope: string[];
  blocked_scope?: string[];
  max_files?: number;
  mode?: "write_allowed" | "approval_required" | "inspect_only";
  stop_conditions?: string[];
}
```

Example:

```json
{
  "schema_version": 1,
  "mode": "write_allowed",
  "allowed_scope": ["docs/**", "README.md"],
  "blocked_scope": ["src/**", ".github/workflows/**"],
  "max_files": 3
}
```

## Violation Example

Contract:

```json
{
  "schema_version": 1,
  "allowed_scope": ["docs/**"],
  "blocked_scope": ["src/payments/**"],
  "max_files": 2
}
```

PR changed files:

```text
docs/setup.md
src/payments/checkout.ts
```

Result:

```text
🚫 Contract Violated

src/payments/checkout.ts matched blocked_scope.
```

## Inputs

| Input | Default | Description |
|---|---:|---|
| `github-token` | `${{ github.token }}` | Token used to fetch PR changed files and post comments. |
| `contract-path` | `.superbus/agent-contract.json` | Path to an Agent Contract JSON file. |
| `contract-json` | | Inline Agent Contract JSON. Use this instead of a custom `contract-path`. |
| `post-comment` | `true` | Post the contract check result on the PR. |
| `fail-on-violation` | `false` | Fail CI when the contract is violated. |
| `update-comment` | `true` | Update the existing Superbus comment instead of posting duplicates. |

## Outputs

| Output | Description |
|---|---|
| `compliance_status` | `within_contract`, `violated_contract`, or `not_applicable`. |
| `changed_file_count` | Number of PR changed files checked. |
| `violation_count` | Number of contract violations found. |
| `contract_violated` | `true` when the PR violated the Agent Contract. |
| `comment_url` | URL of the PR comment when one was posted. |

## Privacy

Superbus Contract Action fetches changed file paths only.

It does not:

- fetch source file contents
- inspect diffs
- scan repository source
- upload source code
- call external APIs other than GitHub

If you do not want PR comments, set `post-comment: "false"`. The action will still set outputs and can still fail CI when `fail-on-violation: "true"`.

## Open Source Vs Hosted Superbus

Open source checks contracts. You can use it with manual contracts forever.

Hosted Superbus is for teams that want contracts generated, managed, reviewed, approved, and audited for them.

| Capability | Open Source Action | Hosted Superbus |
|---|---:|---:|
| Agent Contract schema | Yes | Yes |
| PR changed-file scope check | Yes | Yes |
| Manual contracts | Yes | Yes |
| Hosted contract generation | No | Yes |
| Issue-to-contract flow | No | Yes |
| Policy and approval workflows | No | Yes |
| Contract history and audit trail | No | Yes |
| Advanced review | No | Yes |

## Limitations

- v1 checks supplied contracts only.
- v1 does not generate contracts.
- v1 checks file paths, not semantic behavior.
- v1 does not detect every unsafe AI code change.
- v1 does not replace human review.
- Hosted Superbus will add generation, policy, approvals, history, and advanced review.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```
