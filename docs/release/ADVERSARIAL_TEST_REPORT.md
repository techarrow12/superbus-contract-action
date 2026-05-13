# Adversarial Test Report

Date: 2026-05-13

## Goal

Find edge cases where a pull request could bypass the contract checker through path formatting, broad globs, invalid contracts, or boundary values.

## Tests Added

Added or extended tests for:

- path traversal strings such as `../src/payments/stripe.ts`
- leading slash paths such as `/src/payments/stripe.ts`
- backslash Windows paths
- double slashes
- mixed-case blocked paths
- empty `allowed_scope`
- `allowed_scope` with `**/*`
- `blocked_scope` with `**/*`
- blocked and allowed same file
- `max_files = 0`
- negative and non-integer `max_files`
- omitted `blocked_scope`
- omitted `mode`
- unknown `mode`
- giant changed file lists
- weird glob traversal such as `src/**/../payments/**`
- markdown files under nested directories
- dotfiles such as `.env`
- workflow files such as `.github/workflows/test.yml`

## Fixes Made

### Deterministic Path Normalization

Updated `src/glob.ts` so paths now normalize:

- backslashes to slashes
- duplicate slashes to one logical separator
- leading slashes away
- `.` segments away
- `..` traversal segments deterministically

Examples:

```text
../src/payments/stripe.ts -> src/payments/stripe.ts
/src/payments/stripe.ts -> src/payments/stripe.ts
src//payments///stripe.ts -> src/payments/stripe.ts
src/checkout/../payments/stripe.ts -> src/payments/stripe.ts
```

### Case Bypass Protection

Matching is now case-insensitive while normalized output preserves the original path casing for comments.

Example:

```text
SRC/PAYMENTS/stripe.ts matches src/payments/**
```

### Glob Prefix Bypass Fix

Found and fixed a real edge bug:

```text
src/**/../payments/**
```

After normalization this becomes a glob-containing prefix. The old fast path treated it like a literal directory prefix and could fail to match. The prefix fast path now runs only when the prefix has no glob syntax.

## Results

Commands run:

```bash
pnpm test
pnpm typecheck
```

Results:

- `pnpm test`: passed, 8 test files and 58 tests.
- `pnpm typecheck`: passed.

## Security Properties Confirmed

- invalid contracts fail clearly
- `blocked_scope` wins over `allowed_scope`
- path normalization is deterministic
- blocked paths cannot bypass through traversal, leading slash, double slash, backslash, or mixed-case formatting
- broad `blocked_scope` with `**/*` blocks all changed files
- `max_files = 0` blocks any write
- omitted `blocked_scope` defaults safely
- omitted `mode` defaults safely

## Remaining Edge Cases

- GitHub itself normally supplies repository-relative paths, so some adversarial path strings are defensive unit tests rather than expected live API payloads.
- Case-insensitive matching is intentionally conservative; a repository with two paths that differ only by case may see stricter matching than Git itself.
- URL-encoded path tricks such as `%2e%2e/src/payments/stripe.ts` are not decoded before matching. GitHub's PR file API returns decoded repository paths, so this is not expected in normal operation.
- Unicode normalization lookalikes are not canonicalized.
