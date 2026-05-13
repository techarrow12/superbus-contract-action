# Public Release Audit

Package: `superbus-contract-action`

Audit date: 2026-05-13

## Scope

This audit checks whether the public GitHub Action candidate is self-contained, safe to publish, and isolated from private Superbus intelligence.

## Files Scanned

Scanned publish/source files:

- `action.yml`
- `CONTRIBUTING.md`
- `docs/contract-schema.md`
- `docs/examples.md`
- `docs/github-action.md`
- `docs/limitations.md`
- `docs/security-and-privacy.md`
- `examples/basic-workflow.yml`
- `examples/blocked-path-contract.json`
- `examples/contract.json`
- `examples/docs-only-contract.json`
- `LICENSE`
- `package.json`
- `README.md`
- `docs/release/RELEASE_CHECKLIST.md`
- `schema/agent-contract.schema.json`
- `SECURITY.md`
- `src/comment.ts`
- `src/compliance.ts`
- `src/contract.ts`
- `src/github.ts`
- `src/glob.ts`
- `src/inputs.ts`
- `src/main.ts`
- `tests/comment.test.ts`
- `tests/compliance.test.ts`
- `tests/contract.test.ts`
- `tests/fixtures/docs-only-contract.json`
- `tests/fixtures/valid-contract.json`
- `tests/fixtures/violated-contract.json`
- `tests/github.test.ts`
- `tests/glob.test.ts`
- `tests/main.test.ts`
- `tsconfig.json`
- `tsup.config.ts`
- `vitest.config.ts`

Also scanned the built output:

- `dist/main.js`
- `dist/main.js.map`

Excluded from manual review:

- `node_modules/`

## Private Concepts Not Found

No evidence was found for:

- imports from the private root package
- private scoring systems
- prompt-rewrite or prompt-diagnosis systems
- prediction engines
- private task analysis engines
- private rule engines
- private advisory modules
- private run-metric modules
- private benchmark harnesses or benchmark data
- model-provider review API calls
- source-code upload logic
- repo-wide source scanners
- hosted UI code
- commercial account code
- private app code
- private action code

## Runtime Access Model

The action reads:

- the supplied Agent Contract from `contract-path` or `contract-json`
- pull request changed file paths via GitHub's PR files API
- existing PR comments when `update-comment=true`

The action writes:

- one PR comment when `post-comment=true`
- GitHub Action outputs
- CI failure state only when `fail-on-violation=true` and the result is `violated_contract`

The action does not fetch source file contents, inspect diffs, scan repository source, upload source code, or call external APIs other than GitHub.

## Commands Run

Run from `public/superbus-contract-action/`:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Additional audit scans:

```bash
rg --files --glob '!node_modules/**' --glob '!dist/**'
rg '<private-concept-patterns>' . --glob '!node_modules/**' --glob '!dist/**'
rg '<runtime-access-patterns>' src --glob '!node_modules/**' --glob '!dist/**'
rg '<private-concept-patterns>' dist src action.yml package.json README.md docs examples schema SECURITY.md CONTRIBUTING.md docs/release/RELEASE_CHECKLIST.md --glob '!node_modules/**'
```

## Test And Build Result

- `pnpm install`: passed; lockfile up to date.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 6 test files, 35 tests.
- `pnpm build`: passed; generated `dist/main.js` and `dist/main.js.map`.
- private-concept scan: passed; no matches in source/docs/config or built output.
- runtime-access scan: passed; only expected contract file read, PR changed-file fetch, and GitHub comment APIs were found.

## Remaining Risks

- A real GitHub smoke test should run after extraction into a standalone repository and before tagging `v0.1.0`.
- The action validates path scope only. It does not detect unsafe behavior inside allowed files.
- The action relies on the supplied contract being accurate and sufficiently narrow.
- If a repository has very large PRs, the GitHub changed-file API pagination behavior should be smoke-tested against that repository.
- Publish workflow should confirm `dist/main.js` is committed because `action.yml` points to the built file.
