# Contributing

Thanks for helping improve Superbus Contract Action.

This repo is intentionally small. Contributions should preserve the public boundary:

- check supplied contracts
- fetch PR changed-file paths only
- avoid repository source scanning
- avoid contract generation
- avoid behavior-level code review features
- avoid external service dependencies

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## Pull Requests

Please include tests for behavior changes. Keep new inputs and outputs minimal and document them in `README.md` and `docs/github-action.md`.

## Maintainer Principle

Keep the action small: supplied contract, PR changed-file paths, deterministic scope check, optional PR comment.
