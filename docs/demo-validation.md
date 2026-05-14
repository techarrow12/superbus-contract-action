# Demo Validation

## Scenario

Task: Update settings locale logic.

This demo proves the core value of Superbus Contract Action: an AI-generated PR can be checked against the files it was allowed to change.

## Contract

```json
{
  "schema_version": 1,
  "mode": "write_allowed",
  "allowed_scope": [
    "src/settings/locale.ts",
    "tests/settings.test.ts"
  ],
  "blocked_scope": [
    "src/payments/**",
    "src/auth/**",
    "src/db/**",
    ".github/**"
  ],
  "max_files": 2
}
```

The contract allows one implementation file and one test file. It blocks payment, auth, database, and workflow changes.

## Safe PR

Changed files:

```json
[
  "src/settings/locale.ts",
  "tests/settings.test.ts"
]
```

Expected result:

```text
Within Contract
```

The PR changed only the files listed in `allowed_scope` and stayed within `max_files`.

## Violating PRs

### Payment Violation

Changed files:

```json
[
  "src/settings/locale.ts",
  "src/payments/stripe.ts"
]
```

Expected result:

```text
Contract Violated
```

`src/payments/stripe.ts` is blocked by `src/payments/**` and is outside `allowed_scope`.

### Auth Violation

Changed files:

```json
[
  "src/settings/locale.ts",
  "src/auth/session.ts"
]
```

Expected result:

```text
Contract Violated
```

`src/auth/session.ts` is blocked by `src/auth/**` and is outside `allowed_scope`.

### Max Files Violation

Changed files:

```json
[
  "src/settings/locale.ts",
  "tests/settings.test.ts",
  "README.md"
]
```

Expected result:

```text
Contract Violated
```

The PR changed three files while `max_files` is `2`. `README.md` is also outside `allowed_scope`.

## Expected GitHub Comment

Safe PR:

```text
## Superbus Contract Check

Within Contract

Changed files: 2
Violations: 0
Recommendation: The pull request stayed within the Agent Contract.
```

Violating PR:

```text
## Superbus Contract Check

Contract Violated

Changed files: 2
Violations: 2
Recommendation: Do not merge until blocked-scope changes are removed from this PR or a new contract explicitly permits them.
```

The open-source action fetches PR changed-file paths only. It does not fetch source contents or generate contracts.
