# Agent Contract Schema

An Agent Contract is a small JSON object that says which files an AI-generated PR was allowed to change.

```ts
export interface AgentContract {
  schema_version: 1;
  allowed_scope: string[];
  blocked_scope?: string[];
  max_files?: number;
  mode?: "write_allowed" | "approval_required" | "inspect_only";
  stop_conditions?: string[];
}
```

## Fields

| Field | Required | Description |
|---|---:|---|
| `schema_version` | Yes | Must be `1`. |
| `allowed_scope` | Yes | Non-empty list of path patterns the PR may change. |
| `blocked_scope` | No | Path patterns the PR must not change. Defaults to `[]`. |
| `max_files` | No | Maximum number of changed files. If omitted, file count is not enforced. |
| `mode` | No | Defaults to `write_allowed`. |
| `stop_conditions` | No | Human-readable conditions for the agent to stop. The action displays but does not enforce these directly. |

## Modes

| Mode | Meaning |
|---|---|
| `write_allowed` | Changed files are checked against scope. |
| `approval_required` | Any changed file violates the contract. |
| `inspect_only` | Any changed file violates the contract. |

## Pattern Examples

| Pattern | Meaning |
|---|---|
| `src/profile/**` | Everything under `src/profile`. |
| `README.md` | One exact file. |
| `docs/**` | Any file under `docs`. |
| `**/*.md` | Markdown files at any depth. |
| `*.json` | JSON files at the repository root. |
| `**/*` | Any file. |

## Example

```json
{
  "schema_version": 1,
  "mode": "write_allowed",
  "allowed_scope": ["src/profile/**", "tests/profile.test.ts"],
  "blocked_scope": ["src/payments/**", "src/auth/**"],
  "max_files": 4,
  "stop_conditions": [
    "Stop if payment or auth files need changes",
    "Stop if more than four files need changes"
  ]
}
```

## Compliance Result

The checker returns:

```ts
{
  status,
  summary,
  violations,
  changed_file_count,
  blocked_files_touched,
  out_of_scope_files,
  recommendation
}
```

Each violation includes:

```ts
{
  file,
  reason,
  severity: "blocker" | "warning"
}
```

See `schema/agent-contract.schema.json` for the JSON Schema.
