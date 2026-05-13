# Action Dry Run Report

Date: 2026-05-13

## Summary

The public Superbus Contract Action is wired as a real GitHub Action and the metadata matches the README and example workflow.

## Checks

### 1. Runtime

`action.yml` uses Node 20:

```yaml
runs:
  using: "node20"
  main: "dist/main.js"
```

Result: passed.

### 2. Built File

`action.yml` points to `dist/main.js`.

`pnpm build` produced:

- `dist/main.js`
- `dist/main.js.map`

Result: passed.

### 3. Inputs

`action.yml` exposes exactly:

- `github-token`
- `contract-path`
- `contract-json`
- `post-comment`
- `fail-on-violation`
- `update-comment`

The README documents the same inputs.

Result: passed.

### 4. Outputs

`action.yml` exposes exactly:

- `compliance_status`
- `changed_file_count`
- `violation_count`
- `contract_violated`
- `comment_url`

The README documents the same outputs.

Result: passed.

### 5. Quickstart And Example

README quickstart uses valid action inputs.

`examples/basic-workflow.yml`:

- runs on `pull_request`
- uses `techarrow12/superbus-contract-action@v0.1.0`
- passes `github-token`
- relies on the default `contract-path`

Result: passed.

### 6. Comment Permissions

`post-comment=false` was tested with mocked GitHub comment APIs that throw if called.

Result: passed. The action does not call `issues.listComments`, `issues.createComment`, or `issues.updateComment` when comments are disabled.

### 7. Failure Behavior

Documented and tested behavior:

- default observe mode does not fail CI on `violated_contract`
- `fail-on-violation=false` does not fail CI
- `fail-on-violation=true` fails CI on `violated_contract`

Result: passed.

### 8. Contract Path Default

Default `contract-path` is implemented and documented:

```text
.superbus/agent-contract.json
```

Result: passed.

## Metadata Verification Script

Added:

```text
scripts/verify-action-metadata.ts
```

The script compares:

- `action.yml` inputs
- README documented inputs
- `examples/basic-workflow.yml` inputs
- `action.yml` outputs
- README documented outputs
- action runtime and built entrypoint

The script is covered by:

```text
tests/action-metadata.test.ts
```

## Commands Run

```bash
pnpm build
pnpm test
pnpm typecheck
```

## Results

- `pnpm build`: passed
- `pnpm test`: passed, 8 test files and 47 tests
- `pnpm typecheck`: passed

## Remaining Risks

- This is still a local dry run. A real GitHub repository smoke test should verify comment posting and token permissions against GitHub Actions.
- The example workflow uses `pull-requests: write` because comments are enabled by default. A separate read-only example could be added for `post-comment=false`.
- The action checks changed file paths only; it does not validate semantic code behavior.
