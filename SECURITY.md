# Security Policy

## Reporting Vulnerabilities

Please report security issues privately to the maintainers. Do not open a public issue with exploit details.

Include:

- affected version or commit
- workflow configuration
- contract example, with secrets removed
- expected behavior
- observed behavior

## Security Model

Superbus Contract Action checks whether a pull request stayed inside a supplied Agent Contract.

It fetches changed file paths only. It does not fetch source file contents, inspect diffs, scan repository source, upload source code, or call external APIs other than GitHub.

## Permissions

Recommended workflow permissions:

```yaml
permissions:
  contents: read
  pull-requests: write
```

`pull-requests: write` is needed to post or update PR comments. If `post-comment` is false, read-only permissions may be enough depending on repository settings.

## Scope Of Protection

The action is a path-scope guardrail. It does not detect every unsafe AI code change and does not replace human review.
