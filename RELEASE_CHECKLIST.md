# Release Checklist

Release target: `v0.1.0`

## Commands To Run

Run from `public/superbus-contract-action/`:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## Expected Outputs

- `pnpm install` completes without adding private dependencies.
- `pnpm typecheck` exits with code `0`.
- `pnpm test` exits with code `0`.
- `pnpm build` produces `dist/main.js` for the Node 20 GitHub Action.

## Files Included

- `README.md`
- `LICENSE`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `RELEASE_CHECKLIST.md`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tsconfig.json`
- `tsup.config.ts`
- `vitest.config.ts`
- `action.yml`
- `src/`
- `schema/agent-contract.schema.json`
- `examples/`
- `docs/`
- `tests/`
- `dist/main.js`
- `dist/main.js.map`

## Files Intentionally Excluded

- private Superbus engine code
- contract generation logic
- semantic or AI review logic
- hosted backend code
- web app code
- private product workflows

## Known Limitations

- v1 checks supplied contracts only.
- v1 does not generate contracts.
- v1 checks file paths, not semantic behavior.
- v1 does not detect every unsafe AI code change.
- v1 does not inspect diffs or source file contents.
- Hosted Superbus will add generation, policy, approvals, history, and advanced review.

## Extraction Instructions For New GitHub Repo

1. Create a new repository named `superbus-contract-action`.
2. Copy the contents of `public/superbus-contract-action/` into the new repository root.
3. Do not copy files from the private repo root, private app folders, private action folders, or private docs.
4. Run the release commands above in the new repository.
5. Confirm `action.yml` points to `dist/main.js`.
6. Commit the copied files.
7. Create a GitHub release and tag `v0.1.0`.
8. Move the `v1` tag to the same commit only after a smoke test passes.

## Smoke Test

Use a test repository with:

```text
.superbus/agent-contract.json
README.md
docs/setup.md
src/payments/checkout.ts
```

Run two PRs:

- Safe PR: change only `docs/setup.md`; expect `Within Contract`.
- Violating PR: change `src/payments/checkout.ts`; expect `Contract Violated`.

## v0.1.0 Release Note Draft

Superbus Contract Action v0.1.0 is the first public open-source release.

Core message: No AI PR without a contract.

This release adds a minimal GitHub Action that checks whether an AI-generated pull request stayed inside its supplied Agent Contract. It reads PR changed-file paths from GitHub, validates them against `allowed_scope`, `blocked_scope`, and `max_files`, posts a PR comment, and can optionally fail CI on violations.

The action is path-only by design. It does not generate contracts, inspect source code, upload source code, or call external APIs other than GitHub.
