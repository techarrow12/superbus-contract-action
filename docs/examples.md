# Examples

All examples are valid Agent Contract JSON. Put one at `.superbus/agent-contract.json` or pass it through `contract-json`.

## Billing-Safe

Use this when the agent should touch billing currency logic, but never payment processing, auth, database, or workflow files.

```json
{
  "schema_version": 1,
  "mode": "write_allowed",
  "allowed_scope": ["src/billing/currency.ts", "tests/billing.test.ts"],
  "blocked_scope": ["src/payments/**", "src/auth/**", "src/db/**", ".github/**"],
  "max_files": 2
}
```

If the PR changes `src/payments/stripe.ts`, Superbus reports `Contract Violated`.

## Docs Only

Use this for documentation edits.

```json
{
  "schema_version": 1,
  "mode": "write_allowed",
  "allowed_scope": ["README.md", "docs/**", "**/*.md"],
  "blocked_scope": ["src/**", "tests/**", ".github/workflows/**"],
  "max_files": 3
}
```

If the PR changes `src/index.ts`, Superbus reports `Contract Violated`.

## Auth Blocked

Use this for product/profile work where auth must stay untouched.

```json
{
  "schema_version": 1,
  "mode": "write_allowed",
  "allowed_scope": ["src/profile/**", "tests/profile.test.ts"],
  "blocked_scope": ["src/auth/**", "src/payments/**"],
  "max_files": 4
}
```

If the PR changes `src/auth/session.ts`, Superbus reports `Contract Violated`.

## Inspect Only

Use this when the agent should read and report, not edit.

```json
{
  "schema_version": 1,
  "mode": "inspect_only",
  "allowed_scope": ["**/*"],
  "max_files": 0,
  "stop_conditions": ["Do not modify files"]
}
```

Any changed file violates an `inspect_only` contract.

## Approval Required

Use this when the agent may prepare a plan, but a human must approve before file changes.

```json
{
  "schema_version": 1,
  "mode": "approval_required",
  "allowed_scope": ["src/profile/**"],
  "blocked_scope": ["src/payments/**", "src/auth/**"],
  "stop_conditions": ["Wait for approval before writing files"]
}
```

Any changed file violates an `approval_required` contract until approval is represented by a new `write_allowed` contract.
