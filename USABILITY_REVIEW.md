# Usability Review

Date: 2026-05-13

Reviewer stance: skeptical open-source developer trying the action for the first time.

## Summary

The action can be understood and tried in under five minutes after the documentation and comment-copy improvements in this pass.

The core path is now clear:

```text
create .superbus/agent-contract.json
add the workflow
open a PR
read the comment
optionally turn on fail-on-violation
```

## Before / After Doc Improvements

### README Clarity

Before:

- Quickstart existed, but did not explicitly frame itself as a five-minute manual setup.
- A new user could wonder whether hosted Superbus was required.

After:

- Renamed the section to `5-Minute Quickstart`.
- Added "You do not need hosted Superbus to use the open-source action. Start with a manual contract."
- Split quickstart into three steps:
  - create `.superbus/agent-contract.json`
  - add `.github/workflows/superbus-contract-check.yml`
  - open a PR

### Quickstart Completeness

Before:

- The workflow was valid, but the default contract path was implicit.

After:

- The README tells users to create the exact default file the action reads.
- The workflow can be copied directly.
- The result states are explained: `Within Contract`, `Contract Violated`, and `Not Applicable`.

### Contract Example Usability

Before:

- The example was usable, but not explicitly positioned as a manual starting point.

After:

- The README and examples doc clarify that users can write manual contracts and use OSS forever without hosted Superbus.
- `docs/examples.md` now says examples are valid JSON and can be placed at `.superbus/agent-contract.json` or passed through `contract-json`.

### Error Messages

Before:

- Missing contract failures could expose a low-level file-system error.

After:

- Missing default contract now reports:

```text
Agent Contract file not found at .superbus/agent-contract.json. Create that file or pass contract-json.
```

This is much more actionable for a first-time user.

### Action Comment Readability

Before:

- The PR comment showed status and data, but the summary was not labeled.

After:

- The comment includes a `What Happened` section before the compliance summary.
- The existing `Recommendation` section remains prominent.

### OSS Vs Hosted

Before:

- Hosted/private Superbus was explained, but could feel like the OSS action was only a teaser.

After:

- README now says:

```text
Open source checks contracts. You can use it with manual contracts forever.
Hosted Superbus is for teams that want contracts generated, managed, reviewed, approved, and audited for them.
```

This keeps the paid product useful without making the OSS version feel incomplete.

### Limitations

Before:

- Limitations were honest.

After:

- Added a line clarifying the open-source action is still useful without hosted Superbus when users already know expected file scope and can write the contract manually.

## Confusing Parts Fixed

- Clarified that v1 checks contracts but does not generate them.
- Clarified that hosted Superbus is optional for OSS users.
- Clarified the exact default contract path.
- Clarified what to do when the default contract file is missing.
- Clarified that `post-comment=false` can be used when users want outputs only.
- Improved PR comment readability with `What Happened`.

## Remaining Friction

- Users still need to write the first contract manually. This is expected for the OSS version, but it is the biggest setup step.
- The marketplace/repository slug `techarrow12/superbus-contract-action@v0.1.0` must be updated if the published repo owner differs.
- A real GitHub screenshot or sample rendered comment would make the README even faster to trust.
- The action checks file paths only, so users must understand that semantic review remains outside v1.

## Verification

Commands run:

```bash
pnpm test
pnpm typecheck
```

Results:

- `pnpm test`: passed, 8 test files and 47 tests.
- `pnpm typecheck`: passed.
