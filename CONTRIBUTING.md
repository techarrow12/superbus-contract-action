# Contributing

Thanks for helping improve Superbus Contract Action.

This repo is intentionally small. Contributions should preserve the public boundary:

- check supplied contracts
- fetch PR changed-file paths only
- avoid repository source scanning
- avoid contract generation
- avoid AI or semantic review features
- avoid hosted product dependencies

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

Open source checks contracts. Hosted Superbus generates, manages, reviews, approves, and audits contracts.
