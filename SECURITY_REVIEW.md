# Security Review

Date: 2026-05-13

## Privacy Promise

The action checks changed file paths. It does not upload source code.

## Files Reviewed

Runtime source:

- `src/main.ts`
- `src/inputs.ts`
- `src/contract.ts`
- `src/github.ts`
- `src/comment.ts`
- `src/compliance.ts`
- `src/glob.ts`

Support scripts and tests:

- `scripts/verify-action-metadata.ts`
- `tests/*.test.ts`

Public documentation:

- `README.md`
- `docs/security-and-privacy.md`
- `SECURITY.md`
- `action.yml`
- `package.json`

## Data Read

The action reads:

- GitHub Action inputs through `@actions/core`.
- The supplied Agent Contract from `contract-json` or `contract-path`.
- Pull request changed file paths through GitHub's `pulls.listFiles` API.
- Existing issue/PR comments through GitHub's `issues.listComments` API only when `post-comment=true` and `update-comment=true`.

The only file content read at runtime is the supplied Agent Contract JSON file. No repository source files are read.

## Data Sent

The action sends:

- PR comment markdown to GitHub when `post-comment=true`.
- GitHub Action outputs:
  - `compliance_status`
  - `changed_file_count`
  - `violation_count`
  - `contract_violated`
  - `comment_url`
- CI failure state when `fail-on-violation=true` and the result is `violated_contract`.

The PR comment contains:

- contract source label
- changed file count
- allowed scope patterns
- blocked scope patterns
- violating file paths
- recommendation

The comment does not include source contents or diffs.

## External API Calls

Runtime external calls are limited to GitHub APIs via `@actions/github`:

- `pulls.listFiles`
- `issues.listComments`
- `issues.createComment`
- `issues.updateComment`

No calls to Anthropic, OpenAI, Superbus servers, or other external services were found.

## Logging And Secrets

The action does not log the GitHub token.

Runtime logs are limited to:

- compliance summary via `core.info`
- failure summary via `core.setFailed`

The summaries include counts and high-level status, not secrets or source contents.

## Error Message Review

Error messages are safe for the current privacy model:

- Missing PR context says the action must run on `pull_request`.
- Missing token says `github-token` is required.
- Contract validation errors name invalid fields.
- Invalid contract JSON now returns a generic message: `Agent Contract must be valid JSON.`

## Review Answers

1. Does any code read full file contents other than the contract file?
   - No.
2. Does any code scan the repository?
   - No.
3. Does any code call external APIs besides GitHub?
   - No.
4. Does any code log secrets?
   - No.
5. Does any code print the full GitHub token?
   - No.
6. Does any code include source diffs in comments?
   - No.
7. Does any code send data to Anthropic/OpenAI/Superbus servers?
   - No.
8. Does the README accurately describe this?
   - Yes.
9. Does `docs/security-and-privacy.md` accurately describe this?
   - Yes.
10. Are error messages safe?
   - Yes, after the fix below.

## Fixes Made

- Changed invalid JSON parse errors in `src/contract.ts` to avoid echoing parser internals.
- Updated `tests/contract.test.ts` to assert the safe generic invalid JSON error.

## Risks

- Contract path and scope patterns are intentionally displayed in the PR comment. Teams should avoid putting secrets in file names or contract text.
- The action posts violating file paths by design. This is necessary for review, but private repositories should still treat PR comments as visible to repository collaborators.
- The action checks paths only and does not detect unsafe semantic behavior inside allowed files.

## Verification

Commands run:

```bash
pnpm test
pnpm typecheck
```

Results:

- `pnpm test`: passed, 8 files and 47 tests.
- `pnpm typecheck`: passed.
